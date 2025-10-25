import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const editorId = searchParams.get("editorId")

    const supabase = await createClient()
    let query = supabase.from("uploads").select("*")

    if (editorId) {
      query = query.eq("editor_id", editorId)
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    })

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching uploads:", error)
    return NextResponse.json({ error: "Failed to fetch uploads" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get("uploadId")

    if (!uploadId) {
      return NextResponse.json({ error: "Missing uploadId" }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.from("uploads").delete().eq("id", uploadId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting upload:", error)
    return NextResponse.json({ error: "Failed to delete upload" }, { status: 500 })
  }
}
