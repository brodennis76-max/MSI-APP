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
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB in bytes

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

  // Calculate approximate file size from base64
  // Base64 encoding increases size by ~33%, so we estimate the binary size
  const estimatedBinarySize = (base64Content.length * 3) / 4;
  console.log('Estimated binary file size:', estimatedBinarySize, 'bytes (', (estimatedBinarySize / 1024).toFixed(2), 'KB)');
  
  // Check file size limit (1MB)
  if (estimatedBinarySize > MAX_FILE_SIZE) {
    const sizeMB = (estimatedBinarySize / (1024 * 1024)).toFixed(2);
    const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(2);
    throw new Error(`File size (${sizeMB}MB) exceeds the maximum allowed size of ${maxMB}MB. Please use a smaller image.`);
  }

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

  // Verify actual file size after decoding
  const actualFileSize = bytes.length;
  console.log('Actual file size after decoding:', actualFileSize, 'bytes (', (actualFileSize / 1024).toFixed(2), 'KB)');
  
  // Check file size limit again with actual size (1MB)
  if (actualFileSize > MAX_FILE_SIZE) {
    const sizeMB = (actualFileSize / (1024 * 1024)).toFixed(2);
    const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(2);
    throw new Error(`File size (${sizeMB}MB) exceeds the maximum allowed size of ${maxMB}MB. Please use a smaller image.`);
  }

  // Use original filename as-is (preserve original name and extension)
  const filename = fileName;
  // Ensure we're uploading to the qr-codes folder
  const filePath = `qr-codes/${filename}`;
  console.log('=== Upload Path Verification ===');
  console.log('QR_CODES_DIR constant:', QR_CODES_DIR);
  console.log('Filename:', filename);
  console.log('Full file path:', filePath);
  console.log('Expected location: qr-codes/' + filename);
  console.log('File size check passed:', actualFileSize, 'bytes <', MAX_FILE_SIZE, 'bytes');

  try {
    // Create a reference to the file location in Firebase Storage
    const storageRef = ref(storage, filePath);
    console.log('Storage reference created:', filePath);
    console.log('Storage bucket:', storage._delegate?.bucket || 'unknown');
    console.log('Bytes to upload:', bytes.length);

    // Upload the file
    console.log('Uploading to Firebase Storage...');
    console.log('File path:', filePath);
    console.log('Content type: image/png');
    
    const uploadResult = await uploadBytes(storageRef, bytes, {
      contentType: 'image/png',
      customMetadata: {
        accountId: accountId || 'unknown',
        uploadedAt: new Date().toISOString(),
      }
    });
    
    console.log('Upload successful!');
    console.log('Full path:', uploadResult.metadata.fullPath);
    console.log('Bucket:', uploadResult.metadata.bucket);
    console.log('Size:', uploadResult.metadata.size);

    // Get the download URL
    console.log('Getting download URL...');
    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log('Download URL:', downloadURL);

    return downloadURL;
  } catch (error) {
    console.error('=== Firebase Storage Upload Error ===');
    console.error('Error code:', error.code);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Provide more helpful error messages
    let errorMessage = error.message;
    if (error.code === 'storage/unauthorized') {
      errorMessage = 'Firebase Storage: Permission denied. Please check your Firebase Storage security rules.';
    } else if (error.code === 'storage/canceled') {
      errorMessage = 'Firebase Storage: Upload was canceled.';
    } else if (error.code === 'storage/unknown') {
      errorMessage = 'Firebase Storage: Unknown error occurred. Please check your Firebase configuration and Storage rules.';
    }
    
    throw new Error(errorMessage);
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

