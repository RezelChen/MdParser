module.exports = {
  input: './src/index.js',
  output: [{
    file: 'dist/mdparser.js',
    format: 'iife'
  }, {
    file: 'dist/mdparser.cjs.js',
    format: 'cjs'
  }]
};
