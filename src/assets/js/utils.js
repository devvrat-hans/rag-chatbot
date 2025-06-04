/**
 * Utility functions for the RAG Chatbot application
 * Exports: fetchWithTimeout, showToast, validateFile, formatFileSize, TEXT_CONSTANTS
 */

export const TEXT_CONSTANTS = {
  UPLOAD_SUCCESS: 'File uploaded successfully',
  UPLOAD_ERROR: 'Failed to upload file',
  AUTH_SUCCESS: 'Authentication successful',
  AUTH_ERROR: 'Authentication failed',
  CHAT_ERROR: 'Failed to send message',
  FILE_TOO_LARGE: 'File size must be less than 10MB',
  INVALID_FILE_TYPE: 'Only PDF, TXT, and DOCX files are supported',
};

/**
 * Fetch with timeout wrapper
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch response
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, warning)
 */
export function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}

/**
 * Validate file type and size
 * @param {File} file - File to validate
 * @returns {Object} Validation result
 */
export function validateFile(file) {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (file.size > MAX_SIZE) {
    return { valid: false, error: TEXT_CONSTANTS.FILE_TOO_LARGE };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: TEXT_CONSTANTS.INVALID_FILE_TYPE };
  }

  return { valid: true };
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
