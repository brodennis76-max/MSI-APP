import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, TextInput } from 'react-native';
import { generateAccountInstructionsPDF } from './UniversalPDFGenerator';
import { Picker } from '@react-native-picker/picker';
import { db } from '../firebase-config';
import { collection, onSnapshot } from 'firebase/firestore';
// Removed PDF generation dependency

const AccInstPicker = ({ onBack, onMenuPress }) => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Removed PDF generator state
  const [searchText, setSearchText] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);

  // Fetch clients from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'clients'),
      (snapshot) => {
        const clientList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(), // Spread document data (includes name)
        }));
        setClients(clientList);
        setFilteredClients(clientList);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Error fetching clients:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Filter clients based on search text
  useEffect(() => {
    try {
      if (searchText.trim() === '') {
        setFilteredClients(clients);
      } else {
        const filtered = clients.filter(client => {
          try {
            // Debug: log client object to see its structure
            if (!client || !client.name) {
              console.log('Client without name:', client);
              return false;
            }
            return client.name.toLowerCase().includes(searchText.toLowerCase());
          } catch (error) {
            console.log('Error filtering client:', client, error);
            return false;
          }
        });
        setFilteredClients(filtered);
      }
    } catch (error) {
      console.error('Error in search filter:', error);
      setFilteredClients(clients);
    }
  }, [searchText, clients]);

  // Get selected client object
  const selectedClient = clients.find((client) => client.id === selectedClientId);

  // PDF generator removed

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>Account Instructions</Text>
          <TouchableOpacity style={styles.hamburger} onPress={onMenuPress}>
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#333333" />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>Account Instructions</Text>
          <TouchableOpacity style={styles.hamburger} onPress={onMenuPress}>
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Account Instructions</Text>
        <TouchableOpacity style={styles.hamburger} onPress={onMenuPress}>
          <Text style={styles.hamburgerText}>☰</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
            returnKeyType="search"
          />
        </View>
        
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedClientId}
            onValueChange={(itemValue) => {
              setSelectedClientId(itemValue);
            }}
            style={styles.picker}
          >
            <Picker.Item label="Select Client" value={null} />
            {filteredClients.map((client) => (
              <Picker.Item
                key={client.id}
                label={client.name}
                value={client.id}
              />
            ))}
          </Picker>
        </View>

        <TouchableOpacity 
          style={styles.generateButton}
          onPress={async () => {
            if (!selectedClientId) {
              alert('Please select a client first.');
              return;
            }
            try {
              await generateAccountInstructionsPDF({ clientId: selectedClientId });
            } catch (e) {
              alert(e?.message || 'Failed to generate PDF');
            }
          }}
        >
          <Text style={styles.generateButtonText}>Generate PDF</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
    flex: 1,
    textAlign: 'center',
  },
  hamburger: {
    marginLeft: 'auto',
    padding: 10,
  },
  hamburgerText: {
    fontSize: 24,
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    width: '100%',
    marginBottom: 20,
  },
  picker: {
    height: 50,
    width: '100%',
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  selectedText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  generateButton: {
    marginTop: 10,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  backButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AccInstPicker;