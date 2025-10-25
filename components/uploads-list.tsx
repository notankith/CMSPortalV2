"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Download, Copy, Play } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Upload {
  id: string
  file_name: string
  caption: string | null
  media_url: string
  created_at: string
}

interface UploadsListProps {
  editorId: string
  refreshTrigger?: number
}

export function UploadsList({ editorId, refreshTrigger }: UploadsListProps) {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUploads = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/uploads?editorId=${editorId}`)
        if (!response.ok) throw new Error("Failed to fetch uploads")
        const data = await response.json()
        setUploads(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load uploads")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUploads()
  }, [editorId, refreshTrigger])

  const handleDelete = async (uploadId: string) => {
    if (!confirm("Are you sure you want to delete this upload?")) return

    try {
      const response = await fetch(`/api/uploads?uploadId=${uploadId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete upload")
      setUploads(uploads.filter((u) => u.id !== uploadId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete upload")
    }
  }

  const handleDownload = (mediaUrl: string, fileName: string) => {
    const link = document.createElement("a")
    link.href = mediaUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const copyCaption = (caption: string, uploadId: string) => {
    navigator.clipboard.writeText(caption)
    setCopiedId(uploadId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const isVideoFile = (fileName: string) => {
    const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"]
    return videoExtensions.some((ext) => fileName.toLowerCase().endsWith(ext))
  }

  const isImageFile = (fileName: string) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]
    return imageExtensions.some((ext) => fileName.toLowerCase().endsWith(ext))
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading uploads...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Uploads</CardTitle>
        <CardDescription>{uploads.length} file(s) uploaded</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {uploads.length === 0 ? (
          <p className="text-sm text-gray-500">No uploads yet. Start by uploading a file above.</p>
        ) : (
          <div className="space-y-4">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {isVideoFile(upload.file_name) && (
                  <div className="bg-gray-900 aspect-video flex items-center justify-center">
                    <Play className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                {isImageFile(upload.file_name) && (
                  <div className="bg-gray-100 aspect-video overflow-hidden">
                    <img
                      src={upload.media_url || "/placeholder.svg"}
                      alt={upload.file_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{upload.file_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {upload.caption && (
                    <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs text-gray-600 font-medium mb-1">Description:</p>
                      <p className="text-sm text-gray-700">{upload.caption}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {isVideoFile(upload.file_name) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(upload.media_url, upload.file_name)}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    )}

                    {upload.caption && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyCaption(upload.caption!, upload.id)}
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        {copiedId === upload.id ? "Copied!" : "Copy Description"}
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(upload.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
