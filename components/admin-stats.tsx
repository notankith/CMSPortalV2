"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface DailyStats {
  date: string
  dayName: string
  videos: number
  images: number
  total: number
}

interface StatsData {
  totalReels: number
  totalImages: number
  dailyStats: DailyStats[]
}

export function AdminStats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/admin/stats")
        if (!response.ok) throw new Error("Failed to fetch stats")
        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return <p className="text-gray-600">Loading stats...</p>
  }

  if (error || !stats) {
    return <p className="text-red-600">{error || "Failed to load stats"}</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Reels</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-600">{stats.totalReels}</p>
            <p className="text-xs text-gray-500 mt-1">Videos uploaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Images</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-purple-600">{stats.totalImages}</p>
            <p className="text-xs text-gray-500 mt-1">Images uploaded</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Flow</CardTitle>
          <CardDescription>Daily uploads over the last 15 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dayName" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                }}
                formatter={(value) => value}
              />
              <Legend />
              <Bar dataKey="videos" fill="#3b82f6" name="Reels" radius={[8, 8, 0, 0]} />
              <Bar dataKey="images" fill="#a855f7" name="Images" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Content Pieces:</span>
              <span className="font-semibold text-gray-900">{stats.totalReels + stats.totalImages}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Reels Percentage:</span>
              <span className="font-semibold text-blue-600">
                {stats.totalReels + stats.totalImages > 0
                  ? ((stats.totalReels / (stats.totalReels + stats.totalImages)) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Images Percentage:</span>
              <span className="font-semibold text-purple-600">
                {stats.totalReels + stats.totalImages > 0
                  ? ((stats.totalImages / (stats.totalReels + stats.totalImages)) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
