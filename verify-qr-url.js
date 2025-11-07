// Script to verify what file the qrUrl actually points to
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

async function verifyQRUrl() {
  try {
    console.log('🔍 Checking AAA Grocery QR code URL...\n');
    
    // Get AAA Grocery
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    const aaaClient = Array.from(clientsSnapshot.docs)
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .find(c => c.name && c.name.toLowerCase().includes('aaa'));
    
    if (!aaaClient) {
      console.log('❌ AAA Grocery not found');
      return;
    }
    
    console.log('✅ Found AAA Grocery');
    console.log(`   Name: ${aaaClient.name}`);
    console.log(`   ID: ${aaaClient.id}\n`);
    
    console.log('📸 QR Code Configuration:');
    console.log(`   qrUrl: ${aaaClient.qrUrl || '(not set)'}`);
    console.log(`   qrFileName: ${aaaClient.qrFileName || '(not set)'}`);
    console.log(`   qrPath: ${aaaClient.qrPath || '(not set)'}\n`);
    
    if (aaaClient.qrUrl) {
      console.log('🔗 Testing qrUrl...');
      console.log(`   Full URL: ${aaaClient.qrUrl}\n`);
      
      // Extract filename from URL
      const urlMatch = aaaClient.qrUrl.match(/qr-codes%2F([^?]+)/);
      if (urlMatch) {
        const decodedFilename = decodeURIComponent(urlMatch[1]);
        console.log(`   📄 Filename in URL: "${decodedFilename}"`);
        console.log(`   📄 qrFileName field: "${aaaClient.qrFileName || 'N/A'}"`);
        
        if (decodedFilename !== aaaClient.qrFileName) {
          console.log(`\n   ⚠️  MISMATCH! The qrUrl points to a different file than qrFileName!`);
          console.log(`   The PDF will use qrUrl (Priority 1), which points to: "${decodedFilename}"`);
          console.log(`   But qrFileName says it should be: "${aaaClient.qrFileName}"`);
        } else {
          console.log(`\n   ✅ Filenames match`);
        }
      }
      
      // Try to fetch the URL to see what we get
      try {
        const response = await fetch(aaaClient.qrUrl);
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          const contentLength = response.headers.get('content-length');
          console.log(`\n   ✅ URL is accessible`);
          console.log(`   Content-Type: ${contentType}`);
          console.log(`   Content-Length: ${contentLength} bytes`);
        } else {
          console.log(`\n   ❌ URL returned status: ${response.status}`);
        }
      } catch (error) {
        console.log(`\n   ❌ Error fetching URL: ${error.message}`);
      }
    }
    
    console.log('\n📋 PDF Loading Priority:');
    console.log('   1. qrUrl (if exists and valid) ← CURRENTLY USING THIS');
    console.log('   2. qrFileName → qr-codes/{qrFileName}');
    console.log('   3. qrPath → {qrPath}');
    console.log('   4. Default → qr-codes/1450 Scanner Program.png');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the verification
verifyQRUrl();

