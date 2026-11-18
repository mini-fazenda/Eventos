import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const event = load('../event.json');
const library = load('../rewards-library.json');

test('passe publicado tem dez metas crescentes e trilhas válidas', () => {
 assert.equal(event.id, 'natal-2026');
 assert.equal(event.pass.thresholds.length, 10);
 assert.ok(event.pass.thresholds.every((n, i, a) => Number.isInteger(n) && n >= 1 && n <= 5000 && (!i || n > a[i-1])));
 assert.equal(event.pass.rewards.free.length, 10);
 assert.equal(event.pass.rewards.premium.length, 10);
});

test('IDs do passe existem na biblioteca, sem repetição, e a atribuição acompanha a meta', () => {
 const ids = new Set(library.rewards.map(item => item.id));
 const assigned = new Set();
 for (const track of ['free', 'premium']) {
   for (const [index, id] of event.pass.rewards[track].entries()) {
     if (id === null) continue;
     assert.ok(ids.has(id), id);
     assert.ok(!assigned.has(id), 'ID repetido: ' + id);
     assigned.add(id);
     const item = library.rewards.find(r => r.id === id);
     assert.equal(item.assigned, true, id);
     assert.equal(item.track, track, id);
     assert.equal(item.level, index+1, id);
     assert.equal(item.requiredStars, event.pass.thresholds[index], id);
   }
 }
 for (const item of library.rewards) assert.equal(item.assigned, assigned.has(item.id), item.id);
});
