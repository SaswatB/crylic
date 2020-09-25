package com.hstar.crylic.utils

import javax.validation.Constraint
import javax.validation.ConstraintValidator
import javax.validation.ConstraintValidatorContext
import javax.validation.Payload
import kotlin.reflect.KClass
import org.springframework.security.core.context.SecurityContextHolder

@Target(AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [CurrentUserValidator::class])
annotation class CurrentUser(
    val message: String = "access denied",
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = []
)

class CurrentUserValidator : ConstraintValidator<CurrentUser, String> {
    override fun initialize(constraintAnnotation: CurrentUser?) {}
    override fun isValid(value: String?, context: ConstraintValidatorContext) =
            SecurityContextHolder.getContext().authentication.let { it.isAuthenticated && it.name == (value) }
}
