"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, votes } from "@/db";
import { assertTargetExists, type TargetType } from "@/lib/polymorphic";
import type { ActionResult } from "./comments";

/**
 * Toggle a vote on a polymorphic target. Clicking again removes it.
 * Lookup-then-write rather than ON CONFLICT — trivially correct and avoids
 * leaning on Postgres-specific upsert behaviour.
 */
export async function toggleVote(
  targetType: TargetType,
  targetId: number,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not signed in." };
  }
  const userIdNum = Number(session.user.id);

  const target = await assertTargetExists(targetType, targetId);
  if (!target.ok) return target;

  const [existing] = await db
    .select({ id: votes.id })
    .from(votes)
    .where(
      and(
        eq(votes.userId, userIdNum),
        eq(votes.targetType, targetType),
        eq(votes.targetId, targetId),
      ),
    )
    .limit(1);

  if (existing) {
    await db.delete(votes).where(eq(votes.id, existing.id));
  } else {
    await db.insert(votes).values({
      userId: userIdNum,
      targetType,
      targetId,
      value: 1,
    });
  }

  revalidatePath(`/itineraries/${target.itinerarySlug}`);
  revalidatePath("/");
  return { ok: true };
}
