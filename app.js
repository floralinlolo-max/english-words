'use strict';
// 英文單字發音冒險：7 種遊戲（純網頁，不需安裝；發音用瀏覽器內建語音）

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');

// ---------- 字庫：發音入門（120 字，有圖示、例句、發音規則）＋ 官方第 1～6 級 ----------
const STAGE_SIZE = 10;
const TRACKS = [{ id: 'p', name: '發音入門', short: '入門', stages: STAGES }];
const LEVEL_WORDS = [];
LEVEL_RAW.forEach((raw, li) => {
  const words = raw.split('\n').map(line => {
    const [w, h, pos, syl, zh] = line.split('|');
    return { w, h: h || w, pos, zh, p: syl.split('·'), e: '', r: [], s: '', sz: '', n: '', lv: li + 1 };
  });
  LEVEL_WORDS.push(...words);
  const stages = [];
  for (let i = 0; i < words.length; i += STAGE_SIZE) {
    const ws = words.slice(i, i + STAGE_SIZE);
    stages.push({ title: `${ws[0].w} ～ ${ws[ws.length - 1].w}`, words: ws });
  }
  TRACKS.push({ id: 'L' + (li + 1), name: `第 ${li + 1} 級`, short: `Lv${li + 1}`, stages });
});
const TRACK = Object.fromEntries(TRACKS.map(t => [t.id, t]));
const ALL = [];
STAGES.forEach(st => st.words.forEach(x => ALL.push(x)));
const STARTER = [...ALL];
const BY = {};
LEVEL_WORDS.forEach(x => { BY[x.w] = x; });
STARTER.forEach(x => { const L = BY[x.w]; if (L) { x.pos = L.pos; x.h = L.h; x.lv = L.lv; } BY[x.w] = x; }); // 入門字有圖示，優先
LEVEL_WORDS.forEach(x => { if (BY[x.w] === x) ALL.push(x); });
// 拼讀積木用的積木：多音節用音節；單音節拆成「開頭子音＋其餘」
function chunksOf(x) {
  if (x.p.length > 1) return x.p;
  const w = x.p[0];
  if (w.length <= 2) return w.split('');
  const m = /^([^aeiouy]*)([aeiouy]+)(.*)$/i.exec(w);
  if (!m) return w.split('');
  if (m[1]) return [m[1], m[2] + m[3]];
  return m[3] ? [m[2], m[3]] : w.split('');
}
ALL.forEach(x => { x.tp = chunksOf(x); });
const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
// 同音字：遊戲裡不放在一起當干擾選項，聽寫時直接顯示中文，語音辨識也算對
const HOMO = {}, HEARD = {};
('see sea|meat meet|tail tale|sail sale|steal steel|sun son|wait weight|bare bear|dear deer|mail male|knight night|knot not|know no|hear here|by buy|to too|right write|cell sell|cent scent|principal principle|board bored|brake break|berry bury|flea flee|role roll|sole soul|be bee|dew due|piece peace|pair pear|flour flower|whole hole|week weak|weather whether|which witch|some sum|pole poll|wear where|way weigh|rain reign|site sight|toe tow|vain vein|waist waste|wine whine|coarse course|complement compliment|council counsel|dye die|fair fare|fowl foul|idle idol|in inn|lessen lesson|loan lone|main mane|mist missed|none nun|or oar|pain pane|peal peel|plum plumb|pray prey|rap wrap|real reel|ring wring|rose rows|sew so sow|stair stare|stationary stationery|suite sweet|tide tied|heal heel|eye I|hour our|new knew|need knead|nose knows|wood would|great grate|guest guessed|cereal serial|chili chilly|feet feat|aisle isle|altar alter|beat beet|blew blue|bow bough|bread bred|creek creak|dual duel|faint feint|flu flew|forth fourth|grown groan|hair hare|hall haul|hay hey|herd heard|hi high|him hymn|horse hoarse|lead led|leak leek|mall maul|medal meddle|minor miner|muscle mussel|naval navel|pale pail|pause paws|pedal peddle|plain plane|pour pore|read reed|root route|seam seem|seize sees|soar sore|stake steak|story storey|tea tee|throne thrown|war wore|whale wail|yolk yoke|aloud allowed|chord cord|clause claws|symbol cymbal|patience patients|peak peek|praise prays preys|presence presents|profit prophet|raise rays|scene seen|time thyme|world whirled|holy wholly|tense tents|tire tyre|cue queue|bald bawled|ball bawl')
  .split('|').forEach(g => {
    const all = g.split(' ');
    all.forEach(w => { HEARD[w] = [...(HEARD[w] || []), ...all.filter(v => v !== w)]; });
    const ws = all.filter(w => BY[w]);
    if (ws.length > 1) ws.forEach(w => { HOMO[w] = [...new Set([...(HOMO[w] || []), ...ws.filter(v => v !== w)])]; });
  });
const SOUNDS_LIKE = {                                       // 語音辨識可能聽成的寫法
  tea: ['tee', 't'], see: ['sea', 'c'], sea: ['see', 'c'], bee: ['be', 'b'], meat: ['meet'],
  tail: ['tale'], ten: ['10'], five: ['5'], three: ['3'], read: ['reed', 'red'], red: ['read'],
  road: ['rode', 'rowed'], gray: ['grey'], favorite: ['favourite'], eat: ['it'], cute: ['q'],
  mrs: ['misses', 'missus'], ms: ['miss', 'mz'], tshirt: ['teeshirt'], ok: ['okay'], mister: ['mr'], pm: ['p'], i: ['eye', 'aye'],
};
// 單字小圖：入門字用圖示，官方字表的字用詞性小標籤
const pic = (x, cls = '') => x.e ? x.e : `<span class="posb ${cls}">${esc(x.pos || '')}</span>`;
const headInfo = x => (x.pos ? `<div class="pos">${esc(x.pos)}${x.h && x.h !== x.w ? `　官方詞條：<span class="en">${esc(x.h)}</span>` : ''}${x.lv ? `　第 ${x.lv} 級` : ''}</div>` : '');

