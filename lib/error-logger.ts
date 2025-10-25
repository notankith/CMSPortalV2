import { createServiceRoleClient } from "@/lib/supabase/server"

export interface ErrorLog {
  error_type: string
  error_message: string
  error_stack?: string
  file_name?: string
  file_size?: number
  editor_id?: string
  user_agent?: string
  request_url?: string
  timestamp: string
  details?: Record<string, unknown>
}

/**
 * Log detailed error information to the database for debugging
 * New utility for comprehensive error tracking
 */
export async function logUploadError(errorData: Omit<ErrorLog, "timestamp">) {
  try {
    const supabase = await createServiceRoleClient()

    const logEntry: ErrorLog = {
      ...errorData,
      timestamp: new Date().toISOString(),
    }

    console.log("[v0] Logging error to database:", logEntry)

    const { error } = await supabase.from("error_logs").insert(logEntry)

    if (error) {
      console.error("[v0] Failed to log error to database:", error)
      // Don't throw - we don't want error logging to break the upload process
    }
  } catch (err) {
    console.error("[v0] Error logging failed:", err)
    // Silently fail - don't interrupt the main process
  }
}

/**
 * Format error details for user-friendly display
 */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Network errors
    if (message.includes("network") || message.includes("fetch")) {
      return "Network error: Please check your internet connection and try again."
    }

    // Timeout errors
    if (message.includes("timeout") || message.includes("timed out")) {
      return "Upload timed out: The file took too long to upload. Try a smaller file or a faster connection."
    }

    // Storage errors
    if (message.includes("storage") || message.includes("quota")) {
      return "Storage error: The server storage is full. Please contact support."
    }

    // File size errors
    if (message.includes("size") || message.includes("exceeds")) {
      return "File too large: The file exceeds the maximum allowed size."
    }

    // File type errors
    if (message.includes("type") || message.includes("format")) {
      return "Invalid file type: Please upload a supported file format."
    }

    // Database errors
    if (message.includes("database") || message.includes("metadata")) {
      return "Database error: Failed to save upload information. Please try again."
    }

    // Blob storage errors
    if (message.includes("blob") || message.includes("vercel")) {
      return "Upload service error: The upload service is temporarily unavailable. Please try again."
    }

    return error.message
  }

  return "An unexpected error occurred. Please try again."
}

/**
 * Extract detailed error information for logging
 */
export function extractErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  if (typeof error === "object" && error !== null) {
    return error as Record<string, unknown>
  }

  return {
    error: String(error),
  }
}
