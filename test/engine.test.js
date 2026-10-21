import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,LEVELS,PLAYER_Z} from '../dist/engine.js';
import {freshProgress,readProgress,recordResult} from '../dist/levels.js';
import {viewMetrics,dragTarget} from '../dist/geometry.js';
const setup=()=>{const events=[];const game=new Game({random:()=>.5,onEvent:e=>events.push(e)});game.start();game.waveClock=999;return {game,events};};
const object=(type,x=0,z=PLAYER_Z-.001)=>({id:1,type,x,z,seed:0});
const run=(game,seconds,input={})=>{for(let i=0;i<Math.round(seconds*120);i++)game.step(1/120,input);};

test('steering stays on screen at both road boundaries',()=>{const {game}=setup();run(game,2,{axis:1});assert.equal(game.x,game.maxX);run(game,2,{axis:-1});assert.equal(game.x,-game.maxX);});
test('steering is progressive, reverses quickly and stops with little drift',()=>{const {game}=setup();game.step(1/120,{axis:1});assert.ok(game.vx>0&&game.vx<1);run(game,.25,{axis:1});const before=game.x;run(game,.3);assert.ok(game.x-before<.1);run(game,.2,{axis:-1});assert.ok(game.vx<-2);});
test('30, 60 and 120 fps give the same steering position',()=>{const positions=[30,60,120].map(fps=>{const {game}=setup();for(let i=0;i<fps*.4;i++)game.step(1/fps,{axis:1});return game.x;});assert.ok(Math.max(...positions)-Math.min(...positions)<1e-8);});
test('turbo does not weaken steering',()=>{const a=setup().game,b=setup().game;run(a,.3,{axis:1});run(b,.3,{axis:1,boost:true});assert.equal(a.x,b.x);assert.ok(b.speed>a.speed);});
test('relative finger drag starts without a jump and reaches its target',()=>{const {game}=setup(),m=viewMetrics(375,590);assert.equal(dragTarget(.3,80,80,m.playerUnit,m.maxX),.3);assert.equal(dragTarget(0,0,999,m.playerUnit,m.maxX),m.maxX);run(game,1,{targetX:-.4});assert.ok(Math.abs(game.x+.4)<.005);});
test('a candy is collected exactly once',()=>{const {game,events}=setup();game.objects=[object('candy')];game.step(.05);assert.equal(game.candies,1);assert.equal(game.lives,3);game.step(.05);assert.equal(game.candies,1);assert.equal(events.filter(e=>e.type==='candy').length,1);});
test('collisions occur at the displayed player depth',()=>{const {game}=setup();game.objects=[object('pumpkin',0,PLAYER_Z-.03)];game.step(.05);assert.equal(game.lives,3);game.step(.2);assert.equal(game.lives,2);});
test('dodged candy is not collected',()=>{const {game}=setup();game.x=-.66;game.objects=[object('candy',.66)];game.step(.05);assert.equal(game.candies,0);});
test('a crash costs one life with temporary invulnerability',()=>{const {game}=setup();game.objects=[object('pumpkin'),object('ghost')];game.step(.05);assert.equal(game.lives,2);assert.equal(game.hitCount,1);assert.ok(game.invulnerable>1);});
test('the last crash finishes exactly once',()=>{const {game,events}=setup();game.lives=1;game.objects=[object('pumpkin')];game.step(.05);run(game,1);assert.equal(game.mode,'over');assert.equal(game.won,false);assert.equal(events.filter(e=>e.type==='finish').length,1);});
test('horn affects nearby ghosts only and enforces cooldown',()=>{const {game}=setup();game.objects=[object('ghost',0,.6),object('ghost',.66,.2),object('pumpkin',-.66,.6)];assert.equal(game.honk(),true);assert.equal(game.objects[0].fleeing,true);assert.ok(!game.objects[1].fleeing);assert.ok(!game.objects[2].fleeing);assert.equal(game.honk(),false);run(game,4);assert.equal(game.honk(),true);});
test('a fleeing ghost cannot cause damage',()=>{const {game}=setup();game.objects=[object('ghost')];game.honk();game.step(.05);assert.equal(game.lives,3);});
test('empty turbo waits for sufficient recharge before restarting',()=>{const {game}=setup();game.fuel=1;game.step(.05,{boost:true});assert.equal(game.boostLocked,true);run(game,1,{boost:true});assert.equal(game.boostLocked,true);assert.equal(game.boosting,false);run(game,1,{boost:true});assert.equal(game.boostLocked,false);assert.equal(game.boosting,true);});
test('brake takes priority over turbo without consuming fuel',()=>{const {game}=setup();const speed=game.speed;game.step(.05,{brake:true,boost:true});assert.ok(game.speed<speed);assert.equal(game.braking,true);assert.equal(game.boosting,false);assert.equal(game.fuel,100);});
test('shield absorbs exactly one impact',()=>{const {game}=setup();game.objects=[object('shield')];game.step(.05);assert.equal(game.shield,1);game.objects=[object('pumpkin')];game.step(.05);assert.equal(game.shield,0);assert.equal(game.lives,3);run(game,1.1);game.objects=[object('broccoli')];game.step(.05);assert.equal(game.lives,2);});
test('magnet attracts nearby candies and expires',()=>{const {game}=setup();game.objects=[object('magnet')];game.step(.05);assert.ok(game.magnet>7.9);game.objects=[object('candy',.65,.62)];run(game,1.3);assert.equal(game.candies,1);run(game,7);assert.equal(game.magnet,0);});
test('pause freezes time, motion and effects',()=>{const {game}=setup();game.magnet=8;run(game,.2,{axis:1});game.pause();const before=[game.elapsed,game.x,game.fuel,game.magnet];run(game,1,{axis:1,boost:true});assert.deepEqual([game.elapsed,game.x,game.fuel,game.magnet],before);assert.equal(game.vx,0);game.resume();game.step(.05);assert.ok(game.elapsed>before[0]);});
test('ten levels have distinct environments and complete their own objectives',()=>{assert.equal(LEVELS.length,10);assert.equal(new Set(LEVELS.map(l=>l.scene)).size,10);for(const [levelIndex,level]of LEVELS.entries()){const {game}=setup();game.configure({levelIndex});game.reset();game.start();game.waveClock=999;assert.equal(game.stage,level.scene);game.candies=level.goal;if(game.boss)game.boss.defeated=true;game.elapsed=level.duration-.01;game.step(.05);assert.equal(game.won,true);assert.equal(game.elapsed,level.duration);game.reset();assert.equal(game.candies,0);assert.equal(game.lives,3);}});
test('meeting the candy target still requires surviving until the finish',()=>{const {game}=setup();game.candies=game.goal;game.elapsed=game.duration-1;game.step(.05);assert.equal(game.mode,'playing');});
test('the time limit with insufficient candy loses',()=>{const {game,events}=setup();game.candies=game.goal-1;game.elapsed=game.duration-.01;game.step(.05);assert.equal(game.won,false);assert.equal(events.at(-1).reason,'candies');});
test('Balade gives five lives and a slower pace',()=>{const a=setup().game,b=setup().game;b.configure({difficulty:'balade'});b.reset();b.start();a.step(.05);b.step(.05);assert.equal(b.lives,5);assert.ok(b.speed<a.speed);});
test('long rendering frames preserve elapsed time and collision detection',()=>{const {game}=setup();game.objects=[object('pumpkin',0,PLAYER_Z-.02)];game.step(.25);assert.ok(Math.abs(game.elapsed-.25)<1e-9);assert.equal(game.lives,2);});
test('car bounds and collision radius match mobile and desktop geometry',()=>{for(const [w,h]of[[320,440],[375,590],[768,590],[1280,709]]){const m=viewMetrics(w,h);assert.ok(m.maxX*m.playerUnit+70*m.carScale<=w/2-10);const visible=52*m.carScale+26*m.objectScale*PLAYER_Z;assert.ok(m.hitRadius*m.playerUnit>=visible*.8);assert.ok(m.hitRadius*m.playerUnit<=visible);}});
test('only wins unlock the next level; records are separate and never decrease',()=>{const p=freshProgress(),result={levelIndex:0,difficulty:'arcade',score:100,won:false,lives:0,maxLives:3};recordResult(p,result);assert.equal(p.unlocked,1);let r=recordResult(p,{...result,won:true,score:1000,lives:3});assert.equal(p.unlocked,2);assert.equal(r.earnedStars,3);r=recordResult(p,{...result,won:true,score:500,lives:1});assert.equal(r.best,1000);assert.equal(r.stars,3);assert.equal(r.earnedStars,1);recordResult(p,{...result,difficulty:'balade',score:2000});assert.equal(p.results['arcade:1'].best,1000);assert.equal(p.results['balade:1'].best,2000);assert.deepEqual(readProgress(JSON.stringify(p)),p);});
test('invalid saved progress falls back safely and clamps values',()=>{for(const value of['broken','null','[]'])assert.deepEqual(readProgress(value),freshProgress());const p=readProgress('{"unlocked":99,"results":{"arcade:1":{"best":-40,"stars":20}}}');assert.equal(p.unlocked,5);assert.deepEqual(p.results['arcade:1'],{best:0,stars:3});});
test('all campaign levels have reachable candy paths in both modes, over 120 runs',()=>{
  for(const difficulty of ['balade','arcade'])for(const [levelIndex,level]of LEVELS.entries()){
    let wins=0;
    for(let seed=1;seed<=12;seed++){
      let state=seed;const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};const game=new Game({random});game.configure({...viewMetrics(375,590),difficulty,levelIndex});game.reset();game.start();
      for(let i=0;i<8000&&game.mode==='playing';i++){
        const candy=game.objects.filter(o=>o.type==='candy'&&!o.done&&o.z>0).sort((a,b)=>b.z-a.z)[0];
        const rune=game.boss?.active&&!game.boss.defeated?game.objects.filter(o=>o.type==='rune'&&!o.done&&o.z>0).sort((a,b)=>b.z-a.z)[0]:null;
        const target=rune||candy;
        if(game.objects.some(o=>o.type==='ghost'&&!o.fleeing&&o.z>.70&&Math.abs(o.x-game.x)<.4))game.honk();
        game.step(1/120,{targetX:target?.x});assert.ok(Number.isFinite(game.score));assert.ok(game.objects.length<35);
      }
      if(game.won)wins++;
    }
    assert.ok(wins>=10,`${difficulty} / ${level.name}: only ${wins}/12 successful routes`);console.log(`${difficulty} / ${level.name}: ${wins}/12`);
  }
});


