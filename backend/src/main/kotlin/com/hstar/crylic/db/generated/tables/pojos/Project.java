/*
 * This file is generated by jOOQ.
 */
package com.hstar.crylic.db.generated.tables.pojos;


import java.io.Serializable;
import java.util.UUID;

import org.jooq.JSONB;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class Project implements Serializable {

    private static final long serialVersionUID = -1024556178;

    private final UUID   id;
    private final UUID   ownerId;
    private final String name;
    private final String type;
    private final JSONB  metadata;

    public Project(Project value) {
        this.id = value.id;
        this.ownerId = value.ownerId;
        this.name = value.name;
        this.type = value.type;
        this.metadata = value.metadata;
    }

    public Project(
        UUID   id,
        UUID   ownerId,
        String name,
        String type,
        JSONB  metadata
    ) {
        this.id = id;
        this.ownerId = ownerId;
        this.name = name;
        this.type = type;
        this.metadata = metadata;
    }

    public UUID getId() {
        return this.id;
    }

    public UUID getOwnerId() {
        return this.ownerId;
    }

    public String getName() {
        return this.name;
    }

    public String getType() {
        return this.type;
    }

    public JSONB getMetadata() {
        return this.metadata;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder("Project (");

        sb.append(id);
        sb.append(", ").append(ownerId);
        sb.append(", ").append(name);
        sb.append(", ").append(type);
        sb.append(", ").append(metadata);

        sb.append(")");
        return sb.toString();
    }
}
