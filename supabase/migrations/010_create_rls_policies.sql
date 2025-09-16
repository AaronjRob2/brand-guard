-- Comprehensive Row Level Security Policies for Brand Guard

-- UPLOADED FILES POLICIES
-- Users can only see their own files
CREATE POLICY "Users can view own uploaded files" ON public.uploaded_files
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only upload files as themselves
CREATE POLICY "Users can insert own uploaded files" ON public.uploaded_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own file metadata
CREATE POLICY "Users can update own uploaded files" ON public.uploaded_files
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own files
CREATE POLICY "Users can delete own uploaded files" ON public.uploaded_files
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all files
CREATE POLICY "Admins can view all uploaded files" ON public.uploaded_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- FILE PROCESSING RESULTS POLICIES
-- Users can view processing results for their files
CREATE POLICY "Users can view processing results for own files" ON public.file_processing_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.uploaded_files 
      WHERE id = file_processing_results.file_id 
      AND user_id = auth.uid()
    )
  );

-- System/service accounts can insert processing results
CREATE POLICY "Service can insert processing results" ON public.file_processing_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.uploaded_files 
      WHERE id = file_processing_results.file_id
    )
  );

-- Admins can view all processing results
CREATE POLICY "Admins can view all processing results" ON public.file_processing_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ANALYSIS RESULTS POLICIES
-- Users can view analysis results for their files
CREATE POLICY "Users can view own analysis results" ON public.analysis_results
  FOR SELECT USING (auth.uid() = user_id);

-- Service can insert analysis results
CREATE POLICY "Service can insert analysis results" ON public.analysis_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.uploaded_files 
      WHERE id = analysis_results.file_id 
      AND user_id = analysis_results.user_id
    )
  );

-- Users can update analysis results for their files
CREATE POLICY "Users can update own analysis results" ON public.analysis_results
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all analysis results
CREATE POLICY "Admins can view all analysis results" ON public.analysis_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ANALYSIS ISSUES POLICIES
-- Users can view issues for their analyses
CREATE POLICY "Users can view issues for own analyses" ON public.analysis_issues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analysis_results 
      WHERE id = analysis_issues.analysis_id 
      AND user_id = auth.uid()
    )
  );

-- Service can insert analysis issues
CREATE POLICY "Service can insert analysis issues" ON public.analysis_issues
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analysis_results 
      WHERE id = analysis_issues.analysis_id
    )
  );

-- Users can update issue status for their analyses
CREATE POLICY "Users can update own analysis issues" ON public.analysis_issues
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.analysis_results 
      WHERE id = analysis_issues.analysis_id 
      AND user_id = auth.uid()
    )
  );

-- Admins can manage all analysis issues
CREATE POLICY "Admins can manage all analysis issues" ON public.analysis_issues
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ANALYSIS QUEUE POLICIES
-- Users can view their own queue items
CREATE POLICY "Users can view own queue items" ON public.analysis_queue
  FOR SELECT USING (auth.uid() = user_id);

-- Service can manage queue items
CREATE POLICY "Service can manage analysis queue" ON public.analysis_queue
  FOR ALL USING (
    -- Allow service accounts or if user owns the file
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.uploaded_files 
      WHERE id = analysis_queue.file_id 
      AND user_id = analysis_queue.user_id
    )
  );

-- Admins can view and manage entire queue
CREATE POLICY "Admins can manage analysis queue" ON public.analysis_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- FUNCTIONS AND TRIGGERS FOR AUTOMATION

-- Function to automatically queue files for analysis
CREATE OR REPLACE FUNCTION public.queue_file_for_analysis()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.analysis_queue (file_id, user_id, priority, status, scheduled_at)
  VALUES (
    NEW.id, 
    NEW.user_id,
    CASE 
      WHEN EXISTS (SELECT 1 FROM public.users WHERE id = NEW.user_id AND role = 'admin') THEN 8
      ELSE 5
    END,
    'queued', 
    TIMEZONE('utc', NOW())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically queue uploaded files for analysis
DROP TRIGGER IF EXISTS on_file_uploaded_queue ON public.uploaded_files;
CREATE TRIGGER on_file_uploaded_queue
  AFTER INSERT ON public.uploaded_files
  FOR EACH ROW EXECUTE FUNCTION public.queue_file_for_analysis();

-- Function to update file status when processing completes
CREATE OR REPLACE FUNCTION public.update_file_status_on_processing()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.uploaded_files 
  SET 
    status = 'processing',
    processed_at = TIMEZONE('utc', NOW())
  WHERE id = NEW.file_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update file status when processing starts
DROP TRIGGER IF EXISTS on_processing_start ON public.file_processing_results;
CREATE TRIGGER on_processing_start
  AFTER INSERT ON public.file_processing_results
  FOR EACH ROW EXECUTE FUNCTION public.update_file_status_on_processing();

-- Function to update file status when analysis completes
CREATE OR REPLACE FUNCTION public.update_file_status_on_analysis()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.uploaded_files 
  SET status = 'completed'
  WHERE id = NEW.file_id;
  
  -- Update queue status
  UPDATE public.analysis_queue 
  SET 
    status = 'completed',
    completed_at = TIMEZONE('utc', NOW())
  WHERE file_id = NEW.file_id AND status = 'processing';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update statuses when analysis completes
DROP TRIGGER IF EXISTS on_analysis_complete ON public.analysis_results;
CREATE TRIGGER on_analysis_complete
  AFTER INSERT ON public.analysis_results
  FOR EACH ROW EXECUTE FUNCTION public.update_file_status_on_analysis();

-- Function to clean up expired files
CREATE OR REPLACE FUNCTION public.cleanup_expired_files()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  DELETE FROM public.uploaded_files 
  WHERE expires_at IS NOT NULL 
    AND expires_at < TIMEZONE('utc', NOW());
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;