-- Disable RLS on editors table to fix permission issues
ALTER TABLE public.editors DISABLE ROW LEVEL SECURITY;

-- Drop existing policies on editors table
DROP POLICY IF EXISTS "editors_select_all" ON public.editors;
DROP POLICY IF EXISTS "editors_insert_all" ON public.editors;
DROP POLICY IF EXISTS "editors_delete_all" ON public.editors;

-- Create logs table to store archived uploads
CREATE TABLE IF NOT EXISTS public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id UUID NOT NULL REFERENCES public.editors(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  caption TEXT,
  media_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archive_reason TEXT NOT NULL CHECK (archive_reason IN ('daily_reset', 'purge_old', 'manual'))
);

-- Enable RLS on logs table
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Create policies for logs table
CREATE POLICY "logs_select_all" ON public.logs FOR SELECT USING (true);
CREATE POLICY "logs_insert_all" ON public.logs FOR INSERT WITH CHECK (true);
CREATE POLICY "logs_delete_all" ON public.logs FOR DELETE USING (true);

-- Create indexes for logs table
CREATE INDEX IF NOT EXISTS idx_logs_editor_id ON public.logs(editor_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_archived_at ON public.logs(archived_at);
CREATE INDEX IF NOT EXISTS idx_logs_archive_reason ON public.logs(archive_reason);
