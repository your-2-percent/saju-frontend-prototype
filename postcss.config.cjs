// postcss.config.cjs
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},  // ✅ v4 전용 플러그인
    autoprefixer: {},
  },
};