// ---------- 發音規則 ----------
const RULES = {
  sa: { label: '短母音 a', ex: 'cat', tip: 'a 念短音 /æ/，嘴巴張大，像 cat、bag。' },
  se: { label: '短母音 e', ex: 'pen', tip: 'e 念短音 /ɛ/，像 pen、bed。' },
  si: { label: '短母音 i', ex: 'sit', tip: 'i 念短音 /ɪ/，短短的，像 sit、pig。' },
  so: { label: '短母音 o', ex: 'hot', tip: 'o 念短音 /ɑ/，嘴巴張圓，像 hot、dog。' },
  su: { label: '短母音 u', ex: 'cup', tip: 'u 念短音 /ʌ/，輕輕短短的，像 cup、bus。' },
  ae: { label: '魔法 e：a_e', ex: 'cake', tip: '字尾的 e 不發音，讓前面的 a 念成字母 A 的聲音 /e/，像 cake、name。' },
  ie: { label: '魔法 e：i_e', ex: 'bike', tip: '字尾的 e 不發音，讓 i 念成字母 I 的聲音 /aɪ/，像 bike、five。' },
  oe: { label: '魔法 e：o_e', ex: 'home', tip: '字尾的 e 不發音，讓 o 念成字母 O 的聲音 /o/，像 home、nose。' },
  ue: { label: '魔法 e：u_e', ex: 'cute', tip: '字尾的 e 不發音，讓 u 念成字母 U 的聲音 /ju/，像 cute。' },
  ee: { label: 'ee 念 /i/', ex: 'tree', tip: '兩個 e 在一起念長音 /i/，像 tree、see。' },
  ea: { label: 'ea 念 /i/', ex: 'eat', tip: 'ea 常念長音 /i/，像 eat、tea。' },
  oa: { label: 'oa 念 /o/', ex: 'boat', tip: 'oa 念 /o/（字母 O 的聲音），像 boat、goat。' },
  ai: { label: 'ai／ay 念 /e/', ex: 'rain, day', tip: 'ai 和 ay 都念 /e/（字母 A 的聲音）：ai 在字中間，ay 在字尾，像 rain、day。' },
  sh: { label: 'sh 念 /ʃ/', ex: 'ship', tip: 'sh 念 /ʃ/，像叫人安靜的「噓～」，像 ship、fish。' },
  ch: { label: 'ch 念 /tʃ/', ex: 'lunch', tip: 'ch 念 /tʃ/，嘴巴噘起來，像 lunch、teach。' },
  th: { label: 'th', ex: 'three', tip: 'th 要把舌頭輕輕放在上下牙齒中間吹氣，像 three、mother。' },
  ck: { label: 'ck 念 /k/', ex: 'duck', tip: 'ck 兩個字母一起念 /k/，常在短母音後面，像 duck、clock。' },
};
const RULE_RE = { sa: /a/, se: /e/, si: /i/, so: /o/, su: /u/, ae: /a[^aeiou]e/, ie: /i[^aeiou]e/, oe: /o[^aeiou]e/, ue: /u[^aeiou]e/,
  ee: /ee/, ea: /ea/, oa: /oa/, ai: /ai|ay/, sh: /sh/, ch: /ch/, th: /th/, ck: /ck/ };
const BADGE_GROUPS = [
  { name: '短母音家族', keys: ['sa', 'se', 'si', 'so', 'su'] },
  { name: '魔法 e', keys: ['ae', 'ie', 'oe', 'ue'] },
  { name: '母音雙胞胎', keys: ['ee', 'ea', 'oa', 'ai'] },
  { name: '子音好朋友', keys: ['sh', 'ch', 'th', 'ck'] },
];
const BADGE_NEED = 3;
const PETS = ['🥚', '🐣', '🐥', '🐤', '🐔', '🦢', '🦚', '🐉'];
const PET_STEP = 8;

// ---------- 進度（存在這台裝置的瀏覽器） ----------
const KEY = 'ev7000_v1';
const S = Object.assign({ stars: {}, srs: {}, pet: 0, badges: {}, voice: '', rate: 0.7 }, safeLoad());
function safeLoad() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
const INTERVALS = [1, 2, 4, 7, 15];   // 第 1、2、4、7、15 天複習
function srsUpdate(w, ok) {
  const r = S.srs[w] || { b: 0, due: 0 };
  if (ok) { r.b = Math.min(r.b + 1, 5); r.due = today() + INTERVALS[r.b - 1]; }
  else { r.b = 0; r.due = today(); }
  S.srs[w] = r;
}
function applyResults(res) {
  if (!res || !res.length) return;
  const per = {};
  res.forEach(r => { per[r.w] = (per[r.w] !== false) && r.ok; });
  Object.entries(per).forEach(([w, ok]) => srsUpdate(w, ok));
  save();
}
const dueWords = () => Object.entries(S.srs).filter(([w, r]) => r.due <= today() && BY[w]).sort((a, b) => a[1].b - b[1].b).map(([w]) => BY[w]);

// ---------- 小工具 ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const sample = (a, n) => shuffle(a).slice(0, n);
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function similar(w, n) {   // 找字形相近的字當干擾選項
  const bad = new Set([w, ...(HOMO[w] || [])]);
  return ALL.map(x => x.w).filter(v => !bad.has(v))
    .map(v => [v, lev(v, w) + Math.abs(v.length - w.length) * 0.3 + Math.random() * 0.9])
    .sort((a, b) => a[1] - b[1]).slice(0, n).map(a => a[0]);
}
const partsHTML = x => x.p.map((c, k) => `<span class="pc c${k % 3}">${esc(c)}</span>`).join('<span class="dot">·</span>');
function highlight(w, key) {
  const m = RULE_RE[key].exec(w);
  if (!m) return esc(w);
  const magic = ['ae', 'ie', 'oe', 'ue'].includes(key);
  const pos = magic ? [m.index, m.index + 2] : Array.from({ length: m[0].length }, (_, k) => m.index + k);
  return w.split('').map((c, k) => pos.includes(k) ? `<span class="hl">${esc(c)}</span>` : esc(c)).join('');
}
let TIMERS = [];
function later(fn, ms) { const id = setTimeout(fn, ms); TIMERS.push(id); return id; }
function clearTimers() { TIMERS.forEach(clearTimeout); TIMERS = []; }
function starsOf(acc) { return acc >= 0.95 ? 3 : acc >= 0.8 ? 2 : acc >= 0.6 ? 1 : 0; }

// ---------- 聲音 ----------
let AC;
function tone(freqs, dur = 0.12, type = 'sine', vol = 0.15) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime;
    freqs.forEach((f, i) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(vol, t + i * dur);
      g.gain.exponentialRampToValueAtTime(0.001, t + (i + 1) * dur);
      o.connect(g).connect(AC.destination);
      o.start(t + i * dur); o.stop(t + (i + 1) * dur);
    });
  } catch (e) {}
}
const ding = () => tone([660, 880], 0.1);
const buzz = () => tone([220, 160], 0.15, 'square', 0.06);
const fanfare = () => tone([523, 659, 784, 1047], 0.12);

