'use client'

import { useState, useEffect } from 'react'

export type AnalysisStatus = 
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'analyzing'
  | 'completed'
  | 'error'

interface StatusIndicatorProps {
  status: AnalysisStatus
  progress?: number
  message?: string
  fileName?: string
}

export const StatusIndicator = ({ status, progress = 0, message, fileName }: StatusIndicatorProps) => {
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (status === 'uploading' || status === 'processing' || status === 'analyzing') {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.')
      }, 500)
      return () => clearInterval(interval)
    }
  }, [status])

  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return {
          icon: '📄',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-600',
          title: 'Ready to Analyze',
          description: 'Select files and guidelines to begin analysis'
        }
      case 'uploading':
        return {
          icon: '📤',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          title: 'Uploading Files',
          description: `Uploading ${fileName || 'files'}${dots}`
        }
      case 'processing':
        return {
          icon: '⚙️',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          title: 'Processing Content',
          description: `Extracting text and analyzing structure${dots}`
        }
      case 'analyzing':
        return {
          icon: '🤖',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-700',
          title: 'AI Analysis in Progress',
          description: `Checking brand compliance with Claude AI${dots}`
        }
      case 'completed':
        return {
          icon: '✅',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700',
          title: 'Analysis Complete',
          description: 'Brand analysis finished successfully'
        }
      case 'error':
        return {
          icon: '❌',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          title: 'Analysis Failed',
          description: message || 'An error occurred during analysis'
        }
      default:
        return {
          icon: '📄',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-600',
          title: 'Unknown Status',
          description: 'Status not recognized'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}>
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{config.icon}</div>
        <div className="flex-1">
          <div className={`font-medium ${config.textColor}`}>
            {config.title}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {config.description}
          </div>
          
          {/* Progress Bar */}
          {(status === 'uploading' || status === 'processing' || status === 'analyzing') && progress > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Animated Loading Bar */}
          {(status === 'processing' || status === 'analyzing') && progress === 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-600 h-1.5 rounded-full animate-pulse"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Status Steps */}
      {(status === 'processing' || status === 'analyzing' || status === 'completed') && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-xs">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              status === 'uploading' || status === 'processing' || status === 'analyzing' || status === 'completed'
                ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <span className="text-gray-600">File uploaded</span>
          </div>
          
          <div className="flex items-center text-xs">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              status === 'processing' || status === 'analyzing' || status === 'completed'
                ? 'bg-green-500' : status === 'uploading' ? 'bg-yellow-500' : 'bg-gray-300'
            }`}></div>
            <span className="text-gray-600">Content extracted</span>
          </div>
          
          <div className="flex items-center text-xs">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              status === 'analyzing' || status === 'completed'
                ? 'bg-green-500' : (status === 'processing' || status === 'uploading') ? 'bg-yellow-500' : 'bg-gray-300'
            }`}></div>
            <span className="text-gray-600">Brand guidelines loaded</span>
          </div>
          
          <div className="flex items-center text-xs">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              status === 'completed'
                ? 'bg-green-500' : status === 'analyzing' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'
            }`}></div>
            <span className="text-gray-600">AI analysis complete</span>
          </div>
        </div>
      )}
    </div>
  )
}

export const CompactStatusIndicator = ({ status, fileName }: { status: AnalysisStatus, fileName?: string }) => {
  const getStatusDisplay = () => {
    switch (status) {
      case 'idle':
        return { icon: '📄', text: 'Ready', color: 'text-gray-500' }
      case 'uploading':
        return { icon: '📤', text: 'Uploading...', color: 'text-blue-600' }
      case 'processing':
        return { icon: '⚙️', text: 'Processing...', color: 'text-yellow-600' }
      case 'analyzing':
        return { icon: '🤖', text: 'Analyzing...', color: 'text-purple-600' }
      case 'completed':
        return { icon: '✅', text: 'Complete', color: 'text-green-600' }
      case 'error':
        return { icon: '❌', text: 'Error', color: 'text-red-600' }
      default:
        return { icon: '📄', text: 'Unknown', color: 'text-gray-500' }
    }
  }

  const { icon, text, color } = getStatusDisplay()

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm">{icon}</span>
      <span className={`text-sm font-medium ${color}`}>
        {text}
        {fileName && status !== 'idle' && status !== 'completed' && status !== 'error' && (
          <span className="text-gray-500 font-normal"> - {fileName}</span>
        )}
      </span>
    </div>
  )
}