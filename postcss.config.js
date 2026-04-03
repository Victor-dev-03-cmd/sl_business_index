module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    'autoprefixer': {},
    'postcss-preset-env': {
      stage: 2,
      features: { 'nesting-rules': true }
    }
  }
}
