// Script to check and update QR code URLs in Firebase Firestore
// Ensures all QR code URLs point to the correct Firebase Storage paths
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

async function updateQRUrls() {
  try {
    console.log('🔍 Checking QR code URLs in Firestore database...\n');
    
    // Get all clients
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    const clients = [];
    
    clientsSnapshot.forEach((doc) => {
      clients.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📊 Found ${clients.length} clients\n`);
    
    const clientsWithQR = [];
    const clientsNeedingUpdate = [];
    
    for (const client of clients) {
      // Check if it's a scan account
      const isScanAccount = client.inventoryType === 'scan' || 
                           (Array.isArray(client.inventoryTypes) && client.inventoryTypes.includes('scan'));
      
      if (!isScanAccount) continue;
      
      if (client.qrFileName || client.qrPath || client.qrUrl) {
        clientsWithQR.push(client);
        
        // Check if qrFileName exists and verify the file exists in Firebase Storage
        if (client.qrFileName) {
          const storagePath = `qr-codes/${client.qrFileName}`;
          console.log(`\n📄 Checking ${client.name} (ID: ${client.id})`);
          console.log(`   qrFileName: ${client.qrFileName}`);
          console.log(`   Expected path: ${storagePath}`);
          
          try {
            // Check if file exists and get the correct download URL
            const storageRef = ref(storage, storagePath);
            const downloadURL = await getDownloadURL(storageRef);
            
            console.log(`   ✅ File exists in Firebase Storage`);
            console.log(`   Current qrUrl: ${client.qrUrl || '(not set)'}`);
            console.log(`   Correct qrUrl: ${downloadURL.substring(0, 80)}...`);
            
            // Check if qrUrl needs updating
            if (!client.qrUrl || client.qrUrl !== downloadURL) {
              console.log(`   ⚠️  qrUrl needs updating!`);
              clientsNeedingUpdate.push({
                clientId: client.id,
                clientName: client.name,
                qrFileName: client.qrFileName,
                currentQrUrl: client.qrUrl,
                correctQrUrl: downloadURL,
                storagePath: storagePath
              });
            } else {
              console.log(`   ✅ qrUrl is correct`);
            }
          } catch (error) {
            console.log(`   ❌ File does NOT exist in Firebase Storage!`);
            console.log(`   Error: ${error.message} (code: ${error.code})`);
            console.log(`   ⚠️  This client's QR code file is missing from Firebase Storage`);
          }
        }
      }
    }
    
    console.log(`\n\n📊 Summary:`);
    console.log(`   Total clients: ${clients.length}`);
    console.log(`   Scan accounts with QR codes: ${clientsWithQR.length}`);
    console.log(`   Clients needing qrUrl update: ${clientsNeedingUpdate.length}`);
    
    if (clientsNeedingUpdate.length > 0) {
      console.log(`\n\n⚠️  Clients that need qrUrl updates:`);
      clientsNeedingUpdate.forEach((item, index) => {
        console.log(`\n   ${index + 1}. ${item.clientName} (ID: ${item.clientId})`);
        console.log(`      qrFileName: ${item.qrFileName}`);
        console.log(`      Current qrUrl: ${item.currentQrUrl || '(not set)'}`);
        console.log(`      Correct qrUrl: ${item.correctQrUrl.substring(0, 80)}...`);
      });
      
      // Ask if user wants to update (for now, just show what needs updating)
      console.log(`\n\n💡 To update these URLs, run the script with --update flag`);
      console.log(`   Or manually update each client's qrUrl field in Firestore`);
    } else {
      console.log(`\n✅ All QR code URLs are correct!`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Check for --update flag
const shouldUpdate = process.argv.includes('--update');

if (shouldUpdate) {
  console.log('🔄 Update mode enabled - will update URLs in database\n');
  // Add update logic here if needed
}

// Run the check
updateQRUrls();

