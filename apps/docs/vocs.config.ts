import { defineConfig } from "vocs";

export default defineConfig({
  title: "Shinobi Cash",
  description: "Crosschain privacy protocol powered by Privacy Pools and zero-knowledge proofs",
  logoUrl: {
    light: "/logo.svg",
    dark: "/logo.svg",
  },
  iconUrl: "/logo.svg",

  // Navigation sidebar
  sidebar: [
    {
      text: "Getting Started",
      items: [{ text: "Introduction", link: "/" }],
    },
    {
      text: "How It Works",
      items: [
        { text: "Privacy Pools", link: "/concepts/privacy-pools" },
        { text: "Crosschain Architecture", link: "/concepts/cross-chain" },
        { text: "Compliance", link: "/concepts/compliance" },
      ],
    },
    {
      text: "Guides",
      items: [
        { text: "Depositing", link: "/guides/deposit" },
        { text: "Withdrawing", link: "/guides/withdraw" },
      ],
    },
    {
      text: "Smart Contracts",
      items: [
        { text: "Overview", link: "/contracts/" },
        { text: "Entrypoints", link: "/contracts/entrypoint" },
        { text: "Privacy Pool", link: "/contracts/pool" },
        { text: "Shinobi x OIF", link: "/contracts/oif" },
        { text: "Paymasters", link: "/contracts/paymasters" },
      ],
    },
    {
      text: "SDK",
      items: [
        { text: "Overview", link: "/sdk/" },
        { text: "Core Package", link: "/sdk/core" },
        { text: "Constants", link: "/sdk/constants" },
        { text: "Data Package", link: "/sdk/data" },
      ],
    },
    {
      text: "Resources",
      items: [
        { text: "FAQ", link: "/faq" },
        { text: "Testnet", link: "https://testnet.shinobi.cash" },
      ],
    },
  ],

  // Top navigation
  topNav: [
    { text: "Docs", link: "/" },
    { text: "App", link: "https://testnet.shinobi.cash" },
    {
      text: "GitHub",
      items: [
        { text: "Website & App", link: "https://github.com/shinobi-cash/shinobi.cash-website" },
        { text: "Smart Contracts", link: "https://github.com/shinobi-cash/shinobi.cash-contracts" },
      ],
    },
  ],

  // Social links
  socials: [
    {
      icon: "github",
      link: "https://github.com/shinobi-cash",
    },
    {
      icon: "telegram",
      link: "https://t.me/+tRxvbyeFuDNmMzUx",
    },
  ],

  // Theme customization - Orange accent to match Shinobi branding
  theme: {
    accentColor: {
      light: "#ea580c", // orange-600
      dark: "#f97316", // orange-500
    },
  },
});
