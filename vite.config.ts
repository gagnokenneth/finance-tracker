/// <reference types="vite/client" />
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// Repo is published at https://<user>.github.io/finance-tracker/ — base only
// applies to the build, so dev still serves from /.
// Must match the GitHub repo name; a mismatch 404s every asset.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/finance-tracker/' : '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
}))
