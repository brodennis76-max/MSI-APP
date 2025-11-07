/**
 * Upload QR Code PNG to GitHub
 * 
 * This script uploads a PNG file to GitHub and returns the raw URL.
 * Requires a GitHub Personal Access Token with repo permissions.
 * 
 * Usage:
 *   const url = await uploadQrToGitHub(base64Data, accountId, githubToken);
 */

const ORG = 'brodennis76-max';
const REPO = 'MSI-APP';
const BRANCH = 'main';
const QR_CODES_DIR = 'msi-expo/qr-codes';

/**
 * Upload a QR code PNG to GitHub
 * @param {string} base64Data - Base64 encoded PNG data (data:image/png;base64,...)
 * @param {string} fileName - Original filename to preserve
 * @param {string} accountId - Account/client ID (for logging)
 * @param {string} githubToken - GitHub Personal Access Token
 * @returns {Promise<string>} - Raw GitHub URL of the uploaded file
 */
export async function uploadQrToGitHub(base64Data, fileName, accountId, githubToken) {
  console.log('=== uploadQrToGitHub called ===');
  console.log('fileName:', fileName);
  console.log('accountId:', accountId);
  console.log('base64Data length:', base64Data?.length || 0);
  console.log('base64Data starts with:', base64Data?.substring(0, 50) || 'N/A');
  console.log('githubToken exists:', !!githubToken);
  console.log('githubToken length:', githubToken?.length || 0);
  console.log('githubToken starts with:', githubToken?.substring(0, 10) || 'N/A');
  
  if (!base64Data || !fileName || !githubToken) {
    const missing = [];
    if (!base64Data) missing.push('base64Data');
    if (!fileName) missing.push('fileName');
    if (!githubToken) missing.push('githubToken');
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

  // Encode file content as base64 for GitHub API
  let content;
  try {
    content = btoa(String.fromCharCode(...bytes));
    console.log('Encoded content for GitHub API, length:', content.length);
  } catch (error) {
    console.error('Error encoding content:', error);
    throw new Error(`Failed to encode content: ${error.message}`);
  }

  try {
    // Support both "token" and "Bearer" authorization formats
    // Classic tokens use "token", fine-grained tokens use "Bearer"
    const authHeader = githubToken.startsWith('ghp_') || githubToken.startsWith('github_pat_')
      ? `Bearer ${githubToken}`
      : `token ${githubToken}`;
    console.log('Using auth header format:', authHeader.substring(0, 20) + '...');

    // Check if file already exists
    let sha = null;
    const checkUrl = `https://api.github.com/repos/${ORG}/${REPO}/contents/${filePath}`;
    console.log('Checking if file exists:', checkUrl);
    
    try {
      const getResponse = await fetch(checkUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      console.log('File existence check status:', getResponse.status);

      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha; // Need SHA for update
        console.log('File exists, will update. SHA:', sha.substring(0, 10) + '...');
      } else if (getResponse.status !== 404) {
        // If it's not a 404, there's an error
        const errorData = await getResponse.json().catch(() => ({}));
        console.error('Error checking file existence:', {
          status: getResponse.status,
          statusText: getResponse.statusText,
          error: errorData
        });
      } else {
        console.log('File does not exist (404), will create new');
      }
    } catch (e) {
      // File doesn't exist, will create new
      console.log('Exception checking file existence:', e.message);
    }

    // Upload or update file
    const uploadUrl = `https://api.github.com/repos/${ORG}/${REPO}/contents/${filePath}`;
    console.log('Uploading to:', uploadUrl);
    console.log('Upload payload size:', JSON.stringify({
      message: `Upload QR code for account ${accountId || 'unknown'}`,
      content: content.substring(0, 50) + '...',
      branch: BRANCH,
      ...(sha ? { sha: sha.substring(0, 10) + '...' } : {}),
    }).length);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Upload QR code for account ${accountId || 'unknown'}`,
        content: content,
        branch: BRANCH,
        ...(sha ? { sha } : {}), // Include SHA if updating existing file
      }),
    });

    console.log('Upload response status:', uploadResponse.status);
    console.log('Upload response statusText:', uploadResponse.statusText);

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || uploadResponse.statusText;
      console.error('GitHub API error details:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorData,
        headers: Object.fromEntries(uploadResponse.headers.entries())
      });
      throw new Error(`GitHub API error (${uploadResponse.status}): ${errorMessage}`);
    }

    const result = await uploadResponse.json();
    console.log('Upload successful! Response:', {
      commit: result.commit?.sha?.substring(0, 10),
      content: result.content?.path
    });
    
    // Return raw GitHub URL
    const rawUrl = `https://raw.githubusercontent.com/${ORG}/${REPO}/${BRANCH}/${filePath}`;
    console.log('Returning raw URL:', rawUrl);
    return rawUrl;
  } catch (error) {
    console.error('Error uploading QR code to GitHub:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

/**
 * Get the QR code path for a file (relative to repo root)
 * @param {string} fileName - Filename of the QR code
 * @returns {string} - GitHub path to the QR code (relative to repo root)
 */
export function getAccountQrPath(fileName) {
  // Use original filename as-is (preserve original name and extension)
  // Return path relative to repo root (without msi-expo/)
  return `qr-codes/${fileName}`;
}

/**
 * Get the default QR code path
 * @returns {string} - Default QR code path
 */
export function getDefaultQrPath() {
  return 'qr-codes/1450 Scanner Program.png';
}

