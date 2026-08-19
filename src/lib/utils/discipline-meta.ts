export interface ParsedDisciplineMeta {
  cleanDescription: string;
  coach_name: string;
  selectedSchedules: string[];
  schedules_summary: string[];
  price_2x: number;
  price_3x: number;
  price_6x: number;
  price_single: number;
}

export function parseDisciplineMeta(d: any): ParsedDisciplineMeta {
  let rawDesc = d?.description || '';
  let coach = d?.coach_name || 'Profesor Asignado';
  let schedules: string[] = ['08:00', '14:30', '19:30'];
  const basePrice = Number(d?.price || 26000);
  let p2x = d?.price_2x || Math.round(basePrice * 0.7) || 18000;
  let p3x = d?.price_3x || Math.round(basePrice * 0.85) || 22000;
  let p6x = d?.price_6x || basePrice || 26000;
  let pSingle = d?.price_single || Math.round(basePrice / 6) || 4500;

  // 1. Extract frequency prices if encoded in description
  const pricesMatch = rawDesc.match(/\[PRICES:(.*?)\]/);
  if (pricesMatch && pricesMatch[1]) {
    const pairs = pricesMatch[1].split(',');
    pairs.forEach((pair: string) => {
      const [k, v] = pair.split('=');
      if (k === '2x' && v) p2x = Number(v);
      if (k === '3x' && v) p3x = Number(v);
      if (k === '6x' && v) p6x = Number(v);
      if (k === '1x' && v) pSingle = Number(v);
    });
    rawDesc = rawDesc.replace(/\[PRICES:.*?\]/g, '').trim();
  }

  // 2. Extract coach metadata if present
  const coachMatch = rawDesc.match(/\[COACH:(.*?)\]/);
  if (coachMatch && coachMatch[1]) {
    coach = coachMatch[1].trim();
    rawDesc = rawDesc.replace(/\[COACH:.*?\]/g, '').trim();
  }

  // 3. Extract schedules metadata if present
  const schedMatch = rawDesc.match(/\[SCHEDULES:(.*?)\]/);
  if (schedMatch && schedMatch[1]) {
    const parsed = schedMatch[1]
      .split(',')
      .map((s: string) => s.replace(/ hs/gi, '').trim())
      .filter(Boolean);
    if (parsed.length > 0) {
      schedules = parsed;
    }
    rawDesc = rawDesc.replace(/\[SCHEDULES:.*?\]/g, '').trim();
  } else if (d?.schedules_summary && Array.isArray(d.schedules_summary) && d.schedules_summary.length > 0) {
    schedules = d.schedules_summary.map((s: string) => s.replace(/ hs/gi, '').trim());
  }

  return {
    cleanDescription: rawDesc,
    coach_name: coach,
    selectedSchedules: schedules,
    schedules_summary: schedules.map((s: string) => `${s} hs`),
    price_2x: p2x,
    price_3x: p3x,
    price_6x: p6x,
    price_single: pSingle,
  };
}

export function formatDisciplineDescription(
  cleanDescription: string,
  coachName: string,
  schedules: string[],
  prices?: { price_2x?: number; price_3x?: number; price_6x?: number; price_single?: number }
): string {
  const clean = (cleanDescription || '')
    .replace(/\[COACH:.*?\]/g, '')
    .replace(/\[SCHEDULES:.*?\]/g, '')
    .replace(/\[PRICES:.*?\]/g, '')
    .trim();

  const schedStr = (schedules || [])
    .map((s) => s.replace(/ hs/gi, '').trim())
    .filter(Boolean)
    .join(',');

  const parts = [];
  if (clean) parts.push(clean);
  if (coachName) parts.push(`[COACH:${coachName.trim()}]`);
  if (schedStr) parts.push(`[SCHEDULES:${schedStr}]`);
  if (prices) {
    parts.push(
      `[PRICES:2x=${prices.price_2x || 0},3x=${prices.price_3x || 0},6x=${prices.price_6x || 0},1x=${prices.price_single || 0}]`
    );
  }

  return parts.join(' ').trim();
}
