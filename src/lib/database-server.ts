import { createClient } from '@supabase/supabase-js'

// ⚠️  WARNING: SERVER-SIDE ONLY ⚠️ 
// This file contains the SUPABASE_SERVICE_ROLE_KEY and should NEVER be imported 
// in client components or any code that runs in the browser.
// 
// Only use in:
// - API routes (/app/api/**/route.ts)
// - Server functions
// - Middleware
//
// DO NOT import in:
// - React components
// - Client hooks
// - Client utils

// Service role client for bypassing RLS policies in server operations
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  }

  if (!serviceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing!')
    console.error('📝 Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file')
    console.error('🔧 You can find this key in your Supabase project settings')
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server operations')
  }

  try {
    return createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  } catch (error) {
    console.error('Failed to create Supabase admin client:', error)
    throw new Error('Failed to initialize database connection')
  }
}

let supabaseAdmin: ReturnType<typeof createClient> | null = null

// Lazy initialization to provide better error handling
const getAdminClient = () => {
  if (!supabaseAdmin) {
    supabaseAdmin = createAdminClient()
  }
  return supabaseAdmin
}

export interface UploadedFile {
  id: string
  user_id: string
  original_filename: string
  file_type: string
  file_size: number
  mime_type: string
  storage_path: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  uploaded_at: string
}

export interface FileProcessingResult {
  id: string
  file_id: string
  extracted_text: string | null
  word_count: number
  character_count: number
  page_count: number | null
  language: string | null
  colors: string[] | null
  font_families: string[] | null
  font_sizes: number[] | null
  extracted_images: string[] | null
  metadata: Record<string, unknown> | null
  confidence_score: number | null
  processing_time_ms: number | null
  processed_at: string
}

export const saveUploadedFile = async (fileData: {
  user_id: string
  original_filename: string
  file_type: string
  file_size: number
  mime_type: string
  storage_path: string
}): Promise<UploadedFile | null> => {
  try {
    const adminClient = getAdminClient()
    const { data, error } = await adminClient
      .from('uploaded_files')
      .insert({
        ...fileData,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving uploaded file:', error)
      console.error('File data being inserted:', fileData)
      console.error('Full error details:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      })
      return null
    }
    return data
  } catch (err) {
    console.error('Exception in saveUploadedFile:', err)
    return null
  }
}

export const saveProcessingResult = async (resultData: {
  file_id: string
  extracted_text: string | null
  word_count: number
  character_count: number
  page_count?: number | null
  language?: string | null
  colors?: string[] | null
  font_families?: string[] | null
  font_sizes?: number[] | null
  extracted_images?: string[] | null
  metadata?: Record<string, unknown>
  confidence_score?: number | null
  processing_time_ms?: number | null
}): Promise<FileProcessingResult | null> => {
  try {
    const adminClient = getAdminClient()
    const { data, error } = await adminClient
      .from('file_processing_results')
      .insert(resultData)
      .select()
      .single()

    if (error) {
      console.error('Error saving processing result:', error)
      return null
    }
    return data
  } catch (err) {
    console.error('Exception in saveProcessingResult:', err)
    return null
  }
}

export const updateFileStatus = async (
  fileId: string, 
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<boolean> => {
  try {
    const adminClient = getAdminClient()
    const { error } = await adminClient
      .from('uploaded_files')
      .update({ status })
      .eq('id', fileId)

    if (error) {
      console.error('Error updating file status:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Exception in updateFileStatus:', err)
    return false
  }
}

export const getUploadedFilesByUser = async (userId: string): Promise<UploadedFile[]> => {
  try {
    const adminClient = getAdminClient()
    const { data, error } = await adminClient
      .from('uploaded_files')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('Error getting uploaded files:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('Exception in getUploadedFilesByUser:', err)
    return []
  }
}

export interface BrandAnalysisResult {
  id: string
  file_id: string
  user_id: string
  total_issues: number
  high_severity_issues: number
  medium_severity_issues: number
  low_severity_issues: number
  compliance_score: number
  issues: unknown[]
  analysis_time_ms: number
  content_length: number
  rules_applied: number
  rules_snapshot: Record<string, unknown>
  rules_checksum: string | null
  analyzed_at: string
}

// Additional server-only functions that need admin access
export const getFileWithResults = async (fileId: string): Promise<{
  file: UploadedFile | null,
  results: FileProcessingResult | null
}> => {
  try {
    const { data: file, error: fileError } = await supabaseAdmin
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError) {
      console.error('Error getting file:', fileError)
      return { file: null, results: null }
    }

    const { data: results, error: resultsError } = await supabaseAdmin
      .from('file_processing_results')
      .select('*')
      .eq('file_id', fileId)
      .single()

    if (resultsError) {
      console.error('Error getting processing results:', resultsError)
      return { file, results: null }
    }

    return { file, results }
  } catch (err) {
    console.error('Exception in getFileWithResults:', err)
    return { file: null, results: null }
  }
}

export const saveBrandAnalysisResult = async (resultData: {
  file_id: string
  user_id: string
  total_issues: number
  high_severity_issues: number
  medium_severity_issues: number
  low_severity_issues: number
  compliance_score: number
  issues: unknown[]
  analysis_time_ms: number
  content_length: number
  rules_applied: number
  rules_snapshot: Record<string, unknown>
  rules_checksum?: string
}): Promise<BrandAnalysisResult | null> => {
  try {
    const adminClient = getAdminClient()
    const { data, error } = await adminClient
      .from('brand_analysis_results')
      .insert(resultData)
      .select()
      .single()

    if (error) {
      console.error('Error saving brand analysis result:', error)
      console.error('Analysis data being inserted:', resultData)
      return null
    }
    return data
  } catch (err) {
    console.error('Exception in saveBrandAnalysisResult:', err)
    return null
  }
}

export const saveAnalysisIssues = async (
  analysisId: string, 
  issuesData: Array<{
    issue_type: string
    severity: string
    message: string
    rule_violated: string
    location_context?: string | null
    line_number?: number | null
    position_number?: number | null
    suggestion?: string | null
  }>
): Promise<boolean> => {
  try {
    const adminClient = getAdminClient()
    const issuesWithAnalysisId = issuesData.map(issue => ({
      ...issue,
      analysis_id: analysisId
    }))

    const { error } = await adminClient
      .from('analysis_issues')
      .insert(issuesWithAnalysisId)

    if (error) {
      console.error('Error saving analysis issues:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Exception in saveAnalysisIssues:', err)
    return false
  }
}