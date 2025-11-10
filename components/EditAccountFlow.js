import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, TextInput, Alert, Platform, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../firebase-config';
import { collection, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import RichTextEditor from './RichTextEditor';
import { uploadQrToFirebase, getAccountQrPath } from '../utils/uploadQrToFirebase';
import QRCodeSelector from './QRCodeSelector';
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
  const [selectedQRCode, setSelectedQRCode] = useState(null);

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
      const clientData = { id: snap.id, ...snap.data() };
      setActiveClient(clientData);
      
      // Initialize selected QR code from client data
      if (clientData.qrFileName || clientData.qrPath) {
        setSelectedQRCode({
          qrFileName: clientData.qrFileName,
          qrPath: clientData.qrPath,
          qrUrl: clientData.qrUrl
        });
      } else {
        setSelectedQRCode(null);
      }
      
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
        const asset = result.assets[0];
        
        // Check file size (1MB limit)
        const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
        if (asset.base64) {
          // Estimate file size from base64 (base64 is ~33% larger than binary)
          const estimatedSize = (asset.base64.length * 3) / 4;
          if (estimatedSize > MAX_FILE_SIZE) {
            const sizeMB = (estimatedSize / (1024 * 1024)).toFixed(2);
            Alert.alert(
              'File Too Large',
              `The selected image is ${sizeMB}MB, which exceeds the maximum allowed size of 1MB. Please select a smaller image.`
            );
            return;
          }
        }
        
        // Preserve original image format from URI or use PNG as default
        const mimeType = asset.mimeType || 'image/png';
        const base64 = `data:${mimeType};base64,${asset.base64}`;
        // Preserve original filename or extract from URI
        // Ensure filename has .png extension for consistency
        let fileName = asset.fileName || asset.uri.split('/').pop() || 'qr-code.png';
        // If filename doesn't have an extension, add .png
        if (!fileName.includes('.')) {
          fileName = `${fileName}.png`;
        }
        // Ensure it ends with .png (replace any extension with .png)
        if (!fileName.toLowerCase().endsWith('.png')) {
          fileName = fileName.replace(/\.[^.]*$/, '') + '.png';
        }
        setQrImageBase64(base64);
        setQrImageFileName(fileName);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const removeQrImage = () => {
    setQrImageBase64(null);
    setQrImageFileName(null);
  };

  const uploadQrCode = async () => {
    console.log('=== uploadQrCode function called (EditAccountFlow) ===');
    console.log('qrImageBase64:', qrImageBase64 ? 'exists' : 'missing');
    console.log('activeClient:', activeClient ? activeClient.id : 'missing');
    
    if (!qrImageBase64) {
      console.log('Validation failed - missing image');
      Alert.alert('Error', 'Please select a QR code image first.');
      return;
    }
    
    if (!activeClient) {
      console.log('Validation failed - missing activeClient');
      Alert.alert('Error', 'No client selected.');
      return;
    }
    
    // Ensure filename is set - use a default if not provided
    const fileName = qrImageFileName || `qr-code-${activeClient.id}.png`;
    console.log('Using filename:', fileName);
    
    setUploadingQr(true);
    try {
      console.log('=== Starting Firebase Storage upload ===');
      console.log('Client ID:', activeClient.id);
      console.log('File name:', fileName);
      console.log('Base64 data length:', qrImageBase64.length);
      
      const qrUrl = await uploadQrToFirebase(qrImageBase64, fileName, activeClient.id);
      console.log('Upload successful! URL:', qrUrl);
      
      const qrPath = getAccountQrPath(fileName);
      console.log('QR path:', qrPath);
      
      // Update client with QR code path, filename, and Firebase Storage URL
      console.log('Updating Firestore...');
      const clientRef = doc(db, 'clients', activeClient.id);
      await updateDoc(clientRef, {
        qrPath: qrPath, // Firebase Storage path (e.g., 'qr-codes/filename.png')
        qrFileName: fileName, // Just the filename for PDF generation
        qrUrl: qrUrl, // Full Firebase Storage download URL
        updatedAt: new Date(),
      });
      console.log('Firestore updated successfully');
      
      setActiveClient({ ...activeClient, qrPath: qrPath, qrFileName: fileName, qrUrl: qrUrl });
      setQrImageBase64(null);
      setQrImageFileName(null);
      console.log('Upload complete!');
      Alert.alert('Success', `QR code uploaded to Firebase Storage successfully!\n\nURL: ${qrUrl.substring(0, 50)}...`);
    } catch (error) {
      console.error('=== Upload Error ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      
      let errorMsg = error.message;
      if (error.code === 'storage/unauthorized') {
        errorMsg = 'Permission denied. Please check Firebase Storage security rules. See FIREBASE_STORAGE_RULES.md for setup instructions.';
      }
      
      Alert.alert('Upload Failed', errorMsg);
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
      
      // If QR code was uploaded, include qrPath and qrFileName
      if (activeClient.qrPath) {
        updateData.qrPath = activeClient.qrPath;
      }
      if (activeClient.qrFileName) {
        updateData.qrFileName = activeClient.qrFileName;
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
              onValueChange={(v) => {
                setSelectedClientId(v);
                // Initialize QR code selection when client is selected
                if (v) {
                  const client = clients.find(c => c.id === v);
                  if (client && (client.qrFileName || client.qrPath)) {
                    setSelectedQRCode({
                      qrFileName: client.qrFileName,
                      qrPath: client.qrPath,
                      qrUrl: client.qrUrl
                    });
                  } else {
                    setSelectedQRCode(null);
                  }
                } else {
                  setSelectedQRCode(null);
                }
              }}
              style={styles.picker}
            >
              <Picker.Item label="Select Client" value={null} />
              {filteredClients.map(c => (
                <Picker.Item key={c.id} label={c.name} value={c.id} />
              ))}
            </Picker>
          </View>

          {/* Show QR Code Selector when client is selected */}
          {selectedClientId && (
            <View style={{ marginTop: 20, marginBottom: 20 }}>
              <QRCodeSelector
                selectedQRCode={selectedQRCode}
                onSelectQRCode={setSelectedQRCode}
                onClearSelection={() => setSelectedQRCode(null)}
                label="Scanner QR Code"
              />
            </View>
          )}

          <TouchableOpacity 
            style={[styles.primaryButton, (!selectedClientId || !selectedQRCode) && styles.disabled]}
            onPress={() => {
              if (selectedClientId) {
                // Save QR code selection before proceeding
                if (selectedQRCode) {
                  const clientRef = doc(db, 'clients', selectedClientId);
                  updateDoc(clientRef, {
                    qrFileName: selectedQRCode.qrFileName,
                    qrPath: selectedQRCode.qrPath,
                    qrUrl: selectedQRCode.qrUrl,
                  }).then(() => {
                    loadClient(selectedClientId);
                  });
                } else {
                  loadClient(selectedClientId);
                }
              }
            }}
            disabled={!selectedClientId || !selectedQRCode}
          >
            <Text style={styles.primaryText}>
              {selectedQRCode ? 'Start Editing' : 'Select QR Code to Continue'}
            </Text>
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
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
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
        </ScrollView>
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
  content: { flex: 1 },
  contentContainer: { padding: 20, flexGrow: 1 },
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
