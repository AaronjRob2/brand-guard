import { getBrandFiles, getCachedBrandRules, cacheBrandRules } from './database'
import { createHash } from 'crypto'

export interface BrandRules {
  grammar: {
    rules: string[]
    expectations: string
  }
  bannedWords: string[]
  approvedColors: string[]
  imageRestrictions: {
    rules: string[]
    allowedFormats: string[]
    sizeRequirements: string
  }
  voiceAndTone: {
    description: string
    examples: string[]
  }
  additionalRules: string[]
}

export interface ParsedBrandFile {
  filename: string
  type: 'grammar' | 'banned_words' | 'colors' | 'voice_tone' | 'image_guidelines' | 'other'
  content: string
  parsedData?: Record<string, unknown>
}

export class BrandRulesService {
  
  async aggregateBrandRules(): Promise<BrandRules> {
    const brandFiles = await getBrandFiles()
    
    // If no brand files found, return default rules for testing
    if (!brandFiles || brandFiles.length === 0) {
      console.log('⚠️ No brand files found, using default rules for testing')
      return this.getDefaultBrandRules()
    }
    
    // Create checksum of all brand files to check cache
    const filesChecksum = this.createFilesChecksum(brandFiles)
    
    // Try to get cached rules
    const cachedRules = await getCachedBrandRules(filesChecksum)
    if (cachedRules) {
      console.log('Using cached brand rules')
      return cachedRules
    }

    console.log('Parsing brand rules from files')
    const parsedFiles: ParsedBrandFile[] = []

    // Parse each brand file based on its name and content
    for (const file of brandFiles) {
      if (!file.content) continue

      const parsedFile: ParsedBrandFile = {
        filename: file.name,
        type: this.categorizeFile(file.name),
        content: file.content
      }

      // Parse specific file types
      switch (parsedFile.type) {
        case 'banned_words':
          parsedFile.parsedData = this.parseBannedWords(file.content)
          break
        case 'colors':
          parsedFile.parsedData = this.parseColors(file.content)
          break
        case 'grammar':
          parsedFile.parsedData = this.parseGrammarRules(file.content)
          break
        case 'voice_tone':
          parsedFile.parsedData = this.parseVoiceAndTone(file.content)
          break
        case 'image_guidelines':
          parsedFile.parsedData = this.parseImageGuidelines(file.content)
          break
      }

      parsedFiles.push(parsedFile)
    }

    // Aggregate rules from all files
    const rules = this.aggregateRules(parsedFiles)
    
    // Cache the aggregated rules
    await cacheBrandRules({
      checksum: filesChecksum,
      rules,
      total_rules: this.countRules(rules)
    })

    return rules
  }

  private getDefaultBrandRules(): BrandRules {
    return {
      grammar: {
        rules: [
          'Use active voice when possible',
          'Avoid overly complex sentences',
          'Check for spelling and grammar errors',
          'Use consistent terminology'
        ],
        expectations: 'Professional, clear, and engaging writing style'
      },
      bannedWords: [
        'very',
        'really',
        'actually',
        'literally',
        'obviously'
      ],
      approvedColors: [
        '#000000', // Black
        '#FFFFFF', // White  
        '#007BFF', // Blue
        '#28A745', // Green
        '#DC3545'  // Red
      ],
      imageRestrictions: {
        rules: [
          'Images should be high resolution',
          'Maintain consistent visual style',
          'Use approved color palette',
          'Include proper alt text'
        ],
        allowedFormats: ['jpg', 'png', 'svg'],
        sizeRequirements: 'Minimum 300dpi for print materials'
      },
      voiceAndTone: {
        description: 'Professional, friendly, and informative tone',
        examples: [
          'We help you achieve your goals',
          'Discover the possibilities',
          'Transform your business'
        ]
      },
      additionalRules: [
        'Always include a clear call-to-action',
        'Ensure content is accessible and inclusive',
        'Maintain brand consistency across all materials'
      ]
    }
  }

  private createFilesChecksum(files: Array<{ name: string; modified_time?: string | null; content?: string | null }>): string {
    const fileData = files
      .filter(f => f.content)
      .map(f => `${f.name}:${f.modified_time}:${f.content?.length || 0}`)
      .sort()
      .join('|')
    
    return createHash('md5').update(fileData).digest('hex')
  }

  private countRules(rules: BrandRules): number {
    return (
      rules.grammar.rules.length +
      rules.bannedWords.length +
      rules.approvedColors.length +
      rules.imageRestrictions.rules.length +
      rules.additionalRules.length +
      (rules.voiceAndTone.description ? 1 : 0)
    )
  }

  private categorizeFile(filename: string): ParsedBrandFile['type'] {
    const name = filename.toLowerCase()

    if (name.includes('banned') || name.includes('forbidden') || name.includes('avoid')) {
      return 'banned_words'
    }
    if (name.includes('color') || name.includes('palette') || name.includes('hex')) {
      return 'colors'
    }
    if (name.includes('grammar') || name.includes('style') || name.includes('writing')) {
      return 'grammar'
    }
    if (name.includes('voice') || name.includes('tone') || name.includes('brand')) {
      return 'voice_tone'
    }
    if (name.includes('image') || name.includes('photo') || name.includes('visual')) {
      return 'image_guidelines'
    }

    return 'other'
  }

  private parseBannedWords(content: string): string[] {
    // Handle different formats: line-separated, comma-separated, JSON
    try {
      // Try JSON first
      const jsonData = JSON.parse(content)
      if (Array.isArray(jsonData)) return jsonData
      if (jsonData.banned_words && Array.isArray(jsonData.banned_words)) {
        return jsonData.banned_words
      }
    } catch {
      // Not JSON, try other formats
    }

    // Try line-separated or comma-separated
    const words = content
      .split(/[\n,;]/)
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length > 0 && !word.startsWith('#') && !word.startsWith('//'))

