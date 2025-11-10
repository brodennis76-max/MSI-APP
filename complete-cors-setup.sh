#!/bin/bash

# Complete CORS Setup Script
# Run this AFTER authenticating with: gcloud auth login

echo "🚀 Completing CORS Configuration Setup"
echo "======================================"

# Add Google Cloud SDK to PATH
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"

# Check if gsutil is available
if ! command -v gsutil &> /dev/null; then
    echo "❌ Error: gsutil not found. Make sure Google Cloud SDK is installed."
    echo "   Install with: brew install google-cloud-sdk"
    exit 1
fi

# Check if authenticated
ACTIVE_ACCOUNTS=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
if [ -z "$ACTIVE_ACCOUNTS" ]; then
    echo "❌ Error: Not authenticated with Google Cloud."
    echo ""
    echo "Please run the following command first:"
    echo "  export PATH=/opt/homebrew/share/google-cloud-sdk/bin:\"\$PATH\""
    echo "  gcloud auth login"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Authenticated as: $ACTIVE_ACCOUNTS"
echo ""

# Set project if not already set
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ -z "$CURRENT_PROJECT" ] || [ "$CURRENT_PROJECT" = "(unset)" ]; then
    echo "📝 Setting project to: msi-account-instructions"
    gcloud config set project msi-account-instructions
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to set project. Check your permissions."
        exit 1
    fi
else
    echo "✅ Using project: $CURRENT_PROJECT"
    if [ "$CURRENT_PROJECT" != "msi-account-instructions" ]; then
        echo "⚠️  Warning: Project is set to '$CURRENT_PROJECT', not 'msi-account-instructions'"
        read -p "Do you want to change it to msi-account-instructions? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            gcloud config set project msi-account-instructions
        fi
    fi
fi

echo ""

# Check if cors.json exists
if [ ! -f "cors.json" ]; then
    echo "❌ Error: cors.json file not found in current directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📄 CORS configuration file found: cors.json"
echo ""

# Display CORS configuration
echo "📋 CORS Configuration:"
cat cors.json
echo ""

# Apply CORS configuration
BUCKET="gs://msi-account-instructions.firebasestorage.app"
echo "📤 Applying CORS configuration to: $BUCKET"
echo ""

gsutil cors set cors.json $BUCKET

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ CORS configuration applied successfully!"
    echo ""
    echo "🔍 Verifying CORS configuration..."
    echo ""
    gsutil cors get $BUCKET
    echo ""
    echo "✅ Done! CORS configuration is now active."
    echo ""
    echo "📝 Next Steps:"
    echo "   1. Clear your browser cache"
    echo "   2. Test PDF generation with a QR code"
    echo "   3. Check browser console for any remaining CORS errors"
    echo ""
else
    echo ""
    echo "❌ Error: Failed to apply CORS configuration"
    echo ""
    echo "Possible issues:"
    echo "  - Check that you have Storage Admin permissions on the Firebase project"
    echo "  - Verify the bucket name is correct: msi-account-instructions.firebasestorage.app"
    echo "  - Check that cors.json is valid JSON"
    exit 1
fi

