import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../firebase-config';
import { collection, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import RichTextEditor from './RichTextEditor';
import { uploadQrToGitHub, getAccountQrPath } from '../utils/uploadQrToGitHub';
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
  const [qrImageBase64, setQrImageBase64] = useState(null);
  const [uploadingQr, setUploadingQr] = useState(false);

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

  const pickQrImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64 = `data:image/png;base64,${result.assets[0].base64}`;
        setQrImageBase64(base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const removeQrImage = () => {
    setQrImageBase64(null);
  };

  const uploadQrCode = async () => {
    if (!qrImageBase64 || !activeClient) return;
    
    setUploadingQr(true);
    try {
      // Get GitHub token from environment or config
      // For now, we'll need to add this to a config file or environment variable
      const githubToken = process.env.GITHUB_TOKEN || '';
      
      if (!githubToken) {
        Alert.alert(
          'GitHub Token Required',
          'Please set GITHUB_TOKEN in your environment variables or config file to upload QR codes to GitHub.'
        );
        return;
      }

      const qrUrl = await uploadQrToGitHub(qrImageBase64, activeClient.id, githubToken);
      const qrPath = getAccountQrPath(activeClient.id);
      
      // Update client with QR code path
      const clientRef = doc(db, 'clients', activeClient.id);
      await updateDoc(clientRef, {
        qrPath: qrPath,
        updatedAt: new Date(),
      });
      
      setActiveClient({ ...activeClient, qrPath: qrPath });
      setQrImageBase64(null);
      Alert.alert('Success', 'QR code uploaded to GitHub successfully!');
    } catch (error) {
      console.error('Error uploading QR code:', error);
      Alert.alert('Error', `Failed to upload QR code: ${error.message}`);
    } finally {
      setUploadingQr(false);
    }
  };

  const saveClientInfo = async () => {
    if (!activeClient) return;
    setSaving(true);
    try {
      const clientRef = doc(db, 'clients', activeClient.id);
      const updateData = {
        inventoryType: activeClient.inventoryType,
        PIC: activeClient.PIC,
        startTime: activeClient.startTime,
        verification: activeClient.verification,
        additionalNotes: activeClient.additionalNotes,
        updatedAt: new Date(),
      };
      
      // If QR code was uploaded, include qrPath
      if (activeClient.qrPath) {
        updateData.qrPath = activeClient.qrPath;
      }
      
      await updateDoc(clientRef, updateData);
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
            style={[styles.primaryButton, !selectedClientId && styles.disabled]}
            onPress={() => selectedClientId && loadClient(selectedClientId)}
            disabled={!selectedClientId}
          >
            <Text style={styles.primaryText}>Start Editing</Text>
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
        <View style={styles.content}>
          <View style={styles.clientInfoContainer}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Client Name (Locked)</Text>
              <TextInput
                style={[styles.textInput, styles.lockedField]}
                value={activeClient.name || ''}
                editable={false}
                placeholder="Client Name"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Inventory Type</Text>
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
              <Text style={styles.fieldLabel}>PIC</Text>
              <RichTextEditor
                value={activeClient.PIC || ''}
                onChange={(text) => setActiveClient({...activeClient, PIC: text})}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Start Time</Text>
              <TextInput
                style={styles.textInput}
                value={activeClient.startTime || ''}
                placeholder="e.g., 8:00 AM"
                onChangeText={(text) => setActiveClient({...activeClient, startTime: text})}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Verification</Text>
              <RichTextEditor
                value={activeClient.verification || ''}
                onChange={(text) => setActiveClient({...activeClient, verification: text})}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Additional Notes</Text>
              <RichTextEditor
                value={activeClient.additionalNotes || ''}
                onChange={(text) => setActiveClient({...activeClient, additionalNotes: text})}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Scanner QR Code</Text>
              <Text style={styles.fieldSubLabel}>
                {activeClient.qrPath 
                  ? `Using account-specific QR code: ${activeClient.qrPath}`
                  : 'Using default QR code (qr-codes/1450 Scanner Program.png)'}
              </Text>
              
              {qrImageBase64 && (
                <View style={styles.qrPreviewContainer}>
                  <Image source={{ uri: qrImageBase64 }} style={styles.qrPreview} />
                  <TouchableOpacity style={styles.removeButton} onPress={removeQrImage}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.uploadButton} 
                onPress={pickQrImage}
                disabled={uploadingQr}
              >
                <Text style={styles.uploadButtonText}>
                  {qrImageBase64 ? 'Change QR Code Image' : 'Select QR Code Image'}
                </Text>
              </TouchableOpacity>
              
              {qrImageBase64 && (
                <TouchableOpacity 
                  style={[styles.uploadButton, styles.uploadToGitHubButton, uploadingQr && styles.disabled]} 
                  onPress={uploadQrCode}
                  disabled={uploadingQr}
                >
                  <Text style={styles.uploadButtonText}>
                    {uploadingQr ? 'Uploading to GitHub...' : 'Upload to GitHub'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, saving && styles.disabled]}
            onPress={saveClientInfo}
            disabled={saving}
          >
            <Text style={styles.primaryText}>
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerLogo: { width: 40, height: 40, resizeMode: 'contain' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 10, flex: 1, textAlign: 'center' },
  backButton: { backgroundColor: '#6c757d', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5 },
  backButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  searchContainer: { marginBottom: 15 },
  searchInput: { height: 50, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 15, fontSize: 16, backgroundColor: '#fff' },
  pickerContainer: { width: '100%', marginBottom: 20 },
  picker: { height: 50, width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#fff' },
  primaryButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loadingText: { marginTop: 10, color: '#666', textAlign: 'center' },
  clientInfoContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  fieldContainer: { marginBottom: 15 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5 },
  fieldSubLabel: { fontSize: 12, color: '#666', marginBottom: 10, fontStyle: 'italic' },
  textInput: { 
    height: 50, 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    paddingHorizontal: 15, 
    fontSize: 16, 
    backgroundColor: '#fff' 
  },
  lockedField: { 
    backgroundColor: '#f5f5f5', 
    color: '#666',
    borderColor: '#ddd'
  },
  textArea: { 
    height: 100, 
    textAlignVertical: 'top',
    paddingTop: 15
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
});

export default EditAccountFlow;
