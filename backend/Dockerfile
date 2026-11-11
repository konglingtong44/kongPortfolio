FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B verify

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S portfolio && adduser -S portfolio -G portfolio
WORKDIR /app
COPY --from=build --chown=portfolio:portfolio /app/target/kongPortfolio.jar ./app.jar
USER portfolio
ENV SERVER_ADDRESS=0.0.0.0
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70.0"
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=40s CMD wget -q -O /dev/null http://127.0.0.1:8080/api/health || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
