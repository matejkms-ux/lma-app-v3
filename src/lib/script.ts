// Some scripts have dense, similar-looking glyphs that are hard to tell apart at a
// Latin body size — e.g. Thai ล (l) vs ส (s), or CJK strokes. For those we render
// reading text noticeably larger so learners can distinguish characters. Latin-script
// languages (including ä/ö/ü/ß and č/š/ž) stay at the normal, compact size.
//
// Ranges: Thai, Hebrew, Arabic, Japanese kana, CJK ideographs, Hangul.
const LARGE_SCRIPT =
  /[฀-๿֐-׿؀-ۿ぀-ヿ㐀-鿿가-힯]/;

/** True if any of the given strings contain a script that benefits from larger type. */
export function needsLargeScript(...texts: Array<string | null | undefined>): boolean {
  return texts.some((t) => !!t && LARGE_SCRIPT.test(t));
}
