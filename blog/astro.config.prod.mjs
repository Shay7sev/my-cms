// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  site: "https://astro.shay7sev.site",
  trailingSlash: "always",
  integrations: [mdx(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
  },
  //   output: "server",
  adapter: node({
    mode: "standalone",
  }),
  server: {
    host: true, // 等价 0.0.0.0
    port: 4321,
    allowedHosts: ["astro.shay7sev.site"],
  },
});
