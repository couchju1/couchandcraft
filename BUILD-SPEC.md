# Couch & Craft: Website Build Spec

Site: couchandcraft.com
Owner: Justin Couch, Sioux Falls, SD
Spec date: October 11, 2026 (revised after review the same day)
Status: Strategy and sitemap approved. Design tokens and copy below are **provisional drafts** (Phases 4 and 5 were compressed into this spec). Anything marked `[JUSTIN TO SET]`, `[NEEDS ...]` or `[CLIENT TO VERIFY]` is an open item, not content to invent.

---

## 0. How to use this file (read first, Claude Code)

1. Save this file in the repo root as `BUILD-SPEC.md`. Add a short `CLAUDE.md`: "Read BUILD-SPEC.md before any work. Follow its rules over your defaults and over any skill's defaults."
2. Work through **Section 12: Build order** one step at a time. Finish a step, run its acceptance checks, commit with the given message, then stop and report.
3. Every business fact comes from `site.config.json`. Never hardcode a phone number, price, email, town list or client name in a template.
4. Never invent anything: reviews, quotes, stats, results, client names, logos, certifications, years in business. If a section needs a fact that isn't in this spec or the config, render the section only if its config value exists, otherwise leave it out of the build and list it in your step report.
5. Unfinished copy uses a visible marker: `[COPY: what goes here]`. Never use lorem ipsum. The pre-launch QA step greps for `[COPY:`, `[NEEDS`, `[JUSTIN TO` and `[CLIENT TO` and fails if any remain.
6. **Open values in the config.** A config value is in one of three states:
   - **Set:** a real value. Render it.
   - **Open:** a string starting with `[` (for example `"[JUSTIN TO SET]"`). The value is coming but isn't known yet. Templates never print it raw. They go through the `open` filter (`{{ site.contact.phoneDisplay | open }}`), which renders the open value itself (for example `[JUSTIN TO SET]`) as a visible marker in dev builds and **fails the build** when `ELEVENTY_ENV=production`. Never put an open value inside an attribute (`href="tel:..."`, JSON-LD, `content="..."`). Wrap the element in `{% if site.contact.phoneE164 | isSet %}` so it disappears until the value is set.
   - **Null:** deliberately absent. The block is not rendered, in any build.
7. Copy checks (dashes, semicolons, banned words) run on **visible text only**: the build's HTML with tags, scripts, styles and attributes stripped and entities decoded. Never grep raw HTML for semicolons, because `&amp;` and inline CSS contain them.

---

## 1. Strategy summary (context for every decision)

**Positioning:** Couch & Craft is a one-person web studio in Sioux Falls. Owner-run service businesses get a website that looks like the business they've actually built, plus the marketing and follow-up that turn visits into calls, all from the guy who answers his own phone.

**Services, in priority order:** Web design (lead offer), Marketing (local SEO, Google Business Profile, Care & Growth plan), Lead Response (the former ProClientFlow missed-call product).

**Voice rules:**
- First person singular. "I," never "we." Justin is one person.
- Never claim "handcrafted," "no AI" or "not from a template." True claim: one person from first call to launch, and nothing ships until he's checked it.
- 7th to 9th grade reading level. Problem first. Specific over general.

| Trait | Sounds like | Doesn't sound like |
| --- | --- | --- |
| Straight shooter | "Most sites I look at in Sioux Falls look fine and get zero calls. Usually it's three things." | "We craft bespoke digital experiences that elevate your brand." |
| Neighbor, not salesman | "Send me your site. If you don't need a new one, I'll tell you." | "Book your FREE strategy session today!" |
| Shows the work | "Randy's old site had a Wix ad across the top and 'copy-of-about' in the URL." | "We transform outdated websites into high-converting assets." |

**Ideal customer:** Owner-run service businesses in the Sioux Falls metro (Brandon, Tea, Harrisburg, Hartford and nearby), 1 to 20 people. Contractors, insurance and financial pros, trades. Mostly referral-driven. Current site is DIY Wix, years old, or a Facebook page.

**Objections and where the site answers them:**

| Objection | Answer | Where |
| --- | --- | --- |
| Too expensive | Show price floor, link the calculator | Home price band, Pricing |
| Last web guy disappeared | Local, real phone, care plan up front | About, Marketing |
| Locked in | You own domain, files, accounts `[JUSTIN TO CONFIRM policy]` | Pricing, FAQ |
| No time | 30-minute kickoff, I write the words | Home process, Web Design |
| Will it bring calls? | Before/after, live sites, tracking from day one | Home, Work |
| AI gimmick | Automation is plumbing, not the pitch | Lead Response, FAQ |

**Conversions:**
- Primary: project form (`/start/` and inline on Home).
- Secondary: Website Teardown request, calculator download, mobile tap-to-call.
- The form is one click from every page (header CTA plus mobile sticky bar).

---

## 2. Stack, hosting and file structure

**Model:** natehallinsurance.com (static, hand-built, fast, first-person, sticky mobile Call/Quote bar, honeypot form, FAQ, "Website by Justin Couch" credit). Couch & Craft keeps that approach but needs 20+ pages, so it adds a small static site generator for shared layouts.

- **Generator:** Eleventy (11ty) with Nunjucks templates. Output is plain static HTML/CSS/JS.
- **Host:** Hostinger (shared hosting, `public_html`).
- **Forms:** `api/contact.php` on Hostinger. Honeypot plus a time-trap, server-side validation, sends via Hostinger SMTP to `{{contact.formTo}}`, redirects to `/start/thanks/`. One handler serves every form, with a hidden `form_type` field (`project`, `teardown`, `lead-response`). `[JUSTIN TO CONFIRM: reuse whatever Nate's site uses for form delivery if that's already working]`
  - **Time-trap:** `main.js` writes the page-load timestamp into a hidden field when the page loads. Pages are static, so a timestamp written at build time would be useless. The handler rejects submissions under 3 seconds after load or with no timestamp.
  - **SMTP credentials** never go in the repo. The handler reads them from `contact-config.php` placed one level above `public_html` on Hostinger (`dirname(__DIR__, 2) . '/contact-config.php'`, since the handler sits in `public_html/api/`). The repo holds only `api/contact-config.example.php` with empty values, and it is never deployed. The recipient address comes from `contact.formTo` in `site.config.json`, written into `/api/settings.php` at build time.
