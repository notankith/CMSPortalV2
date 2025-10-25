import { put, del } from "@vercel/blob"

export async function uploadFile(file: File, path: string): Promise<string> {
  try {
    console.log("[v0] Uploading file to blob storage:", path)
    const blob = await put(path, file, {
      access: "public",
    })
    console.log("[v0] File uploaded successfully:", blob.url)
    return blob.url
  } catch (error) {
    console.error("[v0] Error uploading file to Blob:", error)
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function deleteFile(url: string): Promise<void> {
  try {
    console.log("[v0] Deleting file from blob storage:", url)
    await del(url)
    console.log("[v0] File deleted successfully")
  } catch (error) {
    console.error("[v0] Error deleting file from Blob:", error)
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
