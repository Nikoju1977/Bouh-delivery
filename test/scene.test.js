import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,LEVELS,PLAYER_Z} from '../dist/engine.js';
import {Scene} from '../dist/scene.js';

test('renderer keeps finite coordinates and balanced state in every environment and size',()=>{
  globalThis.window={devicePixelRatio:2,matchMedia:()=>({matches:false})};globalThis.ResizeObserver=class{observe(){}};
  for(const [width,height]of[[320,440],[375,590],[768,590],[1280,709]])for(let levelIndex=0;levelIndex<LEVELS.length;levelIndex++){
    let balance=0,drawCalls=0;
    const valid=(...args)=>{for(const v of args.flat())if(typeof v==='number')assert.ok(Number.isFinite(v));drawCalls++;};
    const gradient={addColorStop:valid};
    const ctx=new Proxy({save(){balance++;},restore(){balance--;assert.ok(balance>=0);},createLinearGradient(...args){valid(...args);return gradient;},createRadialGradient(...args){valid(...args);return gradient;}},{get:(target,key)=>key in target?target[key]:valid});
    const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width,height})};const game=new Game();game.configure({levelIndex});game.reset();game.mode='menu';const scene=new Scene(canvas,game);scene.frame(1/60);
    game.start();game.shield=1;game.magnet=8;game.braking=true;game.honkWave=.5;game.objects=['candy','pumpkin','ghost','broccoli','shield','magnet'].map((type,i)=>({type,x:0,z:i<3?.5+i*.1:PLAYER_Z+.02*(i-2),seed:0}));scene.frame(1/60);scene.event({type:'hit'});scene.event({type:'candy'});game.boosting=true;scene.frame(1/60);game.pause();scene.frame(1/60);assert.equal(balance,0);assert.ok(drawCalls>1000);
  }
});
