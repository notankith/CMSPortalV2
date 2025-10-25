"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Trash2, AlertCircle, CheckCircle } from "lucide-react"

interface Editor {
  id: string
  name: string
  type: "video" | "graphic"
  description: string
  secret_link: string
  created_at: string
}

export function EditorsManagement() {
  const [editors, setEditors] = useState<Editor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newEditorName, setNewEditorName] = useState("")
  const [newEditorType, setNewEditorType] = useState<"video" | "graphic">("video")
  const [newEditorDescription, setNewEditorDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchEditors()
  }, [])

  const fetchEditors = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/editors")
      if (!response.ok) throw new Error("Failed to fetch editors")
      const data = await response.json()
      setEditors(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load editors")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateEditor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEditorName.trim() || !newEditorDescription.trim()) return

    try {
      setIsCreating(true)
      setError(null)
      const response = await fetch("/api/editors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEditorName,
          type: newEditorType,
          description: newEditorDescription,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create editor")
      }
      const newEditor = await response.json()
      setEditors([newEditor, ...editors])
      setNewEditorName("")
      setNewEditorType("video")
      setNewEditorDescription("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create editor")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteEditor = async (editorId: string, editorName: string) => {
    if (
      !confirm(`Are you sure you want to delete "${editorName}" and all their uploads? This action cannot be undone.`)
    )
      return

    try {
      setDeletingId(editorId)
      setError(null)
      const response = await fetch(`/api/editors/${editorId}`, { method: "DELETE" })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.message || errorData.details || errorData.error || "Failed to delete editor"
        throw new Error(errorMessage)
      }

      setEditors(editors.filter((e) => e.id !== editorId))
      setDeleteSuccess(`"${editorName}" has been deleted successfully`)
      setTimeout(() => setDeleteSuccess(null), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete editor"
      setError(`Error deleting editor: ${errorMessage}`)
    } finally {
      setDeletingId(null)
    }
  }

  const copyToClipboard = (text: string, editorId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/upload/${text}`)
    setCopiedId(editorId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Editor</CardTitle>
          <CardDescription>Add a new video editor or graphic designer with a description</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateEditor} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editor-name">Name</Label>
                <Input
                  id="editor-name"
                  placeholder="Editor name"
                  value={newEditorName}
                  onChange={(e) => setNewEditorName(e.target.value)}
                  disabled={isCreating}
                />
              </div>
              <div>
                <Label htmlFor="editor-type">Type</Label>
                <Select value={newEditorType} onValueChange={(value: any) => setNewEditorType(value)}>
                  <SelectTrigger id="editor-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video Editor</SelectItem>
                    <SelectItem value="graphic">Graphic Designer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="editor-description">Description (required)</Label>
              <Textarea
                id="editor-description"
                placeholder="Add a description for this editor..."
                value={newEditorDescription}
                onChange={(e) => setNewEditorDescription(e.target.value)}
                rows={3}
                disabled={isCreating}
              />
              <p className="text-xs text-gray-500 mt-1">{newEditorDescription.length} characters</p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isCreating || !newEditorName.trim() || !newEditorDescription.trim()}
            >
              {isCreating ? "Creating..." : "Create Editor"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editors</CardTitle>
          <CardDescription>{editors.length} editor(s) registered</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-600 font-medium">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {deleteSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-600">{deleteSuccess}</p>
            </div>
          )}

          {isLoading ? (
            <p className="text-gray-600">Loading editors...</p>
          ) : editors.length === 0 ? (
            <p className="text-gray-600">No editors yet. Create one above.</p>
          ) : (
            <div className="space-y-3">
              {editors.map((editor) => (
                <div key={editor.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{editor.name}</p>
                    <p className="text-sm text-gray-600">
                      {editor.type === "video" ? "Video Editor" : "Graphic Designer"}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">{editor.description}</p>
                    <p className="text-xs text-gray-500 mt-2 font-mono">{editor.secret_link}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(editor.secret_link, editor.id)}
                      className="gap-2"
                      disabled={deletingId === editor.id}
                    >
                      <Copy className="h-4 w-4" />
                      {copiedId === editor.id ? "Copied!" : "Copy Link"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEditor(editor.id, editor.name)}
                      disabled={deletingId === editor.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === editor.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
