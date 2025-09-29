import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase-config-script.js';

const addAdditionalNotesField = async () => {
  try {
    console.log('Starting to add additionalNotes field to all clients...');
    
    // Get all clients from Firestore
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    
    console.log(`Found ${clientsSnapshot.size} clients to update`);
    
    // Update each client with additionalNotes field
    for (const clientDoc of clientsSnapshot.docs) {
      const clientRef = doc(db, 'clients', clientDoc.id);
      
      await updateDoc(clientRef, {
        additionalNotes: '', // Add empty additionalNotes field
        updatedAt: new Date()
      });
      
      console.log(`Updated client: ${clientDoc.data().name} (ID: ${clientDoc.id})`);
    }
    
    console.log('Successfully added additionalNotes field to all clients!');
  } catch (error) {
    console.error('Error adding additionalNotes field:', error);
  }
};

addAdditionalNotesField();










