-- Updated schema to include all required columns for editors and uploads tables
-- Create editors table to store editor information
CREATE TABLE IF NOT EXISTS public.editors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'graphic')),
  description TEXT NOT NULL DEFAULT '',
  secret_link TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create uploads table to store upload metadata
CREATE TABLE IF NOT EXISTS public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id UUID NOT NULL REFERENCES public.editors(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  caption TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image',
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create logs table for archiving uploads
CREATE TABLE IF NOT EXISTS public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id UUID NOT NULL REFERENCES public.editors(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  caption TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image',
  thumbnail_url TEXT,
  archived_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable Row Level Security for simplicity (admin-controlled system)
ALTER TABLE public.editors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs DISABLE ROW LEVEL SECURITY;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_uploads_editor_id ON public.uploads(editor_id);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON public.uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_editors_secret_link ON public.editors(secret_link);
CREATE INDEX IF NOT EXISTS idx_logs_editor_id ON public.logs(editor_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at);
