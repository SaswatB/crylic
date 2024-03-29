package com.hstar.crylic.controllers

import com.hstar.crylic.services.AuthService
import java.util.concurrent.*
import javax.servlet.http.HttpServletResponse
import javax.validation.ConstraintViolationException
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DuplicateKeyException
import org.springframework.http.CacheControl
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/auth")
class AuthController {
    @Autowired
    private lateinit var authService: AuthService

    @PostMapping("/login")
    fun login(@RequestParam email: String, @RequestParam password: String): Map<String, Any> {
        val token = authService.login(email, password)
        return mapOf("success" to true, "token" to token)
    }

    @PostMapping("/register")
    fun register(
        @RequestParam email: String,
        @RequestParam password: String,
        @RequestParam firstName: String,
        @RequestParam lastName: String
    ): Map<String, Any> {
        try {
            authService.register(email, password, firstName, lastName)
        } catch (ex: DuplicateKeyException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "User already exists")
        }
        return mapOf("success" to true)
    }

    // this route is authenticated, so if the auth token is valid it'll return ok
    @PostMapping("/check_token")
    fun checkToken() = ResponseEntity.ok().body(mapOf("result" to "ok"))

    @GetMapping("/jwks")
    fun jwks() = ResponseEntity.ok().cacheControl(CacheControl.maxAge(10, TimeUnit.MINUTES)).body(mapOf("keys" to arrayOf(authService.jwk())))

    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolation(ex: ConstraintViolationException, res: HttpServletResponse) {
        res.sendError(HttpStatus.BAD_REQUEST.value())
    }
}
