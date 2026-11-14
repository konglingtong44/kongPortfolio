package dev.kongortfolio.bedrock;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.retries.StandardRetryStrategy;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;

@Component
public final class ApprovedFacts implements AutoCloseable {
    public static final String KEY = "approved/facts.txt";
    static final int MAX_BYTES = 80 * 1024;
    static final int MAX_CODEPOINTS = 20_000;
    private final Settings settings;
    private final Supplier<S3Client> factory;
    private S3Client s3;
    private volatile String cached;

    @Autowired
    public ApprovedFacts(@Value("${portfolio.bedrock.facts-bucket:}") String bucket,
                         @Value("${portfolio.bedrock.facts-version:}") String version,
                         @Value("${portfolio.bedrock.facts-sha256:}") String sha256,
                         @Value("${portfolio.bedrock.facts-owner:561798268037}") String owner) {
        this(new Settings(bucket, version, sha256, owner), () -> S3Client.builder().region(Region.AP_NORTHEAST_1)
            .httpClientBuilder(UrlConnectionHttpClient.builder().connectionTimeout(Duration.ofSeconds(1)).socketTimeout(Duration.ofSeconds(2)))
            .overrideConfiguration(ClientOverrideConfiguration.builder().apiCallTimeout(Duration.ofSeconds(4))
                .apiCallAttemptTimeout(Duration.ofSeconds(3))
                .retryStrategy(StandardRetryStrategy.builder().maxAttempts(1).build()).build()).build());
    }

    ApprovedFacts(Settings settings, Supplier<S3Client> factory) {
        this.settings = settings;
        this.factory = factory;
    }

    public String read() {
        String result = cached;
        if (result != null) return result;
        synchronized (this) {
            if (cached != null) return cached;
            try {
                byte[] bytes;
                if (settings.bucket().isEmpty()) {
                    try (var input = new ClassPathResource("content/bedrock-facts.md").getInputStream()) {
                        bytes = input.readNBytes(MAX_BYTES + 1);
                    }
                } else {
                    if (s3 == null) s3 = factory.get();
                    var request = GetObjectRequest.builder().bucket(settings.bucket()).key(KEY)
                        .versionId(settings.version()).expectedBucketOwner(settings.owner()).build();
                    try (var input = s3.getObject(request)) {
                        if (!settings.version().equals(input.response().versionId())) throw new IOException("Version mismatch");
                        bytes = input.readNBytes(MAX_BYTES + 1);
                        if (bytes.length > MAX_BYTES) {
                            input.abort();
                            throw new IOException("Oversized facts");
                        }
                    }
                    String digest = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
                    if (!digest.equals(settings.sha256())) throw new IOException("Digest mismatch");
                }
                if (bytes.length > MAX_BYTES) throw new IOException("Oversized facts");
                String text = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
                if (text.startsWith("\uFEFF")) text = text.substring(1);
                cached = validate(text);
                return cached;
            } catch (Exception failure) {
                // Fail closed: never silently substitute stale/bundled data for a configured S3 version.
                throw new ModelGateway.Failure(503, "FACTS_UNAVAILABLE");
            }
        }
    }

    static String validate(String text) {
        if (text.isBlank() || text.codePointCount(0, text.length()) > MAX_CODEPOINTS
            || text.indexOf('\0') >= 0) throw new IllegalArgumentException("Invalid approved facts");
        return text;
    }

    @Override public synchronized void close() { if (s3 != null) s3.close(); }

    record Settings(String bucket, String version, String sha256, String owner) {
        Settings {
            if (bucket == null || version == null || sha256 == null || owner == null
                || !owner.matches("[0-9]{12}")) throw new IllegalArgumentException("Invalid facts configuration");
            boolean local = bucket.isEmpty() && version.isEmpty() && sha256.isEmpty();
            if (!local && (!bucket.matches("[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]")
                || version.isBlank() || version.equals("null") || !sha256.matches("[0-9a-f]{64}"))) {
                throw new IllegalArgumentException("S3 facts require bucket, version and SHA-256 together");
            }
        }
    }
}
