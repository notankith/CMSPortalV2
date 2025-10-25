-- Add description column to editors table (required, non-empty)
ALTER TABLE public.editors ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

-- Add thumbnail_url column to uploads table (optional)
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add media_type column to uploads table for better filtering
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('video', 'image', 'other'));

-- Create index for media_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_uploads_media_type ON public.uploads(media_type);

-- Update existing uploads to have media_type based on file extension
UPDATE public.uploads 
SET media_type = CASE 
  WHEN file_name ILIKE '%.mp4' OR file_name ILIKE '%.webm' OR file_name ILIKE '%.mov' OR file_name ILIKE '%.avi' OR file_name ILIKE '%.mkv' THEN 'video'
  WHEN file_name ILIKE '%.jpg' OR file_name ILIKE '%.jpeg' OR file_name ILIKE '%.png' OR file_name ILIKE '%.gif' OR file_name ILIKE '%.webp' THEN 'image'
  ELSE 'other'
END
WHERE media_type IS NULL;