test('boss stages require defeating their boss as well as the candy goal',()=>{
  const bosses=LEVELS.filter(l=>l.boss);assert.equal(bosses.length,3);
  for(const level of bosses){
    const {game,events}=setup();game.configure({levelIndex:level.id-1});game.reset();game.start();
    game.elapsed=level.duration*.62-.001;game.waveClock=999;game.step(.015);
    assert.equal(game.boss.active,true);assert.ok(events.some(e=>e.type==='bossStart'));
    game.objects=[];game.waveClock=999;game.boss.runeClock=999;game.boss.attackClock=999;
    for(let i=0;i<level.boss.hp;i++){
      game.objects=[object('rune',game.x,PLAYER_Z-.001)];game.step(.03);
      assert.equal(game.boss.hp,level.boss.hp-i-1);
    }
    assert.equal(game.boss.defeated,true);
    assert.equal(events.filter(e=>e.type==='bossDefeated').length,1);
    game.candies=level.goal;game.elapsed=game.duration-.01;game.step(.05);
    assert.equal(game.won,true);
  }
});

test('boss with remaining HP prevents victory at timeout, and boss projectile consumes shield',()=>{
  const {game}=setup();game.configure({levelIndex:5});game.reset();game.start();
  game.boss.active=true;game.boss.runeClock=999;game.boss.attackClock=999;game.waveClock=999;
  game.shield=1;game.objects=[object('bossBolt')];game.step(.02);
  assert.equal(game.shield,0);assert.equal(game.lives,game.maxLives);
  game.objects=[];game.candies=game.goal;game.elapsed=game.duration-.01;game.step(.05);
  assert.equal(game.won,false);assert.equal(game.mode,'over');
});

test('saved five-level campaign progress remains valid with expanded levels',()=>{
  const old=readProgress(JSON.stringify({unlocked:5,results:{'arcade:5':{best:2500,stars:3}}}));
  assert.equal(old.unlocked,5);assert.deepEqual(old.results['arcade:5'],{best:2500,stars:3});
  recordResult(old,{levelIndex:4,difficulty:'arcade',score:2600,won:true,lives:3,maxLives:3});
  assert.equal(old.unlocked,6);
});
