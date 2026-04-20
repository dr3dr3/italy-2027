import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getPromptSignal } from "@/lib/queries/prompt-signal";
import {
  PROMPT_VERSION,
  renderPrompt,
} from "@/lib/prompts/itinerary-generator";
import { PromptGenerator } from "@/components/admin/prompt-generator";

export default async function PromptGeneratorPage() {
  const session = await auth();
  if (!session?.user?.isEditor) redirect("/");

  const signal = await getPromptSignal();
  const initialPrompt = renderPrompt({
    signal,
    startDate: null,
    endDate: null,
  });

  return (
    <main className="min-h-screen bg-cream text-ink px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-ink/60 hover:text-ink">
          ← Le opzioni
        </Link>
        <header className="mt-6 mb-8">
          <h1 className="font-serif text-4xl font-semibold">
            Genera <span className="text-ink/40">/</span>{" "}
            <span className="text-ink/70">an itinerary prompt</span>
          </h1>
          <p className="mt-2 text-base text-ink/70">
            Builds a prompt you paste into ChatGPT, Claude, or whatever.
            It&apos;ll propose an itinerary based on the wishlist and the
            stops the group has hearted, then hand back JSON ready for the{" "}
            <Link
              href="/admin/import"
              className="underline decoration-dust underline-offset-4 hover:decoration-terracotta"
            >
              importer
            </Link>
            .
          </p>
        </header>
        <PromptGenerator
          initialSignal={signal}
          initialPrompt={initialPrompt}
          version={PROMPT_VERSION}
        />
      </div>
    </main>
  );
}
