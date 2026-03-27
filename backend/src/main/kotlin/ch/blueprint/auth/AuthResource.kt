package ch.blueprint.auth

import jakarta.annotation.security.PermitAll
import jakarta.annotation.security.RolesAllowed
import jakarta.inject.Inject
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.ws.rs.*
import jakarta.ws.rs.core.*
import org.eclipse.microprofile.config.inject.ConfigProperty
import org.eclipse.microprofile.jwt.JsonWebToken

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class AuthResource {

    @Inject
    lateinit var authService: AuthService

    @Inject
    lateinit var jwt: JsonWebToken

    @ConfigProperty(name = "auth.cookie.secure", defaultValue = "true")
    var cookieSecure: Boolean = true

    @POST
    @Path("/register")
    @PermitAll
    fun register(@Valid body: AuthRequest): Response {
        val token = authService.register(body.email, body.password)
        return jwtCookieResponse(token)
    }

    @POST
    @Path("/login")
    @PermitAll
    fun login(@Valid body: AuthRequest): Response {
        val token = authService.login(body.email, body.password)
        return jwtCookieResponse(token)
    }

    @GET
    @Path("/me")
    @RolesAllowed("**")
    fun me(): Response {
        val email = jwt.getClaim<String>("email")
        return Response.ok(mapOf("id" to jwt.subject, "email" to email)).build()
    }

    @POST
    @Path("/logout")
    @PermitAll
    fun logout(): Response {
        val expiredCookie = NewCookie.Builder("jwt")
            .value("")
            .path("/")
            .maxAge(0)
            .httpOnly(true)
            .secure(cookieSecure)
            .build()
        return Response.noContent().cookie(expiredCookie).build()
    }

    private fun jwtCookieResponse(token: String): Response {
        val cookie = NewCookie.Builder("jwt")
            .value(token)
            .path("/")
            .maxAge(3600)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(NewCookie.SameSite.STRICT)
            .build()
        return Response.ok().cookie(cookie).build()
    }
}

data class AuthRequest(
    @field:Email @field:NotBlank val email: String = "",
    @field:NotBlank val password: String = ""
)
