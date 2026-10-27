import { Visitor } from '../types';

export type VoiceLanguage = 'uk-UA' | 'ru-RU';

export const VOICE_LANG_STORAGE_KEY = 'checkpoint_voice_lang';

export function getSavedVoiceLanguage(): VoiceLanguage {
  try {
    const saved = localStorage.getItem(VOICE_LANG_STORAGE_KEY);
    if (saved === 'ru-RU' || saved === 'uk-UA') return saved;
  } catch {}
  return 'uk-UA';
}

export function saveVoiceLanguage(lang: VoiceLanguage) {
  try {
    localStorage.setItem(VOICE_LANG_STORAGE_KEY, lang);
  } catch {}
}

/**
 * Normalizes speech text for cross-lingual (UA <-> RU) phonetic matching.
 * Converts interchangeable vowels and letters into unified representations.
 */
export function normalizeVoiceText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/['`’ʼ.,!?;:()"-]/g, ' ')
    .replace(/[иіїыi]/g, 'i')
    .replace(/[еєэe]/g, 'e')
    .replace(/[гґg]/g, 'g')
    .replace(/[аa]/g, 'a')
    .replace(/[оo]/g, 'o')
    .replace(/[рp]/g, 'p')
    .replace(/[сc]/g, 'c')
    .replace(/[хx]/g, 'x')
    .replace(/[уy]/g, 'y')
    .replace(/[ъь]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Common paired equivalents between Ukrainian and Russian (callsigns, common names)
const EQUIVALENTS_LIST: [string, string][] = [
  ['сокол', 'сокіл'],
  ['волк', 'вовк'],
  ['медведь', 'ведмідь'],
  ['гром', 'грім'],
  ['ветер', 'вітер'],
  ['кот', 'кіт'],
  ['ястреб', 'яструб'],
  ['коршун', 'шуліка'],
  ['беркут', 'беркут'],
  ['гроза', 'гроза'],
  ['барс', 'барс'],
  ['николай', 'микола'],
  ['александр', 'олександр'],
  ['алексей', 'олексій'],
  ['дмитрий', 'дмитро'],
  ['евгений', 'євген'],
  ['владимир', 'володимир'],
  ['михаил', 'михайло'],
  ['сергей', 'сергій'],
  ['андрей', 'андрій'],
  ['петр', 'петро'],
  ['павел', 'павло'],
  ['иван', 'іван'],
  ['юрий', 'юрій'],
  ['григорий', 'григорій'],
  ['игорь', 'ігор'],
  ['виктор', 'віктор'],
  ['богдан', 'богдан']
];

const EQUIV_MAP = new Map<string, string>();
for (const [a, b] of EQUIVALENTS_LIST) {
  const normA = normalizeVoiceText(a);
  const normB = normalizeVoiceText(b);
  EQUIV_MAP.set(normA, normB);
  EQUIV_MAP.set(normB, normA);
}

function wordsMatch(w1: string, w2: string): boolean {
  if (w1 === w2) return true;
  if (w1.length >= 4 && (w2.startsWith(w1) || w1.startsWith(w2))) return true;
  if (EQUIV_MAP.get(w1) === w2) return true;
  if (EQUIV_MAP.get(w2) === w1) return true;
  return false;
}

/**
 * Checks if a visitor matches a search/voice query string,
 * supporting Ukrainian, Russian, surnames, first names, callsigns, and ranks.
 */
export function matchVisitorVoice(visitor: Visitor, queryStr: string): boolean {
  const normQuery = normalizeVoiceText(queryStr);
  const qWords = normQuery.split(/\s+/).filter(Boolean);
  if (qWords.length === 0) return true;

  const visitorTokens = [
    ...normalizeVoiceText(visitor.name).split(/\s+/),
    ...normalizeVoiceText(visitor.callsign || '').split(/\s+/),
    ...normalizeVoiceText(visitor.category || '').split(/\s+/)
  ].filter(Boolean);

  return qWords.every(qw => 
    visitorTokens.some(vt => 
      wordsMatch(qw, vt) || vt.includes(qw) || qw.includes(vt)
    )
  );
}

export interface ParsedVoiceCommand {
  isCommand: boolean;
  action: 'in' | 'out' | null;
  targetQuery: string;
  rawTranscript: string;
  triggerWord?: string;
}

// Regex patterns for IN (+) and OUT (-) with word boundaries for Cyrillic:
const IN_REGEX = /(?:^|[\s,.:;!?-])(\+|плюс|плюсани|зашел|зашла|зашли|вошел|вошла|вошли|пришел|пришла|пришли|зайшов|зайшла|зайшли|ввійшов|ввійшла|ввійшли|увійшов|увійшла|увійшли|прийшов|прийшла|прийшли|вход|вхід|входь|заходи|заходь|зайди|зайти|войти|увійти|ввійти|добавь|додай|поставь|постав|став|впусти|впустити|впустить)(?:$|[\s,.:;!?-])/i;

const OUT_REGEX = /(?:^|[\s,.:;!?-])(-|минус|мінус|минусани|мінусани|вышел|вышла|вышли|ушел|ушла|ушли|вийшов|вийшла|вийшли|пішов|пішла|пішли|выход|вихід|виходи|виходь|вийди|выйди|вийти|выйти|уйти|піти|выпиши|випиши|удали|видали|відніми|отними|заверши|заверш|зовні)(?:$|[\s,.:;!?-])/i;

const CLEAN_COMMAND_WORDS = /(?:^|[\s,.:;!?-])(\+|плюс|плюсани|зашел|зашла|зашли|вошел|вошла|вошли|пришел|пришла|пришли|зайшов|зайшла|зайшли|ввійшов|ввійшла|ввійшли|увійшов|увійшла|увійшли|прийшов|прийшла|прийшли|вход|вхід|входь|заходи|заходь|зайди|зайти|войти|увійти|ввійти|добавь|додай|поставь|постав|став|впусти|впустити|впустить|-|минус|мінус|минусани|мінусани|вышел|вышла|вышли|ушел|ушла|ушли|вийшов|вийшла|вийшли|пішов|пішла|пішли|выход|вихід|виходи|виходь|вийди|выйди|вийти|выйти|уйти|піти|выпиши|випиши|удали|видали|відніми|отними|заверши|заверш|зовні)(?:$|[\s,.:;!?-])/gi;

/**
 * Parses spoken text into an action ('in' | 'out') and target name/callsign,
 * supporting both Ukrainian and Russian command vocabulary.
 */
export function parseVoiceCommand(transcript: string): ParsedVoiceCommand {
  const trimmed = (transcript || '').trim();
  if (!trimmed) {
    return { isCommand: false, action: null, targetQuery: '', rawTranscript: '' };
  }

  const inMatch = trimmed.match(IN_REGEX);
  const outMatch = trimmed.match(OUT_REGEX);

  const isPlus = !!inMatch;
  const isMinus = !!outMatch;

  let action: 'in' | 'out' | null = null;
  let triggerWord: string | undefined = undefined;

  if (isPlus && !isMinus) {
    action = 'in';
    triggerWord = inMatch?.[1];
  } else if (isMinus && !isPlus) {
    action = 'out';
    triggerWord = outMatch?.[1];
  } else if (isPlus && isMinus) {
    const inIndex = inMatch?.index ?? 0;
    const outIndex = outMatch?.index ?? 0;
    if (inIndex > outIndex) {
      action = 'in';
      triggerWord = inMatch?.[1];
    } else {
      action = 'out';
      triggerWord = outMatch?.[1];
    }
  }

  const cleanedName = trimmed
    .replace(CLEAN_COMMAND_WORDS, ' ')
    .replace(/[+.,!?_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    isCommand: action !== null,
    action,
    targetQuery: cleanedName,
    rawTranscript: trimmed,
    triggerWord
  };
}