- **Analytics:** GA4 plus Google Search Console. `[JUSTIN TO SET: GA4 measurement ID]`
- **Deploy:** `npm run build` outputs `dist/`. Deploy `dist/` to `public_html` through a GitHub Action over FTP/SFTP, or Hostinger's Git deploy. Check Hostinger's current Git/SSH options before choosing, since plan features change. Deploy credentials live only in GitHub Actions secrets. Set up in Step 10. No staging site (decided October 11, 2026): a push to `main` deploys to production, and the production build's open-value check keeps unfinished pages off the live site.
- **Images:** `@11ty/eleventy-img` generates AVIF, WebP and a fallback with `srcset`, `width` and `height` from source files in `src/assets/img/`.
- **Checks:** `npm run check` runs `scripts/check.js`: valid `site.config.json`, title and meta lengths, one H1 per page, and (with `--prelaunch`) the copy and open-item checks from Step 15. `npm run build` runs the config check first.
- **Canonical host:** `https://www.couchandcraft.com` (matches `business.url`). The apex redirects to `www`.
- **No** page builders, no jQuery, no CSS frameworks, no Google Fonts CDN (self-host fonts), no third-party trackers beyond GA4.

```text
/
├── BUILD-SPEC.md
├── CLAUDE.md
├── site.config.json            # every business variable lives here
├── .eleventy.js
├── package.json
├── scripts/check.js            # config, title/meta length, H1 and pre-launch copy checks
├── .github/workflows/deploy.yml
├── src/
│   ├── _data/site.js           # exports require('../../site.config.json')
│   ├── _includes/
│   │   ├── layouts/base.njk
│   │   ├── layouts/page.njk
│   │   ├── layouts/case-study.njk
│   │   └── partials/           # header, footer, mobile-bar, cta-band, form, faq, before-after, pins, schema
│   ├── assets/
│   │   ├── css/tokens.css
│   │   ├── css/base.css
│   │   ├── css/components.css
│   │   ├── js/main.js          # nav, before/after slider, FAQ, analytics events
│   │   ├── fonts/              # self-hosted woff2
│   │   └── img/                # AVIF + WebP + fallback, srcset sizes
│   ├── index.njk
│   ├── web-design.njk
│   ├── marketing.njk
│   ├── lead-response.njk
│   ├── pricing.njk
│   ├── work/index.njk
│   ├── work/case-study.njk     # paginates over site.work, one page per entry
│   ├── work/_copy/*.md         # body copy per case, keyed by slug (no front matter facts)
│   ├── websites-for-contractors.njk
│   ├── websites-for-insurance-agents.njk
│   ├── about.njk
│   ├── start/index.njk
│   ├── start/thanks.njk
│   ├── teardown.njk
│   ├── tools/missed-revenue-calculator.njk
│   ├── compare/*.njk           # migrated, same slugs
│   ├── shop.njk                # migrated, footer link only
│   ├── blog/                   # migrated posts, same slugs
│   ├── privacy.njk
│   ├── terms.njk
│   ├── 404.njk
│   ├── sitemap.xml.njk
│   └── robots.txt.njk
├── api/contact.php             # copied to dist/api/
├── api/contact-config.example.php
├── src/htaccess.njk            # builds dist/.htaccess: www, trailing slashes, caching, security headers, 404
└── redirects/proclientflow.htaccess   # deployed to the proclientflow.com addon domain folder
```

---

## 3. site.config.json

Every template reads from this. Values in `[...]` are open items. Templates must skip any block whose value is null.

```json
{
  "business": {
    "name": "Couch & Craft",
    "legalName": "[JUSTIN TO SET]",
    "founder": "Justin Couch",
    "descriptor": "Web design · Marketing · Automation",
    "url": "https://www.couchandcraft.com",
    "city": "Sioux Falls",
    "state": "SD",
    "zip": null,
    "streetAddress": null,
    "serviceAreaBusiness": true,
    "serviceArea": ["Sioux Falls", "Brandon", "Tea", "Harrisburg", "Hartford", "Canton", "Lennox", "Parker", "Crooks", "Renner"],
    "formerName": "ProClientFlow",
    "formerDomain": "proclientflow.com"
  },
  "contact": {
    "phoneDisplay": "[JUSTIN TO SET]",
    "phoneE164": "[JUSTIN TO SET]",
    "email": "[JUSTIN TO SET]",
    "formTo": "[JUSTIN TO SET]",
    "responseTime": "[JUSTIN TO SET, e.g. one business day]",
    "hours": "[JUSTIN TO SET]"
  },
  "pricing": {
    "foundationFrom": "[JUSTIN TO SET]",
    "signatureFrom": "[JUSTIN TO SET]",
    "signatureTypical": "[JUSTIN TO SET: a dollar figure, about $10,000]",
    "careMonthly": "[JUSTIN TO SET]",
    "leadResponseSetup": "[JUSTIN TO SET]",
    "leadResponseMonthly": "[JUSTIN TO SET]",
    "paymentTerms": "[JUSTIN TO SET]",
    "ownershipPolicy": "[JUSTIN TO CONFIRM: client owns domain, site files and accounts]"
  },
  "process": [
    { "step": "A 30-minute call", "weeks": "[JUSTIN TO SET]" },
    { "step": "I write the words", "weeks": "[JUSTIN TO SET]" },
    { "step": "You see the design", "weeks": "[JUSTIN TO SET]" },
    { "step": "Launch, then we track the calls", "weeks": "[JUSTIN TO SET]" }
  ],
  "social": {
    "googleBusinessProfile": null,
    "facebook": null,
    "linkedin": null
  },
  "analytics": { "ga4": "[JUSTIN TO SET]" },
  "about": { "showDayJob": false },
  "work": [
    {
      "slug": "hall-of-fame-billiard-academy",
      "client": "Hall of Fame Billiard Academy",
      "contact": "Randy Goettlicher",
      "industry": "Billiards instruction",
      "location": "Dallas, TX",
      "liveUrl": "[NEEDS: live URL]",
      "beforeUrl": "https://randygpool.wixsite.com/randygpool",
      "permission": true,
      "quote": null,
      "results": null
    },
    {
      "slug": "nate-hall-insurance",
      "client": "Nate Hall Insurance",
      "industry": "Independent insurance agent",
      "location": "Hartford, SD",
      "liveUrl": "https://www.natehallinsurance.com/",
      "permission": true,
      "quote": null,
      "results": null
    },
    {
      "slug": "top-teer-construction",
      "client": "Top Teer Construction",
      "industry": "Remodeling",
      "location": "Sioux Falls, SD",
      "liveUrl": null,
      "permission": true,
      "publish": false,
      "quote": null,
      "results": null
    },
    {
      "slug": "playpoolnation",
      "client": "PlayPoolNation",
      "industry": "Billiards venue directory (built and run by Justin)",
      "location": "National",
      "liveUrl": "https://playpoolnation.com/",
      "inHouse": true,
      "quote": null,
      "results": null
    }
  ]
}
```

