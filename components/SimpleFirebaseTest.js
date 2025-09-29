import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase-config-script';

export default function SimpleFirebaseTest() {
  const [status, setStatus] = useState("Testing Firebase...");
  const [clientCount, setClientCount] = useState(0);

  useEffect(() => {
    testFirebase();
  }, []);

  const testFirebase = async () => {
    try {
      setStatus("Connecting to Firebase...");
      const clientsRef = collection(db, 'clients');
      const querySnapshot = await getDocs(clientsRef);
      
      setStatus(`Success! Found ${querySnapshot.docs.length} clients`);
      setClientCount(querySnapshot.docs.length);
      
      // Show first few client names
      const firstFew = querySnapshot.docs.slice(0, 3).map(doc => doc.data().name);
      console.log("First few clients:", firstFew);
      
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error("Firebase error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Firebase Test</Text>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.count}>Client Count: {clientCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  count: {
    fontSize: 14,
    color: '#666',
  },
});


