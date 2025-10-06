# Firebase Setup Guide

## Step 1: Get Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your existing project
3. Click the gear icon ⚙️ > Project Settings
4. Scroll down to "Your apps" section
5. If you don't have a web app yet:
   - Click "Add app" > Web (</>) icon
   - Give it a name like "msi-expo"
   - Click "Register app"
6. Copy the `firebaseConfig` object

## Step 2: Update firebase-config.js

Replace the placeholder values in `firebase-config.js` with your actual config:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...", // Your actual API key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

## Step 3: Enable Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location (choose closest to your users)

## Step 4: Add Sample Data

### Option A: Using Firebase Console (Easiest)

1. Go to Firestore Database
2. Click "Start collection"
3. Create these collections with sample documents:

**Collection: `clients`**
- Document ID: `client1`
- Fields: `name` (string): "49 WINE & LIQUOR"

**Collection: `stores`**
- Document ID: `store1`  
- Fields: `name` (string): "Store 1"

**Collection: `divisions`**
- Document ID: `div1`
- Fields: `name` (string): "AUTRY GREER & SONS, INC.", `clientId` (string): "client1"

### Option B: Using Code (Advanced)

Create a file `add-sample-data.js` and run it:

```javascript
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase-config.js';

const addSampleData = async () => {
  // Add clients
  const clients = [
    { name: "49 WINE & LIQUOR" },
    { name: "RUSSELL S/M" },
    { name: "ALLEN'S SUPERMARKET" }
  ];
  
  for (const client of clients) {
    await addDoc(collection(db, 'clients'), client);
  }
  
  // Add stores
  const stores = [
    { name: "Store 1" },
    { name: "Store 2" },
    { name: "Store 3" }
  ];
  
  for (const store of stores) {
    await addDoc(collection(db, 'stores'), store);
  }
};
```

## Step 5: Test the Integration

1. Update `App.js` to use the Firebase version:
```javascript
import AccInstPicker from './components/AccInstPickerFirebase';
```

2. Start your Expo app:
```bash
npx expo start
```

3. Navigate to Account Instructions and test the pickers

## Troubleshooting

- **"Firebase not initialized"**: Check your config values
- **"Permission denied"**: Check Firestore security rules
- **"No data showing"**: Verify collections exist and have documents
- **"Network error"**: Check internet connection and Firebase project status

## Security Rules (for production)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true; // Allow public read for now
      allow write: if request.auth != null; // Require auth for writes
    }
  }
}
```

