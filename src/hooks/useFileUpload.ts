import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface UploadedFile {
  id: string
  filename: string
  fileType: string
  fileSize: number
  mimeType: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  uploadedAt: string
}

export interface FileResults {
  extractedText: string | null
  wordCount: number
  characterCount: number
  pageCount: number | null
  language: string | null
  colors: string[] | null
  fontFamilies: string[] | null
  fontSizes: number[] | null
  extractedImages: string[] | null
  confidenceScore: number | null
  processingTime: number | null
  processedAt: string
}

export interface ProcessingResult {
  fileId: string
  filename: string
  status: 'completed' | 'failed'
  parsing?: {
    success: boolean
    textLength: number
    wordCount: number
    colors: number
    processingTime: number
  }
  error?: string
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [filename: string]: number }>({})
  const [error, setError] = useState<string | null>(null)

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const uploadFiles = useCallback(async (files: File[]): Promise<ProcessingResult[]> => {
    setUploading(true)
    setError(null)
    setUploadProgress({})

    try {
      const token = await getAuthToken()
      if (!token) throw new Error('No auth token')

      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))
      })

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(filename => {
            if (updated[filename] < 90) {
              updated[filename] = Math.min(90, updated[filename] + Math.random() * 20)
            }
          })
          return updated
        })
      }, 500)

      const response = await fetch('/api/user/upload/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Upload failed: ${response.status} ${errorData}`)
      }

      const result = await response.json()

      // Set all files to 100% progress
      setUploadProgress(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(filename => {
          updated[filename] = 100
        })
        return updated
      })

      return result.results || []
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      return []
    } finally {
      setUploading(false)
      // Clear progress after a delay
      setTimeout(() => setUploadProgress({}), 2000)
    }
  }, [])

  const fetchUserFiles = useCallback(async (): Promise<UploadedFile[]> => {
    try {
      const token = await getAuthToken()
      if (!token) throw new Error('No auth token')

      const response = await fetch('/api/user/files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch files')

      const { files } = await response.json()
      return files
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files')
      return []
    }
  }, [])

  const fetchFileDetails = useCallback(async (fileId: string): Promise<{
    file: UploadedFile | null
    results: FileResults | null
  }> => {
    try {
      const token = await getAuthToken()
      if (!token) throw new Error('No auth token')

      const response = await fetch(`/api/user/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch file details')

      const data = await response.json()
      return {
        file: data.file,
        results: data.results
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch file details')
      return { file: null, results: null }
    }
  }, [])

  return {
    uploading,
    uploadProgress,
    error,
    uploadFiles,
    fetchUserFiles,
    fetchFileDetails,
    clearError: () => setError(null)
  }
}