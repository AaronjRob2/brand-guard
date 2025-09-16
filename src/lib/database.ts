import { supabase } from './supabase'

export interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  full_name?: string
  avatar_url?: string
  domain?: string
  is_active: boolean
  email_notifications?: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface DriveFolder {
  id: string
  drive_folder_id: string
  name: string
  web_view_link: string | null
  shared: boolean
  access_token: string
  refresh_token: string | null
  connected_by: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DriveFile {
  id: string
  drive_file_id: string
  drive_folder_id: string
  name: string
  mime_type: string
  size_bytes: number | null
  modified_time: string | null
  web_view_link: string | null
  download_url: string | null
  content: string | null
  last_synced: string
  created_at: string
}

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error || !data) return null
  return data
}

export const createUser = async (id: string, email: string, role: 'user' | 'admin' = 'user'): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .insert({ id, email, role })
    .select()
    .single()

  if (error) {
    console.error('Error creating user:', error)
    return null
  }
  return data
}

export const updateUserRole = async (email: string, role: 'user' | 'admin'): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('email', email)
    .select()
    .single()

  if (error) {
    console.error('Error updating user role:', error)
    return null
  }
  return data
}

// Drive Folder Functions
export const saveDriveFolder = async (folderData: {
  drive_folder_id: string
  name: string
  web_view_link: string | null
  shared: boolean
  access_token: string
  refresh_token: string | null
  connected_by: string
}): Promise<DriveFolder | null> => {
  const { data, error } = await supabase
    .from('drive_folders')
    .upsert({
      ...folderData,
      is_active: true,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'drive_folder_id'
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving drive folder:', error)
    return null
  }
  return data
}

export const getActiveDriveFolder = async (): Promise<DriveFolder | null> => {
  const { data, error } = await supabase
    .from('drive_folders')
    .select('*')
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data
}

export const deactivateAllDriveFolders = async (): Promise<boolean> => {
  const { error } = await supabase
    .from('drive_folders')
    .update({ is_active: false })
    .eq('is_active', true)

  return !error
}

// Drive File Functions
export const saveDriveFiles = async (files: {
  drive_file_id: string
  drive_folder_id: string
  name: string
  mime_type: string
  size_bytes: number | null
  modified_time: string | null
  web_view_link: string | null
  download_url: string | null
  content?: string | null
}[]): Promise<DriveFile[]> => {
  const { data, error } = await supabase
    .from('drive_files')
    .upsert(files.map(file => ({
      ...file,
      last_synced: new Date().toISOString()
    })), {
      onConflict: 'drive_file_id'
    })
    .select()

  if (error) {
    console.error('Error saving drive files:', error)
    return []
  }
  return data || []
}

export const getDriveFilesByFolder = async (driveFolderId: string): Promise<DriveFile[]> => {
  const { data, error } = await supabase
    .from('drive_files')
    .select('*')
    .eq('drive_folder_id', driveFolderId)
    .order('name')

  if (error) {
    console.error('Error getting drive files:', error)
    return []
  }
  return data || []
}

export const getBrandFiles = async (): Promise<DriveFile[]> => {
  const activeFolder = await getActiveDriveFolder()
  if (!activeFolder) return []

  return getDriveFilesByFolder(activeFolder.id)
}

// Uploaded Files Functions
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
  metadata: Record<string, unknown>
  confidence_score: number | null
  processing_time_ms: number | null
  processed_at: string
}

// Server-only functions moved to database-server.ts
// This file now only contains client-safe operations using regular supabase client

export const getFileWithResults = async (fileId: string): Promise<{
  file: UploadedFile | null
  results: FileProcessingResult | null
}> => {
  const [fileResult, resultsResult] = await Promise.all([
    supabase
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .single(),
    supabase
      .from('file_processing_results')
      .select('*')
      .eq('file_id', fileId)
      .single()
  ])

  return {
    file: fileResult.data || null,
    results: resultsResult.data || null
  }
}

export const updateFileStatus = async (
  fileId: string, 
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<boolean> => {
  const { error } = await supabaseAdmin
    .from('uploaded_files')
    .update({ status })
    .eq('id', fileId)

  return !error
}

// Brand Analysis Functions
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
  analyzed_at: string
  created_at: string
}

export interface AnalysisIssue {
  id: string
  analysis_id: string
  issue_type: string
  severity: string
  message: string
  rule_violated: string
  location_context?: string
  line_number?: number
  position_number?: number
  suggestion?: string
  status: 'open' | 'acknowledged' | 'fixed' | 'dismissed'
  created_at: string
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
  const { data, error } = await supabase
    .from('brand_analysis_results')
    .insert(resultData)
    .select()
    .single()

