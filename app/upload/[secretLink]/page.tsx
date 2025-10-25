"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { UploadForm } from "@/components/upload-form"
import { UploadsList } from "@/components/uploads-list"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

interface Editor {
  id: string
  name: string
  type: "video" | "graphic"
  secret_link: string
}

export default function UploadPortalPage() {
  const params = useParams()
  const secretLink = params.secretLink as string
  const [editor, setEditor] = useState<Editor | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const fetchEditor = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/editors")
        if (!response.ok) throw new Error("Failed to fetch editors")
        const editors: Editor[] = await response.json()
        const foundEditor = editors.find((e) => e.secret_link === secretLink)
        if (!foundEditor) {
          setError("Invalid upload link")
          return
        }
        setEditor(foundEditor)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load editor")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEditor()
  }, [secretLink])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8">
              <p className="text-center text-slate-400">Loading...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !editor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="text-red-400">{error || "Editor not found"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="border-b border-slate-700 pb-6">
          <h1 className="text-4xl font-bold text-white mb-2">{editor.name}</h1>
          <p className="text-slate-400">
            {editor.type === "video" ? "Video Editor" : "Graphic Designer"} Upload Portal
          </p>
        </div>

        <UploadForm
          editorId={editor.id}
          editorName={editor.name}
          editorType={editor.type}
          onUploadSuccess={() => setRefreshTrigger((prev) => prev + 1)}
        />

        <UploadsList editorId={editor.id} refreshTrigger={refreshTrigger} />
      </div>
    </div>
  )
}
