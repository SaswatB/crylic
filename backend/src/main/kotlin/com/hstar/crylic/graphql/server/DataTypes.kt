package com.hstar.crylic.graphql.server

data class GithubProject(val name: String, val url: String, val primaryLanguage: String)
data class Github(val name: String, val projects: List<GithubProject>)

data class Project(val id: String)
