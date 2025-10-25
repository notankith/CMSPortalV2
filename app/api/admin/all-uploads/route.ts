import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServiceRoleClient()

    // Fetch all uploads with editor information
    const { data: uploads, error: uploadsError } = await supabase
      .from("uploads")
      .select(
        `
        id,
        file_name,
        caption,
        media_url,
        created_at,
        editor_id,
        editors:editor_id (
          id,
          name,
          type
        )
      `,
      )
      .order("created_at", { ascending: false })

    if (uploadsError) throw uploadsError

    return NextResponse.json(uploads || [])
  } catch (error) {
    console.error("Error fetching all uploads:", error)
    return NextResponse.json({ error: "Failed to fetch uploads" }, { status: 500 })
  }
}
