/**
 * Lightweight markdown → React renderer for AI assistant messages.
 *
 * Handles: **bold**, [text](url), bare https:// URLs, newlines.
 *
 * SECURITY — returns React nodes, never an HTML string.
 * The output is a `ReactNode` array rendered by React directly. React
 * escapes all text content, so raw HTML in the model's output (e.g. a
 * `<script>` tag) renders as inert visible text — it is never parsed as
 * markup. This is why we do NOT use dangerouslySetInnerHTML: there is no
 * string-built HTML anywhere in this path, so there is no interpolation
 * surface for an attacker to break out of.
 *
 * Used by the ChamberBotPortal transcript and the floating ChatWidget
 * message list. Shared so the two surfaces stay in visual and
 * behavioral sync.
 *
 * LINK SAFETY — scheme + host allowlist.
 * The model is instructed to only emit medinachamber.com URLs, but
 * models don't always listen. A prompt-injection attempt could coax
 * it into emitting a link to a phishing domain. Links are only rendered
 * as clickable anchors when:
 *   • an internal path (starts with "/", not "//"), rendered same-tab; or
 *   • an https: URL whose exact hostname is on the allowlist, rendered
 *     in a new tab.
 * Anything else (javascript:, data:, http:, off-list hosts, malformed
 * URLs) renders as plain text — the label is preserved for readability,
 * but the URL can't be clicked out of the chat UI.
 */

import { Fragment, type ReactNode } from "react";

// Exact hostname match required. No wildcard subdomains — the old
// business.medinachamber.com subdomain is explicitly banned by the
// system prompt and shouldn't sneak through.
const ALLOWED_LINK_HOSTS = new Set([
  "medinachamber.com",
  "www.medinachamber.com",
  "medinaohchamber.com",
  "huntersystems.dev",
  "greatermedinachamberofcommerce.growthzoneapp.com",
]);

const LINK_CLASS =
  "underline decoration-cambridge/60 text-cambridge hover:text-cambridge/80 transition-colors";

interface SafeLink {
  href: string;
  external: boolean;
}

/**
 * Resolve a raw URL string to a safe href, or null if it isn't allowed.
 * Internal paths (starting with a single "/") are same-tab links.
 * External links must be https: with an allowlisted hostname; the parsed
 * URL is re-serialized (url.href) so the rendered href is normalized and
 * free of whitespace/encoding tricks.
 */
function resolveSafeLink(raw: string): SafeLink | null {
  // Internal path: single leading slash, not protocol-relative "//".
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return { href: raw, external: false };
  }
  try {
    const url = new URL(raw);
    // Only https: external links. Rejects javascript:, data:, http:, etc.
    // URL parsing also normalizes the hostname to lowercase and rejects
    // userinfo-smuggling like https://medinachamber.com@evil.com/
    // (hostname resolves to "evil.com" for that input).
    if (url.protocol === "https:" && ALLOWED_LINK_HOSTS.has(url.hostname)) {
      return { href: url.href, external: true };
    }
  } catch {
    // Malformed / unparseable URL — fall through to plain text.
  }
  return null;
}

function anchor(href: string, external: boolean, children: ReactNode, extraClass = ""): ReactNode {
  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${LINK_CLASS}${extraClass}`}
    >
      {children}
    </a>
  ) : (
    <a href={href} rel="noopener noreferrer" className={`${LINK_CLASS}${extraClass}`}>
      {children}
    </a>
  );
}

// Matches, in priority order: **bold**, [label](url) links, and bare
// http(s):// URLs. Each alternative is a capture group so we can tell
// which one fired. Internal /path links are only recognized via the
// explicit [label](/path) form — never auto-linkified from bare prose,
// which would false-positive on any "/word" fragment.
//
// URL captures deliberately exclude <, >, and " so that HTML-ish payloads
// (e.g. a quote-breaking `...">"<script>`) can't be smuggled inside a URL
// token — the URL simply ends before the angle bracket and the remaining
// markup falls through to plain text. resolveSafeLink() is the security
// gate; these character classes just keep tokenization sane.
const INLINE_RE =
  /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^\s<>")]+)\)|(https?:\/\/[^\s<>"]+)/g;

/**
 * Parse a single line of markdown-lite into React nodes. Text outside of
 * any recognized token is emitted verbatim (React escapes it).
 */
function parseInline(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  INLINE_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = INLINE_RE.exec(line)) !== null) {
    const [full, boldText, linkLabel, linkUrl, bareUrl] = match;

    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }
    lastIndex = match.index + full.length;

    if (boldText !== undefined) {
      nodes.push(<strong key={key++}>{boldText}</strong>);
    } else if (linkLabel !== undefined && linkUrl !== undefined) {
      const safe = resolveSafeLink(linkUrl);
      // Off-list / unsafe URL: keep the label as plain text, drop the URL.
      nodes.push(
        safe ? (
          <Fragment key={key++}>{anchor(safe.href, safe.external, linkLabel)}</Fragment>
        ) : (
          linkLabel
        ),
      );
    } else if (bareUrl !== undefined) {
      const safe = resolveSafeLink(bareUrl);
      // Off-list / unsafe URL: render the raw text so the user can see
      // what the bot tried to send, but it isn't clickable.
      nodes.push(
        safe ? (
          <Fragment key={key++}>
            {anchor(safe.href, safe.external, bareUrl, " break-all")}
          </Fragment>
        ) : (
          bareUrl
        ),
      );
    }
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }
  return nodes;
}

/**
 * Render markdown-lite assistant text to React nodes. Newlines become
 * <br> between parsed lines.
 */
export function renderMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => (
    <Fragment key={i}>
      {parseInline(line)}
      {i < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}
