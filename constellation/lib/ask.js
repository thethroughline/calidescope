/* The question-led Library: a coach's question, read into parts they can see and change. Pure, Node or browser.

     CLQ.read(lib, text, ctx)   { q, chips, alts, unused }       the question, read into a query
     CLQ.answer(lib, q, o)      { total, lives, span, line, items, shared, refine, nearest, checked }
     CLQ.shelf(lib, memberId)   [{ group, items: [{ text, q, n }] }]   the questions coaches bring, each counted
     CLQ.compare(lib, a, b, m)  { shared, rows }                 two stories side by side, facts only
     CLQ.gaps(lib)              the shelf's thin answers, worst first: where to write and check next
     CLQ.toQS(q) / fromQS(p)    the query is the URL, so any answer is a link

   A facet is closed vocabulary (a woman, law, before 1950, quieter, Sarah's age) and filters. The situation is
   proposed from the question's words (core's interpret, plus the cue phrases below) and is always shown as a chip the
   coach can change. Every reason a card prints comes from a field on the record; the one exception is a sentence
   quoted from the moment, and it is shown as a quotation. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.CLQ = factory(root.CLC);
}(typeof self !== 'undefined' ? self : this, function (CLC) {
  'use strict';

  // The situation said of a person, in the past tense: the line a card and a heading print.
  var DID = {
    A1: 'started a job nobody had explained', A2: 'led people who had been their peers', A3: 'named a problem nobody else saw',
    A4: 'followed someone the place loved', A5: 'answered for work they could not judge', B1: 'saw their work go out in another voice',
    B2: 'led in a style nobody expected', B3: 'was told one thing, then the opposite', B4: 'was hard to place',
    B5: 'had to say who they were in their own words', B6: 'had to be heard in a room that decides', C1: 'had to sell what they used to make',
    C2: 'stood on their own name', C3: 'moved people they did not control', D1: 'led more people than they could see',
    D2: 'grew people without a bench', D3: 'stopped work people were proud of', D4: 'carried a decision they did not make',
    E1: 'was read for every act', E2: 'agreed, and did not move', E3: 'lost the work they were best at', E4: 'was good at it, and becalmed'
  };
  // Words people use for a situation that the corpus does not. One place to edit. They propose a reading, never decide it.
  var CUES = {
    A1: ['judged on', 'success looks like', 'what the job', 'nobody told', 'expected of', 'no brief', 'expects', 'criteria', 'first ninety days', 'new job'],
    A2: ['peer', 'old team', 'teammates', 'my friends', 'used to sit', 'report to me', 'their manager', 'their boss', 'wanted my job', 'wanted her job', 'wanted his job', 'wanted their job', 'wanted the job', 'promoted over', 'promoted above', 'former colleague', 'applied for', 'rival', 'trained with', 'captain over', 'over teammates', 'over her teammates', 'over his teammates'],
    A3: ['everything is fine', 'things are fine', 'inherited', 'a mess', 'numbers are bad', 'nobody sees', 'nobody saw', 'nobody else saw', 'in trouble', 'named a problem', 'problem nobody'],
    A4: ['predecessor', 'replaced', 'before me', 'adored', 'loved', 'legend', 'shoes', 'would have done', 'comparing me', 'founder', 'followed'],
    A5: ["can't check", "can't judge", 'could not judge', 'know more than', 'sign off', 'specialist', 'not my field', "i'm not a", 'could not do'],
    B1: ['credit', 'as his own', 'as her own', 'his name on', 'her name on', 'another voice', 'somebody else'],
    B2: ['quiet in', 'is quiet', 'introvert', 'forceful', 'louder', 'shout', 'presence', 'speak up', 'style', 'will not shout'],
    B3: ['too soft', 'too harsh', 'too nice', 'too tough', 'too direct', 'assertive enough', 'mixed messages', 'contradict', 'one thing, then'],
    B4: ['background', "don't fit", 'hard to place', 'what to do with me', 'unusual', 'take me seriously', 'came from'],
    B5: ['introduction', 'introduce myself', 'announce myself', 'announce herself', 'announce himself', 'town hall', 'generic', 'own words', 'my voice', 'how it sounds'],
    B6: ['expert', 'never invite', 'not in the room', 'steer around', 'after the strategy', 'room that decides', 'heard'],
    C1: ['selling', 'sell', 'pitch', 'new clients', 'win work', 'find my own work', 'business development', 'bring in'],
    C2: ["firm's name", 'own name', 'stood on', 'stand on', 'knows the firm', 'by name', 'name on the door', 'for the agency', 'the firm, not'],
    C3: ['steering committee', "don't report", "doesn't report", 'no authority', 'other departments', 'stakeholders', 'before the meeting', 'do not control', "don't control", 'coalition'],
    D1: ['hundred', 'offices', 'only see', 'two levels down', 'skip-level', "can't see", 'more people than'],
    D2: ['delegate to', 'no one to', 'bench', 'people left', 'moved to another', 'grow people', 'without a bench'],
    D3: ['old job', 'let go of', 'old clients', 'on top of', 'still doing', 'still review', 'shut down', 'stop the', 'stopped work'],
    D4: ['head office', 'layoffs', 'redundanc', 'not my decision', 'argued against', "didn't choose", 'did not choose', 'disagree', 'did not make', "didn't make", 'reorg', 'restructur', 'closing', 'the board picked', 'have to sell it', 'a decision', 'orders', 'carri', 'carry', 'thought were wrong', 'thought was wrong'],
    E1: ['read into', 'signal', 'every move', 'noticed', 'meant something', 'thought i was', 'announc', 'whole group', 'watching', 'watched', 'explains every', 'explaining', 'every decision'],
    E2: ["keep not", 'keep saying', 'kept agreeing', 'never acted', 'nothing happens', 'nothing moves', 'meaning to', 'avoid', 'hard conversation', 'agrees and'],
    E3: ['miss doing', 'miss it', 'used to be the best', "don't get to", 'craft', 'best at'],
    E4: ['bored', 'coasting', 'nothing left to learn', 'plateau', 'becalmed', 'autopilot', 'gone stale', 'stale']
  };
  var CUE_WEIGHT = 0.15;   // tuned on the panel's held-out questions: it keeps every fresh score and lifts the rest
  var FIELD_WORDS = [
    ['law', /\b(law|lawyers?|legal|a judge|judges|attorneys?|barristers?|solicitors?|courts?)\b/],
    ['business', /\b(business|bankers?|banking|finance|financiers?|investors?|ceos?|companies|company|chief executives?)\b/],
    ['public', /\b(politic\w*|government|public life|public service|ministers?|presidents?|generals?|military|diplomats?)\b/],
    ['media', /\b(advertising|ad agenc\w*|media|journalis\w*|marketing|editors?|creators?)\b/],
    ['sport', /\b(sport|sports|athletes?|players?|captains?)\b/],
    ['music', /\b(music|musicians?|singers?|bands?|composers?)\b/],
    ['arts', /\b(film|actors?|actress(?:es)?|artists?|writers?|novelists?|architects?|designers?|chefs?)\b/],
    ['ideas', /\b(scien\w*|faith|philosoph\w*|thinkers?|inventors?)\b/]
  ];
  var FIELD_LABEL = { public: 'Politics & public life', law: 'Law', business: 'Business & finance', media: 'Advertising & media', sport: 'Sport', music: 'Music', arts: 'Film, art & letters', ideas: 'Science, ideas & faith' };
  var CELEB = ['sport', 'music', 'film', 'influencer'];   // by domain: the worlds of modern fame
  var STANCE_TRAIT = [
    [/too nice|people.pleas|wants? to be liked|avoids? conflict|soft touch/, ['weight'], 'too nice', 'leads by carrying the weight'],
    [/does (?:it all|everything) (?:herself|himself|themselves)|micromanag|can't let go|cannot let go|won't delegate|does everything/, ['ootw', 'grow'], 'does it all', 'leads by stepping out of the way or growing others'],
    [/steamroll|bulldoz|too blunt|too forceful/, ['close', 'grow'], 'steamrolls', 'leads by staying close or growing others'],
    [/hides? behind/, ['front'], 'hides behind the firm', 'leads out front']
  ];
  var SCENE = {
    rival: { ask: /wanted (?:my|her|his|their|the) (?:job|role)|thought (?:he|she|they)'?d get|passed over|\brival|applied for (?:my|this|the) job/, scene: /\brival|wanted (?:the|his|her) job|wanted the job themselves|passed over|had wanted/i, label: 'someone who wanted the job' },
    predecessor: { ask: /predecessor|before me|still in the building|founder/, scene: /predecessor|took over from|founder|succeeded/i, label: 'a predecessor' },
    forced: { ask: /fired|sacked|forced out|pushed out|let go of me/, scene: /\bfired\b|dismissed|sacked|ousted|forced out/i, label: 'being forced out' },
    first: { ask: /first woman|only woman|first black|only black/, scene: /first wom[ae]n|only wom[ae]n|first black|first african/i, label: 'being the first' },
    writing: { ask: /in writing|a letter|a memo|an email/, scene: /\bletter\b|\bmemo\b|wrote to/i, label: 'putting it in writing' }
  };
  var DIRECT = { direct: 'Direct', calibrated: 'Measured', indirect: 'Indirect' };
  var REACH = { near: 'Close to an ordinary office', mid: 'Some way from an office', far: 'Far from an ordinary office' };
  var AREA_FIELD = { Sport: 'sport', Music: 'music', 'Film & TV': 'arts', Creators: 'media', Art: 'arts', 'Books & writing': 'arts', Business: 'business', 'Politics & public life': 'public' };
  var NUMERIC = /^(before|after|age|nocel|notus|ok|line|mine|nothero)$/;

  function fold(s) { return CLC.fold(s).replace(/[’‘]/g, "'"); }
  function cap(s) { s = String(s || ''); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function yl(y) { return CLC.yearLabel(y); }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function memberOf(lib, id) { return id && lib.members[id] ? lib.members[id] : null; }
  function heroesOf(m) { var h = (m && m.heroes_icons) || {}; return (h.core || []).concat(h.reserve ? [h.reserve] : []); }
  function ageAt(lib, s) { var ic = lib.icon[s.icon]; return ic && ic.born != null && s.year != null ? s.year - ic.born : null; }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // ---------- the situation, proposed ----------
  // core's reading (the question's words against each situation's stories and sayings) plus the cue phrases.
  function situationScores(lib, text, M) {
    var sc = {}, low = ' ' + fold(text).replace(/[^a-z0-9' ]+/g, ' ') + ' ';
    lib.situations.forEach(function (s) { sc[s.id] = 0; });
    CLC.interpret(lib, text, lib.situations.length).forEach(function (x) { sc[x.sit.id] = x.score; });
    Object.keys(CUES).forEach(function (id) {
      CUES[id].forEach(function (c) { if (new RegExp('\\b' + esc(c).replace(/'/g, "'?")).test(low)) sc[id] += CUE_WEIGHT; });
    });
    if (M && M.sits) M.sits.forEach(function (id) { if (sc[id] > 0) sc[id] += 0.04; });   // a tie goes to the member's own
    return Object.keys(sc).map(function (id) { return { id: id, score: sc[id] }; }).filter(function (x) { return x.score > 0.06; })
      .sort(function (a, b) { return b.score - a.score; });
  }

  // ---------- reading a question ----------
  // Closed facets read first and take their words; the situation is proposed from what is left.
  function read(lib, text, ctx) {
    ctx = ctx || {}; text = String(text || '').trim();
    var q = { t: text }, rest = ' ' + fold(text).replace(/[^a-z0-9' ]+/g, ' ') + ' ', used = {};
    function take(re) {
      var hit = null;
      rest = rest.replace(re, function (m) { hit = hit || m; m.split(/[^a-z0-9']+/).forEach(function (w) { if (w) used[w] = 1; }); return ' '.repeat(m.length); });
      return hit;
    }
    function g(re) { return new RegExp(re.source, 'g'); }
    var mid = ctx.m || null;
    lib.order.forEach(function (id) { var m = lib.members[id]; if (take(new RegExp("\\b" + fold(m.first) + "(?:'s)?\\b", 'g'))) mid = id; });
    if (mid) q.m = mid;
    var M = memberOf(lib, mid);
    STANCE_TRAIT.forEach(function (t) { if (!q.stance && take(g(t[0]))) { q.stance = t[1].join('+'); q.trait = t[2]; } });
    if (take(/\b(a woman|women|female|herself)\b/g)) q.sex = 'f';
    else if (take(/\b(a man|men|male|himself)\b/g)) q.sex = 'm';
    if (take(/\b(celebrit\w*|famous people|stars)\b/g)) q.nocel = 1;
    else FIELD_WORDS.forEach(function (f) { if (!q.field && take(g(f[1]))) q.field = f[0]; });
    var b = rest.match(/\b(?:before|earlier than|pre)\s*(\d{3,4})\b/); if (b) { q.before = +b[1]; take(/\b(?:before|earlier than|pre)\s*\d{3,4}\b/g); }
    var a = rest.match(/\b(?:after|since|post)\s*(\d{4})\b/); if (a) { q.after = +a[1]; take(/\b(?:after|since|post)\s*\d{4}\b/g); }
    var dec = rest.match(/\b(1[5-9]|20)(\d)0s\b/);
    if (dec && !q.before && !q.after) { var d0 = +(dec[1] + dec[2] + '0'); q.after = d0; q.before = d0 % 100 === 0 ? d0 + 100 : d0 + 10; take(/\b(1[5-9]|20)\d0s\b/g); }
    if (take(/\b(19th century|nineteenth century|victorian)\b/g)) { q.after = 1800; q.before = 1900; }
    if (take(/\b(ancient|classical)\b/g)) q.before = 500;
    if (!q.before && !q.after && take(/\b(historic\w*|long ago|from history)\b/g)) q.before = 1950;
    if (!q.before && !q.after && take(/\b(modern|recent|contemporary)\b/g)) q.after = 1990;
    if (take(/\b(her|his|their|same|my) age\b/g) && M && M.age) q.age = M.age;
    if (take(/\b(young|younger|twenties|in their 20s|under 30)\b/g)) q.age = 26;
    if (take(/\b(late career|older|fifties|sixties|over 55)\b/g)) q.age = 58;
    if (take(/\b(not (?:another )?american|outside the (?:us|united states)|non american|abroad)\b/g)) q.notus = 1;
    if (take(/\b(quieter|quiet version|gentler|softer|indirect\w*|measured|calibrated|punishes the direct(?: move)?|political|careful)\b/g)) q.dir = 'quiet';
    else if (take(/\b(more direct|blunt|out loud)\b/g)) q.dir = 'direct';
    if (take(/\b(ordinary|everyday|close to home|near)\b/g)) q.reach = 'near';
    else if (take(/\b(big story|grand|epic)\b/g)) q.reach = 'far';
    if (take(/\b(send today|ready to send|checked|verified|can send)\b/g)) q.ok = 1;
    if (take(/\b(a line|something to say|words to say|quotable)\b/g)) q.line = 1;
    Object.keys(SCENE).forEach(function (k) { if (!q.cue && SCENE[k].ask.test(fold(text))) q.cue = k; });

    // the situation: an explicit code, else the proposal from the words left, else the member's own
    var sits = [], alts = [], code = rest.match(/\b([a-e][1-6])\b/);
    if (code && lib.sit[code[1].toUpperCase()]) { sits = [code[1].toUpperCase()]; take(/\b[a-e][1-6]\b/g); }
    else {
      var sc = situationScores(lib, rest, M);
      if (sc.length && sc[0].score >= 0.12) {
        sits = [sc[0].id];
        if (sc[1] && sc[1].score >= 0.18 && sc[1].score >= sc[0].score * 0.5) sits.push(sc[1].id);
      }
      alts = sc.filter(function (o) { return sits.indexOf(o.id) < 0; }).map(function (o) { return o.id; });
      // the words that carried the reading count as read
      var sx = CLC.sitIndex(lib);
      sits.forEach(function (id) {
        var key = lib.sit[id].key, low = fold(rest);
        rest.split(/[^a-z0-9']+/).forEach(function (w) { if (w && (sx[key][w] || 0) > 0.02) used[w] = 1; });
        CUES[id].forEach(function (c) { var m = low.match(new RegExp('\\b' + esc(c) + "[a-z']*", 'g')); (m || []).forEach(function (h) { h.split(/\s+/).forEach(function (w) { used[w] = 1; }); }); });
      });
    }
    if (q.trait === 'too nice' && sits.indexOf('B3') < 0) alts.unshift('B3');
    if (q.trait === 'does it all' && !sits.length) sits = ['D3'];
    if (q.trait === 'hides behind the firm' && !sits.length) sits = ['C2'];
    if (sits.length) q.sit = sits.join('+'); else if (M && !q.trait && !hasFacet(q)) q.mine = 1;
    if (M && M.sits) M.sits.forEach(function (id) { if (sits.indexOf(id) < 0 && alts.indexOf(id) < 0) alts.push(id); });
    var STOPW = /^(a|an|the|who|whom|has|have|had|for|of|to|in|on|at|is|was|were|with|and|or|their|they|them|someone|somebody|something|story|stories|member|members|people|person|i|my|me|we|our|that|this|it|be|been|about|one|what|from|by|did|do|does|whose|her|his|she|he|version|can|not|set|used|any|some|will|would|could|should|there|then|than|when|where|which|while|who's|she's|he's|i'm|it's|we're|they're|just|really|actually|again|still|next|week|being|getting|having|today|tomorrow|thursday|friday|monday|tuesday|wednesday|saturday|sunday)$/;
    var unused = uniq(fold(text).split(/[^a-z0-9']+/).filter(function (w) { return w && !used[w] && !STOPW.test(w) && w.length > 2; }));
    return { q: q, chips: chips(lib, q), alts: alts.slice(0, 4).map(function (id) { return { id: id, label: id + ' · ' + cap(DID[id]), n: (lib.byKey[lib.sit[id].key] || []).length }; }), unused: unused };
  }
  function hasFacet(q) { return ['sex', 'field', 'nocel', 'before', 'after', 'age', 'notus', 'dir', 'reach', 'stance', 'ok', 'line', 'cue'].some(function (k) { return q[k] != null && q[k] !== ''; }); }

  // The query as plain-word chips: what the Library understood. Each one can be taken away.
  function chips(lib, q) {
    var c = [], M = memberOf(lib, q.m);
    if (q.sit) q.sit.split('+').forEach(function (id) { if (lib.sit[id]) c.push({ k: 'sit', v: id, label: id + ' · ' + cap(DID[id]), kind: 'sit' }); });
    if (q.mine && M) c.push({ k: 'mine', label: 'In ' + M.first + '’s situations: ' + M.sits.join(', '), kind: 'sit' });
    if (q.sex) c.push({ k: 'sex', label: q.sex === 'f' ? 'A woman' : 'A man' });
    if (q.field && FIELD_LABEL[q.field]) c.push({ k: 'field', label: 'From ' + FIELD_LABEL[q.field].toLowerCase() });
    if (q.nocel) c.push({ k: 'nocel', label: 'No sport, music, film or creators' });
    if (q.before && q.after) c.push({ k: 'era', label: 'Set between ' + q.after + ' and ' + (q.before - 1) });
    else if (q.before) c.push({ k: 'before', label: 'Set before ' + yl(q.before) });
    else if (q.after) c.push({ k: 'after', label: 'Set since ' + q.after });
    if (q.age) c.push({ k: 'age', label: 'About ' + q.age + ' at the time' + (M && M.age === q.age ? ', as ' + M.first + ' is' : '') });
    if (q.notus) c.push({ k: 'notus', label: 'Outside the United States' });
    if (q.dir) c.push({ k: 'dir', label: q.dir === 'quiet' ? 'A quieter way: measured or indirect' : 'Direct' });
    if (q.reach) c.push({ k: 'reach', label: REACH[q.reach] });
    if (q.stance) c.push({ k: 'stance', label: cap(STANCE_TRAIT.filter(function (t) { return t[1].join('+') === q.stance; }).map(function (t) { return t[3]; })[0] || q.stance) + ' (proposed)' });
    if (q.ok) c.push({ k: 'ok', label: 'Checked against its source' });
    if (q.line) c.push({ k: 'line', label: 'Has a line to borrow' });
    if (q.nothero && M) c.push({ k: 'nothero', label: 'Beyond ' + M.first + '’s heroes' });
    if (q.cue && SCENE[q.cue]) c.push({ k: 'cue', label: 'Scenes with ' + SCENE[q.cue].label + ' first', kind: 'cue' });
    if (q.m && M) c.push({ k: 'm', label: 'For ' + M.first, kind: 'member' });
    return c;
  }

  // ---------- answering ----------
  function facets(lib, q) {
    var F = [], I = lib.icon, M = memberOf(lib, q.m);
    var keysOf = function (ids) { return ids.filter(function (id) { return lib.sit[id]; }).map(function (id) { return lib.sit[id].key; }); };
    if (q.sit) { var ks = keysOf(q.sit.split('+')); F.push({ k: 'sit', t: function (s) { return s.keys.some(function (k) { return ks.indexOf(k) >= 0; }); } }); }
    if (q.mine && M) { var mk = keysOf(M.sits); F.push({ k: 'mine', t: function (s) { return s.keys.some(function (k) { return mk.indexOf(k) >= 0; }); } }); }
    if (q.sex) F.push({ k: 'sex', t: function (s) { return I[s.icon].sex === q.sex; } });
    if (q.field) F.push({ k: 'field', t: function (s) { return I[s.icon].field === q.field; } });
    if (q.nocel) F.push({ k: 'nocel', t: function (s) { return CELEB.indexOf(I[s.icon].domain) < 0; } });
    if (q.before) F.push({ k: q.after ? 'era' : 'before', t: function (s) { return s.year != null && s.year < q.before && (!q.after || s.year >= q.after); } });
    else if (q.after) F.push({ k: 'after', t: function (s) { return s.year != null && s.year >= q.after; } });
    if (q.age) F.push({ k: 'age', t: function (s) { var a = ageAt(lib, s); return a != null && Math.abs(a - q.age) <= 4; } });
    if (q.notus) F.push({ k: 'notus', t: function (s) { return !/US/.test(I[s.icon].geo || 'US'); } });
    if (q.dir) F.push({ k: 'dir', t: function (s) { return q.dir === 'quiet' ? s.directness === 'calibrated' || s.directness === 'indirect' : s.directness === 'direct'; } });
    if (q.reach) F.push({ k: 'reach', t: function (s) { return s.reach === q.reach; } });
    if (q.stance) { var st = q.stance.split('+'); F.push({ k: 'stance', t: function (s) { return st.indexOf(I[s.icon].stance) >= 0; } }); }
    if (q.ok) F.push({ k: 'ok', t: function (s) { return s.verified; } });
    if (q.nothero && M) F.push({ k: 'nothero', t: function (s) { return heroesOf(M).indexOf(s.icon) < 0; } });
    if (q.line) F.push({ k: 'line', t: function (s) { return !!s.pattern; } });
    return F;
  }
  function filter(lib, F) { return lib.stories.filter(function (s) { return F.every(function (f) { return f.t(s); }); }); }

  // The reasons a card prints: the facets asked for first, then what fits the member. All from fields.
  function reasons(lib, s, q) {
    var ic = lib.icon[s.icon], M = memberOf(lib, q.m), r = [], a = ageAt(lib, s);
    var asked = q.sit ? q.sit.split('+') : q.mine && M ? M.sits : [];
    s.keys.forEach(function (k) { var st = lib.sitByKey[k]; if (st && asked.indexOf(st.id) >= 0) r.push({ type: 'sit', text: cap(DID[st.id]), code: st.id }); });
    var two = (q.sit || '').split('+').filter(function (id) { return lib.sit[id]; });
    if (two.length > 1 && two.every(function (id) { return s.keys.indexOf(lib.sit[id].key) >= 0; })) r.unshift({ type: 'sit', text: 'Carries both' });
    if (q.cue && SCENE[q.cue] && SCENE[q.cue].scene.test(s.moment)) {
      var line = CLC.sentences(s.moment).filter(function (x) { return SCENE[q.cue].scene.test(x); })[0];
      if (line) r.unshift({ type: 'scene', text: '“' + line + '”' });
    }
    if (q.sex) r.push({ type: 'sex', text: ic.sex === 'f' ? 'A woman' : 'A man' });
    if (q.field || q.nocel) r.push({ type: 'field', text: ic.domainLabel });
    if (q.before || q.after) r.push({ type: 'year', text: yl(s.year) });
    if (q.age && a != null) r.push({ type: 'age', text: 'About ' + a + ' at the time' });
    if (q.notus) r.push({ type: 'place', text: ic.place || 'Outside the United States' });
    if (q.dir && s.directness) r.push({ type: 'dir', text: DIRECT[s.directness] });
    if (q.reach) r.push({ type: 'reach', text: REACH[s.reach] });
    if (q.stance && ic.stanceName) r.push({ type: 'stance', text: 'Leads by ' + ic.stanceName.toLowerCase() + ' (proposed)' });
    if (M) {
      if (heroesOf(M).indexOf(s.icon) >= 0) r.push({ type: 'fit', text: 'One of ' + M.first + '’s heroes' });
      if (!q.age && M.age && a != null && Math.abs(a - M.age) <= 4) r.push({ type: 'fit', text: 'About ' + a + ' at the time; ' + M.first + ' is ' + M.age });
      var ints = (M.ints || []).filter(function (n) { return AREA_FIELD[n] === ic.field; });
      if (ints.length && !q.field) r.push({ type: 'fit', text: 'From ' + ints[0].toLowerCase() + ', which ' + M.first + ' follows' });
    }
    return r;
  }
  function fitScore(lib, s, q) {
    var M = memberOf(lib, q.m), n = 0, a = ageAt(lib, s), ic = lib.icon[s.icon];
    if (M) {
      if (heroesOf(M).indexOf(s.icon) >= 0) n += 3;
      if (M.age && a != null && Math.abs(a - M.age) <= 4) n += 1;
      if ((M.ints || []).some(function (i) { return AREA_FIELD[i] === ic.field; })) n += 1;
    }
    if (q.cue && SCENE[q.cue] && SCENE[q.cue].scene.test(s.moment)) n += 4;
    var two = (q.sit || '').split('+').filter(function (id) { return lib.sit[id]; });
    if (two.length > 1 && two.every(function (id) { return s.keys.indexOf(lib.sit[id].key) >= 0; })) n += 2.5;
    return n + (s.verified ? 1.5 : 0) + (s.reach === 'near' ? 0.6 : s.reach === 'mid' ? 0.3 : 0);
  }
  function answer(lib, q, o) {
    o = o || {}; var F = facets(lib, q);
    if (!F.length) return { q: q, chips: chips(lib, q), empty: true, total: 0, lives: 0, items: [], shared: [], refine: [], nearest: [], checked: 0 };
    var hit = filter(lib, F);
    hit.sort(function (a, b) { return fitScore(lib, b, q) - fitScore(lib, a, q) || ((a.year || 0) - (b.year || 0)) || (a.id < b.id ? -1 : 1); });
    var ys = hit.map(function (s) { return s.year; }).filter(function (y) { return y != null; }).sort(function (a, b) { return a - b; });
    var items = hit.slice(0, o.limit || 24).map(function (s) { return { story: s, card: CLC.storyCard(lib, s), reasons: reasons(lib, s, q) }; });
    // a reason every card shares is said once, above them; each card keeps what sets it apart
    var shared = items.length > 1 ? items[0].reasons.filter(function (r) { return r.type !== 'fit' && r.type !== 'scene' && items.every(function (it) { return it.reasons.some(function (x) { return x.text === r.text; }); }); }).map(function (r) { return r.text; }) : [];
    items.forEach(function (it) { it.own = it.reasons.filter(function (r) { return shared.indexOf(r.text) < 0; }); });
    var did = (q.sit ? q.sit.split('+') : []).filter(function (id) { return DID[id]; }).map(function (id) { return DID[id]; });
    var span = ys.length ? [ys[0], ys[ys.length - 1]] : null;
    var res = { q: q, chips: chips(lib, q), total: hit.length, lives: uniq(hit.map(function (s) { return s.icon; })).length, span: span,
      line: (did.length ? 'Someone who ' + did.join(', or who ') : 'Stories') + (span ? (span[0] === span[1] ? ', in ' + yl(span[0]) : ', between ' + yl(span[0]) + ' and ' + yl(span[1])) : '') + '.',
      checked: hit.filter(function (s) { return s.verified; }).length, items: items, shared: shared };
    res.refine = refine(lib, q, hit);
    res.nearest = hit.length < 4 && F.length > 1 ? F.map(function (f) {
      var others = F.filter(function (g) { return g !== f; }), n = filter(lib, others).length;
      return { without: res.chips.filter(function (c) { return c.k === f.k; }).map(function (c) { return c.label; })[0] || f.k, n: n, q: drop(q, f.k) };
    }).filter(function (x) { return x.n > hit.length; }).sort(function (a, b) { return b.n - a.n; }) : [];
    return res;
  }
  function drop(q, k, v) {
    var q2 = Object.assign({}, q);
    if (k === 'sit' && v && q2.sit) { var rest = q2.sit.split('+').filter(function (id) { return id !== v; }); if (rest.length) q2.sit = rest.join('+'); else delete q2.sit; return q2; }
    if (k === 'era') { delete q2.before; delete q2.after; } else delete q2[k];
    if (k === 'stance') delete q2.trait;
    return q2;
  }
  // Ways to narrow: facets not asked yet that split the answer, each with its count, so no tap leads to nothing.
  function refine(lib, q, hit) {
    var I = lib.icon, out = [], N = hit.length; if (N < 4) return out;
    function add(k, v, label, t) { if (q[k]) return; var n = hit.filter(t).length; if (n > 0 && n < N) out.push({ k: k, v: v, label: label, n: n }); }
    add('sex', 'f', 'A woman', function (s) { return I[s.icon].sex === 'f'; });
    add('sex', 'm', 'A man', function (s) { return I[s.icon].sex === 'm'; });
    add('before', 1950, 'Before 1950', function (s) { return s.year < 1950; });
    add('after', 2000, 'Since 2000', function (s) { return s.year >= 2000; });
    add('reach', 'near', 'Close to an office', function (s) { return s.reach === 'near'; });
    add('dir', 'quiet', 'Quieter', function (s) { return s.directness === 'calibrated' || s.directness === 'indirect'; });
    add('nocel', 1, 'No celebrities', function (s) { return CELEB.indexOf(I[s.icon].domain) < 0; });
    add('ok', 1, 'Checked', function (s) { return s.verified; });
    return out;
  }

  // ---------- the shelf: the questions coaches bring, each counted ----------
  // Data, not code: Jim can reword, add or retire a question here. A count that falls to nought shows on the page.
  var SHELF = [
    ['What is happening', [
      ['Who has led people who used to be their peers?', { sit: 'A2' }],
      ['Who followed someone the place loved?', { sit: 'A4' }],
      ['Who named a problem nobody else could see?', { sit: 'A3' }],
      ['Who answered for work they could not judge?', { sit: 'A5' }],
      ['Who had to win work after years of doing it?', { sit: 'C1' }],
      ['Who carried a decision they did not make?', { sit: 'D4' }],
      ['Who announced something to a room that held someone who wanted their job?', { sit: 'E1+A2', cue: 'rival' }]
    ]],
    ['Who my member is', [
      ['A story for a member who is too nice', { stance: 'weight', reach: 'near' }],
      ['A member who explains every decision after making it', { sit: 'E1' }],
      ['A member who does everything themselves', { sit: 'D3+D2', stance: 'ootw+grow' }],
      ['A member who is quiet and will not shout', { sit: 'B2' }],
      ['A member who hides behind the firm’s name', { sit: 'C2' }],
      ['A member who agrees and does not move', { sit: 'E2' }]
    ]],
    ['Who will land with them', [
      ['A woman who carried a decision she disagreed with', { sit: 'D4', sex: 'f' }],
      ['Someone from law who stood on their own name', { sit: 'C2', field: 'law' }],
      ['Set before 1950, for a member wary of modern celebrities', { before: 1950, nocel: 1 }],
      ['Not another American, following a legend', { sit: 'A4', notus: 1 }],
      ['Someone under 30 who led their former peers', { sit: 'A2', age: 26 }],
      ['A man who led in a style nobody expected', { sit: 'B2', sex: 'm' }]
    ]],
    ['How it should land', [
      ['A quieter way to lead former peers', { sit: 'A2', dir: 'quiet' }],
      ['A quieter way to stop the old work', { sit: 'D3', dir: 'quiet' }],
      ['Close to an ordinary office, for being heard', { sit: 'B6', reach: 'near' }],
      ['A big, far story for someone who is being watched', { sit: 'E1', reach: 'far' }],
      ['A line a member can borrow, about former peers', { sit: 'A2', line: 1 }],
      ['Checked against its source and ready to send', { ok: 1 }]
    ]]
  ];
  function shelf(lib, mid) {
    var M = memberOf(lib, mid), Q = [];
    function g(group, items) { Q.push({ group: group, items: items.filter(Boolean).map(function (it) { return { text: it[0], q: it[1], n: answer(lib, it[1], { limit: 1 }).total }; }) }); }
    if (M) {
      var first = M.first, up = M.up19 && lib.sit[M.up19.sit] ? lib.sit[M.up19.sit] : null;
      g('For ' + first + ' this week', [
        up ? [M.up19.label.replace(/^\w+ \d+ \w+ · /, '') + ': who has walked into that room?', { sit: up.id, m: mid }] : null,
        M.age ? ['Someone ' + first + '’s age when it happened', { mine: 1, age: M.age, m: mid }] : null,
        ['A quieter version, for a firm that punishes the direct move', { mine: 1, dir: 'quiet', m: mid }],
        ['Beyond ' + first + '’s heroes, close to an ordinary office', { mine: 1, reach: 'near', nothero: 1, m: mid }],
        ['Set before 1950, for a member wary of modern celebrities', { mine: 1, before: 1950, m: mid }],
        ['Ready to send today', { mine: 1, ok: 1, m: mid }]
      ]);
    }
    SHELF.forEach(function (grp) { g(grp[0], grp[1].map(function (it) { return [it[0], M ? Object.assign({ m: mid }, it[1]) : it[1]]; })); });
    return Q;
  }

  // ---------- two stories side by side ----------
  // What they share, then only the rows where they differ. Facts, never a verdict on who did it better.
  function compare(lib, a, b) {
    var A = lib.story[CLC.resolve(lib, a)], B = lib.story[CLC.resolve(lib, b)]; if (!A || !B || A === B) return null;
    var IA = lib.icon[A.icon], IB = lib.icon[B.icon], shared = [], rows = [];
    A.keys.forEach(function (k) { if (B.keys.indexOf(k) >= 0 && lib.sitByKey[k]) shared.push(lib.sitByKey[k].id + ' · ' + cap(DID[lib.sitByKey[k].id])); });
    if (IA.sex === IB.sex) shared.push(IA.sex === 'f' ? 'Both women' : 'Both men');
    if (IA.field === IB.field && FIELD_LABEL[IA.field]) shared.push('Both from ' + FIELD_LABEL[IA.field].toLowerCase());
    function row(label, x, y) { if (x !== y && (x || y)) rows.push([label, x || '—', y || '—']); }
    row('When', yl(A.year), yl(B.year));
    var aa = ageAt(lib, A), ab = ageAt(lib, B); row('Age then', aa != null ? 'About ' + aa : '', ab != null ? 'About ' + ab : '');
    row('Field', IA.domainLabel, IB.domainLabel);
    row('How direct', DIRECT[A.directness], DIRECT[B.directness]);
    row('Distance from an office', REACH[A.reach], REACH[B.reach]);
    row('Leads by (proposed)', IA.stanceName, IB.stanceName);
    row('Checked', A.verified ? 'Yes' : 'Recall draft', B.verified ? 'Yes' : 'Recall draft');
    return { a: A, b: B, shared: shared, rows: rows };
  }

  // ---------- gaps: thin answers, where to write and check next ----------
  function gaps(lib) {
    var out = [];
    [null].concat(lib.order).forEach(function (mid) {
      shelf(lib, mid).forEach(function (grp) {
        if (mid && grp.group.indexOf('For ') !== 0) return;   // the shared questions are counted once, without a member
        grp.items.forEach(function (it) {
          if (it.n >= 4) return;
          var r = answer(lib, it.q, { limit: 1 });
          out.push({ member: mid, group: grp.group, text: it.text, q: it.q, n: it.n, nearest: r.nearest[0] || null });
        });
      });
    });
    return out.sort(function (a, b) { return a.n - b.n; });
  }

  function toQS(q) { var p = []; Object.keys(q).sort().forEach(function (k) { if (q[k] != null && q[k] !== '' && k !== 'trait') p.push(k + '=' + encodeURIComponent(q[k])); }); return p.join('&'); }
  function fromQS(qs) {
    var q = {};
    qs.forEach(function (v, k) { if (v === '') return; q[k] = NUMERIC.test(k) ? +v : v; });
    if (!q.t && q.q) { q.t = q.q; delete q.q; }   // the first Ask page put the question in q
    return q;
  }
  function isQuery(q) { return !!(q.sit || q.mine || hasFacet(q)); }

  return { DID: DID, CUES: CUES, SCENE: SCENE, DIRECT: DIRECT, REACH: REACH, FIELD_LABEL: FIELD_LABEL, SHELF: SHELF,
    read: read, chips: chips, answer: answer, reasons: reasons, drop: drop, shelf: shelf, compare: compare, gaps: gaps,
    toQS: toQS, fromQS: fromQS, isQuery: isQuery, ageAt: ageAt, heroesOf: heroesOf, situationScores: situationScores };
}));
