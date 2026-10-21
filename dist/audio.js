export class AudioEngine {
  constructor(enabled=true){this.enabled=enabled;this.ctx=null;this.nextNote=0;this.beat=0;}
  init(){
    if(!this.ctx){
      const Context=window.AudioContext||window.webkitAudioContext;
      if(!Context)return;
      try{
        this.ctx=new Context();this.master=this.ctx.createGain();this.master.gain.value=this.enabled?.5:0;this.master.connect(this.ctx.destination);
        this.engine=this.ctx.createOscillator();this.engine.type='sawtooth';this.engine.frequency.value=46;
        this.motor=this.ctx.createGain();this.motor.gain.value=0;
        const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=190;
        this.engine.connect(filter);filter.connect(this.motor);this.motor.connect(this.master);this.engine.start();
      }catch{this.ctx=null;return;}
    }
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
  }
  toggle(){this.enabled=!this.enabled;if(this.enabled)this.init();if(this.ctx)this.master.gain.setTargetAtTime(this.enabled?.5:0,this.ctx.currentTime,.08);return this.enabled;}
  tone(frequency,duration=.14,type='sine',volume=.08,delay=0,endFrequency){
    if(!this.ctx||!this.enabled||this.ctx.state!=='running')return;
    const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),gain=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(frequency,t);if(endFrequency)o.frequency.exponentialRampToValueAtTime(endFrequency,t+duration);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(gain);gain.connect(this.master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();gain.disconnect();};
  }
  effect(type){
    if(type==='candy'){this.tone(880,.12,'sine',.13);this.tone(1320,.19,'sine',.08,.065);}
    if(type==='hit'){this.tone(110,.35,'sawtooth',.09,0,28);this.tone(48,.25,'triangle',.2);}
    if(type==='honk'){this.tone(233,.26,'sawtooth',.07,0,185);this.tone(349,.28,'triangle',.16,0,277);this.tone(233,.14,'square',.025,.3,196);}
    if(type==='shoot'){this.tone(820,.10,'triangle',.065,0,360);this.tone(1220,.08,'sine',.04);}
    if(type==='targetHit'){this.tone(360,.12,'triangle',.07,0,740);this.tone(950,.17,'sine',.09,.035);}
    if(type==='count'){this.tone(523,.13,'triangle',.15);}
    if(type==='go'){this.tone(1046,.4,'triangle',.14);}
    if(type==='win'){[523,659,784,1046,1318,1568].forEach((n,i)=>this.tone(n,.38,'triangle',.1,i*.12));}
    if(type==='lose'){[392,349,311,196].forEach((n,i)=>this.tone(n,.4,'triangle',.1,i*.18));}
  }
  update(game,dt,active){
    if(!this.ctx)return;
    const t=this.ctx.currentTime;
    this.motor.gain.setTargetAtTime(active&&this.enabled?.025:0,t,.12);
    this.engine.frequency.setTargetAtTime(35+game.speed*.35,t,.12);
    if(!active||!this.enabled){this.nextNote=t;return;}
    if(t>=this.nextNote){
      this.nextNote=t+.235;
      // An original, light, spooky waltz in A minor.
      const melody=[69,76,72,75,74,72,71,64,68,71,72,76,77,74,71,68];
      const note=melody[this.beat%melody.length]-(game.stage===1?12:0);
      this.tone(440*Math.pow(2,(note-69)/12),.22,'triangle',.032);
      if(this.beat%4===0)this.tone(this.beat%8===0?110:82.407,.4,'sine',.07);
      this.beat++;
    }
  }
}
