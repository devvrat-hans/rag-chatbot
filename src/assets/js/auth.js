/**
 * Authentication module for Supabase Auth
 * Exports: initAuth, signIn, signUp, signOut, getCurrentUser, getCurrentSession
 */

import { showToast, TEXT_CONSTANTS } from './utils.js';
import { getConfig, validateConfig } from './config.js';

// Get configuration from environment variables
const config = getConfig();
validateConfig(config);

const supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

// Export supabase client for use in other modules
export { supabase };

let currentUser = null;

/**
 * Initialize authentication system
 */
export function initAuth() {
  // Check for existing session
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      currentUser = session.user;
      showAuthenticatedUI();
    } else {
      showUnauthenticatedUI();
    }
  });

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      showAuthenticatedUI();
      showToast(TEXT_CONSTANTS.AUTH_SUCCESS);
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      showUnauthenticatedUI();
    }
  });

  setupAuthEventListeners();
}

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 */
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    showToast(error.message, 'error');
    return { success: false, error };
  }
}

/**
 * Sign up with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 */
export async function signUp(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    showToast('Check your email for verification link');
    return { success: true, data };
  } catch (error) {
    showToast(error.message, 'error');
    return { success: false, error };
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

/**
 * Get current authenticated user
 * @returns {Object|null} Current user or null
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Get current session
 * @returns {Promise<Object>} Session data
 */
export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

function showAuthenticatedUI() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('app-section').style.display = 'block';
  
  // Update navbar
  const userEmail = document.getElementById('user-email');
  const signoutBtn = document.getElementById('signout-btn');
  if (userEmail && currentUser) {
    userEmail.textContent = currentUser.email;
  }
  if (signoutBtn) {
    signoutBtn.style.display = 'block';
  }
}

function showUnauthenticatedUI() {
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('app-section').style.display = 'none';
  
  // Update navbar
  const userEmail = document.getElementById('user-email');
  const signoutBtn = document.getElementById('signout-btn');
  if (userEmail) {
    userEmail.textContent = '';
  }
  if (signoutBtn) {
    signoutBtn.style.display = 'none';
  }
}

function setupAuthEventListeners() {
  // Sign in form
  document.getElementById('signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    await signIn(email, password);
  });

  // Sign up form
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    await signUp(email, password);
  });

  // Toggle forms
  document.getElementById('show-signup').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
  });

  document.getElementById('show-signin').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
  });
}

export { supabase };
