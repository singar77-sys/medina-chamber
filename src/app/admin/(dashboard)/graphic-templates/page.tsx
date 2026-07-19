import { listGraphicTemplates } from "@/lib/graphic-template";
import { GraphicTemplatesClient } from "./GraphicTemplatesClient";

export const dynamic = "force-dynamic";

export default async function GraphicTemplatesPage() {
  const templates = await listGraphicTemplates();

  return <GraphicTemplatesClient initialTemplates={templates} />;
}
