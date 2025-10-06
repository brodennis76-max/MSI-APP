#!/bin/bash

# MSI App GitHub Deployment Script
# Run this after creating a GitHub repository

echo "🚀 MSI App GitHub Deployment"
echo "=============================="

# Check if repository URL is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your GitHub repository URL"
    echo "Usage: ./deploy-to-github.sh https://github.com/YOUR_USERNAME/msi-app.git"
    exit 1
fi

REPO_URL=$1

echo "📁 Setting up remote repository..."
git remote add origin $REPO_URL

echo "🌿 Setting main branch..."
git branch -M main

echo "📤 Pushing to GitHub..."
git push -u origin main

echo "✅ Successfully pushed to GitHub!"
echo ""
echo "Next steps:"
echo "1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/"
echo "2. Click 'New app' → 'Host web app'"
echo "3. Connect your GitHub repository"
echo "4. Configure build settings:"
echo "   - Base directory: msi-expo"
echo "   - Build command: npm run build:amplify"
echo "   - Build output directory: dist"
echo ""
echo "Your app will be live in a few minutes! 🎉"
