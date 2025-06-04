/**
 * File upload module for document processing
 * Exports: initFileUpload, uploadFiles, loadUploadedFiles
 */

import { showToast, validateFile, formatFileSize, TEXT_CONSTANTS, fetchWithTimeout } from './utils.js';
import { getCurrentSession, supabase } from './auth.js';
import { getConfig } from './config.js';

const config = getConfig();

/**
 * Initialize file upload functionality
 */
export function initFileUpload() {
  const uploadBtn = document.getElementById('upload-btn');
  const fileInput = document.getElementById('file-input');

  uploadBtn.addEventListener('click', handleUpload);
  fileInput.addEventListener('change', updateFileList);
  
  // Load existing files
  loadUploadedFiles();
}

/**
 * Handle file upload process
 */
async function handleUpload() {
  const fileInput = document.getElementById('file-input');
  const files = Array.from(fileInput.files);

  if (files.length === 0) {
    showToast('Please select files to upload', 'warning');
    return;
  }

  const uploadBtn = document.getElementById('upload-btn');
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<span class="spinner"></span> Uploading...';

  try {
    for (const file of files) {
      await uploadSingleFile(file);
    }
    fileInput.value = '';
    updateFileList();
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Upload Files';
  }
}

/**
 * Upload a single file
 * @param {File} file - File to upload
 */
async function uploadSingleFile(file) {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    showToast(validation.error, 'error');
    return;
  }

  try {
    const session = await getCurrentSession();
    if (!session) {
      showToast('Please sign in to upload files', 'error');
      return;
    }

    // Upload to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${session.user.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Insert document record
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        name: file.name,
        uploaded_by: session.user.id,
        file_path: filePath,
      })
      .select()
      .single();

    if (docError) throw docError;

    // Call extract-embeddings Edge Function
    const response = await fetchWithTimeout(`${config.SUPABASE_URL}/functions/v1/extract-embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        filePath: filePath,
        fileName: file.name,
        userId: session.user.id,
        documentId: docData.id,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to process document');
    }

    showToast(`${file.name} uploaded successfully`);
    loadUploadedFiles();

  } catch (error) {
    console.error('[file-upload] Error:', error);
    showToast(`Failed to upload ${file.name}: ${error.message}`, 'error');
  }
}

/**
 * Update file list display
 */
function updateFileList() {
  const fileInput = document.getElementById('file-input');
  const files = Array.from(fileInput.files);
  const container = document.getElementById('upload-status');

  if (files.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <h4>Selected Files:</h4>
    <ul>
      ${files.map(file => `
        <li>${file.name} (${formatFileSize(file.size)})</li>
      `).join('')}
    </ul>
  `;
}

/**
 * Load and display uploaded files
 */
export async function loadUploadedFiles() {
  try {
    const session = await getCurrentSession();
    if (!session) return;

    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('uploaded_by', session.user.id)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    const container = document.getElementById('uploaded-files');
    if (documents.length === 0) {
      container.innerHTML = '<p>No documents uploaded yet.</p>';
      return;
    }

    container.innerHTML = `
      <h4>Your Documents:</h4>
      <ul>
        ${documents.map(doc => `
          <li>
            <strong>${doc.name}</strong>
            <small>(${new Date(doc.uploaded_at).toLocaleDateString()})</small>
          </li>
        `).join('')}
      </ul>
    `;

  } catch (error) {
    console.error('[file-upload] Error loading files:', error);
  }
}
