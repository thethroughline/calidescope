# Calidescope — lean site, 5 August 2026

Twenty pages, **2,965 words total** — the seventeen read pages come to 2,596, and privacy,
terms and the thank-you carry the rest. All generated from `build.py`.

## The rules this site is built on

1. **Five seconds.** Headline plus one sentence tells you what this is. Everything else is for whoever keeps scrolling.
2. **Natural language.** Contractions. Short words. No triads, no em-dash flourishes, nothing that reads like it was generated.
3. **No timing promises.** No "five business days," no "forty-five minutes," no "we reply the same day." The delivery line is *"And we hand back something you can use right away."*
3a. **Literal nouns.** Name the actual document, never the abstraction. "Your review" is "Your quarterly review." "Your pitch" is "Your deck or page." "A score" is "A score out of 100." "Ready to use" is "Copy you can paste in." Part-page headings say what they are: **"Proof is these two moments."**
3b. **Positive framing.** Nothing is described by what it lacks. "Real copy, not notes" became "Ready to use." Every case-study headline reads as the turnaround, not the trouble. The closing section asks *"Which one could be better?"* rather than naming what's broken.
3c. **Three under each part.** Promise, Perform and Proof each carry three engagements. The three Perform ones are workflow and operations work — five analytics teams onto one operating model, one audience view across a venue portfolio, one customer record after a merger. They were previously mis-filed under Proof, which left the Perform page showing pink Proof tiles.
4. **No client names.** *Holding company one / two / three*, or a category ("a financial services account").
5. **No AI language.** Zero occurrences across all seventeen pages.
6. **Opportunity, never fault.** *"Your work is good. Your collateral could carry more of it."* The CTA everywhere is **"Show us something that could be better."**
7. **No email address on the site.** Everything routes to the contact form.

## Pages

| | words | |
|---|---|---|
| `index.html` | 313 | hero → three parts → the arc → what you get → numbers → which one could be better → CTA |
| `promise.html` `perform.html` `proof.html` | ~205 each | one line, the arc, what you get, where it worked |
| `throughline.html` | 158 | the software, three steps |
| `case-studies.html` | ~185 | nine, three under each part |
| `case-study-*.html` | ~130 each | nine detail pages, one sentence per Situation / Task / Action / Result |
| `why.html` | 157 | three numbers and two sentences |
| `contact.html` | 109 | the form |
| `thanks.html` | 30 | where the form lands when JavaScript is off. `noindex`, not in the sitemap |
| `privacy.html` `terms.html` | ~470 / ~380 | generated too, in the site's own hand. `noindex`, not in the sitemap |

## The form

The form posts to `/api/contact` — our own endpoint, not a third party. `api/contact.js`
runs on Vercel and mails the note to **bret@calidescope.llc** through Resend, with the
sender's address set as `Reply-To`, so replying in the mail client answers them directly.

- **With JavaScript** the page posts JSON and swaps the form for *"Got it."* in place.
- **Without it** the browser posts the form normally and the endpoint redirects to `thanks.html`.
- The honeypot (`_gotcha`) answers bots with a cheerful 200 and sends nothing.
- Five sends per email address per ten minutes.
- Fields collected: name, email, what it is, link, and what it has to do.

### The one setting

In the Vercel project, add:

```
RESEND_API_KEY = <from resend.com>
```

That is the whole setup. Two optional overrides, both with sane defaults:

| | default | |
|---|---|---|
| `CONTACT_TO` | `bret@calidescope.llc` | where the note lands |
| `CONTACT_FROM` | `Calidescope <onboarding@resend.dev>` | Resend's shared sender — no DNS setup, delivers to the address the Resend account is under |

Once `calidescope.llc` is verified in Resend (three DNS records), set `CONTACT_FROM` to
something like `Calidescope <hello@calidescope.llc>` and the mail stops arriving from a
resend.dev address. Nothing else changes.

**Until `RESEND_API_KEY` is set the form says "The form is not connected yet."**

## Before you push

1. **Copy `assets/fonts/` in** from `calidescope-site-official.zip`. Every page links `assets/fonts/fonts.css` and nothing else — no third-party font call, which is what `privacy.html` asserts. **Without this the site renders in Helvetica.** *(Done — the fonts, `favicon.svg` and `consent.js` were already in this repo and were kept.)*
2. **`privacy.html` and `terms.html` are generated now too**, so the whole site is one design and one voice. The copy carries over with three changes the new site forced: the form exists, so privacy says what it collects and that a mail provider delivers it; there is no email address on the page, so both route to the contact form (house rule 7); and terms no longer needs its line about client names, because no case study names one. Effective date moved to **August 4, 2026** — the policy changed materially, so leaving July's date would have been wrong. **Read both before you rely on them.**
3. **301s for the old case-study URLs** — done, in `vercel.json`. Nine old slugs map to their new page; six retired ones (`barkley` `comscore` `disney` `motherboard` `rnbw` `usheru`) go to `case-studies.html`, and `example` / `workflow` go home.
4. **Read the nine case studies.** Situation / Task / Action / Result were reconstructed from the one-line summaries on the live site plus the public record.
5. **Sanity-check 300+.** The model is in `claude/copy-decisions-aug4.md`.

## Verified

20 pages load · zero JavaScript errors · zero broken internal links · one `<h1>` per page · no third-party font calls · no browser storage · no pure white · clean at 1400px and 375px.

The endpoint was run against a local stand-in for `vercel dev` with the Resend call intercepted:
happy path 200 with the right payload and `Reply-To` · missing fields 400 · bad address 400 ·
honeypot 200 with nothing sent · no-JavaScript post 303 to `thanks.html` · `GET` 405 · sixth send
from one address 429 · a mail failure leaves the filled form and says so.

## To change anything

Everything lives in `build.py`: `PARTS` (the offer), `CASES` (the record), and the page bodies. Edit, run `python3 build.py`, done. The sitemap regenerates with it.


## The arc — "Three jobs, in order."

`arc(active_part)` in `build.py` builds it as **HTML, not SVG**, so the labels are real text at real sizes and stay readable on a phone. Eight moments, three coloured zones, an arrow at the right. No time dimension — no months, no dates.

It appears four times: on the homepage with all three lit, and on each part page with only that part's moments in colour and the rest hollow. Same picture every time, so a reader learns it once.

On screens under 820px it flips to a vertical stack — one coloured rule per zone, labels at 14px. That is the reason it is HTML: an SVG's text would have scaled down to about 6px on a phone.

## The opportunity tiles

Five tiles, each an inline geometric glyph plus a benefit — a deck, a browser window, a page, a bar chart, two boxes and an arrow. This replaced five sentences that all began with "could," which read as a tic.


## Icons

Twelve inline glyphs, all geometric, 2px stroke, no fills. Five on the opportunity tiles (a monitor, a browser window, a page, a bar chart, two boxes and an arrow) and seven on the delivery lists (marked-up page, gauge, page and pen, node map, ranked bars, calendar, claim with three supports). Each takes the page's accent colour. The three brand marks — triangle, square, circle — now also sit above Promise, Perform and Proof in the three-up rows.
