package dev.kongortfolio.logging;

import java.io.IOException;
import java.util.concurrent.TimeUnit;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class ApiAccessLogFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(ApiAccessLogFilter.class);

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return !path.equals("/api") && !path.startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long started = System.nanoTime();
        response.setHeader("Cache-Control", "no-store");
        boolean failed = false;
        try {
            chain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException error) {
            failed = true;
            throw error;
        } finally {
            // Never record query strings, headers, bodies, tokens or personal data.
            String path = request.getRequestURI().replaceAll("[\\r\\n\\t]", "_");
            log.info("API accessed method={} path={} status={} durationMs={}", request.getMethod(), path,
                failed ? 500 : response.getStatus(), TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started));
        }
    }
}
