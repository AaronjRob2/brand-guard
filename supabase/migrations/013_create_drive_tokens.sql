-- Create drive_tokens table
CREATE TABLE IF NOT EXISTS public.drive_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider text NOT NULL DEFAULT 'google',
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    
    -- Ensure one token per user per provider
    UNIQUE(user_id, provider)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drive_tokens_user_id ON public.drive_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_drive_tokens_provider ON public.drive_tokens(provider);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row changes
DROP TRIGGER IF EXISTS update_drive_tokens_updated_at ON public.drive_tokens;
CREATE TRIGGER update_drive_tokens_updated_at
    BEFORE UPDATE ON public.drive_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.drive_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own tokens
CREATE POLICY "Users can view their own drive tokens" ON public.drive_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can insert their own drive tokens" ON public.drive_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update their own drive tokens" ON public.drive_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete their own drive tokens" ON public.drive_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.drive_tokens TO authenticated;
GRANT ALL ON public.drive_tokens TO service_role;