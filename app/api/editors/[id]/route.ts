import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { deleteFile } from "@/lib/blob-storage"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
  // Try to determine editor id from route params first, then fall back to
  // query string (e.g. /api/editors?id=...), then finally attempt to read
  // the request body. This helps callers that mistakenly send the id in the
  // wrong place and prevents opaque "id required" errors.
  // Note: in some Next.js setups `params` can be a Promise and must be awaited.
  const resolvedParams: any = await params
  let id: string | undefined = resolvedParams?.id
  console.log("[v0] Incoming delete request URL:", request.nextUrl?.href ?? request.url)
  console.log("[v0] Starting editor deletion for ID (from params):", id)

    if (!id) {
      // Try query string fallback
      try {
        const qsId = request.nextUrl?.searchParams.get("id")
        if (qsId) {
          id = qsId
          console.log("[v0] Found editor id in query string:", id)
        }
      } catch (e) {
        // ignore
      }
    }

    if (!id) {
      // Try body fallback (not typical for DELETE but some clients send JSON)
      try {
        // request.json() may throw if there's no body or invalid JSON
        const body = await request.json().catch(() => null)
        if (body && typeof body === "object" && (body as any).id) {
          id = String((body as any).id)
          console.log("[v0] Found editor id in request body:", id)
        }
      } catch (e) {
        // ignore parsing errors
      }
    }

    if (!id) {
      console.warn("[v0] No editor id provided in params, query string, or body. Request URL:", request.nextUrl?.href ?? request.url)
      return NextResponse.json({ error: "Editor id is required", requestedUrl: request.nextUrl?.href ?? request.url }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    const { data: uploads, error: fetchError } = await supabase
      .from("uploads")
      .select("media_url, thumbnail_url")
      .eq("editor_id", id)

    if (fetchError) {
      console.error("[v0] Error fetching uploads:", fetchError)
      throw new Error(`Failed to fetch uploads: ${fetchError.message}`)
    }

    if (uploads && uploads.length > 0) {
      console.log(`[v0] Deleting ${uploads.length} media files for editor ${id}`)

      for (const upload of uploads) {
        try {
          if (upload.media_url) {
            await deleteFile(upload.media_url)
            console.log("[v0] Deleted media file:", upload.media_url)
          }
          if (upload.thumbnail_url) {
            await deleteFile(upload.thumbnail_url)
            console.log("[v0] Deleted thumbnail file:", upload.thumbnail_url)
          }
        } catch (err) {
          console.warn("[v0] Warning: Could not delete blob file, continuing with database cleanup:", err)
          // Continue with deletion even if blob deletion fails - data integrity is more important
        }
      }
    }

    console.log("[v0] Deleting uploads from database for editor:", id)
    const { data: deletedUploads, error: uploadsError } = await supabase
      .from("uploads")
      .delete()
      .eq("editor_id", id)

    if (uploadsError) {
      console.error("[v0] Error deleting uploads:", uploadsError)
      throw new Error(`Failed to delete uploads: ${uploadsError.message}`)
    }

  console.log("[v0] Deleted uploads rows:", Array.isArray(deletedUploads) ? (deletedUploads as any).length : deletedUploads)

    console.log("[v0] Deleting logs from database for editor:", id)
    const { data: deletedLogs, error: logsError } = await supabase.from("logs").delete().eq("editor_id", id)

    if (logsError) {
      console.error("[v0] Error deleting logs:", logsError)
      throw new Error(`Failed to delete logs: ${logsError.message}`)
    }
  console.log("[v0] Deleted logs rows:", Array.isArray(deletedLogs) ? (deletedLogs as any).length : deletedLogs)

    console.log("[v0] Deleting editor profile for id:", id)
    const { data: deletedEditor, error: editorError } = await supabase.from("editors").delete().eq("id", id)

    if (editorError) {
      console.error("[v0] Error deleting editor:", editorError)
      throw new Error(`Failed to delete editor: ${editorError.message}`)
    }

    console.log("[v0] Deleted editor row:", deletedEditor)

    console.log("[v0] Editor deletion completed successfully")
    return NextResponse.json({
      success: true,
      message: "Editor and all related data deleted successfully",
    })
  } catch (error) {
    console.error("[v0] Delete editor error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json(
      {
        error: "Failed to delete editor",
        details: errorMessage,
        message: "Please try again or contact support if the problem persists",
      },
      { status: 500 },
    )
  }
}
