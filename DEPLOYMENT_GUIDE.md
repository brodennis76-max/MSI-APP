# MSI App Deployment Guide - AWS Amplify

## Quick Deployment Steps

### Option 1: AWS Amplify Console (Recommended)

1. **Create a GitHub Repository**
   - Go to [GitHub](https://github.com) and create a new repository called `msi-app`
   - After creating the repo, run these commands in your terminal:

```bash
cd /Users/dennisellingburg/Documents/MSI
git remote add origin https://github.com/YOUR_USERNAME/msi-app.git
git branch -M main
git push -u origin main
```

2. **Deploy to AWS Amplify Console**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"
   - Connect your GitHub repository
   - Select the `msi-app` repository
   - Configure build settings:
     - **Build command**: `npm run build:amplify`
     - **Base directory**: `msi-expo`
     - **Build output directory**: `dist`
   - The build settings should automatically detect your `amplify.yml` file

3. **Build Configuration** (amplify.yml is already set up)
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build:amplify
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .expo/**/*
```

### Option 2: Amplify CLI (Advanced)

If you prefer using the CLI:

1. **Configure AWS CLI first**:
```bash
# Install AWS CLI if not installed
brew install awscli

# Configure AWS credentials
aws configure
```

2. **Initialize Amplify**:
```bash
cd /Users/dennisellingburg/Documents/MSI
amplify init
```

3. **Add hosting**:
```bash
amplify add hosting
# Choose "Amazon CloudFront and S3"
```

4. **Deploy**:
```bash
amplify publish
```

## Important Notes

- **App Location**: Your main app is in the `msi-expo` folder
- **Build Command**: `npm run build:amplify` (already configured)
- **Output Directory**: `dist` (where the built files go)
- **Firebase**: Your app uses Firebase, which will work fine with Amplify hosting
- **Domain**: After deployment, you'll get a URL like `https://main.d1234567890.amplifyapp.com`

## Custom Domain (Optional)

After deployment, you can add a custom domain:
1. Go to your Amplify app in the AWS Console
2. Click "Domain management"
3. Add your custom domain (e.g., `msi-app.yourcompany.com`)
4. Follow the DNS configuration steps

## Environment Variables

If your app needs any environment variables, add them in:
- Amplify Console: App Settings → Environment variables
- Or in your build settings

## Troubleshooting

- **Build fails**: Check that all dependencies are in `package.json`
- **Firebase not working**: Ensure Firebase config is correct for web
- **Assets not loading**: Check that asset paths are relative

## Next Steps After Deployment

1. Test the deployed app thoroughly
2. Set up custom domain if needed
3. Configure any necessary environment variables
4. Set up monitoring and analytics
5. Share the URL with your employees

Your app should be accessible to your employees once deployed!
