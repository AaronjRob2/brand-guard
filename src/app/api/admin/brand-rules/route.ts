import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware'
import { brandRulesService } from '@/lib/brandRules'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const brandRules = await brandRulesService.aggregateBrandRules()

    return NextResponse.json({ 
      brandRules,
      summary: {
        grammarRules: brandRules.grammar.rules.length,
        bannedWords: brandRules.bannedWords.length,
        approvedColors: brandRules.approvedColors.length,
        imageRestrictions: brandRules.imageRestrictions.rules.length,
        additionalRules: brandRules.additionalRules.length,
        totalRules: (
          brandRules.grammar.rules.length +
          brandRules.bannedWords.length +
          brandRules.approvedColors.length +
          brandRules.imageRestrictions.rules.length +
          brandRules.additionalRules.length
        )
      }
    })
  } catch (error) {
    console.error('Error fetching brand rules:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch brand rules' 
    }, { status: 500 })
  }
}