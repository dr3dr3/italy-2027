"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { setItineraryStatus } from "@/lib/actions/itineraries";

type Status = "draft" | "active" | "archived";

type Action = {
  label: string;
  to: Status;
  confirm?: string;
  disabled?: boolean;
  disabledReason?: string;
};

function actionsFor(current: Status): Action[] {
  if (current === "draft") {
    return [
      { label: "Activate", to: "active" },
      {
        label: "Archive",
        to: "archived",
        disabled: true,
        disabledReason: "Activate first",
      },
    ];
  }
  if (current === "active") {
    return [
      { label: "Move to draft", to: "draft" },
      {
        label: "Archive",
        to: "archived",
        confirm: "Archive this itinerary?",
      },
    ];
  }
  return [
    { label: "Re-activate", to: "active" },
    { label: "Move to draft", to: "draft" },
  ];
}

export function ItineraryStatusControl({
  itineraryId,
  status,
}: {
  itineraryId: number;
  status: Status;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const actions = actionsFor(status);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  function run(action: Action) {
    if (action.disabled) return;
    if (action.confirm && !window.confirm(action.confirm)) return;
    setOpen(false);
    startTransition(async () => {
      const result = await setItineraryStatus(itineraryId, action.to);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Moved to ${action.to}.`);
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer rounded-md border border-dust bg-white/85 px-2 py-1 text-xs font-medium text-ink/70 hover:bg-white"
        aria-expanded={open}
      >
        Manage ▾
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-dust bg-white shadow-sm">
          <ul className="py-1">
            {actions.map((a) => (
              <li key={a.label}>
                <button
                  type="button"
                  disabled={isPending || a.disabled}
                  onClick={() => run(a)}
                  title={a.disabledReason}
                  className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-dust/40 disabled:cursor-not-allowed disabled:text-ink/40 disabled:hover:bg-transparent"
                >
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
