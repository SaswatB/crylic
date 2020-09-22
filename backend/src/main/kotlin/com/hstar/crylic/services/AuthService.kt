package com.hstar.crylic.services

import com.hstar.crylic.db.generated.Tables
import com.hstar.crylic.db.generated.tables.pojos.User
import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.JWSObject
import com.nimbusds.jose.Payload
import com.nimbusds.jose.crypto.RSASSASigner
import com.nimbusds.jose.jwk.KeyUse
import com.nimbusds.jose.jwk.RSAKey
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator
import com.nimbusds.jwt.JWTClaimsSet
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.*
import java.util.UUID
import javax.annotation.PostConstruct
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
    private lateinit var key: RSAKey
    private lateinit var signer: RSASSASigner

    @PostConstruct
    fun init() {
        if (template.hasKey(REDIS_AUTH_KEY)) {
            key = RSAKey.parse(template.boundValueOps(REDIS_AUTH_KEY).get())
        } else {
            key = RSAKeyGenerator(2048)
                    .keyUse(KeyUse.SIGNATURE) // indicate the intended use of the key
                    .keyID(UUID.randomUUID().toString()) // give the key a unique ID
                    .generate()
            template.boundValueOps(REDIS_AUTH_KEY).set(key.toJSONString())
        }
        signer = RSASSASigner(key.toRSAPrivateKey())
    }

    fun login(@NotBlank email: String, @NotBlank password: String): String {
        try {
            val user = dsl.selectFrom(Tables.USER.where(Tables.USER.EMAIL.eq(email))).fetchAny().into(User::class.java)

            if (user != null && passwordEncoder.matches(password, user.password.toString())) {
                val claims = JWTClaimsSet.Builder()
                        .expirationTime(Date.from(LocalDateTime.now().plusDays(TOKEN_EXPIRATION_DAYS).atZone(ZoneId.systemDefault()).toInstant()))
                        .claim("userId", user.id)
                        .claim("pTag", user.password.substring(0, 3))
                        // todo add revoke id
                        .claim("https://hasura.io/jwt/claims", mapOf(
                                "x-hasura-allowed-roles" to arrayOf("user"),
                                "x-hasura-default-role" to "user",
                                "x-hasura-user-id" to user.id.toString()
                        ))
                        .build()
                val jwsObject = JWSObject(JWSHeader(JWSAlgorithm.RS256), Payload(claims.toJSONObject()))
                jwsObject.sign(signer)
                return jwsObject.serialize()
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

    fun jwk() = key.toPublicJWK().toJSONObject()
}
