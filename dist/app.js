import {Game,LEVELS,MODES,clamp} from './engine.js';
import {readProgress,recordResult} from './levels.js';
import {dragTarget} from './geometry.js';
import {Scene} from './scene.js';
import {AudioEngine} from './audio.js';

const $=id=>document.getElementById(id);
const storage={get(key,fallback){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,String(value));}catch{}}};
const progress=readProgress(storage.get('bouh-campaign-v2','null'));
const audio=new AudioEngine(storage.get('bouh-sound','on')!=='off');
const keys=new Set(),touchPointers=new Map();
let scene,countdownRemaining=0,lastCountdown=-1,toastRemaining=0,radioRemaining=0,lastRadio=-1,helpPaused=false,drag=null;
const game=new Game({onEvent:handleEvent});
game.configure({difficulty:storage.get('bouh-difficulty','arcade'),sensitivity:Number(storage.get('bouh-sensitivity',100))/100});
game.reset();game.mode='menu';
scene=new Scene($('game-canvas'),game);
$('difficulty').value=game.difficulty;
$('sensitivity').value=Math.round(game.sensitivity*100);
$('sensitivity-value').textContent=`${Math.round(game.sensitivity*100)} %`;
const radioLines=[
  ['DRACULA · RADIO 6.66','Pas de réglisse. J’ai une réputation.'],
  ['LE GPS POSSÉDÉ','Dans 200 mètres, tournez… dans votre tombe.'],
  ['DR BROCOLI · DENTISTE','Arrêtez ce véhicule ! Pensez à votre émail !'],
  ['DRACULA · RADIO 6.66','Le buffet est vide. Les invités mangent les serviettes.']
];
const currentRecord=()=>progress.results[`${game.difficulty}:${game.level.id}`]||{best:0,stars:0};
const isDriving=()=>game.mode==='playing'||game.mode==='paused';
function updateSound(){const b=$('sound-button');b.setAttribute('aria-pressed',String(audio.enabled));b.setAttribute('aria-label',audio.enabled?'Couper le son':'Activer le son');}
function showToast(text,duration=1.6){$('toast').textContent=text;$('toast').classList.add('visible');toastRemaining=duration;}
function say(name,text,duration=4.5){$('radio-name').textContent=name;$('radio-text').textContent=text;$('radio').hidden=false;$('radio').classList.add('visible');radioRemaining=duration;}
function updateStage(){const level=game.level,pill=$('level-pill');pill.firstElementChild.textContent=String(level.id).padStart(2,'0');pill.lastElementChild.firstChild.textContent=level.name.toUpperCase();pill.querySelector('small').textContent=level.subtitle;}
function renderLevels(){
  $('level-list').replaceChildren();
  $('boss-level-list').replaceChildren();
  for(const [index,level] of LEVELS.entries()){
    const locked=level.id>progress.unlocked,record=progress.results[`${game.difficulty}:${level.id}`]||{stars:0,best:0};
    const button=document.createElement('button');button.type='button';button.className='level-card';button.classList.toggle('selected',index===game.levelIndex);button.classList.toggle('locked',locked);button.classList.toggle('boss-mission',!!level.boss);button.disabled=locked||isDriving();button.setAttribute('aria-pressed',String(index===game.levelIndex));
    const number=document.createElement('span');number.className='level-card-number';number.textContent=`${String(level.id).padStart(2,'0')} · ${locked?'VERROUILLÉ':level.icon}`;
    const title=document.createElement('strong');title.textContent=level.name;
    const target=document.createElement('small');target.textContent=`${level.duration} s · ${level.goal} bonbons${level.boss?' · BOSS : '+level.boss.name:''}`;
    const stars=document.createElement('span');stars.className='level-stars';stars.textContent='★'.repeat(record.stars)+'☆'.repeat(3-record.stars);stars.setAttribute('aria-label',`${record.stars} étoiles sur 3`);
    button.append(number,title,target,stars);button.addEventListener('click',()=>home(index));$(index<5?'level-list':'boss-level-list').append(button);
  }
  $('progress-label').textContent=`${progress.unlocked} / ${LEVELS.length} DÉBLOQUÉ${progress.unlocked>1?'S':''}`;
  $('level-brief').textContent=game.level.brief;$('difficulty').disabled=isDriving();
}
function updateMenu(){
  $('selected-mission').textContent=`MISSION ${String(game.level.id).padStart(2,'0')} / ${String(LEVELS.length).padStart(2,'0')}`;
  $('intro-mode').textContent=MODES[game.difficulty].label.toUpperCase();$('intro-level').textContent=`${String(game.level.id).padStart(2,'0')} · ${game.level.name.toUpperCase()}`;
  $('intro-duration').textContent=game.duration;$('intro-goal').textContent=game.goal;$('intro-lives').textContent=game.maxLives;
  $('mission-title').textContent=game.level.name+' · '+game.level.subtitle;
  $('mission-description').textContent=`${game.goal} bonbons, ${game.duration} secondes.${game.level.boss?' Boss : '+game.level.boss.name+'.':' Et un corbillard de fonction.'}`;
  $('footer-best').textContent=String(currentRecord().best).padStart(4,'0');updateStage();renderLevels();
}
function clearInput(){keys.clear();touchPointers.clear();drag=null;document.querySelectorAll('.touch-controls button').forEach(b=>b.classList.remove('held'));}
function start(){
  audio.init();game.reset();game.start();scene.effects=[];scene.shake=0;clearInput();
  countdownRemaining=2.7;lastCountdown=-1;radioRemaining=0;lastRadio=-1;toastRemaining=0;
  for(const id of ['intro','corner-label','scene-caption','canvas-footer','result-overlay','pause-overlay','radio'])$(id).hidden=true;
  for(const id of ['hud','play-bottom','touch-controls','touch-tip','countdown','powerup-status'])$(id).hidden=false; $('boss-hud').hidden=true;
  $('radio').classList.remove('visible');$('toast').classList.remove('visible');$('countdown-number').textContent='3';$('pause-button').setAttribute('aria-label','Mettre en pause');
  $('game-shell').classList.add('is-playing');updateMenu();updateHud();
  $('game-shell').scrollIntoView({block:'start',behavior:'instant'});$('pause-button').focus({preventScroll:true});
}
function pause(){if(game.mode!=='playing')return;game.pause();clearInput();$('pause-overlay').hidden=false;$('countdown').hidden=true;$('pause-button').setAttribute('aria-label','Partie en pause');$('resume-button').focus({preventScroll:true});}
function resume(){if(game.mode!=='paused')return;audio.init();game.resume();clearInput();$('pause-overlay').hidden=true;if(countdownRemaining>0)$('countdown').hidden=false;$('pause-button').setAttribute('aria-label','Mettre en pause');$('pause-button').focus({preventScroll:true});}
function home(index=game.levelIndex){
  if(!Number.isInteger(index)||index<0||index>=progress.unlocked)return;
  game.configure({levelIndex:index});game.reset();game.mode='menu';clearInput();countdownRemaining=0;radioRemaining=0;scene.effects=[];
  for(const id of ['intro','corner-label','scene-caption','canvas-footer'])$(id).hidden=false;
  for(const id of ['result-overlay','pause-overlay','hud','play-bottom','touch-controls','touch-tip','radio','countdown','powerup-status','boss-hud'])$(id).hidden=true;
  $('toast').classList.remove('visible');$('game-shell').classList.remove('is-playing');updateMenu();$('start-button').focus({preventScroll:true});
}
function finish(event){
  clearInput();radioRemaining=0;toastRemaining=0;for(const id of ['radio','touch-controls','touch-tip','powerup-status','boss-hud'])$(id).hidden=true;$('toast').classList.remove('visible');
  const score=Math.floor(game.score),record=recordResult(progress,{levelIndex:game.levelIndex,difficulty:game.difficulty,score,won:event.won,lives:game.lives,maxLives:game.maxLives});storage.set('bouh-campaign-v2',JSON.stringify(progress));
  $('footer-best').textContent=String(record.best).padStart(4,'0');$('result-icon').textContent=event.won?'✦':'☠';
  $('result-eyebrow').textContent=event.won?(record.newRecord?'LIVRAISON RÉUSSIE · NOUVEAU RECORD':'LIVRAISON RÉUSSIE'):'LE SERVICE APRÈS-MORT VOUS ÉCOUTE';
  const title=$('result-title'),em=document.createElement('em');title.replaceChildren();
  if(event.won){title.append(game.levelIndex===4?'La dent sucrée.':'Livraison arrivée.',document.createElement('br'));em.textContent=['Pas enterrée.','On respire. Enfin…','Quel cirque !','Brocoli neutralisé.','Et pointue.'][game.levelIndex]||(game.level.boss?'Boss terrassé !':'Et le koala applaudit.');$('result-story').textContent=game.level.ending;audio.effect('win');}
  else if(event.reason==='lives'){title.append('Un peu trop',document.createElement('br'));em.textContent='mort de rire.';$('result-story').textContent='Le corbillard a rendu l’âme. Une deuxième fois. Essaie le frein ou le mode Balade : même les fantômes ont commencé avec un A.';audio.effect('lose');}
  else if(event.reason==='boss'){title.append('Encore debout ?',document.createElement('br'));em.textContent='Le boss aussi.';$('result-story').textContent='Ramasse les runes violettes pour vider la jauge du boss avant minuit. Esquive ses boules rouges !';audio.effect('lose');}
  else{title.append('Minuit. Oups.',document.createElement('br'));em.textContent='Ça sent le brocoli.';$('result-story').textContent=`${game.candies} bonbon${game.candies>1?'s':''} sur ${game.goal}… Dracula fait semblant d’aimer les crudités. Personne n’y croit. Une petite dose de turbo peut aider !`;audio.effect('lose');}
  title.append(em);$('earned-stars').textContent='★'.repeat(record.earnedStars)+'☆'.repeat(3-record.earnedStars);$('earned-stars').setAttribute('aria-label',`${record.earnedStars} étoiles gagnées sur 3`);
  $('result-candies').textContent=game.candies;$('result-score').textContent=score.toLocaleString('fr-FR');$('result-best').textContent=record.best.toLocaleString('fr-FR');
  $('next-level-button').hidden=!event.won||game.levelIndex===LEVELS.length-1;$('result-overlay').hidden=false;renderLevels();
  ($('next-level-button').hidden?$('replay-button'):$('next-level-button')).focus({preventScroll:true});
}
function handleEvent(e){
  scene?.event(e);if(['candy','hit','honk'].includes(e.type))audio.effect(e.type);
  if(e.type==='candy'){if(e.goal){showToast('LE SAC EST PLEIN ! TIENS BON !',2.5);say('DRACULA · RADIO 6.66','Maintenant, livre-le en un seul morceau. Le sac, pas le chauffeur.');}else if(e.combo%8===0)showToast(`COMBO ×${e.combo} !`);}
  if(e.type==='hit')showToast(e.obstacle==='broccoli'?'PAS DANS LA SOUPE !':e.obstacle==='pumpkin'?'PURÉE DE CITROUILLE !':'CONSTAT À L’AMIÂBLE !');
  if(e.type==='honk')showToast(e.count?'PARDON, J’ÉTAIS MORT !':'POUËT !',1.2);
  if(e.type==='powerup'){audio.effect('go');showToast(e.powerup==='shield'?'ASSURANCE TOUS FANTÔMES !':'AIMANT À CARIES · 8 S');}
  if(e.type==='shield'){audio.effect('honk');showToast('LE BOUCLIER A TOUT PRIS !');}
  if(e.type==='nearMiss')showToast('ÇA PASSE ! +50',1);
  if(e.type==='bossStart'){showToast('ATTENTION · '+e.name,2.5);say('ALERTE DU GPS POSSÉDÉ','Boss devant ! Attrape les runes violettes pour le vaincre.',4);}
  if(e.type==='bossHit'){audio.effect('candy');showToast('BOSS TOUCHÉ · '+e.hp+' PV',1.5);}
  if(e.type==='bossDefeated'){audio.effect('win');showToast('BOSS VAINCU !',2.8);}
  if(e.type==='finish')finish(e);
}
function updateHud(){
  const remaining=Math.max(0,Math.ceil(game.duration-game.elapsed));$('timer-value').textContent=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
  $('timer-value').parentElement.classList.toggle('urgent',remaining<=10);$('candy-value').textContent=String(game.candies).padStart(2,'0');$('goal-target').textContent=` / ${game.goal}`;$('goal-fill').style.width=Math.min(100,game.candies/game.goal*100)+'%';
  $('lives-value').textContent=Array.from({length:game.maxLives},(_,i)=>i<game.lives?'♥':'♡').join(' ');$('lives-value').setAttribute('aria-label',`${game.lives} vies restantes`);
  $('score-value').textContent=Math.floor(game.score).toLocaleString('fr-FR');$('turbo-fill').style.width=game.fuel+'%';$('turbo-label').textContent=game.braking?'FREIN':game.boosting?'WOUHOU !':game.boostLocked?'RECHARGE':'ESPACE';$('speed-value').textContent=game.speed;
  $('honk-status').classList.toggle('cooling',game.honkCooldown>0);$('honk-status').querySelector('span').textContent=game.honkCooldown>0?`${Math.ceil(game.honkCooldown)} S`:'POUËT !';
  const badges=[];if(game.shield)badges.push('⬡ BOUCLIER');if(game.magnet>0)badges.push(`✦ AIMANT ${Math.ceil(game.magnet)} S`);if(game.combo>=4)badges.push(`COMBO ×${game.combo}`);
  const b=game.boss,bossVisible=b?.active&&!b.defeated&&(game.mode==='playing'||game.mode==='paused');
  $('boss-hud').hidden=!bossVisible;
  if(bossVisible){$('boss-name').textContent=b.name;$('boss-health').style.width=(100*b.hp/game.level.boss.hp)+'%';$('boss-health-text').textContent=b.hp+' / '+game.level.boss.hp+' PV';}
  const label=badges.join('   ·   ');if($('powerup-status').textContent!==label)$('powerup-status').textContent=label;
}
function input(){
  const touch=new Set(touchPointers.values());
  const axis=(keys.has('arrowright')||keys.has('d')||touch.has('right')?1:0)-(keys.has('arrowleft')||keys.has('q')||keys.has('a')||touch.has('left')?1:0);
  return {axis,targetX:axis?undefined:drag?.target,boost:keys.has(' ')||keys.has('arrowup')||keys.has('w')||keys.has('z')||touch.has('boost'),brake:keys.has('arrowdown')||keys.has('s')||touch.has('brake')};
}
for(const id of ['start-button','replay-button','restart-pause'])$(id).addEventListener('click',start);
$('home-button').addEventListener('click',()=>home());$('pause-button').addEventListener('click',pause);$('resume-button').addEventListener('click',resume);
$('next-level-button').addEventListener('click',()=>{if(game.won&&game.levelIndex+1<progress.unlocked){game.configure({levelIndex:game.levelIndex+1});start();}});
$('difficulty').addEventListener('change',()=>{if(isDriving())return;game.configure({difficulty:$('difficulty').value});storage.set('bouh-difficulty',game.difficulty);home();});
$('sensitivity').addEventListener('input',()=>{game.configure({sensitivity:Number($('sensitivity').value)/100});const value=Math.round(game.sensitivity*100);$('sensitivity-value').textContent=`${value} %`;storage.set('bouh-sensitivity',value);});
$('sound-button').addEventListener('click',()=>{audio.toggle();storage.set('bouh-sound',audio.enabled?'on':'off');updateSound();});
$('help-button').addEventListener('click',()=>{helpPaused=game.mode==='playing';if(helpPaused)pause();$('help-dialog').showModal();});
for(const id of ['close-help','help-ready'])$(id).addEventListener('click',()=>$('help-dialog').close());
$('help-dialog').addEventListener('close',()=>{if(helpPaused){helpPaused=false;resume();}else $('help-button').focus({preventScroll:true});});
$('help-dialog').addEventListener('click',event=>{if(event.target===$('help-dialog')){const r=$('help-dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('help-dialog').close();}});
document.addEventListener('keydown',event=>{
  if($('help-dialog').open||['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;
  const key=event.key.toLowerCase();if(game.mode==='over'&&key==='r'&&!event.repeat){event.preventDefault();start();return;}
  if(isDriving()&&['arrowleft','arrowright','arrowup','arrowdown',' ','h','p','q','d','a','w','z','s','escape'].includes(key)){
    event.preventDefault();if((key==='p'||key==='escape')&&!event.repeat){game.mode==='playing'?pause():resume();return;}
    if(game.mode==='playing'){keys.add(key);if(key==='h'&&!event.repeat&&countdownRemaining<=0)game.honk();}
  }
});
document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
window.addEventListener('blur',()=>{clearInput();if(game.mode==='playing')pause();});
window.addEventListener('resize',clearInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(game.mode==='playing')pause();}});
for(const button of document.querySelectorAll('[data-control]')){
  const control=button.dataset.control;
  button.addEventListener('pointerdown',event=>{event.preventDefault();if(game.mode!=='playing')return;button.setPointerCapture(event.pointerId);button.classList.add('held');touchPointers.set(event.pointerId,control);audio.init();if(control==='honk'&&countdownRemaining<=0)game.honk();});
  const release=event=>{touchPointers.delete(event.pointerId);if(![...touchPointers.values()].includes(control))button.classList.remove('held');};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,release);
  button.addEventListener('contextmenu',event=>event.preventDefault());
}
const canvas=$('game-canvas');
canvas.addEventListener('pointerdown',event=>{if(game.mode!=='playing'||drag||event.button>0)return;event.preventDefault();canvas.setPointerCapture(event.pointerId);drag={id:event.pointerId,start:game.x,client:event.clientX,target:game.x};audio.init();});
canvas.addEventListener('pointermove',event=>{if(drag?.id!==event.pointerId)return;drag.target=dragTarget(drag.start,drag.client,event.clientX,scene.metrics.playerUnit,game.maxX);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{if(drag?.id===event.pointerId)drag=null;});
canvas.addEventListener('contextmenu',event=>{if(isDriving())event.preventDefault();});
let previous=performance.now(),hudClock=0,paintClock=0;
function frame(now){
  const dt=clamp((now-previous)/1000,0,.25);previous=now;
  if(game.mode==='playing'){
    if(countdownRemaining>0){
      countdownRemaining=Math.max(0,countdownRemaining-dt);const count=Math.ceil(countdownRemaining/.9);
      if(count!==lastCountdown){lastCountdown=count;$('countdown-number').textContent=count>0?count:'BOUH !';audio.effect(count>0?'count':'go');}
      if(countdownRemaining<=0){$('countdown').hidden=true;showToast(`MISSION ${game.level.id} · GAZ À TOUS LES ÉTAGES !`,2);}
    }else{
      game.step(dt,input());
      if(game.mode==='playing'){let index=0;for(const [i,fraction]of[0,.3,.62,.84].entries())if(game.elapsed/game.duration>=fraction)index=i;if(index>lastRadio){lastRadio=index;say(...radioLines[index]);}}
    }
    if(toastRemaining>0){toastRemaining-=dt;if(toastRemaining<=0)$('toast').classList.remove('visible');}
    if(radioRemaining>0){radioRemaining-=dt;if(radioRemaining<=0)$('radio').classList.remove('visible');}
  }
  hudClock+=dt;if(hudClock>.08){if(game.mode!=='menu')updateHud();hudClock=0;}
  // Avoid 120-Hz duplicate paints and reduce battery drain on menus / pause.
  paintClock+=dt;
  if(paintClock >= (game.mode==='playing'?1/70:1/28)){
    scene.frame(Math.min(paintClock,.05));
    paintClock=0;
  }
  audio.update(game,dt,game.mode==='playing'&&countdownRemaining<=0);requestAnimationFrame(frame);
}
updateSound();updateMenu();requestAnimationFrame(frame);