Rules:
- Open values (strings starting with `[`) follow Section 0, rule 6.
- Prices are stored as display strings (`"$10,000"`). Copy around them supplies words like "around," so the value never does.
- `quote` and `results` stay null until Justin supplies real ones. Null means the Results and Quote sections are not rendered.
- `site.work` is the only source of case-study facts. `src/work/case-study.njk` paginates over it. Body copy lives in `src/work/_copy/<slug>.md` and holds no facts that belong in the config.
- `publish: false` keeps a case study out of the build (`permalink: false`), nav, sitemap, work grid and every "next case" link.

---

## 4. Brand and design tokens (provisional)

**Brand assets supplied:**
- Logo lockup: "COUCH" (heavy geometric sans, caps) + gold "&" + "CRAFT" (italic serif). Compact mark "C&C."
- Headshot of Justin, gray studio backdrop.
- Only PNG exports exist so far. `[NEEDS VECTOR LOGO]`. Until Justin supplies an SVG, use `assets/img/brand/logo.png` at 2x with explicit width/height, and keep the logo in its own partial so swapping is one change.
- **Do not reproduce the brand board's tagline copy** ("Strategy, brand, and digital built to move business forward", "Make your next stage of growth unmistakable"). Descriptor under the logo is `site.business.descriptor`.

**Palette:** Primary (North Star) only. Ignore the board's two alternate palettes.

```css
/* src/assets/css/tokens.css */
:root {
  /* Color */
  --navy-900: #071B3A;   /* Midnight Blue: hero bands, footer */
  --navy-800: #0E2A55;   /* hover/raised on navy */
  --ink: #161A22;        /* body text on light */
  --slate: #667085;      /* secondary text, 4.6:1 on --paper, small text OK */
  --paper: #F8F7F2;      /* Warm White: page background */
  --white: #FFFFFF;      /* cards */
  --line: #E4E1D6;       /* hairlines on paper */
  --gold: #C99A2E;       /* Heritage Gold: decorative, and text ON NAVY only (about 6.6:1) */
  --gold-text: #8A6A1C;  /* gold for text on paper (about 4.7:1) */
  --blue: #1456C3;       /* Signal Blue: links and focus ring on light sections (about 6.2:1 on paper). Fails on navy (2.6:1). */
  --link-on-navy: var(--paper);  /* links on navy bands: paper text, always underlined (about 16:1) */
  --focus-color: var(--blue);
  --focus-width: 3px;
  --focus-offset: 2px;

  /* Never: --gold as text on --paper or --white (about 2.4:1, fails AA). Never: --blue on navy. */

  /* Type: all OFL, self-hosted woff2, font-display: swap, preload the two above-the-fold files */
  --font-display: "Fraunces", Georgia, serif;          /* headlines; italic for accent words, echoes "CRAFT" */
  --font-label: "Montserrat", Arial, sans-serif;       /* eyebrows, nav, buttons: 700, caps, tracked, echoes "COUCH" */
  --font-body: "Public Sans", Arial, sans-serif;       /* body copy */

  /* Fluid type scale (min 360px, max 1280px viewport) */
  --step--1: clamp(0.83rem, 0.80rem + 0.15vw, 0.94rem);
  --step-0:  clamp(1.00rem, 0.96rem + 0.22vw, 1.13rem);
  --step-1:  clamp(1.20rem, 1.12rem + 0.39vw, 1.41rem);
  --step-2:  clamp(1.44rem, 1.30rem + 0.65vw, 1.76rem);
  --step-3:  clamp(1.73rem, 1.50rem + 1.04vw, 2.20rem);
  --step-4:  clamp(2.07rem, 1.72rem + 1.58vw, 2.75rem);
  --step-5:  clamp(2.49rem, 1.95rem + 2.38vw, 3.43rem);
  --leading-tight: 1.1;
  --leading-body: 1.6;
  --measure: 66ch;
  --tracking-label: 0.14em;

  /* Spacing */
  --space-3xs: 0.25rem;
  --space-2xs: 0.5rem;
  --space-xs: 0.75rem;
  --space-s: 1rem;
  --space-m: 1.5rem;
  --space-l: 2rem;
  --space-xl: 3rem;
  --space-2xl: 4.5rem;
  --space-3xl: clamp(4.5rem, 3rem + 6vw, 8rem);
  --gutter: clamp(1rem, 0.5rem + 2.5vw, 2.5rem);
  --max-width: 76rem;

  /* Shape and depth */
  --radius-s: 4px;
  --radius-m: 10px;
  --shadow-1: 0 1px 2px rgb(7 27 58 / 0.08);
  --shadow-2: 0 8px 24px rgb(7 27 58 / 0.12);

  /* Motion */
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  --dur-fast: 150ms;
  --dur-med: 250ms;
}

@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-med: 0ms; }
  * { scroll-behavior: auto !important; }
}

/* Focus: a real outline, so it survives Windows High Contrast / forced-colors mode. Box-shadow rings disappear there. */
:focus-visible { outline: var(--focus-width) solid var(--focus-color); outline-offset: var(--focus-offset); }
.band--navy { --focus-color: var(--gold); }  /* gold on navy is 6.6:1 */
@media (forced-colors: active) { :focus-visible { outline-color: Highlight; } }

/* Breakpoints (use in media queries): 480px, 768px, 1024px, 1280px */
```

**Signature move: the craftsman's markup.** Numbered gold pins (circle, navy number, thin gold leader line) annotate real screenshots. Used on the Home before/after, case studies, industry "anatomy" sections and the Pricing receipt. It's the visual thread that says "I explain my work." Pins are real HTML (`<ol>` of callouts linked to positioned markers), not baked into images, so they're readable by screen readers.

**Design bans (from the human pass):** no purple-blue gradients, blobs, glassmorphism, sparkle icons, generic illustrations, stock photos, icon-card triplets, all-centered layouts, or one font everywhere. Left-aligned by default. Navy bands alternate with paper sections; never two navy bands in a row.

