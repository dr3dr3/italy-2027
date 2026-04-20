"use server";

import { auth } from "@/auth";
import { getPromptSignal, type PromptSignal } from "@/lib/queries/prompt-signal";
import { renderPrompt } from "@/lib/prompts/itinerary-generator";

export type GeneratePromptResult =
  | { ok: true; prompt: string; signal: PromptSignal }
  | { ok: false; error: string };

export async function generatePrompt(
  startDate: string | null,
  endDate: string | null,
): Promise<GeneratePromptResult> {
  const session = await auth();
  if (!session?.user?.isEditor) {
    return { ok: false, error: "Editor access required." };
  }
  const signal = await getPromptSignal();
  const prompt = renderPrompt({ signal, startDate, endDate });
  return { ok: true, prompt, signal };
}
