import sgMail from '@sendgrid/mail'
import { AnalysisIssue } from './claudeAnalysis'

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export interface EmailAnalysisData {
  fileName: string
  fileId: string
  userEmail: string
  userName?: string
  complianceScore: number
  totalIssues: number
  highSeverityIssues: number
  mediumSeverityIssues: number
  lowSeverityIssues: number
  issues: AnalysisIssue[]
  guidelineFolderName: string
  downloadUrl: string
  analysisDate: string
}

export class EmailService {
  
  private readonly fromEmail = process.env.SENDGRID_FROM_EMAIL!
  private readonly fromName = process.env.SENDGRID_FROM_NAME || 'Brand Guard'

  async sendAnalysisResults(data: EmailAnalysisData): Promise<boolean> {
    try {
      const htmlContent = this.generateAnalysisEmailHTML(data)
      const textContent = this.generateAnalysisEmailText(data)

      const msg = {
        to: data.userEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: `Brand Analysis Complete: ${data.fileName} (Score: ${data.complianceScore}/100)`,
        text: textContent,
        html: htmlContent
      }

      await sgMail.send(msg)
      console.log(`Analysis results email sent to ${data.userEmail}`)
      return true
    } catch (error) {
      console.error('Failed to send analysis results email:', error)
      return false
    }
  }

