FROM gradle:jdk11
WORKDIR /app
COPY . /app/.
RUN ./gradlew build

FROM openjdk:11-alpine
WORKDIR /app
COPY --from=0 /app/build/libs/crylic-*.jar crylic.jar
ENTRYPOINT ["java", "-jar", "crylic.jar"]
