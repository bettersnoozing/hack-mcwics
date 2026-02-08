module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        'mui': '0.5rem', // 8px
      },
      boxShadow: {
        'mui': '0 1px 3px 0 rgba(60,64,67,.15), 0 1px 1px 0 rgba(60,64,67,.15)',
        'mui-hover': '0 4px 20px 0 rgba(60,64,67,.15), 0 1.5px 4px 0 rgba(60,64,67,.15)',
      },
      colors: {
        'mui-primary': '#1976d2',
        'mui-primary-dark': '#115293',
        'mui-secondary': '#9c27b0',
        'mui-bg': '#fff',
        'mui-surface': '#f5f5f5',
        'mui-border': '#e0e0e0',
      },
    },
  },
  plugins: [],
}
