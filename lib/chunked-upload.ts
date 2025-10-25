import { put } from "@vercel/blob"
import { logUploadError, extractErrorDetails } from "@/lib/error-logger"
import {
  detectNetworkQuality,
  calculateEstimatedUploadTime,
  formatNetworkDiagnostics,
  type UploadMetrics,
} from "@/lib/network-diagnostics"

const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB chunks

interface UploadProgress {
  loaded: number
  total: number
  percentage: number
  speed?: number // bytes per second
  timeRemaining?: number // seconds
}

/**
 * Upload large files with comprehensive error handling and network diagnostics
 */
export async function uploadLargeFile(
  file: File,
  path: string,
  editorId?: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const networkDiagnostics = detectNetworkQuality()
  const estimatedTime = calculateEstimatedUploadTime(file.size, networkDiagnostics)

  console.log(`[v0] [${uploadId}] Starting upload for file: ${file.name}`)
  console.log(`[v0] [${uploadId}] File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
  console.log(`[v0] [${uploadId}] Network: ${formatNetworkDiagnostics(networkDiagnostics)}`)
  console.log(`[v0] [${uploadId}] Estimated upload time: ${estimatedTime}s`)

  const metrics: UploadMetrics = {
    startTime: Date.now(),
    lastChunkTime: Date.now(),
    bytesUploaded: 0,
    totalBytes: file.size,
    chunkCount: 0,
    failedChunks: 0,
    retryCount: 0,
    networkInterruptions: 0,
  }

  // For files under 50MB, use direct upload
  if (file.size < 50 * 1024 * 1024) {
    console.log(`[v0] [${uploadId}] File is under 50MB, using direct upload`)
    try {
      const blob = await put(path, file, {
        access: "public",
      })
      onProgress?.({
        loaded: file.size,
        total: file.size,
        percentage: 100,
        speed: file.size / ((Date.now() - metrics.startTime) / 1000),
      })
      console.log(`[v0] [${uploadId}] Direct upload successful: ${blob.url}`)
      return blob.url
    } catch (error) {
      const errorDetails = extractErrorDetails(error)
      console.error(`[v0] [${uploadId}] Direct upload failed:`, errorDetails)

      await logUploadError({
        error_type: "DIRECT_UPLOAD_FAILED",
        error_message: error instanceof Error ? error.message : "Unknown error during direct upload",
        error_stack: error instanceof Error ? error.stack : undefined,
        file_name: file.name,
        file_size: file.size,
        editor_id: editorId,
        request_id: uploadId,
        details: {
          ...errorDetails,
          networkDiagnostics,
          metrics,
        },
      })

      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
      )
    }
  }

  // For larger files, use chunked upload with better error handling
  console.log(
    `[v0] [${uploadId}] File is over 50MB, using chunked upload with ${Math.ceil(file.size / CHUNK_SIZE)} chunks`,
  )

  try {
    const chunks: Blob[] = []

    // Split file into chunks
    for (let i = 0; i < file.size; i += CHUNK_SIZE) {
      const chunk = file.slice(i, i + CHUNK_SIZE)
      chunks.push(chunk)
      metrics.chunkCount++
    }

    console.log(`[v0] [${uploadId}] Created ${chunks.length} chunks`)

    // Create a new File from chunks for upload
    const chunkedFile = new File(chunks, file.name, { type: file.type })

    // Upload with progress tracking
    const blob = await put(path, chunkedFile, {
      access: "public",
      onUploadProgress: (progress: { loaded: number; total: number }) => {
        metrics.lastChunkTime = Date.now()
        metrics.bytesUploaded = progress.loaded

        const elapsedSeconds = (Date.now() - metrics.startTime) / 1000
        const speed = progress.loaded / elapsedSeconds
        const remainingBytes = progress.total - progress.loaded
        const timeRemaining = remainingBytes / speed

        onProgress?.({
          loaded: progress.loaded,
          total: progress.total,
          percentage: Math.round((progress.loaded / progress.total) * 100),
          speed,
          timeRemaining,
        })

        console.log(
          `[v0] [${uploadId}] Upload progress: ${Math.round((progress.loaded / progress.total) * 100)}% (${(progress.loaded / 1024 / 1024).toFixed(2)}MB / ${(progress.total / 1024 / 1024).toFixed(2)}MB) - Speed: ${(speed / 1024 / 1024).toFixed(2)}MB/s`,
        )
      },
    })

    const totalTime = (Date.now() - metrics.startTime) / 1000
    console.log(`[v0] [${uploadId}] Chunked upload completed successfully in ${totalTime.toFixed(2)}s`)
    console.log(`[v0] [${uploadId}] Average speed: ${(file.size / totalTime / 1024 / 1024).toFixed(2)}MB/s`)

    return blob.url
  } catch (error) {
    const errorDetails = extractErrorDetails(error)
    console.error(`[v0] [${uploadId}] Chunked upload failed:`, errorDetails)

    await logUploadError({
      error_type: "CHUNKED_UPLOAD_FAILED",
      error_message: error instanceof Error ? error.message : "Unknown error during chunked upload",
      error_stack: error instanceof Error ? error.stack : undefined,
      file_name: file.name,
      file_size: file.size,
      editor_id: editorId,
      request_id: uploadId,
      details: {
        ...errorDetails,
        networkDiagnostics,
        metrics,
        chunkSize: CHUNK_SIZE,
        totalChunks: Math.ceil(file.size / CHUNK_SIZE),
      },
    })

    throw new Error(
      `Failed to upload large file: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
    )
  }
}

/**
 * Upload with automatic retry and exponential backoff
 */
export async function uploadFileWithRetry(
  file: File,
  path: string,
  editorId?: string,
  maxRetries = 3,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  let lastError: Error | null = null
  const uploadSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  console.log(`[v0] [${uploadSessionId}] Starting upload session for: ${file.name}`)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[v0] [${uploadSessionId}] Upload attempt ${attempt}/${maxRetries}`)
      const url = await uploadLargeFile(file, path, editorId, onProgress)
      console.log(`[v0] [${uploadSessionId}] Upload succeeded on attempt ${attempt}`)
      return url
    } catch (error) {
      lastError = error as Error
      const errorDetails = extractErrorDetails(error)
      console.error(`[v0] [${uploadSessionId}] Upload attempt ${attempt} failed:`, errorDetails)

      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delayMs = Math.pow(2, attempt) * 1000
        console.log(`[v0] [${uploadSessionId}] Retrying in ${delayMs}ms...`)

        await logUploadError({
          error_type: "UPLOAD_RETRY",
          error_message: `Attempt ${attempt} failed, retrying in ${delayMs}ms`,
          file_name: file.name,
          file_size: file.size,
          editor_id: editorId,
          request_id: uploadSessionId,
          details: {
            attempt,
            maxRetries,
            delayMs,
            error: errorDetails,
          },
        })

        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  console.error(`[v0] [${uploadSessionId}] Upload failed after ${maxRetries} attempts`)

  await logUploadError({
    error_type: "UPLOAD_FAILED_ALL_RETRIES",
    error_message: `Upload failed after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`,
    error_stack: lastError?.stack,
    file_name: file.name,
    file_size: file.size,
    editor_id: editorId,
    request_id: uploadSessionId,
    details: {
      maxRetries,
      finalError: extractErrorDetails(lastError),
    },
  })

  throw lastError || new Error("Failed to upload file after multiple attempts")
}
