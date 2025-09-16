import Anthropic from '@anthropic-ai/sdk'
import { BrandRules } from './brandRules'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface AnalysisIssue {
  type: 'grammar' | 'banned_word' | 'color_violation' | 'image_violation' | 'voice_tone' | 'other'
  severity: 'high' | 'medium' | 'low'
  message: string
  location?: {
    line?: number
    position?: number
    context?: string
  }
  suggestion?: string
  ruleViolated: string
}

export interface AnalysisResult {
  issues: AnalysisIssue[]
  summary: {
    totalIssues: number
    highSeverity: number
    mediumSeverity: number
    lowSeverity: number
    score: number // 0-100, 100 being perfect compliance
  }
  metadata: {
    analysisTime: number
    contentLength: number
    rulesApplied: number
  }
}

export interface AnalysisRequest {
  content: string
  fileName: string
  fileType: string
  extractedColors?: string[]
  extractedImages?: string[]
  rules?: BrandRules
  brandGuidelines?: string // Raw brand guidelines content from file
}

export class ClaudeAnalysisService {
  private analysisCache = new Map<string, { result: AnalysisResult; timestamp: number }>()
  private readonly CACHE_DURATION = 1000 * 60 * 60 * 24 // 24 hours
  
  async analyzeContent(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now()
    
    // Generate cache key based on content and rules
    const cacheKey = this.generateCacheKey(request)
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey)
    if (cached) {
      console.log('Using cached analysis result')
      return cached
    }
    
    try {
      const prompt = this.buildAnalysisPrompt(request)
      
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1, // Low temperature for consistent analysis
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
      
      const analysisTime = Date.now() - startTime
      
      // Parse Claude's response
      const responseText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : ''

      let issues: AnalysisIssue[] = []
      
      try {
        // Parse the JSON response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          issues = JSON.parse(jsonMatch[0])
        } else {
          console.warn('No JSON array found in Claude response:', responseText)
        }
      } catch (parseError) {
        console.warn('Failed to parse Claude response as JSON:', responseText, parseError)
      }

      const result: AnalysisResult = {
        issues,
        summary: this.generateSummary(issues),
        metadata: {
          analysisTime,
          contentLength: request.content.length,
          rulesApplied: this.countRules(request)
        }
      }

      // Cache the result
      this.setCachedResult(cacheKey, result)
      
