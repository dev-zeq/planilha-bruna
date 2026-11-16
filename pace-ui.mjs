// "Pace" tab: wires the calculators in index.html to the pure functions in pace.mjs.
// Nothing here talks to the network or stores anything.
import {escapeHTML as esc} from './core.mjs';
import {MILE_M, timesTable, equivalents, toSecPerKm, toMeters, lapsText, lapsFor, paceTable, splits, parseTime, formatTime, formatNumber, fixedNumber, DISTANCES, LAP_M} from './pace.mjs';

const $ = id => document.getElementById(id);
const MODES = {
 lap: {label: 'Tempo da volta de 400 m', placeholder: '1:32', inputmode: 'text'},
 km: {label: 'Pace por km', placeholder: '3:50', inputmode: 'text'},
 mile: {label: 'Pace por milha', placeholder: '6:10', inputmode: 'text'},
 kmh: {label: 'Velocidade (km/h)', placeholder: '15,6', inputmode: 'decimal'},
};
const VIEWS = ['calc', 'laps', 'table', 'splits'];

function card(title, value, unit = '', wide = false) {
 return `<div class="pace-stat${wide ? ' wide' : ''}"><dt>${esc(title)}</dt><dd>${esc(value)}${unit ? `<small>${esc(unit)}</small>` : ''}</dd></div>`;
}
function wrap(table) { return `<div class="table-wrap">${table}</div>`; }

function splitLabel(atM, everyM) {
 if (everyM === MILE_M) return formatNumber(atM / MILE_M, 2) + ' mi';
 if (everyM === 1000) return formatNumber(atM / 1000, 3) + ' km';
 return formatNumber(atM, 0) + ' m';
}

