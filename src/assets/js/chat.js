/**
 * Chat functionality for RAG queries
 * Exports: initChat, sendMessage
 */

import { showToast, fetchWithTimeout, TEXT_CONSTANTS } from './utils.js';
import { getCurrentSession } from './auth.js';
import { getConfig } from './config.js';

const config = getConfig();

/**
 * Initialize chat functionality
 */
export function initChat() {
  const sendBtn = document.getElementById('send-btn');
  const chatInput = document.getElementById('chat-input');

  sendBtn.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  });
}

/**
 * Handle sending a chat message
 */
async function handleSendMessage() {
  const chatInput = document.getElementById('chat-input');
  const query = chatInput.value.trim();

  if (!query) {
    showToast('Please enter a question', 'warning');
    return;
  }

  chatInput.value = '';
  addMessageToChat(query, 'user');

  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spinner"></span>';

  // Add thinking indicator
  const thinkingId = addThinkingIndicator();

  try {
    const session = await getCurrentSession();
    if (!session) {
      showToast('Please sign in to chat', 'error');
      return;
    }

    const response = await fetchWithTimeout(`${config.SUPABASE_URL}/functions/v1/query-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        query: query,
        userId: session.user.id,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response');
    }

    const data = await response.json();
    removeThinkingIndicator(thinkingId);
    addMessageToChat(data.answer, 'assistant', data.sourceChunks);

  } catch (error) {
    console.error('[chat] Error:', error);
    removeThinkingIndicator(thinkingId);
    addMessageToChat('Sorry, I encountered an error. Please try again.', 'assistant');
    showToast(TEXT_CONSTANTS.CHAT_ERROR, 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
  }
}

/**
 * Add message to chat display
 * @param {string} message - Message text
 * @param {string} role - Message role (user/assistant)
 * @param {Array} sourceChunks - Source chunks for citations
 */
function addMessageToChat(message, role, sourceChunks = []) {
  const messagesContainer = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message-bubble message-${role}`;

  let content = `<p>${message}</p>`;
  
  if (sourceChunks && sourceChunks.length > 0) {
    content += `
      <details style="margin-top: 10px;">
        <summary style="cursor: pointer; font-size: 0.9em; opacity: 0.8;">
          Sources (${sourceChunks.length})
        </summary>
        <div style="margin-top: 5px; font-size: 0.8em; opacity: 0.7;">
          ${sourceChunks.map((chunk, idx) => 
            `<div>Source ${idx + 1} (relevance: ${(chunk.score * 100).toFixed(1)}%)</div>`
          ).join('')}
        </div>
      </details>
    `;
  }

  messageDiv.innerHTML = content;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Add thinking indicator
 * @returns {string} Indicator ID
 */
function addThinkingIndicator() {
  const messagesContainer = document.getElementById('chat-messages');
  const thinkingDiv = document.createElement('div');
  const thinkingId = `thinking-${Date.now()}`;
  
  thinkingDiv.id = thinkingId;
  thinkingDiv.className = 'message-bubble message-assistant';
  thinkingDiv.innerHTML = '<span class="spinner"></span> Thinking...';
  
  messagesContainer.appendChild(thinkingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  return thinkingId;
}

/**
 * Remove thinking indicator
 * @param {string} thinkingId - Indicator ID to remove
 */
function removeThinkingIndicator(thinkingId) {
  const thinkingDiv = document.getElementById(thinkingId);
  if (thinkingDiv) {
    thinkingDiv.remove();
  }
}
