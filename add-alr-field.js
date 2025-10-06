import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Your Firebase configuration
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

const addALRFieldToAllClients = async () => {
  try {
    console.log('Starting to add ALR field to all clients...');
    
    // Get all clients
    const clientsCollection = collection(db, 'clients');
    const clientsSnapshot = await getDocs(clientsCollection);
    
    console.log(`Found ${clientsSnapshot.size} clients to update`);
    
    const updatePromises = [];
    
    clientsSnapshot.forEach((clientDoc) => {
      const clientData = clientDoc.data();
      console.log(`Updating client: ${clientData.name}`);
      
      // Update the client with ALR field
      const clientRef = doc(db, 'clients', clientDoc.id);
      const updatePromise = updateDoc(clientRef, {
        ALR: '', // Set empty string as default
        updatedAt: new Date()
      });
      
      updatePromises.push(updatePromise);
    });
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    
    console.log('Successfully added ALR field to all clients!');
    
  } catch (error) {
    console.error('Error adding ALR field to clients:', error);
  }
};

// Run the script
addALRFieldToAllClients();


