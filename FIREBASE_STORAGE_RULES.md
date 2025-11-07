# Firebase Storage Security Rules

To allow PNG file uploads to Firebase Storage, you need to configure the Storage security rules.

## Required Storage Rules

Go to Firebase Console > Storage > Rules and set the following rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow public read access to qr-codes folder
    match /qr-codes/{fileName} {
      allow read: if true;
      allow write: if true; // For development - restrict in production
    }
    
    // For production, use authenticated uploads:
    // match /qr-codes/{fileName} {
    //   allow read: if true;
    //   allow write: if request.auth != null;
    // }
  }
}
```

## Steps to Configure:

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: msi-account-instructions
3. **Navigate to Storage**: Click "Storage" in the left menu
4. **Click "Rules" tab**: At the top of the Storage page
5. **Paste the rules above**: Replace the existing rules
6. **Click "Publish"**: To save the rules

## Testing:

After setting the rules, try uploading a PNG file again. The upload should work.

## Common Issues:

- **Permission denied**: Check that the rules allow write access
- **Bucket not found**: Verify the storage bucket name in firebase-config.js
- **Network error**: Check your internet connection

