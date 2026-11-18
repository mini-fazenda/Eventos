import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const event=JSON.parse(readFileSync(new URL('../event.json',import.meta.url),'utf8'));
test('somente nivel 1 exige 4 estrelas; progresso dos demais niveis preservado',()=>{
 assert.equal(event.id,'natal-2026');
 assert.deepEqual(event.pass.thresholds,[4,360,540,720,900,1080,1260,1440,1620,1800]);
 assert.deepEqual(event.pass.rewards.free,['natal-2026-roupas-nivel-1',...Array(9).fill(null)]);
 assert.deepEqual(event.pass.rewards.premium,Array(10).fill(null));
});
