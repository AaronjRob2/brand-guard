'use client'

import { useState } from 'react'
import { AnalysisIssue } from '@/hooks/useBrandAnalysis'
import { stableIssueKey, validateKeys } from '@/utils/keys'

interface IssueDisplayProps {
  issues: AnalysisIssue[]
  onUpdateStatus: (issueId: string, status: 'open' | 'acknowledged' | 'fixed' | 'dismissed') => void
}

export const IssueDisplay = ({ issues, onUpdateStatus }: IssueDisplayProps) => {
  const [sortBy, setSortBy] = useState<'severity' | 'type' | 'status'>('severity')
  const [filterBy, setFilterBy] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const getSeverityOrder = (severity: string) => {
    switch (severity) {
      case 'high': return 0
      case 'medium': return 1
      case 'low': return 2
      default: return 3
    }
  }

  const filteredAndSortedIssues = (issues || [])
    .filter(issue => issue && (filterBy === 'all' || issue.severity === filterBy))
    .sort((a, b) => {
      if (sortBy === 'severity') {
        return getSeverityOrder(a.severity) - getSeverityOrder(b.severity)
      } else if (sortBy === 'type') {
        return a.type.localeCompare(b.type)
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status)
      }
      return 0
    })

  const issueStats = {
    high: (issues || []).filter(i => i && i.severity === 'high').length,
    medium: (issues || []).filter(i => i && i.severity === 'medium').length,
    low: (issues || []).filter(i => i && i.severity === 'low').length,
    open: (issues || []).filter(i => i && i.status === 'open').length,
    acknowledged: (issues || []).filter(i => i && i.status === 'acknowledged').length,
    fixed: (issues || []).filter(i => i && i.status === 'fixed').length,
    dismissed: (issues || []).filter(i => i && i.status === 'dismissed').length,
  }

  if (!issues || issues.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6" 
             style={{ backgroundColor: 'var(--success-light)' }}>
          <span className="text-4xl">✅</span>
        </div>
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Perfect Compliance!</h3>
        <p style={{ color: 'var(--gray-600)' }}>No brand guideline violations were found in your content.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-xl text-center" style={{ backgroundColor: 'var(--error-light)', color: 'var(--error)', border: '1px solid var(--error)' }}>
          <div className="text-3xl font-bold">{issueStats.high}</div>
          <div className="text-sm font-medium">High Priority</div>
        </div>
        <div className="p-6 rounded-xl text-center" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)', border: '1px solid var(--warning)' }}>
          <div className="text-3xl font-bold">{issueStats.medium}</div>
          <div className="text-sm font-medium">Medium Priority</div>
        </div>
        <div className="p-6 rounded-xl text-center" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success)' }}>
          <div className="text-3xl font-bold">{issueStats.low}</div>
          <div className="text-sm font-medium">Low Priority</div>
        </div>
        <div className="p-6 rounded-xl text-center" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
          <div className="text-3xl font-bold">{issueStats.open}</div>
          <div className="text-sm font-medium">Open Issues</div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6">
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Filter:</label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as 'all' | 'high' | 'medium' | 'low')}
                className="input-field text-sm py-2 px-3 min-w-0"
              >
                <option value="all">All Issues ({(issues || []).length})</option>
                <option value="high">High Priority ({issueStats.high})</option>
                <option value="medium">Medium Priority ({issueStats.medium})</option>
                <option value="low">Low Priority ({issueStats.low})</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'severity' | 'type' | 'status')}
                className="input-field text-sm py-2 px-3 min-w-0"
              >
                <option value="severity">Severity</option>
                <option value="type">Type</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
          
          <div className="text-sm font-medium" style={{ color: 'var(--gray-600)' }}>
            Showing {filteredAndSortedIssues.length} of {(issues || []).length} issues
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        {(() => {
          // Validate keys in development mode
          const keys = validateKeys(filteredAndSortedIssues, (issue, index) => stableIssueKey(issue, index), 'IssueDisplay')
          
          return filteredAndSortedIssues.map((issue, index) => {
            const stableKey = keys[index]
            return (
              <IssueCard
                key={stableKey}
                issue={issue}
                index={index}
                onUpdateStatus={onUpdateStatus}
              />
            )
          })
        })()}
      </div>
    </div>
  )
}

interface IssueCardProps {
  issue: AnalysisIssue
  index: number
  onUpdateStatus: (issueId: string, status: 'open' | 'acknowledged' | 'fixed' | 'dismissed') => void
}

