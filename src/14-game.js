// ===================== GAME =====================
// one colour per rank (and its dark end for gradients); the rank letter also grows with every rank
const RANKS=['D','C','B','A','S'],RWORD=['DULL','CRISP','BRUTAL','ARTFUL','SUBLIME'],RCOL=['#8fa3b5','#4fd8ff','#6dffb0','#ffd24a','#ff6a2a'],RDK=['#3d4b59','#11688a','#1c8a55','#a06a00','#a02a00'],RSZ=[72,86,100,116,132];
const el={};for(const id of ['hud','hpw','hpf','hpl','hpn','style','rank','rword','smf','combo','call','msg','sub','ret','thp','hint','title','keys','fade','end','endT','endR','endS','endGo','wsel','boss','bossN','bossF','bossA'])el[id]=$(id);
let HUDZ=1;   // the HUD is laid out for a 720-line screen and scaled with the window
const HERO_GLOW=heroMats.glow.color.clone();
const G={
  state:'title',rt:0,hitstop:0,slowT:0,slowKind:'',enemies:[],tokens:0,maxTokens:1,combo:0,comboT:0,maxCombo:0,dmgTaken:0,runT:0,dmgT:9,dmgDir:new THREE.Vector2(),dark:0,expK:0,deaths:0,
  style:{m:0,last:[],rank:-1,peak:-1,idle:0},enc:null,lock:null,hard:false,inCombat:false,player:null,boss:null,msgT:0,hud:{},
  cp:{x:0,y:0,z:7,yaw:0},strikes:[],storm:{flash:0,next:3},endT:0,cineT:0,callT:0,hintT:0,hinted:false,
  start(){sfx.init();this.state='play';el.title.classList.add('off');el.keys.classList.add('off');el.hud.classList.add('on');lockPtr();const p=this.player;p.yaw=p.pyaw=0;cam.dist=5.3;cam.side=0;cam.pitch=.2;cam.yaw=0;
    if(!QS.has('debug')){el.fade.style.transition='none';el.fade.style.opacity=1;void el.fade.offsetWidth;el.fade.style.transition='opacity .6s';el.fade.style.opacity=0;}   // cut from the title shot to the chase camera through black (not under ?debug: screenshots start at once)
    sfx.boom();this.msg('','REACH THE GATE',3);},
  // ---------- resets ----------
  resetCombat(){
    for(const e of this.enemies)if(!e.gone)e.remove();
    this.enemies=[];this.tokens=0;orbs.clear();waves.clear();fx.clearMarks();this.strikes.length=0;
    if(this.enc)for(const b of this.enc.def.bars)b.on=false;
    Object.assign(this,{enc:null,inCombat:false,boss:null,lock:null,hard:false,hitstop:0,slowT:0,dmgT:9,dark:0,cineT:0});sfx.slow(false);this.cine(false);el.ret.classList.remove('hard');
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
  // letterbox bars: slow for a boss arriving, snapped in (120 ms) for a finisher
  cine(on,fast){document.body.classList.toggle('cine',on);document.body.classList.toggle('fin',on&&!!fast);},
  // taking a hit: an edge vignette that leans toward the side on screen the blow came from (60 ms in, 300 ms out)
  hurtFx(src){const p=this.player;_f1.copy(src).setY(p.pos.y+1).project(camera);_f2.set(p.pos.x,p.pos.y+1,p.pos.z).project(camera);
    const x=(_f1.z>1?-1:1)*(_f1.x-_f2.x)*camera.aspect,y=(_f1.z>1?-1:1)*(_f1.y-_f2.y),l=hypot(x,y);if(l>.02)this.dmgDir.set(x/l,y/l);else this.dmgDir.set(0,-1);this.dmgT=0;},
  // a title (with an optional second line) is a banner high in the frame; a line on its own is a callout strip beside the style block
  msg(t,s,dur=2.4){if(!t){el.call.textContent=s||'';el.call.classList.toggle('on',!!s);this.callT=min(dur,1.6);return;}
    el.msg.textContent=t;el.sub.textContent=s||'';el.msg.classList.add('on');el.sub.classList.toggle('on',!!s);this.msgT=min(dur,2.2);},
  // ---------- targeting ----------
  pickTarget(pref,range=11){
    if(this.hard&&this.lock&&!this.lock.dead)return this.lock;
    const p=this.player;let best=null,bs=1e9;
    for(const e of this.enemies){if(e.dead||e.ghost)continue;const dx=e.pos.x-p.pos.x,dz=e.pos.z-p.pos.z,d=hypot(dx,dz)-e.radius;if(d>range)continue;
      const s=max(0,d)*(1+abs(wrapA(atan2(dx,dz)-pref))*.55);if(s<bs){bs=s;best=e;}}
    return best;
  },
  pickTargetFree(pref,range){const h=this.hard;this.hard=false;const t=this.pickTarget(pref,range);this.hard=h;return t;},
  toggleLock(){this.hard=!this.hard;if(this.hard){this.lock=null;const t=this.pickTargetFree(cam.yaw,45);if(t)this.lock=t;else this.hard=false;}el.ret.classList.toggle('hard',this.hard);},
  // ---------- combat events ----------
  playerHit(m,h){
    const p=this.player;let any=false;const range=h.range??2.5,arc=h.arc??2.7,fwx=sin(p.yaw),fwz=cos(p.yaw);
    let sw=null,sl=.015;for(const t of p.trails){const l=t.dir(_f2);if(l>sl){sl=l;sw=_f1.copy(_f2);}}   // which way the blade is travelling: the hit mark lies along it
    for(const e of this.enemies){
      if(e.dead||e.ghost)continue;const dx=e.pos.x-p.pos.x,dz=e.pos.z-p.pos.z,d=hypot(dx,dz);
      if(d>range+e.radius)continue;if(abs(e.cy()-(p.pos.y+1))>(h.h??2.4))continue;
      if(d>1.1+e.radius&&arc<6&&abs(wrapA(atan2(dx,dz)-p.yaw))>arc/2)continue;
      const ux=d>.05?dx/d:fwx,uz=d>.05?dz/d:fwz;any=true;
      fx.hit(e.hitPos(_b,ux,uz),ux,uz,!!h.big,sw,WEAPONS[p.set].col);
      e.takeHit(h,ux,uz);
    }
    for(const o of orbs.list.slice()){
      if(o.back)continue;const dx=o.pos.x-p.pos.x,dz=o.pos.z-p.pos.z,d=hypot(dx,dz);
      if(d>range+.7||abs(o.pos.y-(p.pos.y+1))>2.3)continue;if(d>1.1&&arc<6&&abs(wrapA(atan2(dx,dz)-p.yaw))>arc/2+.25)continue;
      orbs.deflect(o);any=true;this.addStyle('DEFLECT',16);
    }
    if(any){this.hitstop=max(this.hitstop,h.stop??.05);cam.shake(h.shake??.18);cam.ab=max(cam.ab,h.big?.014:.006);sfx.hit(h.big?.9:.35);
      this.combo++;this.comboT=0;this.maxCombo=max(this.maxCombo,this.combo);this.addStyle(m.id,(h.pts??10)*(p.grounded?1:1.25));}
    return any;
  },
  addStyle(id,pts){const s=this.style,rep=s.last.filter(x=>x===id).length;s.m=min(520,s.m+pts*[1,.45,.2,.08,.04][rep]);s.last.push(id);if(s.last.length>4)s.last.shift();s.idle=0;},
  gunScore(){this.combo++;this.comboT=0;this.maxCombo=max(this.maxCombo,this.combo);this.addStyle('GUN',3);},
  onBreak(e){this.hitstop=max(this.hitstop,.14);this.style.m=min(520,this.style.m+35);this.style.idle=0;sfx.armorBreak();cam.shake(.5);this.msg('',e.boss?'STAGGERED':'ARMOUR BROKEN',1.4);},
  onKill(e){
    this.style.m=min(520,this.style.m+12);if(this.lock===e)this.lock=null;
    if(e.boss){
      this.slowT=1.7;this.slowKind='fin';this.dark=.05;cam.zoom=1.6;sfx.boom();sfx.slow(true);this.cine(true,true);
      for(const o of this.enemies)if(o!==e&&!o.dead)o.die();orbs.clear();waves.clear();this.strikes.length=0;fx.clearMarks();return;
    }
    const left=this.enemies.some(x=>!x.dead),en=this.enc;
    if(!left&&en&&!en.def.boss&&en.wave>=en.def.waves.length-1){this.slowT=1.1;this.slowKind='fin';this.dark=.05;cam.zoom=1.6;sfx.boom();sfx.slow(true);this.cine(true,true);}
  },
  perfectDodge(src){
    this.slowT=1.3;this.slowKind='dodge';sfx.slow(true);this.style.m=min(520,this.style.m+40);this.style.idle=0;this.msg('','PERFECT DODGE',1.1);
    const o=src&&(src.owner||src);if(o&&o.onPerfect)o.onPerfect();
  },
  onDeath(){
    this.state='dead';this.slowT=1.2;this.slowKind='fin';sfx.slow(true);sfx.boom();
    setTimeout(()=>{if(this.state!=='dead')return;el.endT.textContent='FALLEN';el.endGo.innerHTML='PRESS <kbd>R</kbd> TO RETRY FROM THE LAST CHECKPOINT';
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
    const rows=[['TIME',this.runT,tm,g(-this.runT,[-480,-660,-840,-1080])],['LONGEST COMBO',this.maxCombo,v=>Math.round(v)+' hits',g(this.maxCombo,[40,25,15,8])],
      ['PEAK STYLE',0,()=>this.style.peak>=0?RWORD[pk]:'&mdash;',pk],['DAMAGE TAKEN',this.dmgTaken,v=>Math.round(v),g(-this.dmgTaken,[-40,-100,-200,-350])],['DEFEATS',this.deaths,v=>Math.round(v),g(-this.deaths,[0,-1,-2,-3])]];
    el.endT.textContent='THE STORM BREAKS';el.endGo.innerHTML='PRESS <kbd>R</kbd> TO PLAY AGAIN';el.endR.textContent=r;el.endR.style.setProperty('--rc',RCOL[ri]);el.endR.style.setProperty('--rd',RDK[ri]);
    el.endR.style.animation='none';void el.endR.offsetWidth;el.endR.style.animation='';
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
        this.enc={def:d,wave:0};this.inCombat=true;this.maxTokens=d.tokens;for(const b of d.bars)b.on=true;sfx.barrier();cam.shake(.35);
        if(d.boss){const b=this.boss=d.boss==='warden'?new Warden(d):new Stormvane(d);this.enemies.push(b);this.msg(b.name,'',3);this.cine(true);this.cineT=d.boss==='storm'?4.6:2.6;sfx.boom();sfx.roar();}
        else{this.spawnWave();this.msg('SEALED','CUT THEM DOWN',2.2);}
        break;
      }
      return;
    }
    const en=this.enc,d=en.def;
    if(this.cineT>0){this.cineT-=dt;if(this.cineT<=0&&this.slowT<=0)this.cine(false);}
    if(!d.boss&&en.wave<d.waves.length-1){
      if(!this.enemies.some(e=>!e.dead)){en.wave++;this.spawnWave();sfx.barrier();this.msg('','WAVE '+(en.wave+1)+' OF '+d.waves.length,1.8);}
    }else if(this.enemies.length===0&&this.slowT<=0){
      for(const b of d.bars)b.on=false;d.done=true;this.enc=null;this.inCombat=false;this.hard=false;this.boss=null;el.ret.classList.remove('hard');
      p.hp=min(100,p.hp+(d.boss?100:30));sfx.barrier();this.cine(false);this.cp={x:p.pos.x,y:p.gy,z:p.pos.z,yaw:p.yaw};
      if(d.id==='c2'){door.open=true;this.msg('THE WAY OPENS','',3.2);}
      else if(d.id==='warden'){LOCKS.warden=false;this.msg('GATEWARDEN FELLED','THE STAIR IS OPEN',3.6);}
      else if(d.id==='storm'){this.endT=3.4;this.msg('THE STORM BREAKS','',3.4);}
      else if(d.id.length===1){const left=['A','B','C'].filter(i=>!ENCS.find(e=>e.id===i).done).length;
        if(left===0){LOCKS.upper=false;this.msg('CLEARED','THE WAY TO THE ROOF IS OPEN',3.4);}else this.msg('CLEARED',left+(left>1?' SEALS REMAIN':' SEAL REMAINS'),2.8);}
      else this.msg('CLEARED',this.style.peak>=0?'STYLE  '+RWORD[this.style.peak]:'',2.6);
    }
  },
  updateWorld(rdt,wdt){
    const p=this.player,P=p.pos;
    // gate, locks, checkpoints, pickups
    if(door.open&&door.k<1){door.k=min(1,door.k+rdt*.35);const k=smooth(door.k);door.l.position.x=1.65+k*3.1;door.r.position.x=-1.65-k*3.1;door.seam.visible=false;if(door.k>.9)LOCKS.gate=false;}
    else if(!door.open&&door.l.position.x!==1.65){door.l.position.x=1.65;door.r.position.x=-1.65;door.seam.visible=true;}
    lockBarriers.warden.on=LOCKS.warden&&P.z>92;lockBarriers.upper.on=LOCKS.upper;
    for(const b of barriers){b.a=damp(b.a,b.on?1:0,5,rdt);b.m.visible=b.a>.01;b.m.material.uniforms.uA.value=b.a;b.m.material.uniforms.uT.value=this.rt;b.m.material.uniforms.uPl.value.copy(P);}
    if(this.state==='play'&&!this.inCombat){
      for(const c of CHECKPOINTS)if(!c.hit&&hypot(P.x-c.x,P.z-c.z)<3.5&&abs(p.gy-c.y)<1){c.hit=true;this.cp={x:c.x,y:c.y,z:c.z,yaw:p.yaw};this.msg('','CHECKPOINT',1.6);}
    }
    for(const k of pickups){if(k.taken)continue;k.m.rotation.y+=rdt*2;k.m.position.y=k.y+1.1+sin(this.rt*2.4+k.x)*.12;
      if(this.state==='play'&&p.hp<100&&hypot(P.x-k.x,P.z-k.z)<1.4&&abs(P.y-k.y)<2){k.taken=true;k.m.visible=false;p.hp=min(100,p.hp+40);sfx.pickup();_a.set(k.x,k.y+1.1,k.z);fx.embers(k.x,k.y+1,k.z,30,[.6,3,1.6],.4);fx.glint(_a,0x4dffb0,3,1.3,.2);fx.flash(_a,0x4dffb0,60,.3);this.msg('','VITALITY RESTORED',1.4);}}
    // lightning strikes
    for(let i=this.strikes.length-1;i>=0;i--){const s=this.strikes[i];s.t-=wdt;if(s.t>0)continue;this.strikes.splice(i,1);fx.bolt(s.pos.x,s.pos.y,s.pos.z);this.storm.flash=max(this.storm.flash,.7);
      if(this.state==='play'&&hypot(P.x-s.pos.x,P.z-s.pos.z)<s.r&&P.y-s.pos.y<2.6)p.takeHit(s.dmg,s);}
    // roof weather
    const st=this.storm,out=P.z>258;rain.m.visible=out;st.flash=max(0,st.flash-rdt*2.4);
    if(out){rain.update(rdt,camera.position.x,AREA.roof.y-1,camera.position.z);st.next-=rdt;
      if(st.next<=0){st.next=rand(4,9);st.flash=max(st.flash,rand(.5,1));sfx.thunder(.45);}}
    sky.material.uniforms.uT.value=this.rt;sky.material.uniforms.uF.value=st.flash;moon.intensity=2.1+st.flash*5;hemi.intensity=.75+st.flash*1.3;
    updateLights(P.x,P.y,P.z);fx.parts.floor=p.gy;TIMEU.value=this.rt;for(const s of spinners)s.g.rotation.x+=s.speed*rdt;
    dust.position.set(Math.round(P.x/10)*10+sin(this.rt*.13)*.4,p.gy+sin(this.rt*.2)*.3,Math.round(P.z/10)*10);
  },
  updateHud(dt){
    const p=this.player,h=this.hud,s=this.style;
    const hp=p.hp/100;if(h.hp!==hp){h.hp=hp;el.hpf.style.transform=el.hpl.style.transform=`scaleX(${hp})`;el.hpn.textContent=Math.ceil(p.hp);el.hpw.classList.toggle('low',hp<.25&&hp>0);}
    const r=s.m<=0?-1:min(4,floor(s.m/100));
    if(r!==s.rank){const up=r>s.rank;   // going up: the letter punches in with a streak across the block; going down: a quick grey drop
      if(r>=0){el.rank.textContent=RANKS[r];el.rword.textContent=RWORD[r];const st=el.style.style;st.setProperty('--rc',RCOL[r]);st.setProperty('--rd',RDK[r]);st.setProperty('--rs',RSZ[r]+'px');
        el.rank.className='';el.style.className='on r'+r;void el.rank.offsetWidth;el.rank.className=up?'pop':'drop';if(up){el.style.classList.add('up');if(r>0)sfx.rankUp(r);}}
      else el.style.className='';
      s.rank=r;s.peak=max(s.peak,r);}
    if(r>=0){const f=((r>=4?min(100,s.m-400):s.m%100)|0);if(h.sm!==f){h.sm=f;el.smf.style.width=f+'%';}}
    const c=this.combo>1?this.combo:0;if(h.c!==c){const inc=c>h.c;h.c=c;el.combo.innerHTML=c?`${c}<small>HITS</small>`:'';if(inc){el.combo.className='';void el.combo.offsetWidth;el.combo.className='hit';}}
    if(this.msgT>0){this.msgT-=dt;if(this.msgT<=0){el.msg.classList.remove('on');el.sub.classList.remove('on');}}
    if(this.callT>0){this.callT-=dt;if(this.callT<=0)el.call.classList.remove('on');}
    if(this.hintT>0){this.hintT-=dt;if(this.hintT<=0)el.hint.classList.add('gone');}else if(!this.hinted&&this.state==='play'&&(MV.mag>0||input.buf)){this.hinted=true;this.hintT=8;}   // key hints leave 8 s after the first input
    if(h.w!==p.set){h.w=p.set;[...el.wsel.children].forEach((n,i)=>n.classList.toggle('on',i===p.set));}
    const b=this.boss&&!this.boss.gone?this.boss:null;
    if(h.boss!==b){h.boss=b;el.boss.classList.toggle('on',!!b);el.hud.classList.toggle('boss',!!b);if(b)el.bossN.textContent=b.name;}
    if(b){const f=(max(0,b.hp/b.maxHp)*100).toFixed(1),a=(b.armor>0?b.armor/b.maxArmor*100:0).toFixed(0);if(h.bf!==f){h.bf=f;el.bossF.style.width=f+'%';}if(h.ba!==a){h.ba=a;el.bossA.style.width=a+'%';}}
    const tg=this.lock;let on=false;
    if(tg&&!tg.dead&&!tg.boss&&this.inCombat&&this.state==='play'){tg.hitPos(_a,0,0);_a.project(camera);
      if(_a.z<1){on=true;el.ret.style.transform=`translate(${((_a.x*.5+.5)*innerWidth/HUDZ).toFixed(1)}px,${((-_a.y*.5+.5)*innerHeight/HUDZ).toFixed(1)}px)`;el.thp.style.width=(max(0,tg.hp/tg.maxHp)*100).toFixed(0)+'%';}}
    if(h.ret!==on){h.ret=on;el.ret.classList.toggle('on',on);}
  },
  update(rdt){
    this.rt+=rdt;pollPad(rdt);const p=this.player,play=this.state==='play';
    if(this.state==='title')p.yaw=p.pyaw=2.25;   // the title shot: the hero turned three-quarters toward the camera
    let ws=1,ps=1;
    if(this.hitstop>0){this.hitstop-=rdt;ws=ps=.03;}
    else if(this.slowT>0){this.slowT-=rdt;if(this.slowKind==='dodge'){ws=.22;ps=.95;}else ws=ps=.2;if(this.slowT<=0)sfx.slow(false);}
    const pdt=rdt*ps,wdt=rdt*ws;
    if(play)this.runT+=rdt;
    p.update(pdt);
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
      if(!(this.hard&&this.lock&&!this.lock.dead)){const t=this.pickTargetFree(p.yaw,this.boss?60:11);if(this.hard&&!t){this.hard=false;el.ret.classList.remove('hard');}this.lock=t;}
      if(this.endT>0){this.endT-=rdt;if(this.endT<=0)this.finish();}
    }
    this.updateWorld(rdt,wdt);
    fx.update(wdt,rdt);fx.update2(wdt,rdt);cam.update(rdt);this.updateHud(rdt);
    if(this.state==='title'){const P=p.pos,s=sin(this.rt*.11);camera.position.set(P.x+1+s*.14,P.y+.6,P.z-2.7);camera.lookAt(P.x+1.55+s*.1,P.y+1.22,P.z+2);}   // low and close, the hero on the right third, the corridor behind
    // screen treatment (see the grade pass): exposure dips on hit-stop (the frame gets darker and crisper, the hit mark carries it)
    // and drops a full stop for the two frames that open a finisher; bloom is reined in while fighting
    this.dmgT+=rdt;this.dark=max(0,this.dark-rdt);this.expK=damp(this.expK,this.hitstop>0?1:0,this.hitstop>0?60:14,rdt);
    const u=grade.uniforms,dt_=this.dmgT;u.uT.value=this.rt;u.uAb.value=min(1,cam.ab/.014);u.uDmg.value=dt_<.06?dt_/.06:max(0,1-(dt_-.06)/.3);u.uDir.value.copy(this.dmgDir);
    u.uLow.value=p.hp<25&&p.hp>0&&play?.5+.5*sin(this.rt*TAU*1.5):0;u.uFlash.value=this.storm.flash*.05;u.uExp.value=2.05*pow(2,-.3*this.expK-(this.dark>.001?1:0));
    u.uSlow.value=damp(u.uSlow.value,this.slowT>0&&this.hitstop<=0&&this.dark<=.001?1:0,12,rdt);bloom.strength=damp(bloom.strength,this.inCombat?.4:.52,3,rdt);
    heroMats.glow.color.copy(HERO_GLOW).multiplyScalar(1+u.uSlow.value*.8);   // in slow motion the hero's lights are the brightest saturated thing on screen
    sfx.tick(this.inCombat&&this.state!=='dead',max(0,this.style.rank,this.boss?2:0),rdt);
  }
};
G.player=new Player();
window.G=G;window.onAction=onAction;window.cam=cam;window.fx=fx;window.T3={scene,camera,renderer,bloom};window.DBG={keys,held,input,MOVES,door,ENCS,AREA,LOCKS,orbs,waves,CL,WEAPONS,walkable,groundAt};
window.step=(n=1,dt=1/60)=>{for(let i=0;i<n;i++)G.update(dt);composer.render();};

