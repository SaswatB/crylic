package com.hstar.crylic.auth

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter

@Configuration
@EnableWebSecurity
class WebSecurity : WebSecurityConfigurerAdapter() {
    @Autowired
    private lateinit var jwtAuthFilter: JWTAuthFilter

    @Throws(Exception::class)
    override fun configure(http: HttpSecurity) {
        http.csrf().disable()
                .headers().httpStrictTransportSecurity() // hsts
                .and().and()
                .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS) // stateless!
                .and().authorizeRequests()
                .antMatchers("/auth/login").permitAll()
                .antMatchers("/auth/register").permitAll()
                .antMatchers("/auth/jwks").permitAll()
                .antMatchers("/redirect/github").permitAll()
                .antMatchers("/graphql").permitAll()
                .anyRequest().authenticated()

        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter::class.java)
    }
}
