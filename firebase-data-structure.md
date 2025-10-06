# Firebase Firestore Data Structure

## Collections and Documents

### 1. `clients` Collection
```javascript
// Document ID: auto-generated or custom
{
  name: "49 WINE & LIQUOR",
  address: "123 Main St",
  phone: "555-0123",
  email: "contact@49wine.com",
  storeType: "Convenience", // Grocery, Convenience, Clothing, Hardware, Other
  inventoryType: "scan", // scan or count
  PIC: "Stores to be contacted via phone prior to counts to confirm inventory.",
  startTime: "",
  verification: "Audit trails will be provided, as requested, during the count, within reason (do not provide audit trails on the entire store.)",
  additionalNotes: "",
  preInventory: "",
  Inv_Proc: "",
  Audits: "",
  Inv_Flow: "",
  noncount: "",
  "Team-Instr": "",
  Prog_Rep: "",
  Finalize: "",
  Fin_Rep: "",
  Processing: "",
  active: true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 2. `stores` Collection
```javascript
// Document ID: auto-generated or custom
{
  name: "Store 1",
  address: "456 Oak Ave",
  manager: "John Smith",
  phone: "555-0456",
  active: true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 3. `divisions` Collection
```javascript
// Document ID: auto-generated or custom
{
  name: "AUTRY GREER & SONS, INC.",
  clientId: "client_doc_id", // Reference to client document
  manager: "Jane Doe",
  phone: "555-0789",
  active: true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Sample Data Setup

### Add sample clients:
```javascript
// In Firebase Console or via code
const clients = [
  { name: "49 WINE & LIQUOR" },
  { name: "RUSSELL S/M" },
  { name: "ALLEN'S SUPERMARKET" },
  { name: "DART COMMERCIAL SERVICES" }
];
```

### Add sample stores:
```javascript
const stores = [
  { name: "Store 1" },
  { name: "Store 2" },
  { name: "Store 3" },
  { name: "Store 4" }
];
```

### Add sample divisions:
```javascript
const divisions = [
  { name: "AUTRY GREER & SONS, INC.", clientId: "client_id_1" },
  { name: "FOOD GIANT SUPERMARKETS", clientId: "client_id_2" },
  { name: "HOUCHENS INDUSTRIAL, INC.", clientId: "client_id_1" },
  { name: "LIPSCOMB OIL COMPANY, INC", clientId: "client_id_3" }
];
```

## Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to all collections
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null; // Require authentication for writes
    }
  }
}
```

## Setup Instructions

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project
   - Enable Firestore Database

2. **Get Configuration**:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Click "Add app" > Web
   - Copy the config object

3. **Update firebase-config.js**:
   - Replace the placeholder values with your actual Firebase config

4. **Add Sample Data**:
   - Use Firebase Console to add documents to collections
   - Or use the Firebase Admin SDK to bulk import data

5. **Test the App**:
   - Replace the import in App.js to use the Firebase version
   - Test data loading and picker functionality

