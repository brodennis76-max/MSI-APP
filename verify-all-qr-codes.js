// Script to verify all clients have proper QR code configuration
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function verifyAllQRCodes() {
  try {
    console.log('🔍 Checking all clients for QR code configuration...\n');
    
    // Get all clients
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    const clients = [];
    
    clientsSnapshot.forEach((doc) => {
      clients.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📊 Found ${clients.length} clients\n`);
    
    const clientsWithQR = [];
    const clientsWithoutQR = [];
    const clientsWithIssues = [];
    
    clients.forEach(client => {
      const hasQrUrl = client.qrUrl && (client.qrUrl.startsWith('https://') || client.qrUrl.startsWith('gs://'));
      const hasQrFileName = !!client.qrFileName;
      const hasQrPath = !!client.qrPath;
      
      if (hasQrUrl || hasQrFileName || hasQrPath) {
        clientsWithQR.push({
          name: client.name || client.id,
          id: client.id,
          qrUrl: hasQrUrl ? '✅' : '❌',
          qrFileName: hasQrFileName ? client.qrFileName : '❌',
          qrPath: hasQrPath ? client.qrPath : '❌',
          // Determine what PDF will use
          pdfWillUse: hasQrUrl ? `qrUrl (${client.qrUrl.substring(0, 50)}...)` :
                    hasQrFileName ? `qrFileName → qr-codes/${client.qrFileName}` :
                    hasQrPath ? `qrPath → ${client.qrPath}` : 'DEFAULT'
        });
        
        // Check for potential issues
        if (!hasQrUrl && hasQrFileName && client.qrFileName.includes(' ')) {
          clientsWithIssues.push({
            name: client.name || client.id,
            id: client.id,
            issue: 'qrFileName has spaces - may cause path issues',
            qrFileName: client.qrFileName
          });
        }
      } else {
        clientsWithoutQR.push({
          name: client.name || client.id,
          id: client.id,
          willUse: 'DEFAULT (qr-codes/1450 Scanner Program.png)'
        });
      }
    });
    
    console.log('✅ Clients WITH QR codes configured:');
    console.log('='.repeat(80));
    clientsWithQR.forEach(c => {
      console.log(`\n📄 ${c.name} (ID: ${c.id})`);
      console.log(`   qrUrl: ${c.qrUrl}`);
      console.log(`   qrFileName: ${c.qrFileName}`);
      console.log(`   qrPath: ${c.qrPath}`);
      console.log(`   📋 PDF will use: ${c.pdfWillUse}`);
    });
    
    if (clientsWithoutQR.length > 0) {
      console.log(`\n\n⚠️  Clients WITHOUT QR codes (will use default):`);
      console.log('='.repeat(80));
      clientsWithoutQR.forEach(c => {
        console.log(`   ${c.name} (ID: ${c.id}) → ${c.willUse}`);
      });
    }
    
    if (clientsWithIssues.length > 0) {
      console.log(`\n\n⚠️  Clients with potential issues:`);
      console.log('='.repeat(80));
      clientsWithIssues.forEach(c => {
        console.log(`   ${c.name} (ID: ${c.id})`);
        console.log(`   Issue: ${c.issue}`);
        console.log(`   qrFileName: "${c.qrFileName}"`);
      });
    }
    
    console.log(`\n\n📊 Summary:`);
    console.log(`   Total clients: ${clients.length}`);
    console.log(`   With QR codes: ${clientsWithQR.length}`);
    console.log(`   Without QR codes: ${clientsWithoutQR.length}`);
    console.log(`   With potential issues: ${clientsWithIssues.length}`);
    
  } catch (error) {
    console.error('❌ Error verifying QR codes:', error);
  }
}

// Run the verification
verifyAllQRCodes();

