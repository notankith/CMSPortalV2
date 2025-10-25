"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Trash2, RotateCcw } from "lucide-react"

export function ArchiveManagement() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handlePurgeOldUploads = async () => {
    if (!confirm("This will archive all uploads older than 7 days to the logs. This action cannot be undone.")) return

    try {
      setIsLoading(true)
      setError(null)
      setSuccess(null)

      const response = await fetch("/api/admin/purge", { method: "POST" })
      if (!response.ok) throw new Error("Failed to purge old uploads")

      const data = await response.json()
      setSuccess(`Successfully archived ${data.archivedCount} old upload(s) to logs`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to purge uploads")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetDaily = async () => {
    if (!confirm("This will archive ALL uploads from today to the logs. This action cannot be undone.")) return

    try {
      setIsLoading(true)
      setError(null)
      setSuccess(null)

      const response = await fetch("/api/admin/reset-daily", { method: "POST" })
      if (!response.ok) throw new Error("Failed to reset daily uploads")

      const data = await response.json()
      setSuccess(`Successfully archived ${data.archivedCount} upload(s) from today to logs`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset daily uploads")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-900">Archive & Reset</CardTitle>
        <CardDescription className="text-red-800">
          Manage upload retention and reset daily uploads (archived to logs)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-100 border border-red-300 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Auto-Purge Old Uploads</h3>
            <p className="text-sm text-gray-600 mb-3">
              Automatically archive uploads older than 7 days to the logs and keep the portal clean.
            </p>
            <Button onClick={handlePurgeOldUploads} disabled={isLoading} variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" />
              {isLoading ? "Processing..." : "Archive Uploads Older Than 7 Days"}
            </Button>
          </div>

          <div className="border-t border-red-200 pt-4">
            <h3 className="font-medium text-gray-900 mb-2">Reset Daily Uploads</h3>
            <p className="text-sm text-gray-600 mb-3">
              Archive all uploads from today to the logs. Useful for daily resets or clearing the portal at the end of
              each day.
            </p>
            <Button onClick={handleResetDaily} disabled={isLoading} variant="destructive" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              {isLoading ? "Processing..." : "Archive Today's Uploads"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
