// @ts-check
import __uv$config from './config.js';
import { registerSW } from './register-sw.js';

('use strict');
let destination;

try {
  destination = new URL(location.hash.slice(1));

  if (
    destination.hostname.endsWith('.youtube.com') ||
    destination.hostname === 'youtube.com' ||
    destination.hostname === 'youtube-nocookie.com' ||
    destination.hostname.endsWith('.google.com') ||
    destination.hostname === 'google.com'
  ) {
    __uv$config.bare = '/api/bare-premium/bare/';
    self.__uv$config = __uv$config;
  }

  if (!destination.protocol) {
    destination = new URL('https://' + destination.href);
  }
} catch (err) {
  alert(`Bad # string or bad URL. Got error:\n${err}`);
  throw err;
}

registerSW()
  .then(() => {
    window.open(__uv$config.prefix + __uv$config.encodeUrl(destination.toString()), '_self');
  })
  .catch((err) => {
    alert(`Encountered error:\n${err}`);
  });
