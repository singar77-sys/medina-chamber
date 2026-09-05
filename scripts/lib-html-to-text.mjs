/**
 * Shared HTML → plain-text extraction for the scrapers (events/news/jobs/blog).
 *
 * One implementation on purpose: this used to exist as four divergent private
 * copies, and the copies missing the closing-block-tag rule re-introduced the
 * text-fusing bug class ("$995Advanced") on news/jobs bodies. The renderers
 * split body text on newlines, so every closing block-level tag must emit '\n'.
 */
/**
 * Named entities GrowthZone/Squarespace actually emit. Kept as a table rather
 * than a chain of .replace() calls because the chain silently passed through
 * anything not explicitly listed: "&bull;" shipped as literal text onto the
 * live Raising the Bar event page. Anything still unknown is left verbatim
 * (visible, therefore reportable) instead of being mangled.
 */
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  bull: '•', middot: '·', sdot: '⋅',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  sbquo: '‚', bdquo: '„', prime: '′', Prime: '″',
  mdash: '—', ndash: '–', hellip: '…',
  reg: '®', copy: '©', trade: '™',
  deg: '°', plusmn: '±', frac12: '½', frac14: '¼', frac34: '¾',
  times: '×', divide: '÷', minus: '−', ne: '≠',
  le: '≤', ge: '≥', laquo: '«', raquo: '»',
  dagger: '†', Dagger: '‡', sect: '§', para: '¶',
  euro: '€', pound: '£', yen: '¥', cent: '¢',
  eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç',
  uuml: 'ü', ouml: 'ö', auml: 'ä', ntilde: 'ñ',
  ensp: ' ', emsp: ' ', thinsp: ' ', shy: '', zwnj: '', zwj: '',
};

/**
 * Numeric entity → character, or the original text when the value is not a
 * legal code point. String.fromCodePoint THROWS on out-of-range input, and an
 * uncaught RangeError inside a scraper drops the entire event/article rather
 * than one bad character.
 */
function codePoint(n, original) {
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return original;
  // Lone surrogates are not valid scalar values either.
  if (n >= 0xd800 && n <= 0xdfff) return original;
  try {
    return String.fromCodePoint(n);
  } catch {
    return original;
  }
}

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
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => codePoint(parseInt(n, 16), `&#x${n};`))
    .replace(/&#(\d+);/g, (_, n) => codePoint(Number(n), `&#${n};`))
    // Named entities LAST so a decoded "&amp;bull;" doesn't become a bullet.
    .replace(/&([a-zA-Z][a-zA-Z0-9]{1,10});/g, (whole, name) =>
      Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name) ? NAMED_ENTITIES[name] : whole)
    .replace(/[​-‍﻿]/g, '') // strip zero-width chars (ZWSP/ZWNJ/ZWJ/BOM)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
