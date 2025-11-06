// Test script to verify client data from Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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

async function testClientData() {
  try {
    console.log('🔄 Testing client data from Firebase...');
    
    // Get first few clients
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    const clients = [];
    
    clientsSnapshot.forEach((doc) => {
      clients.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📊 Found ${clients.length} clients`);
    
    // Test first 3 clients
    for (let i = 0; i < Math.min(3, clients.length); i++) {
      const client = clients[i];
      console.log(`\n🔍 Client ${i + 1}: ${client.name}`);
      console.log('  - inventoryType:', client.inventoryType);
      console.log('  - accountType:', client.accountType);
      console.log('  - PIC:', client.PIC);
      console.log('  - startTime:', client.startTime);
      console.log('  - storeStartTime:', client.storeStartTime);
      console.log('  - verification:', client.verification);
      console.log('  - updatedAt:', client.updatedAt);
      
      // Test what the PDF would show
      console.log('📄 PDF would show:');
      console.log('  - Inventory:', client.inventoryType || client.accountType || 'Not specified');
      console.log('  - PIC:', client.PIC || 'Not specified');
      console.log('  - Store Start Time:', client.startTime || client.storeStartTime || 'Not specified');
      console.log('  - Verification:', client.verification || 'Not specified');
    }
    
  } catch (error) {
    console.error('❌ Error testing client data:', error);
  }
}

// Run the test
testClientData();












