package com.hstar.crylic.controllers

import com.hstar.crylic.services.AuthService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DuplicateKeyException
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import javax.servlet.http.HttpServletResponse
import javax.validation.ConstraintViolationException

@RestController
class AuthController {
    @Autowired
    private lateinit var authService: AuthService

    @PostMapping("/login")
    fun login(@RequestParam("email") email: String, @RequestParam("password") password: String): Map<String, Any> {
        val token = authService.login(email, password)
        return mapOf("success" to true, "token" to token)
    }

    @PostMapping("/register")
    fun register(
            @RequestParam("email") email: String,
            @RequestParam("password") password: String,
            @RequestParam("firstName") firstName: String,
            @RequestParam("lastName") lastName: String
    ): Map<String, Any> {
        try {
            authService.register(email, password, firstName, lastName)
        } catch (ex: DuplicateKeyException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "User already exists")
        }
        return mapOf("success" to true);
    }

    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolation(ex: ConstraintViolationException, res: HttpServletResponse) {
        res.sendError(HttpStatus.BAD_REQUEST.value())
    }
}
