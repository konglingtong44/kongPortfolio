import com.amazonaws.services.lambda.runtime.Context;
import dev.kongortfolio.lambda.PortfolioLambdaHandler;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import tools.jackson.databind.ObjectMapper;

/** Executed with only the extracted Lambda ZIP on the classpath, not Maven test dependencies. */
class LambdaPackageSmoke {
    public static void main(String[] args) throws Exception {
        var mapper = new ObjectMapper();
        var handler = new PortfolioLambdaHandler();
        var context = (Context) Proxy.newProxyInstance(Context.class.getClassLoader(), new Class<?>[] {Context.class},
            (proxy, method, arguments) -> switch (method.getName()) {
                case "getRemainingTimeInMillis" -> 30_000;
                case "getMemoryLimitInMB" -> 1024;
                default -> "package-smoke";
            });
        for (String[] sample : new String[][] {
                {"GET", "/api/health", "", "UP"},
                {"GET", "/api/profile", "lang=ja", "ソフトウェアエンジニア"},
                {"GET", "/api/profile", "lang=zh", "软件工程师"},
                {"GET", "/api/profile", "lang=en", "Software engineer"},
                {"POST", "/api/bedrock", "", "PREPARING"},
                {"GET", "/api/bedrock/questions", "language=zh", "portfolio-scope-v1"}}) {
            var event = Map.of("version", "2.0", "routeKey", "$default", "rawPath", sample[1], "rawQueryString", sample[2],
                "headers", Map.of("host", "example.execute-api.ap-northeast-1.amazonaws.com", "x-forwarded-proto", "https"),
                "requestContext", Map.of("stage", "$default", "requestId", "package-smoke",
                    "http", Map.of("method", sample[0], "path", sample[1], "protocol", "HTTP/1.1", "sourceIp", "127.0.0.1")),
                "isBase64Encoded", false);
            var output = new ByteArrayOutputStream();
            handler.handleRequest(new ByteArrayInputStream(mapper.writeValueAsBytes(event)), output, context);
            var response = mapper.readTree(output.toByteArray());
            String body = response.path("body").asText();
            if (response.path("isBase64Encoded").asBoolean()) {
                body = new String(Base64.getDecoder().decode(body), StandardCharsets.UTF_8);
            }
            if (response.path("statusCode").asInt() != 200 || !body.contains(sample[3])) {
                throw new AssertionError("Packaged Lambda contract failed: " + sample[0] + " " + sample[1]);
            }
        }
        var root = (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
        if (root.getAppender("INFO_FILE") != null) throw new AssertionError("Lambda must not use local file logging");
        System.out.println("Packaged Lambda smoke passed: health, three languages, question catalog, POST placeholder, console-only logging.");
    }
}