function resize(){
  const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);
  camera.aspect=w/h;camera.updateProjectionMatrix();HUDZ=clamp(h/720,.8,2);el.hud.style.zoom=HUDZ;fx.parts.mat.uniforms.uS.value=fx.dust.mat.uniforms.uS.value=h*renderer.getPixelRatio()/(2*Math.tan(camera.fov*PI/360));
}
addEventListener('resize',resize);resize();
// compile every pooled effect shader now (rings, marks, warnings, afterimages ...), not in the middle of the first fight
{const m=new THREE.Mesh(GS,fx.ghosts[0].mat);m.visible=false;scene.add(m);renderer.setRenderTarget(composer.renderTarget1);renderer.compile(scene,camera);renderer.setRenderTarget(null);scene.remove(m);}
// the controls panel: C toggles it on the title, and shows it for as long as it is held in play
addEventListener('keydown',e=>{if(e.code!=='KeyC'||e.repeat)return;if(G.state==='title')el.keys.classList.toggle('off');else el.keys.classList.remove('off');});
addEventListener('keyup',e=>{if(e.code==='KeyC'&&G.state!=='title')el.keys.classList.add('off');});
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const rdt=min(.05,max(.001,(now-last)/1000))*(G.ts??1);last=now;if(rdt>0)G.update(rdt);composer.render();}
requestAnimationFrame(frame);
