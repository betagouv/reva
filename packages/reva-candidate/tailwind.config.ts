const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      animation: {
        "spin-slow": "spin 3s linear infinite",
      },
      colors: {
        blue: { 600: "#0078f3" },
        gray: { 450: "#8C8E97" },
        neutral: {
          100: "#F6F6F6",
          200: "#E5E5E5",
          300: "#DDDDDD",
          400: "#929292",
          500: "#666666",
          700: "#3A3A3A",
          900: "#161616",
        },
        purple: { 100: "#F6E0FF", 800: "#89509F" },
        slate: {
          50: "#fbfbff",
          100: "#f3f3fe",
          200: "#e8e8f5",
          400: "#A1A0BA",
          500: "#9A99AD",
          600: "#7c7c9d",
          800: "#19182f",
          900: "#21203D",
        },
        dsfrBlue: {
          200: "#F5F5FE",
          300: "#E3E3FD",
          400: "#0063cb",
          500: "#000091",
        },
        dsfrGray: {
          50: "#F6F6F6",
          200: "#DDD",
          500: "#666666",
          700: "#3A3A3A",
          800: "#161616",
          //
          contrast: "#EEEEEE",
          altblueFrance: "#F5F5FE",
          mentionGrey: "#666666",
          labelGrey: "#161616",
          defaultGrey: "#FFFFFF",
          titleGrey: "#161616",
        },
        dsfrOrange: { 500: "#f94608" },
        //
        dsfr: {
          "blue-france-sun-113": "#000091",
          orange: { 500: "#f94608" },
          "light-text-mention-grey": "#666666",
          "light-neutral-grey-1000": "#F6F6F6",
          "light-decisions-text-default-warning": "#B34000",
          "light-decisions-background-contrast-warning": "#FFE9E6",
          "light-decisions-border-border-default-grey": "#DDDDDD",
          "light-decisions-border-border-disabled-grey": "#E5E5E5",
          "light-decisions-text-disabled-grey": "#929292",
          "light-decisions-background-background-alt-blue-france": "#F5F5FE",
        },
        fvae: {
          red: {
            100: "#FFE7DF",
            800: "#664033",
          },
          "hard-red": "#FFA180",
        },
      },
      fontFamily: {
        sans: ["Marianne", ...defaultTheme.fontFamily.sans],
      },
      screens: {
        sm: "576px",
        md: "768px",
        lg: "992px",
        xl: "1248px",
      },
      listStyleType: {
        square: "square",
      },
      boxShadow: {
        lifted: "0 6px 18px rgba(0, 0, 18, 16%)",
      },
    },
  },
};
