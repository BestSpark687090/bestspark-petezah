// @ts-check
/**
 * Ultraviolet configuration object.
 *
 * @typedef {Object} UVConfig
 * @property {string} prefix - URL prefix used for service routing.
 * @property {function(string):string} encodeUrl - Function to encode a URL using XOR codec.
 * @property {function(string):string} decodeUrl - Function to decode a URL using XOR codec.
 * @property {string} handler - Path to the handler script.
 * @property {string} client - Path to the client script.
 * @property {string} bundle - Path to the bundle script.
 * @property {string} config - Path to the config script.
 * @property {string} sw - Path to the service worker script.
 */
/** @type {UVConfig} */
import __uv$config from '/petezah/config.js';
__uv$config.prefix = '/petezah/petezah';
/** @type {UVConfig} */
export default __uv$config;
