FROM openjdk:11
WORKDIR /app
COPY . /app/.
RUN apt-get update
RUN apt-get install dos2unix
RUN dos2unix gradlew
RUN ./gradlew build

FROM openjdk:11
WORKDIR /app
COPY --from=0 /app/build/libs/crylic-*.jar crylic.jar
ENTRYPOINT ["java", "-jar", "crylic.jar"]
