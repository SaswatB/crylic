package com.hstar.crylic.services

import kong.unirest.Unirest
import kong.unirest.json.JSONObject
import org.jooq.DSLContext
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service

@Service
class GithubService {
    fun getAccessToken(oauthCode: String) = Unirest.post("https://github.com/login/oauth/access_token")
            .header("accept", "application/json")
            .queryString("client_id", "93b6802c9ec33bc8fdee")
            .queryString("client_secret", "235d93841a2b7ed55bf4abc9924afc2390718336")
            .queryString("code", oauthCode)
            .asJson().body.`object`.get("access_token").toString()

    fun getProjectData(authToken: String) = Unirest.post("https://api.github.com/graphql")
            .header("Authorization", "bearer $authToken")
            .header("Content-Type", "application/json")
            .body(JSONObject(mapOf("query" to """
              {
                viewer {
                  login
                  repositories(last: 10) {
                    nodes {
                      url
                      nameWithOwner
                      primaryLanguage {
                        name
                        color
                      }
                      nameWithOwner
                    }
                  }
                }
              }
          """.trimIndent())))
            .asJson().body.`object`
}