const IssueCard = ({ issue, index, onUpdateStatus }: IssueCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return { borderColor: 'var(--error)', backgroundColor: 'var(--error-light)' }
      case 'medium': return { borderColor: 'var(--warning)', backgroundColor: 'var(--warning-light)' }
      case 'low': return { borderColor: 'var(--success)', backgroundColor: 'var(--success-light)' }
      default: return { borderColor: 'var(--border)', backgroundColor: 'var(--gray-50)' }
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return '🔴'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'grammar': return '📝'
      case 'banned_word': return '🚫'
      case 'color_violation': return '🎨'
      case 'image_violation': return '🖼️'
      case 'voice_tone': return '🗣️'
      default: return '❓'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return { backgroundColor: 'var(--error-light)', color: 'var(--error)', borderColor: 'var(--error)' }
      case 'acknowledged': return { backgroundColor: 'var(--warning-light)', color: 'var(--warning)', borderColor: 'var(--warning)' }
      case 'fixed': return { backgroundColor: 'var(--success-light)', color: 'var(--success)', borderColor: 'var(--success)' }
      case 'dismissed': return { backgroundColor: 'var(--gray-100)', color: 'var(--gray-600)', borderColor: 'var(--border)' }
      default: return { backgroundColor: 'var(--gray-100)', color: 'var(--gray-600)', borderColor: 'var(--border)' }
    }
  }

  const severityStyle = getSeverityColor(issue.severity)
  
  return (
    <div className="card border-l-4 hover:shadow-lg transition-all duration-200" 
         style={{ borderLeftColor: severityStyle.borderColor }}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-sm font-mono px-3 py-1 rounded-lg" 
                    style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-700)' }}>
                #{(index + 1).toString().padStart(2, '0')}
              </span>
              <span className="text-xl">{getSeverityIcon(issue.severity)}</span>
              <span className="text-xl">{getTypeIcon(issue.type)}</span>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full text-xs font-medium" 
                      style={issue.severity === 'high' ? { backgroundColor: 'var(--error-light)', color: 'var(--error)' } :
                             issue.severity === 'medium' ? { backgroundColor: 'var(--warning-light)', color: 'var(--warning)' } :
                             { backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                  {issue.severity.toUpperCase()}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium" 
                      style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-700)' }}>
                  {issue.type.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
            
            <h4 className="font-semibold text-lg mb-3" style={{ color: 'var(--foreground)' }}>{issue.message}</h4>
            
            <div className="text-sm mb-3" style={{ color: 'var(--gray-600)' }}>
              <strong>Rule Violated:</strong> {issue.ruleViolated}
            </div>

            {issue.location?.context && (
              <div className="p-4 rounded-lg mb-4" 
                   style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-700)' }}>
                <strong>Context:</strong> &quot;{issue.location.context}&quot;
              </div>
            )}

            {issue.suggestion && (
              <div className="p-4 rounded-lg mb-4" 
                   style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                <strong>💡 Suggestion:</strong> {issue.suggestion}
              </div>
            )}
          </div>
          
          <div className="ml-6 flex flex-col items-end space-y-3">
            <select
              value={issue.status}
              onChange={(e) => onUpdateStatus(issue.id, e.target.value as 'open' | 'acknowledged' | 'fixed' | 'dismissed')}
              className="text-xs border rounded-lg px-3 py-2 font-medium cursor-pointer transition-colors"
              style={getStatusColor(issue.status)}
            >
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="fixed">Fixed</option>
              <option value="dismissed">Dismissed</option>
            </select>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-medium hover:opacity-75 transition-opacity"
              style={{ color: 'var(--primary)' }}
            >
              {isExpanded ? 'Less info ↑' : 'More info ↓'}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-6 pt-6 space-y-4" style={{ borderTop: '1px solid var(--border-light)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong style={{ color: 'var(--foreground)' }}>Issue Type:</strong>
                <span style={{ color: 'var(--gray-600)' }}> {issue.type.replace('_', ' ')}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--foreground)' }}>Status:</strong>
                <span style={{ color: 'var(--gray-600)' }}> {issue.status}</span>
              </div>
              {issue.location?.line && (
                <div>
                  <strong style={{ color: 'var(--foreground)' }}>Line:</strong>
                  <span style={{ color: 'var(--gray-600)' }}> {issue.location.line}</span>
                </div>
              )}
              {issue.location?.position && (
                <div>
                  <strong style={{ color: 'var(--foreground)' }}>Position:</strong>
                  <span style={{ color: 'var(--gray-600)' }}> {issue.location.position}</span>
                </div>
              )}
            </div>
            
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--gray-50)' }}>
              <div className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Full Rule:</div>
              <div className="text-sm" style={{ color: 'var(--gray-700)' }}>{issue.ruleViolated}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}