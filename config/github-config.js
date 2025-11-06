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
  // Set this to your actual token or use an environment variable
  token: process.env.GITHUB_TOKEN || '',
  
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
  return GITHUB_CONFIG.token;
}


