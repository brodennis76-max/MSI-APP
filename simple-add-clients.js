// Simple script to add a few test clients
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase-config-script.js';

const testClients = [
  { name: "RUSSELL S/M", createdAt: new Date(), active: true },
  { name: "ALLEN'S SUPERMARKET", createdAt: new Date(), active: true },
  { name: "DART COMMERCIAL SERVICES", createdAt: new Date(), active: true }
];

const addTestClients = async () => {
  try {
    console.log('Adding test clients...');
    
    for (const client of testClients) {
      const docRef = await addDoc(collection(db, 'clients'), client);
      console.log(`✅ Added: ${client.name} (ID: ${docRef.id})`);
    }
    
    console.log('✅ All test clients added successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('Make sure Firestore rules allow read/write access');
  }
};

addTestClients();

