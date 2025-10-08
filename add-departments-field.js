import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase-config-script.js'; // Use the script-specific config

const addDepartmentsField = async () => {
  try {
    console.log('Starting to add Departments field to all clients...');
    const clientsCollectionRef = collection(db, 'clients');
    const snapshot = await getDocs(clientsCollectionRef);

    if (snapshot.empty) {
      console.log('No clients found in the database.');
      return;
    }

    console.log(`Found ${snapshot.docs.length} clients to update`);

    for (const clientDoc of snapshot.docs) {
      const data = clientDoc.data() || {};
      if (typeof data.Departments === 'string' && data.Departments.length >= 0) {
        console.log(`Skipping ${data.name || clientDoc.id} - Departments already present`);
        continue;
      }

      const clientRef = doc(db, 'clients', clientDoc.id);
      await updateDoc(clientRef, {
        Departments: '',
        updatedAt: new Date(),
      });
      console.log(`Updated client: ${data.name || clientDoc.id} (ID: ${clientDoc.id})`);
    }

    console.log('Successfully added Departments field to all clients!');
  } catch (error) {
    console.error('Error adding Departments field to clients:', error);
  }
};

addDepartmentsField();


