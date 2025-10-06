import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase-config-script.js';

const testFirebase = async () => {
  try {
    console.log('Testing Firebase connection...');
    const clientsRef = collection(db, 'clients');
    const querySnapshot = await getDocs(clientsRef);
    
    console.log('Total documents found:', querySnapshot.docs.length);
    
    querySnapshot.docs.forEach((doc, index) => {
      if (index < 5) { // Only show first 5
        console.log(`Client ${index + 1}:`, doc.id, doc.data());
      }
    });
    
    console.log('Firebase connection successful!');
  } catch (error) {
    console.error('Firebase connection failed:', error);
  }
};

testFirebase();

