#!/bin/bash

# Brand Guard Environment Setup Script
echo "🔧 Brand Guard Configuration Setup"
echo "=================================="
echo ""

# Create backup of existing .env.local
if [ -f .env.local ]; then
    cp .env.local .env.local.backup
    echo "📁 Backed up existing .env.local to .env.local.backup"
fi

# Function to prompt for input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " input
        if [ -z "$input" ]; then
            input="$default"
        fi
    else
        read -p "$prompt: " input
    fi
    
    echo "$input"
}

echo "📋 Please provide the following configuration values:"
echo ""

# Supabase Configuration
echo "🗄️  SUPABASE CONFIGURATION"
SUPABASE_URL=$(prompt_with_default "Supabase Project URL (https://xxx.supabase.co)" "")
SUPABASE_ANON_KEY=$(prompt_with_default "Supabase Anon Key (starts with eyJ)" "")
SUPABASE_SERVICE_KEY=$(prompt_with_default "Supabase Service Role Key" "")
echo ""

# Google OAuth Configuration
echo "🔐 GOOGLE OAUTH CONFIGURATION"
GOOGLE_CLIENT_ID=$(prompt_with_default "Google Client ID (.apps.googleusercontent.com)" "")
GOOGLE_CLIENT_SECRET=$(prompt_with_default "Google Client Secret (GOCSPX-)" "")
echo ""

# Anthropic Configuration
echo "🤖 ANTHROPIC AI CONFIGURATION"
ANTHROPIC_KEY=$(prompt_with_default "Anthropic API Key (sk-ant-)" "")
echo ""

# SendGrid Configuration (Optional)
echo "📧 SENDGRID CONFIGURATION (Optional - press Enter to skip)"
SENDGRID_KEY=$(prompt_with_default "SendGrid API Key (SG.)" "")
SENDGRID_EMAIL=$(prompt_with_default "SendGrid From Email" "noreply@danielbrian.com")
echo ""

# Write new .env.local file
cat > .env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY

# Google OAuth Configuration
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Anthropic AI Configuration
ANTHROPIC_API_KEY=$ANTHROPIC_KEY

# SendGrid Configuration
SENDGRID_API_KEY=$SENDGRID_KEY
SENDGRID_FROM_EMAIL=$SENDGRID_EMAIL
SENDGRID_FROM_NAME=Brand Guard

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo "✅ Configuration saved to .env.local!"
echo ""
echo "🔄 Next steps:"
echo "1. Restart your development server: npm run dev"
echo "2. Visit http://localhost:3000 to test the application"
echo "3. Follow the verification steps in CONFIGURATION-GUIDE.md"
echo ""
echo "📖 For detailed setup instructions, see:"
echo "   - CONFIGURATION-GUIDE.md (step-by-step service setup)"
echo "   - TEST-PLAN.md (comprehensive testing guide)"