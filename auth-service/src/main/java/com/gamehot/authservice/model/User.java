package com.gamehot.authservice.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "open_id", unique = true, nullable = false, length = 128)
    private String openId;

    @Column(length = 128)
    private String name;

    @Column(length = 256)
    private String email;

    @Column(length = 512)
    private String avatar;

    @Column(name = "login_method", length = 32)
    private String loginMethod; // feishu / password

    @Column(length = 32)
    private String role = "member"; // admin / member

    @Column(name = "last_signed_in")
    private LocalDateTime lastSignedIn;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