const TTS = 'speechSynthesis' in window;
let voices = [];
function loadVoices() { if (TTS) voices = speechSynthesis.getVoices().filter(v => /^en[-_]/i.test(v.lang)); }
if (TTS) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function pickVoice() {
  if (S.voice) { const v = voices.find(v => v.name === S.voice); if (v) return v; }
  const us = voices.filter(v => /en[-_]US/i.test(v.lang));
  // 依清晰度挑：Edge 的自然語音 > Google > 其他美式 > 任何英文
  const prefer = [/Ava.*Natural/i, /Jenny.*Natural/i, /Aria.*Natural/i, /Natural/i, /Google US English/i, /Online/i, /Zira/i];
  for (const re of prefer) { const v = us.find(v => re.test(v.name)); if (v) return v; }
  return us[0] || voices[0] || null;
}
// 語速：全站一個設定，每頁上方都能調
const RATES = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
if (!RATES.includes(S.rate)) S.rate = 0.7;
let speakTimer = 0;
function speak(text, rate) {
  if (!TTS) return;
  speechSynthesis.cancel();
  clearTimeout(speakTimer);
  const isWord = !/\s/.test(text.trim());
  // 單字後面加句點，語音會念完整、不會把字尾吞掉；cancel 後稍等再念，避免開頭被切掉
  const u = new SpeechSynthesisUtterance(isWord ? text + '.' : text);
  u.lang = 'en-US'; u.rate = rate || S.rate; u.pitch = 1; u.volume = 1;
  const v = pickVoice(); if (v) u.voice = v;
  speakTimer = setTimeout(() => speechSynthesis.speak(u), 120);
}
const slow = t => speak(t, Math.max(0.3, S.rate * 0.6));
function setRate(d) {
  const i = Math.max(0, Math.min(RATES.length - 1, RATES.indexOf(S.rate) + d));
  S.rate = RATES[i]; save();
  $$('.spd-val').forEach(e => e.textContent = rateLabel());
  speak('Hello');
}
const rateLabel = () => ({ 0.4: '很慢', 0.5: '慢', 0.6: '稍慢', 0.7: '標準慢', 0.8: '一般', 0.9: '稍快', 1: '正常' }[S.rate]) + ` ${S.rate}×`;
const spdHTML = () => `<div class="spd" title="調整英文念的速度"><button class="spd-btn" data-d="-1" aria-label="念慢一點">🐢 慢</button><span class="spd-val">${rateLabel()}</span><button class="spd-btn" data-d="1" aria-label="念快一點">🐇 快</button></div>`;
document.addEventListener('click', e => { const b = e.target.closest('.spd-btn'); if (b) setRate(+b.dataset.d); });

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let REC = null;
function stopRec() { try { if (REC) REC.abort(); } catch (e) {} REC = null; }
function heardOk(alts, w) {
  const base = norm(w);
  const ok = new Set([base, base + 's', base + 'es', ...(SOUNDS_LIKE[base] || []), ...(HEARD[w] || []).map(norm)]);
  return alts.some(a => {
    const t = a.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').trim();
    return t.split(/\s+/).some(tok => ok.has(norm(tok))) || ok.has(norm(t));
  });
}

// ---------- 畫面框架 ----------
function screen(title, body, { back = home, progress = '' } = {}) {
  document.onkeydown = null;
  app.innerHTML = `<header class="top"><button class="btn-back" id="backBtn">⬅ 返回</button><h1>${title}</h1>${spdHTML()}<div class="prog">${progress}</div></header><main class="main">${body}</main>`;
  $('#backBtn').onclick = () => { leave(); back(); };
  window.scrollTo(0, 0);
}
function leave() { if (TTS) speechSynthesis.cancel(); stopRec(); clearTimers(); document.onkeydown = null; }

const GAMES = {
  memory:    { n: 1, ic: '🃏', name: '聲音配對翻翻牌', desc: '喇叭牌會念出單字，找出跟它配對的拼字牌。', fn: gMemory, srs: false },
  tiles:     { n: 2, ic: '🧱', name: '拼讀積木', desc: '聽聲音，把發音積木排成單字。', fn: gTiles, srs: true },
  mole:      { n: 3, ic: '🔨', name: '聽音打地鼠', desc: '聽到哪個字，就打哪隻地鼠，越快越高分！', fn: gMole, srs: true },
  speak:     { n: 4, ic: '🎤', name: '念給我聽', desc: '對著麥克風念單字，念對了寵物就會長大。', fn: gSpeak, srs: true },
  detective: { n: 5, ic: '🔍', name: '母音偵探', desc: '找出單字裡藏的發音規則，收集規則徽章。', fn: gDetective, srs: false },
  spell:     { n: 6, ic: '🚀', name: '聽寫火箭', desc: '只聽聲音，拼出單字，讓火箭飛上月球。', fn: gSpell, srs: true },
  cards:     { n: 0, ic: '📖', name: '單字卡', desc: '聽 → 跟著念 3 次 → 看拼字 → 遮住再念一次。', fn: gLearn, srs: false },
};

// ---------- 首頁 ----------
function home() {
  leave();
  const due = dueWords().length;
  const g = k => { const x = GAMES[k]; return `<button class="card" data-g="${k}"><span class="ic">${x.ic}</span><b>${x.n}. ${x.name}</b><small>${x.desc}</small></button>`; };
  app.innerHTML = `<div class="home">
    <div class="hero"><div class="hero-emoji">🔤🔊</div><h1>英文單字發音冒險</h1><p>聽一聽、拼一拼、念一念，看到單字就會念！</p><div class="home-spd">英文語速：${spdHTML()}</div></div>
    ${due ? `<button class="due-banner" id="goReview">📌 有 ${due} 個字該複習了，點我開始</button>` : ''}
    <button class="card big" data-g="map"><span class="ic">🗺️</span><b>7. 單字闖關地圖</b><small>每關 10 個字，依序 看單字卡 → 打地鼠 → 拼積木 → 念出來 → 聽寫，過關解鎖下一關；錯的字會自動排進複習關。</small></button>
    <div class="grid">${['memory', 'tiles', 'mole', 'speak', 'detective', 'spell'].map(g).join('')}</div>
    <div class="row"><button class="pill" data-g="cards">📖 單字卡</button><button class="pill" data-g="badges">🏅 我的徽章</button><button class="pill" data-g="settings">⚙️ 設定</button></div>
    <p class="foot">字庫：發音入門 ${STARTER.length} 字＋大考中心《高中英文參考詞彙表》第 1～6 級 ${LEVEL_WORDS.length} 字（每 10 個字一關，共 ${TRACKS.reduce((n, t) => n + t.stages.length, 0)} 關）・進度存在這台裝置的瀏覽器</p>
  </div>`;
  $$('[data-g]').forEach(b => b.onclick = () => {
    const k = b.dataset.g;
    if (k === 'map') mapScreen(); else if (k === 'badges') badges(); else if (k === 'settings') settings(); else pickStage(k);
  });
  if (due) $('#goReview').onclick = reviewRun;
}

// 「發音入門／第 1～6 級」切換鈕
function trackTabs(cur) {
  return `<div class="tabs">${TRACKS.map(t => `<button class="tab ${t.id === cur ? 'on' : ''}" data-t="${t.id}">${t.name}</button>`).join('')}</div>`;
}
function bindTabs(fn) { $$('.tab').forEach(b => b.onclick = () => { S.track = b.dataset.t; save(); fn(b.dataset.t); }); }

