import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { getAnalysisIssues, updateIssueStatus } from '@/lib/database'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest, 
  { params }: { params: { analysisId: string } }
) {
  const authResult = await requireAuth(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { dbUser } = authResult
  const { analysisId } = params

  try {
    // Verify user has access to this analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('brand_analysis_results')
      .select('user_id')
      .eq('id', analysisId)
      .single()

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    if (analysis.user_id !== dbUser.id && dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get issues for this analysis
    const issues = await getAnalysisIssues(analysisId)

    return NextResponse.json({ issues })
  } catch (error) {
    console.error('Error fetching analysis issues:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch analysis issues' 
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest, 
  { params }: { params: { analysisId: string } }
) {
  const authResult = await requireAuth(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { dbUser } = authResult
  const { analysisId } = params

  try {
    const { issueId, status } = await request.json()

    if (!issueId || !status || !['open', 'acknowledged', 'fixed', 'dismissed'].includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid issueId or status' 
      }, { status: 400 })
    }

    // Verify user has access to this analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('brand_analysis_results')
      .select('user_id')
      .eq('id', analysisId)
      .single()

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    if (analysis.user_id !== dbUser.id && dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update issue status
    const success = await updateIssueStatus(issueId, status)

    if (!success) {
      throw new Error('Failed to update issue status')
    }

    return NextResponse.json({ 
      message: 'Issue status updated successfully',
      issueId,
      status
    })
  } catch (error) {
    console.error('Error updating issue status:', error)
    return NextResponse.json({ 
      error: 'Failed to update issue status' 
    }, { status: 500 })
  }
}