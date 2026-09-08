import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

const TOOLBAR_BUTTON =
  'rounded-md px-2 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink'
const TOOLBAR_BUTTON_ACTIVE = 'bg-brand/10 text-brand'

/**
 * A minimal WYSIWYG editor for a Note's freeform body. Stores content as
 * HTML (editor.getHTML()) — bodyPreview in lib/notes.ts strips tags back out
 * for the one-line list summary.
 */
export function RichTextEditor({
  value,
  onChange,
  autoFocus,
}: {
  value: string
  onChange: (html: string) => void
  autoFocus?: boolean
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
    <div className="rounded-lg border border-edge bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
      <div className="flex items-center gap-1 border-b border-edge px-2 py-1">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${TOOLBAR_BUTTON} ${editor.isActive('bold') ? TOOLBAR_BUTTON_ACTIVE : ''}`}
        >
          Bold
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${TOOLBAR_BUTTON} ${editor.isActive('italic') ? TOOLBAR_BUTTON_ACTIVE : ''}`}
        >
          Italic
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${TOOLBAR_BUTTON} ${editor.isActive('bulletList') ? TOOLBAR_BUTTON_ACTIVE : ''}`}
        >
          Bullets
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${TOOLBAR_BUTTON} ${editor.isActive('orderedList') ? TOOLBAR_BUTTON_ACTIVE : ''}`}
        >
          Numbered
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="px-3 py-2 text-sm text-ink [&_.tiptap]:min-h-24 [&_.tiptap]:outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  )
}