function pickStage(gid, tid) {
  const g = GAMES[gid], due = dueWords();
  if (gid === 'detective') tid = 'p';             // 母音偵探只用有標好發音規則的入門字
  tid = tid || (TRACK[S.track] ? S.track : 'p');
  const tr = TRACK[tid];
  screen(`${g.ic} ${g.name}`, `<p class="hint">${g.desc}</p>
    ${gid === 'detective' ? '<p class="hint">（母音偵探使用「發音入門」的字，因為這些字有標好發音規則）</p>' : trackTabs(tid)}
    <h3>${tr.name}：選一組單字</h3>
    <div class="stage-list">
    ${due.length ? `<button class="stage-btn review" data-i="review"><b>📌 該複習的字（${due.length} 個）</b><small class="en">${due.slice(0, 5).map(x => esc(x.w)).join(', ')}${due.length > 5 ? '…' : ''}</small></button>` : ''}
    ${tid !== 'p' ? `<button class="stage-btn rand" data-i="rand"><b>🎲 ${tr.name}隨機 10 個字</b><small>每次都不一樣</small></button>` : ''}
    ${tr.stages.map((st, i) => `<button class="stage-btn" data-i="${i}"><b>第 ${i + 1} ${tid === 'p' ? '組' : '關'}　${tid === 'p' ? esc(st.title) : ''}</b><small class="en">${st.words.slice(0, 5).map(x => esc(x.w)).join(', ')}…</small></button>`).join('')}
    </div>`);
  bindTabs(t => pickStage(gid, t));
  $$('.stage-btn').forEach(b => b.onclick = () => {
    const d = b.dataset.i;
    const words = d === 'review' ? due.slice(0, 15) : d === 'rand' ? sample(tr.stages.flatMap(s => s.words), STAGE_SIZE) : tr.stages[+d].words;
    const run = () => g.fn({
      words, title: `${g.ic} ${g.name}`, back: () => pickStage(gid, tid),
      done: (res, extra) => {
        if (gid === 'cards') return pickStage(gid, tid);
        if (g.srs) applyResults(res);
        showResult({ title: g.name, res, extra, again: run, back: () => pickStage(gid, tid) });
      }
    });
    run();
  });
}

function showResult(o) {
  leave(); fanfare();
  const res = o.res || [], ex = o.extra || {};
  const per = {};
  res.forEach(r => { per[r.w] = per[r.w] || { ok: 0, n: 0 }; per[r.w].n++; if (r.ok) per[r.w].ok++; });
  let stars, line;
  if (ex.moves != null) {
    stars = ex.moves <= ex.pairs + 3 ? 3 : ex.moves <= ex.pairs * 2 + 2 ? 2 : 1;
    line = `${ex.pairs} 組全部配對成功，共翻了 ${ex.moves} 次`;
  } else {
    const ok = res.filter(r => r.ok).length, acc = res.length ? ok / res.length : 0;
    stars = starsOf(acc);
    line = `一次就答對 ${ok} / ${res.length} 題（${Math.round(acc * 100)}%）`;
  }
  const wrong = Object.keys(per).filter(w => per[w].ok < per[w].n);
  const chips = Object.keys(per).map(w => `<span class="chip ${per[w].ok < per[w].n ? 'no' : 'yes'}">${BY[w].e || ''} ${esc(w)}</span>`).join('');
  const nb = (ex.newBadges || []).map(k => `<div class="good">🏅 獲得新徽章：${esc(RULES[k].label)}</div>`).join('');
  screen(`🎉 ${esc(o.title)}`, `<div class="result">
    <div class="stars">${'★'.repeat(stars)}<span class="off">${'☆'.repeat(3 - stars)}</span></div>
    <p class="big-line">${line}</p>${o.unlocked ? '<div class="good">🔓 下一關已經解鎖！</div>' : ''}${o.locked ? '<div class="bad">答對 6 成以上才能解鎖下一關，再挑戰一次吧！</div>' : ''}${nb}
    ${chips ? `<div class="chips">${chips}</div>` : ''}
    ${wrong.length && o.srsNote !== false ? `<p class="hint">紅色的字有答錯，已經放進「複習」，記得回來再練。</p>` : ''}
    <div class="btns center">${o.next ? '<button class="next" id="rNext">下一關 ➜</button>' : ''}<button class="snd" id="rAgain">🔁 再玩一次</button><button class="snd" id="rBack">⬅ 回去</button></div>
  </div>`, { back: o.back });
  $('#rAgain').onclick = () => o.again();
  $('#rBack').onclick = () => o.back();
  if (o.next) $('#rNext').onclick = () => o.next();
}

// ---------- 1. 聲音配對翻翻牌 ----------
function gMemory(ctx) {
  const pick = [];
  for (const x of shuffle(ctx.words)) {
    if (pick.length >= 6) break;
    if (!pick.some(p => (HOMO[p.w] || []).includes(x.w))) pick.push(x);
  }
  const cards = shuffle([...pick.map(x => ({ x, t: 's' })), ...pick.map(x => ({ x, t: 't' }))]);
  let open = [], matched = 0, moves = 0, lock = false;
  screen(ctx.title, `<p class="hint">🔊 喇叭牌翻開會念出單字，找出和它一樣的拼字牌！</p>
    <div class="mem-grid">${cards.map((c, i) => `<button class="mem" data-i="${i}"><span class="back">?</span><span class="face">${c.t === 's' ? '<span class="spk">🔊</span>' : `<span class="en">${esc(c.x.w)}</span>`}</span></button>`).join('')}</div>
    <p class="stat" id="memStat">翻牌次數：0</p>`, { back: ctx.back });
  const els = $$('.mem');
  els.forEach((b, i) => b.onclick = () => {
    const c = cards[i];
    if (c.done || b.classList.contains('up')) { if (c.t === 's' || c.done) speak(c.x.w); return; }
    if (lock) return;
    b.classList.add('up');
    if (c.t === 's') speak(c.x.w);
    open.push(i);
    if (open.length < 2) return;
    moves++; $('#memStat').textContent = '翻牌次數：' + moves;
    const [i1, i2] = open, a = cards[i1], z = cards[i2];
    if (a.x === z.x && a.t !== z.t) {
      a.done = z.done = true; matched++; open = [];
      later(() => {
        ding();
        [els[i1], els[i2]].forEach(e => { e.classList.add('ok'); e.querySelector('.face').innerHTML = `<span class="emo">${a.x.e || ''}</span><span class="en">${esc(a.x.w)}</span><small>${esc(a.x.zh)}</small>`; });
        later(() => speak(a.x.w), 250);
        if (matched === pick.length) later(() => ctx.done(null, { moves, pairs: pick.length }), 1600);
      }, 350);
    } else {
      lock = true;
      later(() => { buzz(); els[i1].classList.remove('up'); els[i2].classList.remove('up'); open = []; lock = false; }, 1100);
    }
  });
}

