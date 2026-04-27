import { getRecentMedia } from "@/lib/media-store";
import { MediaLibraryClient } from "./MediaLibraryClient";

export const dynamic = "force-dynamic";

export default async function MediaLibraryPage() {
  const items = await getRecentMedia(50);
  const adminToken = process.env.CHAT_ADMIN_TOKEN ?? "";

  return <MediaLibraryClient items={items} adminToken={adminToken} />;
}