      return result
    } catch (error) {
      console.error('Claude analysis error:', error)
      throw new Error('Failed to analyze content with Claude')
    }
  }

  private buildAnalysisPrompt(request: AnalysisRequest): string {
    const { content, fileName, fileType, extractedColors, extractedImages, rules, brandGuidelines } = request
    
    const basePrompt = `You are a professional brand proofreader. Your job is to flag rule violations in content, NOT to suggest edits. 

IMPORTANT: Respond ONLY with a valid JSON array of issues. Do not include any other text, explanations, or formatting.

**CONTENT TO ANALYZE:**
File: ${fileName} (${fileType})
Content: """
${content}
"""

${extractedColors && extractedColors.length > 0 ? `
**EXTRACTED COLORS FROM CONTENT:**
${extractedColors.join(', ')}
` : ''}

${extractedImages && extractedImages.length > 0 ? `
**EXTRACTED IMAGES:**
${extractedImages.join(', ')}
` : ''}`

    // Use either structured rules or raw brand guidelines
    const rulesSection = brandGuidelines ? 
      `

**BRAND GUIDELINES TO ENFORCE:**

${brandGuidelines}

**ANALYSIS INSTRUCTIONS:**
1. Analyze the content against the brand guidelines provided above
2. Flag any violations or areas of non-compliance
3. Assign severity: "high" (major brand violations), "medium" (style issues), "low" (minor concerns)
4. Include location context when possible
5. Reference the specific guideline or rule violated` :
      `

**BRAND RULES TO ENFORCE:**

**Grammar & Writing Rules:**
Expectations: ${rules?.grammar?.expectations || 'No grammar expectations specified'}
${rules?.grammar?.rules?.length ? `
Rules:
${rules.grammar.rules.map(rule => `- ${rule}`).join('\n')}
` : ''}

**Banned Words:**
${rules?.bannedWords?.length ? 
  `The following words/phrases are prohibited: ${rules.bannedWords.join(', ')}` : 
  'No banned words specified'}

**Approved Colors:**
${rules?.approvedColors?.length ? 
  `Only these hex colors are approved: ${rules.approvedColors.join(', ')}` : 
  'No color restrictions specified'}

**Image Restrictions:**
${rules?.imageRestrictions?.rules?.length ? `
Rules:
${rules.imageRestrictions.rules.map(rule => `- ${rule}`).join('\n')}
Allowed formats: ${rules.imageRestrictions.allowedFormats?.join(', ') || 'Not specified'}
Size requirements: ${rules.imageRestrictions.sizeRequirements || 'Not specified'}
` : 'No image restrictions specified'}

**Voice & Tone Guidelines:**
${rules?.voiceAndTone?.description || 'No voice and tone guidelines specified'}
${rules?.voiceAndTone?.examples?.length ? `
Examples:
${rules.voiceAndTone.examples.map(example => `- ${example}`).join('\n')}
` : ''}

${rules?.additionalRules?.length ? `
**Additional Rules:**
${rules.additionalRules.map(rule => `- ${rule}`).join('\n')}
` : ''}

**ANALYSIS INSTRUCTIONS:**
1. Check content against ALL provided rules
2. Flag violations with specific details
3. Assign severity: "high" (major brand violations), "medium" (style issues), "low" (minor concerns)
4. Include location context when possible
5. Reference the specific rule violated`

    return basePrompt + rulesSection + `

**REQUIRED JSON FORMAT:**
[
  {
    "type": "grammar|banned_word|color_violation|image_violation|voice_tone|other",
    "severity": "high|medium|low",
    "message": "Clear description of the violation",
    "location": {
      "context": "Surrounding text where violation occurs"
    },
    "suggestion": "Optional: How to fix the violation",
    "ruleViolated": "The specific rule or guideline that was violated"
  }
]

Return empty array [] if no violations found.`
  }

  private generateSummary(issues: AnalysisIssue[]) {
    const highSeverity = issues.filter(i => i.severity === 'high').length
    const mediumSeverity = issues.filter(i => i.severity === 'medium').length
    const lowSeverity = issues.filter(i => i.severity === 'low').length
    
    // Calculate compliance score based on issue severity
    const totalIssues = issues.length
    const score = totalIssues === 0 ? 100 : Math.max(0, 100 - (highSeverity * 10 + mediumSeverity * 5 + lowSeverity * 2))
    
    return {
      totalIssues,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      score: Math.round(score)
    }
  }

  private countRules(request: AnalysisRequest): number {
    if (request.brandGuidelines) {
      return 1 // Brand guidelines file content
    }
    
    if (!request.rules) return 0
    
    const rules = request.rules
    return (
      (rules.grammar?.rules?.length || 0) +
      (rules.bannedWords?.length || 0) +
      (rules.approvedColors?.length || 0) +
      (rules.imageRestrictions?.rules?.length || 0) +
      (rules.voiceAndTone?.examples?.length || 0) +
      (rules.additionalRules?.length || 0)
    )
  }

  private generateCacheKey(request: AnalysisRequest): string {
    const rulesKey = request.brandGuidelines || JSON.stringify(request.rules || {})
    return `${request.content.length}-${rulesKey.length}-${Date.now().toString().slice(-6)}`
  }

  private getCachedResult(key: string): AnalysisResult | null {
    const cached = this.analysisCache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result
    }
    this.analysisCache.delete(key)
    return null
  }

  private setCachedResult(key: string, result: AnalysisResult): void {
    this.analysisCache.set(key, {
      result,
      timestamp: Date.now()
    })
  }
}

export const claudeAnalysisService = new ClaudeAnalysisService()