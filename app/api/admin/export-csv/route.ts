import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "all" // 'all', 'videos', 'images'

    const supabase = await createServiceRoleClient()

    // Only select the columns we need for the CSV: media_type, file_name,
    // caption (used as description), media_url and thumbnail_url. Keep order
    // deterministic by created_at desc so exported rows are predictable.
    let query = supabase
      .from("uploads")
      .select("media_type, file_name, caption, media_url, thumbnail_url, created_at")
      .order("created_at", { ascending: false })

    if (type === "videos") {
      query = query.eq("media_type", "video")
    } else if (type === "images") {
      query = query.eq("media_type", "image")
    }

    const { data: uploads, error } = await query

    if (error) throw error

    // Generate CSV content with only the requested columns and order:
    // Media Type, File Name, Description, Media Link, Thumbnail Link (only for videos)
    const headers = ["Media Type", "File Name", "Description", "Media Link", "Thumbnail Link"]

    const rows = uploads.map((upload: any) => {
      const mediaType = upload.media_type || "unknown"
      const fileName = upload.file_name || ""
      const description = upload.caption || ""
      const mediaLink = upload.media_url || ""
      // Only include thumbnail URL for video types; otherwise leave empty
      const thumbnailLink = mediaType === "video" ? (upload.thumbnail_url || "") : ""

      // CSV escaping for double quotes
      const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`

      return [esc(mediaType), esc(fileName), esc(description), esc(mediaLink), esc(thumbnailLink)]
    })

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    const fileName = `uploads-${type}-${new Date().toISOString().split("T")[0]}.csv`

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("CSV export error:", error)
    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 })
  }
}
