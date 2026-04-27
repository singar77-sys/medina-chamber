import { listGraphicTemplates } from "@/lib/graphic-template";
import { GraphicTemplatesClient } from "./GraphicTemplatesClient";

export const dynamic = "force-dynamic";

export default async function GraphicTemplatesPage() {
  const [templates] = await Promise.all([listGraphicTemplates()]);
  const adminToken = process.env.CHAT_ADMIN_TOKEN ?? "";

  return <GraphicTemplatesClient adminToken={adminToken} initialTemplates={templates} />;
}
