package com.hstar.crylic.services

import com.hstar.crylic.db.generated.Tables
import com.hstar.crylic.db.generated.tables.pojos.Project
import com.hstar.crylic.model.GithubProjectMetadata
import com.squareup.moshi.Moshi
import org.jooq.DSLContext
import org.jooq.JSONB
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import org.springframework.validation.annotation.Validated
import java.util.*
import javax.validation.constraints.NotBlank

@Service
@Validated
class ProjectService {
    @Autowired
    private lateinit var dsl: DSLContext

    fun addGitHubProject(userId: UUID, @NotBlank name: String, @NotBlank githubUrl: String): Project {
        val moshi = Moshi.Builder().build()
        val metadata = moshi.adapter(GithubProjectMetadata::class.java).toJson(GithubProjectMetadata(githubUrl))

        return dsl.insertInto(Tables.PROJECT)
                .columns(Tables.PROJECT.NAME, Tables.PROJECT.OWNER_ID, Tables.PROJECT.TYPE, Tables.PROJECT.METADATA)
                .values(name, userId, "github", JSONB.valueOf(metadata))
                .returningResult(Tables.PROJECT.asterisk()).fetchOne().into(Project::class.java)
    }

    fun getProject(id: UUID) = dsl.selectFrom(Tables.PROJECT.where(Tables.PROJECT.ID.eq(id))).fetchAny()?.into(Project::class.java)
}