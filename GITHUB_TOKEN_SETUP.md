# GitHub Token Setup Guide

This guide will help you set up a GitHub Personal Access Token so you can upload QR code images to GitHub.

## Step 1: Generate a GitHub Personal Access Token

1. **Go to GitHub Settings:**
   - Visit: https://github.com/settings/tokens
   - Or: Click your profile picture → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Generate New Token:**
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a name: `MSI App QR Code Upload`
   - Set expiration (optional): Choose how long the token should be valid

3. **Select Permissions:**
   - Check the `repo` checkbox (this gives full control of private repositories)
   - This permission is required to upload files to your repository

4. **Generate and Copy:**
   - Click "Generate token" at the bottom
   - **IMPORTANT:** Copy the token immediately - you won't be able to see it again!
   - It will look something like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 2: Configure the Token in Your App

### Option A: Set Token Directly in Config File (Easiest)

1. Open: `msi-expo/config/github-config.js`
2. Find line 18: `token: process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN_HERE',`
3. Replace `'YOUR_GITHUB_TOKEN_HERE'` with your actual token:
   ```javascript
   token: process.env.GITHUB_TOKEN || 'ghp_your_actual_token_here',
   ```
4. Save the file

### Option B: Use Environment Variable (More Secure)

1. Create a `.env` file in the `msi-expo` directory (if it doesn't exist)
2. Add this line:
   ```
   GITHUB_TOKEN=ghp_your_actual_token_here
   ```
3. Make sure `.env` is in your `.gitignore` file (so the token isn't committed)

## Step 3: Test the Upload

1. Restart your app/development server
2. Go to Add Account or Edit Account
3. Select a QR code image
4. Click "Upload to GitHub"
5. Check the console logs for any errors

## Troubleshooting

### Token Not Working?
- Make sure the token has `repo` permissions
- Check that the token hasn't expired
- Verify the token is correctly set (no extra spaces or quotes)
- Check the console logs for specific error messages

### Security Note
- Never commit your GitHub token to version control
- If you accidentally commit it, revoke the token immediately and generate a new one
- The `.gitignore` file should include `config/github-config.js` or use environment variables

## Need Help?

Check the console logs when uploading - they will show detailed information about what's happening:
- Token status
- Upload progress
- Any errors

