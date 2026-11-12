package dev.kongortfolio.lambda;

import com.amazonaws.serverless.exceptions.ContainerInitializationException;
import com.amazonaws.serverless.proxy.model.AwsProxyResponse;
import com.amazonaws.serverless.proxy.model.HttpApiV2ProxyRequest;
import com.amazonaws.serverless.proxy.spring.SpringBootLambdaContainerHandler;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestStreamHandler;
import dev.kongortfolio.PortfolioApplication;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/** HTTP API payload v2 entry point; the Spring context is reused on warm invocations. */
public final class PortfolioLambdaHandler implements RequestStreamHandler {
    private static final SpringBootLambdaContainerHandler<HttpApiV2ProxyRequest, AwsProxyResponse> CONTAINER = initialize();

    private static SpringBootLambdaContainerHandler<HttpApiV2ProxyRequest, AwsProxyResponse> initialize() {
        try {
            return SpringBootLambdaContainerHandler.getHttpApiV2ProxyHandler(PortfolioApplication.class, "lambda");
        } catch (ContainerInitializationException exception) {
            throw new IllegalStateException("Could not initialize portfolio Lambda", exception);
        }
    }

    @Override
    public void handleRequest(InputStream input, OutputStream output, Context context) throws IOException {
        CONTAINER.proxyStream(input, output, context);
    }
}
