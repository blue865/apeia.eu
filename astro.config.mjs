import { defineConfig, sharpImageService } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://apeia.eu',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [sitemap()],
  image: {
    // Astrophotography needs every pixel: a 4K-wide original has
    // ~33 megapixels, which exceeds sharp's default `limitInputPixels`.
    // Bump it so the build doesn't reject large originals.
    service: sharpImageService({ limitInputPixels: 268_435_456 /* 16384² */ }),
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: true,
    },
  },
  vite: {
    ssr: {
      noExternal: ['js-yaml'],
    },
  },
});
