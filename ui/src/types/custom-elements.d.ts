import type { DetailedHTMLProps, HTMLAttributes } from "react"

type Element<Attrs> = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & Attrs

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "eye-ascii": Element<{ mode?: string; color?: string; framing?: string; ramp?: string; glitch?: string }>
      "ascii-bg": Element<{ dim?: string }>
    }
  }
}

declare global {
  interface Window {
    [trigger: `ory${string}`]: (() => void) | undefined
  }
}
