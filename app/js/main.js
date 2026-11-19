// Leonida Ledger boot: loads app/data/trophies.json, renders the checklist,
// roadmap, missables and sources views, and wires the tracker (localStorage
// progress, export/import, kind and grade filters, spoiler setting).
import { loadEarned, saveEarned, loadSettings, saveSettings, exportProgress, importProgressFile } from './store.js';
import { KIND_CHIPS, kindLabel, isSpoilerHidden, applyFilters, gradeCounts } from './filters.js';

const data = await (await fetch('data/trophies.json')).json();
const trophies = data.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

let earned = loadEarned();
let settings = { hideSpoilers: true, ...loadSettings() };
let activeKind = 'all';
let selectedId = null;

const $ = (id) => document.getElementById(id);
const listEl = $('trophyList');
const detailEl = $('detailPane');

function persistSettings() {
  saveSettings({ hideSpoilers: settings.hideSpoilers });
}

function renderProgress() {
  $('earnedCount').textContent = earned.size;
  $('barFill').style.width = `${Math.round((earned.size / trophies.length) * 100)}%`;
  const counts = gradeCounts(trophies, earned);
  $('earnedByGrade').textContent =
    `Earned: ${counts.platinum} platinum · ${counts.gold} gold · ${counts.silver} silver · ${counts.bronze} bronze`;
}

function gradeBadge(grade) {
  const span = document.createElement('span');
  span.className = `grade-badge grade-${grade}`;
  span.textContent = grade;
  return span;
}

function trophyName(trophy) {
  if (isSpoilerHidden(trophy, earned, settings.hideSpoilers)) return 'Hidden trophy — story spoiler';
  return trophy.name;
}

function trophyDescription(trophy) {
  if (isSpoilerHidden(trophy, earned, settings.hideSpoilers)) return 'Earn this story trophy to reveal its name and description.';
  return trophy.description;
}

function renderChecklist() {
  const visible = applyFilters(trophies, {
    kind: activeKind,
    grade: $('gradeFilter').value,
    query: $('search').value,
    earnedOnly: $('earnedOnly').checked,
    earned,
  });
  $('resultLine').textContent =
    activeKind === 'online'
      ? 'Online trophies: none. All 55 GTA VI trophies are single-player, so this filter is empty by design.'
      : `${visible.length} of ${trophies.length} trophies shown · ${earned.size} earned`;
  listEl.replaceChildren();
  for (const t of visible) {
    const li = document.createElement('li');
    li.className = `trophy-row${earned.has(t.id) ? ' earned' : ''}`;
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Earned: ${t.name}`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      saveEarned(earned);
      renderProgress();
      renderChecklist();
      if (selectedId === t.id) renderDetail(t);
    });
    const body = document.createElement('div');
    const name = document.createElement('div');
    name.className = 't-name';
    name.textContent = trophyName(t);
    const desc = document.createElement('div');
    desc.className = 't-desc';
    desc.textContent = trophyDescription(t);
    const meta = document.createElement('div');
    meta.className = 't-meta';
    const kind = document.createElement('span');
    kind.className = 'kind-tag';
    kind.textContent = kindLabel(t.kind);
    meta.append(kind, document.createTextNode(t.count ? `  ${t.count.toLocaleString()} to go` : ''));
    if (t.missable) {
      const flag = document.createElement('span');
      flag.className = 'flag-missable';
      flag.textContent = '  ⚠ MISSABLE';
      meta.append(flag);
    }
    if (t.hidden) {
      const hidden = document.createElement('span');
      hidden.textContent = '  · Hidden on PSN';
      meta.append(hidden);
    }
    body.append(name, desc, meta);
    body.style.cursor = 'pointer';
    body.addEventListener('click', () => {
      selectedId = t.id;
      renderDetail(t);
      location.hash = `#/trophy/${t.id}`;
    });
    li.append(box, body, gradeBadge(t.grade));
    listEl.append(li);
  }
}

function renderDetail(trophy) {
  detailEl.replaceChildren();
  const hidden = isSpoilerHidden(trophy, earned, settings.hideSpoilers);
  const title = document.createElement('h2');
  title.textContent = hidden ? 'Hidden trophy — story spoiler' : trophy.name;
  detailEl.append(title);
  const badges = document.createElement('p');
  badges.append(gradeBadge(trophy.grade));
  const kind = document.createElement('span');
  kind.className = 'kind-tag';
  kind.textContent = ` ${kindLabel(trophy.kind)}`;
  badges.append(document.createTextNode(' '), kind);
  if (trophy.missable) {
    const warn = document.createElement('div');
    warn.className = 'warn-box';
    warn.textContent = '⚠ MISSABLE — read the guide before this window closes.';
    detailEl.append(warn);
  }
  detailEl.append(badges);
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = hidden
    ? 'Official description hidden until earned (spoiler setting is on).'
    : `Official: “${trophy.description}” — ${trophy.grade}, PSN count ${trophy.count ?? '—'}.`;
  detailEl.append(official);
  if (!hidden) {
    const guide = document.createElement('p');
    guide.className = 'guide-text';
    guide.textContent = trophy.guide;
    detailEl.append(guide);
    const sources = document.createElement('div');
    sources.className = 'sources';
    const heading = document.createElement('h3');
    heading.textContent = 'Sources — where each fact comes from';
    const list = document.createElement('ul');
    for (const s of trophy.sources) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = s.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = s.name;
      item.append(link);
      list.append(item);
    }
    sources.append(heading, list);
    detailEl.append(sources);
  } else {
    const note = document.createElement('p');
    note.className = 'guide-text';
    note.textContent = 'Turn off “Hide story spoilers” or earn this trophy to read its guide.';
    detailEl.append(note);
  }
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.textContent = earned.has(trophy.id) ? 'Mark as not earned' : 'Mark as earned';
  toggle.addEventListener('click', () => {
    if (earned.has(trophy.id)) earned.delete(trophy.id);
    else earned.add(trophy.id);
    saveEarned(earned);
    renderProgress();
    renderChecklist();
    renderDetail(trophy);
  });
  detailEl.append(toggle);
}

