module.exports = {
  input: './src/index.js',
  output: [{
    file: 'dist/mdparser.js',
    format: 'iife',
    name: 'mdparser'
  }, {
    file: 'dist/mdparser.cjs.js',
    format: 'cjs'
  }]
};
