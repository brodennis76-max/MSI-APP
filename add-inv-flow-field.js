import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase-config-script.js'; // Use the script-specific config

const addInvFlowField = async () => {
  try {
    console.log('Starting to add Inv_Flow field to all clients...');
    const clientsCollectionRef = collection(db, 'clients');
    const snapshot = await getDocs(clientsCollectionRef);

    if (snapshot.empty) {
      console.log('No clients found in the database.');
      return;
    }

    console.log(`Found ${snapshot.docs.length} clients to update`);

    for (const clientDoc of snapshot.docs) {
      const clientRef = doc(db, 'clients', clientDoc.id);
      await updateDoc(clientRef, {
        Inv_Flow: "", // New field for Inventory Flow
        updatedAt: new Date(), // Also update the timestamp
      });
      console.log(`Updated client: ${clientDoc.data().name} (ID: ${clientDoc.id})`);
    }

    console.log('Successfully added Inv_Flow field to all clients!');
  } catch (error) {
    console.error('Error adding Inv_Flow field to clients:', error);
  }
};

addInvFlowField();










