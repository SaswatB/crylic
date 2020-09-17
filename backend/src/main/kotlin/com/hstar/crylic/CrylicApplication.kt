package com.hstar.crylic

import graphql.servlet.core.DefaultGraphQLErrorHandler
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.annotation.Bean

@SpringBootApplication
class CrylicApplication {
    @Bean fun errorHandler() = DefaultGraphQLErrorHandler()
}

fun main(args: Array<String>) {
    runApplication<CrylicApplication>(*args)
}