**Components (build all states: default, hover, focus-visible, active, disabled, loading, error, success where relevant):**
Button (primary navy, gold-on-navy variant, secondary outline, text link), header with nav and CTA, mobile menu, mobile sticky bar (Call | Start a project), eyebrow label, section heading, CTA band, before/after slider (keyboard operable: arrow keys move 5%, Home/End), annotation pins, work card, case study hero, comparison table, receipt list, FAQ accordion (native `<details>`), form fields (text, email, tel, url, select, checkbox), form error summary, footer.

---

## 5. Navigation

- Desktop: logo · Work · Web Design · Marketing · Lead Response · Pricing · About · **[Start a project]** button.
- Mobile: logo, menu button, and a fixed bottom bar with **Call** (`tel:{{contact.phoneE164}}`) and **Start a project** (`/start/`). Bar hides when the form is in view. While the bar shows, `html { scroll-padding-bottom }` equals its height (plus a gap), so a keyboard-focused element is never hidden under it (WCAG 2.2, 2.4.11 Focus Not Obscured).
- Footer: descriptor, service area towns, phone, email, nav links, Teardown, Calculator, Shop, Compare pages, Blog, Privacy, Terms, "Formerly ProClientFlow" line, copyright.

---

## 6. Sitemap

| Page | Slug | Purpose | Primary keyword | CTA | Index |
| --- | --- | --- | --- | --- | --- |
| Home | `/` | Who, what, where, proof | web design Sioux Falls | Start a project | yes |
| Web Design | `/web-design/` | Lead offer, Foundation vs Signature | website design Sioux Falls SD | Start a project | yes |
| Marketing | `/marketing/` | Local SEO, GBP, Care & Growth | local SEO Sioux Falls | Start a project | yes |
| Lead Response | `/lead-response/` | Former ProClientFlow product | missed call text back | Book a setup call | yes |
| Pricing | `/pricing/` | Price floors, what's included | website cost Sioux Falls | Start a project | yes |
| Work | `/work/` | Portfolio index | Sioux Falls web design portfolio | View case study | yes |
| Case: HOFBA | `/work/hall-of-fame-billiard-academy/` | Before/after story | billiards instructor website | Start a project | yes |
| Case: Nate Hall | `/work/nate-hall-insurance/` | Local live site | insurance agent website | Start a project | yes |
| Case: Top Teer | `/work/top-teer-construction/` | Local contractor (publish at launch) | remodeler website Sioux Falls | Start a project | when published |
| Built in-house | `/work/playpoolnation/` | Justin's own directory | (none) | Start a project | yes |
| Contractors | `/websites-for-contractors/` | Industry landing | contractor website design | Start a project | yes |
| Insurance agents | `/websites-for-insurance-agents/` | Industry landing | insurance agent website | Start a project | yes |
| About | `/about/` | Justin, how I work | Justin Couch web designer | Start a project | yes |
| Start | `/start/` | Project form | (none) | Submit | noindex |
| Thanks | `/start/thanks/` | Confirmation, conversion event | (none) | (none) | noindex |
| Free Teardown | `/teardown/` | Lead magnet | free website review Sioux Falls | Request teardown | yes |
| Calculator | `/tools/missed-revenue-calculator/` | Kept lead magnet | missed call cost calculator | Get the workbook | yes |
| Compare (x3) | `/compare/...` | Kept, same slugs | vs Smith.ai, etc. | Book a setup call | yes |
| Shop | `/shop/` | Kept, footer only | (none) | Buy | yes |
| Blog | `/blog/` + posts | Migrated posts, same slugs | per post | Teardown | yes |
| Privacy, Terms | `/privacy/`, `/terms/` | Legal `[CLIENT TO VERIFY]` | (none) | (none) | yes |
| 404 | `/404.html` | Recovery | (none) | Home, Start | noindex |

No city doorway pages. One service-area section lists the towns. A town gets a page only when there's a real project there.

---

## 7. Page specs and draft copy

Copy rules for every word below and anything you add: no em or en dashes, no semicolons, no banned words (Section 10), contractions, short sentences. SEO titles under 60 characters, metas under 155. Verify both lengths in a test.

Each page lists sections in order with each section's job. **★** marks the page's one non-template move.

### 7.1 Home `/`

- SEO title: `Web Design in Sioux Falls, SD | Couch & Craft`
- Meta: `Websites for Sioux Falls service businesses, built by Justin Couch. Clear prices up front, and I write the copy for you.`

1. **Hero** (split layout, text left, photo right, navy band). *Job:* make "Couch is a person" clear in 3 seconds.
   - Eyebrow: `Justin Couch · Web design in Sioux Falls, SD`
   - H1: `Your work is good. Your website should prove it.`
   - Sub: `I plan, write, design and build websites for service businesses around Sioux Falls. Then I help make sure the calls they bring in get answered.`
   - Buttons: `Start a project` (primary), `Get a free teardown` (secondary)
   - Image: environmental photo of Justin `[NEEDS REAL PHOTO]`. Until then use the supplied headshot, cropped to remove the shirt logo.
   - Alt H1 options for Justin to pick: `Websites for Sioux Falls businesses that do good work.` / `A website that looks like the business you built.`
2. **★ Before/after slider.** *Job:* proof before any claim.
   - H2: `Same instructor. Same 50 years of teaching. New website.`
   - Before: screenshot of `randygpool.wixsite.com/randygpool`. After: screenshot of the HOFBA live site `[NEEDS: live URL]`.
   - Pins on the before: (1) `A Wix ad across the top of every page` (2) `Menu pages named "copy-of-about" and "blank"` (3) `The browser tab just said "Home | randygpool"` (4) `No contact form, and the phone number wasn't tap-to-call` (5) `On a phone, the page ran off the side of the screen` (pin 5 goes on the 390px mobile capture, shown beside or below the slider on small screens)
   - All five were checked against the live Wix site on October 11, 2026. The site does show a phone number (on Contact and in the footer), so never say email was the only way to reach Randy.
   - Pins on the after: `[COPY: 3 to 4 specific decisions from the HOFBA build]`
   - Link: `Read how it came together` → case study.
3. **Sound familiar?** (four lines, left-aligned, large type). *Job:* problem first.
   - H2: `Sound familiar?`
   - `You get more calls from Facebook than from your website.`
   - `You'd rather not send a big customer to your site.`
   - `You're not sure anyone ever fills out the contact form.`
   - `You paid for a site once, and the person who built it stopped answering.`
