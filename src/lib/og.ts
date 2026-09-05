/**
 * Default Open Graph / Twitter preview image.
 *
 * Next merges metadata SHALLOWLY: a page that exports its own `openGraph`
 * block replaces the parent's entire openGraph object, including the images
 * that the file-based src/app/opengraph-image.tsx contributes to the root.
 * That is why 43 pages shipped with no og:image at all while the homepage had
 * one — every page that customised its OG title/description silently dropped
 * the picture, so shares of those URLs rendered as a bare link on Facebook,
 * LinkedIn, iMessage and Slack.
 *
 * Every page-level `openGraph` block therefore spells the image out via this
 * constant. Keep it in one place so the default can never be dropped again.
 */
export const OG_IMAGE = ["/opengraph-image"];
