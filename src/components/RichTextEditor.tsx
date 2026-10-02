import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { Editor } from '@tiptap/react'

/** Class sets for the editor's chrome. The default is the original rounded
 *  look (Notes); a migrated screen passes its own (brutalEditorLook). */
export interface EditorLook {
  frame: string
  toolbar: string
  button: string
  active: string
  /** Extra classes on the Italic button's own label. */
  italicLabel: string
  content: string
}

const DEFAULT_LOOK: EditorLook = {
  frame: 'rounded-lg border border-edge bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15',
  toolbar: 'flex items-center gap-1 border-b border-edge px-2 py-1',
  button: 'rounded-md px-2 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink',
  active: 'bg-brand/10 text-brand',
  italicLabel: '',
  content: 'px-3 py-2 text-sm text-ink [&_.tiptap]:min-h-24',
}

const TOOLS: Array<{ label: string; mark: string; toggle: (editor: Editor) => void }> = [
  { label: 'Bold', mark: 'bold', toggle: (e) => e.chain().focus().toggleBold().run() },
  { label: 'Italic', mark: 'italic', toggle: (e) => e.chain().focus().toggleItalic().run() },
  { label: 'Bullets', mark: 'bulletList', toggle: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Numbered', mark: 'orderedList', toggle: (e) => e.chain().focus().toggleOrderedList().run() },
]

/**
 * A minimal WYSIWYG editor for a Note's freeform body. Stores content as
 * HTML (editor.getHTML()) — bodyPreview in lib/notes.ts strips tags back out
 * for the one-line list summary.
 */
export function RichTextEditor({
  value,
  onChange,
  autoFocus,
  look: ui = DEFAULT_LOOK,
}: {
  value: string
  onChange: (html: string) => void
  autoFocus?: boolean
  look?: EditorLook
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    autofocus: autoFocus ? 'end' : false,
    onBlur: ({ editor }) => onChange(editor.getHTML()),
  })

  // Re-seed the editor when `value` changes out from under it (a query
  // refetch, an optimistic-update rollback) — useEditor only reads `content`
  // on mount, so without this the editor keeps showing stale text and a
  // later blur would write it back over the newer server value.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value)
  }, [editor, value])

  if (!editor) return null

  return (
    <div className={ui.frame}>
      <div className={ui.toolbar}>
        {TOOLS.map((tool) => (
          <button
            key={tool.mark}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => tool.toggle(editor)}
            className={`${ui.button} ${editor.isActive(tool.mark) ? ui.active : ''}`}
          >
            <span className={tool.mark === 'italic' ? ui.italicLabel : ''}>{tool.label}</span>
          </button>
        ))}
      </div>
      <EditorContent
        editor={editor}
        className={`${ui.content} [&_.tiptap]:outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5`}
      />
    </div>
  )
}
