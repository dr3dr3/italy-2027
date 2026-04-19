"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { describeWindow, type PersonWindow } from "@/lib/participations";
import {
  deleteParticipation,
  upsertParticipation,
} from "@/lib/actions/participations";

const MAX_NOTE = 200;

export function ParticipationRow({
  itineraryId,
  person,
  isMe,
  tripStart,
  tripEnd,
}: {
  itineraryId: number;
  person: PersonWindow;
  isMe: boolean;
  tripStart: string | null;
  tripEnd: string | null;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="px-4 py-3">
      {editing ? (
        <EditForm
          itineraryId={itineraryId}
          person={person}
          tripStart={tripStart}
          tripEnd={tripEnd}
          onClose={() => setEditing(false)}
        />
      ) : (
        <Display
          person={person}
          isMe={isMe}
          onEdit={() => setEditing(true)}
        />
      )}
    </li>
  );
}

function Display({
  person,
  isMe,
  onEdit,
}: {
  person: PersonWindow;
  isMe: boolean;
  onEdit: () => void;
}) {
  const isFullTrip = person.joinsOn === null && person.departsOn === null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-medium text-ink">{person.name ?? "Someone"}</span>
      <span
        className={`text-sm ${isFullTrip ? "text-ink/50" : "text-ink/80"}`}
      >
        {describeWindow(person)}
      </span>
      {person.note && (
        <span className="text-sm text-ink/60 italic">· {person.note}</span>
      )}
      {isMe && (
        <Button
          type="button"
          variant="ghost"
          onClick={onEdit}
          className="ml-auto h-7 px-2 text-xs text-terracotta hover:text-terracotta/80"
        >
          Edit
        </Button>
      )}
    </div>
  );
}

function EditForm({
  itineraryId,
  person,
  tripStart,
  tripEnd,
  onClose,
}: {
  itineraryId: number;
  person: PersonWindow;
  tripStart: string | null;
  tripEnd: string | null;
  onClose: () => void;
}) {
  const [joinsOn, setJoinsOn] = useState(person.joinsOn ?? "");
  const [departsOn, setDepartsOn] = useState(person.departsOn ?? "");
  const [note, setNote] = useState(person.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const noteTooLong = note.length > MAX_NOTE;
  const disabled = isPending || noteTooLong;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await upsertParticipation({
        itineraryId,
        joinsOn: joinsOn.trim() || null,
        departsOn: departsOn.trim() || null,
        note: note.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(Math.random() < 0.33 ? "Noted." : "Saved.");
      onClose();
    });
  }

  function reset() {
    setError(null);
    startTransition(async () => {
      const result = await deleteParticipation(itineraryId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Back to full trip.");
      onClose();
    });
  }

  const hasRow =
    person.joinsOn !== null || person.departsOn !== null || person.note !== null;

  return (
    <form onSubmit={submit} className="space-y-3" suppressHydrationWarning>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-medium text-ink">{person.name ?? "Someone"}</span>
        <span className="text-xs text-ink/50">
          Leave dates blank for full trip.
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="p-joins" className="text-xs">
            Join date <span className="text-ink/40">(optional)</span>
          </Label>
          <Input
            id="p-joins"
            type="date"
            value={joinsOn}
            onChange={(e) => setJoinsOn(e.target.value)}
            min={tripStart ?? undefined}
            max={tripEnd ?? undefined}
            disabled={isPending}
            suppressHydrationWarning
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="p-departs" className="text-xs">
            Depart date <span className="text-ink/40">(optional)</span>
          </Label>
          <Input
            id="p-departs"
            type="date"
            value={departsOn}
            onChange={(e) => setDepartsOn(e.target.value)}
            min={tripStart ?? undefined}
            max={tripEnd ?? undefined}
            disabled={isPending}
            suppressHydrationWarning
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="p-note" className="text-xs">
          Note <span className="text-ink/40">(optional)</span>
        </Label>
        <Input
          id="p-note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isPending}
          maxLength={MAX_NOTE + 50}
          placeholder="Seeing a friend first, etc."
          suppressHydrationWarning
        />
        {note.length > MAX_NOTE - 40 && (
          <p
            className={`text-xs ${noteTooLong ? "text-wine" : "text-ink/40"}`}
          >
            {note.length}/{MAX_NOTE}
          </p>
        )}
      </div>
      {error && <p className="text-sm text-wine">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {hasRow ? (
          <button
            type="button"
            onClick={reset}
            disabled={isPending}
            className="text-xs text-ink/50 underline-offset-2 hover:text-ink hover:underline"
          >
            Reset to full trip
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            className="text-sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={disabled}
            className="bg-terracotta text-cream hover:bg-terracotta/90"
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}