4. **What I do** (asymmetric rows, Web Design gets the large row). *Job:* route to services.
   - H2: `What I do`
   - Websites: `A site that explains what you do, shows your work and makes it easy to call you. I write the words, so you don't have to.` → `/web-design/`
   - Getting found: `Google Business Profile, local search and a short monthly report on calls and leads.` → `/marketing/`
   - Answering missed calls: `When you can't pick up, the caller gets a text in seconds and a way to book.` → `/lead-response/`
5. **Work strip.** *Job:* real, local proof.
   - H2: `Sites I've built`
   - Cards from `site.work` where `publish !== false`. Card: screenshot, client, town, industry, `Visit the site` and `Read the story`.
6. **How a project goes.** *Job:* answer "how much of my time?"
   - H2: `How a project goes`
   - Four steps from `site.process`, each with its week count. Step blurbs: `[COPY: one line each, Phase 5]`
7. **Price band** (navy). *Job:* filter.
   - `Websites start at {{pricing.foundationFrom}}. Most full builds land around {{pricing.signatureTypical}}.` → `See pricing`
8. **Meet Justin.** *Job:* trust.
   - H2: `Who you'll be working with`
   - `I'm Justin. I live in Sioux Falls and build websites for people who'd rather be doing their real job. You'll deal with me from the first call to launch day, and after.` `[JUSTIN TO REVIEW in his own words]`
   - Link: `More about me` → `/about/`
9. **FAQ** (5 items, FAQPage schema). *Job:* objections.
   - `How much does a website cost?` → floors from config, link to Pricing.
   - `How long does it take?` → `[JUSTIN TO SET]`
   - `Do I own my website?` → `{{pricing.ownershipPolicy}}`
   - `Do you use AI?` → `Yes, for parts of the work, like research and first drafts. I check, rewrite and test everything myself before you see it. Nothing goes live that I haven't read.`
   - `What happens after launch?` → Care & Growth summary, or hand-off with a how-to guide.
10. **Inline form.** *Job:* convert without another click.
    - H2: `Tell me what's not working.`
    - Same form partial as `/start/`.

### 7.2 Web Design `/web-design/`

- SEO title: `Website Design in Sioux Falls, SD | Couch & Craft`
- Meta: `Websites for Sioux Falls service businesses. I write the copy and build the site. You get one person from first call to launch.`

1. Hero. H1: `Websites for Sioux Falls service businesses.` Sub: `For owners who know their trade and don't want to become web people. I handle the words, the design, the build and the Google setup.` Visual: stack of real client screenshots.
2. **What you get** (checklist, two columns on desktop). H2: `What's in every build`. Items: copy written for you, mobile-first design, contact form that reaches your inbox, Google Business Profile setup or cleanup, call and form tracking, speed and accessibility checks, a site you own `[JUSTIN TO CONFIRM list]`.
3. **★ Foundation vs Signature table.** Real inclusions, not "Basic/Pro/Elite" cards. Columns: Foundation, Signature. Rows: pages, copywriting, strategy session, custom design, photo direction, local SEO, schema, tracking, GBP, revisions, timeline, price from config.
4. Process (4 steps, expanded).
5. HOFBA callout with pins.
6. FAQ: hosting, edits after launch, ownership, AI use, working with an existing site.
7. CTA band: `Tell me about your business.` → `/start/`

### 7.3 Marketing `/marketing/`

- SEO title: `Local SEO in Sioux Falls, SD | Couch & Craft`
- Meta: `Show up on Google Maps when Sioux Falls searches for what you do. Google Business Profile, local SEO and a monthly report.`

1. Hero. H1: `Show up when Sioux Falls searches for what you do.`
2. What's included: Google Business Profile, local SEO, review requests, call and form tracking.
3. **★ Sample monthly report.** An HTML mock of the one-page report, clearly labeled `Sample report. Numbers are made up to show the layout.` Fake numbers here are allowed only because of that label, and only here.
4. Care & Growth plan: what's in it, `{{pricing.careMonthly}}`.
5. FAQ, CTA band.

### 7.4 Lead Response `/lead-response/`

- SEO title: `Missed Call Text Back for Contractors | Couch & Craft`
- Meta: `When you can't pick up, callers get a text in seconds and a way to book. Built for HVAC, plumbing, electrical and roofing.`

1. Notice strip: `ProClientFlow is now part of Couch & Craft. Same service, new name.`
2. Hero (carried over from proclientflow.com). H1: `Every missed call is a job you already paid for.`
3. **★ Before/after call board** from proclientflow.com, rebuilt in the new design. Stats render server-side as real text, never animated from 0. Keep the label: benchmarks are vendor-published, directional, not a guarantee. Every stat carries a visible source (publisher and year, linked). A stat with no findable source is dropped and listed in the step report `[JUSTIN TO VERIFY sources]`.
4. How it works, 3 steps (port from proclientflow.com).
5. Trades rows: HVAC, Plumbing, Electrical, Roofing. No stock photos. Use type-only rows or `[NEEDS REAL PHOTO]`.
6. Integrations line: `Works alongside Jobber, Housecall Pro and ServiceTitan.` `[JUSTIN TO VERIFY]`
7. Calculator CTA, compare page links, setup CTA (form with "Lead Response" preselected).

Migration: fetch the live proclientflow.com pages, port the content and rewrite brand mentions. Do not copy Unsplash images or the "Built with Leapd" credit.

### 7.5 Pricing `/pricing/`

- SEO title: `Website Pricing in Sioux Falls | Couch & Craft`
- Meta: `What a website costs, before you ask. Foundation and Signature builds, monthly care and missed-call follow-up.`

1. H1: `What a website costs, before you ask.` Lead sentence with both floors.
2. **★ The receipt.** Signature build itemized line by line, styled like a work order (monospace numbers, dotted leaders, gold pins on 2 or 3 lines with explanations). `[COPY: line items, Phase 5]`
3. One table: Foundation, Signature, Care & Growth, Lead Response, with prices from config.
4. `What's not included`: photography, ad spend, domain renewal `[JUSTIN TO CONFIRM]`.
5. Payment terms from config.
6. FAQ, CTA band.

### 7.6 Work `/work/`

- SEO title: `Web Design Portfolio | Couch & Craft, Sioux Falls`
- Meta: `Websites I've built for service businesses around Sioux Falls, with what changed and why I made each call.`
- H1: `Sites I've built`
- Grid of published `site.work` entries. PlayPoolNation card labeled `Built and run by me`.

### 7.7 Case study layout (`/work/*`)

