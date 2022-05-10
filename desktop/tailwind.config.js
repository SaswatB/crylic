module.exports = {
  purge: false,
  theme: {
    extend: {
      backgroundOpacity: {
        10: "0.1",
      },
    },
  },
  variants: {},
  plugins: [],
  content: ["./src/**/*.{html,ts,tsx}", "../synergy/src/**/*.{html,ts,tsx}"],
};
