import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase-config-script.js';

// Pre-Inventory sections and subsections
const sections = [
  {
    sectionName: "Pre-Inventory",
    content: "General pre-inventory instructions for the team.",
    subsections: [
      {
        sectionName: "Area Mapping",
        content: "Instructions on mapping each area of the store prior to inventory."
      },
      {
        sectionName: "Store Prep Instructions",
        content: "Instructions for preparing the store, including clearing shelves and labeling sections."
      }
    ]
  }
];

// Add sections to Firebase
const addSectionsToFirebase = async () => {
  try {
    console.log('Starting to add sections to Firebase...');
    
    for (const section of sections) {
      // Sanitize section name for use as document ID
      const sanitizedSectionName = section.sectionName.replace(/[^a-zA-Z0-9]/g, '_');
      
      const docRef = doc(db, 'sections', sanitizedSectionName);
      await setDoc(docRef, {
        sectionName: section.sectionName,
        content: section.content,
        subsections: section.subsections,
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true
      });
      console.log(`Added section: ${section.sectionName} with ID: ${sanitizedSectionName}`);
    }
    
    console.log('All sections added successfully!');
  } catch (error) {
    console.error('Error adding sections:', error);
  }
};

// Run the function
addSectionsToFirebase();
























