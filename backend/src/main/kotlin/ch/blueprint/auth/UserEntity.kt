package ch.blueprint.auth

import io.quarkus.hibernate.orm.panache.kotlin.PanacheCompanionBase
import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "app_user")
class UserEntity : PanacheEntityBase {

    @Id
    var id: UUID = UUID.randomUUID()

    @Column(nullable = false, unique = true)
    var email: String = ""

    @Column(name = "password_hash", nullable = false)
    var passwordHash: String = ""

    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()

    companion object : PanacheCompanionBase<UserEntity, UUID> {
        fun findByEmail(email: String): UserEntity? = find("email", email).firstResult()
    }
}
