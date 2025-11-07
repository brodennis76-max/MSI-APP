/**
 * GitHub Configuration
 * 
 * IMPORTANT: Do not commit your GitHub token to version control!
 * Add this file to .gitignore or store the token in a secure location.
 * 
 * To get a GitHub Personal Access Token:
 * 1. Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
 * 2. Generate a new token with 'repo' permissions
 * 3. Copy the token and set it below
 */

export const GITHUB_CONFIG = {
  // GitHub Personal Access Token with 'repo' permissions
  // Option 1: Set directly here (NOT recommended for production - use environment variable)
  // Option 2: Use environment variable GITHUB_TOKEN
  // IMPORTANT: Replace 'YOUR_GITHUB_TOKEN_HERE' with your actual token
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



