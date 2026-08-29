/**
 * Shared HTML → plain-text extraction for the scrapers (events/news/jobs/blog).
 *
 * One implementation on purpose: this used to exist as four divergent private
 * copies, and the copies missing the closing-block-tag rule re-introduced the
 * text-fusing bug class ("$995Advanced") on news/jobs bodies. The renderers
 * split body text on newlines, so every closing block-level tag must emit '\n'.
 */
export function htmlToText(html = '') {
  return html
    // Drop <style>/<script> block CONTENTS before the generic tag strip — that
    // strip only removes the tags, leaking raw block CSS into the body as text.
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // \b[^>]* — GrowthZone's Froala editor emits <br fr-original-style=''
    // style=''> with attributes; a bare <br\s*\/?> match misses those, the
    // generic tag strip eats them, and adjacent lines fuse ("personFor").
    .replace(/<br\b[^>]*>/gi, '\n')
    // A closing block-level tag ends a line — otherwise text separated only by
    // </div>/</li>/</td>/</h*> fuses together.
    .replace(/<\/(p|div|li|ul|ol|tr|td|th|h[1-6]|section|article|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘').replace(/&rdquo;/g, '”').replace(/&ldquo;/g, '“')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…')
    .replace(/&reg;/g, '®').replace(/&copy;/g, '©').replace(/&trade;/g, '™')
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[​-‍﻿]/g, '') // strip zero-width chars (ZWSP/ZWNJ/ZWJ/BOM)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
