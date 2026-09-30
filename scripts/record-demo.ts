import 'dotenv/config';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Record against a fresh, running Compose project. This creates three real demo requests.
const baseURL = process.env.DEMO_BASE_URL || 'http://127.0.0.1:8081';
const output = resolve(process.env.DEMO_OUTPUT_DIR || 'artifacts/demo');
await mkdir(output, { recursive: true });
const config = (await fetch(`${baseURL}/api/config`).then((response) =>
  response.json(),
)) as { aiMode: string };
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: output, size: { width: 1440, height: 1000 } },
  reducedMotion: 'reduce',
});
const startedAt = Date.now();
const page = await context.newPage();
const captions: { start: number; text: string }[] = [];
const caption = (text: string) => {
  captions.push({ start: (Date.now() - startedAt) / 1000, text });
  console.log(text.replaceAll('\n', ' '));
};
const pause = (seconds: number) => page.waitForTimeout(seconds * 1000);

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: /ORD-1001/ })).toBeVisible();
  caption(
    `Returnly — Worknoon full stack assessment\nRunning locally at ${baseURL}. Fifteen synthetic customers, thirty orders.`,
  );
  await pause(7);
  caption(
    config.aiMode === 'openai'
      ? 'React customer portal + Express API + SQLite.\nThis recording uses a configured OpenAI classifier; results show its actual status.'
      : 'This recording uses the clearly labelled offline demo classifier.\nThe real OpenAI integration is implemented separately and requires a valid API key.',
  );
  await pause(7);
  caption(
    'A customer selects an order and explains what went wrong.\nThe refund amount comes from the stored order, never from the message.',
  );
  await page
    .getByLabel('Tell us a little more')
    .pressSequentially(
      'My ceramic mug arrived cracked along the handle. The packaging was crushed.',
      { delay: 38 },
    );
  await pause(3);
  await page.getByRole('button', { name: 'Submit refund request' }).click();
  await expect(
    page.getByRole('heading', { name: 'We’ll take it from here.' }),
  ).toBeVisible({ timeout: 20_000 });
  caption(
    'Approved: recent delivery, eligible item, amount below the review limit.\nApproval records eligibility. This demo does not move money.',
  );
  await page.locator('.result').scrollIntoViewIfNeeded();
  await pause(7);
  await page.getByText('How this decision was reached').click();
  await page.locator('.result').scrollIntoViewIfNeeded();
  caption(
    'The policy trace explains each evaluated rule.\nThe model classifies the request; deterministic code makes the decision.',
  );
  await pause(8);

  await page.getByRole('button', { name: /ORD-1002/ }).click();
  caption(
    'Final-sale items are excluded, even when the customer reports damage.\nHard policy rules take precedence over the AI classification.',
  );
  await page
    .getByLabel('Tell us a little more')
    .fill('These headphones arrived damaged inside the box.');
  await pause(3);
  await page.getByRole('button', { name: 'Submit refund request' }).click();
  await expect(
    page.getByRole('heading', { name: 'Here’s what our policy says.' }),
  ).toBeVisible({ timeout: 20_000 });
  await page.locator('.result').scrollIntoViewIfNeeded();
  await pause(8);

  await page.getByLabel('DEMO CUSTOMER').selectOption('customer-2');
  await expect(page.getByRole('button', { name: /ORD-1003/ })).toBeVisible();
  caption(
    'Jamie’s $749 display needs a human decision.\nEvery eligible refund above $500 is escalated.',
  );
  await page
    .getByLabel('Tell us a little more')
    .fill('The studio display arrived with a cracked screen.');
  await pause(3);
  await page.getByRole('button', { name: 'Submit refund request' }).click();
  await expect(
    page.getByRole('heading', { name: 'A little human attention.' }),
  ).toBeVisible({ timeout: 20_000 });
  await page.locator('.result').scrollIntoViewIfNeeded();
  await pause(7);

  await page.getByRole('button', { name: 'Support desk', exact: true }).click();
  await page
    .getByLabel('Support access key')
    .fill(
      process.env.DEMO_SUPPORT_TOKEN ||
        process.env.SUPPORT_TOKEN ||
        'demo-support-key',
    );
  await page.getByRole('button', { name: 'Open support desk' }).click();
  await expect(
    page.getByRole('row').filter({ hasText: 'ORD-1003' }),
  ).toBeVisible();
  caption(
    'The support desk shows approvals, denials and requests needing review.\nFilters and search make it easy to find a customer or order.',
  );
  await page.screenshot({
    path: resolve(output, 'support-dashboard.png'),
    fullPage: true,
  });
  await pause(7);
  await page.getByRole('button', { name: 'Needs review', exact: true }).click();
  await pause(3);
  await page
    .getByRole('row')
    .filter({ hasText: 'ORD-1003' })
    .getByRole('button', { name: /Open/ })
    .click();
  await page.locator('.detail-panel').scrollIntoViewIfNeeded();
  caption(
    'Each request keeps the customer’s words, classifier output, policy checks and audit trail.\nA support specialist must write a review note before deciding.',
  );
  await pause(7);
  await page
    .getByLabel('Review note')
    .pressSequentially(
      'Checked the delivery record and damaged-display explanation. Eligible high-value refund approved.',
      { delay: 25 },
    );
  await pause(2);
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByText('human approved', { exact: true })).toBeVisible();
  caption(
    'The decision is updated, and a human-review event is appended.\nThe original automated outcome remains in the record.',
  );
  await pause(7);
  await page
    .getByRole('button', { name: 'Customer portal', exact: true })
    .click();
  await page.getByRole('button', { name: 'View existing request' }).click();
  await page.locator('.result').scrollIntoViewIfNeeded();
  caption(
    'The customer now sees the support specialist’s approval.\nThe database persists request history across application restarts.',
  );
  await pause(7);

  caption(
    'Architecture: a small, explicit workflow with clear boundaries.\nNo agent framework is needed for one classification call and a deterministic policy.',
  );
  await page.setContent(`<!doctype html><html><head><style>
    *{box-sizing:border-box}body{margin:0;background:#f7f8f4;color:#183f33;font-family:Arial,sans-serif;padding:80px 100px}small{letter-spacing:3px;font-size:15px;color:#718564}h1{font-size:57px;font-weight:500;letter-spacing:-2px;margin:24px 0 20px}p{font-size:21px;color:#76856b;line-height:1.7}.flow{display:flex;gap:20px;margin-top:60px}.card{flex:1;padding:32px 25px;background:white;border:1px solid #dce5d2;border-radius:14px;min-height:225px}.card span{font-size:14px;color:#88a175}.card h2{font-size:23px;margin:25px 0 12px}.card p{font-size:17px}.note{margin-top:50px;padding:30px;background:#eaf0e1;border-radius:12px;font-size:20px;line-height:1.8}.footer{font-size:16px;margin-top:32px;color:#8b987e}
    </style></head><body><small>RETURNLY / ARCHITECTURE WALKTHROUGH</small><h1>Simple by design.<br>Careful at the boundaries.</h1><p>A modular TypeScript application, packaged as a reproducible Docker Compose stack.</p><div class="flow"><div class="card"><span>01 / PRESENTATION</span><h2>React + Nginx</h2><p>Customer requests.<br>Support review queue.<br>Same-origin JSON API.</p></div><div class="card"><span>02 / APPLICATION</span><h2>Express + policy</h2><p>Validate ownership.<br>Classify the explanation.<br>Apply business rules.</p></div><div class="card"><span>03 / PERSISTENCE</span><h2>SQLite + constraints</h2><p>Trusted order records.<br>Idempotent requests.<br>Atomic review history.</p></div></div><div class="note">The AI has no tools, payment access or authority over order facts.<br>Structured output + runtime validation + timeout + escalation on failure.</div><p class="footer">Assessment scope: synthetic data, demo sessions, no payments or physical-damage verification.</p></body></html>`);
  await pause(14);
  caption(
    'Verified with policy and API tests, desktop and mobile browser flows, and Docker.\nNext for production: real identity, evidence review, payments and operational monitoring.',
  );
  await pause(10);
} finally {
  const end = (Date.now() - startedAt) / 1000;
  const video = page.video();
  await context.close();
  await video?.saveAs(resolve(output, 'walkthrough.webm'));
  await browser.close();
  const stamp = (seconds: number) => {
    const total = Math.round(seconds * 100);
    return `${Math.floor(total / 360000)}:${String(Math.floor(total / 6000) % 60).padStart(2, '0')}:${String(Math.floor(total / 100) % 60).padStart(2, '0')}.${String(total % 100).padStart(2, '0')}`;
  };
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1440\nPlayResY: 1100\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,24,&H00FFFFFF,&H00FFFFFF,&H00183F33,&H00183F33,0,0,0,0,100,100,0,0,1,0,0,2,35,35,23,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const events = captions
    .map(
      (item, i) =>
        `Dialogue: 0,${stamp(item.start)},${stamp(captions[i + 1]?.start ?? end)},Default,,0,0,0,,${item.text.replaceAll('\n', '\\N')}`,
    )
    .join('\n');
  await writeFile(resolve(output, 'captions.ass'), header + events + '\n');
  await writeFile(
    resolve(output, 'recording.json'),
    JSON.stringify(
      {
        baseURL,
        classifierMode: config.aiMode,
        seconds: end,
        capturedAt: new Date().toISOString(),
        captions,
      },
      null,
      2,
    ),
  );
  console.log(`Recording saved to ${output}`);
}
