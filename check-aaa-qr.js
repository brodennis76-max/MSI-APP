// Script to check what QR code PNG AAA Grocery is looking for
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

async function checkAAAQR() {
  try {
    console.log('🔍 Looking for AAA Grocery...\n');
    
    // Get all clients
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    const clients = [];
    
    clientsSnapshot.forEach((doc) => {
      clients.push({ id: doc.id, ...doc.data() });
    });
    
    // Find AAA Grocery (case-insensitive search)
    const aaaClient = clients.find(c => 
      c.name && c.name.toLowerCase().includes('aaa')
    );
    
    if (!aaaClient) {
      console.log('❌ AAA Grocery not found in clients');
      console.log('\n📋 Available clients:');
      clients.forEach(c => {
        console.log(`  - ${c.name} (ID: ${c.id})`);
      });
      return;
    }
    
    console.log('✅ Found AAA Grocery!');
    console.log(`   Client ID: ${aaaClient.id}`);
    console.log(`   Name: ${aaaClient.name}\n`);
    
    // Check QR code fields
    console.log('📸 QR Code Configuration:');
    console.log(`   qrFileName: ${aaaClient.qrFileName || '(not set)'}`);
    console.log(`   qrPath: ${aaaClient.qrPath || '(not set)'}`);
    console.log(`   qrUrl: ${aaaClient.qrUrl || '(not set)'}\n`);
    
    // Determine what the PDF would look for
    console.log('🔎 What the PDF is looking for:');
    
    if (aaaClient.qrFileName) {
      const expectedPath = `qr-codes/${aaaClient.qrFileName}`;
      console.log(`   ✅ Using qrFileName: "${aaaClient.qrFileName}"`);
      console.log(`   📁 Expected Firebase Storage path: "${expectedPath}"`);
      console.log(`   📁 Expected GitHub path: "${expectedPath}"`);
    } else if (aaaClient.qrPath) {
      if (aaaClient.qrPath.startsWith('qr-codes/')) {
        console.log(`   ✅ Using qrPath: "${aaaClient.qrPath}"`);
        console.log(`   📁 Expected Firebase Storage path: "${aaaClient.qrPath}"`);
        console.log(`   📁 Expected GitHub path: "${aaaClient.qrPath}"`);
      } else if (aaaClient.qrPath.startsWith('gs://') || aaaClient.qrPath.startsWith('https://firebasestorage')) {
        console.log(`   ✅ Using qrPath (Firebase URL): "${aaaClient.qrPath}"`);
      } else {
        console.log(`   ✅ Using qrPath (GitHub): "${aaaClient.qrPath}"`);
      }
    } else {
      const defaultPath = 'qr-codes/1450 Scanner Program.png';
      console.log(`   ⚠️  No QR code configured - using DEFAULT`);
      console.log(`   📁 Default Firebase Storage path: "${defaultPath}"`);
      console.log(`   📁 Default GitHub path: "${defaultPath}"`);
    }
    
  } catch (error) {
    console.error('❌ Error checking AAA Grocery:', error);
  }
}

// Run the check
checkAAAQR();