1. Hero: client, industry, town, live link.
2. The problem. For HOFBA: annotated before screenshots (desktop and mobile) with the five pins from 7.1.
3. What I built: 3 or 4 decisions, each with a reason. `[COPY per case]`
4. **★** HOFBA: full-width before/after slider. Others: desktop and phone screenshots side by side with pins.
5. Results: render only if `results` is set. `[NEEDS CLIENT PROOF]`
6. Quote: render only if `quote` is set. `[NEEDS CLIENT PROOF]`
7. Next case link, CTA band.

HOFBA facts available: Randy Goettlicher, PBIA Master Instructor, 50+ years teaching, based in Dallas, Texas, lessons in Dallas or on the road. Nothing beyond that. The old Wix site's phone and email are public there but go on the new site only if they're on the HOFBA live site.

PlayPoolNation facts available: billiards venue directory built and run by Justin, 107 venue listings at last count `[JUSTIN TO VERIFY current count]`.

### 7.8 Industry pages

Contractors `/websites-for-contractors/`
- SEO title: `Contractor Website Design, Sioux Falls | Couch & Craft`
- Meta: `Websites for Sioux Falls contractors. Show your best projects before the estimate and make it easy for people to call you.`
- H1: `Websites for contractors around Sioux Falls.`
- Sub: `Your crew does good work. Your site should show it before the estimate.`
- Sections: what contractor sites need (project gallery, service area, quote form, reviews when real), **★** annotated anatomy of the Top Teer site (only once published, otherwise use a generic annotated wireframe), FAQ, CTA.

Insurance agents `/websites-for-insurance-agents/`
- SEO title: `Websites for Insurance Agents | Couch & Craft`
- Meta: `Websites for independent insurance agents that show where you're licensed and make it easy to ask for a quote.`
- H1: `Websites for independent insurance agents.`
- Sections: what agent sites need (licensing states, carrier-neutral language, compliance footer, quote form that avoids sensitive health info), **★** annotated anatomy of natehallinsurance.com, FAQ, CTA.

Each industry page has 100% unique copy. It must not read like the other with words swapped.

### 7.9 About `/about/`

- SEO title: `About Justin Couch | Couch & Craft, Sioux Falls`
- Meta: `I'm Justin Couch, a web designer in Sioux Falls. You'll deal with me from the first call to launch day, and after.`
- H1: `I'm Justin Couch. Yes, that's the Couch.`
1. Photo and story in first person. `[COPY: Justin's story, Phase 5. Day job mention only if site.about.showDayJob is true.]`
2. How I work: specific promises with numbers (reply within `{{contact.responseTime}}`, one point of contact).
3. **★** `What I won't do`: lock you in, send surprise invoices, write fake reviews, disappear after launch.
4. Tools note: `I use AI for parts of the work, like research and first drafts. A person checks every word and every line of code before it ships. That person is me.`
5. Service area towns, CTA band.

### 7.10 Start `/start/` and Thanks `/start/thanks/`

- SEO titles: `Start a Project | Couch & Craft` and `Thanks | Couch & Craft`. Both `noindex`. Start meta: `Tell me about your business and what's not working. I'll reply within {{contact.responseTime}}.` (only once `responseTime` is set).
- H1: `Start a project`
- Sub: `Tell me a bit about your business. I'll reply within {{contact.responseTime}}.`
- Form fields (minimal): Name*, Business name*, Email*, Phone, Current website (url), What's not working? (select: `My site looks outdated` / `It doesn't bring in calls` / `I don't have a site` / `I need help with Google` / `I'm missing calls` / `Something else`), checkbox `Send me a free teardown of my current site`, Message (optional). Honeypot field plus time-trap (Section 2). Hidden `form_type=project`. Accessible labels, inline errors, error summary on submit.
- What happens next: 3 short steps.
- Phone link for people who'd rather call.
- Thanks: `Got it. I'll be in touch within {{contact.responseTime}}.` Fire `generate_lead`.

### 7.11 Teardown `/teardown/`

- SEO title: `Free Website Teardown, Sioux Falls | Couch & Craft`
- Meta: `Send me your website and I'll record a short video showing what's costing you calls. Free, and no pitch unless you ask.`
- H1: `Send me your website. I'll tell you what's costing you calls.`
- Example teardown video `[NEEDS: record one]`. Form: URL and email only, hidden `form_type=teardown`. What you'll get: `A 10-minute recorded video walking through the fixes that matter most. No pitch unless you ask.`

### 7.12 Migrated pages

- `/tools/missed-revenue-calculator/`, the three `/compare/` pages, `/shop/` and `/blog/` posts: port content from proclientflow.com into the new layouts. Keep slugs. Rewrite "ProClientFlow" to "Couch & Craft" except where history matters. Remove stock photos.
- Migrated copy follows the same rules as new copy (Section 10). Rewrite it during Step 12 so it passes the Step 15 checks. Nothing is exempt.
- **Checkout:** the static site can't take payments itself. Shop items and the calculator workbook link out to a hosted checkout that also delivers the file. `[JUSTIN TO SET: checkout provider (for example Stripe Payment Links or Lemon Squeezy), product prices, and whether the workbook is paid or a free lead magnet]`. Until set, Shop and the workbook download render "Coming back soon" with a link to `/start/`.
- Add a 404 title: `Page Not Found | Couch & Craft` (`noindex`).

---

## 8. SEO, schema and redirects

- One H1 per page. Unique title and meta per page. Canonicals on every page. `sitemap.xml` (indexable pages only), `robots.txt`.
- Open Graph: 1200x630 default image (navy, logo, descriptor) plus per-page images for Home, Web Design, Lead Response and each case study. `og:site_name` = `Couch & Craft`.
- Internal links: every service page links to Pricing, Work and Start. Every case study links to its industry page.
- Every page has a unique SEO title (under 60) and meta (under 155) from this spec or `[COPY: meta]`. `scripts/check.js` enforces lengths and uniqueness.
- NAP: name, phone and service area exactly match the Google Business Profile. Service-area business: no street address in schema or footer.

JSON-LD (generated from config, in `partials/schema.njk`):
- Sitewide: `ProfessionalService` with `name`, `url`, `logo`, `image`, `telephone`, `email`, `areaServed` (list of City objects), `founder` (Person: Justin Couch), `sameAs` (only non-null social links). No `address.streetAddress`, no `aggregateRating` until real reviews exist.
- `Person` for Justin on About.
- `Service` on Web Design, Marketing and Lead Response (`provider` = the ProfessionalService, `areaServed`, `offers.price` only if set).
- `FAQPage` wherever the FAQ partial renders.
- `BreadcrumbList` on every page except Home.

