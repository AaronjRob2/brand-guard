-- Enhanced file management and analysis tables
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'user-files',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'queued')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  processed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE -- Optional file expiration
);

-- File processing results with enhanced metadata
CREATE TABLE IF NOT EXISTS public.file_processing_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  extracted_text TEXT,
  word_count INTEGER DEFAULT 0,
  character_count INTEGER DEFAULT 0,
  page_count INTEGER,
  language TEXT,
  dominant_colors JSONB, -- Array of hex colors with percentages
  color_palette JSONB, -- Structured color analysis
  font_families JSONB, -- Array of detected fonts
  font_sizes JSONB, -- Array of font sizes used
  extracted_images JSONB, -- Array of image metadata
  document_structure JSONB, -- Headings, sections, etc.
  metadata JSONB DEFAULT '{}',
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  processing_time_ms INTEGER,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Brand compliance analysis results
CREATE TABLE IF NOT EXISTS public.analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  overall_score FLOAT CHECK (overall_score >= 0 AND overall_score <= 100),
  compliance_status TEXT CHECK (compliance_status IN ('compliant', 'minor_issues', 'major_issues', 'non_compliant')),
  total_issues INTEGER DEFAULT 0,
  high_severity_issues INTEGER DEFAULT 0,
  medium_severity_issues INTEGER DEFAULT 0,
  low_severity_issues INTEGER DEFAULT 0,
  analysis_summary TEXT,
  recommendations JSONB,
  claude_analysis JSONB, -- Raw Claude response
  cache_key TEXT, -- For preventing duplicate analyses
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Individual compliance issues found in analysis
CREATE TABLE IF NOT EXISTS public.analysis_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.analysis_results(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.brand_rules(id),
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT,
  location JSONB, -- Page, coordinates, etc.
  context JSONB, -- Surrounding content or metadata
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'false_positive')),
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Analysis queue for background processing
CREATE TABLE IF NOT EXISTS public.analysis_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  processing_node TEXT, -- For distributed processing
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create comprehensive indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON public.uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_status ON public.uploaded_files(status);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_at ON public.uploaded_files(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_file_type ON public.uploaded_files(file_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_expires_at ON public.uploaded_files(expires_at);

CREATE INDEX IF NOT EXISTS idx_file_processing_results_file_id ON public.file_processing_results(file_id);
CREATE INDEX IF NOT EXISTS idx_file_processing_results_processed_at ON public.file_processing_results(processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_results_file_id ON public.analysis_results(file_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id ON public.analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_compliance_status ON public.analysis_results(compliance_status);
CREATE INDEX IF NOT EXISTS idx_analysis_results_cache_key ON public.analysis_results(cache_key);
CREATE INDEX IF NOT EXISTS idx_analysis_results_analyzed_at ON public.analysis_results(analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_issues_analysis_id ON public.analysis_issues(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_rule_id ON public.analysis_issues(rule_id);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_severity ON public.analysis_issues(severity);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_status ON public.analysis_issues(status);

CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON public.analysis_queue(status);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_priority ON public.analysis_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_scheduled_at ON public.analysis_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_user_id ON public.analysis_queue(user_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_processing_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_queue ENABLE ROW LEVEL SECURITY;