function renderRoadmap() {
  const body = $('roadmapBody');
  body.replaceChildren();
  for (const phase of data.roadmap) {
    const card = document.createElement('div');
    card.className = 'phase';
    const heading = document.createElement('h3');
    heading.textContent = `Phase ${phase.phase} — ${phase.title}`;
    const time = document.createElement('p');
    time.className = 'phase-time';
    time.textContent = phase.time;
    const text = document.createElement('p');
    text.textContent = phase.body;
    const list = document.createElement('ul');
    for (const id of phase.trophies) {
      const t = byId.get(id);
      if (!t) continue;
      const item = document.createElement('li');
      if (earned.has(id)) item.className = 'earned-trophy';
      item.textContent = `${t.name} — ${t.grade}${t.missable ? ' — ⚠ MISSABLE' : ''}`;
      list.append(item);
    }
    card.append(heading, time, text, list);
    body.append(card);
  }
}

function renderMissables() {
  const body = $('missablesBody');
  body.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) {
    const card = document.createElement('div');
    card.className = 'missable-card';
    const heading = document.createElement('h3');
    heading.textContent = `${t.name} — the only missable trophy`;
    const text = document.createElement('p');
    text.textContent = t.guide;
    card.append(heading, text);
    body.append(card);
  }
  const note = document.createElement('p');
  note.textContent =
    'Every other trophy stays available in free-roam after the story, including all side-quest finales, robberies and collectibles. The only thing that can truly lock you out is the Chapter 1 meditation above.';
  body.append(note);
  const rules = $('saveRules');
  rules.replaceChildren();
  for (const warning of data.meta.warnings) {
    const item = document.createElement('li');
    item.textContent = warning;
    rules.append(item);
  }
}

function renderAbout() {
  const body = $('aboutBody');
  body.replaceChildren();
  const note = document.createElement('p');
  note.textContent = data.meta.honestyNote;
  const heading = document.createElement('h3');
  heading.textContent = 'Sources for the official list and the guides';
  const list = document.createElement('ul');
  list.className = 'source-list';
  for (const s of [...data.meta.listSources, ...data.meta.guideSources]) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = s.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = s.name;
    item.append(link);
    list.append(item);
  }
  const counts = document.createElement('p');
  counts.textContent =
    `The list: ${data.meta.trophyCount} trophies — ${data.meta.grades.platinum} platinum, ${data.meta.grades.gold} gold, ${data.meta.grades.silver} silver, ${data.meta.grades.bronze} bronze; ${data.meta.hiddenCount} hidden on PlayStation until earned; ${data.meta.onlineTrophies} online trophies.`;
  body.append(note, heading, list, counts);
}

function buildKindChips() {
  const fieldset = $('kindFilters');
  for (const chip of KIND_CHIPS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = chip.label;
    button.setAttribute('aria-pressed', String(activeKind === chip.id));
    button.addEventListener('click', () => {
      activeKind = chip.id;
      for (const b of fieldset.querySelectorAll('.chip')) b.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-pressed', 'true');
      renderChecklist();
    });
    fieldset.append(button);
  }
}

function showView(name) {
  for (const view of ['checklist', 'roadmap', 'missables', 'about']) {
    $(`view${view[0].toUpperCase()}${view.slice(1)}`).hidden = view !== name;
    $(`tab${view[0].toUpperCase()}${view.slice(1)}`).classList.toggle('active', view === name);
  }
}

function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  if (hash === 'roadmap') showView('roadmap');
  else if (hash === 'missables') showView('missables');
  else if (hash === 'about') showView('about');
  else if (hash.startsWith('trophy/')) {
    const id = Number(hash.slice('trophy/'.length));
    const t = byId.get(id);
    showView('checklist');
    if (t) {
      selectedId = id;
      renderDetail(t);
    }
  } else showView('checklist');
}

function wireControls() {
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => {
      location.hash = `#/${tab.dataset.view}`;
    });
  }
  $('search').addEventListener('input', renderChecklist);
  $('gradeFilter').addEventListener('change', renderChecklist);
  $('earnedOnly').addEventListener('change', renderChecklist);
  const spoiler = $('spoilerToggle');
  spoiler.checked = settings.hideSpoilers;
  spoiler.addEventListener('change', () => {
    settings.hideSpoilers = spoiler.checked;
    persistSettings();
    renderChecklist();
    if (selectedId) renderDetail(byId.get(selectedId));
  });
  $('exportBtn').addEventListener('click', () => exportProgress(earned));
  $('importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      earned = await importProgressFile(file);
      saveEarned(earned);
      renderProgress();
      renderChecklist();
    } catch (error) {
      alert(`Could not import that file: ${error.message}`);
    }
    event.target.value = '';
  });
  window.addEventListener('hashchange', route);
}

buildKindChips();
wireControls();
renderProgress();
renderChecklist();
renderRoadmap();
renderMissables();
renderAbout();
route();
