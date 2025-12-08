export default {
  rules: {
    'sort-labels': (await import('./lib/rules/sorted.js')).default
  }
};