    return words
  }

  private parseColors(content: string): string[] {
    try {
      // Try JSON first
      const jsonData = JSON.parse(content)
      if (Array.isArray(jsonData)) return jsonData
      if (jsonData.colors && Array.isArray(jsonData.colors)) {
        return jsonData.colors
      }
      if (jsonData.palette && Array.isArray(jsonData.palette)) {
        return jsonData.palette
      }
    } catch {
      // Not JSON, extract hex codes from text
    }

    // Extract hex color codes from text
    const hexRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/g
    const matches = content.match(hexRegex) || []
    return [...new Set(matches)] // Remove duplicates
  }

  private parseGrammarRules(content: string): { rules: string[], expectations: string } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    const rules: string[] = []
    let expectations = ''

    for (const line of lines) {
      if (line.startsWith('- ') || line.startsWith('• ') || line.match(/^\d+\./)) {
        rules.push(line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, ''))
      } else if (line.toLowerCase().includes('expectation') || line.toLowerCase().includes('overview')) {
        expectations = line
      } else if (!line.startsWith('#') && !line.startsWith('//')) {
        rules.push(line)
      }
    }

    return { rules, expectations: expectations || 'Follow professional writing standards' }
  }

  private parseVoiceAndTone(content: string): { description: string, examples: string[] } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    let description = ''
    const examples: string[] = []

    let inExamplesSection = false

    for (const line of lines) {
      if (line.toLowerCase().includes('example') || line.toLowerCase().includes('sample')) {
        inExamplesSection = true
        continue
      }

      if (inExamplesSection) {
        if (line.startsWith('- ') || line.startsWith('• ') || line.match(/^\d+\./)) {
          examples.push(line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, ''))
        } else if (line.length > 10) {
          examples.push(line)
        }
      } else {
        if (!line.startsWith('#') && !line.startsWith('//') && line.length > 10) {
          description += (description ? ' ' : '') + line
        }
      }
    }

    return {
      description: description || 'Maintain consistent brand voice and tone',
      examples
    }
  }

  private parseImageGuidelines(content: string): { rules: string[], allowedFormats: string[], sizeRequirements: string } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    const rules: string[] = []
    const allowedFormats: string[] = []
    let sizeRequirements = ''

    for (const line of lines) {
      if (line.toLowerCase().includes('format') && (line.includes('jpg') || line.includes('png') || line.includes('svg'))) {
        const formats = line.match(/\b(jpg|jpeg|png|gif|svg|webp)\b/gi) || []
        allowedFormats.push(...formats.map(f => f.toLowerCase()))
      } else if (line.toLowerCase().includes('size') || line.toLowerCase().includes('dimension')) {
        sizeRequirements = line
      } else if (line.startsWith('- ') || line.startsWith('• ') || line.match(/^\d+\./)) {
        rules.push(line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, ''))
      } else if (!line.startsWith('#') && !line.startsWith('//') && line.length > 10) {
        rules.push(line)
      }
    }

    return {
      rules,
      allowedFormats: allowedFormats.length > 0 ? [...new Set(allowedFormats)] : ['jpg', 'png', 'svg'],
      sizeRequirements: sizeRequirements || 'Follow standard web image guidelines'
    }
  }

  private aggregateRules(parsedFiles: ParsedBrandFile[]): BrandRules {
    const rules: BrandRules = {
      grammar: {
        rules: [],
        expectations: 'Follow professional writing standards'
      },
      bannedWords: [],
      approvedColors: [],
      imageRestrictions: {
        rules: [],
        allowedFormats: ['jpg', 'png', 'svg'],
        sizeRequirements: 'Follow standard web image guidelines'
      },
      voiceAndTone: {
        description: 'Maintain consistent brand voice and tone',
        examples: []
      },
      additionalRules: []
    }

    for (const file of parsedFiles) {
      switch (file.type) {
        case 'grammar':
          if (file.parsedData) {
            rules.grammar.rules.push(...file.parsedData.rules)
            if (file.parsedData.expectations) {
              rules.grammar.expectations = file.parsedData.expectations
            }
          }
          break
        case 'banned_words':
          if (file.parsedData) {
            rules.bannedWords.push(...file.parsedData)
          }
          break
        case 'colors':
          if (file.parsedData) {
            rules.approvedColors.push(...file.parsedData)
          }
          break
        case 'voice_tone':
          if (file.parsedData) {
            rules.voiceAndTone.description = file.parsedData.description
            rules.voiceAndTone.examples.push(...file.parsedData.examples)
          }
          break
        case 'image_guidelines':
          if (file.parsedData) {
            rules.imageRestrictions.rules.push(...file.parsedData.rules)
            rules.imageRestrictions.allowedFormats = file.parsedData.allowedFormats
            rules.imageRestrictions.sizeRequirements = file.parsedData.sizeRequirements
          }
          break
        case 'other':
          // Add as additional rules
          rules.additionalRules.push(`From ${file.filename}: ${file.content.substring(0, 200)}...`)
          break
      }
    }

    // Remove duplicates
    rules.grammar.rules = [...new Set(rules.grammar.rules)]
    rules.bannedWords = [...new Set(rules.bannedWords)]
    rules.approvedColors = [...new Set(rules.approvedColors)]
    rules.imageRestrictions.rules = [...new Set(rules.imageRestrictions.rules)]
    rules.voiceAndTone.examples = [...new Set(rules.voiceAndTone.examples)]
    rules.additionalRules = [...new Set(rules.additionalRules)]

    return rules
  }
}

export const brandRulesService = new BrandRulesService()