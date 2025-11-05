import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { db } from '../firebase-config';
import { collection, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
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

  const pickQRCodeImage = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, use HTML file input to select from computer
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);
        
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) {
            document.body.removeChild(input);
            return;
          }
          
          // Check file type
          if (!file.type.startsWith('image/')) {
            Alert.alert('Error', 'Please select an image file.');
            document.body.removeChild(input);
            return;
          }
          
          // Convert to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            setActiveClient({
              ...activeClient,
              scannerQRCodeImageBase64: reader.result,
              scannerQRCodeImageUrl: '', // Clear URL if using uploaded image
            });
            Alert.alert('Success', 'QR code image uploaded successfully!');
            document.body.removeChild(input);
          };
          reader.onerror = () => {
            Alert.alert('Error', 'Failed to read image file.');
            document.body.removeChild(input);
          };
          reader.readAsDataURL(file);
        };
        
        input.click();
      } else {
        // For native, use ImagePicker
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant permission to access your photo library.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1], // Square aspect ratio for QR codes
          quality: 0.9,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          
          // For native, use FileSystem
          const { FileSystem } = await import('expo-file-system');
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const base64DataUrl = `data:image/png;base64,${base64}`;
          
          setActiveClient({
            ...activeClient,
            scannerQRCodeImageBase64: base64DataUrl,
            scannerQRCodeImageUrl: '', // Clear URL if using uploaded image
          });
          Alert.alert('Success', 'QR code image uploaded successfully!');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    }
  };

  const loadImageFromUrl = async () => {
    const url = activeClient.scannerQRCodeImageUrl?.trim();
    if (!url) {
      Alert.alert('Error', 'Please enter an image URL.');
      return;
    }

    try {
      setSaving(true);
      
      // Fetch image from URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Check if it's an image
      if (!blob.type.startsWith('image/')) {
        Alert.alert('Error', 'The URL does not point to an image file.');
        setSaving(false);
        return;
      }
      
      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      setActiveClient({
        ...activeClient,
        scannerQRCodeImageBase64: base64,
      });
      Alert.alert('Success', 'QR code image loaded from URL successfully!');
    } catch (error) {
      console.error('Error loading image from URL:', error);
      Alert.alert('Error', `Failed to load image from URL: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const saveClientInfo = async () => {
    if (!activeClient) return;
    
    setSaving(true);
    try {
      const clientRef = doc(db, 'clients', activeClient.id);
      const inventoryTypesArr = Array.isArray(activeClient.inventoryTypes) ? activeClient.inventoryTypes : (activeClient.inventoryType ? [activeClient.inventoryType] : []);
      const inventoryTypeStr = inventoryTypesArr.concat(
        inventoryTypesArr.includes('financial') && activeClient.financialPrice ? [activeClient.financialPrice] : []
      ).join(', ');

      await updateDoc(clientRef, {
        inventoryTypes: Array.isArray(activeClient.inventoryTypes) ? activeClient.inventoryTypes : (activeClient.inventoryType ? [activeClient.inventoryType] : []),
        financialPrice: activeClient.financialPrice || '',
        inventoryType: inventoryTypeStr,
        PIC: activeClient.PIC,
        startTime: activeClient.startTime,
        verification: activeClient.verification,
        additionalNotes: activeClient.additionalNotes,
        scannerQRCode: activeClient.scannerQRCode || '',
        scannerQRCodeImageUrl: activeClient.scannerQRCodeImageUrl || '',
        scannerQRCodeImageBase64: activeClient.scannerQRCodeImageBase64 || '',
        pdfImageUrls: activeClient.pdfImageUrls || '',
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
              <Text style={styles.label}>Inventory Type (Select all that apply)</Text>
              <View style={styles.inventoryTypeContainer}>
                {['scan', 'financial', 'hand written', 'price verification'].map((type) => {
                  const selectedList = Array.isArray(activeClient.inventoryTypes) ? activeClient.inventoryTypes : (activeClient.inventoryType ? [activeClient.inventoryType] : []);
                  const isSelected = selectedList.includes(type);
                  const toggleType = () => {
                    const current = Array.isArray(activeClient.inventoryTypes) ? activeClient.inventoryTypes : (activeClient.inventoryType ? [activeClient.inventoryType] : []);
                    const next = isSelected ? current.filter(t => t !== type) : [...current, type];
                    setActiveClient({ ...activeClient, inventoryTypes: next });
                  };
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.inventoryTypeOption, isSelected && styles.inventoryTypeOptionSelected]}
                      onPress={toggleType}
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
              {Array.isArray(activeClient.inventoryTypes) && activeClient.inventoryTypes.includes('financial') && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.helperText}>Financial Count - select price to take</Text>
                  <View style={styles.inventoryTypeContainer}>
                    {['Retail Price', 'Sale Price', 'Cost'].map((price) => (
                      <TouchableOpacity
                        key={price}
                        style={[styles.inventoryTypeOption, activeClient.financialPrice === price && styles.inventoryTypeOptionSelected]}
                        onPress={() => setActiveClient({ ...activeClient, financialPrice: price })}
                      >
                        <View style={[styles.inventoryTypeRadio, activeClient.financialPrice === price && styles.inventoryTypeRadioSelected]}>
                          {activeClient.financialPrice === price && <View style={styles.inventoryTypeRadioInner} />}
                        </View>
                        <Text style={[styles.inventoryTypeText, activeClient.financialPrice === price && styles.inventoryTypeTextSelected]}>
                          {price}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {Array.isArray(activeClient.inventoryTypes) && activeClient.inventoryTypes.includes('scan') && (
              <>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Scanner QR Code (Text)</Text>
                  <Text style={styles.helperText}>Enter the QR code data to generate a QR code. This will be used if no image URL is provided below.</Text>
                  <TextInput
                    style={styles.input}
                    value={activeClient.scannerQRCode || ''}
                    placeholder="Enter QR code data"
                    onChangeText={(text) => setActiveClient({...activeClient, scannerQRCode: text})}
                    multiline
                    numberOfLines={3}
                  />
                </View>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Scanner QR Code Image</Text>
                  <Text style={styles.helperText}>Upload a QR code PNG image from your computer or load from a URL on the internet.</Text>
                  
                  {/* Upload Button - From Computer */}
                  <TouchableOpacity 
                    style={styles.uploadButton} 
                    onPress={pickQRCodeImage}
                  >
                    <Text style={styles.uploadButtonText}>📁 Select Image from Computer</Text>
                  </TouchableOpacity>
                  
                  {/* Load from URL Section */}
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.helperText, { marginBottom: 8 }]}>Or load from internet URL:</Text>
                    <View style={{ flexDirection: 'row' }}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginRight: 8 }]}
                        value={activeClient.scannerQRCodeImageUrl || ''}
                        placeholder="https://example.com/qr-code.png"
                        onChangeText={(text) => setActiveClient({
                          ...activeClient,
                          scannerQRCodeImageUrl: text,
                        })}
                        multiline={false}
                      />
                      <TouchableOpacity 
                        style={[
                          styles.uploadButton, 
                          { paddingHorizontal: 16, minWidth: 100 },
                          (saving || !activeClient.scannerQRCodeImageUrl?.trim()) && styles.uploadButtonDisabled
                        ]} 
                        onPress={loadImageFromUrl}
                        disabled={saving || !activeClient.scannerQRCodeImageUrl?.trim()}
                      >
                        <Text style={styles.uploadButtonText}>
                          {saving ? 'Loading...' : 'Load'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.helperText, { marginTop: 4, fontSize: 11 }]}>
                      Supports any image URL (GitHub, Firebase, etc.)
                    </Text>
                  </View>
                  
                  {/* Preview uploaded image */}
                  {activeClient.scannerQRCodeImageBase64 && (
                    <View style={styles.imagePreview}>
                      <Text style={styles.helperText}>Image Preview:</Text>
                      <Image 
                        source={{ uri: activeClient.scannerQRCodeImageBase64 }} 
                        style={styles.previewImage}
                        resizeMode="contain"
                      />
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => setActiveClient({
                          ...activeClient,
                          scannerQRCodeImageBase64: '',
                          scannerQRCodeImageUrl: ''
                        })}
                      >
                        <Text style={styles.removeButtonText}>Remove Image</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </>
            )}

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

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>PDF Images (one URL per line)</Text>
              <Text style={styles.helperText}>Paste Firebase Storage download URLs (PNG/JPEG). Each URL on its own line. These will be embedded into the PDF.</Text>
              <TextInput
                style={styles.input}
                value={activeClient.pdfImageUrls || ''}
                placeholder="https://firebasestorage.googleapis.com/...\nhttps://..."
                onChangeText={(text) => setActiveClient({...activeClient, pdfImageUrls: text})}
                multiline
                numberOfLines={4}
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
  uploadButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  uploadButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePreview: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  previewImage: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  removeButton: {
    backgroundColor: '#dc3545',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingText: { 
    marginTop: 10, 
    color: '#666', 
    textAlign: 'center' 
  },
});

export default EditAccountFlow;


