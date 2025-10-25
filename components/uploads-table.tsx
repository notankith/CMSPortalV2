"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Copy, Play, ImageIcon, ChevronUp, ChevronDown, FileDown } from "lucide-react"

interface Editor {
  id: string
  name: string
  type: "video" | "graphic"
}

interface Upload {
  id: string
  file_name: string
  caption: string | null
  media_url: string
  created_at: string
  editor_id: string
  editors: Editor
}

type SortField = "date" | "name" | "uploader" | "type"
type SortOrder = "asc" | "desc"

export function UploadsTable() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    fetchUploads()
  }, [])

  const fetchUploads = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/all-uploads")
      if (!response.ok) throw new Error("Failed to fetch uploads")
      const data = await response.json()
      setUploads(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load uploads")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const handleDownload = async (upload: Upload) => {
    try {
      const response = await fetch(upload.media_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = upload.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error("Download failed:", err)
    }
  }

  const handleCopyCaption = (caption: string | null, uploadId: string) => {
    if (!caption) return
    navigator.clipboard.writeText(caption)
    setCopiedId(uploadId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleExportCSV = async (type: "all" | "videos" | "images") => {
    try {
      setIsExporting(true)
      const response = await fetch(`/api/admin/export-csv?type=${type}`)
      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const fileName =
        response.headers.get("content-disposition")?.split("filename=")[1]?.replace(/"/g, "") || `uploads-${type}.csv`
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error("CSV export failed:", err)
    } finally {
      setIsExporting(false)
    }
  }

  const isVideo = (fileName: string) => {
    const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"]
    return videoExtensions.some((ext) => fileName.toLowerCase().endsWith(ext))
  }

  const getMediaPreview = (upload: Upload) => {
    const video = isVideo(upload.file_name)
    if (video) {
      return (
        <div className="relative w-12 h-12 bg-gray-900 rounded flex items-center justify-center">
          <Play className="h-5 w-5 text-blue-400" />
        </div>
      )
    }
    return (
      <div className="relative w-12 h-12 bg-gray-900 rounded flex items-center justify-center">
        <ImageIcon className="h-5 w-5 text-purple-400" />
      </div>
    )
  }

  let filteredUploads = uploads.filter(
    (upload) =>
      upload.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.editors.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Sort uploads
  filteredUploads = filteredUploads.sort((a, b) => {
    let aVal: string | number = ""
    let bVal: string | number = ""

    switch (sortField) {
      case "date":
        aVal = new Date(a.created_at).getTime()
        bVal = new Date(b.created_at).getTime()
        break
      case "name":
        aVal = a.file_name.toLowerCase()
        bVal = b.file_name.toLowerCase()
        break
      case "uploader":
        aVal = a.editors.name.toLowerCase()
        bVal = b.editors.name.toLowerCase()
        break
      case "type":
        aVal = a.editors.type
        bVal = b.editors.type
        break
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }

    return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900 transition-colors"
    >
      {label}
      {sortField === field &&
        (sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
    </button>
  )

  if (isLoading) {
    return <p className="text-gray-600">Loading uploads...</p>
  }

  if (error) {
    return <p className="text-red-600">{error}</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Uploads</CardTitle>
        <CardDescription>Manage and download media from all editors and designers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <Input
            placeholder="Search by file name, description, or uploader..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExportCSV("videos")}
              disabled={isExporting}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Export Reels CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExportCSV("images")}
              disabled={isExporting}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Export Images CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExportCSV("all")}
              disabled={isExporting}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Export All CSV
            </Button>
          </div>
        </div>

        {filteredUploads.length === 0 ? (
          <p className="text-gray-600 py-8 text-center">No uploads found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">
                    <SortHeader field="type" label="Type" />
                  </th>
                  <th className="text-left py-3 px-4">Preview</th>
                  <th className="text-left py-3 px-4">
                    <SortHeader field="name" label="File Name" />
                  </th>
                  <th className="text-left py-3 px-4">Description</th>
                  <th className="text-left py-3 px-4">
                    <SortHeader field="uploader" label="Uploader" />
                  </th>
                  <th className="text-left py-3 px-4">
                    <SortHeader field="date" label="Upload Date" />
                  </th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUploads.map((upload) => (
                  <tr key={upload.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          upload.editors.type === "video"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {upload.editors.type === "video" ? "Video" : "Photo"}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getMediaPreview(upload)}</td>
                    <td className="py-3 px-4">
                      <p className="text-gray-900 font-medium truncate max-w-xs">{upload.file_name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-600 truncate max-w-xs">{upload.caption || "-"}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-900">{upload.editors.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-600">{new Date(upload.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(upload)}
                          title="Download media"
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyCaption(upload.caption, upload.id)}
                          title="Copy description"
                          className="h-8 w-8 p-0"
                          disabled={!upload.caption}
                        >
                          <Copy className={`h-4 w-4 ${copiedId === upload.id ? "text-green-600" : ""}`} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-sm text-gray-600 pt-4">
          Showing {filteredUploads.length} of {uploads.length} uploads
        </div>
      </CardContent>
    </Card>
  )
}
