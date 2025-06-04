/**
 * Navigation bar functionality
 * Exports: initNavbar
 */

import { signOut } from './auth.js';

/**
 * Initialize navigation bar
 */
export function initNavbar() {
  loadNavbarTemplate();
}

async function loadNavbarTemplate() {
  try {
    const response = await fetch('../templates/shared/navbar.html');
    const html = await response.text();
    document.getElementById('navbar-container').innerHTML = html;
    
    // Setup signout listener
    const signoutBtn = document.getElementById('signout-btn');
    if (signoutBtn) {
      signoutBtn.addEventListener('click', signOut);
    }
  } catch (error) {
    console.error('[navbar] Error loading template:', error);
  }
}