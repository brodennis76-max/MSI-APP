import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  Alert
} from 'react-native';
import { fetchGitHubQRCodes, getGitHubQRCodeUrl } from '../utils/fetchGitHubQRCodes';

const QRCodeSelector = ({ 
  selectedQRCode, 
  onSelectQRCode, 
  onClearSelection,
  label = "Scanner QR Code"
}) => {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    loadQRCodes();
  }, []);

  const loadQRCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading QR codes from GitHub...');
      const codes = await fetchGitHubQRCodes();
      console.log('✅ Loaded QR codes:', codes.length, 'files');
      setQrCodes(codes);
    } catch (err) {
      console.error('❌ Error loading QR codes:', err);
      const errorMessage = err.message || 'Unknown error occurred';
      setError(errorMessage);
      // Don't show alert here - let the user see the error in the modal
      console.error('Full error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQRCode = (qrCode) => {
    // Store qrFileName (just the filename) and qrPath (full path)
    const qrFileName = qrCode.name;
    const qrPath = `qr-codes/${qrCode.name}`;
    
    onSelectQRCode({
      qrFileName,
      qrPath,
      qrUrl: qrCode.downloadUrl
    });
    
    setShowModal(false);
  };

  const handlePreview = (qrCode) => {
    setPreviewUrl(qrCode.downloadUrl);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      {selectedQRCode ? (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedText}>
            Selected: {selectedQRCode.qrFileName || selectedQRCode.qrPath || 'Unknown'}
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.selectButton]}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.buttonText}>Change QR Code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={onClearSelection}
            >
              <Text style={styles.buttonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View>
          <TouchableOpacity
            style={[styles.button, styles.selectButton]}
            onPress={() => {
              console.log('🔘 Select QR Code button pressed');
              setShowModal(true);
              loadQRCodes(); // Reload QR codes when opening modal
            }}
          >
            <Text style={styles.buttonText}>Select QR Code from GitHub</Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            Tap to browse available QR codes from GitHub repository
          </Text>
        </View>
      )}

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select QR Code</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading QR codes from GitHub...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={loadQRCodes}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : qrCodes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No QR codes found in GitHub</Text>
                <Text style={styles.emptySubtext}>
                  Make sure QR code files exist in the qr-codes folder
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.qrCodeList}>
                {qrCodes.map((qrCode, index) => {
                  const isDefault = qrCode.name === '1450 Scanner Program.png';
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.qrCodeItem}
                      onPress={() => handleSelectQRCode(qrCode)}
                    >
                      <View style={styles.qrCodeInfo}>
                        <View style={styles.qrCodeNameRow}>
                          <Text style={styles.qrCodeName}>{qrCode.name}</Text>
                          {isDefault && (
                            <Text style={styles.defaultLabel}>(default)</Text>
                          )}
                        </View>
                        <Text style={styles.qrCodeSize}>
                          {(qrCode.size / 1024).toFixed(1)} KB
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.previewButton}
                        onPress={() => handlePreview(qrCode)}
                      >
                        <Text style={styles.previewButtonText}>Preview</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Preview Modal */}
      {previewUrl && (
        <Modal
          visible={!!previewUrl}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setPreviewUrl(null)}
        >
          <View style={styles.previewOverlay}>
            <View style={styles.previewContent}>
              <TouchableOpacity
                style={styles.previewCloseButton}
                onPress={() => setPreviewUrl(null)}
              >
                <Text style={styles.previewCloseButtonText}>✕</Text>
              </TouchableOpacity>
              <Image
                source={{ uri: previewUrl }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  selectedContainer: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  selectButton: {
    backgroundColor: '#007AFF',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  qrCodeList: {
    flex: 1,
  },
  qrCodeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  qrCodeInfo: {
    flex: 1,
  },
  qrCodeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  qrCodeName: {
    fontSize: 16,
    color: '#333',
  },
  defaultLabel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  qrCodeSize: {
    fontSize: 12,
    color: '#666',
  },
  previewButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 6,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    width: '90%',
    height: '90%',
    position: 'relative',
  },
  previewCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});

export default QRCodeSelector;

