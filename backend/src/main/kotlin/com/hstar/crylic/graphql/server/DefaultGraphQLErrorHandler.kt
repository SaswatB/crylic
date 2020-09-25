package com.hstar.crylic.graphql.server

import graphql.ExceptionWhileDataFetching
import graphql.GraphQLError
import graphql.servlet.core.GenericGraphQLError
import graphql.servlet.core.GraphQLErrorHandler
import javax.validation.ConstraintViolationException

class DefaultGraphQLErrorHandler : GraphQLErrorHandler {
    override fun processErrors(errors: List<GraphQLError>): List<GraphQLError> {
        return errors.map {
            if (it is ExceptionWhileDataFetching && it.exception is ConstraintViolationException) {
                return@map GenericGraphQLError(it.message)
            }
            println(it)
            GenericGraphQLError("An error occurred")
        }
    }
}
