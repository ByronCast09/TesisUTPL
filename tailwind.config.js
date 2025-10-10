module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,html,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        global: {
          background1: "var(--global-bg-1)",
          background2: "var(--global-bg-2)",
          background3: "var(--global-bg-3)",
          background4: "var(--global-bg-4)",
          background5: "var(--global-bg-5)",
          background6: "var(--global-bg-6)",
          background7: "var(--global-bg-7)",
          background8: "var(--global-bg-8)",
          background9: "var(--global-bg-9)",
          background10: "var(--global-bg-10)",
          background11: "var(--global-bg-11)",
          background12: "var(--global-bg-12)",
          background13: "var(--global-bg-13)",
          background14: "var(--global-bg-14)",
          text1: "var(--global-text-1)",
          text2: "var(--global-text-2)",
          text3: "var(--global-text-3)",
          text4: "var(--global-text-4)",
          text5: "var(--global-text-5)",
          text6: "var(--global-text-6)",
          text7: "var(--global-text-7)"
        },
        header: {
          background1: "var(--header-bg-1)",
          background2: "var(--header-bg-2)",
          background3: "var(--header-bg-3)",
          background4: "var(--header-bg-4)"
        },
        button: {
          text1: "var(--button-text-1)"
        },
        edittext: {
          background1: "var(--edittext-bg-1)"
        }
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        abyssinica: ['Abyssinica SIL', 'serif'],
        aeonik: ['Poppins', 'sans-serif'],
        montserrat: ['Poppins', 'sans-serif']
      }
    }
  },
  plugins: []
};