// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';


// https://astro.build/config
export default defineConfig({
  site: 'https://alx005dp.github.io',
  // base: '/marco-aldany-peluqueria',
  integrations: [react()]
});
