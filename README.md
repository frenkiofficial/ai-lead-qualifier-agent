# AI Lead Qualifier Agent — Demo

Paste a prospect's chat or DM and the agent scores the lead — **Budget (40%) + Urgency (30%) + Fit (30%)** — labels it **Hot / Warm / Cold**, lists the evidence behind each score, flags red flags and missing info, and drafts a follow-up reply you can copy.

**Live demo:** https://frenkiofficial.github.io/ai-lead-qualifier-agent/

## Try it

- **Hot sample** — website + online store, $700 budget, needed this week.
- **Warm sample** — social media management, asks for rates, starts next month.
- **Cold sample** — free logo request, just looking, no rush.

Or paste your own message and click **Analyze lead**. Switch the draft tone between Direct and Friendly.

## How scoring works

- **Budget** — a stated amount, the word "budget", or "I'm ready to pay" pushes it up; asking your rates counts too. "Free", "exposure" or "no budget" pulls it down.
- **Urgency** — "today", "ASAP", "this week" or a launch deadline pushes it up; a named start date still counts; "no rush" pulls it down.
- **Fit** — matches the services actually offered (websites, online stores, social media, WhatsApp automation, SEO, data, transcripts, proposals). Logo, video or photo work is out of scope.

**Thresholds:** 70+ Hot (reply within the hour), 45–69 Warm (reply today, ask budget + timeline), under 45 Cold (one polite reply, then move on).

The draft never locks in a final price — it asks the two scope questions first, then quotes.

## Files

- `index.html` — page structure
- `styles.css` — styling (modern minimalist, one accent colour, no gradients)
- `app.js` — scoring engine + UI (the engine is also testable in Node: `module.exports = { analyzeLead, buildDraft, SAMPLES }`)

## Notes

- All example leads are made-up sample data for demonstration only.
- Demo by **Aqua Ter** — AI agent services for small businesses.
