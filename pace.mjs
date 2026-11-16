// Pace and track calculator. Pure functions: no DOM, no network, nothing stored.
export const LAP_M = 400;
export const MILE_M = 1609.344;
export const KM_PER_MILE = MILE_M / 1000;
// Plausible running range, so a typo like 0:03 does not produce nonsense.
export const MIN_SEC_PER_KM = 90, MAX_SEC_PER_KM = 1800;

export const DISTANCES = [
 {label: '200 m', m: 200}, {label: '400 m', m: 400}, {label: '800 m', m: 800},
 {label: '1.000 m', m: 1000}, {label: '1.600 m', m: 1600}, {label: '1 milha', m: MILE_M},
 {label: '3 km', m: 3000}, {label: '5 km', m: 5000}, {label: '10 km', m: 10000},
 {label: '15 km', m: 15000}, {label: 'Meia maratona', m: 21097.5}, {label: 'Maratona', m: 42195},
];

export function parseNumber(text, what = 'valor') {
 const raw = String(text ?? '').trim().replace(',', '.');
 if (!/^\d+(\.\d+)?$/.test(raw)) throw Error(`Informe um ${what} válido, só com números (por exemplo 12,5).`);
 const n = Number(raw);
 if (!(n > 0) || n > 1e6) throw Error(`Informe um ${what} maior que zero.`);
 return n;
}

// "92", "1:32", "1:32.5", "1:32,5" and "1:20:55" -> seconds.
export function parseTime(text) {
 const raw = String(text ?? '').trim().replace(',', '.');
 if (!raw) throw Error('Informe o tempo (por exemplo 1:32 ou 1:32.5).');
 const parts = raw.split(':');
 const last = parts.length - 1;
 if (parts.length > 3 || parts.some((p, i) => !(i === last ? /^\d+(\.\d+)?$/ : /^\d+$/).test(p))) {
  throw Error('Tempo inválido. Use minutos:segundos, como 1:32 ou 3:50.');
 }
 const nums = parts.map(Number);
 if (parts.length > 1 && nums[last] >= 60) throw Error('Os segundos devem ser menores que 60 (use 1:32, não 0:92).');
 if (parts.length === 3 && nums[1] >= 60) throw Error('Os minutos devem ser menores que 60 quando há horas.');
 const seconds = nums.reduce((total, n) => total * 60 + n, 0);
 if (!(seconds > 0) || seconds > 360000) throw Error('Informe um tempo maior que zero.');
 return seconds;
}

// Typing aid for time fields: only the digits matter and the colons are inserted for you,
// counting from the right (132 -> 1:32, 3820 -> 38:20, 12055 -> 1:20:55). One or two digits stay
// as typed (seconds). A comma or dot starts the tenths (1:32,5). Pass final=true on leaving the
// field to drop a dangling separator.
export function maskTime(raw, final = false) {
 const [, head, sep, tail] = String(raw ?? '').match(/^([^.,]*)([.,]?)([\s\S]*)$/);
 const d = head.replace(/\D/g, '').slice(0, 6);
 if (!d) return '';
 let out = d;
 if (d.length > 2) {
  const rest = d.slice(0, -2), ss = d.slice(-2);
  out = rest.length <= 2 ? `${rest}:${ss}` : `${rest.slice(0, -2)}:${rest.slice(-2)}:${ss}`;
 }
 const dec = tail.replace(/\D/g, '').slice(0, 2);
 return sep && !(final && !dec) ? `${out}.${dec}` : out;
}

