/* AI Lead Qualifier Agent — demo.
   Scoring is deliberately simple and explainable: every point comes from
   something the lead actually said. Lead score = Budget x 40% + Urgency x 30% + Fit x 30%.
   Hot >= 70, Warm >= 45, Cold < 45. */

'use strict';

var SERVICE_GROUPS = [
  { key: 'website', label: 'Website / landing page',
    re: /\bwebsite\b|landing page|web ?site|web page/,
    questions: ['how many pages do you need', 'do you have the text and photos ready, or should I prepare them'] },
  { key: 'store', label: 'Online store',
    re: /online store|shopify|e-?commerce|product pages|checkout|payment setup|store setup/,
    questions: ['how many products will you list at launch', 'which payment method do you want — card, PayPal, or bank transfer'] },
  { key: 'social', label: 'Social media & content',
    re: /social media|instagram|facebook|tiktok|manage (?:our|my) (?:instagram|facebook|social)|posting|content (?:creation|writing|planning)/,
    questions: ['which platform should we start with', 'how many posts per week'] },
  { key: 'whatsapp', label: 'WhatsApp automation',
    re: /whatsapp|auto-?reply|automatic replies/,
    questions: ['which replies should be automatic', 'how many chats do you get per day'] },
  { key: 'seo', label: 'SEO articles',
    re: /\bseo\b|blog (?:post|article)|article writing|blog writing/,
    questions: ['what topics should the first articles cover', 'how many articles per month'] },
  { key: 'data', label: 'Data & reports',
    re: /spreadsheet|data entry|\breport\b|tidy (?:up )?(?:my |the )?data|\bexcel\b/,
    questions: ['what does the data look like now — spreadsheet, PDF, or something else', 'what should the final report show'] },
  { key: 'transcript', label: 'Transcription',
    re: /transcri(?:be|ption)|transcript/,
    questions: ['how long is the recording', 'do you need timestamps'] },
  { key: 'proposal', label: 'Presentation / proposal',
    re: /presentation|proposal|pitch deck|\bslides?\b/,
    questions: ['how many slides', 'when is the deadline'] }
];

var OUT_OF_SCOPE_RE = /\blogo\b|\bvideo\b|photo (?:editing|shoot)|flyer|business card/;

var SAMPLES = {
  hot: {
    label: 'Hot',
    text: "Hi! I'm Maria, I run a small skincare brand in Manila and I need a website with an online store — product pages, checkout, and payment setup. My budget is around $700 and I need it live this week because we're launching a new product on Friday. I've been stuck on this for a month. Are you available to start today?"
  },
  warm: {
    label: 'Warm',
    text: "Hello, I own a small bakery and I'm looking for someone to manage our Instagram and Facebook — posting 3 times a week and replying to comments. What are your rates? We'd like to start next month if the price is right."
  },
  cold: {
    label: 'Cold',
    text: "Hey, do you do logos? I need a logo for my new business. Not sure about budget yet, maybe we can work something out for free or exposure — I have a lot of followers. Just exploring options for now, no rush at all."
  }
};

function clamp(n) { return Math.max(0, Math.min(100, n)); }

