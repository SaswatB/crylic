package com.hstar.crylic.services

import com.hstar.crylic.db.generated.Tables
import com.hstar.crylic.db.generated.tables.pojos.Integration
import java.util.*
import java.util.UUID
import org.jooq.DSLContext
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service

@Service
class IntegrationService {
    @Autowired
    private lateinit var dsl: DSLContext

    fun addIntegration(userId: UUID, type: String, token: String) {
        dsl.insertInto(Tables.INTEGRATION).columns(Tables.INTEGRATION.USER_ID, Tables.INTEGRATION.TYPE, Tables.INTEGRATION.TOKEN).values(userId, type, token).execute()
    }

    fun getIntegration(userId: UUID) = dsl.selectFrom(Tables.INTEGRATION.where(Tables.INTEGRATION.USER_ID.eq(userId))).fetchAny()?.into(Integration::class.java)
}
