import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient()

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Fetch uploads older than 7 days
    const { data: oldUploads, error: fetchError } = await supabase
      .from("uploads")
      .select("*")
      .lt("created_at", sevenDaysAgo.toISOString())

    if (fetchError) throw fetchError

    if (oldUploads && oldUploads.length > 0) {
      const logsData = oldUploads.map((upload) => ({
        editor_id: upload.editor_id,
        file_name: upload.file_name,
        caption: upload.caption,
        media_url: upload.media_url,
        created_at: upload.created_at,
        archive_reason: "purge_old",
      }))
      // Insert logs; if archive_reason doesn't exist in schema, retry
      // without it so purge can continue.
      let { error: insertError } = await supabase.from("logs").insert(logsData)

      if (insertError) {
        console.warn("Purge: failed to insert logs with archive_reason, attempting fallback insert without archive_reason:", insertError)

        const fallback = oldUploads.map((upload) => ({
          editor_id: upload.editor_id,
          file_name: upload.file_name,
          caption: upload.caption,
          media_url: upload.media_url,
          created_at: upload.created_at,
        }))

        const { error: fallbackError } = await supabase.from("logs").insert(fallback)
        if (fallbackError) {
          console.error("Purge: fallback insert also failed:", fallbackError)
          throw fallbackError
        }
        insertError = null
      }
    }

    // Delete records from database
    const { error: deleteError } = await supabase.from("uploads").delete().lt("created_at", sevenDaysAgo.toISOString())

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      archivedCount: oldUploads?.length || 0,
    })
  } catch (error) {
    console.error("Purge error:", error)
    return NextResponse.json({ error: "Failed to purge uploads" }, { status: 500 })
  }
}
