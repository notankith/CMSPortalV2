-- Create error_logs table for comprehensive error tracking
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,
  editor_id UUID REFERENCES editors(id) ON DELETE SET NULL,
  user_agent TEXT,
  request_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_editor_id ON error_logs(editor_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE error_logs IS 'Comprehensive error logging for upload failures and debugging';
COMMENT ON COLUMN error_logs.error_type IS 'Type of error (e.g., NETWORK_ERROR, TIMEOUT, FILE_SIZE_EXCEEDED)';
COMMENT ON COLUMN error_logs.details IS 'Additional error context stored as JSON';
