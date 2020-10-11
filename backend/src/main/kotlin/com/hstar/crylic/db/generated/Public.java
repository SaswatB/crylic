/*
 * This file is generated by jOOQ.
 */
package com.hstar.crylic.db.generated;


import com.hstar.crylic.db.generated.tables.FlywaySchemaHistory;
import com.hstar.crylic.db.generated.tables.Integration;
import com.hstar.crylic.db.generated.tables.PgpArmorHeaders;
import com.hstar.crylic.db.generated.tables.Project;
import com.hstar.crylic.db.generated.tables.User;
import com.hstar.crylic.db.generated.tables.Viewer;
import com.hstar.crylic.db.generated.tables.records.PgpArmorHeadersRecord;
import com.hstar.crylic.db.generated.tables.records.ViewerRecord;

import java.util.Arrays;
import java.util.List;

import org.jooq.Catalog;
import org.jooq.Configuration;
import org.jooq.Field;
import org.jooq.JSON;
import org.jooq.Result;
import org.jooq.Sequence;
import org.jooq.Table;
import org.jooq.impl.SchemaImpl;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class Public extends SchemaImpl {

    private static final long serialVersionUID = 2051803842;

    /**
     * The reference instance of <code>public</code>
     */
    public static final Public PUBLIC = new Public();

    /**
     * The table <code>public.flyway_schema_history</code>.
     */
    public final FlywaySchemaHistory FLYWAY_SCHEMA_HISTORY = FlywaySchemaHistory.FLYWAY_SCHEMA_HISTORY;

    /**
     * The table <code>public.Integration</code>.
     */
    public final Integration INTEGRATION = Integration.INTEGRATION;

    /**
     * The table <code>public.pgp_armor_headers</code>.
     */
    public final PgpArmorHeaders PGP_ARMOR_HEADERS = PgpArmorHeaders.PGP_ARMOR_HEADERS;

    /**
     * Call <code>public.pgp_armor_headers</code>.
     */
    public static Result<PgpArmorHeadersRecord> PGP_ARMOR_HEADERS(Configuration configuration, String __1) {
        return configuration.dsl().selectFrom(com.hstar.crylic.db.generated.tables.PgpArmorHeaders.PGP_ARMOR_HEADERS.call(__1)).fetch();
    }

    /**
     * Get <code>public.pgp_armor_headers</code> as a table.
     */
    public static PgpArmorHeaders PGP_ARMOR_HEADERS(String __1) {
        return com.hstar.crylic.db.generated.tables.PgpArmorHeaders.PGP_ARMOR_HEADERS.call(__1);
    }

    /**
     * Get <code>public.pgp_armor_headers</code> as a table.
     */
    public static PgpArmorHeaders PGP_ARMOR_HEADERS(Field<String> __1) {
        return com.hstar.crylic.db.generated.tables.PgpArmorHeaders.PGP_ARMOR_HEADERS.call(__1);
    }

    /**
     * The table <code>public.Project</code>.
     */
    public final Project PROJECT = Project.PROJECT;

    /**
     * The table <code>public.User</code>.
     */
    public final User USER = User.USER;

    /**
     * The table <code>public.viewer</code>.
     */
    public final Viewer VIEWER = Viewer.VIEWER;

    /**
     * Call <code>public.viewer</code>.
     */
    public static Result<ViewerRecord> VIEWER(Configuration configuration, JSON hasuraSession) {
        return configuration.dsl().selectFrom(com.hstar.crylic.db.generated.tables.Viewer.VIEWER.call(hasuraSession)).fetch();
    }

    /**
     * Get <code>public.viewer</code> as a table.
     */
    public static Viewer VIEWER(JSON hasuraSession) {
        return com.hstar.crylic.db.generated.tables.Viewer.VIEWER.call(hasuraSession);
    }

    /**
     * Get <code>public.viewer</code> as a table.
     */
    public static Viewer VIEWER(Field<JSON> hasuraSession) {
        return com.hstar.crylic.db.generated.tables.Viewer.VIEWER.call(hasuraSession);
    }

    /**
     * No further instances allowed
     */
    private Public() {
        super("public", null);
    }


    @Override
    public Catalog getCatalog() {
        return DefaultCatalog.DEFAULT_CATALOG;
    }

    @Override
    public final List<Sequence<?>> getSequences() {
        return Arrays.<Sequence<?>>asList(
            Sequences.INTEGRATIONS_ID_SEQ);
    }

    @Override
    public final List<Table<?>> getTables() {
        return Arrays.<Table<?>>asList(
            FlywaySchemaHistory.FLYWAY_SCHEMA_HISTORY,
            Integration.INTEGRATION,
            PgpArmorHeaders.PGP_ARMOR_HEADERS,
            Project.PROJECT,
            User.USER,
            Viewer.VIEWER);
    }
}
