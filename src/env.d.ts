/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'live'
  readonly VITE_APPS_SCRIPT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
