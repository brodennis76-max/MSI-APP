// Configuration for your SQL server API
export const SERVER_CONFIG = {
  // Replace with your actual company server URL
  baseUrl: 'https://your-company-server.com/api',
  
  // API endpoints
  endpoints: {
    accountInstructions: '/account-instructions',
    // Add more endpoints as needed
  },
  
  // Authentication (if required)
  auth: {
    // Add your authentication method here
    // For example: Bearer token, API key, etc.
    type: 'bearer', // 'bearer', 'api-key', 'basic', etc.
    token: '', // Will be set at runtime
  },
  
  // Request timeout (in milliseconds)
  timeout: 30000,
  
  // Retry configuration
  retry: {
    attempts: 3,
    delay: 1000, // milliseconds
  }
};

// Helper function to build API URLs
export const buildApiUrl = (endpoint) => {
  return `${SERVER_CONFIG.baseUrl}${endpoint}`;
};

// Helper function to get headers
export const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Add authentication header if configured
  if (SERVER_CONFIG.auth.type === 'bearer' && SERVER_CONFIG.auth.token) {
    headers['Authorization'] = `Bearer ${SERVER_CONFIG.auth.token}`;
  } else if (SERVER_CONFIG.auth.type === 'api-key' && SERVER_CONFIG.auth.token) {
    headers['X-API-Key'] = SERVER_CONFIG.auth.token;
  }
  
  return headers;
};
























