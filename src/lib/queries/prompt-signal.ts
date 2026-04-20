import { and, desc, eq, sql } from "drizzle-orm";
import { db, users, stops, votes, wishlistDestinations, itineraries } from "@/db";

export type PromptSignal = {
  group: { name: string; isEditor: boolean }[];
  wishlist: {
    name: string;
    description: string | null;
    addedBy: string | null;
    voteCount: number;
  }[];
  lovedStops: {
    name: string;
    itineraryTitle: string;
    voteCount: number;
  }[];
};

const TOP_STOPS_LIMIT = 10;

export async function getPromptSignal(): Promise<PromptSignal> {
  const [group, wishlist, lovedStops] = await Promise.all([
    db
      .select({ name: users.name, isEditor: users.isEditor })
      .from(users)
      .orderBy(desc(users.isEditor), users.name),
    db
      .select({
        name: wishlistDestinations.name,
        description: wishlistDestinations.description,
        addedBy: users.name,
        voteCount: sql<number>`count(distinct ${votes.id})::int`,
      })
      .from(wishlistDestinations)
      .innerJoin(users, eq(users.id, wishlistDestinations.addedBy))
      .leftJoin(
        votes,
        and(
          eq(votes.targetType, "wishlist_destination"),
          eq(votes.targetId, wishlistDestinations.id),
        ),
      )
      .where(eq(wishlistDestinations.status, "pending"))
      .groupBy(wishlistDestinations.id, users.name)
      .orderBy(desc(sql`count(distinct ${votes.id})`), wishlistDestinations.name),
    db
      .select({
        name: stops.name,
        itineraryTitle: itineraries.title,
        voteCount: sql<number>`count(distinct ${votes.id})::int`,
      })
      .from(stops)
      .innerJoin(itineraries, eq(itineraries.id, stops.itineraryId))
      .innerJoin(
        votes,
        and(eq(votes.targetType, "stop"), eq(votes.targetId, stops.id)),
      )
      .groupBy(stops.id, itineraries.title)
      .orderBy(desc(sql`count(distinct ${votes.id})`), stops.name)
      .limit(TOP_STOPS_LIMIT),
  ]);

  return {
    group: group.map((u) => ({ name: u.name ?? "(no name)", isEditor: u.isEditor })),
    wishlist,
    lovedStops,
  };
}
