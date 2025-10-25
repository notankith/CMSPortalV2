-- Add missing columns to uploads table if they don't exist
ALTER TABLE public.uploads
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image' CHECK (media_type IN ('video', 'image')),
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add description column to editors table if it doesn't exist
ALTER TABLE public.editors
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_uploads_media_type ON public.uploads(media_type);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at_desc ON public.uploads(created_at DESC);