// ---------- 2. 拼讀積木 ----------
function gTiles(ctx) {
  const list = shuffle(ctx.words), res = [];
  const pool = [...new Set(ALL.flatMap(x => x.tp))].filter(c => c.length <= 4);
  let i = 0;
  function buildable(tiles, y) {   // 這堆積木能不能拼出別的字（避免同音字或另一個正確字）
    const cnt = {}; tiles.forEach(t => cnt[t] = (cnt[t] || 0) + 1);
    return y.tp.every(c => cnt[c]-- > 0);
  }
  function q() {
    if (i >= list.length) return ctx.done(res);
    const x = list[i];
    let extras = [];
    for (let k = 0; k < 30; k++) {
      extras = sample(pool.filter(c => !x.tp.includes(c)), 2);
      const all = [...x.tp, ...extras];
      if (!ALL.some(y => y !== x && y.tp.length === x.tp.length && buildable(all, y))) break;
    }
    const tiles = shuffle([...x.tp, ...extras]).map(t => ({ t, used: false }));
    let answer = [], tries = 0, lock = false;
    screen(ctx.title, `<p class="hint">聽聲音，把積木按照順序排成單字</p>
      <div class="qcard"><div class="emo-big">${pic(x)}</div><div class="zh">${esc(x.zh)}</div>
      <div class="btns center"><button class="snd" id="s1">🔊 聽</button><button class="snd" id="s2">🐢 慢慢聽</button></div></div>
      <div class="slots" id="slots"></div><div class="tiles" id="tiles"></div><div class="msg" id="msg"></div>`,
      { back: ctx.back, progress: `${i + 1} / ${list.length}` });
    $('#s1').onclick = () => speak(x.w); $('#s2').onclick = () => slow(x.w);
    function draw() {
      $('#slots').innerHTML = x.tp.map((_, k) => answer[k] != null ? `<button class="tile in" data-a="${k}">${esc(tiles[answer[k]].t)}</button>` : '<span class="slot"></span>').join('');
      $('#tiles').innerHTML = tiles.map((t, k) => `<button class="tile" data-k="${k}" ${t.used ? 'disabled' : ''}>${esc(t.t)}</button>`).join('');
      $$('#tiles .tile').forEach(b => b.onclick = () => {
        const k = +b.dataset.k;
        if (lock || tiles[k].used || answer.length >= x.tp.length) return;
        tiles[k].used = true; answer.push(k); draw();
        if (answer.length === x.tp.length) check();
      });
      $$('#slots .tile').forEach(b => b.onclick = () => {
        if (lock) return;
        const a = +b.dataset.a; tiles[answer[a]].used = false; answer.splice(a, 1); draw();
      });
    }
    function check() {
      lock = true;
      if (answer.map(k => tiles[k].t).join('') === x.w) {
        ding(); res.push({ w: x.w, ok: tries === 0 });
        $('#slots').innerHTML = `<div class="word-big en win">${partsHTML(x)}</div>`;
        $('#tiles').innerHTML = '';
        $('#msg').innerHTML = `<div class="good">✔ 拼對了！${esc(x.w)}＝${esc(x.zh)}</div><button class="next" id="nx">${i + 1 >= list.length ? '看結果' : '下一題 ➜'}</button>`;
        later(() => slow(x.w), 300);
        $('#nx').onclick = () => { i++; q(); };
      } else {
        buzz(); tries++;
        $('#slots').classList.add('shake');
        $('#msg').innerHTML = '<div class="bad">不太對喔，再聽一次試試看！</div>';
        later(() => speak(x.w), 300);
        later(() => {
          answer.forEach(k => tiles[k].used = false); answer = []; lock = false;
          $('#slots').classList.remove('shake'); draw();
          if (tries >= 2) $('#msg').innerHTML = `<div class="bad">提示：第一塊是「<b class="en">${esc(x.tp[0])}</b>」</div>`;
        }, 1000);
      }
    }
    draw(); later(() => speak(x.w), 400);
  }
  q();
}

// ---------- 3. 聽音打地鼠 ----------
function gMole(ctx) {
  const list = shuffle(ctx.words), res = [];
  let i = 0, score = 0, streak = 0;
  function q() {
    if (i >= list.length) return ctx.done(res, { score });
    const x = list[i];
    const opts = shuffle([x.w, ...similar(x.w, 3)]);
    const limit = Math.max(5, 10 - streak * 0.5);
    let answered = false;
    screen(ctx.title, `<p class="hint">聽到哪個字，就打哪隻地鼠！</p>
      <div class="btns center"><button class="snd" id="s1">🔊 再聽一次</button><button class="snd" id="s2">🐢 慢慢聽</button></div>
      <div class="timer"><div class="bar" id="bar" style="animation-duration:${limit}s"></div></div>
      <div class="field">${opts.map((w, k) => `<div class="hole"><button class="mole" data-w="${esc(w)}" style="animation-delay:${k * 0.1}s"><span class="mface">🐹</span><span class="en">${esc(w)}</span></button></div>`).join('')}</div>
      <div class="msg" id="msg"></div><p class="stat">分數：${score}　連續答對：${streak}${streak >= 3 ? ' 🔥' : ''}</p>`,
      { back: ctx.back, progress: `${i + 1} / ${list.length}` });
    $('#s1').onclick = () => speak(x.w); $('#s2').onclick = () => slow(x.w);
    const finish = (ok, btn) => {
      if (answered) return; answered = true;
      $('#bar').style.animationPlayState = 'paused';
      if (ok) { ding(); score += 10 + streak * 2; streak++; btn.classList.add('hit'); }
      else { buzz(); streak = 0; if (btn) btn.classList.add('miss'); }
      $$('.mole').forEach(b => { if (b.dataset.w === x.w) b.classList.add('right'); b.disabled = true; });
      $('#msg').innerHTML = ok ? `<div class="good">打中了！${x.e || ''} ${esc(x.w)}＝${esc(x.zh)}</div>`
        : `<div class="bad">${btn ? '打錯了' : '時間到'}！答案是 <b class="en">${esc(x.w)}</b>（${esc(x.zh)}）</div>`;
      res.push({ w: x.w, ok });
      if (!ok) later(() => speak(x.w), 250);
      later(() => { i++; q(); }, ok ? 1400 : 2600);
    };
    $$('.mole').forEach(b => b.onclick = () => finish(b.dataset.w === x.w, b));
    later(() => speak(x.w), 350);
    later(() => finish(false, null), limit * 1000 + 350);
  }
  q();
}

