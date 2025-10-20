export default {
  rules: {
    'sort-labels': (await import('./rules/sort-json.js')).default
  }
};
