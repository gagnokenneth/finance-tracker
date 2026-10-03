import type { ReactNode, SVGProps } from 'react'

/** Shared stroke treatment for the compact action icons below. A caller's
 *  className replaces `defaultSize` rather than stacking on it. */
function IconBase({
  children,
  defaultSize = 'size-[18px]',
  className,
  ...props
}: SVGProps<SVGSVGElement> & { children: ReactNode; defaultSize?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
      className={`shrink-0 ${className ?? defaultSize}`}
    >
      {children}
    </svg>
  )
}

/** Used on Edit buttons across every module — a compact icon in place of the text label. */
export function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props} defaultSize="size-3.5">
      <path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.83l-1.17-1.17a2 2 0 0 0-2.83 0L4 15.5V20z" />
      <path d="M13.5 6.5l4 4" />
    </IconBase>
  )
}

/** Used on Delete buttons across every module — a compact icon in place of the text label. */
export function DeleteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props} defaultSize="size-3.5">
      <path d="M5 7h14" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </IconBase>
  )
}

/** A date field's affordance — BrutalDatePicker. */
export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props} defaultSize="size-4">
      <rect x="4" y="5" width="16" height="15" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </IconBase>
  )
}

/** The mobile nav's toggle — three bars while closed. */
export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase strokeWidth={2} strokeLinecap="square" {...props} defaultSize="size-4">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  )
}

/** The mobile nav's toggle while open. */
export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase strokeWidth={2} strokeLinecap="square" {...props} defaultSize="size-4">
      <path d="M6 6l12 12M18 6L6 18" />
    </IconBase>
  )
}
