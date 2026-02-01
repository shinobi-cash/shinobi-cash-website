import { defineConfig } from 'vocs';

export default defineConfig({
  title: 'Shinobi Cash',
  description: 'Cross-chain privacy protocol powered by Privacy Pools and zero-knowledge proofs',
  logoUrl: {
    light: '/logo.svg',
    dark: '/logo.svg',
  },
  iconUrl: '/logo.svg',

  // Navigation sidebar
  sidebar: [
    {
      text: 'Getting Started',
      items: [
        { text: 'Introduction', link: '/' },
        { text: 'Quick Start', link: '/quick-start' },
      ],
    },
    {
      text: 'How It Works',
      items: [
        { text: 'Privacy Pools', link: '/concepts/privacy-pools' },
        { text: 'Cross-Chain Architecture', link: '/concepts/cross-chain' },
        { text: 'Compliance', link: '/concepts/compliance' },
      ],
    },
    {
      text: 'Security & Trust',
      items: [
        { text: 'Threat Model', link: '/concepts/threat-model' },
        { text: 'Trust Assumptions', link: '/concepts/trust-assumptions' },
      ],
    },
    {
      text: 'Guides',
      items: [
        { text: 'Depositing', link: '/guides/deposit' },
        { text: 'Withdrawing', link: '/guides/withdraw' },
      ],
    },
    {
      text: 'Smart Contracts',
      items: [
        { text: 'Overview', link: '/contracts/' },
        { text: 'Entrypoint', link: '/contracts/entrypoint' },
        { text: 'Privacy Pool', link: '/contracts/pool' },
        { text: 'OIF Settlers', link: '/contracts/settlers' },
        { text: 'Paymasters', link: '/contracts/paymasters' },
      ],
    },
    {
      text: 'SDK',
      items: [
        { text: 'Overview', link: '/sdk/' },
        { text: 'Core Package', link: '/sdk/core' },
        { text: 'Constants', link: '/sdk/constants' },
        { text: 'Data Package', link: '/sdk/data' },
      ],
    },
    {
      text: 'Resources',
      items: [
        { text: 'FAQ', link: '/faq' },
        { text: 'Testnet', link: 'https://testnet.shinobi.cash' },
      ],
    },
  ],

  // Top navigation
  topNav: [
    { text: 'Docs', link: '/' },
    { text: 'App', link: 'https://testnet.shinobi.cash' },
    {
      text: 'GitHub',
      items: [
        { text: 'Website & App', link: 'https://github.com/shinobi-cash/shinobi.cash-website' },
        { text: 'Smart Contracts', link: 'https://github.com/shinobi-cash/shinobi.cash-contracts' },
      ],
    },
  ],

  // Social links
  socials: [
    {
      icon: 'github',
      link: 'https://github.com/shinobi-cash',
    },
    {
      icon: 'x',
      link: 'https://twitter.com/ShinobiCash',
    },
  ],

  // Theme customization - Orange accent to match Shinobi branding
  theme: {
    accentColor: {
      light: '#ea580c', // orange-600
      dark: '#f97316',  // orange-500
    },
  },
});