Redirects (301). Add proclientflow.com to Hostinger as an **addon domain** (its own folder, not a parked alias, so its rules can't touch couchandcraft.com). Put these in that folder's `.htaccess` (source: `redirects/proclientflow.htaccess`):

| From (proclientflow.com) | To (couchandcraft.com) |
| --- | --- |
| `/` | `/lead-response/` |
| `/shop`, `/shop?trade=*` | `/shop/` (drop the query string with the `QSD` flag) |
| `/products/missed-revenue-calculator-workbook` | `/tools/missed-revenue-calculator/` |
| `/products/done-for-you-ai-lead-response-setup` | `/lead-response/#setup` |
| `/products/managed-lead-response-retainer` | `/lead-response/` |
| `/products/<kit slug>` (the six kits) | `/shop/#<kit slug>` (decided October 11, 2026) |
| `/compare/*` | `/compare/*` |
| `/blog/*` | `/blog/*` |
| anything else | `/lead-response/` |

Each old URL redirects in one hop, `http` and `https`, with and without `www`.

On couchandcraft.com: force https and `www` (decided, matches `business.url`), add trailing slashes, return a real 404. Security headers in `.htaccess`: `Strict-Transport-Security` (start with `max-age=300`, raise to a year after launch checks pass), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, mic, geolocation off), and a `Content-Security-Policy` that allows self plus GA4 (`googletagmanager.com`, `google-analytics.com`) and the checkout provider once chosen. The one inline script (in `layouts/base.njk`, it swaps the `no-js` class for `js`) is allowed by its `sha256` hash, not `unsafe-inline`. `style-src` does allow `'unsafe-inline'`, because pins and layout helpers use `style` attributes for positions. HTTPS is forced by Hostinger's "Force HTTPS" setting, since the site sits behind Hostinger's CDN.

Search Console Change of Address: before launch, check what the tool requires of the old homepage redirect. If it warns that `/` → `/lead-response/` isn't a homepage-to-homepage move, decide with Justin whether to send `/` to `/` instead.

---

## 9. Accessibility, performance and tracking

- WCAG 2.2 AA. Contrast per the token notes. Visible focus on every interactive element (`:focus-visible` outline from the tokens, gold on navy bands). Skip link. Keyboard-operable slider, menu and FAQ. Target size at least 24x24 CSS px (44px for the mobile bar). `prefers-reduced-motion` respected. Form errors announced. Alt text on every meaningful image, empty alt on decorative ones.
- Performance budgets: LCP under 2.5s, INP under 200ms, CLS under 0.1, PageSpeed mobile 90+ on Home, Web Design and a case study. Self-hosted, subset woff2 fonts with preloads. AVIF/WebP with `srcset` and explicit dimensions. No render-blocking third-party scripts. GA4 loaded async.
- GA4 events: `generate_lead` (form success), `teardown_request`, `phone_click` (any `tel:` link, with location), `email_click`, `calculator_download`, `cta_click` (with label and page), `before_after_interact`. Mark `generate_lead` and `phone_click` as key events in GA4.

---

## 10. Human pass rules (apply to everything)

**Copy:** no em or en dashes, no semicolons. No "It's not X, it's Y." No automatic groups of three. No tidy summary lines at the end of sections. No same-formula headings. No openers like "Look no further," "In today's fast-paced world," "Whether you're."
Banned words: delve, elevate, empower, seamless, unlock, robust, leverage, streamline, comprehensive, cutting-edge, top-notch, one-stop shop, tailored solutions, passionate about, trusted partner, we pride ourselves, journey.
Write like Justin talks. Use local details and real numbers. Read it aloud.

**Design:** see the design bans in Section 4. Every page gets its one ★ move and no two pages share a layout for their second section.

**Images:** never use AI images where visitors would assume real people, real work or real places. Use `[NEEDS REAL PHOTO]`. Screenshots of real client sites are captured with Playwright at 1440px and 390px.

**Code:** no AI-style explanatory comments, no `console.log`, no lorem ipsum, no `href="#"` (use `<button>` for actions), no unused CSS or JS, no generator meta tags, no default favicon (use the C&C mark at 16, 32, 180 and 512 px plus an SVG once the vector logo exists). Semantic HTML. BEM-style class names, kebab-case files.

---

## 11. Images needed

| Image | Placement | Ratio | Source | Alt text | File name |
| --- | --- | --- | --- | --- | --- |
| Justin at work in Sioux Falls | Home hero | 4:5 | `[NEEDS REAL PHOTO]` | Justin Couch working on a website at his desk in Sioux Falls | justin-at-work.jpg |
| Justin headshot (supplied, logo cropped) | About, Meet Justin | 4:5 | Supplied | Justin Couch, web designer in Sioux Falls | justin-couch.jpg |
| HOFBA before (Wix) | Home slider, case study | 16:10, 9:19 | Captured October 11, 2026 at 1440px and 390px (`src/assets/img/work/source/`). Never recapture over these | The old Wix site for Randy G., with a Wix ad banner at the top | hofba-before-desktop.png, hofba-before-mobile.png |
| HOFBA after | Home slider, case study | 16:10 | Playwright capture | The new Hall of Fame Billiard Academy website | hofba-after.png |
| Nate Hall Insurance desktop + mobile | Work, case study, insurance page | 16:10, 9:19 | Playwright capture | Nate Hall Insurance website on desktop and phone | nate-hall-insurance-desktop.png, nate-hall-insurance-mobile.png |
| Top Teer desktop + mobile | When published | 16:10, 9:19 | Playwright capture | Top Teer Construction website on desktop and phone | top-teer-construction-desktop.png, top-teer-construction-mobile.png |
| PlayPoolNation desktop | Work | 16:10 | Playwright capture | PlayPoolNation venue directory homepage | playpoolnation-desktop.png |
| Default OG image | Social shares | 1200x630 | Built from brand | Couch & Craft, web design in Sioux Falls | og-default.jpg |

---

## 12. Build order (one step at a time)

Run each step, check its acceptance list, commit with the message shown, then report and stop.

**Step 1: Scaffold**
Set up Eleventy, `site.config.json`, `src/_data/site.js`, folder structure from Section 2, `npm run dev` and `npm run build`. Add `scripts/check.js` (config is valid JSON with the expected keys, and the title/meta/H1 checks) and the `open` and `isSet` filters from Section 0, rule 6.
Accept: dev server runs, build outputs `dist/`. A broken `site.config.json` fails the build. A production build fails while any rendered open value remains.
Commit: `Scaffold Eleventy site and config`

