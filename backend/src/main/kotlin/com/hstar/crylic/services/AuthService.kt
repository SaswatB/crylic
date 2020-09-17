package com.hstar.crylic.services

import com.hstar.crylic.db.generated.Tables
import com.hstar.crylic.db.generated.tables.pojos.User
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.SignatureAlgorithm
import io.jsonwebtoken.security.Keys
import java.security.Key
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.*
import javax.annotation.PostConstruct
import javax.crypto.spec.SecretKeySpec
import javax.validation.constraints.Email
import javax.validation.constraints.NotBlank
import org.jooq.DSLContext
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.validation.annotation.Validated
import org.springframework.web.server.ResponseStatusException

private const val TOKEN_EXPIRATION_DAYS = 30L
const val REDIS_AUTH_KEY = "auth:signature"
val passwordEncoder = BCryptPasswordEncoder()

@Service
@Validated
class AuthService {
    @Autowired
    private lateinit var dsl: DSLContext
    @Autowired
    private lateinit var template: RedisTemplate<String, String>
    private lateinit var key: Key

    @PostConstruct
    fun init() {
        if (template.hasKey(REDIS_AUTH_KEY)) {
            val decodedKey = Base64.getDecoder().decode(template.boundValueOps(REDIS_AUTH_KEY).get())
            key = Keys.hmacShaKeyFor(decodedKey)
        } else {
            key = Keys.secretKeyFor(SignatureAlgorithm.HS256)
            template.boundValueOps(REDIS_AUTH_KEY).set(Base64.getEncoder().encodeToString(key.encoded))
        }
    }

    fun login(@NotBlank email: String, @NotBlank password: String): String {
        try {
            val user = dsl.selectFrom(Tables.USER.where(Tables.USER.EMAIL.eq(email))).fetchAny().into(User::class.java)

            if (user != null && passwordEncoder.matches(password, user.password.toString())) {
                return Jwts
                    .builder()
                    .setExpiration(
                            Date.from(LocalDateTime.now().plusDays(TOKEN_EXPIRATION_DAYS).atZone(ZoneId.systemDefault()).toInstant()))
                    .addClaims(mapOf(
                        "userId" to user.id,
                        "pTag" to user.password.substring(0, 3),
                        // todo add revoke id
                        "https://hasura.io/jwt/claims" to mapOf(
                            "x-hasura-allowed-roles" to arrayOf("user"),
                            "x-hasura-default-role" to "user",
                            "x-hasura-user-id" to user.id
                        )
                    ))
                    .signWith(key)
                    .compact()
            }
        } catch (e: Exception) {
            println(e)
        }
        throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Login failed")
    }

    fun register(@Email email: String, @NotBlank password: String, @NotBlank firstName: String, @NotBlank lastName: String) {
        // TODO email verification
        dsl.insertInto(Tables.USER)
                .columns(Tables.USER.EMAIL, Tables.USER.PASSWORD, Tables.USER.FIRST_NAME, Tables.USER.LAST_NAME)
                .values(email, passwordEncoder.encode(password), firstName, lastName)
                .execute()
    }
}
