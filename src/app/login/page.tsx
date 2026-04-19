"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Tagline =
  | { kind: "plain"; text: string }
  | { kind: "tooltip"; text: string; tip: string };

const TAGLINES: Tagline[] = [
  {
    kind: "plain",
    text: "Six mates, one itinerary, zero chance of consensus.",
  },
  {
    kind: "tooltip",
    text: "Gözün aydın.",
    tip: "Turkish — 'may your eyes be bright.' Said when good news is coming.",
  },
  {
    kind: "plain",
    text: "Ozzie's cooking. The rest of us are taste-testing.",
  },
  { kind: "plain", text: "Pack light. Argue later." },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );

  // Pick a random tagline on mount, not during render — avoids SSR/CSR hydration mismatch.
  const [tagline, setTagline] = useState<Tagline>(TAGLINES[0]);
  const [tipOpen, setTipOpen] = useState(false);
  useEffect(() => {
    setTagline(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      await signIn("resend", {
        email: email.trim().toLowerCase(),
        redirect: false,
        redirectTo: "/",
      });
      setState("sent");
    } catch {
      setState("error");
    }
  }

  return (
    <main className="flex min-h-screen min-h-dvh items-center justify-center px-6 text-ink">
      <div className="w-full max-w-md rounded-lg border border-dust bg-white/85 p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <h1 className="font-serif text-4xl font-semibold text-center">
          Italia 2027
        </h1>
        <p className="mt-3 text-center text-sm text-ink/70">
          {tagline.kind === "tooltip" ? (
            <>
              <button
                type="button"
                onClick={() => setTipOpen((o) => !o)}
                className="cursor-help underline decoration-dotted decoration-ink/40"
                title={tagline.tip}
              >
                {tagline.text}
              </button>
              {tipOpen && (
                <span className="mt-1 block text-xs text-ink/50">
                  {tagline.tip}
                </span>
              )}
            </>
          ) : (
            tagline.text
          )}
        </p>

        {state === "sent" ? (
          <div className="animate-in mt-8 text-center">
            <p className="text-base text-ink">
              Check your email. If you&apos;re on the list, there&apos;s a link
              waiting.
            </p>
            <button
              type="button"
              onClick={() => setState("idle")}
              className="mt-3 text-sm text-ink/60 hover:text-ink"
            >
              Didn&apos;t arrive? Try again
            </button>
          </div>
        ) : (
          <form
      onSubmit={onSubmit}
      className="mt-8 space-y-4"
      suppressHydrationWarning
    >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={state === "loading"}
                suppressHydrationWarning
              />
            </div>
            <Button
              type="submit"
              disabled={state === "loading"}
              className="w-full bg-terracotta text-cream hover:bg-terracotta/90"
            >
              {state === "loading" ? "Sending…" : "Send magic link"}
            </Button>
            {state === "error" && (
              <p className="text-sm text-wine">
                Something&apos;s gone sideways — check your address and try
                again, or give it a minute.
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
