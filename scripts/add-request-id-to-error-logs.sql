-- Add request_id column for better request tracking and correlation
ALTER TABLE error_logs 
ADD COLUMN IF NOT EXISTS request_id VARCHAR(50);

-- Create index for efficient request ID lookups
CREATE INDEX IF NOT EXISTS idx_error_logs_request_id ON error_logs(request_id);

-- Add comment for documentation
COMMENT ON COLUMN error_logs.request_id IS 'Unique request ID for correlating related errors and logs';
