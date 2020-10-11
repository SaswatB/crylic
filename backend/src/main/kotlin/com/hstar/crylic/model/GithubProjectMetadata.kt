package com.hstar.crylic.model

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class GithubProjectMetadata(val url: String)