// ---------- 4. 念給我聽 ----------
function petHTML() {
  const lv = Math.min(Math.floor(S.pet / PET_STEP), PETS.length - 1), max = lv === PETS.length - 1, into = S.pet % PET_STEP;
  return `<div class="pet"><div class="pet-emo">${PETS[lv]}</div><div class="pet-bar"><div style="width:${max ? 100 : into / PET_STEP * 100}%"></div></div><small>念對 ${S.pet} 個字・${max ? '已經是最強型態！' : `再念對 ${PET_STEP - into} 個就會長大`}</small></div>`;
}
function gSpeak(ctx) {
  const list = shuffle(ctx.words), res = [];
  let i = 0, selfMode = !SR;
  function q() {
    if (i >= list.length) return ctx.done(res);
    const x = list[i];
    let tries = 0;
    screen(ctx.title, `<div class="speak-wrap">${petHTML()}
      <div class="qcard"><div class="emo-big">${pic(x)}</div><div class="word-big en">${partsHTML(x)}</div><div class="zh">${esc(x.zh)}</div>${headInfo(x)}${x.n ? `<div class="note">💡 ${esc(x.n)}</div>` : ''}
      <div class="btns center"><button class="snd" id="s1">🔊 示範</button><button class="snd" id="s2">🐢 慢速</button></div></div>
      <div id="ctl"></div><div class="msg" id="msg"></div><button class="skip" id="skip">跳過這個字</button></div>`,
      { back: ctx.back, progress: `${i + 1} / ${list.length}` });
    $('#s1').onclick = () => speak(x.w); $('#s2').onclick = () => slow(x.w);
    $('#skip').onclick = () => { stopRec(); res.push({ w: x.w, ok: false }); i++; q(); };
    const success = heard => {
      stopRec(); ding(); S.pet++; save();
      res.push({ w: x.w, ok: tries < 2 });
      $('#ctl').innerHTML = '';
      $('#msg').innerHTML = `<div class="good">🎉 念對了！${heard ? `我聽到「<span class="en">${esc(heard)}</span>」` : ''}</div><button class="next" id="nx">${i + 1 >= list.length ? '看結果' : '下一個 ➜'}</button>`;
      $('.pet').outerHTML = petHTML();
      $('#skip').remove();
      $('#nx').onclick = () => { i++; q(); };
    };
    const micIdle = () => { const m = $('#mic'); if (m) { m.classList.remove('on'); m.textContent = '🎤 按我，然後念出來'; } };
    function drawCtl() {
      if (selfMode) {
        $('#ctl').innerHTML = `<p class="hint">先按「示範」聽，再大聲念 3 次，自己（或請爸媽）判斷念得對不對：</p>
          <div class="btns center"><button class="next" id="okSelf">✅ 我念對了</button><button class="snd" id="again">🔁 再聽一次</button></div>`;
        $('#okSelf').onclick = () => success('');
        $('#again').onclick = () => { tries++; speak(x.w); };
      } else {
        $('#ctl').innerHTML = '<button class="mic" id="mic">🎤 按我，然後念出來</button>';
        $('#mic').onclick = listen;
      }
    }
    function listen() {
      stopRec(); if (TTS) speechSynthesis.cancel();
      const r = new SR(); REC = r;
      r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 5;
      let got = false;
      $('#mic').classList.add('on'); $('#mic').textContent = '👂 正在聽……請念出單字';
      r.onresult = e => {
        got = true;
        const alts = [...e.results[0]].map(a => a.transcript.trim());
        if (heardOk(alts, x.w)) return success(alts[0]);
        tries++; buzz(); micIdle();
        $('#msg').innerHTML = `<div class="bad">我聽到的像是「<span class="en">${esc(alts[0] || '？')}</span>」，再聽一次示範，然後再試試！</div>`
          + (tries >= 3 ? '<p class="hint">念不出來也沒關係，多聽幾次示範，或按下面的「跳過」。</p>' : '');
      };
      r.onerror = e => {
        got = true;
        if (['not-allowed', 'service-not-allowed', 'network', 'audio-capture'].includes(e.error)) {
          selfMode = true;
          const why = { network: '語音辨識需要連上網路', 'audio-capture': '找不到麥克風' }[e.error] || '麥克風沒有開啟權限';
          drawCtl();
          $('#msg').innerHTML = `<div class="bad">${why}，先改用「自己判斷」模式。</div>`;
        } else if (e.error === 'no-speech') {
          micIdle(); $('#msg').innerHTML = '<div class="bad">沒聽到聲音，按麥克風再念一次，大聲一點喔！</div>';
        } else if (e.error !== 'aborted') {
          micIdle(); $('#msg').innerHTML = `<div class="bad">出了點問題（${esc(e.error)}），再按一次試試。</div>`;
        }
      };
      r.onend = () => { if (!got) micIdle(); };
      try { r.start(); } catch (err) { selfMode = true; drawCtl(); }
    }
    drawCtl(); later(() => speak(x.w), 300);
  }
  q();
}

