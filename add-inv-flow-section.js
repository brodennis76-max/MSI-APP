import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase-config-script.js'; // Use the script-specific config

const addInvFlowSection = async () => {
  try {
    console.log('Starting to add Inv_Flow field and Inventory Flow section to all clients...');
    const clientsCollectionRef = collection(db, 'clients');
    const snapshot = await getDocs(clientsCollectionRef);

    if (snapshot.empty) {
      console.log('No clients found in the database.');
      return;
    }

    console.log(`Found ${snapshot.docs.length} clients to update`);

    for (const clientDoc of snapshot.docs) {
      const clientRef = doc(db, 'clients', clientDoc.id);
      const clientData = clientDoc.data();
      
      // Get existing sections or create empty array
      const existingSections = clientData.sections || [];
      
      // Add new Inventory Flow section
      const inventoryFlowSection = {
        sectionName: "Inventory Flow",
        content: "Inventory flow procedures and guidelines for this client.",
        subsections: [
          {
            sectionName: "Flow Process",
            content: "Step-by-step inventory flow process."
          },
          {
            sectionName: "Quality Control",
            content: "Quality control checkpoints during inventory flow."
          }
        ]
      };
      
      // Add the new section to existing sections
      const updatedSections = [...existingSections, inventoryFlowSection];
      
      await updateDoc(clientRef, {
        Inv_Flow: "", // New field for Inventory Flow
        sections: updatedSections, // Updated sections array
        updatedAt: new Date(), // Also update the timestamp
      });
      console.log(`Updated client: ${clientData.name} (ID: ${clientDoc.id})`);
    }

    console.log('Successfully added Inv_Flow field and Inventory Flow section to all clients!');
  } catch (error) {
    console.error('Error adding Inv_Flow field and Inventory Flow section to clients:', error);
  }
};

addInvFlowSection();























