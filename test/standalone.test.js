import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

test('standalone root index contains the whole playable game for static hosts',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/<style>[\s\S]*<\/style>/);
  assert.match(html,/<script>[\s\S]*<\/script>/);
  assert.doesNotMatch(html,/<script[^>]+src=/);
  assert.doesNotMatch(html,/<link[^>]+rel="stylesheet"/);
  assert.match(html,/Aylina/);
  assert.match(html,/koala\(0,-160/);
  assert.match(html,/stars>0\)progress\.unlocked=Math\.max/);
  assert.match(html,/savedCampaign!==JSON\.stringify\(progress\)/);
  assert.match(html,/10 niveaux\. 3 boss/);
  assert.doesNotMatch(html,/5 niveaux\. Des bonbons/);
  assert.match(html,/id="boss-levels"/);
  assert.match(html,/id="boss-level-list"/);
  assert.match(html,/href="#boss-levels"/);
  assert.match(html,/index<5\?'level-list':'boss-level-list'/);
  assert.match(html,/ROI CITROUILLE/);
  assert.match(html,/REINE DES SPECTRES/);
  assert.match(html,/DR BROCOLI MUTANT/);
  const code=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(code);
  new Script(code,{filename:'index.html'});
});
