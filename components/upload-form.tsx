"use client"

import type { React } from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, AlertCircle, CheckCircle, X, ImageIcon, ChevronDown, Wifi } from "lucide-react"
import { detectNetworkQuality, formatNetworkDiagnostics } from "@/lib/network-diagnostics"

interface UploadFormProps {
  editorId: string
  editorName: string
  editorType: "video" | "graphic"
  onUploadSuccess: () => void
}

interface ErrorDetails {
  message: string
  details?: string
  requestId?: string
  suggestions?: string[]
  networkInfo?: string
}

export function UploadForm({ editorId, editorName, editorType, onUploadSuccess }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [caption, setCaption] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ErrorDetails | null>(null)
  const [success, setSuccess] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string | null>(null)
  const [uploadSpeed, setUploadSpeed] = useState<string | null>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [networkStatus, setNetworkStatus] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const uploadStartTimeRef = useRef<number | null>(null)

  useEffect(() => {
    const updateNetworkStatus = () => {
      const diagnostics = detectNetworkQuality()
      setNetworkStatus(formatNetworkDiagnostics(diagnostics))
    }

    updateNetworkStatus()
    const interval = setInterval(updateNetworkStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles[0]) {
      setFile(droppedFiles[0])
      setError(null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnail(e.target.files[0])
      setError(null)
    }
  }

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`
  }

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return "0 MB/s"
    const mbps = bytesPerSecond / 1024 / 1024
    if (mbps < 1) return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`
    return `${mbps.toFixed(2)} MB/s`
  }

  const getErrorSuggestions = (errorMessage: string): string[] => {
    const suggestions: string[] = []

    if (errorMessage.toLowerCase().includes("network")) {
      suggestions.push("Check your internet connection")
      suggestions.push("Try uploading from a different network")
      suggestions.push("Disable VPN if you're using one")
      suggestions.push("Move closer to your WiFi router")
    }

    if (errorMessage.toLowerCase().includes("timeout")) {
      suggestions.push("Try uploading a smaller file first")
      suggestions.push("Use a faster internet connection")
      suggestions.push("Close other applications using bandwidth")
      suggestions.push("Try during off-peak hours")
    }

    if (errorMessage.toLowerCase().includes("storage")) {
      suggestions.push("Contact support - server storage may be full")
    }

    if (errorMessage.toLowerCase().includes("file")) {
      suggestions.push("Check the file format is supported")
      suggestions.push("Verify the file is not corrupted")
      suggestions.push("Try re-encoding the video with a different codec")
    }

    if (suggestions.length === 0) {
      suggestions.push("Try uploading again")
      suggestions.push("Check your internet connection")
      suggestions.push("Contact support if the problem persists")
    }

    return suggestions
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError({ message: "Please select a file to upload" })
      return
    }

    if (!caption.trim()) {
      setError({ message: "Description is required" })
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)
    setUploadProgress(0)
    setEstimatedTimeRemaining(null)
    setUploadSpeed(null)
    setShowErrorDetails(false)
    uploadStartTimeRef.current = Date.now()

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("editorId", editorId)
      formData.append("caption", caption)
      formData.append("mediaType", editorType === "video" ? "video" : "image")

      if (editorType === "video" && thumbnail) {
        formData.append("thumbnail", thumbnail)
      }

      const xhr = new XMLHttpRequest()

      xhr.timeout = 2 * 60 * 60 * 1000

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100
          setUploadProgress(Math.round(percentComplete))

          if (uploadStartTimeRef.current) {
            const elapsedSeconds = (Date.now() - uploadStartTimeRef.current) / 1000
            const uploadSpeedBps = e.loaded / elapsedSeconds
            const remainingBytes = e.total - e.loaded
            const estimatedSeconds = remainingBytes / uploadSpeedBps

            setUploadSpeed(formatSpeed(uploadSpeedBps))
            setEstimatedTimeRemaining(formatTimeRemaining(estimatedSeconds))
          }
        }
      })

      xhr.addEventListener("load", () => {
        if (xhr.status === 201 || xhr.status === 200) {
          setFile(null)
          setThumbnail(null)
          setCaption("")
          setSuccess(true)
          setUploadProgress(100)
          setEstimatedTimeRemaining(null)
          setUploadSpeed(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
          if (thumbnailInputRef.current) {
            thumbnailInputRef.current.value = ""
          }
          setTimeout(() => {
            setSuccess(false)
            setUploadProgress(0)
          }, 3000)
          onUploadSuccess()
        } else {
          try {
            const response = JSON.parse(xhr.responseText)
            const suggestions = getErrorSuggestions(response.error || "")
            setError({
              message: response.error || "Upload failed",
              details: response.details,
              requestId: response.requestId,
              suggestions,
              networkInfo: networkStatus,
            })
          } catch {
            setError({
              message: "Upload failed. Please try again.",
              suggestions: ["Try uploading again", "Contact support if the problem persists"],
              networkInfo: networkStatus,
            })
          }
        }
        setIsLoading(false)
      })

      xhr.addEventListener("error", () => {
        const suggestions = [
          "Check your internet connection",
          "Try uploading from a different network",
          "Disable VPN if you're using one",
          "Move closer to your WiFi router",
        ]
        setError({
          message: "Network error during upload. Please check your connection and try again.",
          details: "Large files may require a stable connection.",
          suggestions,
          networkInfo: networkStatus,
        })
        setIsLoading(false)
      })

      xhr.addEventListener("timeout", () => {
        const suggestions = [
          "Try uploading a smaller file first",
          "Use a faster internet connection",
          "Close other applications using bandwidth",
          "Try during off-peak hours",
        ]
        setError({
          message: "Upload timed out. This may happen with very large files on slow connections.",
          details: "Please try again or use a faster connection.",
          suggestions,
          networkInfo: networkStatus,
        })
        setIsLoading(false)
      })

      xhr.addEventListener("abort", () => {
        setError({
          message: "Upload was cancelled",
          suggestions: ["Try uploading again"],
          networkInfo: networkStatus,
        })
        setIsLoading(false)
      })

      xhr.open("POST", "/api/upload")
      xhr.send(formData)
    } catch (err) {
      const suggestions = getErrorSuggestions(err instanceof Error ? err.message : "")
      setError({
        message: err instanceof Error ? err.message : "Failed to upload file",
        suggestions,
        networkInfo: networkStatus,
      })
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Upload {editorType === "video" ? "Video" : "Graphic"}</CardTitle>
        <CardDescription className="text-slate-400">
          Upload your {editorType === "video" ? "video" : "graphic"} file and add a description
        </CardDescription>
        {networkStatus && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <Wifi className="h-3 w-3" />
            <span>{networkStatus}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragActive
                ? "border-blue-400 bg-blue-500/10"
                : "border-slate-600 hover:border-slate-500 bg-slate-700/50"
            }`}
          >
            <Upload className="mx-auto h-12 w-12 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-200 mb-1">Drag and drop your file here</p>
            <p className="text-xs text-slate-400 mb-4">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept={editorType === "video" ? "video/*" : "image/*"}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="border-slate-600 text-slate-200 hover:bg-slate-700"
            >
              Browse Files
            </Button>
          </div>

          {file && (
            <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
              <p className="text-sm font-medium text-slate-200">Selected file:</p>
              <p className="text-sm text-slate-300 truncate">{file.name}</p>
              <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}

          {editorType === "video" && (
            <div className="space-y-2">
              <label htmlFor="thumbnail" className="block text-sm font-medium text-slate-200">
                Thumbnail (optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  id="thumbnail"
                  onChange={handleThumbnailChange}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => thumbnailInputRef.current?.click()}
                  disabled={isLoading}
                  className="border-slate-600 text-slate-200 hover:bg-slate-700"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Choose Thumbnail
                </Button>
                {thumbnail && (
                  <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-2 rounded">
                    <span className="text-xs text-slate-300">{thumbnail.name}</span>
                    <button
                      type="button"
                      onClick={() => setThumbnail(null)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="caption" className="block text-sm font-medium text-slate-200 mb-2">
              Description (required)
            </label>
            <Textarea
              id="caption"
              placeholder="Add a description for this upload..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              disabled={isLoading}
              className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-400 mt-1">{caption.length} characters</p>
          </div>

          {isLoading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-200">Uploading...</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-400">{uploadProgress}%</p>
                    {uploadSpeed && <p className="text-xs text-slate-500">{uploadSpeed}</p>}
                  </div>
                  {estimatedTimeRemaining && (
                    <p className="text-xs text-slate-500">~{estimatedTimeRemaining} remaining</p>
                  )}
                </div>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-400 font-medium">{error.message}</p>
                  {error.details && <p className="text-xs text-red-300 mt-1">{error.details}</p>}
                  {error.requestId && <p className="text-xs text-red-300 mt-1">Request ID: {error.requestId}</p>}
                  {error.networkInfo && <p className="text-xs text-red-300 mt-1">Network: {error.networkInfo}</p>}
                </div>
              </div>

              {(error.details || error.suggestions) && (
                <button
                  type="button"
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${showErrorDetails ? "rotate-180" : ""}`} />
                  {showErrorDetails ? "Hide" : "Show"} troubleshooting tips
                </button>
              )}

              {showErrorDetails && error.suggestions && error.suggestions.length > 0 && (
                <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                  <p className="text-xs font-medium text-slate-300 mb-2">Try these solutions:</p>
                  <ul className="space-y-1">
                    {error.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                        <span className="text-slate-500 mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <p className="text-sm text-green-400">Upload successful!</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading || !file || !caption.trim()}
          >
            {isLoading ? `Uploading... ${uploadProgress}%` : "Upload File"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
