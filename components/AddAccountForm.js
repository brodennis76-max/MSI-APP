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
import * as ImagePicker from 'expo-image-picker';
import { db } from '../firebase-config';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import RichTextEditor from './RichTextEditor';
import { uploadQrToFirebase, getAccountQrPath } from '../utils/uploadQrToFirebase';
import QRCodeSelector from './QRCodeSelector';
import PreInventoryForm from './PreInventoryForm';
import InventoryProceduresForm from './InventoryProceduresForm';
import AuditsInventoryFlowForm from './AuditsInventoryFlowForm';
import PreInventoryTeamInstructionsForm from './PreInventoryTeamInstructionsForm';
import NonCountProductsForm from './NonCountProductsForm';
import ReportsSection from './ReportsSection';
import CompletionScreen from './CompletionScreen';

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
  const [showInventoryProcedures, setShowInventoryProcedures] = useState(false);
  const [showAuditsInventoryFlow, setShowAuditsInventoryFlow] = useState(false);
  const [showPreInventoryTeamInstructions, setShowPreInventoryTeamInstructions] = useState(false);
  const [showNonCountProducts, setShowNonCountProducts] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [createdClient, setCreatedClient] = useState(null);
  const [selectedQRCode, setSelectedQRCode] = useState(null);

  // Firebase connection test function
  const testFirebaseConnection = async () => {
    try {
      console.log('🔥 Testing Firebase connection...');
      const testRef = doc(db, 'test', 'connection-test');
      await updateDoc(testRef, {
        testField: 'test-value',
        timestamp: new Date(),
        platform: Platform.OS,
        url: typeof window !== 'undefined' ? window.location.href : 'N/A'
      });
      console.log('✅ Firebase connection test SUCCESSFUL');
      Alert.alert('Success', 'Firebase connection is working!');
    } catch (error) {
      console.error('❌ Firebase connection test FAILED:', error);
      console.error('🔥 Error code:', error.code);
      console.error('🔥 Error message:', error.message);
      Alert.alert('Firebase Error', `Connection failed: ${error.message}`);
    }
  };


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
    financialPrice: '',
    storeType: 'Convenience',
    scanType: '',
    PIC: 'Stores to be contacted via phone prior to counts to confirm inventory.',
    startTime: '',
    verification: 'Audit trails will be provided, as requested, during the count, within reason (do not provide audit trails on the entire store.)',
    additionalNotes: ''
  });

  // New client form data
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    inventoryTypes: ['scan'],
    financialPrice: '',
    storeType: 'Convenience',
    scanType: '',
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
        console.error('🔥 FIREBASE ERROR - Failed to fetch clients:', error);
        console.error('🔥 Error code:', error.code);
        console.error('🔥 Error message:', error.message);
        console.error('🔥 Platform:', Platform.OS);
        console.error('🔥 Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');
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

  // Show completion screen
  if (showCompletion && createdClient) {
    return (
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
    );
  }

  // Show reports section
  if (showReports && createdClient) {
    return (
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
    );
  }

  // Show non-count products form
  if (showNonCountProducts && createdClient) {
    return (
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
    );
  }

  // Show team instructions form
  if (showPreInventoryTeamInstructions && createdClient) {
    return (
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
    );
  }

  // Show audits and inventory flow form
  if (showAuditsInventoryFlow && createdClient) {
    return (
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
    );
  }

  // Show inventory procedures form
  console.log('AddAccountForm: Checking inventory procedures - showInventoryProcedures:', showInventoryProcedures, 'createdClient:', !!createdClient);
  if (showInventoryProcedures && createdClient) {
    console.log('AddAccountForm: Rendering InventoryProceduresForm');
    return (
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
          console.log('AddAccountForm: PreInventoryForm onComplete called');
          console.log('AddAccountForm: Setting showPreInventoryForm to false');
          setShowPreInventoryForm(false);
          console.log('AddAccountForm: Setting showInventoryProcedures to true');
          setShowInventoryProcedures(true);
          console.log('AddAccountForm: State changes completed');
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
          inventoryTypes: Array.isArray(clientToEdit.inventoryTypes) ? clientToEdit.inventoryTypes : (clientToEdit.inventoryType ? [clientToEdit.inventoryType] : ['scan']),
          financialPrice: clientToEdit.financialPrice || '',
          storeType: clientToEdit.storeType || 'Convenience',
          scanType: clientToEdit.scanType || '',
          PIC: clientToEdit.PIC || 'Stores to be contacted via phone prior to counts to confirm inventory.',
          startTime: clientToEdit.startTime || '',
          verification: clientToEdit.verification || 'Audit trails will be provided, as requested, during the count, within reason (do not provide audit trails on the entire store.)',
          additionalNotes: clientToEdit.additionalNotes || ''
        });
        // Initialize selected QR code from client data
        if (clientToEdit.qrFileName || clientToEdit.qrPath) {
          setSelectedQRCode({
            qrFileName: clientToEdit.qrFileName,
            qrPath: clientToEdit.qrPath,
            qrUrl: clientToEdit.qrUrl
          });
        } else {
          setSelectedQRCode(null);
        }
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

      console.log('💾 Starting new client creation...');
      console.log('   Client name:', newClientData.name);
      console.log('   Selected QR code:', selectedQRCode ? selectedQRCode.qrFileName : 'None');
      setSaving(true);

      try {
        // Sanitize client name for use as document ID
        const sanitizedName = newClientData.name.replace(/[^a-zA-Z0-9]/g, '_');
        const clientRef = doc(db, 'clients', sanitizedName);
        
        // Build client data object
        const clientData = {
          name: newClientData.name,
          email: newClientData.email,
          inventoryTypes: Array.isArray(newClientData.inventoryTypes) ? newClientData.inventoryTypes : [],
          financialPrice: newClientData.financialPrice || '',
          inventoryType: (Array.isArray(newClientData.inventoryTypes) ? newClientData.inventoryTypes : [])
            .concat((Array.isArray(newClientData.inventoryTypes) && newClientData.inventoryTypes.includes('financial') && newClientData.financialPrice) ? [newClientData.financialPrice] : [])
            .join(', '),
          storeType: newClientData.storeType,
          accountType: newClientData.storeType,
          scanType: newClientData.scanType || '',
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
        };
        
        // Add QR code info if one was selected
        if (selectedQRCode) {
          clientData.qrFileName = selectedQRCode.qrFileName;
          clientData.qrPath = selectedQRCode.qrPath;
          clientData.qrUrl = selectedQRCode.qrUrl;
          console.log('Including QR code info in new client creation:', selectedQRCode);
        }
        
        await setDoc(clientRef, clientData);

        // Store the created client data and navigate to PreInventoryForm
        const newClient = {
          id: sanitizedName,
          name: newClientData.name,
          email: newClientData.email,
          inventoryTypes: Array.isArray(newClientData.inventoryTypes) ? newClientData.inventoryTypes : [],
          financialPrice: newClientData.financialPrice || '',
          inventoryType: (Array.isArray(newClientData.inventoryTypes) ? newClientData.inventoryTypes : [])
            .concat((Array.isArray(newClientData.inventoryTypes) && newClientData.inventoryTypes.includes('financial') && newClientData.financialPrice) ? [newClientData.financialPrice] : [])
            .join(', '),
          storeType: newClientData.storeType,
          accountType: newClientData.storeType,
          PIC: newClientData.PIC,
          startTime: newClientData.startTime,
          verification: newClientData.verification,
          additionalNotes: newClientData.additionalNotes
        };
        
        // Include QR code info in the created client object
        if (selectedQRCode) {
          newClient.qrFileName = selectedQRCode.qrFileName;
          newClient.qrPath = selectedQRCode.qrPath;
          newClient.qrUrl = selectedQRCode.qrUrl;
        }
        
        setCreatedClient(newClient);
        console.log('New client created successfully with QR code info');
        
        setShowPreInventoryForm(true);
        
        // Reset form data
        setNewClientData({
          name: '',
          email: '',
          inventoryTypes: ['scan'],
          financialPrice: '',
          storeType: 'Convenience',
          scanType: '',
          PIC: 'Stores to be contacted via phone prior to counts to confirm inventory.',
          startTime: '',
          verification: '',
          additionalNotes: ''
        });
        setSelectedQRCode(null);
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
          inventoryTypes: Array.isArray(formData.inventoryTypes) ? formData.inventoryTypes : [],
          financialPrice: formData.financialPrice || '',
          inventoryType: (Array.isArray(formData.inventoryTypes) ? formData.inventoryTypes : [])
            .concat((Array.isArray(formData.inventoryTypes) && formData.inventoryTypes.includes('financial') && formData.financialPrice) ? [formData.financialPrice] : [])
            .join(', '),
          storeType: formData.storeType,
          scanType: formData.scanType || '',
          PIC: formData.PIC,
          startTime: formData.startTime,
          verification: formData.verification,
          additionalNotes: formData.additionalNotes,
          updatedAt: new Date(),
        }, { merge: true });

        // Update QR code info if one was selected
        if (selectedQRCode) {
          await updateDoc(clientRef, {
            qrFileName: selectedQRCode.qrFileName,
            qrPath: selectedQRCode.qrPath,
            qrUrl: selectedQRCode.qrUrl,
          });
        } else {
          // Clear QR code if selection was cleared
          await updateDoc(clientRef, {
            qrFileName: null,
            qrPath: null,
            qrUrl: null,
          });
        }

        Alert.alert(
          'Success!', 
          `Account information updated for ${selectedClient.name}`,
          [
            { text: 'OK', onPress: () => {
              setFormData({
                preInventory: '',
                inventoryTypes: ['scan'],
                financialPrice: '',
                storeType: 'Convenience',
                scanType: '',
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

              <Text style={styles.label}>Inventory Type (Select all that apply)</Text>
              <View style={styles.inventoryTypeContainer}>
                {['scan', 'financial', 'hand written', 'price verification'].map((type) => {
                  const current = clientAction === 'new' ? (Array.isArray(newClientData.inventoryTypes) ? newClientData.inventoryTypes : []) : (Array.isArray(formData.inventoryTypes) ? formData.inventoryTypes : []);
                  const isSelected = current.includes(type);
                  const toggle = () => {
                    const next = isSelected ? current.filter(t => t !== type) : [...current, type];
                    if (clientAction === 'new') {
                      handleNewClientInputChange('inventoryTypes', next);
                    } else {
                      handleInputChange('inventoryTypes', next);
                    }
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
              {(clientAction === 'new' ? (Array.isArray(newClientData.inventoryTypes) && newClientData.inventoryTypes.includes('financial')) : (Array.isArray(formData.inventoryTypes) && formData.inventoryTypes.includes('financial'))) && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.helperText}>Financial Count - select price to take</Text>
                  <View style={styles.inventoryTypeContainer}>
                    {['Retail Price', 'Sale Price', 'Cost'].map((price) => {
                      const currentPrice = clientAction === 'new' ? newClientData.financialPrice : formData.financialPrice;
                      const isSelected = currentPrice === price;
                      const setPrice = () => {
                        if (clientAction === 'new') {
                          handleNewClientInputChange('financialPrice', price);
                        } else {
                          handleInputChange('financialPrice', price);
                        }
                      };
                      return (
                        <TouchableOpacity
                          key={price}
                          style={[styles.inventoryTypeOption, isSelected && styles.inventoryTypeOptionSelected]}
                          onPress={setPrice}
                        >
                          <View style={[styles.inventoryTypeRadio, isSelected && styles.inventoryTypeRadioSelected]}>
                            {isSelected && <View style={styles.inventoryTypeRadioInner} />}
                          </View>
                          <Text style={[styles.inventoryTypeText, isSelected && styles.inventoryTypeTextSelected]}>
                            {price}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Scan Type Selector */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Scan Type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={clientAction === 'new' ? newClientData.scanType : formData.scanType}
                    onValueChange={(value) => clientAction === 'new' ? handleNewClientInputChange('scanType', value) : handleInputChange('scanType', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Scan Type" value="" />
                    <Picker.Item label="Full Flavor" value="Full Flavor" />
                    <Picker.Item label="Price-Point" value="Price-Point" />
                  </Picker>
                </View>
              </View>

              {/* QR Code Selector - shown for both new and edit accounts */}
              <View style={styles.fieldContainer}>
                <QRCodeSelector
                  selectedQRCode={selectedQRCode}
                  onSelectQRCode={setSelectedQRCode}
                  onClearSelection={() => setSelectedQRCode(null)}
                  label="Scanner QR Code"
                />
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
  qrPreviewContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  qrPreview: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  uploadToGitHubButton: {
    backgroundColor: '#28a745',
    marginTop: 10,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 5,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  fieldContainer: {
    marginBottom: 15,
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
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default AddAccountForm;
