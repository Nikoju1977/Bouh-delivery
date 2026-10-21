import {LEVELS,MODES} from './levels.js';
export {LEVELS,MODES};
export const GOAL=LEVELS[0].goal,DURATION=LEVELS[0].duration,PLAYER_Z=0.88,LANES=[-0.66,0,0.66];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class Game {
  constructor({random=Math.random,onEvent=()=>{}}={}){this.random=random;this.onEvent=onEvent;this.difficulty='arcade';this.sensitivity=1;this.levelIndex=0;this.maxX=1.08;this.hitRadius=0.23;this.reset();this.mode='menu';}
  get level(){return LEVELS[this.levelIndex];} get goal(){return this.level.goal;} get duration(){return this.level.duration;}
  configure({difficulty,sensitivity,maxX,hitRadius,levelIndex}={}){if(MODES[difficulty])this.difficulty=difficulty;if(Number.isInteger(levelIndex))this.levelIndex=clamp(levelIndex,0,LEVELS.length-1);if(Number.isFinite(sensitivity))this.sensitivity=clamp(sensitivity,0.65,1.4);if(Number.isFinite(maxX))this.maxX=clamp(maxX,0.75,1.08);if(Number.isFinite(hitRadius))this.hitRadius=clamp(hitRadius,0.1,0.38);this.x=clamp(this.x||0,-this.maxX,this.maxX);}
  reset(){this.elapsed=0;this.distance=0;this.x=0;this.steer=0;this.vx=0;this.candies=0;this.lives=MODES[this.difficulty].lives;this.maxLives=this.lives;this.score=0;this.combo=0;this.bestCombo=0;this.comboClock=0;this.fuel=100;this.boosting=false;this.boostLocked=false;this.braking=false;this.slow=0;this.invulnerable=0;this.honkCooldown=0;this.honkWave=0;this.shield=0;this.magnet=0;this.nextPowerup=6;this.powerupCount=0;this.objects=[];this.waveClock=0.4;this.stage=this.level.scene;this.lastCandyLane=1;this.hitCount=0;this.ghostsScared=0;this.nearMisses=0;this.id=0;this.speed=Math.round(88*this.level.pace*MODES[this.difficulty].pace);this.mode='ready';this.won=false;this.boss=this.level.boss?{...this.level.boss,hp:this.level.boss.hp,active:false,defeated:false,runeClock:0,attackClock:1.6,shots:0,attacks:0}:null;}
  start(){this.mode='playing';} pause(){if(this.mode==='playing'){this.mode='paused';this.boosting=false;this.braking=false;this.vx=0;this.steer=0;}} resume(){if(this.mode==='paused')this.mode='playing';} emit(type,detail={}){this.onEvent({type,...detail});}
  spawnWave(){
    const choices=[0,1,2].filter(lane=>Math.abs(lane-this.lastCandyLane)<=1),candyLane=choices[Math.floor(this.random()*choices.length)];this.lastCandyLane=candyLane;const obstacleLane=(candyLane+1+Math.floor(this.random()*2))%3;
    for(let n=0;n<2;n++)this.objects.push({id:++this.id,type:'candy',x:LANES[candyLane],z:-n*0.085,seed:this.random()*20});
    if(this.elapsed>4){const type=this.random()<this.level.ghostChance?'ghost':this.stage===4?'broccoli':'pumpkin';this.objects.push({id:++this.id,type,x:LANES[obstacleLane],z:-0.04,seed:this.random()*20,fleeing:false});}
    if(this.elapsed>=this.nextPowerup){this.objects.push({id:++this.id,type:this.powerupCount%2===0?'shield':'magnet',x:LANES[candyLane],z:-0.22,seed:0});this.powerupCount++;this.nextPowerup+=10;}
  }
  honk(){if(this.mode!=='playing'||this.honkCooldown>0)return false;this.honkCooldown=3.5;this.honkWave=0.65;let count=0;for(const o of this.objects)if(o.type==='ghost'&&o.z>0.38&&!o.fleeing&&!o.done){o.fleeing=true;o.fleeDir=o.x>=this.x?1:-1;count++;this.ghostsScared++;this.score+=75;}this.emit('honk',{count});return true;}
  finish(won,reason){if(this.mode==='over')return;this.mode='over';this.won=won;this.boosting=false;this.braking=false;this.vx=0;if(won)this.score+=this.lives*500;this.emit('finish',{won,reason});}
  move(dt,input){
    const maxSpeed=2.2*this.sensitivity,axis=clamp(Number.isFinite(input.axis)?input.axis:0,-1,1),targetX=Number.isFinite(input.targetX)?clamp(input.targetX,-this.maxX,this.maxX):null;
    const targetVelocity=targetX!==null?clamp((targetX-this.x)*12,-maxSpeed,maxSpeed):axis*maxSpeed,response=Math.abs(targetVelocity)<0.01?24:targetVelocity*this.vx<0?26:18,decay=Math.exp(-response*dt),oldVelocity=this.vx,before=this.x;
    // Exact integration makes steering independent of the rendering frame rate.
    this.vx=targetVelocity+(oldVelocity-targetVelocity)*decay;this.x+=targetVelocity*dt+(oldVelocity-targetVelocity)*(1-decay)/response;
    if(targetX!==null&&(targetX-before)*(targetX-this.x)<=0){this.x=targetX;this.vx=0;}const limited=clamp(this.x,-this.maxX,this.maxX);if(limited!==this.x)this.vx=0;this.x=limited;this.steer+=(this.vx/maxSpeed-this.steer)*(1-Math.exp(-18*dt));
  }
  step(dt,input={}){if(this.mode!=='playing'||!Number.isFinite(dt)||dt<=0)return;let remaining=Math.min(dt,0.25);while(remaining>1e-9&&this.mode==='playing'){const slice=Math.min(remaining,1/120);this.advance(slice,input);remaining-=slice;}}
  advance(dt,input){
    this.elapsed=Math.min(this.duration,this.elapsed+dt);for(const key of ['invulnerable','slow','honkCooldown','honkWave','magnet','comboClock'])this[key]=Math.max(0,this[key]-dt);if(this.comboClock===0)this.combo=0;
    this.move(dt,input);this.braking=!!input.brake;if(this.fuel>=25)this.boostLocked=false;this.boosting=!!input.boost&&!this.braking&&!this.boostLocked&&this.fuel>0&&this.slow<=0;this.fuel=clamp(this.fuel+dt*(this.boosting?-32:14),0,100);if(this.fuel===0){this.boostLocked=true;this.boosting=false;}
    const multiplier=(this.boosting?1.6:this.braking?0.66:1)*(Math.abs(this.x)>0.98?0.76:1)*(this.slow>0?0.55:1)*MODES[this.difficulty].pace*this.level.pace;this.speed=Math.round(88*multiplier);const velocity=0.265*multiplier;this.distance+=velocity*dt;this.score+=dt*(this.boosting?20:10);this.waveClock-=dt*multiplier;if(this.waveClock<=0){this.spawnWave();this.waveClock+=this.level.wave;}
    // Bosses appear in the final 38% of their missions. Every weak point is a
    // visible rune pickup; hazards use the same fair collision rules as traffic.
    if(this.boss&&!this.boss.active&&this.elapsed>=this.duration*.62){
      this.boss.active=true;this.emit('bossStart',{name:this.boss.name});
    }
    if(this.boss?.active&&!this.boss.defeated){
      this.boss.runeClock-=dt;
      if(this.boss.runeClock<=0){
        const lane=this.boss.shots%3;
        this.objects.push({id:++this.id,type:'rune',x:LANES[lane],z:.11,seed:this.random()*20});
        this.boss.shots++;this.boss.runeClock+=2.8;
      }
      this.boss.attackClock-=dt;
      if(this.boss.attackClock<=0){
        const lane=(this.boss.attacks+2)%3;
        this.objects.push({id:++this.id,type:'bossBolt',x:LANES[lane],z:0,seed:this.random()*20});
        this.boss.attacks++;this.boss.attackClock+=3.6;
        this.emit('bossAttack',{name:this.boss.name});
      }
    }
    for(const o of this.objects){
      const before=o.z;o.z+=dt*velocity;if(o.fleeing)o.x+=o.fleeDir*dt*2.5;if(this.magnet>0&&o.type==='candy'&&!o.done&&o.z>0.58&&Math.abs(o.x-this.x)<0.85)o.x+=(this.x-o.x)*(1-Math.exp(-9*dt));
      if(before<PLAYER_Z&&o.z>=PLAYER_Z&&!o.done){o.done=true;const gap=Math.abs(o.x-this.x),collectible=['candy','shield','magnet','rune'].includes(o.type),collision=gap<(collectible?Math.max(0.3,this.hitRadius):this.hitRadius);
        if(collision&&!o.fleeing){
          if(o.type==='candy'){this.candies++;this.combo++;this.comboClock=4;this.bestCombo=Math.max(this.bestCombo,this.combo);this.score+=100+Math.min(5,Math.floor(this.combo/4))*25;this.fuel=Math.min(100,this.fuel+4);o.collected=true;this.emit('candy',{x:this.x,combo:this.combo,goal:this.candies===this.goal});}
          else if(o.type==='rune'){
            o.collected=true;
            if(this.boss?.active&&!this.boss.defeated){
              this.boss.hp=Math.max(0,this.boss.hp-1);this.score+=350;
              this.emit('bossHit',{name:this.boss.name,hp:this.boss.hp,maxHp:this.boss.kind==='ghost'?3:this.level.boss.hp});
              if(this.boss.hp===0){
                this.boss.defeated=true;this.score+=1500;
                for(const hazard of this.objects)if(hazard.type==='bossBolt')hazard.collected=true;
                this.emit('bossDefeated',{name:this.boss.name});
              }
            }
          }
          else if(collectible){if(o.type==='shield')this.shield=1;else this.magnet=8;o.collected=true;this.score+=100;this.emit('powerup',{powerup:o.type});}
          else if(this.invulnerable<=0){o.collected=true;if(this.shield){this.shield=0;this.invulnerable=1;this.emit('shield');}else{this.lives--;this.hitCount++;this.combo=0;this.invulnerable=1.8;this.slow=0.6;this.emit('hit',{obstacle:o.type});if(this.lives<=0){this.finish(false,'lives');return;}}}
        }else if(!collectible&&!o.fleeing&&gap<this.hitRadius+0.12&&this.invulnerable<=0){this.nearMisses++;this.score+=50;this.emit('nearMiss');}
      }
    }
    this.objects=this.objects.filter(o=>o.z<1.25&&!o.collected&&Math.abs(o.x)<3.5);if(this.elapsed>=this.duration){
      const candyOK=this.candies>=this.goal,bossOK=!this.boss||this.boss.defeated;
      this.finish(candyOK&&bossOK,!candyOK?'candies':!bossOK?'boss':'delivered');
    }
  }
}
