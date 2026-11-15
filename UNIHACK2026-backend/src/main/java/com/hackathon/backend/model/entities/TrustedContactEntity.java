package com.hackathon.backend.model.entities;

import com.hackathon.backend.model.TrustedContactStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "trusted_contacts",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"user_id", "contact_user_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrustedContactEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_user_id", nullable = false)
    private UserEntity contactUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TrustedContactStatus status = TrustedContactStatus.PENDING;
}
