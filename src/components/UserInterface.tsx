'use client'

import { useState } from 'react'
import { useFileUpload, UploadedFile, ProcessingResult } from '@/hooks/useFileUpload'
import { useBrandAnalysis, AnalysisResult, AnalysisIssue } from '@/hooks/useBrandAnalysis'
import { BrandFileSelector } from './BrandFileSelector'
import { StatusIndicator, AnalysisStatus } from './StatusIndicator'
import { IssueDisplay } from './IssueDisplay'
import { stableKey } from '@/utils/keys'
import { ThemeSwitcher } from './ThemeSwitcher'

export const UserInterface = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'analysis' | 'settings'>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([])
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([])
  const [selectedFileForAnalysis, setSelectedFileForAnalysis] = useState<string | null>(null)
  const [analysisIssues, setAnalysisIssues] = useState<AnalysisIssue[]>([])
  const [currentStatus, setCurrentStatus] = useState<AnalysisStatus>('idle')
  const [selectedBrandFileId, setSelectedBrandFileId] = useState<string | null>(null)
  
  const { 
    uploading, 
    uploadProgress, 
    error: uploadError, 
    uploadFiles, 
    clearError: clearUploadError 
  } = useFileUpload()

  const {
    analyzing,
    error: analysisError,
    analyzeFile,
    getAnalysisIssues,
    updateIssueStatus,
    clearError: clearAnalysisError
  } = useBrandAnalysis()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...droppedFiles])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(prev => [...prev, ...selectedFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setCurrentStatus('uploading')
    
    // Clear previous session data
    setUploadedFiles([])
    setAnalysisResults([])
    setAnalysisIssues([])
    setSelectedFileForAnalysis(null)
    
    const results = await uploadFiles(files)
    setProcessingResults(results)
    setFiles([]) // Clear selected files
    
    setCurrentStatus('processing')
    
    // Only add currently uploaded files to the display (no database fetch)
    const currentSessionFiles = results
      .filter(r => r.status === 'completed' && r.fileId)
      .map(r => ({
        id: r.fileId!,
        filename: r.filename,
        fileType: 'unknown',
        fileSize: 0,
        mimeType: 'unknown',
        status: 'completed' as const,
        uploadedAt: new Date().toISOString()
      }))
    
    setUploadedFiles(currentSessionFiles)
    
    // Auto-trigger analysis for successfully processed files
    const successfulUploads = results.filter(r => r.status === 'completed' && r.fileId)
    if (successfulUploads.length > 0) {
      setCurrentStatus('analyzing')
      
      // Analyze the first successfully uploaded file automatically
      const firstFile = successfulUploads[0]
      const analysisResult = await analyzeFile(firstFile.fileId!, selectedBrandFileId || undefined)
      
      if (analysisResult) {
        setSelectedFileForAnalysis(analysisResult.analysisId)
        setAnalysisIssues(analysisResult.issues)
        
        // Only show current session analysis
        setAnalysisResults([{
          id: analysisResult.analysisId,
          fileId: firstFile.fileId!,
          totalIssues: analysisResult.summary.totalIssues,
          highSeverityIssues: analysisResult.summary.highSeverity,
          mediumSeverityIssues: analysisResult.summary.mediumSeverity,
          lowSeverityIssues: analysisResult.summary.lowSeverity,
          complianceScore: analysisResult.summary.score,
          analysisTimeMs: analysisResult.analysisTime,
          contentLength: 0,
          rulesApplied: analysisResult.rulesApplied,
          analyzedAt: new Date().toISOString()
        }])
      }
    }
    
    setCurrentStatus('completed')
    setActiveTab('analysis') // Switch to analysis tab
  }

  // Removed loadUploadedFiles and loadAnalysisResults - no longer loading historical data

  const handleAnalyzeFile = async (fileId: string) => {
    setCurrentStatus('analyzing')
    const result = await analyzeFile(fileId, selectedBrandFileId || undefined)
    if (result) {
      // Only show current analysis result, not historical data
      setAnalysisResults([{
        id: result.analysisId,
        fileId: fileId,
        totalIssues: result.summary.totalIssues,
        highSeverityIssues: result.summary.highSeverity,
        mediumSeverityIssues: result.summary.mediumSeverity,
        lowSeverityIssues: result.summary.lowSeverity,
        complianceScore: result.summary.score,
        analysisTimeMs: result.analysisTime,
        contentLength: 0,
        rulesApplied: result.rulesApplied,
        analyzedAt: new Date().toISOString()
      }])
      setSelectedFileForAnalysis(result.analysisId)
      setAnalysisIssues(result.issues)
      setCurrentStatus('completed')
    } else {
      setCurrentStatus('error')
    }
  }

  const handleBrandFileSelect = (fileId: string, fileName: string) => {
    setSelectedBrandFileId(fileId)
    // fileName is available here if needed for future use
    console.log('Selected brand file:', fileName)
  }

  const clearSession = () => {
    setFiles([])
    setUploadedFiles([])
    setProcessingResults([])
    setAnalysisResults([])
    setAnalysisIssues([])
    setSelectedFileForAnalysis(null)
    setSelectedBrandFileId(null)
    setCurrentStatus('idle')
    setActiveTab('upload')
  }

  const handleViewAnalysisDetails = async (analysisId: string) => {
    setSelectedFileForAnalysis(analysisId)
    const issues = await getAnalysisIssues(analysisId)
    setAnalysisIssues(issues)
  }

  const handleUpdateIssueStatus = async (
    issueId: string, 
    status: 'open' | 'acknowledged' | 'fixed' | 'dismissed'
  ) => {
    if (selectedFileForAnalysis) {
      const success = await updateIssueStatus(selectedFileForAnalysis, issueId, status)
      if (success) {
        // Refresh issues
        const issues = await getAnalysisIssues(selectedFileForAnalysis)
        setAnalysisIssues(issues)
      }
    }
  }

  // Removed automatic loading of historical data
  // Files and analysis results are now only shown for current session

  return (
    <div className="page-container">
      {/* Modern Header with Gradient */}
      <div className="bg-gradient-hero border-b border-gray-200 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-cyan-50/30 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                  <span className="text-white font-bold text-xl">BG</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gradient">
                  Brand Guard
                </h1>
                <p className="text-base text-gray-600 font-medium">
                  AI-Powered Brand Compliance Analysis
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={clearSession}
                className="btn-secondary text-sm shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                New Session
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Modern Tab Navigation */}
          <div className="card-elevated mb-8">
            <nav className="flex p-2">
              {[
                { id: 'upload', name: 'Upload Files', icon: '📤', color: 'primary' },
                { id: 'analysis', name: 'Analysis Results', icon: '📊', color: 'accent' },
                { id: 'settings', name: 'Settings', icon: '⚙️', color: 'secondary' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'upload' | 'analysis' | 'settings')}
                  className={`flex items-center space-x-3 px-8 py-4 text-sm font-semibold rounded-xl transition-all duration-300 flex-1 justify-center relative overflow-hidden ${
                    activeTab === tab.id
                      ? 'text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={activeTab === tab.id ? {
                    background: tab.color === 'primary' 
                      ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)'
                      : tab.color === 'accent'
                      ? 'linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%)'
                      : 'linear-gradient(135deg, var(--secondary) 0%, var(--gray-800) 100%)'
                  } : {}}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.name}</span>
                  {activeTab === tab.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-pulse"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-8">
            {(uploadError || analysisError) && (
              <div className="card-elevated p-6 border-l-4" style={{ borderLeftColor: 'var(--error)' }}>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-error-light flex items-center justify-center">
                      <span className="text-lg">⚠️</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
                    <p className="text-gray-700 mb-4">{uploadError || analysisError}</p>
                    <button 
                      onClick={() => {
                        clearUploadError()
                        clearAnalysisError()
                      }}
                      className="btn-secondary text-xs"
                    >
                      Dismiss Error
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="space-y-12">
                {/* Hero Section */}
                <div className="text-center py-12 px-8 rounded-3xl bg-gradient-hero relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-transparent to-cyan-50/60 pointer-events-none"></div>
                  <div className="relative">
                    <div className="mb-6">
                      <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm text-primary font-medium text-sm mb-6 shadow-lg">
                        <div className="w-2 h-2 bg-accent rounded-full animate-pulse mr-2"></div>
                        AI-Powered Analysis
                      </div>
                    </div>
                    <h2 className="text-hero text-gradient mb-6">
                      Upload Files for Analysis
                    </h2>
                    <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed font-medium">
                      Upload your marketing materials to check brand compliance and ensure consistency across all your content with our advanced AI analysis.
                    </p>
                  </div>
                </div>

                {/* Brand File Selector */}
                <div className="card-elevated p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-accent flex items-center justify-center">
                      <span className="text-white text-lg">🎯</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Brand Guidelines</h3>
                      <p className="text-gray-600">Select your brand guidelines for analysis</p>
                    </div>
                  </div>
                  <BrandFileSelector 
                    onFileSelect={handleBrandFileSelect} 
                    selectedFileId={selectedBrandFileId || undefined}
                  />
                </div>

                {/* Status Indicator */}
                <StatusIndicator status={currentStatus} />

                {/* File Upload Area */}
                <div 
                  className={`card-elevated border-2 border-dashed p-16 transition-all duration-300 relative overflow-hidden ${
                    dragOver ? 'border-primary bg-primary-light scale-105 shadow-glow' : 'border-gray-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="text-center space-y-8 relative z-10">
                    <div className="relative">
                      <div className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center transition-all duration-300 ${
                        dragOver ? 'bg-gradient-primary scale-110' : 'bg-gradient-accent'
                      }`}>
                        <span className="text-4xl text-white">📤</span>
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-success rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold mb-4 text-gray-900">
                        Drop files here or click to browse
                      </h3>
                      <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
                        Support for PDF, DOCX, images (PNG, JPG) and more formats
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.docx,.png,.jpg,.jpeg"
                    />
                    <label htmlFor="file-upload" className="btn-primary cursor-pointer text-lg px-10 py-5 shadow-xl">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Choose Files
                    </label>
                  </div>
                  
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent pointer-events-none"></div>
                </div>

                {/* Selected Files */}
                {files.length > 0 && (
                  <div className="card-elevated p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-primary flex items-center justify-center">
                          <span className="text-white font-bold">{files.length}</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            Selected Files
                          </h3>
                          <p className="text-gray-600">Ready for upload and analysis</p>
                        </div>
                      </div>
                      <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="btn-primary text-lg px-8 py-4"
                      >
                        {uploading ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Upload & Analyze
                          </>
                        )}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {files.map((file, index) => (
                        <div key={stableKey({name: file.name, size: file.size, type: file.type}, index, 'file')} 
                             className="flex items-center justify-between p-4 border rounded-lg"
                             style={{ borderColor: 'var(--border)' }}>
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">
                              {file.type.startsWith('image/') ? '🖼️' : 
                               file.type === 'application/pdf' ? '📄' :
                               file.name.endsWith('.docx') ? '📝' : '📄'}
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{file.name}</p>
                              <p className="text-xs" style={{ color: 'var(--gray-600)' }}>
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                              {uploadProgress[file.name] !== undefined && (
                                <div className="mt-2 w-32">
                                  <div className="bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="h-2 rounded-full transition-all duration-300"
                                      style={{ 
                                        backgroundColor: 'var(--primary)',
                                        width: `${Math.round(uploadProgress[file.name])}%`
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-xs mt-1" style={{ color: 'var(--gray-600)' }}>
                                    {Math.round(uploadProgress[file.name])}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Processing Results */}
                {processingResults.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>
                      Processing Results ({processingResults.length} files)
                    </h3>
                    <div className="space-y-3">
                      {processingResults.map((result, index) => (
                        <div key={stableKey(result, index, 'processing')} 
                             className={`p-4 rounded-lg border ${
                               result.status === 'completed' ? 'status-success' : 'status-error'
                             }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{result.filename}</p>
                              {result.status === 'completed' && result.parsing && (
                                <p className="text-sm mt-1">
                                  ✅ Extracted {result.parsing.wordCount} words, {result.parsing.colors} colors 
                                  (processed in {result.parsing.processingTime}ms)
                                </p>
                              )}
                              {result.status === 'failed' && (
                                <p className="text-sm mt-1">
                                  ❌ {result.error || 'Processing failed'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>
                      Ready for Analysis ({uploadedFiles.length} files)
                    </h3>
                    <div className="space-y-3">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                             style={{ borderColor: 'var(--border)' }}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium" style={{ color: 'var(--foreground)' }}>{file.filename}</p>
                              <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                                {file.fileType} • Uploaded {new Date(file.uploadedAt).toLocaleTimeString()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleAnalyzeFile(file.id)}
                              disabled={analyzing}
                              className="btn-primary text-sm"
                            >
                              {analyzing ? 'Analyzing...' : 'Analyze'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'analysis' && (
              <div className="space-y-12">
                {/* Hero Section */}
                <div className="text-center py-12 px-8 rounded-3xl bg-gradient-accent dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/80 via-transparent to-blue-50/60 dark:from-cyan-900/20 dark:via-transparent dark:to-blue-900/20 pointer-events-none"></div>
                  <div className="relative">
                    <div className="mb-6">
                      <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-accent dark:text-cyan-400 font-medium text-sm mb-6 shadow-lg">
                        <div className="w-2 h-2 bg-primary dark:bg-cyan-400 rounded-full animate-pulse mr-2"></div>
                        Analysis Complete
                      </div>
                    </div>
                    <h2 className="text-hero text-white mb-6">
                      Analysis Results
                    </h2>
                    <p className="text-xl text-white/90 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed font-medium">
                      Review brand compliance analysis and issues found in your uploaded content with detailed insights and recommendations.
                    </p>
                  </div>
                </div>

                {/* Analysis Results */}
                {analysisResults.length > 0 && (
                  <div className="space-y-6">
                    {analysisResults.map((analysis) => (
                      <div key={analysis.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              Analysis Results
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Compliance Score: {analysis.complianceScore}% • {analysis.totalIssues} issues found
                            </p>
                          </div>
                          <button
                            onClick={() => handleViewAnalysisDetails(analysis.id)}
                            className="btn-secondary text-sm"
                          >
                            View Details
                          </button>
                        </div>
                        
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--error-light)', color: 'var(--error)' }}>
                            <div className="text-2xl font-bold">{analysis.highSeverityIssues}</div>
                            <div className="text-sm">High Priority</div>
                          </div>
                          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
                            <div className="text-2xl font-bold">{analysis.mediumSeverityIssues}</div>
                            <div className="text-sm">Medium Priority</div>
                          </div>
                          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                            <div className="text-2xl font-bold">{analysis.lowSeverityIssues}</div>
                            <div className="text-sm">Low Priority</div>
                          </div>
                          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                            <div className="text-2xl font-bold">{analysis.complianceScore}%</div>
                            <div className="text-sm">Compliance</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Issues Display */}
                {selectedFileForAnalysis && analysisIssues.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <IssueDisplay
                      issues={analysisIssues}
                      onUpdateStatus={handleUpdateIssueStatus}
                    />
                  </div>
                )}

                {/* No Results State */}
                {analysisResults.length === 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                      <span className="text-2xl">📊</span>
                    </div>
                    <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">
                      No Analysis Results Yet
                    </h3>
                    <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">
                      Upload files first, then run analysis to see brand compliance results here.
                    </p>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="btn-primary"
                    >
                      Upload Files
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-12">
                {/* Hero Section */}
                <div className="text-center py-12 px-8 rounded-3xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-transparent to-indigo-50/60 dark:from-purple-900/20 dark:to-indigo-900/20 pointer-events-none"></div>
                  <div className="relative">
                    <div className="mb-6">
                      <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 font-medium text-sm mb-6 shadow-lg">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse mr-2"></div>
                        Customization
                      </div>
                    </div>
                    <h2 className="text-hero text-gradient mb-6">
                      Settings & Preferences
                    </h2>
                    <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed font-medium">
                      Customize your Brand Guard experience and learn about our powerful features.
                    </p>
                  </div>
                </div>

                {/* Theme Switcher */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                      <span className="text-white text-lg">🎨</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Appearance</h3>
                      <p className="text-gray-600 dark:text-gray-400">Customize the look and feel of your workspace</p>
                    </div>
                  </div>
                  <ThemeSwitcher />
                </div>

                {/* About Section */}
                <div className="card-elevated p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center">
                      <span className="text-white text-lg">ℹ️</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">About Brand Guard</h3>
                      <p className="text-gray-600 dark:text-gray-400">AI-powered brand compliance analysis</p>
                    </div>
                  </div>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 mb-6 text-lg leading-relaxed">
                      Brand Guard analyzes your content against established brand guidelines using cutting-edge AI technology to ensure consistency across all your marketing materials.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">Content Analysis</h4>
                        <div className="space-y-2 text-gray-700 dark:text-gray-300">
                          <div className="flex items-center space-x-2">
                            <span className="text-green-500">✓</span>
                            <span>Grammar & style compliance</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-green-500">✓</span>
                            <span>Banned word detection</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-green-500">✓</span>
                            <span>Color palette validation</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">Brand Consistency</h4>
                        <div className="space-y-2 text-gray-700 dark:text-gray-300">
                          <div className="flex items-center space-x-2">
                            <span className="text-green-500">✓</span>
                            <span>Voice & tone consistency</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-green-500">✓</span>
                            <span>Image guideline adherence</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-green-500">✓</span>
                            <span>Custom rule enforcement</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Version Info */}
                <div className="card p-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
                  <div className="text-center">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium mb-3">
                      v1.0.0
                    </div>
                    <p className="text-blue-800 dark:text-blue-200">
                      Built with modern web technologies for optimal performance and user experience.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
