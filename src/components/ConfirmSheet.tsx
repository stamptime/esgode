"use client";

import { useEffect, useRef } from "react";
import { Button } from "./ui";

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  description: string;
  /** Acción que conserva; va primero. */
  cancelLabel: string;
  /** Acción destructiva; va segunda. */
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmSheet(props: ConfirmSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (props.open && !d.open) d.showModal();
    if (!props.open && d.open) d.close();
  }, [props.open]);

  return (
    <dialog ref={ref} className="es-sheet" onCancel={props.onCancel} onClose={props.onCancel}>
      <div className="flex flex-col gap-2">
        <h2 className="title-3 m-0">{props.title}</h2>
        <p className="callout m-0 text-ink-secondary">{props.description}</p>
      </div>
      <div className="mt-6 flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={props.onCancel}>
          {props.cancelLabel}
        </Button>
        <Button variant="danger" className="flex-1" onClick={props.onConfirm}>
          {props.confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
