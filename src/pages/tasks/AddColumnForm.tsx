import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { TextInput, RowButton } from '../../components/ui.tsx'

export function AddColumnForm() {
  const { addTaskColumn } = useFinanceMutations()
  const [name, setName] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setName('')
    addTaskColumn.mutate({ name: trimmed })
  }

  return (
    <form onSubmit={submit} className="flex w-64 shrink-0 items-start gap-1.5">
      <TextInput
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New column…"
        className="text-sm"
      />
      <RowButton type="submit" tone="primary">
        Add
      </RowButton>
    </form>
  )
}
