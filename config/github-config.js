/**
 * GitHub Configuration
 * 
 * IMPORTANT: Do not commit your GitHub token to version control!
 * 
 * SETUP INSTRUCTIONS:
 * 
 * Step 1: Get a GitHub Personal Access Token
 *   1. Go to: https://github.com/settings/tokens
 *   2. Click "Generate new token (classic)"
 *   3. Name it: "MSI App QR Code Upload"
 *   4. Check the 'repo' permission checkbox
 *   5. Click "Generate token"
 *   6. Copy the token (it starts with 'ghp_')
 * 
 * Step 2: Set the token below
 *   Option A: Replace 'YOUR_GITHUB_TOKEN_HERE' with your actual token
 *   Option B: Create a .env file with: GITHUB_TOKEN=your_token_here
 * 
 * See GITHUB_TOKEN_SETUP.md for detailed instructions.
 */

export const GITHUB_CONFIG = {
  // GitHub Personal Access Token with 'repo' permissions
  // Replace 'YOUR_GITHUB_TOKEN_HERE' with your actual token from GitHub
  // Or use environment variable: GITHUB_TOKEN=your_token_here
  token: process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN_HERE',
  
  // GitHub repository information
  org: 'brodennis76-max',
  repo: 'MSI-APP',
  branch: 'main',
};

/**
 * Get the GitHub token
 * @returns {string} - GitHub Personal Access Token
 */
export function getGitHubToken() {
  const token = GITHUB_CONFIG.token;
  // Check if token is set (not empty and not the placeholder)
  if (!token || token === 'YOUR_GITHUB_TOKEN_HERE') {
    console.warn('GitHub token is not set. Please configure it in config/github-config.js');
    return '';
  }
  return token;
}



