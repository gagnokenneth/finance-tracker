import type { ReactNode, SVGProps } from 'react'

/** Shared stroke treatment for the compact action icons below. */
function IconBase({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-[18px] shrink-0"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Used on Edit buttons across every module — a compact icon in place of the text label. */
export function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props} className={`size-3.5 ${props.className ?? ''}`}>
      <path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.83l-1.17-1.17a2 2 0 0 0-2.83 0L4 15.5V20z" />
      <path d="M13.5 6.5l4 4" />
    </IconBase>
  )
}

/** Used on Delete buttons across every module — a compact icon in place of the text label. */
export function DeleteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props} className={`size-3.5 ${props.className ?? ''}`}>
      <path d="M5 7h14" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </IconBase>
  )
}
