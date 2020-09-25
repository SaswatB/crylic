package com.hstar.crylic.graphql.server

import com.coxautodev.graphql.tools.GraphQLMutationResolver
import org.springframework.stereotype.Component

@Component
@Suppress("unused")
class Mutation : GraphQLMutationResolver {
    fun addProject(githubUrl: String) = Project("")
}
