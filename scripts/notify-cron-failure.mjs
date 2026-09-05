/**
 * Cron failure notification — sends an email via Resend so a broken
 * scrape doesn't sit silently for days.
 *
 * Called from .github/workflows/*.yml as the final `if: failure()` step.
 * Requires two env vars (set in GitHub repo secrets):
 *   RESEND_API_KEY       — already used by the site's contact + apply routes
 *   CRON_ALERT_EMAIL     — comma-separated recipients for these alerts
 *
 * If either is missing, this exits 0 silently — better than failing the
 * already-failed workflow with a notification error.
 *
 * Sends from the Resend-verified medinaohchamber.com domain (the same sender
 * the site's renewal and sponsorship mail uses). Resend's shared
 * onboarding@resend.dev only delivers to the address the Resend account was
 * registered with, so any other recipient in CRON_ALERT_EMAIL came back 403
 * and the alert quietly never arrived.
 *
 * Workflow context flows in via env vars set by GitHub Actions:
 *   GITHUB_WORKFLOW       — workflow filename
 *   GITHUB_REPOSITORY     — owner/repo
 *   GITHUB_RUN_ID         — numeric run id (for the link)
 *   GITHUB_SERVER_URL     — usually https://github.com
 */

const apiKey = process.env.RESEND_API_KEY;
const recipients = process.env.CRON_ALERT_EMAIL;

if (!apiKey || !recipients) {
  console.log("Skip: RESEND_API_KEY or CRON_ALERT_EMAIL not set.");
  process.exit(0);
}

const workflow = process.env.GITHUB_WORKFLOW || "Unknown workflow";
const repo = process.env.GITHUB_REPOSITORY || "unknown/repo";
const runId = process.env.GITHUB_RUN_ID || "";
const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
const runUrl = runId ? `${serverUrl}/${repo}/actions/runs/${runId}` : serverUrl;

const subject = `[Chamber Cron] ${workflow} failed`;
const text = [
  `The "${workflow}" workflow failed.`,
  ``,
  `Repo: ${repo}`,
  `Run:  ${runUrl}`,
  ``,
  `Open the run link above to see which step broke and why.`,
  ``,
  `Common causes:`,
  `  - GrowthZone changed their HTML (scrapers can't find the cards)`,
  `  - Smoke check rejected the result (member count <450, events <5, or news/jobs collapsed to 0)`,
  `  - Upstash credentials expired or quota hit`,
  `  - GitHub Actions outage (try re-running before debugging)`,
].join("\n");

const html = `
  <p><strong>${escapeHtml(workflow)}</strong> failed in
  <a href="${runUrl}">${escapeHtml(repo)}</a>.</p>
  <p><a href="${runUrl}">Open the failed run →</a></p>
  <p><strong>Common causes:</strong></p>
  <ul>
    <li>GrowthZone changed their HTML (scrapers can't find the cards)</li>
    <li>Smoke check rejected the result (member count &lt;450, events &lt;5, or news/jobs collapsed to 0)</li>
    <li>Upstash credentials expired or quota hit</li>
    <li>GitHub Actions outage (try re-running before debugging)</li>
  </ul>
`;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "Chamber Cron <noreply@medinaohchamber.com>",
    to: recipients.split(",").map((e) => e.trim()).filter(Boolean),
    subject,
    text,
    html,
  }),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`❌ Resend returned ${res.status}: ${body}`);
  console.error("The failure alert was NOT delivered — check the Resend API key, the verified sending domain, and CRON_ALERT_EMAIL.");
  // Exit 1: this step only runs under `if: failure()`, so the job is already
  // red and this adds no false alarm. A silently broken alert channel is
  // worse than a noisy one — nobody would learn the emails stopped arriving.
  process.exit(1);
}

console.log(`✓ Cron failure alert sent to ${recipients}`);
