/*
 * This file is generated by jOOQ.
 */
package com.hstar.crylic.db.generated.tables.pojos;


import java.io.Serializable;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class PgpArmorHeaders implements Serializable {

    private static final long serialVersionUID = 117318646;

    private final String key;
    private final String value;

    public PgpArmorHeaders(PgpArmorHeaders value) {
        this.key = value.key;
        this.value = value.value;
    }

    public PgpArmorHeaders(
        String key,
        String value
    ) {
        this.key = key;
        this.value = value;
    }

    public String getKey() {
        return this.key;
    }

    public String getValue() {
        return this.value;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder("PgpArmorHeaders (");

        sb.append(key);
        sb.append(", ").append(value);

        sb.append(")");
        return sb.toString();
    }
}
