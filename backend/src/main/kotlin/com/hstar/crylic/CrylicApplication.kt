package com.hstar.crylic

import com.hstar.crylic.graphql.server.DefaultGraphQLErrorHandler
import graphql.language.StringValue
import graphql.schema.Coercing
import graphql.schema.CoercingParseLiteralException
import graphql.schema.GraphQLScalarType
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.annotation.Bean

class GraphqlStringCoercing : Coercing<String, String> {
    override fun serialize(input: Any) = input.toString()
    override fun parseValue(input: Any) = serialize(input)
    override fun parseLiteral(input: Any) =
        if (input is StringValue) input.value else throw CoercingParseLiteralException(
            "Expected AST type 'StringValue' but was '" + input.javaClass.name + "'."
        )
}

@SpringBootApplication
class CrylicApplication {
    @Bean fun errorHandler() = DefaultGraphQLErrorHandler()

    // needed to support uuids from hasura
    @Bean
    fun uuidScalar() = GraphQLScalarType.newScalar()
        .name("uuid").description("UUID").coercing(GraphqlStringCoercing()).build()
}

fun main(args: Array<String>) {
    runApplication<CrylicApplication>(*args)
}
