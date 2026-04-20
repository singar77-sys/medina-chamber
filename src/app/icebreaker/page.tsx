/**
 * /icebreaker — hidden easter egg game.
 *
 * Server wrapper. Loads questions from the Google Sheet Jaclyn maintains
 * (via src/lib/icebreaker.ts) and passes them to the interactive client
 * component. Sheet updates → 1h TTL → live site reflects.
 *
 * Force dynamic: we want this page to re-evaluate on each request so the
 * cached sheet fetch can refresh. The underlying `fetch` has its own
 * revalidate timer; this just opts out of full SSG.
 */

import { getIcebreakerQuestions } from "@/lib/icebreaker";
import { IcebreakerClient } from "./IcebreakerClient";

export const dynamic = "force-dynamic";

export default async function IcebreakerPage() {
  const questions = await getIcebreakerQuestions();
  return <IcebreakerClient questions={questions} />;
}
