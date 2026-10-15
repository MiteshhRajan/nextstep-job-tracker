import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

type Props = { title: string; subtitle?: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean }

export function Dialog({ title, subtitle, children, onClose, busy = false, wide = false }: Props) {
  const reference = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = reference.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog ref={reference} className={wide ? 'dialog dialog-wide' : 'dialog'} aria-label={title}
      onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
      <div className="dialog-inner">
        <header className="dialog-header">
          <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="icon-button" title="Close" aria-label="Close" onClick={onClose} disabled={busy}><X size={20} /></button>
        </header>
        {children}
      </div>
    </dialog>
  )
}