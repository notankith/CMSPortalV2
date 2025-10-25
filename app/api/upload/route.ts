import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { uploadFileWithRetry } from "@/lib/chunked-upload"
import { logUploadError, formatErrorForUser, extractErrorDetails } from "@/lib/error-logger"
import { detectNetworkQuality, formatNetworkDiagnostics } from "@/lib/network-diagnostics"

// Maximum file sizes (in bytes)
const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024 // 5GB
const MAX_IMAGE_SIZE = 100 * 1024 * 1024 // 100MB
const UPLOAD_TIMEOUT = 30 * 60 * 1000 // 30 minutes for large files

export async function POST(request: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const startTime = Date.now()

  console.log(`[v0] [${requestId}] Upload request received`)
  console.log(`[v0] [${requestId}] User-Agent: ${request.headers.get("user-agent")}`)

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const editorId = formData.get("editorId") as string
    const caption = formData.get("caption") as string
    const thumbnail = formData.get("thumbnail") as File | null
    const mediaType = formData.get("mediaType") as string

    console.log(`[v0] [${requestId}] Request details:`, {
      fileName: file?.name,
      fileSize: file?.size,
      fileSizeMB: file ? (file.size / 1024 / 1024).toFixed(2) : "N/A",
      editorId,
      mediaType,
      hasCaption: !!caption,
      hasThumbnail: !!thumbnail,
    })

    const networkDiagnostics = detectNetworkQuality()
    console.log(`[v0] [${requestId}] Network diagnostics: ${formatNetworkDiagnostics(networkDiagnostics)}`)

    if (!file) {
      console.warn(`[v0] [${requestId}] No file provided in upload request`)
      await logUploadError({
        error_type: "VALIDATION_ERROR",
        error_message: "No file provided",
        editor_id: editorId,
        request_id: requestId,
        details: { requestId },
      })
      return NextResponse.json({ error: "No file provided. Please select a file to upload." }, { status: 400 })
    }

    if (!editorId) {
      console.warn(`[v0] [${requestId}] No editor ID provided`)
      await logUploadError({
        error_type: "VALIDATION_ERROR",
        error_message: "No editor ID provided",
        request_id: requestId,
        details: { requestId },
      })
      return NextResponse.json({ error: "Editor ID is required" }, { status: 400 })
    }

    if (!mediaType || !["video", "image"].includes(mediaType)) {
      console.warn(`[v0] [${requestId}] Invalid media type:`, mediaType)
      await logUploadError({
        error_type: "VALIDATION_ERROR",
        error_message: `Invalid media type: ${mediaType}`,
        editor_id: editorId,
        request_id: requestId,
        details: { requestId },
      })
      return NextResponse.json({ error: "Invalid media type. Must be 'video' or 'image'" }, { status: 400 })
    }

    if (!caption || !caption.trim()) {
      console.warn(`[v0] [${requestId}] No caption provided`)
      await logUploadError({
        error_type: "VALIDATION_ERROR",
        error_message: "No caption provided",
        file_name: file.name,
        file_size: file.size,
        editor_id: editorId,
        request_id: requestId,
        details: { requestId },
      })
      return NextResponse.json({ error: "Description is required for all uploads" }, { status: 400 })
    }

    const maxSize = mediaType === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024)
      const fileSizeMB = file.size / (1024 * 1024)
      console.warn(`[v0] [${requestId}] File size ${fileSizeMB}MB exceeds maximum of ${maxSizeMB}MB`)
      await logUploadError({
        error_type: "FILE_SIZE_EXCEEDED",
        error_message: `File size ${fileSizeMB.toFixed(2)}MB exceeds maximum of ${maxSizeMB}MB`,
        file_name: file.name,
        file_size: file.size,
        editor_id: editorId,
        request_id: requestId,
        details: { requestId, maxSizeMB, fileSizeMB },
      })
      return NextResponse.json(
        { error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum of ${maxSizeMB}MB` },
        { status: 400 },
      )
    }

    const validVideoTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"]
    const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    const validTypes = mediaType === "video" ? validVideoTypes : validImageTypes

    if (!validTypes.includes(file.type)) {
      console.warn(`[v0] [${requestId}] Invalid file type: ${file.type}`)
      await logUploadError({
        error_type: "INVALID_FILE_TYPE",
        error_message: `Invalid ${mediaType} file type: ${file.type}`,
        file_name: file.name,
        file_size: file.size,
        editor_id: editorId,
        request_id: requestId,
        details: { requestId, providedType: file.type, validTypes },
      })
      return NextResponse.json(
        { error: `Invalid ${mediaType} file type. Accepted types: ${validTypes.join(", ")}` },
        { status: 400 },
      )
    }

    let thumbnailUrl: string | null = null

    if (mediaType === "video" && thumbnail) {
      console.log(`[v0] [${requestId}] Processing thumbnail upload`)

      if (thumbnail.size > MAX_IMAGE_SIZE) {
        console.warn(`[v0] [${requestId}] Thumbnail file too large`)
        await logUploadError({
          error_type: "THUMBNAIL_SIZE_EXCEEDED",
          error_message: `Thumbnail size ${(thumbnail.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of 100MB`,
          file_name: file.name,
          file_size: file.size,
          editor_id: editorId,
          request_id: requestId,
          details: { requestId, thumbnailSize: thumbnail.size },
        })
        return NextResponse.json({ error: "Thumbnail file is too large (max 100MB)" }, { status: 400 })
      }

      const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
      if (!validImageTypes.includes(thumbnail.type)) {
        console.warn(`[v0] [${requestId}] Invalid thumbnail type:`, thumbnail.type)
        await logUploadError({
          error_type: "INVALID_THUMBNAIL_TYPE",
          error_message: `Invalid thumbnail type: ${thumbnail.type}`,
          file_name: file.name,
          file_size: file.size,
          editor_id: editorId,
          request_id: requestId,
          details: { requestId, thumbnailType: thumbnail.type },
        })
        return NextResponse.json({ error: "Invalid thumbnail file type" }, { status: 400 })
      }

      try {
        const thumbnailFileName = `${Date.now()}-thumb-${thumbnail.name}`
        console.log(`[v0] [${requestId}] Uploading thumbnail:`, thumbnailFileName)
        thumbnailUrl = await uploadFileWithRetry(thumbnail, `thumbnails/${editorId}/${thumbnailFileName}`, editorId)
        console.log(`[v0] [${requestId}] Thumbnail uploaded successfully:`, thumbnailUrl)
      } catch (err) {
        console.error(`[v0] [${requestId}] Thumbnail upload error:`, err)
        await logUploadError({
          error_type: "THUMBNAIL_UPLOAD_FAILED",
          error_message: err instanceof Error ? err.message : "Unknown error",
          error_stack: err instanceof Error ? err.stack : undefined,
          file_name: file.name,
          file_size: file.size,
          editor_id: editorId,
          request_id: requestId,
          details: { requestId, error: extractErrorDetails(err) },
        })
        return NextResponse.json({ error: "Failed to upload thumbnail. Please try again." }, { status: 500 })
      }
    }

    try {
      const timestamp = Date.now()
      const fileName = `${timestamp}-${file.name}`
      console.log(
        `[v0] [${requestId}] Uploading main file:`,
        fileName,
        "Size:",
        (file.size / 1024 / 1024).toFixed(2),
        "MB",
      )

      const mediaUrl = await uploadFileWithRetry(file, `uploads/${editorId}/${fileName}`, editorId)
      console.log(`[v0] [${requestId}] Main file uploaded successfully:`, mediaUrl)

      const supabase = await createServiceRoleClient()

      const insertData = {
        editor_id: editorId,
        file_name: file.name,
        caption: caption.trim(),
        media_url: mediaUrl,
        media_type: mediaType,
        ...(thumbnailUrl && { thumbnail_url: thumbnailUrl }),
      }

      console.log(`[v0] [${requestId}] Inserting upload record:`, insertData)

      const { data, error } = await supabase.from("uploads").insert(insertData).select().single()

      if (error) {
        console.error(`[v0] [${requestId}] Database insert error:`, error)
        await logUploadError({
          error_type: "DATABASE_INSERT_FAILED",
          error_message: `Failed to save upload metadata: ${error.message}`,
          file_name: file.name,
          file_size: file.size,
          editor_id: editorId,
          request_id: requestId,
          details: { requestId, dbError: error },
        })
        throw new Error(`Failed to save upload metadata: ${error.message}`)
      }

      const totalTime = (Date.now() - startTime) / 1000
      console.log(`[v0] [${requestId}] Upload completed successfully in ${totalTime.toFixed(2)}s`)
      console.log(`[v0] [${requestId}] Average speed: ${(file.size / totalTime / 1024 / 1024).toFixed(2)}MB/s`)

      return NextResponse.json(data, { status: 201 })
    } catch (uploadErr) {
      console.error(`[v0] [${requestId}] Upload error:`, uploadErr)
      const errorMessage = uploadErr instanceof Error ? uploadErr.message : "Unknown error"
      const userMessage = formatErrorForUser(uploadErr)

      await logUploadError({
        error_type: "UPLOAD_PROCESS_FAILED",
        error_message: errorMessage,
        error_stack: uploadErr instanceof Error ? uploadErr.stack : undefined,
        file_name: file.name,
        file_size: file.size,
        editor_id: editorId,
        request_id: requestId,
        details: { requestId, error: extractErrorDetails(uploadErr) },
      })

      return NextResponse.json(
        {
          error: userMessage,
          details: errorMessage,
          requestId,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error(`[v0] [${requestId}] Request processing error:`, error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const userMessage = formatErrorForUser(error)

    await logUploadError({
      error_type: "REQUEST_PROCESSING_FAILED",
      error_message: errorMessage,
      error_stack: error instanceof Error ? error.stack : undefined,
      request_id: requestId,
      details: { error: extractErrorDetails(error) },
    })

    return NextResponse.json(
      {
        error: userMessage,
        details: errorMessage,
        requestId,
      },
      { status: 500 },
    )
  }
}

// Run this route on the Node.js runtime (not Edge) so it can handle large
// multipart uploads and use the native `formData()` implementation. On Vercel
// Edge runtime there are stricter limits and some Node APIs are unavailable.
export const runtime = "nodejs"

// Increase bodyParser size limit for this route so large uploads are allowed.
// This is a per-route setting (Next 13+). Adjust as needed based on your
// expected max upload size.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5gb",
    },
  },
}
