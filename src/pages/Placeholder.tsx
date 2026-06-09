export function Placeholder({ name }: { name: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <h1 className="text-lg font-semibold text-slate-700">{name}</h1>
      <p className="mt-2 text-sm text-slate-500">This module arrives in Plan 2.</p>
    </div>
  )
}
