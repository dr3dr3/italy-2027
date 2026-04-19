"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { passWishlistDestination } from "@/lib/actions/wishlist";
import type { PromotionItinerary } from "@/lib/queries/wishlist";
import { PromoteToStopForm } from "./promote-to-stop-form";
import { PromoteToVisitForm } from "./promote-to-visit-form";

type Mode = "closed" | "menu" | "stop" | "visit";

export function WishlistEditorControls({
  wishlistId,
  name,
  description,
  lat,
  lng,
  targets,
}: {
  wishlistId: number;
  name: string;
  description: string | null;
  lat: string | null;
  lng: string | null;
  targets: PromotionItinerary[];
}) {
  const [mode, setMode] = useState<Mode>("closed");
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (mode !== "menu") return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMode("closed");
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMode("closed");
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [mode]);

  function pass() {
    if (!window.confirm("Mark this as passed? It disappears from the list.")) return;
    setMode("closed");
    startTransition(async () => {
      const result = await passWishlistDestination(wishlistId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Passed.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMode((m) => (m === "menu" ? "closed" : "menu"))}
          className="cursor-pointer rounded-md border border-dust bg-white/85 px-2 py-1 text-xs font-medium text-ink/70 hover:bg-white disabled:opacity-70"
          disabled={isPending}
          aria-expanded={mode === "menu"}
        >
          Manage ▾
        </button>
        {mode === "menu" && (
          <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-dust bg-white shadow-sm">
            <ul className="py-1">
              <li>
                <button
                  type="button"
                  onClick={() => setMode("stop")}
                  className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-dust/40"
                >
                  Promote to stop
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setMode("visit")}
                  className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-dust/40"
                >
                  Promote to visit
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={pass}
                  className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-dust/40"
                >
                  Pass
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>

      {mode === "stop" && (
        <div className="mt-3 w-full basis-full">
          <PromoteToStopForm
            wishlistId={wishlistId}
            defaultName={name}
            defaultDescription={description}
            defaultLat={lat}
            defaultLng={lng}
            targets={targets}
            onClose={() => setMode("closed")}
          />
        </div>
      )}
      {mode === "visit" && (
        <div className="mt-3 w-full basis-full">
          <PromoteToVisitForm
            wishlistId={wishlistId}
            defaultName={name}
            defaultDescription={description}
            defaultLat={lat}
            defaultLng={lng}
            targets={targets}
            onClose={() => setMode("closed")}
          />
        </div>
      )}
    </>
  );
}
