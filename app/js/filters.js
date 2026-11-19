// Filters and the spoiler rule: which trophies a view shows, and when a story
// trophy's name and description stay hidden until it is earned.
export const KIND_LABELS = {
  story: 'Story',
  side: 'Side quests',
  collectible: 'Collectibles',
  activity: 'Activities',
  crime: 'Crime',
  exploration: 'Exploration',
  money: 'Money',
  completion: '100% completion',
  platinum: 'Platinum',
};

// The filter chips the checklist offers. "missable" and "online" are not kinds in
// the data — they are computed views, which is why they live here, not in the JSON.
export const KIND_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'story', label: 'Story' },
  { id: 'missable', label: 'Missable' },
  { id: 'collectible', label: 'Collectibles' },
  { id: 'activity', label: 'Activities' },
  { id: 'side', label: 'Side quests' },
  { id: 'crime', label: 'Crime' },
  { id: 'exploration', label: 'Exploration' },
  { id: 'money', label: 'Money' },
  { id: 'online', label: 'Online' },
];

export function kindLabel(kind) {
  return KIND_LABELS[kind] ?? kind;
}

// A trophy is spoiler-hidden when the spoiler setting is on, the trophy is a
// story trophy, and the player has not earned it yet.
export function isSpoilerHidden(trophy, earned, hideSpoilers) {
  return hideSpoilers && trophy.kind === 'story' && !earned.has(trophy.id);
}

export function applyFilters(trophies, options) {
  const { kind, grade, query, earnedOnly, earned } = options;
  const needle = query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (kind === 'missable' && !t.missable) return false;
    if (kind === 'online') return false; // No online trophies: all 55 are single-player.
    if (kind !== 'all' && kind !== 'missable' && kind !== 'online' && t.kind !== kind) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (earnedOnly && !earned.has(t.id)) return false;
    if (needle && !(t.name.toLowerCase().includes(needle) || t.description.toLowerCase().includes(needle))) return false;
    return true;
  });
}

export function gradeCounts(trophies, earned) {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) if (earned.has(t.id)) counts[t.grade] += 1;
  return counts;
}
