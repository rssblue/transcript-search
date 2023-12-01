/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.svelte", "./src/**/*.html"],
  plugins: [require("@tailwindcss/typography"), require("@tailwindcss/forms")],
  future: {
    hoverOnlyWhenSupported: true,
  },
};
