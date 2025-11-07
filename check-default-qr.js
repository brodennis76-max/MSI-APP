// Script to check if default QR code exists in Firebase Storage
import { initializeApp } from 'firebase/app';
import { getStorage, ref, getDownloadURL, listAll } from 'firebase/storage';

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
const storage = getStorage(app);

async function checkDefaultQR() {
  try {
    console.log('🔍 Checking default QR code in Firebase Storage...\n');
    
    const defaultPath = 'qr-codes/1450 Scanner Program.png';
    console.log(`Checking path: ${defaultPath}`);
    console.log(`Full gs:// path: gs://msi-account-instructions.firebasestorage.app/${defaultPath}\n`);
    
    try {
      const defaultRef = ref(storage, defaultPath);
      const downloadURL = await getDownloadURL(defaultRef);
      console.log('✅ Default QR code EXISTS in Firebase Storage!');
      console.log(`   Download URL: ${downloadURL.substring(0, 80)}...`);
      
      // Try to fetch it
      const response = await fetch(downloadURL);
      if (response.ok) {
        console.log(`   ✅ File is accessible (${response.headers.get('content-length')} bytes)`);
      } else {
        console.log(`   ❌ File exists but not accessible (status: ${response.status})`);
      }
    } catch (error) {
      console.log('❌ Default QR code does NOT exist in Firebase Storage!');
      console.log(`   Error: ${error.message}`);
      console.log(`   Error code: ${error.code || 'unknown'}`);
      console.log(`\n💡 You need to upload the default QR code to Firebase Storage at:`);
      console.log(`   Path: ${defaultPath}`);
      console.log(`   Full path: gs://msi-account-instructions.firebasestorage.app/${defaultPath}`);
    }
    
    // List all files in qr-codes folder
    console.log(`\n📁 Listing all files in qr-codes folder...`);
    try {
      const qrCodesRef = ref(storage, 'qr-codes');
      const listResult = await listAll(qrCodesRef);
      
      console.log(`   Found ${listResult.items.length} files:`);
      listResult.items.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name}`);
      });
      
      if (listResult.items.length === 0) {
        console.log(`   ⚠️  No files found in qr-codes folder!`);
      }
    } catch (error) {
      console.log(`   ❌ Error listing files: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkDefaultQR();

