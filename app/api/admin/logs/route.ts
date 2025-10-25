import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient()

    const { data, error } = await supabase
      .from("logs")
      .select("*, editors(name, type)")
      .order("archived_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching logs:", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { logIds } = await request.json()

    if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
      return NextResponse.json({ error: "Invalid log IDs" }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    const { error } = await supabase.from("logs").delete().in("id", logIds)

    if (error) throw error

    return NextResponse.json({ success: true, deletedCount: logIds.length })
  } catch (error) {
    console.error("Error deleting logs:", error)
    return NextResponse.json({ error: "Failed to delete logs" }, { status: 500 })
  }
}