  private generateAnalysisEmailHTML(data: EmailAnalysisData): string {
    const getScoreColor = (score: number) => {
      if (score >= 90) return '#10b981' // green
      if (score >= 70) return '#f59e0b' // yellow
      return '#ef4444' // red
    }

    const getSeverityColor = (severity: string) => {
      switch (severity) {
        case 'high': return '#ef4444'
        case 'medium': return '#f59e0b'
        case 'low': return '#10b981'
        default: return '#6b7280'
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

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Brand Analysis Results</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 24px;
            border-bottom: 2px solid #e5e7eb;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 8px;
        }
        .score-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 24px;
        }
        .score-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: white;
            color: ${getScoreColor(data.complianceScore)};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            margin: 0 auto 16px;
        }
        .file-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 24px;
        }
        .file-info h3 {
            margin: 0 0 12px 0;
            color: #1f2937;
        }
        .file-info-grid {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 8px 16px;
        }
        .file-info-label {
            font-weight: 600;
            color: #6b7280;
        }
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }
        .stat-card {
            text-align: center;
            padding: 16px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .stat-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .high { color: #ef4444; }
        .medium { color: #f59e0b; }
        .low { color: #10b981; }
        .issues-section {
            margin-bottom: 24px;
        }
        .issues-section h3 {
            color: #1f2937;
            margin-bottom: 16px;
        }
        .issue-item {
            padding: 16px;
            border-left: 4px solid #e5e7eb;
            margin-bottom: 12px;
            background: #f9fafb;
            border-radius: 0 8px 8px 0;
        }
        .issue-item.high { border-left-color: #ef4444; }
        .issue-item.medium { border-left-color: #f59e0b; }
        .issue-item.low { border-left-color: #10b981; }
        .issue-header {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        .issue-severity {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 12px;
            font-weight: 600;
            margin-right: 12px;
        }
        .issue-type {
            font-size: 12px;
            padding: 4px 8px;
            background: #e5e7eb;
            color: #374151;
            border-radius: 12px;
        }
        .issue-message {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
        }
        .issue-rule {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        .issue-context {
            background: #e5e7eb;
            padding: 8px 12px;
            border-radius: 4px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 12px;
            color: #374151;
            margin-bottom: 8px;
        }
        .issue-suggestion {
            background: #dbeafe;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            color: #1e40af;
        }
        .download-section {
            text-align: center;
            padding: 24px;
            background: #f0f9ff;
            border-radius: 8px;
            margin-bottom: 24px;
        }
        .download-button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin-top: 8px;
        }
        .footer {
            text-align: center;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🛡️ Brand Guard</div>
            <p>Your brand analysis is complete</p>
        </div>

        <div class="score-section">
            <div class="score-circle">${data.complianceScore}</div>
            <h2 style="margin: 0;">Compliance Score</h2>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">
                ${data.complianceScore >= 90 ? 'Excellent compliance!' : 
                  data.complianceScore >= 70 ? 'Good compliance with some areas for improvement' : 
                  'Several brand guideline violations detected'}
            </p>
        </div>

        <div class="file-info">
            <h3>📄 File Details</h3>
            <div class="file-info-grid">
                <span class="file-info-label">File Name:</span>
                <span>${data.fileName}</span>
                <span class="file-info-label">Analyzed:</span>
                <span>${data.analysisDate}</span>
                <span class="file-info-label">Guidelines:</span>
                <span>${data.guidelineFolderName}</span>
            </div>
        </div>

        <div class="summary-stats">
            <div class="stat-card">
                <div class="stat-number high">${data.highSeverityIssues}</div>
                <div class="stat-label">High Priority</div>
            </div>
            <div class="stat-card">
                <div class="stat-number medium">${data.mediumSeverityIssues}</div>
                <div class="stat-label">Medium Priority</div>
            </div>
            <div class="stat-card">
                <div class="stat-number low">${data.lowSeverityIssues}</div>
                <div class="stat-label">Low Priority</div>
            </div>
        </div>

        ${data.issues.length > 0 ? `
        <div class="issues-section">
            <h3>🔍 Issues Found (${data.totalIssues})</h3>
            ${data.issues.slice(0, 10).map(issue => `
                <div class="issue-item ${issue.severity}">
                    <div class="issue-header">
                        <span class="issue-severity" style="background: ${getSeverityColor(issue.severity)}20; color: ${getSeverityColor(issue.severity)};">
                            ${getSeverityIcon(issue.severity)} ${issue.severity.toUpperCase()}
                        </span>
                        <span class="issue-type">${issue.type.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div class="issue-message">${issue.message}</div>
                    <div class="issue-rule">Rule: ${issue.ruleViolated}</div>
                    ${issue.location?.context ? `<div class="issue-context">"${issue.location.context}"</div>` : ''}
                    ${issue.suggestion ? `<div class="issue-suggestion">💡 ${issue.suggestion}</div>` : ''}
                </div>
            `).join('')}
            ${data.issues.length > 10 ? `<p style="text-align: center; color: #6b7280; font-style: italic;">... and ${data.issues.length - 10} more issues. View full details in the application.</p>` : ''}
        </div>
        ` : `
        <div class="issues-section">
            <h3 style="color: #10b981;">✅ No Issues Found</h3>
            <p>Congratulations! Your content fully complies with all brand guidelines.</p>
        </div>
        `}

        <div class="download-section">
            <h3>📥 Download Original File</h3>
            <p>Access your analyzed file anytime</p>
            <a href="${data.downloadUrl}" class="download-button">Download ${data.fileName}</a>
        </div>

        <div class="footer">
            <p>This analysis was performed using Brand Guard's AI-powered brand compliance system.</p>
            <p>Questions? Contact your admin or visit the Brand Guard dashboard.</p>
        </div>
    </div>
</body>
</html>
    `
  }

  private generateAnalysisEmailText(data: EmailAnalysisData): string {
    const getSeverityIcon = (severity: string) => {
      switch (severity) {
        case 'high': return '🔴'
        case 'medium': return '🟡'
        case 'low': return '🟢'
        default: return '⚪'
      }
    }

    return `
🛡️ BRAND GUARD - ANALYSIS COMPLETE

File: ${data.fileName}
Analyzed: ${data.analysisDate}
Guidelines: ${data.guidelineFolderName}

COMPLIANCE SCORE: ${data.complianceScore}/100
${data.complianceScore >= 90 ? '✅ Excellent compliance!' : 
  data.complianceScore >= 70 ? '⚠️ Good compliance with some areas for improvement' : 
  '❌ Several brand guideline violations detected'}

ISSUES SUMMARY:
🔴 High Priority: ${data.highSeverityIssues}
🟡 Medium Priority: ${data.mediumSeverityIssues}
🟢 Low Priority: ${data.lowSeverityIssues}
Total Issues: ${data.totalIssues}

${data.issues.length > 0 ? `
ISSUES FOUND:
${data.issues.slice(0, 5).map((issue, index) => `
${index + 1}. ${getSeverityIcon(issue.severity)} ${issue.severity.toUpperCase()} - ${issue.type.replace('_', ' ').toUpperCase()}
   ${issue.message}
   Rule: ${issue.ruleViolated}
   ${issue.location?.context ? `Context: "${issue.location.context}"` : ''}
   ${issue.suggestion ? `💡 ${issue.suggestion}` : ''}
`).join('')}
${data.issues.length > 5 ? `... and ${data.issues.length - 5} more issues. View full details in the Brand Guard dashboard.` : ''}
` : `
✅ NO ISSUES FOUND
Congratulations! Your content fully complies with all brand guidelines.
`}

DOWNLOAD YOUR FILE:
${data.downloadUrl}

---
This analysis was performed using Brand Guard's AI-powered brand compliance system.
Questions? Contact your admin or visit the Brand Guard dashboard.
    `.trim()
  }

  async sendTestEmail(toEmail: string): Promise<boolean> {
    try {
      const msg = {
        to: toEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: 'Brand Guard - Email Service Test',
        text: 'This is a test email from Brand Guard. If you receive this, the email service is working correctly!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">🛡️ Brand Guard - Email Test</h2>
            <p>This is a test email from Brand Guard.</p>
            <p>If you receive this message, the email service is configured correctly!</p>
            <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0;"><strong>✅ Email Service Status:</strong> Working correctly</p>
            </div>
          </div>
        `
      }

      await sgMail.send(msg)
      console.log(`Test email sent to ${toEmail}`)
      return true
    } catch (error) {
      console.error('Failed to send test email:', error)
      return false
    }
  }
}

export const emailService = new EmailService()