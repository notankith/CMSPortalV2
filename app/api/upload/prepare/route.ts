import { NextResponse } from "next/server"
import { createUploadUrl } from "@vercel/blob"
import { logUploadError } from "@/lib/error-logger"

const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024 // 5GB
const MAX_IMAGE_SIZE = 100 * 1024 * 1024 // 100MB

const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"]
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_")
}

export const runtime = "nodejs"

export async function POST(request: Request) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

  try {
    const body = await request.json()
    const {
      editorId,
      fileName,
      fileType,
      fileSize,
      mediaType,
      isThumbnail = false,
    }: {
      editorId?: string
      fileName?: string
      fileType?: string
      fileSize?: number
      mediaType?: "video" | "image"
      isThumbnail?: boolean
    } = body

    if (!editorId) {
      throw new Error("Editor ID is required")
    }

    if (!fileName) {
      throw new Error("File name is required")
    }

    if (!fileType) {
      throw new Error("File type is required")
    }

    if (typeof fileSize !== "number") {
      throw new Error("File size is required")
    }

    const safeFileName = sanitizeFileName(fileName)
    const timestamp = Date.now()
    const directory = isThumbnail ? "thumbnails" : "uploads"
    const slug = `${directory}/${editorId}/${timestamp}-${safeFileName}`

    const allowedTypes = isThumbnail ? IMAGE_TYPES : mediaType === "video" ? VIDEO_TYPES : IMAGE_TYPES
    if (!allowedTypes.includes(fileType)) {
      throw new Error(`Unsupported file type: ${fileType}`)
    }

    const maxSize = isThumbnail ? MAX_IMAGE_SIZE : mediaType === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    if (fileSize > maxSize) {
      throw new Error(`File exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`)
    }

    const upload = await createUploadUrl({
      access: "public",
      slug,
      contentType: fileType,
      tokenPayload: {
        editorId,
        isThumbnail: isThumbnail ? "true" : "false",
        mediaType: mediaType || "image",
      },
      metadata: {
        editorId,
        isThumbnail: isThumbnail ? "true" : "false",
        mediaType: mediaType || "image",
      },
      maximumSizeInBytes: maxSize,
      allowedContentTypes: allowedTypes,
    })

    return NextResponse.json({
      uploadUrl: upload.url,
      token: upload.token,
      pathname: slug,
    })
  } catch (error) {
    console.error(`[v0] [${requestId}] Failed to prepare upload URL:`, error)
    const message = error instanceof Error ? error.message : "Unknown error"

    await logUploadError({
      error_type: "UPLOAD_PREPARE_FAILED",
      error_message: message,
      details: { requestId },
    })

    return NextResponse.json({ error: message, requestId }, { status: 400 })
  }
}
