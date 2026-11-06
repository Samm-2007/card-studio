import { normalizeTrackInput } from './magnetic';
export type EncodingTrack = { track: number; data: string };
export function parseEncoding(value: string): EncodingTrack[] {
  const text = normalizeTrackInput(value).trim();
  if (!text.startsWith('%') && !text.startsWith(';') && !text.startsWith('+')) {
    const data = text.replace(/\s/g, '');
    if (!/^[0-9=]{1,66}$/.test(data)) throw new Error('شماره باید ۱ تا ۶۶ نویسه، شامل رقم و = باشد؛ برای چند ترک، قالب کامل را وارد کنید.');
    return [{track: data.length <= 37 ? 2 : 3, data}];
  }
  // Standard sentinel form; also accept the supplied reader's T1:T2? +T3? form.
  const tracks: EncodingTrack[] = [];
  let rest = text;
  while (rest.trim()) {
    rest = rest.trimStart();
    const marker = rest[0];
    const track = marker === '%' ? 1 : marker === ';' ? 2 : marker === '+' ? 3 : 0;
    if (!track) throw new Error('شروع ترک نامشخص است؛ از % برای ترک ۱، ; برای ترک ۲ و + برای ترک ۳ استفاده کنید.');
    rest = rest.slice(1);
    let end = rest.indexOf('?');
    const colon = track === 1 ? rest.indexOf(':') : -1;
    const legacy = colon >= 0 && (end < 0 || colon < end);
    if (legacy) end = colon;
    if (end < 0) throw new Error(`پایان ترک ${track} مشخص نیست؛ علامت ? لازم است.`);
    const data = rest.slice(0, end);
    rest = rest.slice(end + 1);
    if (legacy) rest = ';' + rest;
    if (tracks.some(item => item.track === track)) throw new Error(`ترک ${track} تکراری است.`);
    const limit = track === 1 ? 76 : track === 2 ? 37 : 104;
    const valid = track === 1 ? /^[\x20-\x5F]+$/.test(data) && !/[?%]/.test(data) : /^[0-9=]+$/.test(data);
    if (!valid || data.length > limit) throw new Error(`ترک ${track}: حداکثر ${limit} نویسه؛ ${track === 1 ? 'حروف بزرگ انگلیسی، رقم و علائم ASCII مجاز' : 'فقط رقم و =؛ فاصله و خط تیره داخل این ترک مجاز نیست'}.`);
    tracks.push({track, data});
  }
  return tracks.sort((a,b) => a.track-b.track);
}
export function encodingCommands(value: string): string[] {
  return parseEncoding(value).map(item => `~${item.track}${item.data}|`);
}
