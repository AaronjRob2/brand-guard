import { createClient } from '@supabase/supabase-js'

// Service role client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Regular client for client-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface DriveToken {
  id: string
  user_id: string
  provider: string
  access_token: string
  refresh_token?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export class DriveTokenService {
  // Save or update drive tokens for a user (server-side with service role)
  static async saveTokens(
    userId: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: Date,
    provider: string = 'google'
  ): Promise<DriveToken | null> {
    const { data, error } = await supabaseAdmin
      .from('drive_tokens')
      .upsert({
        user_id: userId,
        provider,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt?.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving drive tokens:', error)
      return null
    }

    return data
  }

  // Get drive tokens for a user (server-side with service role)
  static async getTokens(
    userId: string,
    provider: string = 'google'
  ): Promise<DriveToken | null> {
    const { data, error } = await supabaseAdmin
      .from('drive_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single()

    if (error) {
      console.error('Error getting drive tokens:', error)
      return null
    }

    return data
  }

  // Update specific token fields (server-side)
  static async updateTokens(
    userId: string,
    updates: Partial<Pick<DriveToken, 'access_token' | 'refresh_token' | 'expires_at'>>,
    provider: string = 'google'
  ): Promise<DriveToken | null> {
    const { data, error } = await supabaseAdmin
      .from('drive_tokens')
      .update(updates)
      .eq('user_id', userId)
      .eq('provider', provider)
      .select()
      .single()

    if (error) {
      console.error('Error updating drive tokens:', error)
      return null
    }

    return data
  }

  // Delete drive tokens for a user (server-side)
  static async deleteTokens(
    userId: string,
    provider: string = 'google'
  ): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('drive_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider)

    if (error) {
      console.error('Error deleting drive tokens:', error)
      return false
    }

    return true
  }

  // Check if tokens exist and are not expired (client-side)
  static async hasValidTokens(provider: string = 'google'): Promise<boolean> {
    const { data, error } = await supabase
      .from('drive_tokens')
      .select('expires_at')
      .eq('provider', provider)
      .single()

    if (error || !data) {
      return false
    }

    // If no expiry set, assume valid
    if (!data.expires_at) {
      return true
    }

    // Check if token is not expired
    const expiryDate = new Date(data.expires_at)
    const now = new Date()
    return expiryDate > now
  }

  // Get current user's tokens (client-side, uses RLS)
  static async getCurrentUserTokens(provider: string = 'google'): Promise<DriveToken | null> {
    const { data, error } = await supabase
      .from('drive_tokens')
      .select('*')
      .eq('provider', provider)
      .single()

    if (error) {
      console.error('Error getting current user tokens:', error)
      return null
    }

    return data
  }
}

// Example usage functions
export const driveTokenExamples = {
  // Example: Save tokens after OAuth callback
  async saveOAuthTokens(userId: string, oauthResponse: any) {
    const expiresAt = oauthResponse.expires_in 
      ? new Date(Date.now() + oauthResponse.expires_in * 1000)
      : undefined

    return await DriveTokenService.saveTokens(
      userId,
      oauthResponse.access_token,
      oauthResponse.refresh_token,
      expiresAt,
      'google'
    )
  },

  // Example: Get tokens for API calls
  async getTokensForApiCall(userId: string) {
    const tokens = await DriveTokenService.getTokens(userId, 'google')
    
    if (!tokens) {
      throw new Error('No drive tokens found')
    }

    // Check if expired
    if (tokens.expires_at) {
      const expiryDate = new Date(tokens.expires_at)
      const now = new Date()
      
      if (expiryDate <= now) {
        throw new Error('Drive tokens expired')
      }
    }

    return tokens
  },

  // Example: Refresh expired tokens
  async refreshTokens(userId: string) {
    const tokens = await DriveTokenService.getTokens(userId, 'google')
    
    if (!tokens?.refresh_token) {
      throw new Error('No refresh token available')
    }

    // Here you would call Google's token refresh endpoint
    // const newTokens = await refreshGoogleTokens(tokens.refresh_token)
    
    // Then update the stored tokens
    // return await DriveTokenService.updateTokens(userId, {
    //   access_token: newTokens.access_token,
    //   expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
    // })
  }
}