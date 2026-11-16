import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseTime,parseNumber,formatTime,formatNumber,fixedNumber,toSecPerKm,equivalents,lapsFor,lapsText,toMeters,timesTable,paceTable,splits,DISTANCES} from '../pace.mjs';
const close=(a,b,eps=0.01)=>assert.ok(Math.abs(a-b)<=eps,`${a} != ${b}`);

test('parseTime accepts seconds, m:ss, decimals with dot or comma, and h:mm:ss',()=>{
 assert.equal(parseTime('92'),92);assert.equal(parseTime('1:32'),92);assert.equal(parseTime(' 1:32.5 '),92.5);
 assert.equal(parseTime('1:32,5'),92.5);assert.equal(parseTime('1:20:55'),4855);assert.equal(parseTime('3:50'),230);
});
test('parseTime rejects malformed or impossible times with a message',()=>{
 for(const bad of ['','abc','1:92','0:92','1:2:3:4','-1','1:60:00','0','0:00','1::2','1.5:30','1:30:'])assert.throws(()=>parseTime(bad),/Informe|inválido|segundos|minutos/,JSON.stringify(bad));
});
test('parseNumber accepts comma decimals and rejects zero, negatives and text',()=>{
 assert.equal(parseNumber('12,5'),12.5);assert.equal(parseNumber('18'),18);
 for(const bad of ['','0','-3','1e3','abc','1,2,3'])assert.throws(()=>parseNumber(bad),/Informe/,JSON.stringify(bad));
});
test('formatTime rounds before splitting and never prints 60 seconds',()=>{
 assert.equal(formatTime(92,1),'1:32.0');assert.equal(formatTime(230),'3:50');assert.equal(formatTime(59.96,1),'1:00.0');
 assert.equal(formatTime(4855),'1:20:55');assert.equal(formatTime(3599.6),'1:00:00');assert.equal(formatTime(45.3,1),'0:45.3');
});
test('formatNumber uses Brazilian separators and trims zeros',()=>{
 assert.equal(formatNumber(1234.5,2),'1.234,5');assert.equal(formatNumber(2.5),'2,5');assert.equal(formatNumber(9.344,1),'9,3');assert.equal(formatNumber(4.02336,2),'4,02');assert.equal(formatNumber(25,2),'25');
});
test('fixedNumber keeps trailing zeros so a column of speeds lines up',()=>{
 assert.equal(fixedNumber(16,1),'16,0');assert.equal(fixedNumber(15.652,2),'15,65');assert.equal(fixedNumber(9.7258,2),'9,73');
});
test('a 1:32 lap of 400 m is 3:50/km, 6:10/mile and 15.65 km/h',()=>{
 const p=toSecPerKm('lap','1:32');assert.equal(p,230);
 const e=equivalents(p);close(e.lap400,92);close(e.lap200,46);close(e.secPerMile,370.149,0.001);close(e.kmh,15.652,0.001);close(e.mph,9.726,0.001);
 assert.equal(formatTime(e.secPerMile),'6:10');
});
test('every input mode lands on the same pace',()=>{
 assert.equal(toSecPerKm('km','3:50'),230);close(toSecPerKm("mile","6:10.15"),230,0.01);assert.equal(toSecPerKm('kmh','18'),200);
});
test('pace outside the possible range is refused',()=>{
 assert.throws(()=>toSecPerKm('lap','0:30'),/intervalo/);assert.throws(()=>toSecPerKm('km','45:00'),/intervalo/);assert.throws(()=>toSecPerKm('kmh','0'),/Informe/);assert.throws(()=>toSecPerKm('x','1'),/Modo/);
});
test('laps: 1 km is 2.5 laps, a mile is 4 laps + 9.3 m, round distances have no remainder',()=>{
 assert.equal(lapsFor(1000).exact,2.5);assert.deepEqual([lapsFor(1000).laps,lapsFor(1000).remainderM],[2,200]);
 assert.equal(lapsText(1609.344),'4 voltas + 9,3 m');assert.equal(lapsText(2000),'5 voltas');assert.equal(lapsText(400),'1 volta');
 assert.equal(lapsText(10000),'25 voltas');assert.equal(lapsText(21097.5),'52 voltas + 298 m');assert.equal(lapsText(42195),'105 voltas + 195 m');assert.equal(lapsText(150),'150 m');
 assert.equal(lapsText(3*1609.344),'12 voltas + 28 m');
});
test('toMeters converts km, miles and metres and limits the size',()=>{
 assert.equal(toMeters('5','km'),5000);assert.equal(toMeters('1','mile'),1609.344);assert.equal(toMeters('250','m'),250);assert.equal(toMeters('2,5','km'),2500);
 assert.throws(()=>toMeters('0','km'),/Informe/);assert.throws(()=>toMeters('300','km'),/200 km/);assert.throws(()=>toMeters('1','furlong'),/Unidade/);
});
test('times table at 3:50/km covers all distances with laps and sensible rounding',()=>{
 const t=timesTable(230);assert.equal(t.length,DISTANCES.length);
 const by=l=>t.find(r=>r.label===l);
 close(by('400 m').seconds,92);close(by('5 km').seconds,1150);close(by('10 km').seconds,2300);close(by("1 milha").seconds,370.149,0.001);
 assert.equal(formatTime(by('5 km').seconds,by('5 km').decimals),'19:10');assert.equal(formatTime(by('1.000 m').seconds,by('1.000 m').decimals),'3:50.0');
 close(by('1.000 m').laps,2.5);
});
test('pace table lists every step, in either argument order, and refuses bad ranges',()=>{
 const rows=paceTable(210,390,5);assert.equal(rows.length,37);assert.equal(rows[0].secPerKm,210);assert.equal(rows.at(-1).secPerKm,390);
 close(rows[0].lap400,84);close(rows[0].t5k,1050);assert.equal(paceTable(390,210,5).length,37);
 assert.throws(()=>paceTable(210,390,0),/passo/);assert.throws(()=>paceTable(100,1700,1),/longa/);assert.throws(()=>paceTable(30,390,5),/intervalo/);
});
test('splits: 10 km in 38:20 every 400 m is 25 laps of 1:32 and ends on the exact total',()=>{
 const s=splits(10000,2300,400);assert.equal(s.secPerKm,230);assert.equal(s.rows.length,25);
 assert.ok(s.rows.every(r=>Math.abs(r.splitSeconds-92)<1e-9&&!r.partial));assert.equal(s.rows.at(-1).cumSeconds,2300);assert.equal(s.rows[0].atM,400);
});
test('splits: a final partial row, miles, and a limit on the number of rows',()=>{
 const k=splits(5000,1150,1000);assert.equal(k.rows.length,5);assert.equal(k.rows[4].cumSeconds,1150);
 const m=splits(5000,1200,MILE);assert.equal(m.rows.length,4);assert.equal(m.rows[3].partial,true);assert.equal(m.rows[3].atM,5000);assert.equal(m.rows[3].cumSeconds,1200);
 close(m.rows[0].splitSeconds+m.rows[1].splitSeconds+m.rows[2].splitSeconds+m.rows[3].splitSeconds,1200,1e-6);
 assert.throws(()=>splits(200000,60000,400),/Muitas/);assert.throws(()=>splits(0,100,400),/Informe/);
});
const MILE=1609.344;
