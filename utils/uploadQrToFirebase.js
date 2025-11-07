/**
 * Upload QR Code PNG to Firebase Storage
 * 
 * This script uploads a PNG file to Firebase Storage and returns the download URL.
 * 
 * Usage:
 *   const url = await uploadQrToFirebase(base64Data, fileName, accountId);
 */

import { storage } from '../firebase-config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const QR_CODES_DIR = 'qr-codes';

/**
 * Upload a QR code PNG to Firebase Storage
 * @param {string} base64Data - Base64 encoded PNG data (data:image/png;base64,...)
 * @param {string} fileName - Original filename to preserve
 * @param {string} accountId - Account/client ID (for logging)
 * @returns {Promise<string>} - Firebase Storage download URL
 */
export async function uploadQrToFirebase(base64Data, fileName, accountId) {
  console.log('=== uploadQrToFirebase called ===');
  console.log('fileName:', fileName);
  console.log('accountId:', accountId);
  console.log('base64Data length:', base64Data?.length || 0);
  console.log('base64Data starts with:', base64Data?.substring(0, 50) || 'N/A');
  
  if (!base64Data || !fileName) {
    const missing = [];
    if (!base64Data) missing.push('base64Data');
    if (!fileName) missing.push('fileName');
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }

  // Extract base64 content (remove data:image/png;base64, prefix if present)
  let base64Content = base64Data;
  if (base64Data.includes(',')) {
    base64Content = base64Data.split(',')[1];
    console.log('Extracted base64 content (removed data URI prefix)');
  }
  console.log('Base64 content length:', base64Content.length);

  // Decode base64 to binary
  let binaryString;
  try {
    binaryString = atob(base64Content);
    console.log('Decoded base64 to binary, length:', binaryString.length);
  } catch (error) {
    console.error('Error decoding base64:', error);
    throw new Error(`Failed to decode base64 data: ${error.message}`);
  }
  
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Use original filename as-is (preserve original name and extension)
  const filename = fileName;
  const filePath = `${QR_CODES_DIR}/${filename}`;
  console.log('File path:', filePath);

  try {
    // Create a reference to the file location in Firebase Storage
    const storageRef = ref(storage, filePath);
    console.log('Storage reference created:', filePath);

    // Upload the file
    console.log('Uploading to Firebase Storage...');
    const uploadResult = await uploadBytes(storageRef, bytes, {
      contentType: 'image/png',
      customMetadata: {
        accountId: accountId || 'unknown',
        uploadedAt: new Date().toISOString(),
      }
    });
    console.log('Upload successful!', uploadResult.metadata.fullPath);

    // Get the download URL
    console.log('Getting download URL...');
    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log('Download URL:', downloadURL);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading QR code to Firebase Storage:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

/**
 * Get the QR code path for a file (relative to storage root)
 * @param {string} fileName - Filename of the QR code
 * @returns {string} - Firebase Storage path to the QR code
 */
export function getAccountQrPath(fileName) {
  // Return path relative to storage root
  return `qr-codes/${fileName}`;
}

/**
 * Get the default QR code path
 * @returns {string} - Default QR code path
 */
export function getDefaultQrPath() {
  return 'qr-codes/1450 Scanner Program.png';
}

/**
 * Get Firebase Storage URL for a QR code file
 * @param {string} fileName - Filename of the QR code
 * @returns {string} - Full Firebase Storage URL
 */
export function getFirebaseStorageUrl(fileName) {
  const path = getAccountQrPath(fileName);
  // Firebase Storage URL format: gs://bucket/path or https://firebasestorage.googleapis.com/...
  // For download, we'll use the path and construct the URL when needed
  return path;
}

