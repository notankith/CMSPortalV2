import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, BarChart3, Lock } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Editors Portal</h1>
          <Link href="/admin">
            <Button variant="outline" size="sm">
              Admin
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Content Management Portal</h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            A professional platform for video editors and graphic designers to upload and manage their work with secure,
            unique access links.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
            <CardHeader>
              <Upload className="h-8 w-8 text-blue-400 mb-2" />
              <CardTitle className="text-white">Easy Uploads</CardTitle>
              <CardDescription className="text-slate-400">
                Drag and drop files or click to browse. Support for all file types with no size limits.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
            <CardHeader>
              <Lock className="h-8 w-8 text-green-400 mb-2" />
              <CardTitle className="text-white">Secure Access</CardTitle>
              <CardDescription className="text-slate-400">
                Each editor gets a unique secret link. Only authorized users can access their portal.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">Admin Dashboard</CardTitle>
              <CardDescription className="text-slate-400">
                View daily statistics, manage editors, and control upload retention policies.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">Ready to get started?</h3>
          <p className="text-blue-100 mb-6">
            Access the admin dashboard to create editor accounts and generate upload links.
          </p>
          <Link href="/admin">
            <Button size="lg" variant="secondary">
              Go to Admin Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 text-center text-slate-400">
          <p>Editors Portal &copy; 2025. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
