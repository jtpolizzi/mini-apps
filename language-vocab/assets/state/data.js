// assets/state/data.js
const WORD_FIELDS = ['word', 'term', 'lemma'];
const LEGACY_WORD_FIELDS = ['Spanish', 'es']; // TODO: remove once all data files use word/definition.
const DEFINITION_FIELDS = ['definition', 'gloss', 'meaning'];
const LEGACY_DEFINITION_FIELDS = ['English', 'en']; // TODO: remove once all data files use word/definition.

function pickField(entry, keys = []) {
  for (const key of keys) {
    if (!key) continue;
    const value = entry?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function normalizeTermPart(value, fallback) {
  const norm = String(value || '').trim().toLowerCase();
  return norm || fallback;
}

export function termKey(word, pos) {
  const baseWord = normalizeTermPart(word, 'unknown');
  const basePos = normalizeTermPart(pos, 'unknown');
  return baseWord + '|' + basePos;
}

export function stableId(word, definition) {
  const s = (word || '') + '|' + (definition || '');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'w_' + (h >>> 0).toString(16);
}

export function mapRaw(raw = []) {
  return (raw || []).map(entry => {
    const word = pickField(entry, [...WORD_FIELDS, ...LEGACY_WORD_FIELDS]);
    const definition = pickField(entry, [...DEFINITION_FIELDS, ...LEGACY_DEFINITION_FIELDS]);
    const pos = (entry.POS || entry.pos || '').trim();
    const cefr = (entry.CEFR || entry.cefr || '').trim();
    const tags = (entry.Tags || entry.tags || '').trim();
    return {
      id: stableId(word, definition),
      termKey: termKey(word, pos),
      word,
      definition,
      pos,
      cefr,
      tags
    };
  });
}

export function normalizeTagsList(source) {
  if (!source) return [];
  return String(source)
    .split(/[|,;]+|\s+/g)
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
}
