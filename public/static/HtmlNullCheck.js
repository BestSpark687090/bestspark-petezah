// @ts-check
/**
 * @param {HTMLElement|null} el
 * @returns {asserts el is HTMLFormElement}
 * @throws {Error}
 */
function assertForm(el) {
  if (!el) throw new Error('Missing <form> element');
}
/**
 * @param {HTMLElement|null} el
 * @returns {asserts el is HTMLInputElement}
 * @throws {Error}
 */
function assertInput(el) {
  if (!el) throw new Error('Missing <input> element');
}
/**
 * @param {HTMLElement|null} el
 * @returns {asserts el is HTMLParagraphElement}
 * @throws {Error}
 */
function assertParagraph(el) {
  if (!el) throw new Error('Missing <p> element');
}
/**
 * @param {HTMLElement|null} el
 * @returns {asserts el is HTMLPreElement}
 * @throws {Error}
 */
function assertPre(el) {
  if (!el) throw new Error('Missing <pre> element');
}
export { assertForm, assertInput, assertParagraph, assertPre };
