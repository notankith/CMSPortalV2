"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Trash2, Download, Copy } from "lucide-react"

interface LogEntry {
  id: string
  editor_id: string
  file_name: string
  caption: string | null
  media_url: string
  created_at: string
  archived_at: string
  archive_reason: "daily_reset" | "purge_old" | "manual"
  editors: {
    name: string
    type: "video" | "graphic"
  }
}

type SortField = "created_at" | "archived_at" | "file_name" | "editor_name"
type SortOrder = "asc" | "desc"

export function LogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortField, setSortField] = useState<SortField>("archived_at")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/logs")
      if (!response.ok) throw new Error("Failed to fetch logs")
      const data = await response.json()
      setLogs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectLog = (logId: string) => {
    const newSelected = new Set(selectedLogs)
    if (newSelected.has(logId)) {
      newSelected.delete(logId)
    } else {
      newSelected.add(logId)
    }
    setSelectedLogs(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedLogs.size === logs.length) {
      setSelectedLogs(new Set())
    } else {
      setSelectedLogs(new Set(logs.map((log) => log.id)))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedLogs.size === 0) return
    if (!confirm(`Delete ${selectedLogs.size} log entry(ies)?`)) return

    try {
      setIsDeleting(true)
      const response = await fetch("/api/admin/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logIds: Array.from(selectedLogs) }),
      })

      if (!response.ok) throw new Error("Failed to delete logs")

      setLogs(logs.filter((log) => !selectedLogs.has(log.id)))
      setSelectedLogs(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete logs")
    } finally {
      setIsDeleting(false)
    }
  }

  const getArchiveReasonLabel = (reason: string) => {
    switch (reason) {
      case "daily_reset":
        return "Daily Reset"
      case "purge_old":
        return "Auto-Purge (7+ days)"
      case "manual":
        return "Manual Delete"
      default:
        return reason
    }
  }

  const getArchiveReasonColor = (reason: string) => {
    switch (reason) {
      case "daily_reset":
        return "bg-blue-100 text-blue-700"
      case "purge_old":
        return "bg-orange-100 text-orange-700"
      case "manual":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const isVideoFile = (fileName: string) => {
    const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"]
    return videoExtensions.some((ext) => fileName.toLowerCase().endsWith(ext))
  }

  const handleDownload = (mediaUrl: string, fileName: string) => {
    const link = document.createElement("a")
    link.href = mediaUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const copyCaption = (caption: string, logId: string) => {
    navigator.clipboard.writeText(caption)
    setCopiedId(logId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const sortedLogs = [...logs].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case "created_at":
        aValue = new Date(a.created_at).getTime()
        bValue = new Date(b.created_at).getTime()
        break
      case "archived_at":
        aValue = new Date(a.archived_at).getTime()
        bValue = new Date(b.archived_at).getTime()
        break
      case "file_name":
        aValue = a.file_name.toLowerCase()
        bValue = b.file_name.toLowerCase()
        break
      case "editor_name":
        aValue = a.editors.name.toLowerCase()
        bValue = b.editors.name.toLowerCase()
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
    return 0
  })

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Logs</CardTitle>
        <CardDescription>View archived uploads from resets and purges</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {isLoading ? (
          <p className="text-gray-600">Loading logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-600">No archived uploads yet.</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedLogs.size === logs.length && logs.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">
                  {selectedLogs.size > 0 ? `${selectedLogs.size} selected` : "Select all"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Sort by:</span>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="archived_at">Archived Date</option>
                  <option value="created_at">Upload Date</option>
                  <option value="file_name">File Name</option>
                  <option value="editor_name">Editor Name</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </button>
              </div>
              {selectedLogs.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              )}
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {sortedLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedLogs.has(log.id)}
                    onChange={() => handleSelectLog(log.id)}
                    className="mt-1 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="font-medium text-gray-900 truncate">{log.file_name}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${getArchiveReasonColor(log.archive_reason)}`}
                      >
                        {getArchiveReasonLabel(log.archive_reason)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {log.editors.name} ({log.editors.type === "video" ? "Video Editor" : "Graphic Designer"})
                    </p>
                    {log.caption && (
                      <div className="mb-2 p-2 bg-white rounded border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium mb-1">Description:</p>
                        <p className="text-sm text-gray-700">{log.caption}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Uploaded: {new Date(log.created_at).toLocaleString()} | Archived:{" "}
                      {new Date(log.archived_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isVideoFile(log.file_name) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(log.media_url, log.file_name)}
                        className="h-8 w-8 p-0"
                        title="Download video"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {log.caption && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCaption(log.caption!, log.id)}
                        className="h-8 w-8 p-0"
                        title="Copy description"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
