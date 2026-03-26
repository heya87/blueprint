package ch.blueprint.auth

import io.smallrye.jwt.build.Jwt
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import org.eclipse.microprofile.config.inject.ConfigProperty
import java.time.Duration

@ApplicationScoped
class AuthService {

    @ConfigProperty(name = "mp.jwt.verify.issuer")
    lateinit var issuer: String

    @Transactional
    fun register(email: String, password: String): String {
        if (UserEntity.findByEmail(email) != null) {
            throw IllegalArgumentException("Email already in use")
        }
        val user = UserEntity().apply {
            this.email = email
            this.passwordHash = hashPassword(password)
        }
        user.persist()
        return issueToken(user)
    }

    fun login(email: String, password: String): String {
        val user = UserEntity.findByEmail(email)
            ?: throw IllegalArgumentException("Invalid credentials")
        if (!verifyPassword(password, user.passwordHash)) {
            throw IllegalArgumentException("Invalid credentials")
        }
        return issueToken(user)
    }

    private fun issueToken(user: UserEntity): String =
        Jwt.issuer(issuer)
            .subject(user.id.toString())
            .claim("email", user.email)
            .expiresIn(Duration.ofHours(1))
            .sign()

    private fun hashPassword(password: String): String =
        org.mindrot.jbcrypt.BCrypt.hashpw(password, org.mindrot.jbcrypt.BCrypt.gensalt())

    private fun verifyPassword(password: String, hash: String): Boolean =
        org.mindrot.jbcrypt.BCrypt.checkpw(password, hash)
}
