/**
 * Fetch available QR codes from GitHub repository
 * Uses GitHub API to list files in the qr-codes folder
 */

const GITHUB_ORG = 'brodennis76-max';
const GITHUB_REPO = 'MSI-APP';
const GITHUB_BRANCH = 'main';
const QR_CODES_FOLDER = 'qr-codes';

/**
 * Fetch list of QR code files from GitHub
 * @returns {Promise<Array<{name: string, path: string, downloadUrl: string}>>}
 */
export async function fetchGitHubQRCodes() {
  try {
    // Use GitHub API to get contents of qr-codes folder
    const apiUrl = `https://api.github.com/repos/${GITHUB_ORG}/${GITHUB_REPO}/contents/${QR_CODES_FOLDER}?ref=${GITHUB_BRANCH}`;
    
    console.log('📥 Fetching QR codes from GitHub:', apiUrl);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`QR codes folder not found in GitHub repository. Make sure the folder exists at: ${QR_CODES_FOLDER}`);
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const files = await response.json();
    
    // Filter for image files (PNG, JPG, JPEG, GIF)
    const imageFiles = files
      .filter(file => 
        file.type === 'file' && 
        /\.(png|jpg|jpeg|gif)$/i.test(file.name)
      )
      .map(file => ({
        name: file.name,
        path: file.path,
        downloadUrl: file.download_url,
        size: file.size
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
    
    console.log(`✅ Found ${imageFiles.length} QR code files in GitHub`);
    
    return imageFiles;
  } catch (error) {
    console.error('❌ Error fetching QR codes from GitHub:', error);
    throw error;
  }
}

/**
 * Get the raw GitHub URL for a QR code file
 * @param {string} fileName - Name of the QR code file
 * @returns {string} - Raw GitHub URL
 */
export function getGitHubQRCodeUrl(fileName) {
  return `https://raw.githubusercontent.com/${GITHUB_ORG}/${GITHUB_REPO}/${GITHUB_BRANCH}/${QR_CODES_FOLDER}/${encodeURIComponent(fileName)}`;
}

