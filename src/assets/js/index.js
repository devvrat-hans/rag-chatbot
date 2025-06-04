/**
 * Main application entry point
 * Initializes all modules and components
 */

import { initAuth } from './auth.js';
import { initFileUpload } from './file-upload.js';
import { initChat } from './chat.js';
import { initNavbar } from './navbar.js';
import { initFooter } from './footer.js';
import { redirectToConfigIfNeeded } from './config.js';

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', () => {
  // Check if configuration is set up, redirect if needed
  redirectToConfigIfNeeded();
  
  // Initialize components
  initNavbar();
  initFooter();
  initAuth();
  initFileUpload();
  initChat();
});
