import { getRecentMedia } from "@/lib/media-store";
import { MediaLibraryClient } from "./MediaLibraryClient";

export const dynamic = "force-dynamic";

export default async function MediaLibraryPage() {
  const items = await getRecentMedia(50);

  return <MediaLibraryClient items={items} />;
}
