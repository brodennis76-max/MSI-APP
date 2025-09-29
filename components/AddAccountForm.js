import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Image,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { db } from '../firebase-config';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import PreInventoryForm from './PreInventoryForm';

const AddAccountForm = ({ onBack, onMenuPress }) => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  const [clientAction, setClientAction] = useState(null); // 'new' or 'edit'
  const [showForm, setShowForm] = useState(false);
  const [showPreInventoryForm, setShowPreInventoryForm] = useState(false);
  const [createdClient, setCreatedClient] = useState(null);


  // Refs for keyboard navigation
  const clientNameRef = React.useRef(null);
  const emailRef = React.useRef(null);
  const picRef = React.useRef(null);
  const startTimeRef = React.useRef(null);
  const verificationRef = React.useRef(null);
  const additionalNotesRef = React.useRef(null);

  // Form data state
  const [formData, setFormData] = useState({
    inventoryType: 'scan',
    storeType: 'Convenience',
    PIC: 'Stores to be contacted via phone prior to counts to confirm inventory.',
    startTime: '',
    verification: 'Audit trails will be provided, as requested, during the count, within reason (do not provide audit trails on the entire store.)',
    additionalNotes: ''
  });

  // New client form data
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    inventoryType: 'scan',
    storeType: 'Convenience',
    PIC: 'Stores to be contacted via phone prior to counts to confirm inventory.',
    startTime: '',
    verification: 'Audit trails will be provided, as requested, during the count, within reason (do not provide audit trails on the entire store.)',
    additionalNotes: ''
  });

  // Fetch clients from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'clients'),
      (snapshot) => {
        const clientList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientList);
        setFilteredClients(clientList);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching clients:', error);
        setLoading(false);
      }
    );

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
            if (!client || !client.name) {
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

  const selectedClient = clients.find((client) => client.id === selectedClientId);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleNewClientInputChange = (field, value) => {
    setNewClientData({ ...newClientData, [field]: value });
  };

  // Show loading screen if still loading
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>Add Account</Text>
          <TouchableOpacity style={styles.hamburger} onPress={onMenuPress}>
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#333333" />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      </View>
    );
  }

  // Show PreInventoryForm if a new client was created
  if (showPreInventoryForm && createdClient && createdClient.id && createdClient.name) {
    console.log('AddAccountForm: Rendering PreInventoryForm with clientData:', createdClient);
    return (
      <PreInventoryForm 
        clientData={createdClient}
        onBack={() => {
          setShowPreInventoryForm(false);
          setCreatedClient(null);
          setShowForm(false);
          setClientAction(null);
        }}
        onComplete={() => {
          setShowPreInventoryForm(false);
          setCreatedClient(null);
          setShowForm(false);
          setClientAction(null);
        }}
      />
    );
  }

  const handleActionSelect = (action) => {
    setClientAction(action);
    if (action === 'new') {
      setShowForm(true);
      setSelectedClientId(null);
    } else {
      setShowForm(false);
      setSelectedClientId(null);
    }
  };

  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId);
    setShowForm(true);
  };

  // Load client data when selected for editing
  useEffect(() => {
    if (clientAction === 'edit' && selectedClientId) {
      const clientToEdit = clients.find(client => client.id === selectedClientId);
      if (clientToEdit) {
        setFormData({
          inventoryType: clientToEdit.inventoryType || 'scan',
          storeType: clientToEdit.storeType || 'Convenience',
          PIC: clientToEdit.PIC || 'Stores to be contacted via phone prior to counts to confirm inventory.',
          startTime: clientToEdit.startTime || '',
          verification: clientToEdit.verification || 'Audit trails will be provided, as requested, during the count, within reason (do not provide audit trails on the entire store.)',
          additionalNotes: clientToEdit.additionalNotes || ''
        });
      }
    }
  }, [clientAction, selectedClientId, clients]);

  const handleSave = async () => {
    if (clientAction === 'new') {
      // Handle new client creation
      if (!newClientData.name.trim()) {
        Alert.alert('Error', 'Please enter a client name.');
        return;
      }

      setSaving(true);

      try {
        // Sanitize client name for use as document ID
        const sanitizedName = newClientData.name.replace(/[^a-zA-Z0-9]/g, '_');
        const clientRef = doc(db, 'clients', sanitizedName);
        
        await setDoc(clientRef, {
          name: newClientData.name,
          email: newClientData.email,
          inventoryType: newClientData.inventoryType,
          storeType: newClientData.storeType,
          PIC: newClientData.PIC,
          startTime: newClientData.startTime,
          verification: newClientData.verification,
          additionalNotes: newClientData.additionalNotes,
          sections: [
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
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          active: true
        });

        // Store the created client data and navigate to PreInventoryForm
        const newClient = {
          id: sanitizedName,
          name: newClientData.name,
          email: newClientData.email,
          inventoryType: newClientData.inventoryType,
          storeType: newClientData.storeType,
          PIC: newClientData.PIC,
          startTime: newClientData.startTime,
          verification: newClientData.verification,
          additionalNotes: newClientData.additionalNotes
        };
        
        setCreatedClient(newClient);
        setShowPreInventoryForm(true);
        
        // Reset form data
        setNewClientData({
          name: '',
          email: '',
          inventoryType: 'scan',
          storeType: 'Convenience',
          PIC: 'Stores to be contacted via phone prior to counts to confirm inventory.',
          startTime: '',
          verification: '',
          additionalNotes: ''
        });
      } catch (error) {
        console.error('Error creating new client:', error);
        Alert.alert('Error', 'Failed to create new client. Please try again.');
      } finally {
        setSaving(false);
      }
    } else {
      // Handle existing client update
      if (!selectedClient) {
        Alert.alert('Error', 'Please select a client first.');
        return;
      }


      setSaving(true);

      try {
        const clientRef = doc(db, 'clients', selectedClient.id);
        
        await setDoc(clientRef, {
          ...selectedClient,
          inventoryType: formData.inventoryType,
          storeType: formData.storeType,
          PIC: formData.PIC,
          startTime: formData.startTime,
          verification: formData.verification,
          additionalNotes: formData.additionalNotes,
          updatedAt: new Date(),
        }, { merge: true });

        Alert.alert(
          'Success!', 
          `Account information updated for ${selectedClient.name}`,
          [
            { text: 'OK', onPress: () => {
              setFormData({
                preInventory: '',
                inventoryType: 'scan',
                storeType: 'Convenience',
                PIC: 'Stores to be contacted via phone prior to counts to confirm inventory.',
                startTime: '',
                verification: '',
                additionalNotes: ''
              });
              setSelectedClientId(null);
            }}
          ]
        );
      } catch (error) {
        console.error('Error saving data:', error);
        Alert.alert('Error', 'Failed to save data. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Add Account</Text>
        <TouchableOpacity style={styles.hamburger} onPress={onMenuPress}>
          <Text style={styles.hamburgerText}>☰</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {!showForm ? (
          <>
            <Text style={styles.sectionTitle}>Choose Action</Text>
            
            <View style={styles.radioContainer}>
              <TouchableOpacity 
                style={[styles.radioOption, clientAction === 'new' && styles.radioOptionSelected]}
                onPress={() => handleActionSelect('new')}
              >
                <View style={[styles.radioButton, clientAction === 'new' && styles.radioButtonSelected]}>
                  {clientAction === 'new' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={[styles.radioText, clientAction === 'new' && styles.radioTextSelected]}>
                  Add New Client
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.radioOption, clientAction === 'edit' && styles.radioOptionSelected]}
                onPress={() => handleActionSelect('edit')}
              >
                <View style={[styles.radioButton, clientAction === 'edit' && styles.radioButtonSelected]}>
                  {clientAction === 'edit' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={[styles.radioText, clientAction === 'edit' && styles.radioTextSelected]}>
                  Edit Existing Client
                </Text>
              </TouchableOpacity>
            </View>

            {clientAction === 'edit' && (
              <>
                <Text style={styles.sectionTitle}>Select Client to Edit</Text>
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
                
                <View style={styles.clientListContainer}>
                  {filteredClients.map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={[styles.clientItem, selectedClientId === client.id && styles.clientItemSelected]}
                      onPress={() => handleClientSelect(client.id)}
                    >
                      <Text style={[styles.clientItemText, selectedClientId === client.id && styles.clientItemTextSelected]}>
                        {client.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <Text style={styles.selectedClientText}>
              {clientAction === 'new' ? `Creating: ${newClientData.name || 'New Client'}` : `Updating: ${selectedClient?.name}`}
            </Text>

            <View style={styles.formContainer}>
              {clientAction === 'new' && (
                <>
                  <Text style={styles.label}>Client Name *</Text>
                  <TextInput
                    ref={clientNameRef}
                    style={styles.input}
                    value={newClientData.name}
                    onChangeText={(text) => handleNewClientInputChange('name', text)}
                    placeholder="Enter client name..."
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />

                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    value={newClientData.email}
                    onChangeText={(text) => handleNewClientInputChange('email', text)}
                    placeholder="Enter client email address..."
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => picRef.current?.focus()}
                  />

                </>
              )}
              <Text style={styles.label}>Store Type</Text>
              <Text style={{color: 'red', fontSize: 16, marginBottom: 10}}>DEBUG: Store Type dropdown should appear here</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={clientAction === 'new' ? newClientData.storeType : formData.storeType}
                  onValueChange={(value) => clientAction === 'new' ? handleNewClientInputChange('storeType', value) : handleInputChange('storeType', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Store Type" value="" />
                  <Picker.Item label="Convenience" value="Convenience" />
                  <Picker.Item label="Grocery" value="Grocery" />
                  <Picker.Item label="Clothing" value="Clothing" />
                  <Picker.Item label="Hardware" value="Hardware" />
                  <Picker.Item label="Other" value="Other" />
                </Picker>
              </View>

              <Text style={styles.label}>Inventory Type</Text>
              <View style={styles.inventoryTypeContainer}>
                {['scan', 'financial', 'hand written', 'price verification'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.inventoryTypeOption, (clientAction === 'new' ? newClientData.inventoryType : formData.inventoryType) === type && styles.inventoryTypeOptionSelected]}
                    onPress={() => clientAction === 'new' ? handleNewClientInputChange('inventoryType', type) : handleInputChange('inventoryType', type)}
                  >
                    <View style={[styles.inventoryTypeRadio, (clientAction === 'new' ? newClientData.inventoryType : formData.inventoryType) === type && styles.inventoryTypeRadioSelected]}>
                      {(clientAction === 'new' ? newClientData.inventoryType : formData.inventoryType) === type && <View style={styles.inventoryTypeRadioInner} />}
                    </View>
                    <Text style={[styles.inventoryTypeText, (clientAction === 'new' ? newClientData.inventoryType : formData.inventoryType) === type && styles.inventoryTypeTextSelected]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>


              <Text style={styles.label}>PIC (Pre Inventory Call)</Text>
              <TextInput
                ref={picRef}
                style={styles.textArea}
                value={clientAction === 'new' ? newClientData.PIC : formData.PIC}
                onChangeText={(text) => clientAction === 'new' ? handleNewClientInputChange('PIC', text) : handleInputChange('PIC', text)}
                placeholder="Enter PIC information..."
                multiline
                numberOfLines={3}
                returnKeyType="next"
                onSubmitEditing={() => startTimeRef.current?.focus()}
              />

              <Text style={styles.label}>Start Time</Text>
              <TextInput
                ref={startTimeRef}
                style={styles.input}
                value={clientAction === 'new' ? newClientData.startTime : formData.startTime}
                onChangeText={(text) => clientAction === 'new' ? handleNewClientInputChange('startTime', text) : handleInputChange('startTime', text)}
                placeholder="e.g., 8:00 AM"
                returnKeyType="next"
                onSubmitEditing={() => verificationRef.current?.focus()}
              />

              <Text style={styles.label}>Verification</Text>
              <TextInput
                ref={verificationRef}
                style={styles.textArea}
                value={clientAction === 'new' ? newClientData.verification : formData.verification}
                onChangeText={(text) => clientAction === 'new' ? handleNewClientInputChange('verification', text) : handleInputChange('verification', text)}
                placeholder="Edit verification details as needed..."
                multiline
                numberOfLines={3}
                returnKeyType="next"
                onSubmitEditing={() => additionalNotesRef.current?.focus()}
              />

              <Text style={styles.label}>Additional Notes</Text>
              <TextInput
                ref={additionalNotesRef}
                style={styles.textArea}
                value={clientAction === 'new' ? newClientData.additionalNotes : formData.additionalNotes}
                onChangeText={(text) => clientAction === 'new' ? handleNewClientInputChange('additionalNotes', text) : handleInputChange('additionalNotes', text)}
                placeholder="Any additional notes or comments..."
                multiline
                numberOfLines={4}
                returnKeyType="done"
              />
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        {showForm && (
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : (clientAction === 'new' ? 'Create Client' : 'Update Account')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  hamburger: {
    marginLeft: 'auto',
    padding: 10,
  },
  hamburgerText: {
    fontSize: 24,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 15,
  },
  radioContainer: {
    marginBottom: 30,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  radioOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  radioText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  radioTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  clientListContainer: {
    maxHeight: 300,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  clientItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  clientItemSelected: {
    backgroundColor: '#007AFF',
  },
  clientItemText: {
    fontSize: 16,
    color: '#333',
  },
  clientItemTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  inventoryTypeContainer: {
    marginBottom: 20,
  },
  inventoryTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inventoryTypeOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  inventoryTypeRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryTypeRadioSelected: {
    borderColor: '#007AFF',
  },
  inventoryTypeRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  inventoryTypeText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  inventoryTypeTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    backgroundColor: '#fff',
  },
  webSelect: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 20,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  selectedClientText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  bottomButtonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  backButton: {
    flex: 1,
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
  saveButton: {
    flex: 2,
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddAccountForm;
