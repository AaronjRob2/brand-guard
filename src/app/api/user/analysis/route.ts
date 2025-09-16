import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { getAnalysisResultsByUser, getUserAnalysisStats } from '@/lib/database'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { dbUser } = authResult

  try {
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('stats') === 'true'

    // Get user's analysis results
    const analyses = await getAnalysisResultsByUser(dbUser.id)

    let stats = null
    if (includeStats) {
      stats = await getUserAnalysisStats(dbUser.id)
    }

    return NextResponse.json({ 
      analyses: analyses.map(analysis => ({
        id: analysis.id,
        fileId: analysis.file_id,
        totalIssues: analysis.total_issues,
        highSeverityIssues: analysis.high_severity_issues,
        mediumSeverityIssues: analysis.medium_severity_issues,
        lowSeverityIssues: analysis.low_severity_issues,
        complianceScore: analysis.compliance_score,
        analysisTimeMs: analysis.analysis_time_ms,
        contentLength: analysis.content_length,
        rulesApplied: analysis.rules_applied,
        analyzedAt: analysis.analyzed_at
      })),
      stats
    })
  } catch (error) {
    console.error('Error fetching user analyses:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch analysis results' 
    }, { status: 500 })
  }
}