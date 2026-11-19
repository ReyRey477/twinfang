// ===================== GAME =====================
// one colour per rank (and its dark end for gradients); the rank letter also grows with every rank
const RANKS=['D','C','B','A','S'],RWORD=['DULL','CRISP','BRUTAL','ARTFUL','SUBLIME'],RCOL=['#8fa3b5','#4fd8ff','#6dffb0','#f2f5fa','#ff6a2a'],RDK=['#3d4b59','#11688a','#1c8a55','#8791a3','#a02a00'],RSZ=[72,86,100,116,132];   // (A: white-silver with a gold rim, see the stylesheet; gold itself belongs to the heavy warning)
const ENAME={c1:'THE MACHINE NAVE',c2:'THE NAVE GATE',warden:'THE GEAR HALL',A:'THE FIRST SEAL',B:'THE SECOND SEAL',C:'THE THIRD SEAL',storm:'THE ROOF'};
const el={};for(const id of ['hud','hin','hpw','hpf','hpl','hpn','style','rank','rword','smf','combo','call','msg','sub','hint','title','keys','fade','end','endT','endR','endS','endGo','endI','endRW','wsel','boss','bossN','bossF','bossA','bt','bb'])el[id]=$(id);
let HUDZ=1;   // the HUD is laid out for a 720-line screen and scaled with the window
const TITLE={yaw:2.6,cx:1,cy:.6,cz:-2.7,lx:1.55,ly:1.15};   // the title shot: which way the hero is turned, where the camera sits and looks
const HERO_GLOW=heroMats.glow.color.clone(),HERO_GLOW2=heroMats.glow2.color.clone(),HERO_GLOW3=heroMats.glow3.color.clone(),AMBER0=amberGlow.color.clone();
const G={
  state:'title',rt:0,hitstop:0,slowT:0,slowKind:'',enemies:[],tokens:0,maxTokens:1,combo:0,comboT:0,maxCombo:0,dmgTaken:0,runT:0,dmgT:9,dmgDir:new THREE.Vector2(),dark:0,expK:0,deaths:0,
  style:{m:0,last:[],rank:-1,peak:-1,idle:0},enc:null,lock:null,hard:false,inCombat:false,player:null,boss:null,hud:{},
  cp:{x:0,y:0,z:7,yaw:0},strikes:[],storm:{flash:0,next:3},endT:0,cineT:0,callT:0,hintT:0,hinted:false,
  // screen state: letterbox (target, height now, snapped), HUD visibility, the banner, the weight of the current hit-stop, a finisher
  // waiting for its dark frames to end, radial blur, a boss's phase change, the age and weight of the last lightning, lamp and barrier dimming
  barT:0,barK:0,barFast:false,hudK:1,ban:null,stopBig:0,finP:null,rbT:0,phaseT:0,breakT:0,boltA:9,boltK:1,lampK:1,barDim:1,lastEnc:'',hitSw:V(1,0,0),hitT:-9,
  start(){sfx.init();this.state='play';el.title.classList.add('off');el.keys.classList.add('off');el.hud.classList.add('on');lockPtr();const p=this.player;p.yaw=p.pyaw=0;cam.dist=5.3;cam.side=0;cam.pitch=.2;cam.yaw=0;
    if(!QS.has('debug')){el.fade.style.transition='none';el.fade.style.opacity=1;void el.fade.offsetWidth;el.fade.style.transition='opacity .6s';el.fade.style.opacity=0;}   // cut from the title shot to the chase camera through black (not under ?debug: screenshots start at once)
    sfx.boom();this.msg('','REACH THE GATE',3);},
  // ---------- resets ----------
  resetCombat(){
    for(const e of this.enemies)if(!e.gone)e.remove();
    this.enemies=[];this.tokens=0;orbs.clear();waves.clear();fx.clearMarks();this.strikes.length=0;
    if(this.enc)for(const b of this.enc.def.bars)b.on=false;
    Object.assign(this,{enc:null,inCombat:false,boss:null,lock:null,hard:false,hitstop:0,slowT:0,dmgT:9,dark:0,cineT:0,finP:null,stopBig:0,phaseT:0,breakT:0,rbT:0,ban:null});sfx.slow(false);this.cine(false);
  },
  placePlayer(c){
    const p=this.player;p.pos.set(c.x,c.y,c.z);p.prev.copy(p.pos);p.gy=c.y;p.vel.set(0,0,0);p.yaw=c.yaw||0;p.hp=100;p.state='move';p.grounded=true;p.invuln=1.5;p.rig.root.visible=true;p.rig.play(CL.idle,.1,true);
    cam.yaw=p.yaw;cam.pitch=.2;cam.focus.set(c.x,c.y+1.45,c.z);input.clear();
  },
  showPlay(){el.end.classList.add('off');document.body.classList.remove('dead','done');el.hud.classList.add('on');this.state='play';lockPtr();},
  respawn(){this.resetCombat();this.placePlayer(this.cp);Object.assign(this.style,{m:0,last:[],rank:-1,idle:0});this.combo=0;this.deaths++;this.showPlay();},
  reset(){
    this.resetCombat();for(const d of ENCS)d.done=false;for(const c of CHECKPOINTS)c.hit=false;Object.assign(LOCKS,{gate:true,warden:true,upper:true});door.open=false;door.k=0;
    for(const k of pickups){k.taken=false;k.m.visible=true;}
    this.cp={x:0,y:0,z:7,yaw:0};Object.assign(this,{combo:0,maxCombo:0,dmgTaken:0,runT:0,deaths:0,endT:0});Object.assign(this.style,{m:0,last:[],rank:-1,peak:-1,idle:0});
    this.placePlayer(this.cp);this.showPlay();
  },
  // letterbox bars: eased in for a boss arriving, snapped in (120 ms) for a finisher. The game loop moves them (see update), and
  // the HUD is gone, not dimmed, for as long as they have any height.
  cine(on,fast){this.barT=on?1:0;this.barFast=!!fast;},
  // taking a hit: an edge vignette that leans toward the side on screen the blow came from (60 ms in, 300 ms out)
  hurtFx(src){const p=this.player;_f1.copy(src).setY(p.pos.y+1).project(camera);_f2.set(p.pos.x,p.pos.y+1,p.pos.z).project(camera);
    const x=(_f1.z>1?-1:1)*(_f1.x-_f2.x)*camera.aspect,y=(_f1.z>1?-1:1)*(_f1.y-_f2.y),l=hypot(x,y);if(l>.02)this.dmgDir.set(x/l,y/l);else this.dmgDir.set(0,-1);this.dmgT=0;},
  // A title (with an optional second line) is a banner high in the frame; a line on its own is a callout strip beside the style
  // block (kind 'skill': a reward for something the player did, drawn larger in the hero's colour, not a notice). kind 'enc': the banner that opens an encounter holds 0.9 s, fades in 0.3 s, and goes the moment a hit lands (or the
  // combo is at 3): it never sits on the fight. kind 'boss': a boss's name, up for dur and gone at once when anything winds up.
  msg(t,s,dur=2.4,kind=''){if(!t){const sk=kind==='skill';el.call.textContent=s||'';el.call.className='';
      if(s){void el.call.offsetWidth;el.call.style.setProperty('--rc',RCOL[max(0,this.style.rank)]);el.call.className=sk?'on skill':'on';if(sk){el.smf.classList.remove('tick');void el.smf.offsetWidth;el.smf.classList.add('tick');}}   // a skill reward: its own style, and the gauge ticks
      this.callT=min(dur,1.6);return;}
    el.msg.textContent=t;el.sub.textContent=s||'';el.msg.classList.remove('on');void el.msg.offsetWidth;el.msg.classList.add('on');
    this.ban={t:kind==='end'?-.9:0,hold:kind==='enc'?.9:kind==='boss'?dur:min(dur,2.2),fade:kind==='enc'?.3:.4,kind};},   // 'end': the banner that closes an encounter waits for the last burst to clear
  banOff(fade){const b=this.ban;if(b){b.hold=min(b.hold,b.t);b.fade=fade;}},
  warned(){if(this.ban&&this.ban.kind==='boss')this.banOff(.15);},
  bolted(far){this.boltA=0;this.boltK=far?.5:1;},
  // ---------- targeting ----------
  pickTarget(pref,range=11){
    if(this.hard&&this.lock&&!this.lock.dead)return this.lock;
    const p=this.player;let best=null,bs=1e9;
    for(const e of this.enemies){if(e.dead||e.ghost)continue;const dx=e.pos.x-p.pos.x,dz=e.pos.z-p.pos.z,d=hypot(dx,dz)-e.radius;if(d>range)continue;
      const s=max(0,d)*(1+abs(wrapA(atan2(dx,dz)-pref))*.55);if(s<bs){bs=s;best=e;}}
    return best;
  },
  pickTargetFree(pref,range){const h=this.hard;this.hard=false;const t=this.pickTarget(pref,range);this.hard=h;return t;},
  toggleLock(){this.hard=!this.hard;if(this.hard){this.lock=null;const t=this.pickTargetFree(cam.yaw,45);if(t)this.lock=t;else this.hard=false;}},
  // ---------- combat events ----------
  playerHit(m,h){
    const p=this.player;let any=false;const range=h.range??2.5,arc=h.arc??2.7,fwx=sin(p.yaw),fwz=cos(p.yaw),col=WCOL[p.set];
    let sw=null,sl=.015;for(const t of p.trails){const l=t.dir(_f2);if(l>sl){sl=l;sw=this.hitSw.copy(_f2);}}   // which way the blade is travelling: the hit mark lies along it
    if(sw)this.hitT=this.rt;
    // who is caught, and which of them the blow is aimed at (the attack's target, else the nearest): that one gets the full mark
    // and the full rim, the next a smaller mark, anyone else sparks only
    const hits=[];let prim=null,pd=1e9;
    for(const e of this.enemies){
      if(e.dead||e.ghost)continue;const dx=e.pos.x-p.pos.x,dz=e.pos.z-p.pos.z,d=hypot(dx,dz);
      if(d>range+e.radius)continue;if(abs(e.cy()-(p.pos.y+1))>(h.h??2.4))continue;
      if(d>1.1+e.radius&&arc<6&&abs(wrapA(atan2(dx,dz)-p.yaw))>arc/2)continue;
      hits.push(e);if(e===p.target){prim=e;pd=-1;}else if(d<pd){pd=d;prim=e;}
    }
    let n=0;
    for(const e of hits){
      if(e.dead)continue;const dx=e.pos.x-p.pos.x,dz=e.pos.z-p.pos.z,d=hypot(dx,dz),ux=d>.05?dx/d:fwx,uz=d>.05?dz/d:fwz,lvl=e===prim?2:n++<1?1:0;any=true;
      e._hk=(lvl>1?1:.35)*(h.big?1:.6);e._hc=col;   // a light hit's rim is 60% of a heavy one's
      fx.hit(e.hitPos(_b,ux,uz),ux,uz,!!h.big,sw,col,{lvl,metal:e.mats&&e.mats.armor?e.mats.armor.color.getHex():undefined,gy:e.gy,av:p.pos});
      e.takeHit(h,ux,uz);
    }
    for(const o of orbs.list.slice()){
      if(o.back)continue;const dx=o.pos.x-p.pos.x,dz=o.pos.z-p.pos.z,d=hypot(dx,dz);
      if(d>range+.7||abs(o.pos.y-(p.pos.y+1))>2.3)continue;if(d>1.1&&arc<6&&abs(wrapA(atan2(dx,dz)-p.yaw))>arc/2+.25)continue;
      orbs.deflect(o);any=true;this.addStyle('DEFLECT',16);
    }
    if(any){this.hitstop=max(this.hitstop,h.stop??.05);if(h.big)this.stopBig=1;cam.shake(h.shake??.18);cam.punch=max(cam.punch,h.big?2.5:1.5);cam.ab=max(cam.ab,h.big?.014:.006);sfx.hit(h.big?.9:.35);
      if(this.ban&&this.ban.kind==='enc')this.banOff(0);
      this.combo++;this.comboT=0;this.maxCombo=max(this.maxCombo,this.combo);this.addStyle(m.id,(h.pts??10)*(p.grounded?1:1.25));}
    return any;
  },
  addStyle(id,pts){const s=this.style,rep=s.last.filter(x=>x===id).length;s.m=min(520,s.m+pts*[1,.45,.2,.08,.04][rep]);s.last.push(id);if(s.last.length>4)s.last.shift();s.idle=0;},
  gunScore(){this.combo++;this.comboT=0;this.maxCombo=max(this.maxCombo,this.combo);this.addStyle('GUN',3);},
  onBreak(e){this.hitstop=max(this.hitstop,.14);this.stopBig=1;this.style.m=min(520,this.style.m+35);this.style.idle=0;sfx.armorBreak();cam.shake(.5);fx.armorBreak(e);this.msg('',e.boss?'STAGGERED':'ARMOUR BROKEN',1.4,'skill');},
  // The finishing blow. Three dark frames (the world a full stop down and nearly grey, the two fighters rim-lit) with one cut line
  // across them through the target, the letterbox snapping in; when they end, update() fires the burst (ring, sparks, shards) with
  // a moment of radial blur, and the barrier and lamps stay dimmed while the slow motion plays.
  fin(e){
    this.dark=.05;cam.zoom=1.6;sfx.boom();sfx.slow(true);this.cine(true,true);const hex=WCOL[this.player.set],d=_f2,c=camera.matrixWorld.elements;
    if(this.rt-this.hitT<.12)d.copy(this.hitSw);else d.set(c[0]*.96+c[4]*.28,c[1]*.96+c[5]*.28,c[2]*.96+c[6]*.28);
    _f0.set(e.pos.x,e.cy(),e.pos.z);fx.cut(_f0,d,hex);this.finP={x:_f0.x,y:_f0.y,z:_f0.z,gy:e.gy||0,hex,metal:e.mats&&e.mats.armor?e.mats.armor.color.getHex():0x7e838e,d:d.clone(),sc:e.boss?1.5:1};
  },
  onKill(e){
    this.style.m=min(520,this.style.m+12);if(this.lock===e)this.lock=null;
    if(e.boss){
      this.slowT=1.7;this.slowKind='fin';this.fin(e);
      for(const o of this.enemies)if(o!==e&&!o.dead)o.die();orbs.clear();waves.clear();this.strikes.length=0;fx.clearMarks();return;
    }
    const left=this.enemies.some(x=>!x.dead),en=this.enc;
    if(!left&&en&&!en.def.boss&&en.wave>=en.def.waves.length-1){this.slowT=1.1;this.slowKind='fin';this.fin(e);}
  },
  perfectDodge(src){
    this.slowT=1.3;this.slowKind='dodge';sfx.slow(true);this.style.m=min(520,this.style.m+40);this.style.idle=0;this.msg('','PERFECT DODGE',1.1,'skill');
    const o=src&&(src.owner||src);if(o&&o.onPerfect)o.onPerfect();
  },
  onDeath(){
    this.state='dead';this.slowT=1.2;this.slowKind='fin';sfx.slow(true);sfx.boom();const tm=floor(this.runT/60)+':'+String(floor(this.runT%60)).padStart(2,'0');
    setTimeout(()=>{if(this.state!=='dead')return;el.endT.textContent='FALLEN';el.endI.textContent=(ENAME[this.lastEnc]||'THE CITADEL')+'  ·  '+tm+(this.style.peak>=0?'  ·  RANK '+RANKS[this.style.peak]:'')+'  ·  '+this.maxCombo+' HITS';el.endGo.innerHTML='PRESS <kbd>R</kbd> TO RETRY FROM THE LAST CHECKPOINT';
      el.end.classList.add('dead');document.body.classList.add('dead');el.end.classList.remove('off');el.hud.classList.remove('on');if(document.exitPointerLock)document.exitPointerLock();},1700);
  },
  strike(x,z,y,delay,r,dmg,owner){
    fx.disc(x,y,z,r,delay+.08);this.strikes.push({pos:V(x,y,z),t:delay,r,dmg,owner,dodged:false});
  },
  finish(){
    this.state='done';const s=clamp(100-this.dmgTaken*.22+min(40,this.maxCombo*.5)+(this.style.peak+1)*6-this.deaths*12,0,200);
    const r=s>=120?'S':s>=100?'A':s>=80?'B':s>=60?'C':'D';
    // each line gets its own small grade (for show: the final rank is the formula above); the numbers count up
    const g=(v,a)=>v>=a[0]?4:v>=a[1]?3:v>=a[2]?2:v>=a[3]?1:0,pk=max(0,this.style.peak),ri=RANKS.indexOf(r),tm=v=>{const m=floor(v/60),q=floor(v%60);return m+':'+(q<10?'0':'')+q;};
    const rows=[['TIME',this.runT,tm,g(-this.runT,[-480,-660,-840,-1080])],['LONGEST COMBO',this.maxCombo,v=>Math.round(v)+' HITS',g(this.maxCombo,[40,25,15,8])],
      ['PEAK STYLE',0,()=>this.style.peak>=0?RWORD[pk]:'&mdash;',pk],['DAMAGE TAKEN',this.dmgTaken,v=>Math.round(v),g(-this.dmgTaken,[-40,-100,-200,-350])],['DEFEATS',this.deaths,v=>Math.round(v),g(-this.deaths,[0,-1,-2,-3])]];
    el.endT.textContent='THE STORM BREAKS';el.endGo.innerHTML='PRESS <kbd>R</kbd> TO PLAY AGAIN';el.endR.textContent=r;el.endRW.className='r'+ri;el.endRW.style.setProperty('--rc',RCOL[ri]);el.endRW.style.setProperty('--rd',RDK[ri]);
    for(const n of [el.endR,el.endRW.querySelector('.emb'),el.endRW]){n.style.animation='none';void n.offsetWidth;n.style.animation='';}   // the final rank is the same letter on the same emblem as in play
    el.endS.innerHTML=rows.map(w=>`<b>${w[0]}</b><span></span><em style="color:${RCOL[w[3]]}">${RANKS[w[3]]}</em>`).join('');
    const sp=el.endS.querySelectorAll('span'),t0=performance.now(),tick=()=>{const k=min(1,(performance.now()-t0)/900),e=1-(1-k)*(1-k);rows.forEach((w,i)=>{sp[i].innerHTML=w[2](w[1]*e);});if(k>=1)clearInterval(this.cnt);};
    clearInterval(this.cnt);this.cnt=setInterval(tick,33);tick();
    el.end.classList.remove('off','dead');document.body.classList.add('done');el.hud.classList.remove('on');if(document.exitPointerLock)document.exitPointerLock();sfx.boom();
  },
  // ---------- encounters ----------
  spawnFoe(kind,x,z,extra){
    const d=this.enc.def,o=Object.assign({gy:d.gy,ar:d.ar,ceil:d.ceil},extra),e=kind==='lantern'?new Lantern(x,z,o):new Enemy(kind,x,z,o);
    this.enemies.push(e);return e;
  },
  spawnWave(){const en=this.enc;let n=0;for(const [k,x,z] of en.def.waves[en.wave])this.spawnFoe(k,x,z,k==='stalker'?{delay:.3+.55*n++}:null);},
  updateEnc(dt){
    const p=this.player;
    if(!this.enc){
      if(p.state==='dead')return;
      for(const d of ENCS){
        if(d.done||!d.trig(p.pos))continue;
        this.enc={def:d,wave:0};this.lastEnc=d.id;this.inCombat=true;this.hinted=true;this.hintT=0;el.hint.classList.add('gone');this.maxTokens=d.tokens;for(const b of d.bars)b.on=true;sfx.barrier();cam.shake(.35);   // (the key hints are gone for good once the first fight starts; C still shows the controls)
        if(d.boss){const b=this.boss=d.boss==='warden'?new Warden(d):new Stormvane(d);this.enemies.push(b);this.cine(true);this.cineT=d.boss==='storm'?4.6:2.6;this.msg(b.name,'',this.cineT-.45,'boss');sfx.boom();sfx.roar();}   // the name is up only while the bars are
        else{this.spawnWave();this.msg('SEALED','CUT THEM DOWN',2.2,'enc');}
        break;
      }
      return;
    }
    const en=this.enc,d=en.def;
    if(this.cineT>0){this.cineT-=dt;if(this.cineT<=0&&this.slowT<=0)this.cine(false);}
    if(!d.boss&&en.wave<d.waves.length-1){
      if(!this.enemies.some(e=>!e.dead)){en.wave++;this.spawnWave();sfx.barrier();this.msg('','WAVE '+(en.wave+1)+' OF '+d.waves.length,1.8);}
    }else if(this.enemies.length===0&&this.slowT<=0){
      for(const b of d.bars)b.on=false;d.done=true;this.enc=null;this.inCombat=false;this.hard=false;this.boss=null;
      p.hp=min(100,p.hp+(d.boss?100:30));sfx.barrier();this.cine(false);this.cp={x:p.pos.x,y:p.gy,z:p.pos.z,yaw:p.yaw};
      if(d.id==='c2'){door.open=true;this.msg('THE WAY OPENS','',3.2,'end');}
      else if(d.id==='warden'){LOCKS.warden=false;this.msg('GATEWARDEN FELLED','THE STAIR IS OPEN',3.6,'end');}
      else if(d.id==='storm'){this.endT=3.4;this.msg('THE STORM BREAKS','',3.4,'end');}
      else if(d.id.length===1){const left=['A','B','C'].filter(i=>!ENCS.find(e=>e.id===i).done).length;
        if(left===0){LOCKS.upper=false;this.msg('CLEARED','THE WAY TO THE ROOF IS OPEN',3.4,'end');}else this.msg('CLEARED',left+(left>1?' SEALS REMAIN':' SEAL REMAINS'),2.8,'end');}
      else this.msg('CLEARED',this.style.peak>=0?'STYLE  '+RWORD[this.style.peak]:'',2.6,'end');
    }
  },
  updateWorld(rdt,wdt){
    const p=this.player,P=p.pos;
    // gate, locks, checkpoints, pickups
    if(door.open&&door.k<1){door.k=min(1,door.k+rdt*.35);const k=smooth(door.k);door.l.position.x=1.65+k*3.1;door.r.position.x=-1.65-k*3.1;door.seam.visible=false;if(door.k>.9)LOCKS.gate=false;}
    else if(!door.open&&door.l.position.x!==1.65){door.l.position.x=1.65;door.r.position.x=-1.65;door.seam.visible=true;}
    lockBarriers.warden.on=LOCKS.warden&&P.z>92;lockBarriers.upper.on=LOCKS.upper;
    for(const b of barriers){b.a=damp(b.a,b.on?1:0,5,rdt);b.m.visible=b.a>.01;b.m.material.uniforms.uA.value=b.a*this.barDim;b.m.material.uniforms.uT.value=this.rt;b.m.material.uniforms.uPl.value.copy(P);}
    if(this.state==='play'&&!this.inCombat){
      for(const c of CHECKPOINTS)if(!c.hit&&hypot(P.x-c.x,P.z-c.z)<3.5&&abs(p.gy-c.y)<1){c.hit=true;this.cp={x:c.x,y:c.y,z:c.z,yaw:p.yaw};this.msg('','CHECKPOINT',1.6);}
    }
    for(const k of pickups){if(k.taken)continue;k.m.rotation.y+=rdt*2;k.m.position.y=k.y+1.1+sin(this.rt*2.4+k.x)*.12;
      if(this.state==='play'&&p.hp<100&&hypot(P.x-k.x,P.z-k.z)<1.4&&abs(P.y-k.y)<2){k.taken=true;k.m.visible=false;p.hp=min(100,p.hp+40);sfx.pickup();_a.set(k.x,k.y+1.1,k.z);fx.embers(k.x,k.y+1,k.z,30,[.6,3,1.6],.4);fx.glint(_a,0x4dffb0,3,1.3,.2);fx.flash(_a,0x4dffb0,60,.3);this.msg('','VITALITY RESTORED',1.4);}}
    // lightning strikes
    for(let i=this.strikes.length-1;i>=0;i--){const s=this.strikes[i];s.t-=wdt;if(s.t>0)continue;this.strikes.splice(i,1);fx.bolt(s.pos.x,s.pos.y,s.pos.z);this.storm.flash=max(this.storm.flash,.7);
      if(this.state==='play'&&hypot(P.x-s.pos.x,P.z-s.pos.z)<s.r&&P.y-s.pos.y<2.6)p.takeHit(s.dmg,s);}
    // roof weather: the storm's own lightning is a real bolt out over the roofs in front of the camera, not just a brighter sky
    const st=this.storm,out=P.z>258;rain.m.visible=out;st.flash=max(0,st.flash-rdt*2.4);
    if(out){rain.update(rdt,camera.position.x,AREA.roof.y-1,camera.position.z);st.next-=rdt;
      if(st.next<=0){st.next=rand(4,9);st.flash=max(st.flash,rand(.5,1));sfx.thunder(.45);const a=cam.yaw+rand(-.5,.5),d=rand(58,82),R=AREA.roof,cx=(R.x0+R.x1)/2,cz=(R.z0+R.z1)/2,bx=P.x+sin(a)*d-cx,bz=P.z+cos(a)*d-cz,k=min(1,78/(hypot(bx,bz)||1));fx.bolt(cx+bx*k,R.y-6,cz+bz*k,true,2.6);}}   // always within 30 degrees of where the camera looks, and inside the ring of the skyline (its towers start 85 m from the middle of the roof), so none of them hides it
    sky.material.uniforms.uT.value=this.rt;sky.material.uniforms.uF.value=st.flash;moon.intensity=2.1+st.flash*5;hemi.intensity=.75+st.flash*1.3;
    updateLights(P.x,P.y,P.z);fx.parts.floor=p.gy;TIMEU.value=this.rt;for(const s of spinners)s.g.rotation.x+=s.speed*rdt;
    // while a finisher plays the lamps drop to 40%, so the blow is the brightest thing in the room
    const lk=this.lampK;if(lk<.995){for(const L of lightPool)L.intensity*=lk;amberGlow.color.copy(AMBER0).multiplyScalar(lk);this.hud.lamp=1;}else if(this.hud.lamp){this.hud.lamp=0;amberGlow.color.copy(AMBER0);}
    dust.position.set(Math.round(P.x/10)*10+sin(this.rt*.13)*.4,p.gy+sin(this.rt*.2)*.3,Math.round(P.z/10)*10);
  },
  updateHud(dt){
    const p=this.player,h=this.hud,s=this.style;
    const hp=p.hp/100;if(h.hp!==hp){h.hp=hp;el.hpf.style.transform=el.hpl.style.transform=`scaleX(${hp})`;el.hpn.textContent=Math.ceil(p.hp);el.hpw.classList.toggle('low',hp<.25&&hp>0);el.hpw.classList.toggle('crit',hp<.1&&hp>0);}
    const r=s.m<=0?-1:min(4,floor(s.m/100));
    if(r!==h.rk){const up=r>h.rk;h.rk=r;   // going up: the letter punches in, the plate flashes in the rank colour and shakes, a streak crosses the block; going down: a quick drop
      if(r>=0){el.rank.textContent=RANKS[r];el.rword.textContent=RWORD[r];const st=el.style.style;st.setProperty('--rc',RCOL[r]);st.setProperty('--rd',RDK[r]);st.setProperty('--rs',RSZ[r]+'px');
        el.rank.className='';el.style.className='on r'+r;void el.rank.offsetWidth;el.rank.className=up?'pop':'drop';if(up){el.style.classList.add('up');if(r>0)sfx.rankUp(r);}}
      else el.style.className='';
      s.rank=r;s.peak=max(s.peak,r);}
    if(r>=0){const f=((r>=4?min(100,s.m-400):s.m%100)|0);if(h.sm!==f){h.sm=f;el.smf.style.width=f+'%';}}
    const c=this.combo>1?this.combo:0;if(h.c!==c){const inc=c>h.c;h.c=c;el.combo.innerHTML=c?`${c}<small>HITS</small>`:'';if(inc){el.combo.className='';void el.combo.offsetWidth;el.combo.className='hit';}}
    // banner, letterbox and HUD visibility follow the game's clock exactly
    const b=this.ban;let bo=0;if(b){b.t+=dt;if(b.kind==='enc'&&this.combo>=3)this.banOff(0);bo=b.t<0?0:b.t<b.hold?min(1,b.t/.2):b.fade>0?1-(b.t-b.hold)/b.fade:0;if(bo<=0){bo=0;if(b.t>=0)this.ban=null;}}
    if(h.bo!==bo){h.bo=bo;el.msg.style.opacity=el.sub.style.opacity=bo.toFixed(3);}
    if(h.bar!==this.barK){h.bar=this.barK;el.bt.style.height=el.bb.style.height=(smooth(this.barK)*11).toFixed(2)+'vh';}
    if(h.hk!==this.hudK){h.hk=this.hudK;el.hin.style.opacity=this.hudK.toFixed(3);}
    if(this.callT>0){this.callT-=dt;if(this.callT<=0)el.call.classList.remove('on');}
    if(this.hintT>0){this.hintT-=dt;if(this.hintT<=0)el.hint.classList.add('gone');}else if(!this.hinted&&this.state==='play'&&(MV.mag>0||input.buf)){this.hinted=true;this.hintT=8;}   // key hints leave 8 s after the first input
    if(h.w!==p.set){h.w=p.set;[...el.wsel.children].forEach((n,i)=>n.classList.toggle('on',i===p.set));}
    const bs=this.boss&&!this.boss.gone?this.boss:null;
    if(h.boss!==bs){h.boss=bs;el.boss.classList.toggle('on',!!bs);el.hud.classList.toggle('boss',!!bs);if(bs)el.bossN.textContent=bs.name;}
    if(bs){const f=(max(0,bs.hp/bs.maxHp)*100).toFixed(1),a=(bs.armor>0?bs.armor/bs.maxArmor*100:0).toFixed(0);if(h.bf!==f){h.bf=f;el.bossF.style.width=f+'%';}if(h.ba!==a){h.ba=a;el.bossA.style.width=a+'%';}}
    // a warning flare stays on the foe it belongs to: the HUD block it falls under is faded to 35% for the wind-up instead
    let fs=1,fv=1,fw=1,fb=1;camera.updateMatrixWorld();const ax=1/(360*camera.aspect);
    for(const w of fx.warns){if(!w.on)continue;_f0.copy(w.u.uP.value).project(camera);const x=_f0.x,y=_f0.y,m=.15,mx=m/camera.aspect;if(_f0.z>1||abs(x)>1+mx||abs(y)>1+m)continue;
      if(x>1-330*ax-mx&&y>-.02-m&&y<.72+m)fs=.35;if(x<-1+410*ax+mx&&y>.72-m)fv=.35;if(x<-1+245*ax+mx&&y<-.5+m)fw=.35;if(abs(x)<.6+mx&&y<-.7+m)fb=.35;}
    // the boss bar steps down and thins out while the hero's feet are on it (the roof's low camera puts them there)
    let bl=false;if(bs){_f0.set(p.pos.x,p.pos.y,p.pos.z).project(camera);bl=_f0.z<1&&abs(_f0.x)<.62&&_f0.y<-.64;}
    if(h.bl!==bl){h.bl=bl;el.boss.classList.toggle('low',bl);}if(bl)fb=min(fb,.6);
    if(h.fs!==fs){h.fs=fs;el.style.style.setProperty('--fo',fs);el.call.style.setProperty('--fo',fs);}if(h.fv!==fv){h.fv=fv;el.hpw.style.setProperty('--fo',fv);}
    if(h.fw!==fw){h.fw=fw;el.wsel.style.setProperty('--fo',fw);}if(h.fb!==fb){h.fb=fb;el.boss.style.setProperty('--fo',fb);}
    const tg=this.lock;fx.lockOn(tg&&!tg.dead&&!tg.boss&&this.inCombat&&this.state==='play'&&this.barK<=0?tg:null,this.hard,dt);   // the reticle lives in the scene, on the target's chest
  },
  update(rdt){
    this.rt+=rdt;pollPad(rdt);const p=this.player,play=this.state==='play';
    let ws=1,ps=1;
    if(this.hitstop>0){this.hitstop-=rdt;ws=ps=.03;}
    else if(this.slowT>0){this.slowT-=rdt;if(this.slowKind==='dodge'){ws=.22;ps=.95;}else ws=ps=.2;if(this.slowT<=0)sfx.slow(false);}
    const pdt=rdt*ps,wdt=rdt*ws;
    if(play)this.runT+=rdt;
    // the title shot: the hero held low in a landing stance, three-quarters toward the camera, both Fangs pointing at the floor
    // (down and away from the logo); pressing start lets go of the pose and the hero rises into the idle
    if(this.state==='title'){const r=p.rig;p.yaw=p.pyaw=TITLE.yaw;if(r.clip!==CL.slamLand)r.play(CL.slamLand,0,true);r.t=.25;r.root.position.copy(p.pos);r.root.rotation.y=p.yaw;r.update(0);p.light.position.set(p.pos.x+sin(p.yaw)*.9,p.pos.y+2.1,p.pos.z+cos(p.yaw)*.9);}
    else p.update(pdt);
    const E=this.enemies;for(let i=0;i<E.length;i++)E[i].update(wdt);
    for(let i=0;i<E.length;i++){const a=E[i];if(a.dead)continue;const ra=a.solid();if(!ra)continue;
      for(let j=i+1;j<E.length;j++){const b=E[j];if(b.dead)continue;const rb=b.solid();if(!rb)continue;const dx=b.pos.x-a.pos.x,dz=b.pos.z-a.pos.z,d=hypot(dx,dz)||.01,m=ra+rb+.25;
        if(d<m){const k=(m-d)/d,wa=a.boss?0:b.boss?1:.5;a.pos.x-=dx*k*wa;a.pos.z-=dz*k*wa;b.pos.x+=dx*k*(1-wa);b.pos.z+=dz*k*(1-wa);}}
      if(p.pos.y-a.gy<(a.kind==='storm'?3.6:.5)){const dx=a.pos.x-p.pos.x,dz=a.pos.z-p.pos.z,d=hypot(dx,dz)||.01,m=ra+.4;
        if(d<m){const k=(m-d)/d,w=a.boss?0:.7;a.pos.x+=dx*k*w;a.pos.z+=dz*k*w;p.nudge(-dx*k*(1-w),-dz*k*(1-w));}}}
    for(let i=E.length-1;i>=0;i--)if(E[i].gone)E.splice(i,1);
    orbs.update(wdt);waves.update(wdt);
    if(play){
      this.updateEnc(rdt);
      const s=this.style;s.idle+=pdt;s.m=max(0,s.m-(s.idle>1.8?60:9+max(0,s.rank)*4)*pdt);
      this.comboT+=pdt;if(this.comboT>2.6)this.combo=0;
      if(!(this.hard&&this.lock&&!this.lock.dead)){const t=this.pickTargetFree(p.yaw,this.boss?60:11);if(this.hard&&!t)this.hard=false;this.lock=t;}
      if(this.endT>0){this.endT-=rdt;if(this.endT<=0)this.finish();}
    }
    // screen state. Letterbox: 0.5 s in for a boss, 0.12 s for a finisher, 0.35 s out; the HUD returns the frame the bars are gone.
    const bk=this.barK,stop=this.hitstop>0,dk=this.dark>.001?1:0,fin=this.slowKind==='fin'&&this.slowT>0&&play;
    this.barK=this.barT>bk?min(1,bk+rdt/(this.barFast?.12:.5)):this.barT<bk?max(0,bk-rdt/.35):bk;this.hudK=this.barK>0||this.barT>0?0:1;   // all or nothing: a HUD caught half way through a fade reads as a ghost under the picture
    this.lampK=damp(this.lampK,fin?.4:1,fin?40:4,rdt);this.barDim=damp(this.barDim,fin||dk||stop&&this.stopBig?.3:1,stop||dk?60:fin?30:5,rdt);
    this.updateWorld(rdt,wdt);
    fx.update2(wdt,rdt);fx.update(wdt,rdt);cam.update(rdt);this.updateHud(rdt);   // update2 first: what it re-emits every frame (tracer bolts, lightning) is then drawn this frame, not the next
    if(this.state==='title'){const P=p.pos,s=sin(this.rt*.11),T=TITLE;camera.position.set(P.x+T.cx+s*.14,P.y+T.cy,P.z+T.cz);camera.lookAt(P.x+T.lx+s*.1,P.y+T.ly,P.z+2);}   // low and close, the hero on the right third, the corridor behind
    // Screen treatment (see the grade pass). Hit-stop: the world dips (0.35 EV on a light hit, 0.6 EV on a heavy one, with less
    // saturation, a closer vignette and a quick punch of the lens) while what glows keeps its level and the hero's own light comes up, so the hit mark and the two fighters stand
    // out of a darker frame. A finisher opens with three dark frames a full stop down. Lightning lifts the exposure 0.7 EV for
    // the four frames the bolt is at full, then pulls it 0.25 EV under for eight. Bloom is reined in while fighting.
    this.dmgT+=rdt;this.rbT=max(0,this.rbT-rdt);this.phaseT=max(0,this.phaseT-rdt);this.breakT=max(0,this.breakT-rdt);this.boltA+=rdt;
    if(this.dark>0){this.dark=max(0,this.dark-rdt);if(this.dark<=0&&this.finP){const f=this.finP;this.finP=null;_f0.set(f.x,f.y,f.z);fx.finish(_f0,f.gy,f.hex,f.metal,f.d,f.sc);this.rbT=.15;RBW.copy(_f0);cam.shake(.5);cam.ab=max(cam.ab,.03);}}
    this.expK=stop?1:damp(this.expK,0,14,rdt);if(!stop&&this.expK<.03)this.stopBig=0;   // the dip is there in the frame of the hit, and eases back out
    const u=grade.uniforms,dt_=this.dmgT,big=this.stopBig,ba=this.boltA;u.uT.value=this.rt;u.uAb.value=min(1,cam.ab/.014);u.uDmg.value=dt_<.06?dt_/.06:max(0,1-(dt_-.06)/.3);u.uDir.value.copy(this.dmgDir);
    this.lowPh=(this.lowPh||0)+rdt*TAU*(p.hp<10?1.8:1.1);u.uLow.value=p.hp<25&&p.hp>0&&play?.28+.1*sin(this.lowPh):0;   // low health: the frame edges pulse red between 0.18 and 0.38 at 1.1 Hz (1.8 Hz under a tenth), in step with nothing but itself
    u.uDip.value=pow(2,-max(dk,this.expK*(.35+.25*big),.4*smooth(min(1,this.phaseT/.25)),.5*smooth(min(1,this.breakT/.1))));u.uStop.value=max(dk*.75,this.expK*(.12+.18*big));u.uRb.value=pow(this.rbT/.15,2);RBH.set(p.pos.x,p.pos.y+1,p.pos.z);
    u.uExp.value=2.05*pow(2,(ba<.068?.7:ba<.2?-.25:0)*this.boltK);
    u.uSlow.value=damp(u.uSlow.value,this.slowT>0&&!stop&&!dk?1:0,12,rdt);bloom.strength=damp(bloom.strength,this.inCombat?.4:.52,3,rdt);
    p.light.intensity=this.state==='title'?2.7:3.2*(1+this.expK*(.3+.6*big)+dk*1.5);   // (a little under on the title, so the helmet keeps its detail)
    {const k=1+u.uSlow.value*.8;heroMats.glow.color.copy(HERO_GLOW).multiplyScalar(k);heroMats.glow2.color.copy(HERO_GLOW2).multiplyScalar(k);heroMats.glow3.color.copy(HERO_GLOW3).multiplyScalar(k);}   // in slow motion the hero's lights are the brightest saturated thing on screen
    sfx.tick(this.inCombat&&this.state!=='dead',max(0,this.style.rank,this.boss?2:0),rdt);
  }
};
G.player=new Player();fx.noGhost(heroMats);for(const k in heroMats)rimPatch(heroMats[k]);   // (patched before the shaders are compiled below, so nothing recompiles when play starts)
// the strip of light laid in the floor under each arena barrier shared the lamps' material at four times white, and next to a
// fight it bloomed into a band wider than the hero: it gets the dim line material the wall trim uses
for(const o of world.children)if(o.isMesh&&o.material===amberGlow&&o.geometry===GB&&o.scale.y<.05)o.material=warmLine;
$('keys').querySelector('p').insertAdjacentHTML('beforeend','<small>build '+BUILD+'</small>');   // the build number: in the controls panel as well as in the corner of the title
window.G=G;window.onAction=onAction;window.cam=cam;window.fx=fx;window.T3={scene,camera,renderer,bloom};window.DBG={keys,held,input,MOVES,door,ENCS,AREA,LOCKS,orbs,waves,CL,WEAPONS,walkable,groundAt};
window.step=(n=1,dt=1/60)=>{for(let i=0;i<n;i++)G.update(dt);composer.render();};

