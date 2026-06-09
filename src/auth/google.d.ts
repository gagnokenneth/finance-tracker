export {}

interface GoogleIdConfig {
  client_id: string
  callback: (response: { credential: string }) => void
}

interface GoogleButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'small' | 'medium' | 'large'
  text?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: GoogleIdConfig): void
          renderButton(parent: HTMLElement, options: GoogleButtonOptions): void
          prompt(): void
          disableAutoSelect(): void
        }
      }
    }
  }
}
