/**
 * Network diagnostics utility for detailed upload failure analysis
 * Captures network conditions, bandwidth, latency, and connection quality
 */

export interface NetworkDiagnostics {
  bandwidth: number // bytes per second
  latency: number // milliseconds
  connectionType: string
  isSlowConnection: boolean
  estimatedUploadTime: number // seconds
  connectionQuality: "excellent" | "good" | "fair" | "poor"
}

export interface UploadMetrics {
  startTime: number
  lastChunkTime: number
  bytesUploaded: number
  totalBytes: number
  chunkCount: number
  failedChunks: number
  retryCount: number
  networkInterruptions: number
}

/**
 * Detect network connection type and quality
 */
export function detectNetworkQuality(): NetworkDiagnostics {
  const hasNavigator = typeof navigator !== "undefined"
  const navConnection = hasNavigator
    ? (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    : null

  let connectionType = "unknown"
  let bandwidth = 0
  let latency = 0

  if (navConnection) {
    connectionType = navConnection.effectiveType || "unknown"
    bandwidth = navConnection.downlink ? navConnection.downlink * 1024 * 1024 : 0 // Convert Mbps to bytes/s
    latency = navConnection.rtt || 0
  }

  // Estimate based on connection type if not available
  if (bandwidth === 0) {
    const typeEstimates: Record<string, number> = {
      "4g": 10 * 1024 * 1024, // 10 Mbps
      "3g": 1 * 1024 * 1024, // 1 Mbps
      "2g": 0.1 * 1024 * 1024, // 0.1 Mbps
      wifi: 50 * 1024 * 1024, // 50 Mbps
    }
    bandwidth = typeEstimates[connectionType] || 5 * 1024 * 1024 // Default 5 Mbps
  }

  // On server environments we may not have latency info; leave at 0.
  if (!hasNavigator) {
    connectionType = "server"
  }

  const isSlowConnection = bandwidth < 1 * 1024 * 1024 // Less than 1 Mbps

  const connectionQuality: "excellent" | "good" | "fair" | "poor" =
    bandwidth > 10 * 1024 * 1024
      ? "excellent"
      : bandwidth > 5 * 1024 * 1024
        ? "good"
        : bandwidth > 1 * 1024 * 1024
          ? "fair"
          : "poor"

  return {
    bandwidth,
    latency,
    connectionType,
    isSlowConnection,
    estimatedUploadTime: 0, // Will be calculated per file
    connectionQuality,
  }
}

/**
 * Calculate estimated upload time based on file size and network conditions
 */
export function calculateEstimatedUploadTime(fileSize: number, diagnostics: NetworkDiagnostics): number {
  if (diagnostics.bandwidth === 0) return 0
  return Math.ceil(fileSize / diagnostics.bandwidth)
}

/**
 * Format network diagnostics for logging
 */
export function formatNetworkDiagnostics(diagnostics: NetworkDiagnostics): string {
  const bandwidthMbps = (diagnostics.bandwidth / 1024 / 1024).toFixed(2)
  return `Connection: ${diagnostics.connectionType} (${bandwidthMbps} Mbps, ${diagnostics.connectionQuality}), Latency: ${diagnostics.latency}ms`
}

/**
 * Detect if connection was interrupted
 */
export function detectConnectionInterruption(metrics: UploadMetrics, timeoutMs = 30000): boolean {
  const timeSinceLastChunk = Date.now() - metrics.lastChunkTime
  return timeSinceLastChunk > timeoutMs
}