**Step 2: Tokens, fonts and base styles**
Create `tokens.css` from Section 4, self-host Fraunces, Montserrat and Public Sans (subset, woff2), base typography, layout container, focus styles, reduced motion.
Accept: a temporary `/styleguide/` page (noindex, excluded from sitemap, deleted at Step 15) shows every type step, color with its contrast ratio, and button states.
Commit: `Add design tokens, fonts and base styles`

**Step 3: Layout shell**
Base layout, header with nav and CTA, mobile menu, mobile sticky bar, footer, CTA band, breadcrumb partial, schema partial, meta/OG partial.
Accept: keyboard-only navigation works. Mobile bar shows under 768px and hides when a form is in view. No horizontal scroll at 360px.
Commit: `Build layout shell, header, footer and mobile bar`

**Step 4: Components**
Before/after slider, annotation pins, work card, comparison table, receipt list, FAQ (`<details>`), form partial with validation and error summary.
Accept: slider works with mouse, touch and arrow keys. Pins are an ordered list linked to markers. axe shows 0 serious issues on the styleguide.
Commit: `Add reusable components`

**Step 5: Home**
Build 7.1 in full.
Accept: one H1, title and meta lengths pass, form submits to a stub, Lighthouse mobile 90+ locally. The stub is a `api/contact.php` that validates and redirects without sending mail. Test it locally with `php -S localhost:8081 -t dist`, since the Eleventy dev server doesn't run PHP.
Commit: `Build home page`

**Step 6: Service pages**
Web Design, Marketing, Lead Response (with proclientflow.com content ported).
Commit: `Build service pages`

**Step 7: Pricing**
Commit: `Build pricing page`

**Step 8: Work and case studies**
Work index, case study layout, HOFBA, Nate Hall, PlayPoolNation. Top Teer built but `publish: false`. Capture screenshots with Playwright.
Commit: `Build work section and case studies`

**Step 9: Industry pages**
Contractors and insurance agents.
Commit: `Build industry pages`

**Step 10: Deploy pipeline**
GitHub Action that runs a check build on pull requests, and on a push to `main` runs `npm run build:prod` and `npm run check`, then uploads `dist/` to `public_html` over FTP. Credentials in GitHub Actions secrets only. No staging site. Setup steps are in `DEPLOY.md`.
Accept: a pull request runs the build, check and accessibility scan without uploading. A push to `main` deploys only when the production build passes.
Commit: `Add deploy pipeline`

**Step 11: About, Start, Thanks, Teardown, form handler**
`api/contact.php` with honeypot, time-trap, validation, SMTP send and redirect. SMTP credentials from `contact-config.php` above `public_html` (Section 2). Test with a real submission on the live site after launch, or locally with `php -S` against a real SMTP account before then.
Commit: `Build about, start, teardown and contact handler`

**Step 12: Migrated pages**
Calculator, compare pages, shop, blog, from proclientflow.com.
Commit: `Migrate ProClientFlow content`

**Step 13: SEO and redirects**
Titles, metas, canonicals, JSON-LD, sitemap, robots, OG images, `.htaccess` for both domains.
Accept: Rich Results Test valid for ProfessionalService, Service, FAQPage, BreadcrumbList. Every proclientflow.com URL in Section 8 returns a single 301 to the right page.
Commit: `Add SEO, schema and redirects`

**Step 14: Analytics and accessibility pass**
GA4 events from Section 9. Full axe pass on every template. Keyboard walkthrough.
Accept: 0 critical, 0 serious axe issues. Events visible in GA4 DebugView.
Commit: `Add analytics events and fix accessibility issues`

**Step 15: Human pass and pre-launch QA**
Delete `/styleguide/`. Run `npm run check -- --prelaunch`: banned words, em/en dashes and semicolons in **visible text** (Section 0, rule 7), `[COPY:`, `[NEEDS`, `[JUSTIN TO`, `[CLIENT TO`, `lorem` in visible text, and `console.log`, `href="#"`, generator tags in raw output. Then a production build, which fails on any open value. Report every hit.
Commit: `Human pass and pre-launch cleanup`

---

## 13. QA and launch checklist

| Check | Tool | Pass |
| --- | --- | --- |
| Links | crawl `dist/` (e.g. linkinator) | No 404s, no internal redirects |
| Forms | real submission on live site | Email arrives, thanks page loads, `generate_lead` fires |
| Breakpoints | 360, 390, 768, 1024, 1440 | No overflow, tap targets OK |
| Browsers | Chrome, Safari (iOS), Firefox, Edge | Layout and slider work |
| Speed | PageSpeed Insights mobile | 90+, LCP under 2.5s, INP under 200ms, CLS under 0.1 |
| Accessibility | axe DevTools, keyboard | 0 critical/serious, visible focus, no traps |
| Schema | Rich Results Test | Valid, no errors |
| Redirects | `curl -I` each old URL | One 301 hop to the right page |
| Copy | `npm run check -- --prelaunch` (Step 15) | Zero hits |
| Open items | production build (`ELEVENTY_ENV=production`) | Builds without error |
| Headers | securityheaders.com or `curl -I` | HSTS, CSP, nosniff, Referrer-Policy present |

**Launch:** DNS to Hostinger, SSL active, force https, Search Console for both domains (submit sitemap, use Change of Address from proclientflow.com), GA4 key events marked, Google Business Profile website link updated to couchandcraft.com, backups enabled on Hostinger, update the "Website by Justin Couch" credit on client sites to link to couchandcraft.com.

---

## 14. Open items for Justin (block launch)

- Prices for every rung, payment terms, ownership policy
- Logo vector files (SVG or AI)
- Business phone, email, response time, hours
- HOFBA live URL
- Quotes from Nate and Randy (optional, sections hide without them)
- Top Teer launch date
- Environmental photo of Justin
- GA4 measurement ID
- Decision: mention the day job on About? (default: no)
- Confirm Lead Response integrations (Jobber, Housecall Pro, ServiceTitan)
- Record one example teardown video
- Shop checkout provider, product prices, and whether the calculator workbook is paid or free
- SMTP mailbox for form delivery (`contact-config.php` on the server)
- Hostinger FTP details in the `production` environment secrets
- Sources for every Lead Response stat
- Privacy and Terms copy (must mention GA4 and the form handler)
