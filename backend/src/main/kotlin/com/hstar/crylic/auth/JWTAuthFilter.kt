package com.hstar.crylic.auth

import com.hstar.crylic.services.AuthService
import javax.servlet.FilterChain
import javax.servlet.http.HttpServletRequest
import javax.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.User
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JWTAuthFilter : OncePerRequestFilter() {

    @Autowired
    private lateinit var authService: AuthService

    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, filterChain: FilterChain) {
        val requestTokenHeader = request.getHeader("Authorization")

        if (requestTokenHeader != null && requestTokenHeader.startsWith("Bearer ", ignoreCase = true)) {
            try {
                val username = authService.verify(requestTokenHeader.substring(7))?.get("userId")?.toString()
                if (username != null) {
                    val userDetails = User(username, "", listOf())
                    val usernamePasswordAuthenticationToken = UsernamePasswordAuthenticationToken(userDetails, null, userDetails.authorities)
                    usernamePasswordAuthenticationToken.details = WebAuthenticationDetailsSource().buildDetails(request)
                    SecurityContextHolder.getContext().authentication = usernamePasswordAuthenticationToken
                }
            } catch (e: Exception) {
                logger.warn("Unable to get JWT Token", e)
            }
        } else {
            logger.warn("JWT Token does not begin with Bearer String")
        }

        filterChain.doFilter(request, response)
    }
}