function detectName(text) {
  var m = text.match(/(?:my name is|this is|i'?m|i am)\s+([A-Z][a-z]{2,})/i);
  if (m) {
    var bad = ['looking', 'writing', 'interested', 'reaching', 'hoping', 'wondering', 'just', 'here', 'the', 'not', 'trying', 'happy', 'glad'];
    if (bad.indexOf(m[1].toLowerCase()) === -1) return m[1];
  }
  return null;
}

function detectTimeline(text) {
  var t = text.toLowerCase();
  var phrases = ['this week', 'next month', 'today', 'asap', 'by friday', 'by monday', 'in a few days'];
  for (var i = 0; i < phrases.length; i++) {
    if (t.indexOf(phrases[i]) !== -1) return phrases[i];
  }
  return null;
}

function analyzeLead(raw) {
  var text = (raw || '').trim();
  var t = ' ' + text.toLowerCase() + ' ';
  var signals = { budget: [], urgency: [], fit: [] };
  var redFlags = [];

  /* ---- Budget (40%) ---- */
  var budget = 20;
  var amount = text.match(/\$[\d,]+(?:\.\d{1,2})?|\b\d[\d,]*\s*(?:usd|dollars?)\b/i);
  if (amount) { budget += 35; signals.budget.push('Budget stated: ' + amount[0].trim()); }
  if (/\bbudget\b/.test(t)) { budget += 15; signals.budget.push('Mentions a budget'); }
  if (/willing to pay|i'?m paying|happy to pay|ready to pay|i can pay/.test(t)) { budget += 15; signals.budget.push('Says they are ready to pay'); }
  if (/how much|what(?:'s| is) your (?:rate|price|pricing)|your rates|what do you charge|\bcost\b/.test(t)) { budget += 20; signals.budget.push('Asks about price / rates'); }
  if (/if the price is right|depends on (?:the )?price|affordable|within (?:my )?budget/.test(t)) { budget += 10; signals.budget.push('Price-sensitive, still engaged'); }
  var freeWork = /for free|free work|no budget|no money|exposure|in exchange|barter|can'?t afford|cannot afford/.test(t);
  if (freeWork) { budget -= 20; signals.budget.push('Asks for free work / no budget'); redFlags.push('Asks for free work or "exposure" — no money on the table'); }
  budget = clamp(budget);

  /* ---- Urgency (30%) ---- */
  var urgency = 25;
  if (/asap|urgent|immediately|right away|right now|\btoday\b/.test(t)) { urgency += 30; signals.urgency.push('Needs it today / ASAP'); }
  if (/this week|by (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|in a few days|need it by/.test(t)) { urgency += 20; signals.urgency.push('Deadline this week'); }
  if (/\bsoon\b|launching|\blaunch\b|deadline|stuck (?:for|on)|been (?:waiting|stuck)/.test(t)) { urgency += 15; signals.urgency.push('Launch / deadline pressure'); }
  if (/\bstart\b/.test(t)) { urgency += 5; signals.urgency.push('Names a start'); }
  if (/next month|in a (?:month|few weeks)/.test(t)) { urgency += 5; signals.urgency.push('Start date: next month'); }
  var noRush = /no rush|take your time|\bsomeday\b|just exploring|whenever|no hurry/.test(t);
  if (noRush) { urgency -= 15; signals.urgency.push('No rush / just exploring'); }
  urgency = clamp(urgency);
  if (noRush) redFlags.push('No urgency — "just exploring", no deadline at all');

  /* ---- Fit (30%) ---- */
  var fit = 30;
  var services = [];
  for (var i = 0; i < SERVICE_GROUPS.length; i++) {
    if (SERVICE_GROUPS[i].re.test(t)) services.push(SERVICE_GROUPS[i]);
  }
  var counted = Math.min(services.length, 3);
  fit += counted * 20;
  services.forEach(function (s) { signals.fit.push('Matches service: ' + s.label); });
  if (/\b(business|brand|store|company|startup|shop|bakery|salon|clinic|product|launch)\b/.test(t)) { fit += 10; signals.fit.push('A real business, not a personal favour'); }
  var outOfScope = OUT_OF_SCOPE_RE.test(t);
  if (services.length === 0 && outOfScope) {
    fit -= 25;
    signals.fit.push('Out-of-scope request (logo / video / photo)');
    redFlags.push('Out-of-scope service — logo / video / photo work is not offered');
  } else if (services.length > 0 && outOfScope) {
    redFlags.push('Also asks for logo / video — out of scope, clarify the main job');
  }
  fit = clamp(fit);

  var overall = Math.round(budget * 0.4 + urgency * 0.3 + fit * 0.3);
  var label = overall >= 70 ? 'Hot' : overall >= 45 ? 'Warm' : 'Cold';

  var wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount > 0 && wordCount < 6) redFlags.push('Too little detail to judge — only ' + wordCount + ' words');

  /* ---- Missing info ---- */
  var missing = [];
  if (budget < 40) missing.push('No budget stated — ask for a range');
  if (urgency < 40) missing.push('No deadline given — ask when they need it');
  if (fit < 40) missing.push('Service unclear or out of scope — clarify what they need');
  if (missing.length === 0) missing.push('Nothing critical missing — you have enough to reply');

  return {
    text: text,
    overall: overall,
    label: label,
    budget: budget,
    urgency: urgency,
    fit: fit,
    signals: signals,
    redFlags: redFlags,
    missing: missing,
    services: services.map(function (s) { return s.label; }),
    serviceKeys: services.map(function (s) { return s.key; }),
    name: detectName(text),
    timeline: detectTimeline(text),
    freeWork: freeWork,
    outOfScopeOnly: services.length === 0 && outOfScope
  };
}

function serviceQuestions(a) {
  if (a.serviceKeys.length > 0) {
    var g = SERVICE_GROUPS.filter(function (s) { return s.key === a.serviceKeys[0]; })[0];
    return g.questions;
  }
  return ['what exactly do you need built', 'when do you need it'];
}

function servicePhrase(a) {
  if (a.services.length === 0) return 'a website or online store';
  if (a.services.length === 1) return a.services[0].toLowerCase();
  return a.services.slice(0, 2).join(' and ').toLowerCase();
}

function timelineBit(a) {
  if (!a.timeline) return '';
  var p = a.timeline;
  if (p.indexOf('month') !== -1) return ' Starting ' + p + ' works for me.';
  return ' ' + p.charAt(0).toUpperCase() + p.slice(1) + ' works for me.';
}

function buildDraft(a, tone) {
  var name = a.name || 'there';
  var q = serviceQuestions(a);
  var q1 = q[0], q2 = q[1];
  var friendly = tone === 'friendly';
  var service = servicePhrase(a);

  if (a.label === 'Hot') {
    if (friendly) {
      return 'Hi ' + name + ' — thanks so much for reaching out! I\'d love to build ' + service + ' for you.' + timelineBit(a) +
        ' Before I can give you a firm quote, could you tell me ' + q1 + ' and ' + q2 +
        '? Once I have those, I\'ll confirm today and we can get started right away.\n\n— Aqua Ter';
    }
    return 'Hi ' + name + ' — thanks for reaching out. Yes, I can build ' + service + ' for you.' + timelineBit(a) +
      ' To give you a firm quote I need two quick details: ' + q1 + ' and ' + q2 +
      '. Send those over and I can confirm today and start right away.\n\n— Aqua Ter';
  }

  if (a.label === 'Warm') {
    if (friendly) {
      return 'Hi ' + name + ' — thanks for getting in touch! Happy to help with ' + service +
        '. My pricing depends on the scope, so if you can share ' + q1 + ' and ' + q2 +
        ', I\'ll send you a firm quote — no fixed price before I know what you need.' + timelineBit(a) +
        ' Looking forward to it.\n\n— Aqua Ter';
    }
    return 'Hi ' + name + ' — thanks for the message. I do ' + service +
      '. Pricing depends on scope, so once I know ' + q1 + ' and ' + q2 +
      ' I can give you a firm quote — I don\'t lock a price before I see the scope.' + timelineBit(a) +
      ' Let me know and we\'ll take it from there.\n\n— Aqua Ter';
  }

  var coldNote;
  if (a.freeWork) coldNote = 'I don\'t take on unpaid work, and logo design isn\'t a service I offer.';
  else if (a.outOfScopeOnly) coldNote = 'Logo design isn\'t a service I offer.';
  else coldNote = 'I\'m not the right fit for this one right now.';
  if (friendly) {
    return 'Hi ' + name + ' — thanks for the message, and no worries at all. ' + coldNote +
      ' If you ever need ' + service + ', just drop me a line.\n\n— Aqua Ter';
  }
  return 'Hi ' + name + ' — thanks for reaching out. ' + coldNote +
    ' If you ever need ' + service + ', feel free to message me then.\n\n— Aqua Ter';
}

var VERDICT = {
  Hot: {
    line: 'Ready to buy — budget, timeline and service all check out.',
    action: 'Reply within the hour. Confirm the two scope questions, then quote and start.'
  },
  Warm: {
    line: 'Interested, but the budget or timeline is still open.',
    action: 'Reply today. Ask for a budget range and a start date before you quote.'
  },
  Cold: {
    line: 'Low intent or out of scope — not worth chasing.',
    action: 'One polite reply, then move on. Don\'t spend more time here.'
  }
};

/* ---- Browser UI (skipped in Node, where only the engine is tested) ---- */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    var leadText = document.getElementById('leadText');
    var charCount = document.getElementById('charCount');
    var inputError = document.getElementById('inputError');
    var analyzeBtn = document.getElementById('analyzeBtn');
    var clearBtn = document.getElementById('clearBtn');
    var logPanel = document.getElementById('logPanel');
    var agentLog = document.getElementById('agentLog');
    var results = document.getElementById('results');
    var tone = 'direct';
    var lastAnalysis = null;

    function copyText(text, stateEl, doneMsg) {
      function done() { stateEl.textContent = doneMsg; setTimeout(function () { stateEl.textContent = ''; }, 2500); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
      } else {
        fallbackCopy(text, done);
      }
    }
    function fallbackCopy(text, done) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* clipboard unavailable */ }
      document.body.removeChild(ta);
      done();
    }

    leadText.addEventListener('input', function () {
      charCount.textContent = String(leadText.value.length);
      inputError.hidden = true;
    });

    function renderSignals(elId, list) {
      var el = document.getElementById(elId);
      el.innerHTML = '';
      if (list.length === 0) {
        var none = document.createElement('span');
        none.className = 'signal none';
        none.textContent = 'Nothing detected';
        el.appendChild(none);
        return;
      }
      list.forEach(function (s) {
        var chip = document.createElement('span');
        chip.className = 'signal';
        chip.textContent = s;
        el.appendChild(chip);
      });
    }

    function renderList(elId, items, cls, emptyText) {
      var el = document.getElementById(elId);
      el.innerHTML = '';
      if (items.length === 0) {
        var li = document.createElement('li');
        li.className = 'ok';
        li.textContent = emptyText;
        el.appendChild(li);
        return;
      }
      items.forEach(function (item) {
        var li = document.createElement('li');
        li.className = cls;
        li.textContent = item;
        el.appendChild(li);
      });
    }

    function renderResults(a) {
      var badge = document.getElementById('verdictBadge');
      badge.className = 'verdict-badge ' + a.label.toLowerCase();
      badge.textContent = a.label + ' lead';
      document.getElementById('verdictLine').textContent = VERDICT[a.label].line;
      document.getElementById('verdictAction').textContent = VERDICT[a.label].action;
      document.getElementById('overallScore').textContent = String(a.overall);
      document.getElementById('overallFill').style.width = a.overall + '%';
      document.getElementById('budgetScore').textContent = String(a.budget);
      document.getElementById('budgetFill').style.width = a.budget + '%';
      document.getElementById('urgencyScore').textContent = String(a.urgency);
      document.getElementById('urgencyFill').style.width = a.urgency + '%';
      document.getElementById('fitScore').textContent = String(a.fit);
      document.getElementById('fitFill').style.width = a.fit + '%';
      renderSignals('budgetSignals', a.signals.budget);
      renderSignals('urgencySignals', a.signals.urgency);
      renderSignals('fitSignals', a.signals.fit);
      renderList('flagList', a.redFlags, 'flag', 'No red flags in this message.');
      renderList('missingList', a.missing, 'missing', '');
      document.getElementById('draftBody').textContent = buildDraft(a, tone);
      results.hidden = false;
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function runAnalysis() {
      var text = leadText.value.trim();
      if (text.length < 3) {
        inputError.hidden = false;
        leadText.focus();
        return;
      }
      inputError.hidden = true;
      results.hidden = true;
      logPanel.hidden = false;
      agentLog.innerHTML = '';
      analyzeBtn.disabled = true;
      var steps = [
        'Reading the message…',
        'Scoring budget, urgency and fit…',
        'Checking red flags and missing info…',
        'Drafting your follow-up…'
      ];
      steps.forEach(function (step, i) {
        setTimeout(function () {
          var li = document.createElement('li');
          li.textContent = step;
          agentLog.appendChild(li);
          li.classList.add('done');
          if (i === steps.length - 1) {
            setTimeout(function () {
              lastAnalysis = analyzeLead(text);
              renderResults(lastAnalysis);
              analyzeBtn.disabled = false;
            }, 220);
          }
        }, 260 * (i + 1));
      });
    }

    analyzeBtn.addEventListener('click', runAnalysis);

    clearBtn.addEventListener('click', function () {
      leadText.value = '';
      charCount.textContent = '0';
      inputError.hidden = true;
      results.hidden = true;
      logPanel.hidden = true;
      lastAnalysis = null;
      document.querySelectorAll('.sample-btn').forEach(function (b) { b.classList.remove('active'); });
      leadText.focus();
    });

    document.querySelectorAll('.sample-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.sample-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        leadText.value = SAMPLES[btn.getAttribute('data-sample')].text;
        charCount.textContent = String(leadText.value.length);
        inputError.hidden = true;
        runAnalysis();
      });
    });

    document.querySelectorAll('.tone-pills .pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        document.querySelectorAll('.tone-pills .pill').forEach(function (p) {
          p.classList.remove('active');
          p.setAttribute('aria-selected', 'false');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-selected', 'true');
        tone = pill.getAttribute('data-tone');
        if (lastAnalysis) {
          document.getElementById('draftBody').textContent = buildDraft(lastAnalysis, tone);
        }
      });
    });

    document.getElementById('copyDraftBtn').addEventListener('click', function () {
      var draft = document.getElementById('draftBody').textContent;
      copyText(draft, document.getElementById('copyDraftState'), 'Copied — paste it into your reply.');
    });

    document.getElementById('copyDmBtn').addEventListener('click', function () {
      var dm = document.getElementById('dmText').textContent;
      copyText(dm, document.getElementById('copyDmState'), 'Copied.');
    });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { analyzeLead: analyzeLead, buildDraft: buildDraft, SAMPLES: SAMPLES, VERDICT: VERDICT };
}
