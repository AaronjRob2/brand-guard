import { createHash } from 'crypto'

/**
 * Generates a stable, deterministic key for React list items
 * Uses a hierarchical fallback approach for maximum reliability
 */
export const stableIssueKey = (issue: {
  id?: string | number
  type?: string
  severity?: string
  message?: string
  ruleViolated?: string
}, index?: number): string => {
  // Primary: Use existing ID if available
  if (issue.id && (typeof issue.id === 'string' || typeof issue.id === 'number')) {
    return String(issue.id)
  }

  // Secondary: Generate hash from key issue properties
  const keyComponents = [
    issue.type || '',
    issue.severity || '', 
    issue.message || '',
    issue.ruleViolated || ''
  ].filter(Boolean)

  if (keyComponents.length > 0) {
    const contentHash = createHash('md5')
      .update(keyComponents.join('|'))
      .digest('hex')
      .substring(0, 8)
    
    return `issue-${contentHash}`
  }

  // Tertiary: Use index as absolute fallback (with warning in dev)
  if (typeof index === 'number') {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Using index as React key fallback - consider providing stable identifiers')
    }
    return `fallback-${index}`
  }

  // Last resort: Random key (should rarely happen)
  return `unknown-${Math.random().toString(36).substr(2, 8)}`
}

/**
 * Generic stable key generator for any object with potential ID field
 */
export const stableKey = (item: Record<string, unknown>, index?: number, prefix = 'item'): string => {
  // Try common ID field names
  const idFields = ['id', 'uuid', '_id', 'key', 'name']
  
  for (const field of idFields) {
    if (item[field] && (typeof item[field] === 'string' || typeof item[field] === 'number')) {
      return String(item[field])
    }
  }

  // Generate content-based hash
  const significantFields = Object.entries(item)
    .filter(([key, value]) => 
      key !== 'index' && 
      value !== null && 
      value !== undefined && 
      typeof value !== 'function'
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${String(value)}`)
    .slice(0, 5) // Limit to first 5 significant fields

  if (significantFields.length > 0) {
    const contentHash = createHash('md5')
      .update(significantFields.join('|'))
      .digest('hex')
      .substring(0, 8)
    
    return `${prefix}-${contentHash}`
  }

  // Fallback to index
  if (typeof index === 'number') {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ Using index as React key fallback for ${prefix}`)
    }
    return `${prefix}-${index}`
  }

  return `${prefix}-${Math.random().toString(36).substr(2, 8)}`
}

/**
 * Development-time duplicate key detector
 * Only active in development mode
 */
export const detectDuplicateKeys = (keys: string[], context = 'list'): void => {
  if (process.env.NODE_ENV !== 'development') return

  const keySet = new Set<string>()
  const duplicates = new Set<string>()

  for (const key of keys) {
    if (keySet.has(key)) {
      duplicates.add(key)
    } else {
      keySet.add(key)
    }
  }

  if (duplicates.size > 0) {
    console.error(`🚨 Duplicate React keys detected in ${context}:`, Array.from(duplicates))
    console.error('📝 This can cause rendering issues. Consider using more specific key generation.')
  }
}

/**
 * Validates that all keys in a list are unique and stable
 */
export const validateKeys = (items: unknown[], keyFn: (item: unknown, index: number) => string, context = 'list'): string[] => {
  const keys = items.map((item, index) => keyFn(item, index))
  
  if (process.env.NODE_ENV === 'development') {
    detectDuplicateKeys(keys, context)
    
    // Check for keys that might change between renders
    const unstablePatterns = [
      /^fallback-\d+$/,
      /^unknown-[a-z0-9]+$/,
      /^.*-\d+$/ // Generic index-based patterns
    ]
    
    const unstableKeys = keys.filter(key => 
      unstablePatterns.some(pattern => pattern.test(key))
    )
    
    if (unstableKeys.length > 0) {
      console.warn(`⚠️ Potentially unstable keys detected in ${context}:`, unstableKeys.slice(0, 5))
    }
  }

  return keys
}