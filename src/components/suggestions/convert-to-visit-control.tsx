"use client";

import { useState } from "react";
import { ConvertToVisitForm } from "./convert-to-visit-form";

export function ConvertToVisitControl({
  suggestionId,
  defaultName,
  defaultDescription,
}: {
  suggestionId: number;
  defaultName: string;
  defaultDescription: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return (
      <ConvertToVisitForm
        suggestionId={suggestionId}
        defaultName={defaultName}
        defaultDescription={defaultDescription}
        onClose={() => setIsOpen(false)}
      />
    );
  }

  return (
    <div className="mt-2 flex justify-end">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs text-ink/50 hover:text-terracotta"
      >
        Convert to visit
      </button>
    </div>
  );
}
