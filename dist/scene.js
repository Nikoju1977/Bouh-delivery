import {clamp,PLAYER_Z} from './engine.js';
import {viewMetrics,projectRoad} from './geometry.js';

const TAU = Math.PI * 2;
const noise = n => { const v = Math.sin(n * 127.1 + 41.7) * 43758.5453; return v - Math.floor(v); };

export class Scene {
  constructor(canvas, game) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.game = game;
    this.width = 0; this.height = 0; this.time = 0; this.menuTravel = 0;
    this.effects = []; this.shake = 0;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 1280; this.height = rect.height || 720;
    // Limit backing-store pixels on high-DPI phones to keep Canvas memory and GPU cost predictable.
    const coarse = window.matchMedia('(pointer:coarse)').matches;
    const pixelBudget = coarse ? 1400000 : 3000000;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(pixelBudget / (this.width * this.height)));
    const backingWidth = Math.max(1, Math.round(this.width * this.dpr));
    const backingHeight = Math.max(1, Math.round(this.height * this.dpr));
    if(this.canvas.width !== backingWidth) this.canvas.width = backingWidth;
    if(this.canvas.height !== backingHeight) this.canvas.height = backingHeight;
    this.metrics=viewMetrics(this.width,this.height);this.game.configure(this.metrics);
  }
  path(points, fill, stroke, line = 1) {
    const c = this.ctx; c.beginPath();
    points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y));
    c.closePath(); if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}
  }
  ellipse(x,y,rx,ry,fill) {const c=this.ctx;c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);c.fillStyle=fill;c.fill();}
  rect(x,y,w,h,r,fill,stroke) {const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
  glow(x,y,r,color) {const c=this.ctx,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
  line(points,color,width=1) {const c=this.ctx;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
  road(z) {
    return projectRoad(z,this);
  }
  event(e) {
    if(e.type==='hit') this.shake=.5;
    if(e.type==='bossHit') this.shake=.18;
    if(e.type==='candy') {
      const p=this.road(PLAYER_Z),x=p.x+this.game.x*p.half*.78;
      for(let i=0;i<10;i++)this.effects.push({x,y:p.y-30,vx:(Math.random()-.5)*160,vy:-80-Math.random()*130,life:.6,max:.6,color:i%2?'#ffd484':'#d2a9ff',size:2+Math.random()*3});
    }
    if(e.type==='targetHit'){
      const p=this.road(e.z),x=p.x+e.x*p.half*.78;
      for(let i=0;i<18;i++)this.effects.push({x,y:p.y-18,vx:(Math.random()-.5)*185,vy:-35-Math.random()*135,life:.55,max:.55,color:e.target==='ghost'?'#c9abff':e.target==='pumpkin'?'#ffb55b':'#a6ef99',size:2+Math.random()*5});
    }
    if(e.type==='hit'){
      const p=this.road(PLAYER_Z),x=p.x+this.game.x*p.half*.78;
      for(let i=0;i<20;i++)this.effects.push({x,y:p.y-30,vx:(Math.random()-.5)*270,vy:-50-Math.random()*150,life:.8,max:.8,color:'#ff854b',size:2+Math.random()*4});
    }
  }
  frame(dt) {
    const c=this.ctx, w=this.width,h=this.height,g=this.game;
    const animate=g.mode==='playing'||g.mode==='menu'||g.mode==='ready';
    if(animate&&(!this.reduced||g.mode==='playing'))this.time+=dt;
    if(g.mode==='menu'&&!this.reduced)this.menuTravel+=dt*.075;
    this.menu=g.mode==='menu';this.mobile=w<580;
    this.travel=this.menu?this.menuTravel:g.distance;
    const targetCenter=w*(this.menu?(this.mobile?.75:.69):.5);
    this.center=this.center===undefined?targetCenter:this.center+(targetCenter-this.center)*Math.min(1,dt*3);
    this.horizon=h*(this.menu?(this.mobile?.56:.43):(this.mobile?.38:.37));
    this.front=this.menu?w*(this.mobile?.70:.49):this.metrics.front;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,w,h);
    c.save();
    if(this.shake>0&&!this.reduced&&g.mode==='playing'){this.shake=Math.max(0,this.shake-dt);c.translate(Math.sin(this.time*100)*this.shake*8,Math.cos(this.time*120)*this.shake*5);}
    this.sky();this.landscape();this.roadSurface();this.scenery();this.bossFigure();
    const objects=this.menu?[{type:'candy',x:-.65,z:.55,seed:0},{type:'candy',x:-.65,z:.65,seed:1},{type:'candy',x:.66,z:.32,seed:2},{type:'pumpkin',x:.68,z:.64,seed:3},{type:'ghost',x:-1.17,z:.79,seed:4}]:[...g.objects,...g.projectiles.map(p=>({...p,type:'shot'}))];
    let carDrawn=false;
    for(const o of [...objects].sort((a,b)=>a.z-b.z)){
      if(o.z>PLAYER_Z&&!carDrawn){this.vehicle();carDrawn=true;}
      if(o.z<.02||o.z>1.18)continue;
      const p=this.road(o.z),x=p.x+o.x*p.half*.78,scale=o.z*this.metrics.objectScale;
      c.save();c.translate(x,p.y);
      if(o.fleeing){c.rotate(Math.sin(this.time*20)*.3);c.globalAlpha=clamp(1-(Math.abs(o.x)-1)*.6,0,1);}
      if(o.type==='shot')this.candyShot(scale);
      else if(o.type==='candy')this.candy(0,0,scale,this.time*2+o.seed);
      else if(o.type==='pumpkin')this.pumpkin(0,0,scale*1.06,true);
      else if(o.type==='broccoli')this.broccoli(0,0,scale);
      else if(o.type==='shield'||o.type==='magnet')this.powerup(0,0,scale,o.type);
      else if(o.type==='rune')this.bossRune(0,0,scale);
      else if(o.type==='bossBolt')this.bossProjectile(0,0,scale);
      else this.ghost(0,-Math.sin(this.time*3+o.seed)*5,scale, false);
      c.restore();
    }
    if(!carDrawn)this.vehicle();
    if(g.mode==='playing'){
      for(const p of this.effects){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;c.globalAlpha=Math.max(0,p.life/p.max);c.fillStyle=p.color;c.fillRect(p.x,p.y,p.size,p.size);}
      this.effects=this.effects.filter(p=>p.life>0);c.globalAlpha=1;
      if(g.boosting&&!this.reduced)this.speedLines();
    }
    c.restore();
  }
  sky(){
    const c=this.ctx,w=this.width,h=this.height,t=this.time,stage=this.game.stage;
    const colors=stage===5?['#162b23','#335841','#b38851']:stage===6?['#12243a','#3b365e','#856f9b']:stage===7?['#361532','#712f68','#e078a0']:stage===8?['#112d40','#21647a','#70a3c2']:stage===9?['#321021','#783440','#dd7852']:stage===3?['#231345','#633451','#b86b79']:stage===4?['#132c30','#35594f','#8b9270']:stage===1?['#111c31','#34314f','#67516a']:stage===2?['#261337','#4d254b','#a25860']:['#1b1233','#3d2854','#866073'];
    const sky=c.createLinearGradient(0,0,0,this.horizon+80);colors.forEach((x,i)=>sky.addColorStop(i/2,x));c.fillStyle=sky;c.fillRect(0,0,w,h);
    for(let i=0;i<100;i++){const x=noise(i)*w,y=noise(i+201)*this.horizon*.9,s=noise(i+5)> .9?1.7:.8;c.globalAlpha=.2+noise(i+3)*.5+(this.reduced?0:Math.sin(t*.5+i)*.12);this.ellipse(x,y,s,s,'#f8e0ce');if(i%19===0){c.fillStyle='#ead5d4';c.fillRect(x-4,y-.4,8,.8);c.fillRect(x-.4,y-4,.8,8);}}
    c.globalAlpha=1;
    const mx=w*(this.mobile?.79:.77),my=this.horizon*(this.mobile?.40:.45),mr=Math.min(w*.081,h*.14);
    this.glow(mx,my,mr*2.6,'#f4ba8d23');this.glow(mx,my,mr*1.5,'#ffca9c25');this.ellipse(mx,my,mr,mr,'#f2d9ae');this.ellipse(mx-4,my-4,mr*.94,mr*.94,'#f9e4c0');
    c.globalAlpha=.25;this.ellipse(mx+mr*.3,my+mr*.15,mr*.19,mr*.23,'#d7bca0');this.ellipse(mx-mr*.29,my-mr*.27,mr*.13,mr*.11,'#d6baa2');this.ellipse(mx+mr*.1,my-mr*.49,mr*.09,mr*.09,'#d6baa2');c.globalAlpha=1;
    for(let i=0;i<7;i++){const x=(noise(i+300)*w+t*(i%2?1.5:-1))%(w+130),y=this.horizon*(.23+noise(i+500)*.65);c.globalAlpha=.17;this.ellipse(x,y,70+noise(i+12)*100,6+noise(i+33)*12,'#c1a0c3');this.ellipse(x+32,y-5,60,8,'#c1a0c3');}
    c.globalAlpha=1;
    for(let i=0;i<6;i++){const x=mx+(noise(i+60)-.4)*mr*3.6,y=my+(noise(i+90)-.2)*mr*2.3,sz=(3+noise(i+50)*5)*(this.mobile?.7:1);this.bat(x+Math.sin(t*.6+i)*9,y+Math.cos(t+i)*3,sz,t+i);}
  }
  bat(x,y,s,t){const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);const wing=Math.sin(t*6)*.4;this.path([[-2.2,-.7-wing],[-1.4,-.6],[-.5,.2],[0,-.2],[.5,.2],[1.4,-.6],[2.2,-.7-wing],[1.45,.8],[.7,.65],[0,1],[-.7,.65],[-1.45,.8]],'#251a36');c.restore();}
  landscape(){
    const c=this.ctx,w=this.width,hz=this.horizon;
    for(let layer=0;layer<3;layer++){
      const points=[[0,hz+80]];for(let i=0;i<=60;i++){const x=w*i/60;points.push([x,hz-30+layer*21+Math.sin(i*.19+layer*2)*22+Math.sin(i*.42+layer)*10]);}points.push([w,hz+100]);this.path(points,['#3a2b4e','#30223f','#231c34'][layer]);
    }
    const castleX=w*(this.mobile?.75:.88),scale=Math.min(w/1200,.95)*(this.mobile?1.8:1);
    if([0,2,6,9].includes(this.game.stage))this.castle(castleX,hz+14,scale*([2,9].includes(this.game.stage)?1.35:1));
    if(this.game.stage===5)for(let i=0;i<7;i++)this.pumpkin(w*(.06+i*.15),hz+26,scale*.55,false);
    if(this.game.stage===8)for(let i=0;i<9;i++)this.path([[w*i/8,hz+18],[w*i/8-18,hz-30],[w*i/8+16,hz-65],[w*i/8+38,hz+12]],i%2?'#72baca':'#8cc4d5');
    if(this.game.stage===3||this.game.stage===7)this.fairground(w*.77,hz+22,Math.min(w/850,.9));
    if(this.game.stage===4||this.game.stage===9)for(let i=0;i<7;i++)this.broccoli(w*(.1+i*.14),hz+23,scale*.7);
    for(let i=0;i<17;i++){const x=noise(i+840)*w,y=hz+10+noise(i+20)*20;this.tree(x,y,.26+noise(i+830)*.29,'#201b31',i);}
    for(let i=0;i<11;i++){const x=noise(i+420)*w,y=hz+30+noise(i+30)*15;this.grave(x,y,.26+noise(i+490)*.3,i);}
    const ground=c.createLinearGradient(0,hz,0,this.height);ground.addColorStop(0,'#29203c');ground.addColorStop(1,this.game.stage===1?'#171c2c':'#24192c');c.fillStyle=ground;c.fillRect(0,hz+40,w,this.height-hz);
  }
  castle(x,y,s){
    const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);
    this.path([[-100,0],[-100,-95],[-86,-95],[-86,-145],[-98,-145],[-69,-190],[-39,-145],[-52,-145],[-52,-106],[-27,-106],[-27,-132],[14,-132],[14,-110],[50,-110],[50,-156],[39,-156],[66,-203],[89,-156],[78,-156],[78,-82],[105,-82],[105,0]],'#211b30','#433044',2);
    this.path([[-110,-95],[-67,-139],[-24,-95]],'#271d32');this.path([[-37,-132],[-7,-176],[25,-132]],'#211b30');
    for(const [wx,wy]of[[-73,-155],[62,-166],[-75,-111],[-76,-71],[-47,-59],[-12,-136],[-11,-91],[18,-69],[57,-120],[61,-72],[83,-45]]){this.glow(wx+4,wy+8,18,'#ffb75920');this.rect(wx,wy,8,15,[5,5,0,0],'#db9b62');c.fillStyle='#443044';c.fillRect(wx+3,wy,2,16);}
    this.rect(-15,-39,25,42,[13,13,0,0],'#110e21','#553648');this.path([[-20,-1],[-26,4],[18,4],[13,-1]],'#5b3a49');
    this.line([[65,-204],[65,-224]],'#312039',2);this.path([[65,-222],[90,-214],[65,-210]],'#884359');
    this.path([[-140,1],[-134,-12],[-122,-12],[-119,1],[-110,-8],[-102,1],[114,-4],[122,-16],[129,-14],[138,1]],'#231a2e');
    c.restore();
  }
  roadSurface(){
    const c=this.ctx,w=this.width,h=this.height;
    const left=[],right=[];for(let i=0;i<=75;i++){const p=this.road(i/75);left.push([p.x-p.half,p.y]);right.unshift([p.x+p.half,p.y]);}
    const roadGradient=c.createLinearGradient(0,this.horizon,0,h);roadGradient.addColorStop(0,'#454056');roadGradient.addColorStop(.6,'#2a233c');roadGradient.addColorStop(1,'#211e30');
    this.path([...left,...right],roadGradient);
    for(let i=0;i<75;i++){
      const z=i/75,p=this.road(z),q=this.road((i+1)/75),band=Math.floor(z*22-this.travel*6)%2===0;
      if(band){this.path([[p.x-p.half,p.y],[p.x+p.half,p.y],[q.x+q.half,q.y],[q.x-q.half,q.y]],'#5e48600a');}
      for(const side of [-1,1]){
        const edge=Math.max(1,z*7),edge2=Math.max(1,(z+1/75)*7);
        this.path([[p.x+side*p.half,p.y],[p.x+side*(p.half+edge),p.y],[q.x+side*(q.half+edge2),q.y],[q.x+side*q.half,q.y]],band?'#f29b6e':'#674756');
        if(band)for(const lane of [-1/3,1/3])this.path([[p.x+p.half*lane-z*1.6,p.y],[p.x+p.half*lane+z*1.6,p.y],[q.x+q.half*lane+(z+1/75)*1.6,q.y],[q.x+q.half*lane-(z+1/75)*1.6,q.y]],'#ae8d8170');
      }
    }
    for(let i=0;i<15;i++){const z=(i/15+this.travel*.12)%1,p=this.road(z);if(z>.1){c.globalAlpha=.13;this.ellipse(p.x+(noise(i)-.5)*p.half*1.8,p.y,8*z,1.6*z,'#b2a0c4');}}c.globalAlpha=1;
    const haze=c.createLinearGradient(0,this.horizon,0,this.horizon+80);haze.addColorStop(0,'#b38a9d55');haze.addColorStop(1,'#6e4d7000');c.fillStyle=haze;c.fillRect(0,this.horizon,w,80);
  }
  scenery(){
    const c=this.ctx,h=this.height,w=this.width;
    const items=[];
    for(let i=0;i<26;i++){
      const z=((i/26+this.travel*.10)%1)*1.15;
      if(z<.07)continue;
      const side=i%2?1:-1,p=this.road(z),offset=1.16+noise(i+80)*.46,x=p.x+side*p.half*offset;
      items.push({z,x,y:p.y,s:z*h/650,kind:i%6===0?'tree':i%5===0?'lamp':i%3===0?'pumpkin':'grave',id:i});
    }
    for(const o of items.sort((a,b)=>a.z-b.z)){
      if(o.x<-180||o.x>w+180)continue;
      if(o.kind==='tree')this.tree(o.x,o.y,o.s*.85,this.game.stage===1?'#152531':'#21182e',o.id);
      if(o.kind==='grave')this.grave(o.x,o.y,o.s*.7,o.id);
      if(o.kind==='pumpkin'){this.pumpkin(o.x,o.y,o.s*.75,false);this.pumpkin(o.x+o.s*40,o.y+o.s*11,o.s*.45,false);}
      if(o.kind==='lamp')this.lamp(o.x,o.y,o.s);
      for(let k=0;k<3;k++){const xx=o.x+(k-1)*22*o.s,yy=o.y+o.s*6;this.line([[xx-6*o.s,yy-12*o.s],[xx,yy],[xx+7*o.s,yy-9*o.s]],'#77604b',Math.max(.7,o.s));}
    }
    if(this.menu&&!this.mobile){this.ghost(w*.96,h*.61,.58,false);this.ghost(w*.57,h*.34,.3,true);}
    for(let i=0;i<10;i++){const x=noise(i+611)*w+Math.sin(this.time*.5+i)*20,y=this.horizon+noise(i+716)*(h-this.horizon),r=1.3+noise(i+612);this.glow(x,y,9,'#d9bcff16');this.ellipse(x,y,r,r,'#cbacf877');}
  }
  tree(x,y,s,color,seed){
    const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);const bend=seed%2?1:-1;
    this.path([[-13,0],[-7,-44],[-11,-84],[-5,-122],[-16,-163],[-9,-171],[4,-136],[7,-96],[15,-52],[11,0]],color);
    this.line([[1,-76],[-31*bend,-107],[-44*bend,-144]],color,7);this.line([[-29*bend,-108],[-60*bend,-113],[-73*bend,-136]],color,4);
    this.line([[4,-111],[29*bend,-142],[35*bend,-184]],color,6);this.line([[28*bend,-141],[63*bend,-160],[69*bend,-176]],color,4);
    this.line([[1,-49],[35*bend,-74],[47*bend,-103]],color,7);this.line([[34*bend,-75],[65*bend,-79]],color,4);
    if(this.game.stage===1){this.ellipse(-3,-80,3,5,'#e2aa69');this.ellipse(6,-81,3,5,'#e2aa69');this.ellipse(2,-64,4,7,'#110f1c');}
    this.path([[-28,3],[-8,-13],[6,-14],[27,3]],color);c.restore();
  }
  grave(x,y,s,seed){
    const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);c.rotate((noise(seed+20)-.5)*.24);this.ellipse(0,0,35,8,'#100d2360');
    if(seed%4===0){this.path([[-7,0],[-7,-50],[-24,-50],[-24,-65],[-7,-65],[-7,-88],[8,-88],[8,-65],[26,-65],[26,-50],[8,-50],[8,0]],'#51415c','#6b5571',2);}
    else{this.rect(-24,-57,48,59,[23,23,2,2],'#50425e','#73607e');this.line([[-18,-9],[-18,-33]],'#695674',2);c.fillStyle='#2b243c';c.font='bold 11px Georgia';c.textAlign='center';c.fillText(seed%3===0?'RIP':'ZZZ',0,-28);this.line([[-10,-17],[10,-17]],'#786183',1.5);this.path([[-29,1],[-29,-5],[29,-5],[31,1]],'#665273');}c.restore();
  }
  lamp(x,y,s){
    const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);this.line([[0,0],[0,-116],[9,-130],[27,-130]],'#292238',5);this.path([[18,-133],[35,-133],[40,-127],[15,-127]],'#37293d');this.rect(19,-127,15,23,3,'#cf9b66','#453145');this.line([[23,-127],[23,-105]],'#775346',2);this.glow(27,-116,56,'#ffc38226');this.path([[17,-105],[37,-105],[32,-101],[22,-101]],'#2b2135');this.ellipse(0,1,10,3,'#6c4d64');c.restore();
  }
  pumpkin(x,y,s,hostile){
    const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);this.ellipse(0,0,34,9,'#140c295c');this.glow(0,-21,45,'#ff7c2425');
    this.ellipse(0,-27,32,28,'#b74e2e');this.ellipse(-14,-27,18,27,'#d66334');this.ellipse(14,-27,18,27,'#dd6b32');this.ellipse(0,-27,17,28,'#ef8842');
    this.path([[-4,-54],[-5,-64],[3,-68],[7,-65],[3,-55]],'#6c7c4c');this.line([[3,-57],[13,-61],[18,-57]],'#8c9562',2);
    const color=hostile?'#ffe1a4':'#ffd68e';c.shadowColor='#ffb45b';c.shadowBlur=7;
    this.path([[-22,-34],[-9,-36],[-11,-25]],color);this.path([[10,-36],[23,-34],[12,-25]],color);this.path([[-4,-23],[0,-29],[5,-23]],'#fbe1a0');
    this.path([[-19,-18],[-10,-13],[-4,-16],[3,-12],[9,-16],[20,-19],[13,-7],[5,-6],[0,-10],[-6,-6],[-14,-9]],color);c.shadowBlur=0;c.restore();
  }
  ghost(x,y,s,tiny){
    const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);this.ellipse(0,5,27,7,'#1b123c44');this.glow(0,-36,70,'#a7f5d222');
    c.beginPath();c.moveTo(-28,-17);c.bezierCurveTo(-28,-74,-9,-84,5,-78);c.bezierCurveTo(32,-74,29,-45,37,-27);c.lineTo(24,-31);c.bezierCurveTo(32,-5,28,-3,19,-9);c.lineTo(10,-3);c.lineTo(0,-10);c.lineTo(-10,-3);c.lineTo(-18,-11);c.lineTo(-30,-6);c.lineTo(-25,-31);c.lineTo(-41,-22);c.lineTo(-28,-42);c.closePath();
    const g=c.createLinearGradient(0,-80,0,0);g.addColorStop(0,'#e9f6e3');g.addColorStop(1,'#8dc5bd');c.fillStyle=g;c.fill();c.strokeStyle='#d9ffee66';c.lineWidth=1.5;c.stroke();
    this.ellipse(-8,-52,4.5,7,'#302447');this.ellipse(10,-52,4.5,7,'#302447');this.ellipse(2,-34,tiny?3:6,6,'#4c3c57');this.ellipse(-17,-40,5,3,'#d594b587');this.ellipse(18,-40,5,3,'#d594b587');c.restore();
  }
  candy(x,y,s,t){
    const c=this.ctx;c.save();c.translate(x,y-14*s+Math.sin(t)*5*s);c.scale(s,s);this.ellipse(0,18,20,5,'#170d2d55');this.glow(0,0,47,'#ffc56228');c.rotate(Math.sin(t*.5)*.18-.18);this.path([[-17,-7],[-31,-16],[-27,-1],[-31,11],[-16,6]],'#ffad5a','#fcd18b',1.2);this.path([[17,-7],[31,-16],[27,-1],[31,11],[16,6]],'#ffad5a','#fcd18b',1.2);this.rect(-19,-13,38,26,10,'#ffce82','#fff1b9');c.save();c.beginPath();c.roundRect(-19,-13,38,26,10);c.clip();for(let i=-3;i<4;i++)this.path([[i*14,-15],[i*14+8,-15],[i*14-7,15],[i*14-15,15]],'#f08467');c.restore();this.line([[-10,-8],[2,-8]],'#fff4cb',2);c.restore();
  }
  broccoli(x,y,s){
    const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);
    this.ellipse(0,0,34,9,'#140c295c');this.path([[-12,0],[-9,-36],[12,-36],[15,0]],'#91bb6a','#c8d888',2);
    for(const [bx,by,r]of[[-22,-39,20],[23,-39,21],[-13,-59,21],[14,-61,23],[0,-41,24]]){this.ellipse(bx,by,r,r,'#377d55');this.ellipse(bx-4,by-5,r*.72,r*.72,'#57a466');}
    this.line([[-16,-47],[-6,-43]],'#17372b',3);this.line([[7,-43],[17,-47]],'#17372b',3);this.ellipse(-10,-38,3,4,'#172d29');this.ellipse(12,-38,3,4,'#172d29');this.line([[-6,-27],[6,-27]],'#ecf5ba',3);c.restore();
  }
  powerup(x,y,s,type){
    const c=this.ctx;c.save();c.translate(x,y-26*s+Math.sin(this.time*3)*4*s);c.scale(s,s);const color=type==='shield'?'#9cefd1':'#cda7ff';
    this.glow(0,0,60,type==='shield'?'#a5ffce33':'#be8aff33');this.ellipse(0,0,28,28,'#211832');c.strokeStyle=color;c.lineWidth=2;c.stroke();
    if(type==='shield'){this.path([[-15,-15],[0,-21],[15,-15],[13,7],[0,20],[-13,7]],color);this.line([[-7,0],[-1,7],[9,-8]],'#245c4b',3);}
    else{this.line([[-12,-14],[-12,8],[-7,16],[7,16],[12,8],[12,-14]],color,8);this.line([[-12,-14],[-12,-6]],'#ffe3c9',8);this.line([[12,-14],[12,-6]],'#ffe3c9',8);}
    c.restore();
  }
  fairground(x,y,s){
    const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);
    this.line([[-42,0],[0,-95],[42,0]],'#9c739e',5);this.ellipse(0,-105,77,77,'#472945');c.strokeStyle='#d9a385';c.lineWidth=2;c.stroke();
    for(let i=0;i<10;i++){const angle=i*TAU/10+this.time*.06,xx=Math.cos(angle)*76,yy=-105+Math.sin(angle)*76;this.line([[0,-105],[xx,yy]],'#bf83b0',1.5);this.rect(xx-11,yy-4,22,15,4,i%2?'#e99f6d':'#b093d8');}
    this.ellipse(0,-105,7,7,'#f8d29e');this.path([[-169,0],[-169,-43],[-109,-95],[-49,-43],[-49,0]],'#aa5870');this.path([[-177,-42],[-109,-100],[-41,-42]],'#d39887');this.path([[-132,0],[-132,-38],[-107,-70],[-84,-38],[-84,0]],'#553650');c.restore();
  }
  koala(x,y,s){
    // Small Halloween koala mascot, drawn in Canvas (no external images).
    const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);
    this.path([[-28,9],[-15,-18],[15,-18],[28,9],[0,14]],'#603977','#e0b5f1',2);
    this.ellipse(-23,-24,16,17,'#9794a4');
    this.ellipse(23,-24,16,17,'#9794a4');
    this.ellipse(-23,-24,9,10,'#e5abbc');
    this.ellipse(23,-24,9,10,'#e5abbc');
    this.ellipse(0,-22,25,25,'#b8b5bc');
    this.ellipse(-9,-27,3.5,4.5,'#201929');
    this.ellipse(9,-27,3.5,4.5,'#201929');
    this.ellipse(-11,-29,1.4,1.4,'#fff4ec');
    this.ellipse(7,-29,1.4,1.4,'#fff4ec');
    this.ellipse(0,-16,8,11,'#292232');
    this.path([[-6,-7],[-2,-1],[0,-7],[2,-1],[6,-7]],'#fff2e8');
    this.path([[-24,-43],[1,-76],[23,-43]],'#37243e','#ed9b65',2);
    this.path([[-31,-44],[-4,-49],[29,-44],[13,-37],[-15,-38]],'#673a65','#f1ab72',1.5);
    this.ellipse(14,-52,3.5,3.5,'#ffba71');
    c.restore();
  }
  bossFigure(){
    const boss=this.game.boss;
    if(!boss||boss.defeated||(!boss.active&&!this.menu))return;
    const c=this.ctx,p=this.road(.16),s=Math.min(this.width/360,1.8)*(this.mobile?.75:1);
    c.save();c.translate(p.x,this.horizon+33);c.scale(s,s);
    this.glow(0,-62,112,boss.kind==='broccoli'?'#95fa6d2a':boss.kind==='ghost'?'#d99fff2a':'#ff7a452c');
    if(boss.kind==='pumpkin')this.pumpkin(0,0,1.8,true);
    else if(boss.kind==='ghost')this.ghost(0,-34,2.1,false);
    else this.broccoli(0,0,2);
    this.path([[-45,-114],[-36,-152],[-18,-130],[0,-166],[18,-130],[36,-152],[45,-114]],'#e6ae60','#fbe2a0',3);
    this.ellipse(0,-166,6,6,'#fff1b1');
    c.restore();
  }
  bossRune(x,y,s){
    const c=this.ctx;c.save();c.translate(x,y-33*s);c.scale(s,s);
    this.glow(0,0,70,'#cba7ff66');c.rotate(this.time*1.9);
    this.path([[0,-31],[24,0],[0,31],[-24,0]],'#d9a5ff','#fff6dc',3);
    this.path([[0,-19],[13,0],[0,19],[-13,0]],'#faf2c7');
    c.restore();
  }
  candyShot(s){
    const c=this.ctx;c.save();c.translate(0,-18*s);c.scale(s,s);
    this.glow(0,0,45,'#bcb7ff66');
    this.ellipse(0,0,10,14,'#f5daff');
    this.ellipse(-3,-4,4,5,'#ffffff');
    this.path([[-13,-4],[-25,-10],[-17,1],[-25,10],[-12,5]],'#ffa85f');
    this.path([[13,-4],[25,-10],[17,1],[25,10],[12,5]],'#ffa85f');
    this.line([[-4,-19],[-6,-27]],'#ffe9c5',2);
    c.restore();
  }
  bossProjectile(x,y,s){
    const c=this.ctx;c.save();c.translate(x,y-19*s);c.scale(s,s);
    this.glow(0,0,47,'#ff534a66');
    this.ellipse(0,0,24,24,'#9e2850');
    this.ellipse(-7,-8,5,5,'#fce4ac');this.ellipse(8,-8,5,5,'#fce4ac');
    this.path([[-13,7],[0,15],[14,7]],'#261020');
    for(let i=0;i<4;i++)this.path([[Math.cos(i*1.57)*20,Math.sin(i*1.57)*20],[Math.cos(i*1.57)*32,Math.sin(i*1.57)*32],[Math.cos(i*1.57+.4)*20,Math.sin(i*1.57+.4)*20]],'#e15c64');
    c.restore();
  }
  vehicle(){
    const c=this.ctx,g=this.game,h=this.height,w=this.width;
    const p=this.road(PLAYER_Z),carX=p.x+(this.menu?Math.sin(this.time*.4)*.018:g.x)*p.half*.78;
    const scale=this.menu?(this.mobile?.65:.88)*h/650:this.metrics.carScale;
    const carY=this.menu?h*(this.mobile?.89:.93):p.y+76*scale;
    const bounce=this.reduced?0:Math.sin(this.time*(g.boosting?37:17))*1.1;
    if(!this.menu){
      const beam=c.createLinearGradient(carX,carY-100*scale,carX,carY-300*scale);beam.addColorStop(0,'#ffe3ac16');beam.addColorStop(1,'#ffe3ac00');
      this.path([[carX-47*scale,carY-90*scale],[carX-130*scale,carY-310*scale],[carX+130*scale,carY-310*scale],[carX+47*scale,carY-90*scale]],beam);
    }
    c.save();c.translate(carX,carY+bounce);c.scale(scale,scale);c.rotate((this.menu?.04:g.steer*.065));
    if(g.shield){this.ellipse(0,-79,85,117,'#95f5db0d');c.strokeStyle='#95f5db';c.lineWidth=2.5;c.stroke();}
    if(g.magnet>0){c.setLineDash([7,7]);this.ellipse(0,-60,105,37,'#ba8bff0d');c.strokeStyle='#c39dff';c.lineWidth=2;c.stroke();c.setLineDash([]);}
    if(g.braking)this.glow(0,-16,95,'#ff564866');
    this.ellipse(0,4,83,21,'#0d0a1daf');this.glow(0,-17,120,g.boosting?'#be7fff33':'#fa894b14');
    if(g.invulnerable>0&&Math.sin(this.time*25)>0)c.globalAlpha=.58;
    for(const side of [-1,1]){
      if(g.boosting){const flame=38+Math.sin(this.time*70)*12;this.path([[side*43-8,-4],[side*43-12,14],[side*43,flame],[side*43+9,17],[side*43+7,-4]],'#bd8bff');this.path([[side*43-4,0],[side*43,flame*.65],[side*43+4,0]],'#f5dfff');}
      this.rect(side*54-10,-72,21,65,6,'#100e1b','#3d3045');this.rect(side*56-8,-65,16,50,4,'#171422');
      for(let i=0;i<4;i++)this.line([[side*56-6,-57+i*10],[side*56+6,-57+i*10]],'#2c2635',2);
    }
    this.path([[-58,-24],[-61,-102],[-47,-154],[-34,-172],[34,-172],[47,-154],[61,-102],[58,-24]],'#d56634','#f3ac64',2);
    this.path([[-52,-90],[-43,-153],[-33,-163],[33,-163],[43,-153],[52,-90]],'#e78342','#fab46d',1.5);
    this.path([[-48,-97],[-36,-141],[36,-141],[48,-97]],'#261f36','#a45742',3);
    this.path([[-40,-101],[-31,-134],[31,-134],[40,-101]],'#526271');this.path([[-38,-103],[-30,-131],[-6,-131],[-12,-103]],'#8e9fa4');this.path([[4,-132],[29,-132],[37,-106],[7,-106]],'#637888');
    this.line([[-33,-126],[-17,-126]],'#b8c7c544',2);
    this.path([[-53,-86],[-58,-37],[58,-37],[53,-86]],'#c36137','#ec9a57',1);
    this.path([[-39,-86],[-34,-52],[34,-52],[39,-86]],'#343047','#f0a25a',2);
    this.rect(-42,-87,84,30,6,'#38243a','#f3bb83');c.fillStyle='#fff0cd';c.font='bold 18px Arial, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('Aylina',0,-72,76);
    this.rect(-63,-39,126,22,7,'#d77847','#f3b578');this.rect(-66,-22,132,12,4,'#aaa0ac','#e4c7b4');this.rect(-60,-17,120,5,2,'#51445b');
    for(const side of [-1,1]){this.glow(side*46,-35,26,'#ff433833');this.rect(side*47-12,-40,24,12,3,'#7f3540');this.rect(side*47-10,-38,20,7,2,'#ff8974');this.line([[side*47-8,-37],[side*47+7,-37]],'#ffe0af',1.5);this.rect(side*42-6,-8,12,8,2,'#352941','#958b9c');}
    this.rect(-22,-35,44,16,3,'#e9cfa3','#6e4c48');c.fillStyle='#63463c';c.font='bold 8px monospace';c.textAlign='center';c.fillText('BOUH-31',0,-24);
    this.line([[-52,-84],[-56,-46]],'#ffba6b',2);this.line([[52,-84],[56,-46]],'#984333',3);
    this.rect(-57,-122,12,9,3,'#c57b51');this.rect(45,-122,12,9,3,'#c57b51');
    this.koala(0,-160,.60);this.line([[-21,-153],[-21,-146],[21,-146],[21,-153]],'#816052',2);
    if(this.menu||g.mode==='playing')for(let i=0;i<3;i++){const phase=(this.time*1.4+i*.33)%1;this.ellipse(-42-phase*12,-1+phase*23,4+phase*8,3+phase*5,`rgba(175,145,194,${(1-phase)*.13})`);}
    c.restore();
    if(g.honkWave>0){const wave=1-g.honkWave/.65;c.save();c.globalAlpha=(1-wave)*.65;for(let i=0;i<3;i++){c.strokeStyle='#d6ffdf';c.lineWidth=2;c.beginPath();c.ellipse(carX,carY-100*scale,(50+wave*160+i*14)*scale,(20+wave*70+i*8)*scale,0,Math.PI,TAU);c.stroke();}c.restore();}
  }
  speedLines(){
    const c=this.ctx,w=this.width,h=this.height;c.save();c.strokeStyle='#d8c9fc36';c.lineWidth=1.3;
    for(let i=0;i<18;i++){const side=i%2?1:-1,phase=(this.time*1.8+noise(i))%1,x=w/2+side*w*(.24+phase*.35),y=h*(.3+noise(i+30)*.6);this.line([[x,y],[x+side*50*phase,y+22*phase]],'#d8c9fc44',1.3);}c.restore();
  }
}
