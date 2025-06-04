/**
 * Footer functionality
 * Exports: initFooter
 */

/**
 * Initialize footer
 */
export function initFooter() {
  loadFooterTemplate();
}

async function loadFooterTemplate() {
  try {
    const response = await fetch('../templates/shared/footer.html');
    const html = await response.text();
    document.getElementById('footer-container').innerHTML = html;
  } catch (error) {
    console.error('[footer] Error loading template:', error);
  }
}