function resize(){
  const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);
  camera.aspect=w/h;camera.updateProjectionMatrix();HUDZ=clamp(h/720,.8,2);el.hud.style.zoom=HUDZ;FXS.value=h*renderer.getPixelRatio()/(2*Math.tan(camera.fov*PI/360));FXK.value=.18*h*renderer.getPixelRatio();
}
addEventListener('resize',resize);resize();
// compile every pooled effect shader now (rings, marks, warnings, afterimages ...), not in the middle of the first fight
G.player.rig.wp[1][2].userData.ghostTop=.75;   // afterimages carry the maul's shaft, not its head
G.player.rig.root.updateMatrixWorld(true);fx.ghost(G.player.rig.root,0x58d8ff);fx.ghosts[fx.gi].g.visible=false;   // (and merge the afterimage's geometry now, not on the first dodge)
{const ms=[fx.ghosts[0].mat].map(k=>{const m=new THREE.Mesh(GS,k);m.visible=false;scene.add(m);return m;});renderer.setRenderTarget(composer.renderTarget1);renderer.compile(scene,camera);renderer.setRenderTarget(null);for(const m of ms)scene.remove(m);}
// Every foe's shaders too. One of each kind is built here, drawn once behind the loading screen (80 m under the floor, culling
// off, so the shadow pass compiles its variants as well) and then kept, out of the scene. Before this a foe's shaders were compiled
// the frame it first appeared: on Direct3D about 0.4 s into the first fight and 0.7 s for the first Lantern and for the Stormvane.
// The kept originals also hold those programs between fights (a Lantern and the Stormvane dispose their materials when they die).
{const sp=fx.spawnIn,ss=sfx.spawn,was=new Set(scene.children),Y=-80;fx.spawnIn=()=>{};sfx.spawn=()=>{};
  const W=G.warm=[new Enemy('husk',0,0,{gy:Y}),new Enemy('brute',0,0,{gy:Y}),new Enemy('stalker',0,0,{gy:Y}),new Lantern(0,0,{gy:Y}),new Warden({gy:Y,ar:null,ceil:10}),new Stormvane({gy:Y,ar:null})];
  fx.spawnIn=sp;sfx.spawn=ss;
  for(const e of W){const r=e.rig?e.rig.root:e.root;r.position.set(0,Y,0);fx.rim(e,e.rig?e.mats:e.rimM||(e.rimM={m:e.iron}),0);}   // (the rim patch changes a material's program, so it goes on first)
  const add=scene.children.filter(o=>!was.has(o));for(const o of add)o.traverse(c=>{c.visible=true;c.frustumCulled=false;});
  composer.render();for(const o of add)scene.remove(o);
}
// the controls panel: C toggles it on the title, and shows it for as long as it is held in play
addEventListener('keydown',e=>{if(e.code!=='KeyC'||e.repeat)return;if(G.state==='title')el.keys.classList.toggle('off');else el.keys.classList.remove('off');});
addEventListener('keyup',e=>{if(e.code==='KeyC'&&G.state!=='title')el.keys.classList.add('off');});
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const rdt=min(.05,max(.001,(now-last)/1000))*(G.ts??1);last=now;if(rdt>0)G.update(rdt);composer.render();}
requestAnimationFrame(frame);
