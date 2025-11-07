// Script to fix and update QR code URLs in Firebase Firestore
// Updates qrUrl fields to point to correct Firebase Storage download URLs
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCKueXOUYH3NWYSjYigAOW6Z7HnbU_0KfU",
  authDomain: "msi-account-instructions.firebaseapp.com",
  projectId: "msi-account-instructions",
  storageBucket: "msi-account-instructions.firebasestorage.app",
  messagingSenderId: "819064018045",
  appId: "1:819064018045:web:f4bb5014748f92aa760d14",
  measurementId: "G-0KR1VZ6LH1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

async function fixQRUrls() {
  try {
    console.log('🔧 Fixing QR code URLs in Firestore database...\n');
    
    // Get all clients
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    const clients = [];
    
    clientsSnapshot.forEach((doc) => {
      clients.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📊 Found ${clients.length} clients\n`);
    
    const clientsToUpdate = [];
    
    for (const client of clients) {
      // Check if it's a scan account
      const isScanAccount = client.inventoryType === 'scan' || 
                           (Array.isArray(client.inventoryTypes) && client.inventoryTypes.includes('scan'));
      
      if (!isScanAccount) continue;
      
      // If client has qrFileName, ensure qrUrl is set correctly
      if (client.qrFileName) {
        const storagePath = `qr-codes/${client.qrFileName}`;
        
        try {
          // Get the correct download URL from Firebase Storage
          const storageRef = ref(storage, storagePath);
          const downloadURL = await getDownloadURL(storageRef);
          
          // Check if qrUrl needs updating
          if (!client.qrUrl || client.qrUrl !== downloadURL) {
            console.log(`\n📄 ${client.name} (ID: ${client.id})`);
            console.log(`   qrFileName: ${client.qrFileName}`);
            console.log(`   Current qrUrl: ${client.qrUrl || '(not set)'}`);
            console.log(`   Updating to: ${downloadURL.substring(0, 80)}...`);
            
            clientsToUpdate.push({
              clientId: client.id,
              clientName: client.name,
              qrFileName: client.qrFileName,
              qrPath: `qr-codes/${client.qrFileName}`,
              qrUrl: downloadURL
            });
          }
        } catch (error) {
          console.log(`\n❌ ${client.name} (ID: ${client.id})`);
          console.log(`   qrFileName: ${client.qrFileName}`);
          console.log(`   Error: File does not exist in Firebase Storage!`);
          console.log(`   Path: ${storagePath}`);
          console.log(`   Error: ${error.message} (code: ${error.code})`);
        }
      }
    }
    
    if (clientsToUpdate.length === 0) {
      console.log(`\n✅ All QR code URLs are already correct!`);
      return;
    }
    
    console.log(`\n\n📊 Found ${clientsToUpdate.length} clients that need qrUrl updates`);
    
    // Update all clients
    console.log(`\n🔄 Updating qrUrl fields...`);
    let updatedCount = 0;
    
    for (const item of clientsToUpdate) {
      try {
        const clientRef = doc(db, 'clients', item.clientId);
        await updateDoc(clientRef, {
          qrUrl: item.qrUrl,
          qrPath: item.qrPath, // Also ensure qrPath is set correctly
          updatedAt: new Date()
        });
        console.log(`   ✅ Updated ${item.clientName}`);
        updatedCount++;
      } catch (error) {
        console.error(`   ❌ Failed to update ${item.clientName}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully updated ${updatedCount} of ${clientsToUpdate.length} clients`);
    
    // Also check if default QR code exists
    console.log(`\n🔍 Checking default QR code...`);
    const defaultPath = 'qr-codes/1450 Scanner Program.png';
    try {
      const defaultRef = ref(storage, defaultPath);
      const defaultURL = await getDownloadURL(defaultRef);
      console.log(`   ✅ Default QR code exists in Firebase Storage`);
      console.log(`   URL: ${defaultURL.substring(0, 80)}...`);
    } catch (error) {
      console.log(`   ⚠️  Default QR code does NOT exist in Firebase Storage!`);
      console.log(`   Path: ${defaultPath}`);
      console.log(`   Error: ${error.message} (code: ${error.code})`);
      console.log(`   💡 Make sure to upload the default QR code to Firebase Storage`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the fix
fixQRUrls();

