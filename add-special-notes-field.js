import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase-config-script.js';

const addSpecialNotesField = async () => {
  try {
    console.log('Starting to add Special Notes fields to all clients...');
    const clientsCollectionRef = collection(db, 'clients');
    const snapshot = await getDocs(clientsCollectionRef);
    if (snapshot.empty) {
      console.log('No clients found in the database.');
      return;
    }
    console.log(`Found ${snapshot.docs.length} clients to update`);

    for (const clientDoc of snapshot.docs) {
      const data = clientDoc.data() || {};
      const clientRef = doc(db, 'clients', clientDoc.id);
      const update = {};

      if (typeof data.Has_Special_Notes !== 'boolean') {
        update.Has_Special_Notes = false;
      }
      if (typeof data.Special_Notes !== 'string') {
        update.Special_Notes = '';
      }
      if (Object.keys(update).length === 0) {
        console.log(`Skipping ${data.name || clientDoc.id} - fields already present`);
        continue;
      }
      update.updatedAt = new Date();
      await updateDoc(clientRef, update);
      console.log(`Updated client: ${data.name || clientDoc.id} (ID: ${clientDoc.id})`);
    }
    console.log('Successfully added Special Notes fields to all clients!');
  } catch (error) {
    console.error('Error adding Special Notes fields:', error);
  }
};

addSpecialNotesField();


