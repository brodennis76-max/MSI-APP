import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Your Firebase config (same as firebase-config.js)
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

/**
 * Add scannerQRCodeImageUrl field to all existing clients
 */
async function addQRCodeImageField() {
  try {
    console.log('📝 Starting to add scannerQRCodeImageUrl field to all clients...');
    
    const clientsRef = collection(db, 'clients');
    const snapshot = await getDocs(clientsRef);
    
    let updatedCount = 0;
    
    for (const docSnap of snapshot.docs) {
      const clientData = docSnap.data();
      const clientRef = doc(db, 'clients', docSnap.id);
      
      // Only update if the field doesn't already exist
      if (!clientData.scannerQRCodeImageUrl) {
        await updateDoc(clientRef, {
          scannerQRCodeImageUrl: "" // Empty string by default
        });
        updatedCount++;
        console.log(`✅ Added scannerQRCodeImageUrl field to: ${clientData.name || docSnap.id}`);
      } else {
        console.log(`⏭️  Field already exists for: ${clientData.name || docSnap.id}`);
      }
    }
    
    console.log(`\n✅ Successfully added scannerQRCodeImageUrl field to ${updatedCount} client(s)!`);
    console.log(`📊 Total clients processed: ${snapshot.docs.length}`);
  } catch (error) {
    console.error('❌ Error adding scannerQRCodeImageUrl field to clients:', error);
    throw error;
  }
}

// Run the function
addQRCodeImageField()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });


