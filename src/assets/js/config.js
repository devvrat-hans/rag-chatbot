/**
 * Configuration module for environment variables
 * Exports: getConfig, validateConfig, isConfigured
 */

/**
 * Get configuration from localStorage or environment variables
 * @returns {Object} Configuration object with Supabase credentials
 */
export function getConfig() {
  // Try to get configuration from localStorage (for frontend deployment)
  if (typeof window !== 'undefined') {
    const savedConfig = localStorage.getItem('RAG_CHATBOT_CONFIG');
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch (error) {
        console.error('Error parsing saved configuration:', error);
      }
    }
  }
  
  // Fallback to environment variables (for development or server-side)
  if (typeof process !== 'undefined' && process.env) {
    return {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    };
  }
  
  // Return empty config if nothing is available
  return {
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
  };
}

/**
 * Check if the application is properly configured
 * @returns {boolean} True if configured, false otherwise
 */
export function isConfigured() {
  const config = getConfig();
  return !!(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && 
           config.SUPABASE_URL !== 'your_supabase_project_url_here' &&
           config.SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here');
}

/**
 * Validate that required configuration is present
 * @param {Object} config - Configuration object
 * @throws {Error} If required configuration is missing
 */
export function validateConfig(config) {
  if (!config.SUPABASE_URL || config.SUPABASE_URL === 'your_supabase_project_url_here') {
    throw new Error('SUPABASE_URL is not configured. Please configure your credentials.');
  }
  
  if (!config.SUPABASE_ANON_KEY || config.SUPABASE_ANON_KEY === 'your_supabase_anon_key_here') {
    throw new Error('SUPABASE_ANON_KEY is not configured. Please configure your credentials.');
  }
}

/**
 * Redirect to configuration page if not configured
 */
export function redirectToConfigIfNeeded() {
  if (typeof window !== 'undefined' && !isConfigured()) {
    const currentPage = window.location.pathname;
    if (!currentPage.includes('config.html')) {
      window.location.href = 'config.html';
    }
  }
}