// Rounds first, then splits, so 59.96 s never prints as "0:60.0".
export function formatTime(seconds, decimals = 0) {
 const f = 10 ** decimals, units = Math.round(seconds * f);
 const whole = Math.floor(units / f), frac = units - whole * f;
 const h = Math.floor(whole / 3600), m = Math.floor(whole / 60) % 60, s = whole % 60;
 const ss = String(s).padStart(2, '0') + (decimals ? '.' + String(frac).padStart(decimals, '0') : '');
 return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// Brazilian number format: 1.234,5. Trailing zeros are dropped.
export function formatNumber(n, decimals = 2) {
 const [int, frac = ''] = n.toFixed(decimals).split('.');
 const trimmed = frac.replace(/0+$/, '');
 return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (trimmed ? ',' + trimmed : '');
}

// Fixed decimals with a comma (speeds read better as 16,0 than 16).
export function fixedNumber(n, decimals = 1) {
 return n.toFixed(decimals).replace('.', ',');
}

function checkPace(secPerKm) {
 if (!(secPerKm >= MIN_SEC_PER_KM && secPerKm <= MAX_SEC_PER_KM)) {
  throw Error('Valor fora do intervalo possível (pace entre 1:30 e 30:00 por km).');
 }
 return secPerKm;
}

// mode: 'lap' (time of one 400 m lap), 'km' (pace per km), 'mile' (pace per mile), 'kmh' (speed).
export function toSecPerKm(mode, text, lapM = LAP_M) {
 if (mode === 'lap') return checkPace(parseTime(text) * 1000 / lapM);
 if (mode === 'km') return checkPace(parseTime(text));
 if (mode === 'mile') return checkPace(parseTime(text) / KM_PER_MILE);
 if (mode === 'kmh') return checkPace(3600 / parseNumber(text, 'velocidade'));
 throw Error('Modo inválido.');
}

export function equivalents(secPerKm) {
 const kmh = 3600 / secPerKm;
 return {
  secPerKm, secPerMile: secPerKm * KM_PER_MILE, kmh, mph: kmh / KM_PER_MILE,
  lap400: secPerKm * 0.4, lap200: secPerKm * 0.2,
 };
}

export function lapsFor(distanceM, lapM = LAP_M) {
 const exact = distanceM / lapM;
 const laps = Math.floor(exact + 1e-9);
 let remainderM = distanceM - laps * lapM;
 if (remainderM < 1e-6) remainderM = 0;
 return {exact, laps, remainderM};
}

export function lapsText(distanceM, lapM = LAP_M) {
 const {laps, remainderM} = lapsFor(distanceM, lapM);
 const word = laps === 1 ? 'volta' : 'voltas';
 if (!remainderM) return `${laps} ${word}`;
 const rem = formatNumber(remainderM, remainderM < 10 ? 1 : 0);
 return laps ? `${laps} ${word} + ${rem} m` : `${rem} m`;
}

export function toMeters(value, unit) {
 const n = parseNumber(value, 'distância');
 const m = unit === 'km' ? n * 1000 : unit === 'mile' ? n * MILE_M : unit === 'm' ? n : NaN;
 if (!Number.isFinite(m)) throw Error('Unidade inválida.');
 if (m > 200000) throw Error('Use uma distância de até 200 km.');
 return m;
}

export function timesTable(secPerKm) {
 return DISTANCES.map(d => ({
  label: d.label, m: d.m, laps: d.m / LAP_M, seconds: secPerKm * d.m / 1000,
  decimals: d.m <= 1000 ? 1 : 0,
 }));
}

// Pace table, fastest to slowest, every `step` seconds per km.
export function paceTable(fromSec, toSec, step) {
 if (!(step >= 1 && step <= 60)) throw Error('O passo deve ficar entre 1 e 60 segundos.');
 const [a, b] = fromSec <= toSec ? [fromSec, toSec] : [toSec, fromSec];
 checkPace(a); checkPace(b);
 if ((b - a) / step > 200) throw Error('A tabela ficaria muito longa. Aumente o passo ou reduza a faixa.');
 const rows = [];
 for (let p = a; p <= b + 1e-9; p += step) {
  const e = equivalents(p);
  rows.push({secPerKm: p, secPerMile: e.secPerMile, kmh: e.kmh, lap400: e.lap400, t5k: p * 5, t10k: p * 10});
 }
 return rows;
}

// Even-pace splits for a race of distanceM in totalSec, one row every splitM metres.
export function splits(distanceM, totalSec, splitM) {
 if (!(distanceM > 0 && totalSec > 0 && splitM > 0)) throw Error('Informe distância, tempo e parcial.');
 if (Math.ceil(distanceM / splitM - 1e-9) > 300) throw Error('Muitas parciais. Escolha uma parcial maior ou uma distância menor.');
 const pace = totalSec / distanceM, rows = [];
 let at = 0;
 while (at < distanceM - 1e-6) {
  const next = Math.min(at + splitM, distanceM);
  rows.push({atM: next, splitSeconds: (next - at) * pace, cumSeconds: next * pace, partial: next - at < splitM - 1e-6});
  at = next;
 }
 // The sum of rounded values can drift; the last row is pinned to the exact total.
 rows[rows.length - 1].cumSeconds = totalSec;
 return {secPerKm: pace * 1000, rows};
}
