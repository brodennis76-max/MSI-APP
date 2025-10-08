import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { db } from '../firebase-config';
import { collection, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import RichTextEditor from './RichTextEditor';
import PreInventoryForm from './PreInventoryForm';
import InventoryProceduresForm from './InventoryProceduresForm';
import AuditsInventoryFlowForm from './AuditsInventoryFlowForm';
import PreInventoryTeamInstructionsForm from './PreInventoryTeamInstructionsForm';
import NonCountProductsForm from './NonCountProductsForm';
import ReportsSection from './ReportsSection';
import EditCompletionScreen from './EditCompletionScreen';

const EditAccountFlow = ({ onBack }) => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState('picker');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'clients'),
      (snapshot) => {
        const clientList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredClients(clients);
      return;
    }
    const lowered = searchText.toLowerCase();
    setFilteredClients(clients.filter(c => (c.name || '').toLowerCase().includes(lowered)));
  }, [searchText, clients]);

  const loadClient = async (clientId) => {
    try {
      const ref = doc(db, 'clients', clientId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        Alert.alert('Error', 'Client not found.');
        return;
      }
      setActiveClient({ id: snap.id, ...snap.data() });
      setStep('clientInfo');
    } catch (e) {
      console.error('Failed to load client:', e);
      Alert.alert('Error', 'Failed to load client.');
    }
  };

  const saveClientInfo = async () => {
    if (!activeClient) return;
    
    setSaving(true);
    try {
      const clientRef = doc(db, 'clients', activeClient.id);
      await updateDoc(clientRef, {
        inventoryType: activeClient.inventoryType,
        PIC: activeClient.PIC,
        startTime: activeClient.startTime,
        verification: activeClient.verification,
        additionalNotes: activeClient.additionalNotes,
        updatedAt: new Date(),
      });
      Alert.alert('Success', 'Client information updated successfully!');
      setStep('preInventory');
    } catch (error) {
      console.error('Error saving client info:', error);
      Alert.alert('Error', 'Failed to save client information.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>Edit Account</Text>
        </View>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#333" />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      </View>
    );
  }

  if (step === 'picker') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>Edit Account</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
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
              onValueChange={(v) => setSelectedClientId(v)}
              style={styles.picker}
            >
              <Picker.Item label="Select Client" value={null} />
              {filteredClients.map(c => (
                <Picker.Item key={c.id} label={c.name} value={c.id} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity 
            style={[styles.startEditingButton, !selectedClientId && styles.disabled]}
            onPress={() => selectedClientId && loadClient(selectedClientId)}
            disabled={!selectedClientId}
          >
            <Text style={styles.startEditingText}>Start Editing</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 'clientInfo' && activeClient) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Image source={require('../assets/msi-smalllogo.jpeg')} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>Edit Account - {activeClient.name}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep('picker')}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <ScrollView 
          style={[styles.content, Platform.OS === 'web' && styles.webScrollView]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          scrollEventThrottle={16}
        >
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Client Name (Locked)</Text>
              <TextInput
                style={[styles.input, styles.lockedField]}
                value={activeClient.name || ''}
                editable={false}
                placeholder="Client Name"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Inventory Type</Text>
              <View style={styles.inventoryTypeContainer}>
                {['scan', 'financial', 'hand written', 'price verification'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.inventoryTypeOption, activeClient.inventoryType === type && styles.inventoryTypeOptionSelected]}
                    onPress={() => setActiveClient({...activeClient, inventoryType: type})}
                  >
                    <View style={[styles.inventoryTypeRadio, activeClient.inventoryType === type && styles.inventoryTypeRadioSelected]}>
                      {activeClient.inventoryType === type && <View style={styles.inventoryTypeRadioInner} />}
                    </View>
                    <Text style={[styles.inventoryTypeText, activeClient.inventoryType === type && styles.inventoryTypeTextSelected]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>PIC (Person in Charge)</Text>
              <Text style={styles.helperText}>Enter the name and contact information of the person in charge during the inventory count.</Text>
              <RichTextEditor
                value={activeClient.PIC || ''}
                onChange={(text) => setActiveClient({...activeClient, PIC: text})}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Start Time</Text>
              <Text style={styles.helperText}>Enter the scheduled start time for the inventory count.</Text>
              <TextInput
                style={styles.input}
                value={activeClient.startTime || ''}
                placeholder="e.g., 8:00 AM"
                onChangeText={(text) => setActiveClient({...activeClient, startTime: text})}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Verification</Text>
              <Text style={styles.helperText}>Enter any verification requirements or special instructions for the count.</Text>
              <RichTextEditor
                value={activeClient.verification || ''}
                onChange={(text) => setActiveClient({...activeClient, verification: text})}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Additional Notes</Text>
              <Text style={styles.helperText}>Enter any additional notes or special instructions for this client.</Text>
              <RichTextEditor
                value={activeClient.additionalNotes || ''}
                onChange={(text) => setActiveClient({...activeClient, additionalNotes: text})}
              />
            </View>
          </View>
        </ScrollView>

          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity 
              style={styles.backButtonBottom}
              onPress={() => setStep('picker')}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={saveClientInfo}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save & Continue to Forms'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
    );
  }

  if (step === 'preInventory' && activeClient) {
    return (
      <PreInventoryForm
        clientData={activeClient}
        onBack={() => setStep('clientInfo')}
        onComplete={() => setStep('inventoryProcedures')}
      />
    );
  }

  if (step === 'inventoryProcedures' && activeClient) {
    return (
      <InventoryProceduresForm
        clientData={activeClient}
        onBack={() => setStep('preInventory')}
        onComplete={() => setStep('auditsInventoryFlow')}
      />
    );
  }

  if (step === 'auditsInventoryFlow' && activeClient) {
    return (
      <AuditsInventoryFlowForm
        clientData={activeClient}
        onBack={() => setStep('inventoryProcedures')}
        onComplete={() => setStep('preInventoryTeamInstructions')}
      />
    );
  }

  if (step === 'preInventoryTeamInstructions' && activeClient) {
    return (
      <PreInventoryTeamInstructionsForm
        clientData={activeClient}
        onBack={() => setStep('auditsInventoryFlow')}
        onComplete={() => setStep('nonCountProducts')}
      />
    );
  }

  if (step === 'nonCountProducts' && activeClient) {
    return (
      <NonCountProductsForm
        clientData={activeClient}
        onBack={() => setStep('preInventoryTeamInstructions')}
        onComplete={() => setStep('reports')}
      />
    );
  }

  if (step === 'reports' && activeClient) {
    return (
      <ReportsSection
        clientData={activeClient}
        onBack={() => setStep('nonCountProducts')}
        onComplete={() => setStep('complete')}
      />
    );
  }

  if (step === 'complete' && activeClient) {
    return (
      <EditCompletionScreen
        clientData={activeClient}
        onFinalize={() => onBack()}
        onBackToDashboard={() => onBack()}
      />
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f8f8' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    backgroundColor: '#fff',
    borderBottomWidth: 1, 
    borderBottomColor: '#e0e0e0' 
  },
  headerLogo: { 
    width: 40, 
    height: 40, 
    resizeMode: 'contain' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333', 
    marginLeft: 10, 
    flex: 1 
  },
  backButton: { 
    backgroundColor: '#6c757d', 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 5 
  },
  backButtonText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  content: { 
    flex: 1, 
    padding: 20,
    ...(Platform.OS === 'web' && {
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }),
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  webScrollView: {
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    height: '100%',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  fieldContainer: { 
    marginBottom: 15 
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    color: '#333',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    paddingHorizontal: 15, 
    paddingVertical: 12,
    fontSize: 16, 
    backgroundColor: '#fff',
    height: 50,
  },
  lockedField: { 
    backgroundColor: '#f5f5f5', 
    color: '#666',
    borderColor: '#ddd'
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
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
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
    borderColor: '#ccc',
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
  searchContainer: { 
    marginBottom: 15 
  },
  searchInput: { 
    height: 50, 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    paddingHorizontal: 15, 
    fontSize: 16, 
    backgroundColor: '#fff' 
  },
  pickerContainer: { 
    width: '100%', 
    marginBottom: 20 
  },
  picker: { 
    height: 50, 
    width: '100%', 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    backgroundColor: '#fff' 
  },
  startEditingButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  startEditingText: {
    color: '#fff',
    fontSize: 16,
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
  backButtonBottom: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: { 
    marginTop: 10, 
    color: '#666', 
    textAlign: 'center' 
  },
});

export default EditAccountFlow;


