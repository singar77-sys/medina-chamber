/**
 * Lightweight markdown → HTML renderer for AI assistant messages.
 *
 * Handles: **bold**, [text](url), bare https:// URLs, newlines.
 * HTML-escapes all raw text first so no injection is possible, then
 * applies a narrow set of transformations.
 *
 * Used by the homepage HolographicChamber answer display and by the
 * ChatWidget message list. Share this so the two surfaces stay in
 * visual and behavioral sync.
 */
export function renderMarkdown(text: string): string {
  // 1. Escape raw HTML so the model can't inject tags
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // 3. Markdown links [label](url)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline decoration-cambridge/60 text-cambridge hover:text-cambridge/80 transition-colors">$1</a>',
  );

  // 4. Bare https:// URLs not already inside an <a>
  html = html.replace(
    /(?<!href=")(https?:\/\/[^\s<"]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline decoration-cambridge/60 text-cambridge hover:text-cambridge/80 transition-colors break-all">$1</a>',
  );

  // 5. Newlines → <br>
  html = html.replace(/\n/g, "<br>");

  return html;
}
