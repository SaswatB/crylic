/*
 * This file is generated by jOOQ.
 */
package com.hstar.crylic.db.generated.tables.pojos;


import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.UUID;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class Integrations implements Serializable {

    private static final long serialVersionUID = 395506263;

    private final Integer        id;
    private final UUID           userId;
    private final String         type;
    private final String         token;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public Integrations(Integrations value) {
        this.id = value.id;
        this.userId = value.userId;
        this.type = value.type;
        this.token = value.token;
        this.createdAt = value.createdAt;
        this.updatedAt = value.updatedAt;
    }

    public Integrations(
        Integer        id,
        UUID           userId,
        String         type,
        String         token,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.userId = userId;
        this.type = type;
        this.token = token;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Integer getId() {
        return this.id;
    }

    public UUID getUserId() {
        return this.userId;
    }

    public String getType() {
        return this.type;
    }

    public String getToken() {
        return this.token;
    }

    public OffsetDateTime getCreatedAt() {
        return this.createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return this.updatedAt;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder("Integrations (");

        sb.append(id);
        sb.append(", ").append(userId);
        sb.append(", ").append(type);
        sb.append(", ").append(token);
        sb.append(", ").append(createdAt);
        sb.append(", ").append(updatedAt);

        sb.append(")");
        return sb.toString();
    }
}
