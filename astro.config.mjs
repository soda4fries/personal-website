import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import mdx from '@astrojs/mdx';

import tailwindcss from '@tailwindcss/vite';
import { remarkReadingTime } from './src/lib/remark-reading-time.mjs';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  compressHTML: true,
  site: 'https://mahdinur.net',
  integrations: [
    react(),
    mdx({
      remarkPlugins: [remarkReadingTime],
      syntaxHighlight: {
        type: 'shiki',
      },
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

  vite: {
    plugins: [tailwindcss()],
  },
});
