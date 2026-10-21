// lib/romanize-kana.ts
// Hepburn romanisation for kana, run before `transliteration` builds a slug.
//
// `transliteration` romanises kana one character at a time in a Kunrei-like
// scheme and reads small kana as full-size ones, so ジャパン came out
// "ziyapan", シャープ "siyapu", ネットワーク "netutowaku" and ちょっと
// "tiyotuto". Those slugs sit in the URL of every Japanese release. This pass
// rewrites each kana run as the Hepburn a Japanese reader expects - "japan",
// "shapu", "nettowaku", "chotto" - and leaves everything else (kanji, Latin,
// digits) for `transliteration` to handle as before.
//
// Kanji are out of scope: their reading depends on a dictionary, and
// `transliteration` still gives them Mandarin readings.

const BASE: Record<string, string> = {
  ア: 'a', イ: 'i', ウ: 'u', エ: 'e', オ: 'o',
  カ: 'ka', キ: 'ki', ク: 'ku', ケ: 'ke', コ: 'ko',
  ガ: 'ga', ギ: 'gi', グ: 'gu', ゲ: 'ge', ゴ: 'go',
  サ: 'sa', シ: 'shi', ス: 'su', セ: 'se', ソ: 'so',
  ザ: 'za', ジ: 'ji', ズ: 'zu', ゼ: 'ze', ゾ: 'zo',
  タ: 'ta', チ: 'chi', ツ: 'tsu', テ: 'te', ト: 'to',
  ダ: 'da', ヂ: 'ji', ヅ: 'zu', デ: 'de', ド: 'do',
  ナ: 'na', ニ: 'ni', ヌ: 'nu', ネ: 'ne', ノ: 'no',
  ハ: 'ha', ヒ: 'hi', フ: 'fu', ヘ: 'he', ホ: 'ho',
  バ: 'ba', ビ: 'bi', ブ: 'bu', ベ: 'be', ボ: 'bo',
  パ: 'pa', ピ: 'pi', プ: 'pu', ペ: 'pe', ポ: 'po',
  マ: 'ma', ミ: 'mi', ム: 'mu', メ: 'me', モ: 'mo',
  ヤ: 'ya', ユ: 'yu', ヨ: 'yo',
  ラ: 'ra', リ: 'ri', ル: 'ru', レ: 're', ロ: 'ro',
  ワ: 'wa', ヰ: 'i', ヱ: 'e', ヲ: 'o', ン: 'n', ヴ: 'vu',
  // Small kana standing on their own (not part of a digraph below).
  ァ: 'a', ィ: 'i', ゥ: 'u', ェ: 'e', ォ: 'o', ャ: 'ya', ュ: 'yu', ョ: 'yo', ヮ: 'wa',
  ヵ: 'ka', ヶ: 'ke',
};

/** Two-kana sounds: yōon (キャ) and the extended katakana used for loanwords (ファ). */
const DIGRAPHS: Record<string, string> = {
  シャ: 'sha', シュ: 'shu', ショ: 'sho', シェ: 'she',
  ジャ: 'ja', ジュ: 'ju', ジョ: 'jo', ジェ: 'je',
  チャ: 'cha', チュ: 'chu', チョ: 'cho', チェ: 'che',
  ヂャ: 'ja', ヂュ: 'ju', ヂョ: 'jo',
  ファ: 'fa', フィ: 'fi', フェ: 'fe', フォ: 'fo', フュ: 'fyu',
  ティ: 'ti', ディ: 'di', トゥ: 'tu', ドゥ: 'du', テュ: 'tyu', デュ: 'dyu',
  ウィ: 'wi', ウェ: 'we', ウォ: 'wo',
  ヴァ: 'va', ヴィ: 'vi', ヴェ: 've', ヴォ: 'vo',
  ツァ: 'tsa', ツィ: 'tsi', ツェ: 'tse', ツォ: 'tso',
  イェ: 'ye', クァ: 'kwa', グァ: 'gwa',
};
// The regular yōon: キャ -> kya, ニュ -> nyu, and so on.
for (const [kana, roma] of Object.entries({
  キ: 'k', ギ: 'g', ニ: 'n', ヒ: 'h', ビ: 'b', ピ: 'p', ミ: 'm', リ: 'r',
})) {
  DIGRAPHS[`${kana}ャ`] = `${roma}ya`;
  DIGRAPHS[`${kana}ュ`] = `${roma}yu`;
  DIGRAPHS[`${kana}ョ`] = `${roma}yo`;
}

const SOKUON = 'ッ';

/** Hiragana -> katakana, so one table covers both. */
function toKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

function romanizeRun(run: string): string {
  const kata = toKatakana(run);
  let out = '';
  let geminate = false;

  for (let i = 0; i < kata.length; i++) {
    const c = kata[i];
    if (c === SOKUON) {
      geminate = true;
      continue;
    }
    // The long-vowel mark and iteration marks are dropped: コンピューター -> konpyuta.
    if (c === 'ー' || c === 'ヽ' || c === 'ヾ') continue;
    // The katakana middle dot separates words (ジョン・スミス).
    if (c === '・') {
      out += ' ';
      geminate = false;
      continue;
    }

    let roma = DIGRAPHS[c + (kata[i + 1] ?? '')];
    if (roma) i++;
    else roma = BASE[c] ?? '';

    // A small ッ doubles the next consonant: ット -> tto, ッチ -> tchi.
    if (geminate && roma && !/^[aeiou]/.test(roma)) {
      roma = (roma.startsWith('ch') ? 't' : roma[0]) + roma;
    }
    geminate = false;
    out += roma;
  }
  return out;
}

const word = (run: string) => ` ${romanizeRun(run)} `;

/**
 * Replaces every kana run with its Hepburn romanisation, padded with spaces so
 * it reads as its own word next to kanji or Latin text. Hiragana and katakana
 * runs are taken separately - 新たなネットワーク is "tana nettowaku", not one
 * word. Text with no kana is returned unchanged.
 */
export function romanizeKana(text: string): string {
  return text
    .replace(/[ァ-ヾ]+/g, word)
    .replace(/[ぁ-ゖー]+/g, word);
}
