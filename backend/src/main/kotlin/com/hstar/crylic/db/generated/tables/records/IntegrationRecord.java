/*
 * This file is generated by jOOQ.
 */
package com.hstar.crylic.db.generated.tables.records;


import com.hstar.crylic.db.generated.tables.Integration;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.jooq.Field;
import org.jooq.Record1;
import org.jooq.Record6;
import org.jooq.Row6;
import org.jooq.impl.UpdatableRecordImpl;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class IntegrationRecord extends UpdatableRecordImpl<IntegrationRecord> implements Record6<Integer, UUID, String, String, OffsetDateTime, OffsetDateTime> {

    private static final long serialVersionUID = -1759102125;

    /**
     * Setter for <code>public.Integration.id</code>.
     */
    public IntegrationRecord setId(Integer value) {
        set(0, value);
        return this;
    }

    /**
     * Getter for <code>public.Integration.id</code>.
     */
    public Integer getId() {
        return (Integer) get(0);
    }

    /**
     * Setter for <code>public.Integration.user_id</code>.
     */
    public IntegrationRecord setUserId(UUID value) {
        set(1, value);
        return this;
    }

    /**
     * Getter for <code>public.Integration.user_id</code>.
     */
    public UUID getUserId() {
        return (UUID) get(1);
    }

    /**
     * Setter for <code>public.Integration.type</code>.
     */
    public IntegrationRecord setType(String value) {
        set(2, value);
        return this;
    }

    /**
     * Getter for <code>public.Integration.type</code>.
     */
    public String getType() {
        return (String) get(2);
    }

    /**
     * Setter for <code>public.Integration.token</code>.
     */
    public IntegrationRecord setToken(String value) {
        set(3, value);
        return this;
    }

    /**
     * Getter for <code>public.Integration.token</code>.
     */
    public String getToken() {
        return (String) get(3);
    }

    /**
     * Setter for <code>public.Integration.created_at</code>.
     */
    public IntegrationRecord setCreatedAt(OffsetDateTime value) {
        set(4, value);
        return this;
    }

    /**
     * Getter for <code>public.Integration.created_at</code>.
     */
    public OffsetDateTime getCreatedAt() {
        return (OffsetDateTime) get(4);
    }

    /**
     * Setter for <code>public.Integration.updated_at</code>.
     */
    public IntegrationRecord setUpdatedAt(OffsetDateTime value) {
        set(5, value);
        return this;
    }

    /**
     * Getter for <code>public.Integration.updated_at</code>.
     */
    public OffsetDateTime getUpdatedAt() {
        return (OffsetDateTime) get(5);
    }

    // -------------------------------------------------------------------------
    // Primary key information
    // -------------------------------------------------------------------------

    @Override
    public Record1<Integer> key() {
        return (Record1) super.key();
    }

    // -------------------------------------------------------------------------
    // Record6 type implementation
    // -------------------------------------------------------------------------

    @Override
    public Row6<Integer, UUID, String, String, OffsetDateTime, OffsetDateTime> fieldsRow() {
        return (Row6) super.fieldsRow();
    }

    @Override
    public Row6<Integer, UUID, String, String, OffsetDateTime, OffsetDateTime> valuesRow() {
        return (Row6) super.valuesRow();
    }

    @Override
    public Field<Integer> field1() {
        return Integration.INTEGRATION.ID;
    }

    @Override
    public Field<UUID> field2() {
        return Integration.INTEGRATION.USER_ID;
    }

    @Override
    public Field<String> field3() {
        return Integration.INTEGRATION.TYPE;
    }

    @Override
    public Field<String> field4() {
        return Integration.INTEGRATION.TOKEN;
    }

    @Override
    public Field<OffsetDateTime> field5() {
        return Integration.INTEGRATION.CREATED_AT;
    }

    @Override
    public Field<OffsetDateTime> field6() {
        return Integration.INTEGRATION.UPDATED_AT;
    }

    @Override
    public Integer component1() {
        return getId();
    }

    @Override
    public UUID component2() {
        return getUserId();
    }

    @Override
    public String component3() {
        return getType();
    }

    @Override
    public String component4() {
        return getToken();
    }

    @Override
    public OffsetDateTime component5() {
        return getCreatedAt();
    }

    @Override
    public OffsetDateTime component6() {
        return getUpdatedAt();
    }

    @Override
    public Integer value1() {
        return getId();
    }

    @Override
    public UUID value2() {
        return getUserId();
    }

    @Override
    public String value3() {
        return getType();
    }

    @Override
    public String value4() {
        return getToken();
    }

    @Override
    public OffsetDateTime value5() {
        return getCreatedAt();
    }

    @Override
    public OffsetDateTime value6() {
        return getUpdatedAt();
    }

    @Override
    public IntegrationRecord value1(Integer value) {
        setId(value);
        return this;
    }

    @Override
    public IntegrationRecord value2(UUID value) {
        setUserId(value);
        return this;
    }

    @Override
    public IntegrationRecord value3(String value) {
        setType(value);
        return this;
    }

    @Override
    public IntegrationRecord value4(String value) {
        setToken(value);
        return this;
    }

    @Override
    public IntegrationRecord value5(OffsetDateTime value) {
        setCreatedAt(value);
        return this;
    }

    @Override
    public IntegrationRecord value6(OffsetDateTime value) {
        setUpdatedAt(value);
        return this;
    }

    @Override
    public IntegrationRecord values(Integer value1, UUID value2, String value3, String value4, OffsetDateTime value5, OffsetDateTime value6) {
        value1(value1);
        value2(value2);
        value3(value3);
        value4(value4);
        value5(value5);
        value6(value6);
        return this;
    }

    // -------------------------------------------------------------------------
    // Constructors
    // -------------------------------------------------------------------------

    /**
     * Create a detached IntegrationRecord
     */
    public IntegrationRecord() {
        super(Integration.INTEGRATION);
    }

    /**
     * Create a detached, initialised IntegrationRecord
     */
    public IntegrationRecord(Integer id, UUID userId, String type, String token, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        super(Integration.INTEGRATION);

        set(0, id);
        set(1, userId);
        set(2, type);
        set(3, token);
        set(4, createdAt);
        set(5, updatedAt);
    }
}
