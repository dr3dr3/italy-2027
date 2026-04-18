"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, comments } from "@/db";
import { assertTargetExists, type TargetType } from "@/lib/polymorphic";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_BODY = 2000;

export async function createComment(
  targetType: TargetType,
  targetId: number,
  body: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not signed in." };
  }

  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Comment can't be empty." };
  }
  if (trimmed.length > MAX_BODY) {
    return { ok: false, error: `Comment is too long (max ${MAX_BODY}).` };
  }

  const target = await assertTargetExists(targetType, targetId);
  if (!target.ok) return target;

  // session.user.id is stringified in the session callback; DB column is bigint.
  const userIdNum = Number(session.user.id);

  await db.insert(comments).values({
    userId: userIdNum,
    targetType,
    targetId,
    body: trimmed,
  });

  for (const path of target.revalidatePaths) revalidatePath(path);
  return { ok: true };
}

export async function deleteComment(
  commentId: number,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not signed in." };
  }
  const userIdNum = Number(session.user.id);

  const [existing] = await db
    .select({
      id: comments.id,
      userId: comments.userId,
      targetType: comments.targetType,
      targetId: comments.targetId,
    })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  if (!existing) {
    return { ok: false, error: "Comment not found." };
  }
  if (existing.userId !== userIdNum) {
    // Editors are not moderators — only the author can delete.
    return { ok: false, error: "Not yours to delete." };
  }

  await db.delete(comments).where(
    and(eq(comments.id, commentId), eq(comments.userId, userIdNum)),
  );

  // Re-query the parent for revalidation. Needed because target_id has no FK.
  const target = await assertTargetExists(
    existing.targetType as TargetType,
    existing.targetId,
  );
  if (target.ok) {
    for (const path of target.revalidatePaths) revalidatePath(path);
  }
  return { ok: true };
}
