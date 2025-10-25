import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Fetching all editors")
    const supabase = await createServiceRoleClient()
    const { data, error } = await supabase.from("editors").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching editors:", error)
      throw error
    }

    console.log("[v0] Successfully fetched editors:", data?.length || 0)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error fetching editors:", error)
    return NextResponse.json({ error: "Failed to fetch editors" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Creating new editor")
    const { name, type, description } = await request.json()

    if (!name || !name.trim()) {
      console.warn("[v0] Editor name is required")
      return NextResponse.json({ error: "Editor name is required" }, { status: 400 })
    }

    if (!type || !["video", "graphic"].includes(type)) {
      console.warn("[v0] Invalid editor type:", type)
      return NextResponse.json({ error: "Invalid editor type. Must be 'video' or 'graphic'" }, { status: 400 })
    }

    if (!description || description.trim().length === 0) {
      console.warn("[v0] Editor description is required")
      return NextResponse.json({ error: "Description is required and cannot be empty" }, { status: 400 })
    }

    const secretLink = `${type}-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`
    console.log("[v0] Generated secret link:", secretLink)

    const supabase = await createServiceRoleClient()
    const { data, error } = await supabase
      .from("editors")
      .insert({
        name: name.trim(),
        type,
        description: description.trim(),
        secret_link: secretLink,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating editor:", error)
      throw new Error(`Failed to create editor: ${error.message}`)
    }

    console.log("[v0] Editor created successfully:", data.id)
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating editor:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        error: "Failed to create editor",
        details: errorMessage,
        message: "Please check your input and try again",
      },
      { status: 500 },
    )
  }
}
