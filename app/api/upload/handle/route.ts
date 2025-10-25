import { NextResponse } from "next/server"
import { handleUpload } from "@vercel/blob/client"
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

    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        let payload: {
          editorId?: string
          mediaType?: "video" | "image"
          isThumbnail?: boolean
          fileName?: string
          fileType?: string
          fileSize?: number
        } = {}

        if (typeof clientPayload === "string") {
          try {
            payload = JSON.parse(clientPayload)
          } catch (parseError) {
            throw new Error("Invalid upload metadata payload")
          }
        }

        const editorId = payload?.editorId
        const mediaType = payload?.mediaType ?? "image"
        const isThumbnail = payload?.isThumbnail ?? false
        const fileName = payload?.fileName
        const fileType = payload?.fileType
        const fileSize = payload?.fileSize ?? 0

        if (!editorId) {
          throw new Error("Editor ID is required")
        }

        if (!fileName) {
          throw new Error("File name is required")
        }

        if (!fileType) {
          throw new Error("File type is required")
        }

        const allowedTypes = isThumbnail ? IMAGE_TYPES : mediaType === "video" ? VIDEO_TYPES : IMAGE_TYPES
        if (!allowedTypes.includes(fileType)) {
          throw new Error(`Unsupported file type: ${fileType}`)
        }

        const maxSize = isThumbnail ? MAX_IMAGE_SIZE : mediaType === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
        if (fileSize > maxSize) {
          throw new Error(`File exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`)
        }

        const timestamp = Date.now()
        const safeName = sanitizeFileName(fileName)
        const directory = isThumbnail ? "thumbnails" : "uploads"
        const slug = `${directory}/${editorId}/${timestamp}-${safeName}`

        // handleUpload expects us to return token options
        return {
          allowedContentTypes: allowedTypes,
          maximumSizeInBytes: maxSize,
          pathname: slug,
          tokenPayload: JSON.stringify({
            editorId,
            mediaType,
            isThumbnail: isThumbnail ? "true" : "false",
          }),
        }
      },
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error(`[v0] [${requestId}] handleUpload error:`, error)
    const message = error instanceof Error ? error.message : "Unknown error"

    await logUploadError({
      error_type: "UPLOAD_HANDLE_FAILED",
      error_message: message,
      details: { requestId },
    })

    return NextResponse.json({ error: message, requestId }, { status: 400 })
  }
}
