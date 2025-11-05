// Script to add missing required fields to existing clients in Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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

async function addMissingFieldsToClients() {
  try {
    console.log('🔄 Fetching all clients from Firebase...');
    
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    const clients = [];
    
    clientsSnapshot.forEach((doc) => {
      clients.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📊 Found ${clients.length} clients`);
    
    let updatedCount = 0;
    
    for (const client of clients) {
      const updates = {};
      let needsUpdate = false;
      
      // Check and add missing fields
      if (!client.inventoryType) {
        updates.inventoryType = 'scan';
        needsUpdate = true;
        console.log(`  - Adding inventoryType to ${client.name}`);
      }
      
      if (!client.accountType) {
        updates.accountType = 'Convenience';
        needsUpdate = true;
        console.log(`  - Adding accountType to ${client.name}`);
      }
      
      if (!client.PIC) {
        updates.PIC = 'Stores to be contacted via phone prior to counts to confirm inventory.';
        needsUpdate = true;
        console.log(`  - Adding PIC to ${client.name}`);
      }
      
      if (!client.startTime) {
        updates.startTime = '8:00 AM';
        needsUpdate = true;
        console.log(`  - Adding startTime to ${client.name}`);
      }
      
      if (!client.storeStartTime) {
        updates.storeStartTime = '8:00 AM';
        needsUpdate = true;
        console.log(`  - Adding storeStartTime to ${client.name}`);
      }
      
      if (!client.verification) {
        updates.verification = 'Audit trails will be provided, as requested, during the count, within reason (do not provide audit trails on the entire store.)';
        needsUpdate = true;
        console.log(`  - Adding verification to ${client.name}`);
      }
      
      if (!client.updatedAt) {
        updates.updatedAt = new Date();
        needsUpdate = true;
        console.log(`  - Adding updatedAt to ${client.name}`);
      }

      // Ensure inventoryTypes array exists (non-destructive)
      if (!Array.isArray(client.inventoryTypes)) {
        updates.inventoryTypes = client.inventoryType ? [client.inventoryType] : [];
        needsUpdate = true;
        console.log(`  - Initializing inventoryTypes array for ${client.name}`);
      }

      // Add placeholder for scanner QR Code if missing
      if (client.scannerQRCode === undefined) {
        updates.scannerQRCode = '';
        needsUpdate = true;
        console.log(`  - Adding scannerQRCode placeholder to ${client.name}`);
      }
      
      if (needsUpdate) {
        await updateDoc(doc(db, 'clients', client.id), updates);
        updatedCount++;
        console.log(`✅ Updated ${client.name}`);
      } else {
        console.log(`ℹ️  ${client.name} already has all required fields`);
      }
    }
    
    console.log(`\n🎉 Update complete! Updated ${updatedCount} out of ${clients.length} clients`);
    
  } catch (error) {
    console.error('❌ Error updating clients:', error);
  }
}

// Run the script
addMissingFieldsToClients();
