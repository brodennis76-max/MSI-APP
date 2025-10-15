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
  Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { db } from '../firebase-config';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import RichTextEditor from './RichTextEditor';
import PreInventoryForm from './PreInventoryForm';
import InventoryProceduresForm from './InventoryProceduresForm';
import AuditsInventoryFlowForm from './AuditsInventoryFlowForm';
import PreInventoryTeamInstructionsForm from './PreInventoryTeamInstructionsForm';
import NonCountProductsForm from './NonCountProductsForm';
import ReportsSection from './ReportsSection';
import CompletionScreen from './CompletionScreen';

const AddAccountFormTest = ({ onBack, onMenuPress }) => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  const [clientAction, setClientAction] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showPreInventoryForm, setShowPreInventoryForm] = useState(false);
  const [showInventoryProcedures, setShowInventoryProcedures] = useState(false);
  const [showAuditsInventoryFlow, setShowAuditsInventoryFlow] = useState(false);
  const [showPreInventoryTeamInstructions, setShowPreInventoryTeamInstructions] = useState(false);
  const [showNonCountProducts, setShowNonCountProducts] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
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
    inventoryTypes: ['scan'],
    PIC: 'Stores to be contacted via phone prior to counts to confirm inventory.',
    startTime: '',
    verification: 'Audit trails will be provided, as requested, during the count, within reason (do not provide audit trails on the entire store.)',
    additionalNotes: ''
  });

  // New client form data with persistence
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    inventoryTypes: ['scan'],
    PIC: 'Stores to be contacted via phone prior to counts to confirm inventory.',
    startTime: '',
    verification: 'Audit trails will be provided, as requested, during the count, within reason (do not provide audit trails on the entire store.)',
    additionalNotes: ''
  });

  // Persistent form data that survives navigation
  const [persistentFormData, setPersistentFormData] = useState({
    name: '',
    email: '',
    inventoryTypes: ['scan'],
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

  // Sync persistent form data with newClientData when form is shown
  useEffect(() => {
    if (showForm && clientAction === 'new') {
      setNewClientData(persistentFormData);
    }
  }, [showForm, clientAction, persistentFormData]);

  // Load client data when selected for editing
  useEffect(() => {
    if (clientAction === 'edit' && selectedClientId) {
      const clientToEdit = clients.find(client => client.id === selectedClientId);
      if (clientToEdit) {
        setFormData({
          inventoryTypes: Array.isArray(clientToEdit.inventoryTypes) ? clientToEdit.inventoryTypes : (clientToEdit.inventoryType ? [clientToEdit.inventoryType] : ['scan']),
          PIC: clientToEdit.PIC || 'Stores to be contacted via phone prior to counts to confirm inventory.',
          startTime: clientToEdit.startTime || '',
          verification: clientToEdit.verification || 'Audit trails will be provided, as requested, during the count, within reason (do not provide audit trails on the entire store.)',
          additionalNotes: clientToEdit.additionalNotes || ''
        });
      }
    }
  }, [clientAction, selectedClientId, clients]);

  const selectedClient = clients.find((client) => client.id === selectedClientId);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleNewClientInputChange = (field, value) => {
    const updatedData = { ...newClientData, [field]: value };
    setNewClientData(updatedData);
    setPersistentFormData(updatedData);
  };

  const handleActionSelect = (action) => {
    setClientAction(action);
    if (action === 'new') {
      setShowForm(true);
    } else {
      setShowForm(false);
    }
  };

  const clearFormData = () => {
    const defaultData = {
      name: '',
      email: '',
      inventoryTypes: ['scan'],
      PIC: 'Stores to be contacted via phone prior to counts to confirm inventory.',
      startTime: '',
      verification: 'Audit trails will be provided, as requested, during the count, within reason (do not provide audit trails on the entire store.)',
      additionalNotes: ''
    };
    setNewClientData(defaultData);
    setPersistentFormData(defaultData);
  };

  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (clientAction === 'new') {
      if (!newClientData.name.trim()) {
        Alert.alert('Error', 'Please enter a client name.');
        return;
      }

      setSaving(true);

      try {
        const sanitizedName = newClientData.name.replace(/[^a-zA-Z0-9]/g, '_');
        const clientRef = doc(db, 'clients', sanitizedName);
        
        await setDoc(clientRef, {
          name: newClientData.name,
          email: newClientData.email,
          inventoryTypes: Array.isArray(newClientData.inventoryTypes) ? newClientData.inventoryTypes : [],
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

        const newClient = {
          id: sanitizedName,
          name: newClientData.name,
          email: newClientData.email,
          inventoryTypes: Array.isArray(newClientData.inventoryTypes) ? newClientData.inventoryTypes : [],
          PIC: newClientData.PIC,
          startTime: newClientData.startTime,
          verification: newClientData.verification,
          additionalNotes: newClientData.additionalNotes
        };
        
        setCreatedClient(newClient);
        setShowPreInventoryForm(true);
        
        setNewClientData({
          name: '',
          email: '',
          inventoryTypes: ['scan'],
          PIC: 'Stores to be contacted via phone prior to counts to confirm inventory.',
          startTime: '',
          verification: 'Audit trails will be provided, as requested, during the count, within reason (do not provide audit trails on the entire store.)',
          additionalNotes: ''
        });

        Alert.alert('Success', `New client "${newClientData.name}" added successfully!`);

      } catch (error) {
        console.error('Error adding new client:', error);
        Alert.alert('Error', 'Failed to add new client. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  // Always render the main form - no conditional returns
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Add Account</Text>
        <TouchableOpacity style={styles.hamburger} onPress={onMenuPress}>
          <Text style={styles.hamburgerText}>☰</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#333333" />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      ) : showCompletion && createdClient ? (
        <CompletionScreen 
          clientData={createdClient}
          onBack={() => {
            setShowCompletion(false);
            setShowReports(true);
          }}
          onComplete={() => {
            setShowCompletion(false);
            setShowReports(false);
            setShowNonCountProducts(false);
            setShowPreInventoryTeamInstructions(false);
            setShowAuditsInventoryFlow(false);
            setShowInventoryProcedures(false);
            setShowPreInventoryForm(false);
            setCreatedClient(null);
            setShowForm(false);
            setClientAction(null);
            onBack(); // Return to dashboard
          }}
        />
      ) : showReports && createdClient ? (
        <ReportsSection 
          clientData={createdClient}
          onBack={() => {
            setShowReports(false);
            setShowNonCountProducts(true);
          }}
          onComplete={() => {
            setShowReports(false);
            setShowCompletion(true);
          }}
        />
      ) : showNonCountProducts && createdClient ? (
        <NonCountProductsForm 
          clientData={createdClient}
          onBack={() => {
            setShowNonCountProducts(false);
            setShowPreInventoryTeamInstructions(true);
          }}
          onComplete={() => {
            setShowNonCountProducts(false);
            setShowReports(true);
          }}
        />
      ) : showPreInventoryTeamInstructions && createdClient ? (
        <PreInventoryTeamInstructionsForm 
          clientData={createdClient}
          onBack={() => {
            setShowPreInventoryTeamInstructions(false);
            setShowAuditsInventoryFlow(true);
          }}
          onComplete={() => {
            setShowPreInventoryTeamInstructions(false);
            setShowNonCountProducts(true);
          }}
        />
      ) : showAuditsInventoryFlow && createdClient ? (
        <AuditsInventoryFlowForm 
          clientData={createdClient}
          onBack={() => {
            setShowAuditsInventoryFlow(false);
            setShowInventoryProcedures(true);
          }}
          onComplete={() => {
            setShowAuditsInventoryFlow(false);
            setShowPreInventoryTeamInstructions(true);
          }}
        />
      ) : showInventoryProcedures && createdClient ? (
        <InventoryProceduresForm 
          clientData={createdClient}
          onBack={() => {
            setShowInventoryProcedures(false);
            setShowPreInventoryForm(true);
          }}
          onComplete={() => {
            setShowInventoryProcedures(false);
            setShowAuditsInventoryFlow(true);
          }}
        />
      ) : showPreInventoryForm && createdClient ? (
        <PreInventoryForm 
          clientData={createdClient}
          onBack={() => {
            setShowPreInventoryForm(false);
            setCreatedClient(null);
            setShowForm(true);
            setClientAction('new');
          }}
          onComplete={() => {
            setShowPreInventoryForm(false);
            setShowInventoryProcedures(true);
          }}
        />
      ) : (
        <ScrollView style={styles.content}>
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

          {clientAction === 'new' && (
            <View style={styles.formContainer}>
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

              <Text style={styles.label}>Inventory Type (Select all that apply)</Text>
              <View style={styles.inventoryTypeContainer}>
                {['scan', 'financial', 'hand written', 'price verification'].map((type) => {
                  const current = Array.isArray(newClientData.inventoryTypes) ? newClientData.inventoryTypes : [];
                  const isSelected = current.includes(type);
                  const toggle = () => {
                    const next = isSelected ? current.filter(t => t !== type) : [...current, type];
                    handleNewClientInputChange('inventoryTypes', next);
                  };
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.inventoryTypeOption, isSelected && styles.inventoryTypeOptionSelected]}
                      onPress={toggle}
                    >
                      <View style={[styles.inventoryTypeRadio, isSelected && styles.inventoryTypeRadioSelected]}>
                        {isSelected && <View style={styles.inventoryTypeRadioInner} />}
                      </View>
                      <Text style={[styles.inventoryTypeText, isSelected && styles.inventoryTypeTextSelected]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>PIC (Pre Inventory Call)</Text>
              <RichTextEditor
                value={newClientData.PIC}
                onChange={(text) => handleNewClientInputChange('PIC', text)}
              />

              <Text style={styles.label}>Start Time</Text>
              <TextInput
                ref={startTimeRef}
                style={styles.input}
                value={newClientData.startTime}
                onChangeText={(text) => handleNewClientInputChange('startTime', text)}
                placeholder="e.g., 8:00 AM"
                returnKeyType="next"
                onSubmitEditing={() => verificationRef.current?.focus()}
              />

              <Text style={styles.label}>Verification</Text>
              <RichTextEditor
                value={newClientData.verification}
                onChange={(text) => handleNewClientInputChange('verification', text)}
              />

              <Text style={styles.label}>Additional Notes</Text>
              <RichTextEditor
                value={newClientData.additionalNotes}
                onChange={(text) => handleNewClientInputChange('additionalNotes', text)}
              />
            </View>
          )}
        </ScrollView>
      )}

      {!showPreInventoryForm && !showInventoryProcedures && !showAuditsInventoryFlow && !showPreInventoryTeamInstructions && !showNonCountProducts && !showReports && !showCompletion && (
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              clearFormData();
              onBack();
            }}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          
          {clientAction === 'new' && (
            <>
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearFormData}
              >
                <Text style={styles.clearButtonText}>Clear Form</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Create Client'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
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
  inventoryTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  inventoryTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    margin: 5,
  },
  inventoryTypeOptionSelected: {
    backgroundColor: '#e6f2ff',
    borderColor: '#007AFF',
  },
  inventoryTypeRadio: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  inventoryTypeRadioSelected: {
    borderColor: '#007AFF',
  },
  inventoryTypeRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  inventoryTypeText: {
    fontSize: 16,
    color: '#333',
  },
  inventoryTypeTextSelected: {
    fontWeight: 'bold',
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
  clearButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddAccountFormTest;
