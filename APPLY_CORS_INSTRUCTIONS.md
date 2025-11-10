# Apply CORS Configuration - Step by Step Instructions

## Quick Steps

1. **Open Terminal** and run these commands:

```bash
# Add Google Cloud SDK to PATH
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"

# Navigate to project directory
cd /Users/dennisellingburg/Documents/MSI/msi-expo

# Authenticate with Google Cloud (opens browser)
gcloud auth login

# Set your project
gcloud config set project msi-account-instructions

# Apply CORS configuration
./apply-cors.sh
```

## Detailed Instructions

### Step 1: Authenticate with Google Cloud

Run this command in your terminal:
```bash
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"
gcloud auth login
```

This will:
- Open your default web browser
- Ask you to sign in with your Google account
- Request permissions to access Google Cloud
- Show you a verification code

**Important**: Use the Google account that has access to your Firebase project (`msi-account-instructions`).

### Step 2: Set Your Project

After authentication, set your Firebase project:
```bash
gcloud config set project msi-account-instructions
```

### Step 3: Apply CORS Configuration

Run the automated script:
```bash
cd /Users/dennisellingburg/Documents/MSI/msi-expo
./apply-cors.sh
```

Or manually apply it:
```bash
gsutil cors set cors.json gs://msi-account-instructions.firebasestorage.app
```

### Step 4: Verify CORS Configuration

Check that it was applied correctly:
```bash
gsutil cors get gs://msi-account-instructions.firebasestorage.app
```

You should see output like:
```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
```

## Troubleshooting

### If authentication fails:
- Make sure you're using the correct Google account
- Check that you have permissions on the Firebase project
- Try running `gcloud auth login --no-launch-browser` and manually copy the URL

### If gsutil command not found:
- Make sure Google Cloud SDK is installed: `brew install google-cloud-sdk`
- Add to PATH: `export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"`

### If permission denied:
- Make sure you're authenticated: `gcloud auth list`
- Check your project: `gcloud config get-value project`
- Verify you have Storage Admin or Owner permissions on the Firebase project

## After Applying CORS

1. **Clear browser cache** (important!)
2. **Test PDF generation** with a QR code
3. **Check browser console** for any remaining CORS errors
4. **Verify QR codes load** correctly in the PDF

## What This Does

The CORS configuration allows your web app (hosted on AWS Amplify) to fetch images directly from Firebase Storage without CORS errors. This works together with the Firebase Storage SDK approach already implemented in the code.

