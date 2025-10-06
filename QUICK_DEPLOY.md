# Quick Deployment Commands

After creating your GitHub repository, run these commands:

```bash
# Add your GitHub repository (replace with your actual URL)
git remote add origin https://github.com/YOUR_USERNAME/msi-app.git

# Push to GitHub
git push -u origin main
```

Then go to AWS Amplify Console:
1. Visit: https://console.aws.amazon.com/amplify/
2. Click "New app" → "Host web app"
3. Choose "GitHub" and authorize
4. Select your "msi-app" repository
5. Configure build settings:
   - Base directory: `msi-expo`
   - Build command: `npm run build:amplify`
   - Build output directory: `dist`
6. Click "Save and deploy"

Your app will be live in 5-10 minutes at a URL like:
https://main.d1234567890.amplifyapp.com

Share this URL with Sari and your employees!
