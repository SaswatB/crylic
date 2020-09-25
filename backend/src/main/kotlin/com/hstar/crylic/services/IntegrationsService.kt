package com.hstar.crylic.services

import com.hstar.crylic.db.generated.Tables
import com.hstar.crylic.db.generated.tables.pojos.Integrations
import java.util.*
import java.util.UUID
import org.jooq.DSLContext
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service

@Service
class IntegrationsService {
    @Autowired
    private lateinit var dsl: DSLContext

    fun addIntegration(userId: UUID, type: String, token: String) {
        dsl.insertInto(Tables.INTEGRATIONS).columns(Tables.INTEGRATIONS.USER_ID, Tables.INTEGRATIONS.TYPE, Tables.INTEGRATIONS.TOKEN).values(userId, type, token).execute()
    }

    fun getIntegration(userId: UUID) = dsl.selectFrom(Tables.INTEGRATIONS.where(Tables.INTEGRATIONS.USER_ID.eq(userId))).fetchAny()?.into(Integrations::class.java)
}
