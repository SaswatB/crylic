package com.hstar.crylic.graphql.server

import com.coxautodev.graphql.tools.GraphQLQueryResolver
import com.hstar.crylic.services.GithubService
import com.hstar.crylic.services.IntegrationsService
import com.hstar.crylic.utils.CurrentUser
import java.util.*
import kotlin.collections.ArrayList
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Component
import org.springframework.validation.annotation.Validated

@Component
@Validated
@Suppress("unused")
class Query : GraphQLQueryResolver {
    @Autowired
    private lateinit var githubString: GithubService
    @Autowired
    private lateinit var integrationService: IntegrationsService

    fun github(@CurrentUser userId: String): Github? {
        val integration = integrationService.getIntegration(UUID.fromString(userId)) ?: return null
        val response = githubString.getProjectData(integration.token)
        val viewer = response.getJSONObject("data").getJSONObject("viewer")
        val repos = viewer.getJSONObject("repositories").getJSONArray("nodes")

        val projects = ArrayList<GithubProject>()
        for (i in 0 until repos.length()) {
            val o = repos.getJSONObject(i)
            projects.add(GithubProject(o.getString("nameWithOwner"), o.getString("url"), o.getJSONObject("primaryLanguage").getString("name")))
        }
        return Github(viewer.getString("login"), projects)
    }
}
