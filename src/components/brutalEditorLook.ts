import { panelClass, smallButtonBase } from './brutal.tsx'
import type { EditorLook } from './RichTextEditor.tsx'

/** RichTextEditor's chrome (the Edit Task modal). Its
 *  own module: a component file may only export components and primitives. */
export const brutalEditorLook: EditorLook = {
  frame: 'border border-black bg-white',
  toolbar: 'flex items-center gap-1.5 border-b border-black bg-neutral-100 px-2 py-1.5',
  button: `${smallButtonBase} px-2 py-0.5`,
  active: 'bg-black! text-white!',
  italicLabel: 'font-normal italic',
  content: 'p-3 font-mono text-xs text-black [&_.tiptap]:min-h-[86px]',
}

/** The same chrome full-page, as a note's body: a taller writing area under
 *  a hard shadow. */
export const brutalPageEditorLook: EditorLook = {
  ...brutalEditorLook,
  frame: panelClass,
  toolbar: 'flex items-center gap-1.5 border-b border-black bg-neutral-100 px-3 py-2',
  content: 'p-4 font-mono text-sm text-black [&_.tiptap]:min-h-[300px]',
}
