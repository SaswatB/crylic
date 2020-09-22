package com.hstar.crylic.services

import java.util.*
import kong.unirest.Unirest
import org.jooq.DSLContext
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service

@Service
class GithubService {
    @Autowired
    private lateinit var dsl: DSLContext

    fun getAccessToken(oauthCode: String) = Unirest.post("https://github.com/login/oauth/access_token")
            .header("accept", "application/json")
            .queryString("client_id", "93b6802c9ec33bc8fdee")
            .queryString("client_secret", "235d93841a2b7ed55bf4abc9924afc2390718336")
            .queryString("code", oauthCode)
            .asJson().body.`object`.get("access_token").toString()
}
