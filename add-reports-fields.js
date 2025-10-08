import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase-config-script.js'; // Use the script-specific config

const addReportsFields = async () => {
  try {
    console.log('Starting to add reports fields to all clients...');
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
        Prog_Rep: "", // Progressive Reports
        Finalize: "", // Finalizing the Count
        Fin_Rep: "", // Final Reports
        Processing: "", // Final Processing
        updatedAt: new Date(), // Also update the timestamp
      });
      console.log(`Updated client: ${clientDoc.data().name} (ID: ${clientDoc.id})`);
    }

    console.log('Successfully added reports fields to all clients!');
  } catch (error) {
    console.error('Error adding reports fields to clients:', error);
  }
};

addReportsFields();























