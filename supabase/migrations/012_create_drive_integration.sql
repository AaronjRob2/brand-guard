-- Google Drive integration tables
CREATE TABLE IF NOT EXISTS public.drive_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_folder_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  web_view_link TEXT,
  shared BOOLEAN DEFAULT false,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  connected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  last_synced TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Google Drive files table
CREATE TABLE IF NOT EXISTS public.drive_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_file_id TEXT UNIQUE NOT NULL,
  drive_folder_id UUID REFERENCES public.drive_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT,
  modified_time TIMESTAMP WITH TIME ZONE,
  web_view_link TEXT,
  download_url TEXT,
  content TEXT,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Drive folder sync log for tracking changes
CREATE TABLE IF NOT EXISTS public.drive_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_folder_id UUID REFERENCES public.drive_folders(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual')),
  files_added INTEGER DEFAULT 0,
  files_updated INTEGER DEFAULT 0,
  files_deleted INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drive_folders_drive_folder_id ON public.drive_folders(drive_folder_id);
CREATE INDEX IF NOT EXISTS idx_drive_folders_connected_by ON public.drive_folders(connected_by);
CREATE INDEX IF NOT EXISTS idx_drive_folders_is_active ON public.drive_folders(is_active);
CREATE INDEX IF NOT EXISTS idx_drive_folders_created_at ON public.drive_folders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_drive_files_drive_file_id ON public.drive_files(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_drive_folder_id ON public.drive_files(drive_folder_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_name ON public.drive_files(name);
CREATE INDEX IF NOT EXISTS idx_drive_files_mime_type ON public.drive_files(mime_type);
CREATE INDEX IF NOT EXISTS idx_drive_files_modified_time ON public.drive_files(modified_time DESC);

CREATE INDEX IF NOT EXISTS idx_drive_sync_log_drive_folder_id ON public.drive_sync_log(drive_folder_id);
CREATE INDEX IF NOT EXISTS idx_drive_sync_log_status ON public.drive_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_drive_sync_log_started_at ON public.drive_sync_log(started_at DESC);

-- Enable Row Level Security
ALTER TABLE public.drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drive_folders
CREATE POLICY "Users can view their own drive folders" ON public.drive_folders
  FOR SELECT USING (connected_by = auth.uid());

CREATE POLICY "Users can create their own drive folders" ON public.drive_folders
  FOR INSERT WITH CHECK (connected_by = auth.uid());

CREATE POLICY "Users can update their own drive folders" ON public.drive_folders
  FOR UPDATE USING (connected_by = auth.uid());

CREATE POLICY "Users can delete their own drive folders" ON public.drive_folders
  FOR DELETE USING (connected_by = auth.uid());

CREATE POLICY "Admins can view all drive folders" ON public.drive_folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for drive_files
CREATE POLICY "Users can view files from their folders" ON public.drive_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.drive_folders 
      WHERE id = drive_files.drive_folder_id AND connected_by = auth.uid()
    )
  );

CREATE POLICY "System can manage drive files" ON public.drive_files
  FOR ALL USING (true); -- Files are managed by system processes

CREATE POLICY "Admins can view all drive files" ON public.drive_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for drive_sync_log
CREATE POLICY "Users can view their own sync logs" ON public.drive_sync_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.drive_folders 
      WHERE id = drive_sync_log.drive_folder_id AND connected_by = auth.uid()
    )
  );

CREATE POLICY "System can manage sync logs" ON public.drive_sync_log
  FOR ALL USING (true); -- Sync logs are managed by system processes

CREATE POLICY "Admins can view all sync logs" ON public.drive_sync_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to ensure only one active folder per user
CREATE OR REPLACE FUNCTION public.ensure_single_active_drive_folder()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other folders for this user
    UPDATE public.drive_folders 
    SET is_active = false, updated_at = TIMEZONE('utc', NOW())
    WHERE connected_by = NEW.connected_by AND id != NEW.id AND is_active = true;
  END IF;
  
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to ensure single active folder
DROP TRIGGER IF EXISTS ensure_single_active_drive_folder_trigger ON public.drive_folders;
CREATE TRIGGER ensure_single_active_drive_folder_trigger
  BEFORE INSERT OR UPDATE ON public.drive_folders
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_active_drive_folder();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_drive_folder_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on drive_folders
DROP TRIGGER IF EXISTS update_drive_folders_updated_at ON public.drive_folders;
CREATE TRIGGER update_drive_folders_updated_at
  BEFORE UPDATE ON public.drive_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_drive_folder_updated_at();