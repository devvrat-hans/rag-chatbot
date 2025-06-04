/**
 * Status polling for document processing
 * Exports: pollEmbeddingStatus
 */

import { fetchWithTimeout } from './utils.js';
import { getCurrentSession } from './auth.js';
import { getConfig } from './config.js';

const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 30; // 1 minute total
const config = getConfig();

/**
 * Poll embedding status for a document
 * @param {string} documentId - Document ID to poll
 * @param {Function} onUpdate - Callback for status updates
 * @param {Function} onComplete - Callback when complete
 * @param {Function} onError - Callback for errors
 */
export async function pollEmbeddingStatus(documentId, onUpdate, onComplete, onError) {
  let attempts = 0;

  const poll = async () => {
    try {
      attempts++;
      const session = await getCurrentSession();
      if (!session) {
        onError('Session expired');
        return;
      }

      const response = await fetchWithTimeout(`${config.SUPABASE_URL}/functions/v1/embedding-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ documentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to check status');
      }

      const data = await response.json();
      
      if (data.status === 'completed') {
        onComplete(data);
        return;
      }

      if (data.status === 'error') {
        onError(data.error || 'Processing failed');
        return;
      }

      onUpdate(data);

      if (attempts < MAX_POLL_ATTEMPTS) {
        setTimeout(poll, POLL_INTERVAL);
      } else {
        onError('Processing timeout');
      }

    } catch (error) {
      console.error('[status-poller] Error:', error);
      if (attempts < MAX_POLL_ATTEMPTS) {
        setTimeout(poll, POLL_INTERVAL);
      } else {
        onError(error.message);
      }
    }
  };

  poll();
}