  if (error) {
    console.error('Error saving brand analysis result:', error)
    return null
  }
  return data
}

export const saveAnalysisIssues = async (
  analysisId: string, 
  issues: Array<{
    issue_type: string
    severity: string
    message: string
    rule_violated: string
    location_context?: string
    line_number?: number
    position_number?: number
    suggestion?: string
  }>
): Promise<AnalysisIssue[]> => {
  const issuesWithAnalysisId = issues.map(issue => ({ ...issue, analysis_id: analysisId }))
  
  const { data, error } = await supabase
    .from('analysis_issues')
    .insert(issuesWithAnalysisId)
    .select()

  if (error) {
    console.error('Error saving analysis issues:', error)
    return []
  }
  return data || []
}

export const getAnalysisResultsByUser = async (userId: string): Promise<BrandAnalysisResult[]> => {
  const { data, error } = await supabase
    .from('brand_analysis_results')
    .select('*')
    .eq('user_id', userId)
    .order('analyzed_at', { ascending: false })

  if (error) {
    console.error('Error getting analysis results:', error)
    return []
  }
  return data || []
}

export const getAnalysisResultByFileId = async (fileId: string): Promise<BrandAnalysisResult | null> => {
  const { data, error } = await supabase
    .from('brand_analysis_results')
    .select('*')
    .eq('file_id', fileId)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}

export const getAnalysisIssues = async (analysisId: string): Promise<AnalysisIssue[]> => {
  const { data, error } = await supabase
    .from('analysis_issues')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error getting analysis issues:', error)
    return []
  }
  return data || []
}

export const updateIssueStatus = async (
  issueId: string, 
  status: 'open' | 'acknowledged' | 'fixed' | 'dismissed'
): Promise<boolean> => {
  const { error } = await supabase
    .from('analysis_issues')
    .update({ status })
    .eq('id', issueId)

  return !error
}

export const getUserAnalysisStats = async (userId: string): Promise<{
  totalAnalyses: number
  avgComplianceScore: number
  totalIssues: number
  recentAnalyses: number
} | null> => {
  const { data, error } = await supabase
    .rpc('get_analysis_stats', { user_uuid: userId })
    .single()

  if (error) {
    console.error('Error getting analysis stats:', error)
    return null
  }

  return {
    totalAnalyses: data.total_analyses || 0,
    avgComplianceScore: parseFloat(data.avg_compliance_score) || 0,
    totalIssues: data.total_issues || 0,
    recentAnalyses: data.recent_analyses || 0
  }
}

// Analysis Caching Functions
export const getCachedAnalysisResult = async (
  fileId: string, 
  rulesChecksum: string
): Promise<BrandAnalysisResult | null> => {
  const { data, error } = await supabase
    .from('brand_analysis_results')
    .select('*')
    .eq('file_id', fileId)
    .eq('rules_checksum', rulesChecksum)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}

export const cacheBrandRules = async (rulesData: {
  checksum: string
  rules: Record<string, unknown>
  total_rules: number
}): Promise<boolean> => {
  const { error } = await supabase
    .from('brand_rules_cache')
    .upsert({
      ...rulesData,
      cached_at: new Date().toISOString()
    }, {
      onConflict: 'checksum'
    })

  return !error
}

export const getCachedBrandRules = async (checksum: string): Promise<Record<string, unknown> | null> => {
  const { data, error } = await supabase
    .from('brand_rules_cache')
    .select('rules')
    .eq('checksum', checksum)
    .single()

  if (error || !data) return null
  return data.rules
}

// Email preference functions
export const updateEmailPreferences = async (
  userId: string, 
  emailNotifications: boolean
): Promise<boolean> => {
  const { error } = await supabase
    .from('users')
    .update({ email_notifications: emailNotifications })
    .eq('id', userId)

  return !error
}

// File download URL generation
export const generateFileDownloadUrl = async (fileId: string): Promise<string | null> => {
  try {
    const { data: file } = await supabase
      .from('uploaded_files')
      .select('storage_path')
      .eq('id', fileId)
      .single()

    if (!file) return null

    const { data } = await supabase.storage
      .from('uploaded-files')
      .createSignedUrl(file.storage_path, 3600) // 1 hour expiry

    return data?.signedUrl || null
  } catch (error) {
    console.error('Error generating download URL:', error)
    return null
  }
}