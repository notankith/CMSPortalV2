"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Clock, Zap, TrendingUp } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

interface ErrorLog {
  id: string
  error_type: string
  error_message: string
  file_name?: string
  file_size?: number
  editor_id?: string
  request_id?: string
  timestamp: string
  details?: Record<string, unknown>
}

export function UploadDebugDashboard() {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  useEffect(() => {
    fetchErrorLogs()
    const interval = setInterval(fetchErrorLogs, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchErrorLogs = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      )

      const { data, error } = await supabase
        .from("error_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(50)

      if (error) {
        console.error("[v0] Failed to fetch error logs:", error)
        return
      }

      setErrorLogs(data || [])
    } catch (err) {
      console.error("[v0] Error fetching logs:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const getErrorIcon = (errorType: string) => {
    switch (errorType) {
      case "UPLOAD_FAILED_ALL_RETRIES":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "UPLOAD_RETRY":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "NETWORK_ERROR":
        return <Zap className="h-4 w-4 text-orange-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-slate-400" />
    }
  }

  const getErrorColor = (errorType: string) => {
    if (errorType.includes("FAILED")) return "bg-red-500/10 border-red-500/50"
    if (errorType.includes("RETRY")) return "bg-yellow-500/10 border-yellow-500/50"
    if (errorType.includes("NETWORK")) return "bg-orange-500/10 border-orange-500/50"
    return "bg-slate-700/50 border-slate-600"
  }

  const filteredLogs =
    filter === "all" ? errorLogs : errorLogs.filter((log) => log.error_type.includes(filter.toUpperCase()))

  const errorStats = {
    total: errorLogs.length,
    failed: errorLogs.filter((l) => l.error_type.includes("FAILED")).length,
    retries: errorLogs.filter((l) => l.error_type.includes("RETRY")).length,
    network: errorLogs.filter((l) => l.error_type.includes("NETWORK")).length,
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Upload Error Logs</CardTitle>
          <CardDescription className="text-slate-400">
            Real-time debugging information for upload failures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
              <p className="text-xs text-slate-400 mb-1">Total Errors</p>
              <p className="text-2xl font-bold text-slate-200">{errorStats.total}</p>
            </div>
            <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/50">
              <p className="text-xs text-red-400 mb-1">Failed Uploads</p>
              <p className="text-2xl font-bold text-red-400">{errorStats.failed}</p>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/50">
              <p className="text-xs text-yellow-400 mb-1">Retries</p>
              <p className="text-2xl font-bold text-yellow-400">{errorStats.retries}</p>
            </div>
            <div className="bg-orange-500/10 p-3 rounded-lg border border-orange-500/50">
              <p className="text-xs text-orange-400 mb-1">Network Errors</p>
              <p className="text-2xl font-bold text-orange-400">{errorStats.network}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {["all", "failed", "retry", "network"].map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className={
                  filter === f ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-slate-200 hover:bg-slate-700"
                }
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>

          {/* Error Logs List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading error logs...</p>
            ) : filteredLogs.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <p className="text-sm text-green-400">No errors found!</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${getErrorColor(log.error_type)}`}
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-start gap-2">
                    {getErrorIcon(log.error_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200">{log.error_type}</p>
                      <p className="text-xs text-slate-400 truncate">{log.error_message}</p>
                      <div className="flex gap-2 mt-1 text-xs text-slate-500">
                        {log.file_name && <span>File: {log.file_name}</span>}
                        {log.file_size && <span>Size: {(log.file_size / 1024 / 1024).toFixed(2)}MB</span>}
                        {log.request_id && <span>ID: {log.request_id.substring(0, 8)}...</span>}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {expandedLog === log.id && log.details && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <pre className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <Button
            onClick={fetchErrorLogs}
            variant="outline"
            className="w-full border-slate-600 text-slate-200 bg-transparent"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Refresh Logs
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