export function setupPace() {
 const showView = name => {
  for (const v of VIEWS) $('paceView-' + v).hidden = v !== name;
  for (const b of $('paceViews').querySelectorAll('button')) {
   const on = b.dataset.paceView === name;
   b.classList.toggle('active', on);
   b.setAttribute('aria-pressed', String(on));
  }
 };
 // Each view clears its own result when the input is incomplete, and shows the error
 // only after the field loses focus, so typing "1:" does not flash a warning.
 const run = (render, errorEl, resultEl) => showError => {
  try {
   errorEl.textContent = '';
   render();
  } catch (e) {
   resultEl.innerHTML = '';
   if (showError) errorEl.textContent = e.message;
  }
 };

 // --- Ritmo ---------------------------------------------------------------
 const calc = run(() => {
  const text = $('paceInput').value.trim();
  if (!text) { $('paceResult').innerHTML = ''; return; }
  const e = equivalents(toSecPerKm($('paceMode').value, text));
  const rows = timesTable(e.secPerKm).map(r =>
   `<tr><th scope="row">${esc(r.label)}</th><td>${esc(formatNumber(r.laps, 2))}</td><td>${esc(formatTime(r.seconds, r.decimals))}</td></tr>`).join('');
  $('paceResult').innerHTML =
   `<dl class="pace-grid">${card('Pace por km', formatTime(e.secPerKm), '/km')}${card('Pace por milha', formatTime(e.secPerMile), '/mi')}`
   + `${card('Volta de 400 m', formatTime(e.lap400, 1))}${card('Volta de 200 m', formatTime(e.lap200, 1))}`
   + `${card('Velocidade', fixedNumber(e.kmh, 2), 'km/h')}${card('Velocidade', fixedNumber(e.mph, 2), 'mph')}</dl>`
   + `<h3 class="section-title">Tempo em cada distância</h3>`
   + wrap(`<table class="pace-table"><thead><tr><th>Distância</th><th>Voltas</th><th>Tempo</th></tr></thead><tbody>${rows}</tbody></table>`)
   + `<p class="hint">Tempos calculados com o ritmo exato digitado, em ritmo constante. As voltas são de 400 m.</p>`;
 }, $('paceError'), $('paceResult'));
 const setMode = () => {
  const m = MODES[$('paceMode').value];
  $('paceInputLabel').textContent = m.label;
  $('paceInput').placeholder = m.placeholder;
  $('paceInput').inputMode = m.inputmode;
 };
 $('paceMode').onchange = () => { setMode(); calc(true); };
 $('paceInput').oninput = () => calc(false);
 $('paceInput').onchange = () => calc(true);

 // --- Voltas --------------------------------------------------------------
 const lapsRows = DISTANCES.map(d =>
  `<tr><th scope="row">${esc(d.label)}</th><td>${esc(formatNumber(d.m / LAP_M, 2))}</td><td>${esc(lapsText(d.m))}</td></tr>`).join('');
 $('lapsTable').innerHTML = wrap(`<table class="pace-table"><thead><tr><th>Distância</th><th>Voltas</th><th>Em voltas inteiras</th></tr></thead><tbody>${lapsRows}</tbody></table>`);
 const laps = run(() => {
  const text = $('lapsInput').value.trim();
  if (!text) { $('lapsResult').innerHTML = ''; return; }
  const m = toMeters(text, $('lapsUnit').value);
  $('lapsResult').innerHTML = `<dl class="pace-grid">${card('Voltas de 400 m', formatNumber(lapsFor(m).exact, 2), '', true)}${card('Em voltas inteiras', lapsText(m), '', true)}</dl>`
   + `<p class="hint">${esc(formatNumber(m, 1))} m no total.</p>`;
 }, $('lapsError'), $('lapsResult'));
 $('lapsInput').oninput = () => laps(false);
 $('lapsInput').onchange = () => laps(true);
 $('lapsUnit').onchange = () => laps(true);

 // --- Tabela --------------------------------------------------------------
 const table = run(() => {
  const rows = paceTable(parseTime($('tblFrom').value), parseTime($('tblTo').value), Number($('tblStep').value));
  $('tblResult').innerHTML = wrap(`<table class="pace-table"><thead><tr><th>Pace/km</th><th>400 m</th><th>Pace/mi</th><th>km/h</th><th>5 km</th><th>10 km</th></tr></thead><tbody>`
   + rows.map(r => `<tr><th scope="row"><button type="button" class="pace-pick" data-pace-km="${esc(r.secPerKm)}" aria-label="Usar pace ${esc(formatTime(r.secPerKm))} por km na calculadora">${esc(formatTime(r.secPerKm))}</button></th>`
    + `<td>${esc(formatTime(r.lap400, 1))}</td><td>${esc(formatTime(r.secPerMile))}</td><td>${esc(fixedNumber(r.kmh, 1))}</td><td>${esc(formatTime(r.t5k))}</td><td>${esc(formatTime(r.t10k))}</td></tr>`).join('')
   + `</tbody></table>`);
 }, $('tblError'), $('tblResult'));
 for (const id of ['tblFrom', 'tblTo']) { $(id).oninput = () => table(false); $(id).onchange = () => table(true); }
 $('tblStep').onchange = () => table(true);
 $('tblResult').onclick = e => {
  const b = e.target.closest('[data-pace-km]');
  if (!b) return;
  $('paceMode').value = 'km';
  setMode();
  $('paceInput').value = formatTime(Number(b.dataset.paceKm));
  showView('calc');
  calc(true);
  $('paceInput').scrollIntoView({block: 'center'});
 };

 // --- Parciais ------------------------------------------------------------
 const split = run(() => {
  const dist = $('spDist').value.trim(), time = $('spTime').value.trim();
  if (!dist || !time) { $('spResult').innerHTML = ''; return; }
  const every = Number($('spEvery').value);
  const s = splits(toMeters(dist, $('spUnit').value), parseTime(time), every);
  const e = equivalents(s.secPerKm), dec = every <= 400 ? 1 : 0;
  $('spResult').innerHTML =
   `<dl class="pace-grid">${card('Pace médio', formatTime(e.secPerKm), '/km')}${card('Pace por milha', formatTime(e.secPerMile), '/mi')}`
   + `${card('Volta de 400 m', formatTime(e.lap400, 1))}${card('Velocidade', fixedNumber(e.kmh, 2), 'km/h')}</dl>`
   + wrap(`<table class="pace-table"><thead><tr><th>Marca</th><th>Parcial</th><th>Acumulado</th></tr></thead><tbody>`
    + s.rows.map(r => `<tr><th scope="row">${esc(splitLabel(r.atM, every))}${r.partial ? ' <small>(final)</small>' : ''}</th>`
     + `<td>${esc(formatTime(r.splitSeconds, dec))}</td><td>${esc(formatTime(r.cumSeconds, dec))}</td></tr>`).join('')
    + `</tbody></table>`)
   + `<p class="hint">Ritmo constante do início ao fim. A última linha fecha exatamente no tempo digitado.</p>`;
 }, $('spError'), $('spResult'));
 for (const id of ['spDist', 'spTime']) { $(id).oninput = () => split(false); $(id).onchange = () => split(true); }
 for (const id of ['spUnit', 'spEvery']) $(id).onchange = () => split(true);

 $('paceViews').onclick = e => {
  const b = e.target.closest('[data-pace-view]');
  if (b) showView(b.dataset.paceView);
 };
 setMode();
 showView('calc');
 table(true);
}
