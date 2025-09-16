#!/bin/bash

# Brand Guard Deployment Script
echo "🚀 Starting Brand Guard deployment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

# Run linting
echo "🔍 Running linter..."
npm run lint

if [ $? -ne 0 ]; then
    echo "⚠️  Linting issues found. Consider fixing before deployment."
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Post-deployment checklist:"
    echo "  - Test login with @danielbrian.com email"
    echo "  - Verify file upload works"
    echo "  - Test Claude analysis"
    echo "  - Check admin dashboard"
    echo "  - Test email notifications"
    echo ""
    echo "🔗 Don't forget to update:"
    echo "  - Google OAuth redirect URLs"
    echo "  - Supabase Auth settings"
else
    echo "❌ Deployment failed. Check errors above."
    exit 1
fi