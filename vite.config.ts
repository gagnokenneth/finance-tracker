/// <reference types="vite/client" />
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// Repo is published at https://<user>.github.io/expense/ — base only applies to the build.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/expense/' : '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
}))
