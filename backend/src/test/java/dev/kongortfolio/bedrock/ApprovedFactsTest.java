package dev.kongortfolio.bedrock;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ApprovedFactsTest {
    private static String digest(byte[] data) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
    }

    @Test void readsPinnedVersionOnceAndSupportsMoreThanTenThousandChineseCharacters() throws Exception {
        byte[] bytes = "经历".repeat(7500).getBytes(StandardCharsets.UTF_8);
        var s3 = mock(S3Client.class);
        var input = new ResponseInputStream<>(GetObjectResponse.builder().versionId("approved-version").build(), new ByteArrayInputStream(bytes));
        when(s3.getObject(any(GetObjectRequest.class))).thenReturn(input);
        var facts = new ApprovedFacts(new ApprovedFacts.Settings("private-facts-bucket", "approved-version", digest(bytes), "561798268037"), () -> s3);
        assertThat(facts.read().codePointCount(0, facts.read().length())).isEqualTo(15000);
        assertThat(facts.read()).isSameAs(facts.read());
        verify(s3, times(1)).getObject(GetObjectRequest.builder().bucket("private-facts-bucket")
            .key("approved/facts.txt").versionId("approved-version").expectedBucketOwner("561798268037").build());
        facts.close();
        verify(s3).close();
    }

    @Test void localModeAndUnusedS3ConfigurationNeverCreateAnAwsClient() {
        var factoryCalls = new AtomicInteger();
        var local = new ApprovedFacts(new ApprovedFacts.Settings("", "", "", "561798268037"), () -> {
            factoryCalls.incrementAndGet(); throw new AssertionError("Must remain offline");
        });
        assertThat(local.read()).contains("kongPortfolio");
        var unused = new ApprovedFacts(new ApprovedFacts.Settings("private-facts-bucket", "v1", "a".repeat(64), "561798268037"), () -> {
            factoryCalls.incrementAndGet(); return mock(S3Client.class);
        });
        local.close(); unused.close();
        assertThat(factoryCalls).hasValue(0);
    }

    @Test void rejectsPartialConfigurationAndUnversionedObjects() {
        assertThatThrownBy(() -> new ApprovedFacts.Settings("private-facts-bucket", "", "", "561798268037"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ApprovedFacts.Settings("private-facts-bucket", "null", "a".repeat(64), "561798268037"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test void rejectsChangedVersionBadDigestOversizedAndInvalidUtf8WithoutFallback() throws Exception {
        for (int scenario = 0; scenario < 4; scenario++) {
            byte[] bytes = switch (scenario) {
                case 2 -> new byte[ApprovedFacts.MAX_BYTES + 1];
                case 3 -> new byte[] {(byte)0xC3, (byte)0x28};
                default -> "synthetic facts".getBytes(StandardCharsets.UTF_8);
            };
            var s3 = mock(S3Client.class);
            when(s3.getObject(any(GetObjectRequest.class))).thenReturn(new ResponseInputStream<>(
                GetObjectResponse.builder().versionId(scenario == 0 ? "wrong-version" : "v1").build(), new ByteArrayInputStream(bytes)));
            var facts = new ApprovedFacts(new ApprovedFacts.Settings("private-facts-bucket", "v1",
                scenario == 1 ? "0".repeat(64) : digest(bytes), "561798268037"), () -> s3);
            assertThatThrownBy(facts::read).hasMessage("FACTS_UNAVAILABLE").isInstanceOf(ModelGateway.Failure.class);
        }
        assertThatThrownBy(() -> ApprovedFacts.validate("字".repeat(20001))).isInstanceOf(IllegalArgumentException.class);
    }
}
