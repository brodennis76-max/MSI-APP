#!/bin/bash

# Script to apply CORS configuration to Firebase Storage bucket
# Run this script after authenticating with Google Cloud

echo "🚀 Applying CORS Configuration to Firebase Storage"
echo "=================================================="

# Add Google Cloud SDK to PATH
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"

# Check if gsutil is available
if ! command -v gsutil &> /dev/null; then
    echo "❌ Error: gsutil not found. Make sure Google Cloud SDK is installed."
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Error: Not authenticated with Google Cloud."
    echo ""
    echo "Please run the following command to authenticate:"
    echo "  gcloud auth login"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check if project is set
PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT" ] || [ "$PROJECT" = "(unset)" ]; then
    echo "⚠️  Warning: No project set. Setting project to msi-account-instructions..."
    gcloud config set project msi-account-instructions
    PROJECT="msi-account-instructions"
fi

echo "✅ Using project: $PROJECT"
echo ""

# Check if cors.json exists
if [ ! -f "cors.json" ]; then
    echo "❌ Error: cors.json file not found in current directory"
    exit 1
fi

echo "📄 CORS configuration file found: cors.json"
echo ""

# Apply CORS configuration
echo "📤 Applying CORS configuration to Firebase Storage bucket..."
BUCKET="gs://msi-account-instructions.firebasestorage.app"
gsutil cors set cors.json $BUCKET

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ CORS configuration applied successfully!"
    echo ""
    echo "🔍 Verifying CORS configuration..."
    gsutil cors get $BUCKET
    echo ""
    echo "✅ Done! CORS configuration is now active."
else
    echo ""
    echo "❌ Error: Failed to apply CORS configuration"
    exit 1
fi

