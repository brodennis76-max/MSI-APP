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
  if (!base64Data || !fileName || !githubToken) {
    throw new Error('Missing required parameters: base64Data, fileName, or githubToken');
  }

  // Extract base64 content (remove data:image/png;base64, prefix if present)
  let base64Content = base64Data;
  if (base64Data.includes(',')) {
    base64Content = base64Data.split(',')[1];
  }

  // Decode base64 to binary
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Use original filename as-is (preserve original name and extension)
  const filename = fileName;
  const filePath = `${QR_CODES_DIR}/${filename}`;

  // Encode file content as base64 for GitHub API
  const content = btoa(String.fromCharCode(...bytes));

  try {
    // Support both "token" and "Bearer" authorization formats
    // Classic tokens use "token", fine-grained tokens use "Bearer"
    const authHeader = githubToken.startsWith('ghp_') || githubToken.startsWith('github_pat_')
      ? `Bearer ${githubToken}`
      : `token ${githubToken}`;

    // Check if file already exists
    let sha = null;
    try {
      const getResponse = await fetch(
        `https://api.github.com/repos/${ORG}/${REPO}/contents/${filePath}`,
        {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha; // Need SHA for update
      } else if (getResponse.status !== 404) {
        // If it's not a 404, there's an error
        const errorData = await getResponse.json().catch(() => ({}));
        console.error('Error checking file existence:', errorData);
      }
    } catch (e) {
      // File doesn't exist, will create new
      console.log('File does not exist, will create new');
    }

    // Upload or update file
    const uploadResponse = await fetch(
      `https://api.github.com/repos/${ORG}/${REPO}/contents/${filePath}`,
      {
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
      }
    );

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || uploadResponse.statusText;
      console.error('GitHub API error details:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorData
      });
      throw new Error(`GitHub API error (${uploadResponse.status}): ${errorMessage}`);
    }

    const result = await uploadResponse.json();
    
    // Return raw GitHub URL
    const rawUrl = `https://raw.githubusercontent.com/${ORG}/${REPO}/${BRANCH}/${filePath}`;
    return rawUrl;
  } catch (error) {
    console.error('Error uploading QR code to GitHub:', error);
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

