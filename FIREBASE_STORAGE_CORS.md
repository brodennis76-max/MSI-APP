# Firebase Storage CORS Configuration

## Problem

When fetching images from Firebase Storage using direct `fetch()` calls from a web app hosted on a different domain (e.g., AWS Amplify), you may encounter CORS errors:

```
Access to fetch at 'https://firebasestorage.googleapis.com/...' from origin 'https://your-domain.com' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution

The code has been updated to use Firebase Storage SDK's `getBytes()` method instead of direct `fetch()` calls. This bypasses CORS issues because the SDK handles authentication and CORS automatically.

However, if you still need to configure CORS on the Firebase Storage bucket (for direct fetch calls or other use cases), follow the steps below.

## Configure CORS on Firebase Storage Bucket

Firebase Storage uses Google Cloud Storage under the hood. To configure CORS, you need to use the `gsutil` command-line tool.

### Prerequisites

1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Authenticate with your Google account:
   ```bash
   gcloud auth login
   ```
3. Set your project:
   ```bash
   gcloud config set project msi-account-instructions
   ```

### Create CORS Configuration File

Create a file named `cors.json` in your project root:

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

**For production**, restrict origins to your specific domain(s):

```json
[
  {
    "origin": [
      "https://main.d18c7953c9fiwh.amplifyapp.com",
      "https://your-custom-domain.com"
    ],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
```

### Apply CORS Configuration

Apply the CORS configuration to your Firebase Storage bucket:

```bash
gsutil cors set cors.json gs://msi-account-instructions.firebasestorage.app
```

### Verify CORS Configuration

Check the current CORS configuration:

```bash
gsutil cors get gs://msi-account-instructions.firebasestorage.app
```

### Remove CORS Configuration

If you need to remove CORS configuration:

```bash
gsutil cors set [] gs://msi-account-instructions.firebasestorage.app
```

## Alternative: Use Firebase Storage SDK

The recommended approach is to use Firebase Storage SDK methods instead of direct fetch:

- Use `getBytes()` to fetch file contents
- Use `getDownloadURL()` to get a download URL (but still use SDK to fetch if CORS is an issue)

The code has been updated to automatically detect Firebase Storage URLs and use the SDK instead of direct fetch, which should resolve CORS issues automatically.

## Testing

After configuring CORS or updating the code:

1. Clear your browser cache
2. Try loading a QR code image again
3. Check the browser console for any CORS errors
4. Verify that images load correctly in the PDF

## Troubleshooting

- **Still getting CORS errors**: Make sure you've restarted your dev server and cleared browser cache
- **gsutil command not found**: Install Google Cloud SDK
- **Permission denied**: Make sure you're authenticated with `gcloud auth login` and have permissions on the project
- **Bucket not found**: Verify the bucket name matches your Firebase Storage bucket

