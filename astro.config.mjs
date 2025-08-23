import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import mdx from '@astrojs/mdx';
import expressiveCode from 'astro-expressive-code';

import tailwindcss from '@tailwindcss/vite';
import { remarkReadingTime } from './src/lib/remark-reading-time.mjs';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  compressHTML: true,
  site: 'https://mahdinur.net',
  integrations: [
    expressiveCode({
      themes: ['dark-plus', 'github-light-default'],
      themeCssSelector: (theme) => {
        return theme === 'dark-plus' ? '.dark' : ':not(.dark)';
      },
      defaultProps: {
        showLineNumbers: true,
        wrap: true,
      },
    }),
    react(),
    mdx({
      remarkPlugins: [remarkReadingTime],
      syntaxHighlight: false, // Disable MDX syntax highlighting since expressive-code handles it
    }),
    (await import('@playform/compress')).default(),
  ],

  prefetch: {
    defaultStrategy: 'viewport',
    prefetchAll: true,
  },

  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },

  build: {
    inlineStylesheets: 'always',
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
