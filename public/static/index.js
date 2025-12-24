// @ts-check

import __uv$config from './config.js';
import { assertForm, assertInput, assertParagraph, assertPre } from './HtmlNullCheck.js';
import { registerSW } from './register-sw.js';
import { search } from './search.js';

const form = document.getElementById('uv-form');
assertForm(form);
const address = document.getElementById('uv-address');
assertInput(address);
const searchEngine = document.getElementById('uv-search-engine');
assertInput(searchEngine);
const error = document.getElementById('uv-error');
assertParagraph(error);
const errorCode = document.getElementById('uv-error-code');
assertPre(errorCode);

// Attach form submit event listener
form.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await registerSW();
  } catch (err) {
    error.textContent = 'Failed to register service worker.';
    errorCode.textContent = err.toString();
    throw err;
  }

  const url = search(address.value, searchEngine.value);
  location.href = __uv$config.prefix + __uv$config.encodeUrl(url);
});

/**
 * Autofill function with auto-submit
 * @param {string} url
 */
export function autofill(url) {
  address.value = url;
  form.requestSubmit(); // Automatically submit the form
}
