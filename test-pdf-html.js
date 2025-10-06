// Test script to generate PDF HTML and verify field values
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

// Copy the generateUniversalHTML function from UniversalPDFGenerator
const generateUniversalHTML = (client) => {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  console.log('🎨 generateUniversalHTML called with client:', client);
  console.log('🎨 Available client fields:', Object.keys(client || {}));
  console.log('🎨 Key field values:', {
    name: client?.name,
    inventoryType: client?.inventoryType,
    accountType: client?.accountType,
    PIC: client?.PIC,
    startTime: client?.startTime,
    storeStartTime: client?.storeStartTime,
    verification: client?.verification,
    updatedAt: client?.updatedAt,
  });
  
  // Debug the actual values that will be used in the PDF
  console.log('🔍 PDF Field Values:');
  console.log('  - Inventory:', client?.inventoryType || client?.accountType || 'Not specified');
  console.log('  - PIC:', client?.PIC || 'Not specified');
  console.log('  - Store Start Time:', client?.startTime || client?.storeStartTime || 'Not specified');
  console.log('  - Verification:', client?.verification || 'Not specified');
  console.log('  - Updated:', client?.updatedAt ? new Date(client.updatedAt.toDate ? client.updatedAt.toDate() : client.updatedAt).toLocaleDateString('en-US', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  }) : new Date().toLocaleDateString('en-US', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  }));

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Account Instructions - ${client.name}</title>
        <style>
          @page {
            size: letter;
            margin: 0.5in;
          }
          
          body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.6;
            color: #2c3e50;
            background: white;
            width: 8.5in;
            min-height: 11in;
          }
          
          .pdf-container {
            width: 7.5in;
            min-height: 9in;
            padding: 1in;
            box-sizing: border-box;
            margin: 0 auto;
          }
          
          .header {
            text-align: center;
            background: linear-gradient(135deg, #007AFF 0%, #0056b3 100%);
            color: white;
            padding: 30px 20px;
            margin-bottom: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            page-break-after: avoid;
          }
          
          .company-name {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          }
          
          .client-name {
            font-size: 20px;
            font-weight: bold;
            margin-top: 10px;
          }
          
          .info-section {
            margin-bottom: 20px;
            page-break-after: avoid;
          }
          
          .info-row {
            display: flex;
            margin-bottom: 8px;
            border-bottom: 1px solid #eee;
            padding-bottom: 4px;
          }
          
          .info-label {
            font-weight: bold;
            width: 120px;
            color: #555;
          }
          
          .info-value {
            flex: 1;
            word-wrap: break-word;
          }
          
          .avoid-break {
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="pdf-container">
          <div class="header">
            <div class="company-name">MSI INVENTORY</div>
            <div class="title">ACCOUNT INSTRUCTIONS</div>
            <div class="client-name">${client.name}</div>
          </div>

          <div class="info-section avoid-break">
            <div class="info-row">
              <div class="info-label">Inventory:</div>
              <div class="info-value">${client.inventoryType || client.accountType || 'Not specified'}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Updated:</div>
              <div class="info-value">${client.updatedAt ? new Date(client.updatedAt.toDate ? client.updatedAt.toDate() : client.updatedAt).toLocaleDateString('en-US', { 
                year: 'numeric',
                month: 'long', 
                day: 'numeric'
              }) : currentDate}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">PIC:</div>
              <div class="info-value">${client.PIC || 'Not specified'}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Store Start Time:</div>
              <div class="info-value">${client.startTime || client.storeStartTime || 'Not specified'}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Verification:</div>
              <div class="info-value">${client.verification || 'Not specified'}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

async function testPDFHTML() {
  try {
    console.log('🔄 Testing PDF HTML generation...');
    
    // Get first client
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    const clients = [];
    
    clientsSnapshot.forEach((doc) => {
      clients.push({ id: doc.id, ...doc.data() });
    });
    
    if (clients.length > 0) {
      const client = clients[0];
      console.log(`\n🔍 Testing with client: ${client.name}`);
      
      const html = generateUniversalHTML(client);
      
      // Write HTML to file for inspection
      const fs = await import('fs');
      fs.writeFileSync('test-pdf-output.html', html);
      console.log('📄 HTML written to test-pdf-output.html');
      
      // Show the info section part
      const infoSectionMatch = html.match(/<div class="info-section avoid-break">[\s\S]*?<\/div>/);
      if (infoSectionMatch) {
        console.log('\n📋 Info Section HTML:');
        console.log(infoSectionMatch[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing PDF HTML:', error);
  }
}

// Run the test
testPDFHTML();
