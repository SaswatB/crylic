package com.hstar.crylic.controllers

import com.hstar.crylic.services.GithubService
import com.hstar.crylic.services.IntegrationsService
import java.util.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam

@Controller
@RequestMapping("/redirect")
class RedirectController {

    @Autowired
    private lateinit var githubService: GithubService
    @Autowired
    private lateinit var integrationsService: IntegrationsService

    @GetMapping("/github")
    fun github(@RequestParam code: String, @RequestParam state: String): String {
        integrationsService.addIntegration(UUID.fromString(state), "github", githubService.getAccessToken(code))
        return "popup_close"
    }
}
