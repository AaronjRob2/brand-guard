import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { getFileWithResults, saveBrandAnalysisResult, saveAnalysisIssues } from '@/lib/database-server'
import { getCachedAnalysisResult, getActiveDriveFolder, generateFileDownloadUrl } from '@/lib/database'
import { brandRulesService } from '@/lib/brandRules'
import { claudeAnalysisService } from '@/lib/claudeAnalysis'
import { extractBrandGuidelinesFromFile, generateBrandRulesFromContent } from '@/lib/brandFileParser'
import { emailService } from '@/lib/emailService'
import { createHash } from 'crypto'

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    // Await params before using
    const resolvedParams = await params
    console.log('🚀 Analysis endpoint called for fileId:', resolvedParams?.fileId || 'undefined')
    
    // Validate params
    if (!resolvedParams || !resolvedParams.fileId) {
      console.error('❌ Missing fileId in params')
      return NextResponse.json({ 
        error: 'File ID is required',
        details: 'No fileId provided in URL params'
      }, { status: 400 })
    }

    const { fileId } = resolvedParams
    console.log('📋 Processing analysis for fileId:', fileId)
    
    // Test authentication
    console.log('🔐 Starting authentication...')
    let authResult
    try {
      authResult = await requireAuth(request)
    } catch (authError) {
      console.error('❌ Authentication error:', authError)
      return NextResponse.json({ 
        error: 'Authentication failed',
        details: authError instanceof Error ? authError.message : 'Unknown auth error'
      }, { status: 401 })
    }
    
    if (authResult instanceof NextResponse) {
      console.log('❌ Auth failed - returning auth response')
      return authResult
    }

    const { dbUser } = authResult
    console.log('✅ Authentication successful for user:', dbUser.id)
    
    // Parse request body to get brandFileId if provided
    let brandFileId: string | undefined
    try {
      console.log('📝 Parsing request body...')
      const body = await request.json()
      brandFileId = body.brandFileId
      console.log('✅ Request body parsed, brandFileId:', brandFileId || 'none')
    } catch (bodyError) {
      // No body or invalid JSON - continue without brandFileId
      console.log('⚠️ No request body or invalid JSON - continuing without brandFileId')
    }
    
    console.log('✅ Initial setup complete for user:', dbUser.id, brandFileId ? `with brand file: ${brandFileId}` : 'using database rules')

    // Start main analysis process
    // Get file and processing results
    console.log('🔍 Step 1: Getting file and processing results for fileId:', fileId)
    let file, results
    try {
      const fileData = await getFileWithResults(fileId)
      file = fileData.file
      results = fileData.results
      console.log('✅ Step 1: File data retrieved successfully')
    } catch (dbError) {
      console.error('❌ Step 1: Database error getting file:', dbError)
      return NextResponse.json({ 
        error: 'Database error retrieving file data',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 })
    }

    if (!file) {
      console.log('❌ Step 1: File not found for fileId:', fileId)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    console.log('✅ Step 1: File found:', {
      fileId: file.id,
      filename: file.original_filename,
      userId: file.user_id,
      hasResults: !!results
    })

    // Check if user owns the file
    if (file.user_id !== dbUser.id && dbUser.role !== 'admin') {
      console.log('❌ Step 1: Access denied. File owner:', file.user_id, 'Requesting user:', dbUser.id)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!results || !results.extracted_text) {
      console.log('❌ Step 1: No processing results or extracted text. Results:', !!results, 'Extracted text:', !!results?.extracted_text)
      return NextResponse.json({ 
        error: 'File has not been processed or contains no text content' 
      }, { status: 400 })
    }

    console.log('✅ Step 1: All validation passed')

    // Get brand rules - either from selected file or database
    console.log('🔍 Step 2: Getting brand rules/guidelines')
    let brandGuidelinesContent: string
    let rulesChecksum: string
    
    if (brandFileId) {
      console.log('🔍 Step 2a: Loading brand guidelines from selected file:', brandFileId)
      try {
        const brandGuidelines = await extractBrandGuidelinesFromFile(brandFileId, dbUser.id)
        brandGuidelinesContent = generateBrandRulesFromContent(brandGuidelines)
        
        // Create checksum for caching based on file content
        rulesChecksum = createHash('md5')
          .update(brandGuidelinesContent)
          .digest('hex')
          
        console.log('✅ Step 2a: Brand guidelines loaded from file:', {
          fileName: brandGuidelines.fileName,
          fileType: brandGuidelines.fileType,
          contentLength: brandGuidelines.content.length
        })
      } catch (err) {
        console.error('❌ Step 2a: Failed to load brand guidelines from file:', err)
        console.log('🔄 Step 2a: Falling back to database rules due to brand file error')
        
        // Fall back to database rules if brand file parsing fails
        try {
          const brandRules = await brandRulesService.aggregateBrandRules()
          console.log('✅ Step 2a-fallback: Loaded database rules as fallback')
          
          brandGuidelinesContent = JSON.stringify(brandRules, null, 2)
          rulesChecksum = createHash('md5').update(brandGuidelinesContent).digest('hex')
          
          console.log('⚠️ Using database rules due to brand file parsing error:', err instanceof Error ? err.message : 'Unknown error')
        } catch (fallbackError) {
          console.error('❌ Step 2a-fallback: Even database rules failed:', fallbackError)
          return NextResponse.json({ 
            error: `Failed to load brand guidelines and database rules: ${err instanceof Error ? err.message : 'Unknown error'}`,
            details: 'Both brand file and database rules failed'
          }, { status: 400 })
        }
      }
    } else {
      console.log('🔍 Step 2b: Loading brand rules from database...')
      let brandRules
      try {
        brandRules = await brandRulesService.aggregateBrandRules()
        console.log('✅ Step 2b: Brand rules loaded:', {
          grammarRules: brandRules.grammar.rules.length,
          bannedWords: brandRules.bannedWords.length,
          approvedColors: brandRules.approvedColors.length,
          imageRules: brandRules.imageRestrictions.rules.length,
          additionalRules: brandRules.additionalRules.length
        })
      } catch (rulesError) {
        console.error('❌ Step 2b: Error loading brand rules from database:', rulesError)
        return NextResponse.json({ 
          error: 'Failed to load brand rules from database',
          details: rulesError instanceof Error ? rulesError.message : 'Unknown database error'
        }, { status: 500 })
      }
      
      // Check if rules are available
      const hasRules = (
        brandRules.grammar.rules.length > 0 ||
        brandRules.bannedWords.length > 0 ||
        brandRules.approvedColors.length > 0 ||
        brandRules.imageRestrictions.rules.length > 0 ||
        brandRules.additionalRules.length > 0
      )

      if (!hasRules) {
        console.log('❌ Step 2b: No brand rules available')
        return NextResponse.json({ 
          error: 'No brand rules available. Please select a brand guidelines file or connect a Google Drive folder with brand guidelines.' 
        }, { status: 400 })
      }
      
      // Convert database rules to guidelines content for Claude
      brandGuidelinesContent = JSON.stringify(brandRules, null, 2)
      
      // Create checksum for caching
      rulesChecksum = createHash('md5')
        .update(brandGuidelinesContent)
        .digest('hex')
    }
    
    console.log('✅ Step 2: Brand guidelines/rules ready')
    
    console.log('✅ Brand guidelines validation passed')

    // Check for cached analysis result
    const cachedResult = await getCachedAnalysisResult(fileId, rulesChecksum)
    if (cachedResult) {
      console.log('Using cached analysis result')
      return NextResponse.json({
        message: 'Analysis completed successfully (cached)',
        analysisId: cachedResult.id,
        summary: {
          totalIssues: cachedResult.total_issues,
          highSeverity: cachedResult.high_severity_issues,
          mediumSeverity: cachedResult.medium_severity_issues,
          lowSeverity: cachedResult.low_severity_issues,
          score: cachedResult.compliance_score
        },
        issues: cachedResult.issues,
        rulesApplied: cachedResult.rules_applied,
        analysisTime: cachedResult.analysis_time_ms
      })
    }

    console.log('🔍 Step 4: Performing Claude analysis...')
    console.log('📝 Content length:', results.extracted_text?.length || 0)
    
    let analysisResult
    try {
      // Perform Claude analysis
      analysisResult = brandFileId ? 
        await claudeAnalysisService.analyzeContent({
          content: results.extracted_text,
          fileName: file.original_filename,
          fileType: file.file_type,
          extractedColors: results.colors || undefined,
          extractedImages: results.extracted_images || undefined,
          brandGuidelines: brandGuidelinesContent
        }) :
        await claudeAnalysisService.analyzeContent({
          content: results.extracted_text,
          fileName: file.original_filename,
          fileType: file.file_type,
          extractedColors: results.colors || undefined,
          extractedImages: results.extracted_images || undefined,
          rules: JSON.parse(brandGuidelinesContent)
        })
      
      console.log('✅ Step 4: Claude analysis completed:', {
        totalIssues: analysisResult.summary.totalIssues,
        score: analysisResult.summary.score,
        highSeverity: analysisResult.summary.highSeverity,
        mediumSeverity: analysisResult.summary.mediumSeverity,
        lowSeverity: analysisResult.summary.lowSeverity
      })
    } catch (claudeError) {
      console.error('❌ Step 4: Claude analysis failed:', claudeError)
      return NextResponse.json({ 
        error: 'Claude analysis failed',
        details: claudeError instanceof Error ? claudeError.message : 'Unknown Claude error'
      }, { status: 500 })
    }

    // Save analysis results to database
    console.log('🔍 Step 5: Saving analysis results to database...')
    let savedAnalysis
    try {
      savedAnalysis = await saveBrandAnalysisResult({
        file_id: fileId,
        user_id: dbUser.id,
        total_issues: analysisResult.summary.totalIssues,
        high_severity_issues: analysisResult.summary.highSeverity,
        medium_severity_issues: analysisResult.summary.mediumSeverity,
        low_severity_issues: analysisResult.summary.lowSeverity,
        compliance_score: analysisResult.summary.score,
        issues: analysisResult.issues,
        analysis_time_ms: analysisResult.metadata.analysisTime,
        content_length: analysisResult.metadata.contentLength,
        rules_applied: analysisResult.metadata.rulesApplied,
        rules_snapshot: brandFileId ? 
          { brandGuidelinesFile: brandFileId, content: brandGuidelinesContent } as Record<string, unknown> :
          JSON.parse(brandGuidelinesContent) as Record<string, unknown>,
        rules_checksum: rulesChecksum
      })

      if (!savedAnalysis) {
        throw new Error('Failed to save analysis results - no data returned')
      }
      console.log('✅ Step 5: Analysis results saved with ID:', savedAnalysis.id)
    } catch (saveError) {
      console.error('❌ Step 5: Failed to save analysis results:', saveError)
      return NextResponse.json({ 
        error: 'Failed to save analysis results to database',
        details: saveError instanceof Error ? saveError.message : 'Unknown database error'
      }, { status: 500 })
    }

    // Save individual issues
    console.log('🔍 Step 6: Saving individual issues...')
    try {
      const issuesData = analysisResult.issues.map(issue => ({
        issue_type: issue.type,
        severity: issue.severity,
        message: issue.message,
        rule_violated: issue.ruleViolated,
        location_context: issue.location?.context,
        line_number: issue.location?.line,
        position_number: issue.location?.position,
        suggestion: issue.suggestion
      }))

      const issuesSaved = await saveAnalysisIssues(savedAnalysis.id, issuesData)
      if (issuesSaved) {
        console.log(`✅ Step 6: Saved ${issuesData.length} analysis issues`)
      } else {
        console.log('⚠️ Step 6: Failed to save some analysis issues')
      }
    } catch (issuesError) {
      console.error('❌ Step 6: Error saving issues:', issuesError)
      // Don't fail the whole analysis if issues saving fails
      console.log('⚠️ Step 6: Continuing without saving issues')
    }

    // Send email notification if user has email notifications enabled
    if ((dbUser as any).email_notifications) {
      try {
        const activeFolder = await getActiveDriveFolder()
        const downloadUrl = await generateFileDownloadUrl(fileId)
        
        await emailService.sendAnalysisResults({
          fileName: file.original_filename,
          fileId: fileId,
          userEmail: dbUser.email,
          userName: dbUser.email.split('@')[0], // Use email prefix as name
          complianceScore: analysisResult.summary.score,
          totalIssues: analysisResult.summary.totalIssues,
          highSeverityIssues: analysisResult.summary.highSeverity,
          mediumSeverityIssues: analysisResult.summary.mediumSeverity,
          lowSeverityIssues: analysisResult.summary.lowSeverity,
          issues: analysisResult.issues,
          guidelineFolderName: activeFolder?.name || 'Brand Guidelines',
          downloadUrl: downloadUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
          analysisDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        })
        console.log(`Analysis results email sent to ${dbUser.email}`)
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
        // Don't fail the analysis if email fails
      }
    }

    return NextResponse.json({
      message: 'Analysis completed successfully',
      analysisId: savedAnalysis.id,
      summary: analysisResult.summary,
      issues: analysisResult.issues,
      rulesApplied: analysisResult.metadata.rulesApplied,
      analysisTime: analysisResult.metadata.analysisTime,
      emailSent: (dbUser as any).email_notifications
    })
  } catch (error) {
    console.error('❌ Unexpected analysis error:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Internal server error during analysis',
      message: error instanceof Error ? error.message : 'Analysis failed',
      details: 'Check server logs for more information'
    }, { status: 500 })
  }
}