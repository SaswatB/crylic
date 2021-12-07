/*
 * This file is generated by jOOQ.
 */
package com.hstar.crylic.db.generated.tables.records;


import com.hstar.crylic.db.generated.tables.Project;

import java.util.UUID;

import org.jooq.Field;
import org.jooq.JSONB;
import org.jooq.Record1;
import org.jooq.Record5;
import org.jooq.Row5;
import org.jooq.impl.UpdatableRecordImpl;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class ProjectRecord extends UpdatableRecordImpl<ProjectRecord> implements Record5<UUID, UUID, String, String, JSONB> {

    private static final long serialVersionUID = 899001871;

    /**
     * Setter for <code>public.Project.id</code>.
     */
    public ProjectRecord setId(UUID value) {
        set(0, value);
        return this;
    }

    /**
     * Getter for <code>public.Project.id</code>.
     */
    public UUID getId() {
        return (UUID) get(0);
    }

    /**
     * Setter for <code>public.Project.owner_id</code>.
     */
    public ProjectRecord setOwnerId(UUID value) {
        set(1, value);
        return this;
    }

    /**
     * Getter for <code>public.Project.owner_id</code>.
     */
    public UUID getOwnerId() {
        return (UUID) get(1);
    }

    /**
     * Setter for <code>public.Project.name</code>.
     */
    public ProjectRecord setName(String value) {
        set(2, value);
        return this;
    }

    /**
     * Getter for <code>public.Project.name</code>.
     */
    public String getName() {
        return (String) get(2);
    }

    /**
     * Setter for <code>public.Project.type</code>.
     */
    public ProjectRecord setType(String value) {
        set(3, value);
        return this;
    }

    /**
     * Getter for <code>public.Project.type</code>.
     */
    public String getType() {
        return (String) get(3);
    }

    /**
     * Setter for <code>public.Project.metadata</code>.
     */
    public ProjectRecord setMetadata(JSONB value) {
        set(4, value);
        return this;
    }

    /**
     * Getter for <code>public.Project.metadata</code>.
     */
    public JSONB getMetadata() {
        return (JSONB) get(4);
    }

    // -------------------------------------------------------------------------
    // Primary key information
    // -------------------------------------------------------------------------

    @Override
    public Record1<UUID> key() {
        return (Record1) super.key();
    }

    // -------------------------------------------------------------------------
    // Record5 type implementation
    // -------------------------------------------------------------------------

    @Override
    public Row5<UUID, UUID, String, String, JSONB> fieldsRow() {
        return (Row5) super.fieldsRow();
    }

    @Override
    public Row5<UUID, UUID, String, String, JSONB> valuesRow() {
        return (Row5) super.valuesRow();
    }

    @Override
    public Field<UUID> field1() {
        return Project.PROJECT.ID;
    }

    @Override
    public Field<UUID> field2() {
        return Project.PROJECT.OWNER_ID;
    }

    @Override
    public Field<String> field3() {
        return Project.PROJECT.NAME;
    }

    @Override
    public Field<String> field4() {
        return Project.PROJECT.TYPE;
    }

    @Override
    public Field<JSONB> field5() {
        return Project.PROJECT.METADATA;
    }

    @Override
    public UUID component1() {
        return getId();
    }

    @Override
    public UUID component2() {
        return getOwnerId();
    }

    @Override
    public String component3() {
        return getName();
    }

    @Override
    public String component4() {
        return getType();
    }

    @Override
    public JSONB component5() {
        return getMetadata();
    }

    @Override
    public UUID value1() {
        return getId();
    }

    @Override
    public UUID value2() {
        return getOwnerId();
    }

    @Override
    public String value3() {
        return getName();
    }

    @Override
    public String value4() {
        return getType();
    }

    @Override
    public JSONB value5() {
        return getMetadata();
    }

    @Override
    public ProjectRecord value1(UUID value) {
        setId(value);
        return this;
    }

    @Override
    public ProjectRecord value2(UUID value) {
        setOwnerId(value);
        return this;
    }

    @Override
    public ProjectRecord value3(String value) {
        setName(value);
        return this;
    }

    @Override
    public ProjectRecord value4(String value) {
        setType(value);
        return this;
    }

    @Override
    public ProjectRecord value5(JSONB value) {
        setMetadata(value);
        return this;
    }

    @Override
    public ProjectRecord values(UUID value1, UUID value2, String value3, String value4, JSONB value5) {
        value1(value1);
        value2(value2);
        value3(value3);
        value4(value4);
        value5(value5);
        return this;
    }

    // -------------------------------------------------------------------------
    // Constructors
    // -------------------------------------------------------------------------

    /**
     * Create a detached ProjectRecord
     */
    public ProjectRecord() {
        super(Project.PROJECT);
    }

    /**
     * Create a detached, initialised ProjectRecord
     */
    public ProjectRecord(UUID id, UUID ownerId, String name, String type, JSONB metadata) {
        super(Project.PROJECT);

        set(0, id);
        set(1, ownerId);
        set(2, name);
        set(3, type);
        set(4, metadata);
    }
}