package com.hackathon.backend.model.entities;


import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "app_users", uniqueConstraints = @UniqueConstraint(
        name = "uk_user_oauth_identity", columnNames = {"oauth_provider", "oauth_subject"}))
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    private String phoneNumber;

    //authentification provider
    @Column(name = "oauth_provider")
    private String oauthProvider;

    //authentification provider's user id
    @Column(name = "oauth_subject")
    private String oauthSubject;
}