// ---------- 5. 母音偵探 ----------
function gDetective(ctx) {
  let pool = ctx.words.filter(x => x.r.length);
  if (pool.length < 6) pool = pool.concat(shuffle(ALL.filter(x => x.r.length && !pool.includes(x))).slice(0, 10 - pool.length));
  const list = shuffle(pool).slice(0, 10), res = [], newBadges = [];
  let i = 0;
  function q() {
    if (i >= list.length) return ctx.done(res, { newBadges });
    const x = list[i];
    const key = x.r[Math.floor(Math.random() * x.r.length)];
    const others = shuffle(Object.keys(RULES).filter(k => !x.r.includes(k)));
    const grp = BADGE_GROUPS.find(g => g.keys.includes(key));
    const dis = [...new Set([...others.filter(k => grp.keys.includes(k)).slice(0, 1), ...others])].slice(0, 3);
    const opts = shuffle([key, ...dis]);
    screen(ctx.title, `<p class="hint">🔍 這個字藏著哪一種發音規則？</p>
      <div class="qcard"><div class="emo-big">${x.e}</div><div class="word-big en" id="wd">${esc(x.w)}</div><div class="zh">${esc(x.zh)}</div>
      <div class="btns center"><button class="snd" id="s1">🔊 聽</button><button class="snd" id="s2">🐢 慢速</button></div></div>
      <div class="opts">${opts.map(k => `<button class="opt" data-k="${k}"><b>${esc(RULES[k].label)}</b><small>例：<span class="en">${esc(RULES[k].ex)}</span></small></button>`).join('')}</div>
      <div class="msg" id="msg"></div>`, { back: ctx.back, progress: `${i + 1} / ${list.length}` });
    $('#s1').onclick = () => speak(x.w); $('#s2').onclick = () => slow(x.w);
    $$('.opt').forEach(b => b.onclick = () => {
      const ok = b.dataset.k === key;
      $$('.opt').forEach(o => { o.disabled = true; if (o.dataset.k === key) o.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      $('#wd').innerHTML = highlight(x.w, key);
      let extra = '';
      if (ok) {
        ding();
        S.badges[key] = (S.badges[key] || 0) + 1; save();
        if (S.badges[key] === BADGE_NEED) { newBadges.push(key); extra = `<div class="good">🏅 獲得徽章「${esc(RULES[key].label)}」！</div>`; }
      } else buzz();
      res.push({ w: x.w, ok });
      $('#msg').innerHTML = `<div class="${ok ? 'good' : 'bad'}">${ok ? '答對了！' : '再想想～答案是「' + esc(RULES[key].label) + '」。'}</div>
        <div class="tip">${esc(RULES[key].tip)}</div>${extra}<button class="next" id="nx">${i + 1 >= list.length ? '看結果' : '下一題 ➜'}</button>`;
      later(() => slow(x.w), 250);
      $('#nx').onclick = () => { i++; q(); };
    });
    later(() => speak(x.w), 300);
  }
  q();
}

function badges() {
  const got = Object.keys(RULES).filter(k => (S.badges[k] || 0) >= BADGE_NEED).length;
  screen('🏅 我的徽章', `<p class="hint">在「母音偵探」裡，同一個規則答對 ${BADGE_NEED} 次就能拿到徽章。已收集 ${got} / ${Object.keys(RULES).length} 個。</p>
    ${BADGE_GROUPS.map(g => `<h3>${g.name}</h3><div class="badge-grid">${g.keys.map(k => {
      const n = S.badges[k] || 0, has = n >= BADGE_NEED;
      return `<div class="badge ${has ? 'has' : ''}"><div class="b-ic">${has ? '🏅' : '🔒'}</div><b>${esc(RULES[k].label)}</b><small class="en">${esc(RULES[k].ex)}</small><small>${has ? '已獲得' : `${n} / ${BADGE_NEED}`}</small></div>`;
    }).join('')}</div>`).join('')}
    <div class="btns center"><button class="next" id="goDet">🔍 去玩母音偵探</button></div>`);
  $('#goDet').onclick = () => pickStage('detective');
}

// ---------- 6. 聽寫火箭 ----------
function gSpell(ctx) {
  const list = shuffle(ctx.words), res = [];
  let i = 0;
  function q() {
    if (i >= list.length) return ctx.done(res);
    const x = list[i], target = x.w.toLowerCase(), letters = target.split('');
    let typed = '', tries = 0, hinted = false, locked = false;
    const extra = sample('abcdefghijklmnopqrstuvwxyz'.split('').filter(c => !letters.includes(c)), letters.length > 7 ? 2 : 3);
    const bank = shuffle([...letters, ...extra]);
    const homo = HOMO[x.w];
    screen(ctx.title, `<div class="spell-wrap">
      <div class="sky"><div class="moon">🌕</div><div class="stars-bg">✦ ✧ ✦</div><div class="rocket" id="rocket" style="bottom:${i / list.length * 78}%">🚀</div></div>
      <div class="spell-main"><p class="hint">只聽聲音，拼出單字（可以用鍵盤打字）</p>
        <div class="btns center"><button class="snd" id="s1">🔊 聽</button><button class="snd" id="s2">🐢 慢慢聽</button><button class="snd" id="hz">💬 看中文</button></div>
        <div class="zh" id="zh" ${homo ? '' : 'hidden'}>${x.e || ''} ${esc(x.zh)}${homo ? '（有同音字，看意思來拼）' : ''}</div>
        <div class="letters" id="lt"></div><div class="bank" id="bank"></div>
        <div class="btns center"><button class="snd" id="del">⌫ 刪除</button><button class="snd" id="hint">💡 提示一個字母</button></div>
        <div class="msg" id="msg"></div></div></div>`, { back: ctx.back, progress: `${i + 1} / ${list.length}` });
    $('#s1').onclick = () => speak(x.w); $('#s2').onclick = () => slow(x.w);
    $('#hz').onclick = () => { $('#zh').hidden = false; };
    function draw(mark) {
      $('#lt').innerHTML = letters.map((c, k) => {
        const t = typed[k] || '';
        return `<span class="lt${mark && t ? (t === c ? ' g' : ' r') : ''}${k === typed.length && !locked ? ' cur' : ''}">${esc(t)}</span>`;
      }).join('');
      const cnt = {}; for (const c of typed) cnt[c] = (cnt[c] || 0) + 1;
      $('#bank').innerHTML = bank.map(c => { const used = cnt[c] > 0; if (used) cnt[c]--; return `<button class="key" data-c="${c}" ${used || locked ? 'disabled' : ''}>${c}</button>`; }).join('');
      $$('#bank .key').forEach(b => b.onclick = () => add(b.dataset.c));
    }
    const prefix = () => { let k = 0; while (k < typed.length && typed[k] === letters[k]) k++; return k; };
    function add(c) { if (locked || typed.length >= letters.length) return; typed += c; draw(); if (typed.length === letters.length) check(); }
    function del() { if (locked) return; typed = typed.slice(0, -1); draw(); }
    function check() {
      locked = true;
      if (typed === target) {
        ding(); res.push({ w: x.w, ok: tries === 0 && !hinted }); draw(true);
        $('#rocket').style.bottom = ((i + 1) / list.length * 78) + '%';
        $('#msg').innerHTML = `<div class="good">🚀 拼對了！${x.e || ''} <span class="en">${partsHTML(x)}</span>＝${esc(x.zh)}</div><button class="next" id="nx">${i + 1 >= list.length ? '看結果' : '下一題 ➜'}</button>`;
        speak(x.w); $('#nx').onclick = () => { i++; q(); };
        return;
      }
      tries++; buzz(); draw(true);
      if (tries >= 3) {
        res.push({ w: x.w, ok: false });
        $('#msg').innerHTML = `<div class="bad">答案是 <b class="en">${partsHTML(x)}</b>（${esc(x.zh)}），看著它念一次再繼續！</div><button class="next" id="nx">${i + 1 >= list.length ? '看結果' : '下一題 ➜'}</button>`;
        speak(x.w); $('#nx').onclick = () => { i++; q(); };
        return;
      }
      $('#msg').innerHTML = `<div class="bad">紅色的字母不對，再聽一次！（還有 ${3 - tries} 次機會）</div>`;
      later(() => { typed = typed.slice(0, prefix()); locked = false; draw(); speak(x.w); }, 1300);
    }
    $('#del').onclick = del;
    $('#hint').onclick = () => { if (locked) return; hinted = true; typed = target.slice(0, prefix() + 1); draw(); if (typed.length === letters.length) check(); };
    document.onkeydown = e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[a-zA-Z.'-]$/.test(e.key)) add(e.key.toLowerCase());
      else if (e.key === 'Backspace') { e.preventDefault(); del(); }
      else if (e.key === 'Enter') { const n = $('#nx'); if (n) n.click(); }
    };
    draw(); later(() => speak(x.w), 300);
  }
  q();
}

// ---------- 單字卡 ----------
function gLearn(ctx) {
  const list = ctx.words;
  let i = 0;
  function q() {
    if (i >= list.length) return ctx.done(null, { learn: true });
    const x = list[i];
    let cnt = 0;
    screen(ctx.title, `<p class="hint">聽 → 跟著念 3 次 → 看拼字 → 按「遮住」再念一次</p>
      <div class="learn"><div class="emo-huge">${pic(x, 'big')}</div><div class="word-big en" id="wd">${partsHTML(x)}</div><div class="zh">${esc(x.zh)}</div>${headInfo(x)}${x.n ? `<div class="note">💡 ${esc(x.n)}</div>` : ''}
        <div class="btns center"><button class="snd" id="s1">🔊 正常</button><button class="snd" id="s2">🐢 慢速</button><button class="snd" id="cover">🙈 遮住拼字</button></div>
        ${x.s ? `<div class="sent"><button class="snd sm" id="s3">🔊 句子</button> <span class="en">${esc(x.s)}</span><br><small>${esc(x.sz)}</small></div>` : ''}
        <button class="repeat" id="rep">👄 我跟著念了 <b id="cnt">0</b> / 3 次</button></div>
      <div class="btns center"><button class="snd" id="prev" ${i === 0 ? 'disabled' : ''}>⬅ 上一個</button><button class="next" id="nx">${i + 1 >= list.length ? '看完了 ✔' : '下一個 ➜'}</button></div>`,
      { back: ctx.back, progress: `${i + 1} / ${list.length}` });
    $('#s1').onclick = () => speak(x.w); $('#s2').onclick = () => slow(x.w); if (x.s) $('#s3').onclick = () => speak(x.s);
    $('#cover').onclick = () => { const w = $('#wd'); w.classList.toggle('covered'); $('#cover').textContent = w.classList.contains('covered') ? '👀 打開拼字' : '🙈 遮住拼字'; };
    $('#rep').onclick = () => { cnt = Math.min(cnt + 1, 3); $('#cnt').textContent = cnt; if (cnt === 3) { $('#rep').classList.add('done'); ding(); } else speak(x.w); };
    $('#prev').onclick = () => { i--; q(); };
    $('#nx').onclick = () => { i++; q(); };
    later(() => speak(x.w), 300);
  }
  q();
}

// ---------- 7. 單字闖關地圖 ----------
const STEPS = [['📖 單字卡', gLearn], ['🔨 打地鼠', gMole], ['🧱 拼讀積木', gTiles], ['🎤 念給我聽', gSpeak], ['🚀 聽寫火箭', gSpell]];
// 星星紀錄：發音入門沿用舊的編號 0～11，各級用「L1-0」這種格式
const starKey = (tid, i) => tid === 'p' ? i : `${tid}-${i}`;
const starsAt = (tid, i) => S.stars[starKey(tid, i)] || 0;
function mapScreen(tid) {
  tid = tid || (TRACK[S.track] ? S.track : 'p');
  const tr = TRACK[tid], due = dueWords();
  const cleared = tr.stages.filter((_, i) => starsAt(tid, i) >= 1).length;
  screen('🗺️ 單字闖關地圖', `${trackTabs(tid)}
    <p class="hint">每關 10 個字、5 步：${STEPS.map(s => s[0]).join(' → ')}。一次就答對 6 成以上得 1 顆星，就能開下一關。<br>${tr.name}：已過 ${cleared} / ${tr.stages.length} 關</p>
    ${due.length ? `<button class="due-banner" id="rv">📌 複習關：有 ${due.length} 個字該複習了（打地鼠＋聽寫）</button>` : ''}
    <div class="map">${tr.stages.map((st, i) => {
      const stars = starsAt(tid, i), open = i === 0 || starsAt(tid, i - 1) >= 1;
      return `<button class="node ${open ? '' : 'locked'} ${stars ? 'cleared' : ''}" data-i="${i}" ${open ? '' : 'disabled'}><span class="num">${open ? i + 1 : '🔒'}</span><b class="${tid === 'p' ? '' : 'en'}">${esc(st.title)}</b><small class="st">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</small></button>`;
    }).join('')}</div>`, { back: home });
  bindTabs(t => mapScreen(t));
  $$('.node').forEach(b => b.onclick = () => stageRun(tid, +b.dataset.i));
  if (due.length) $('#rv').onclick = reviewRun;
  // 捲到下一個要挑戰的關卡
  const nextNode = $$('.node')[Math.min(cleared, tr.stages.length - 1)];
  if (nextNode && cleared > 3) nextNode.scrollIntoView({ block: 'center' });
}
function runSteps(words, steps, title, onEnd, back = () => mapScreen()) {
  let k = 0; const all = [];
  const next = () => {
    if (k >= steps.length) return onEnd(all);
    const [name, fn] = steps[k];
    screen(title, `<div class="step-intro"><div class="steps">${steps.map((s, j) => `<span class="${j < k ? 'done' : j === k ? 'cur' : ''}">${s[0]}</span>`).join('<i>›</i>')}</div>
      <h2>第 ${k + 1} 步：${name}</h2><p class="en">${words.map(x => esc(x.w)).join(' · ')}</p><button class="next big" id="go">開始！</button></div>`, { back });
    $('#go').onclick = () => fn({ words, title: `${title}｜${name}`, back, done: res => { if (res) all.push(...res); k++; next(); } });
  };
  next();
}
function stageRun(tid, i) {
  const tr = TRACK[tid], st = tr.stages[i], key = starKey(tid, i), back = () => mapScreen(tid);
  runSteps(st.words, STEPS, `${tr.name} 第 ${i + 1} 關`, all => {
    applyResults(all);
    const ok = all.filter(r => r.ok).length, stars = starsOf(all.length ? ok / all.length : 0);
    const had = (S.stars[key] || 0) >= 1, first = !had && stars >= 1;
    if (stars > (S.stars[key] || 0)) { S.stars[key] = stars; save(); }
    const more = i + 1 < tr.stages.length, canNext = (S.stars[key] || 0) >= 1 && more;
    showResult({ title: `${tr.name} 第 ${i + 1} 關 ${st.title}`, res: all, again: () => stageRun(tid, i), back,
      next: canNext ? () => stageRun(tid, i + 1) : null, unlocked: first && more, locked: stars < 1 && !had });
  }, back);
}
function reviewRun() {
  const words = dueWords().slice(0, 15);
  if (!words.length) return mapScreen();
  runSteps(words, [STEPS[1], STEPS[4]], '📌 複習關', all => {
    applyResults(all);
    showResult({ title: '複習關', res: all, again: reviewRun, back: () => mapScreen() });
  });
}

// ---------- 設定 ----------
function settings() {
  loadVoices();
  screen('⚙️ 設定', `<div class="panel">
    <h3>英文發音的聲音</h3>
    ${voices.length ? `<select id="vsel"><option value="">自動選擇（建議）</option>${voices.map(v => `<option value="${esc(v.name)}" ${v.name === S.voice ? 'selected' : ''}>${esc(v.name)}（${esc(v.lang)}）</option>`).join('')}</select>`
      : '<p>找不到英文語音。請用 Edge 或 Chrome 開啟；Windows 也可以到「設定 → 時間與語言 → 語音」加裝英文語音。</p>'}
    <h3>語速</h3>${spdHTML()}<p class="hint">每一頁右上角也都可以按 🐢／🐇 調整。「🐢 慢慢聽」按鈕會再放慢到目前語速的 6 成。</p>
    <div class="btns"><button class="snd" id="t1">🔊 試聽</button><button class="snd" id="t2">🐢 慢速試聽</button></div>
    <p class="hint">Edge 裡名稱有「Online (Natural)」的聲音最自然（需要連網）。</p>
    <h3>麥克風（念給我聽）</h3>
    <p>${SR ? '這個瀏覽器可以用語音辨識 ✅ 第一次使用會詢問麥克風權限，請按「允許」。語音辨識需要連網。' : '這個瀏覽器不支援語音辨識，「念給我聽」會改用自己判斷模式。建議用 Chrome 或 Edge。'}</p>
    <h3>學習進度</h3>
    <p>練習過 ${Object.keys(S.srs).length} 個字，現在該複習 ${dueWords().length} 個；寵物念對 ${S.pet} 個字。</p>
    <button class="danger" id="reset">清除全部進度</button></div>`, { back: home });
  if ($('#vsel')) $('#vsel').onchange = e => { S.voice = e.target.value; save(); speak('Hello! Let us learn English.'); };
  $('#t1').onclick = () => speak('apple, banana, beautiful');
  $('#t2').onclick = () => slow('apple, banana, beautiful');
  $('#reset').onclick = () => {
    if (!confirm('確定要清除全部進度嗎？星星、複習紀錄、寵物和徽章都會歸零，不能復原。')) return;
    Object.assign(S, { stars: {}, srs: {}, pet: 0, badges: {} }); save(); settings();
  };
}

home();
