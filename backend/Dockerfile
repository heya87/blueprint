FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY . .
RUN ./gradlew build -x test --no-daemon

FROM registry.access.redhat.com/ubi8/openjdk-21:latest
COPY --from=builder --chown=185 /app/build/quarkus-app/ /deployments/
EXPOSE 8080
USER 185
CMD ["java", "-jar", "/deployments/quarkus-run.jar"]
