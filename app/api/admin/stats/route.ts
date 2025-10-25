import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServiceRoleClient()

    const { data: uploads, error: uploadsError } = await supabase.from("uploads").select("*")
    if (uploadsError) throw uploadsError

    const { data: logs, error: logsError } = await supabase.from("logs").select("*")
    if (logsError) throw logsError

    // Combine uploads and logs for total counts
    const allContent = [...(uploads || []), ...(logs || [])]

    const totalReels = allContent.filter((u) => u.media_type === "video").length || 0
    const totalImages = allContent.filter((u) => u.media_type === "image").length || 0

    const dailyStats: { [key: string]: { videos: number; images: number } } = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Generate last 7 days
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      const dayName = dayNames[date.getDay()]
      dailyStats[dateStr] = { videos: 0, images: 0, dayName }
    }

    // Count content by date
    allContent.forEach((item) => {
      const dateStr = new Date(item.created_at).toISOString().split("T")[0]
      if (dateStr in dailyStats) {
        if (item.media_type === "video") {
          dailyStats[dateStr].videos++
        } else if (item.media_type === "image") {
          dailyStats[dateStr].images++
        }
      }
    })

    const dailyStatsArray = Object.entries(dailyStats).map(([date, counts]: any) => ({
      date,
      dayName: counts.dayName,
      videos: counts.videos,
      images: counts.images,
      total: counts.videos + counts.images,
    }))

    return NextResponse.json({
      totalReels,
      totalImages,
      dailyStats: dailyStatsArray,
    })
  } catch (error) {
    console.error("[v0] Stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
