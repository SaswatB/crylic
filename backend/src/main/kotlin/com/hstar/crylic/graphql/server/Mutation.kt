package com.hstar.crylic.graphql.server

import com.coxautodev.graphql.tools.GraphQLMutationResolver
import com.hstar.crylic.db.generated.tables.pojos.Project
import com.hstar.crylic.services.GithubService
import com.hstar.crylic.services.ProjectService
import com.hstar.crylic.utils.getCurrentUser
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component

@Component
@Suppress("unused")
class Mutation : GraphQLMutationResolver {
    @Autowired
    private lateinit var projectService: ProjectService

    fun addProject(name: String, githubUrl: String) = projectService.addGitHubProject(getCurrentUser(), name, githubUrl).id
}
