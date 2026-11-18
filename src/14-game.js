// ===================== GAME =====================
const RANKS=['D','C','B','A','S'],RWORD=['DULL','CRISP','BRUTAL','ARTFUL','SUBLIME'],RCOL=['#8fa3b5','#4fd8ff','#6dffb0','#ffd24a','#ff6a2a'];
const el={};for(const id of ['hud','hpf','hpl','style','rank','rword','smf','combo','msg','sub','ret','thp','title','end','endT','endR','endS','endGo','wsel','boss','bossN','bossF','bossA'])el[id]=$(id);
const G={
  state:'title',rt:0,hitstop:0,slowT:0,slowKind:'',enemies:[],tokens:0,maxTokens:1,combo:0,comboT:0,maxCombo:0,dmgTaken:0,runT:0,dmgFx:0,flash:0,deaths:0,
  style:{m:0,last:[],rank:-1,peak:-1,idle:0},enc:null,lock:null,hard:false,inCombat:false,player:null,boss:null,msgT:0,hud:{},
  cp:{x:0,y:0,z:7,yaw:0},strikes:[],storm:{flash:0,next:3},endT:0,cineT:0,
  start(){sfx.init();this.state='play';el.title.classList.add('off');el.hud.classList.add('on');lockPtr();cam.dist=5.3;cam.side=0;cam.pitch=.2;cam.yaw=0;sfx.boom();this.msg('','REACH THE GATE',3);},
  // ---------- resets ----------
  resetCombat(){
    for(const e of this.enemies)if(!e.gone)e.remove();
    this.enemies=[];this.tokens=0;orbs.clear();waves.clear();fx.clearMarks();this.strikes.length=0;
    if(this.enc)for(const b of this.enc.def.bars)b.on=false;
    Object.assign(this,{enc:null,inCombat:false,boss:null,lock:null,hard:false,hitstop:0,slowT:0,dmgFx:0,cineT:0});sfx.slow(false);document.body.classList.remove('cine');el.ret.classList.remove('hard');
  },
  placePlayer(c){
    const p=this.player;p.pos.set(c.x,c.y,c.z);p.prev.copy(p.pos);p.gy=c.y;p.vel.set(0,0,0);p.yaw=c.yaw||0;p.hp=100;p.state='move';p.grounded=true;p.invuln=1.5;p.rig.root.visible=true;p.rig.play(CL.idle,.1,true);
    cam.yaw=p.yaw;cam.pitch=.2;cam.focus.set(c.x,c.y+1.45,c.z);input.clear();
  },
  showPlay(){el.end.classList.add('off');el.hud.classList.add('on');this.state='play';lockPtr();},
  respawn(){this.resetCombat();this.placePlayer(this.cp);Object.assign(this.style,{m:0,last:[],rank:-1,idle:0});this.combo=0;this.deaths++;this.showPlay();},
  reset(){
    this.resetCombat();for(const d of ENCS)d.done=false;for(const c of CHECKPOINTS)c.hit=false;Object.assign(LOCKS,{gate:true,warden:true,upper:true});door.open=false;door.k=0;
    for(const k of pickups){k.taken=false;k.m.visible=true;}
    this.cp={x:0,y:0,z:7,yaw:0};Object.assign(this,{combo:0,maxCombo:0,dmgTaken:0,runT:0,deaths:0,endT:0});Object.assign(this.style,{m:0,last:[],rank:-1,peak:-1,idle:0});
    this.placePlayer(this.cp);this.showPlay();
  },
  msg(t,s,dur=2.4){el.msg.textContent=t;el.sub.textContent=s||'';el.msg.classList.toggle('on',!!t);el.sub.classList.toggle('on',!!s);this.msgT=dur;},
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
    for(const e of this.enemies){
      if(e.dead||e.ghost)continue;const dx=e.pos.x-p.pos.x,dz=e.pos.z-p.pos.z,d=hypot(dx,dz);
      if(d>range+e.radius)continue;if(abs(e.cy()-(p.pos.y+1))>(h.h??2.4))continue;
      if(d>1.1+e.radius&&arc<6&&abs(wrapA(atan2(dx,dz)-p.yaw))>arc/2)continue;
      const ux=d>.05?dx/d:fwx,uz=d>.05?dz/d:fwz;any=true;
      fx.hit(e.hitPos(_b,ux,uz),ux,uz,!!h.big,rand(-.6,.6));
      e.takeHit(h,ux,uz);
    }
    for(const o of orbs.list.slice()){
      if(o.back)continue;const dx=o.pos.x-p.pos.x,dz=o.pos.z-p.pos.z,d=hypot(dx,dz);
      if(d>range+.7||abs(o.pos.y-(p.pos.y+1))>2.3)continue;if(d>1.1&&arc<6&&abs(wrapA(atan2(dx,dz)-p.yaw))>arc/2+.25)continue;
      orbs.deflect(o);any=true;this.addStyle('DEFLECT',16);
    }
    if(any){this.hitstop=max(this.hitstop,h.stop??.05);cam.shake(h.shake??.18);cam.ab=max(cam.ab,h.big?.014:.006);sfx.hit(h.big?.9:.35);
      this.combo++;this.comboT=0;this.maxCombo=max(this.maxCombo,this.combo);this.addStyle(m.id,(h.pts??10)*(p.grounded?1:1.25));if(h.big)this.flash=.07;}
    return any;
  },
  addStyle(id,pts){const s=this.style,rep=s.last.filter(x=>x===id).length;s.m=min(520,s.m+pts*[1,.45,.2,.08,.04][rep]);s.last.push(id);if(s.last.length>4)s.last.shift();s.idle=0;},
  gunScore(){this.combo++;this.comboT=0;this.maxCombo=max(this.maxCombo,this.combo);this.addStyle('GUN',3);},
  onBreak(e){this.hitstop=max(this.hitstop,.14);this.flash=.2;this.style.m=min(520,this.style.m+35);this.style.idle=0;sfx.armorBreak();cam.shake(.5);this.msg('',e.boss?'STAGGERED':'ARMOUR BROKEN',1.4);},
  onKill(e){
    this.style.m=min(520,this.style.m+12);if(this.lock===e)this.lock=null;
    if(e.boss){
      this.slowT=1.7;this.slowKind='fin';this.flash=.35;cam.zoom=1.6;sfx.boom();sfx.slow(true);document.body.classList.add('cine');
      for(const o of this.enemies)if(o!==e&&!o.dead)o.die();orbs.clear();waves.clear();this.strikes.length=0;fx.clearMarks();return;
    }
    const left=this.enemies.some(x=>!x.dead),en=this.enc;
    if(!left&&en&&!en.def.boss&&en.wave>=en.def.waves.length-1){this.slowT=1.1;this.slowKind='fin';this.flash=.3;cam.zoom=1.6;sfx.boom();sfx.slow(true);document.body.classList.add('cine');}
  },
  perfectDodge(src){
    this.slowT=1.3;this.slowKind='dodge';sfx.slow(true);this.style.m=min(520,this.style.m+40);this.style.idle=0;this.flash=.12;this.msg('','PERFECT DODGE',1.1);
    const o=src&&(src.owner||src);if(o&&o.onPerfect)o.onPerfect();
  },
  onDeath(){
    this.state='dead';this.slowT=1.2;this.slowKind='fin';sfx.slow(true);sfx.boom();
    setTimeout(()=>{if(this.state!=='dead')return;el.endT.textContent='FALLEN';el.endR.textContent='';el.endS.innerHTML='';el.endGo.textContent='PRESS R TO RETRY FROM THE LAST CHECKPOINT';
      el.end.classList.remove('off');el.hud.classList.remove('on');if(document.exitPointerLock)document.exitPointerLock();},1700);
  },
  strike(x,z,y,delay,r,dmg,owner){
    fx.disc(x,y,z,r,delay,0x9fc8ff);fx.rings.spawn(x,y+.07,z,0x9fc8ff,3,r,.4,delay);this.strikes.push({pos:V(x,y,z),t:delay,r,dmg,owner,dodged:false});
  },
  finish(){
    this.state='done';const s=clamp(100-this.dmgTaken*.22+min(40,this.maxCombo*.5)+(this.style.peak+1)*6-this.deaths*12,0,200);
    const r=s>=120?'S':s>=100?'A':s>=80?'B':s>=60?'C':'D',mm=floor(this.runT/60),ss=floor(this.runT%60);
    el.endT.textContent='THE STORM BREAKS';el.endR.textContent=r;el.endGo.textContent='PRESS R TO PLAY AGAIN';
    el.endS.innerHTML=`<b>TIME</b><span>${mm}:${ss<10?'0':''}${ss}</span><b>LONGEST COMBO</b><span>${this.maxCombo} hits</span><b>PEAK STYLE</b><span>${this.style.peak>=0?RWORD[this.style.peak]:'&mdash;'}</span><b>DAMAGE TAKEN</b><span>${this.dmgTaken}</span><b>DEFEATS</b><span>${this.deaths}</span>`;
    el.end.classList.remove('off');el.hud.classList.remove('on');if(document.exitPointerLock)document.exitPointerLock();sfx.boom();
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
        if(d.boss){const b=this.boss=d.boss==='warden'?new Warden(d):new Stormvane(d);this.enemies.push(b);this.msg(b.name,'',3);document.body.classList.add('cine');this.cineT=d.boss==='storm'?4.6:2.6;sfx.boom();sfx.roar();}
        else{this.spawnWave();this.msg('SEALED','CUT THEM DOWN',2.2);}
        break;
      }
      return;
    }
    const en=this.enc,d=en.def;
    if(this.cineT>0){this.cineT-=dt;if(this.cineT<=0&&this.slowT<=0)document.body.classList.remove('cine');}
    if(!d.boss&&en.wave<d.waves.length-1){
      if(!this.enemies.some(e=>!e.dead)){en.wave++;this.spawnWave();sfx.barrier();this.msg('','WAVE '+(en.wave+1)+' OF '+d.waves.length,1.8);}
    }else if(this.enemies.length===0&&this.slowT<=0){
      for(const b of d.bars)b.on=false;d.done=true;this.enc=null;this.inCombat=false;this.hard=false;this.boss=null;el.ret.classList.remove('hard');
      p.hp=min(100,p.hp+(d.boss?100:30));sfx.barrier();document.body.classList.remove('cine');this.cp={x:p.pos.x,y:p.gy,z:p.pos.z,yaw:p.yaw};
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
    for(const b of barriers){b.a=damp(b.a,b.on?1:0,5,rdt);b.m.visible=b.a>.01;b.m.material.uniforms.uA.value=b.a;b.m.material.uniforms.uT.value=this.rt;}
    if(this.state==='play'&&!this.inCombat){
      for(const c of CHECKPOINTS)if(!c.hit&&hypot(P.x-c.x,P.z-c.z)<3.5&&abs(p.gy-c.y)<1){c.hit=true;this.cp={x:c.x,y:c.y,z:c.z,yaw:p.yaw};this.msg('','CHECKPOINT',1.6);}
    }
    for(const k of pickups){if(k.taken)continue;k.m.rotation.y+=rdt*2;k.m.position.y=k.y+1.1+sin(this.rt*2.4+k.x)*.12;
      if(this.state==='play'&&p.hp<100&&hypot(P.x-k.x,P.z-k.z)<1.4&&abs(P.y-k.y)<2){k.taken=true;k.m.visible=false;p.hp=min(100,p.hp+40);sfx.pickup();_a.set(k.x,k.y+1.1,k.z);fx.embers(k.x,k.y+1,k.z,30,[.6,3,1.6],.4);fx.flash(_a,0x4dffb0,60,.3);this.msg('','VITALITY RESTORED',1.4);}}
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
    const hp=p.hp/100;if(h.hp!==hp){h.hp=hp;el.hpf.style.transform=el.hpl.style.transform=`scaleX(${hp})`;}
    const r=s.m<=0?-1:min(4,floor(s.m/100));
    if(r!==s.rank){if(r>s.rank&&r>=0){el.rank.classList.remove('pop');void el.rank.offsetWidth;el.rank.classList.add('pop');if(r>0)sfx.rankUp(r);}
      s.rank=r;s.peak=max(s.peak,r);el.style.classList.toggle('on',r>=0);if(r>=0){el.rank.textContent=RANKS[r];el.rword.textContent=RWORD[r];el.style.style.setProperty('--rc',RCOL[r]);}}
    if(r>=0){const f=((r>=4?min(100,s.m-400):s.m%100)|0);if(h.sm!==f){h.sm=f;el.smf.style.width=f+'%';}}
    const c=this.combo>1?this.combo:0;if(h.c!==c){h.c=c;el.combo.innerHTML=c?`${c}<small>HITS</small>`:'';}
    if(this.msgT>0){this.msgT-=dt;if(this.msgT<=0){el.msg.classList.remove('on');el.sub.classList.remove('on');}}
    if(h.w!==p.set){h.w=p.set;[...el.wsel.children].forEach((n,i)=>n.classList.toggle('on',i===p.set));}
    const b=this.boss&&!this.boss.gone?this.boss:null;
    if(h.boss!==b){h.boss=b;el.boss.classList.toggle('on',!!b);if(b)el.bossN.textContent=b.name;}
    if(b){const f=(max(0,b.hp/b.maxHp)*100).toFixed(1),a=(b.armor>0?b.armor/b.maxArmor*100:0).toFixed(0);if(h.bf!==f){h.bf=f;el.bossF.style.width=f+'%';}if(h.ba!==a){h.ba=a;el.bossA.style.width=a+'%';}}
    const tg=this.lock;let on=false;
    if(tg&&!tg.dead&&!tg.boss&&this.inCombat&&this.state==='play'){tg.hitPos(_a,0,0);_a.project(camera);
      if(_a.z<1){on=true;el.ret.style.transform=`translate(${((_a.x*.5+.5)*innerWidth).toFixed(1)}px,${((-_a.y*.5+.5)*innerHeight).toFixed(1)}px)`;el.thp.style.width=(max(0,tg.hp/tg.maxHp)*100).toFixed(0)+'%';}}
    if(h.ret!==on){h.ret=on;el.ret.classList.toggle('on',on);}
  },
  update(rdt){
    this.rt+=rdt;pollPad(rdt);const p=this.player,play=this.state==='play';
    if(this.state==='title'){cam.yaw=.5+sin(this.rt*.13)*.1;cam.pitch=.07;cam.dist=3.9;cam.side=-1.35;}
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
    this.dmgFx=max(0,this.dmgFx-rdt*1.6);this.flash=max(0,this.flash-rdt*1.2);
    const u=grade.uniforms;u.uT.value=this.rt;u.uAb.value=cam.ab;u.uDmg.value=this.dmgFx+(p.hp<30&&play?.25+.15*sin(this.rt*5):0);u.uFlash.value=this.flash+this.storm.flash*.05;
    u.uSlow.value=damp(u.uSlow.value,this.slowT>0&&this.hitstop<=0?1:0,10,rdt);
    sfx.tick(this.inCombat&&this.state!=='dead',max(0,this.style.rank,this.boss?2:0),rdt);
  }
};
G.player=new Player();
window.G=G;window.onAction=onAction;window.cam=cam;window.fx=fx;window.T3={scene,camera,renderer,bloom};window.DBG={keys,held,input,MOVES,door,ENCS,AREA,LOCKS,orbs,waves};
window.step=(n=1,dt=1/60)=>{for(let i=0;i<n;i++)G.update(dt);composer.render();};

function resize(){
  const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);
  camera.aspect=w/h;camera.updateProjectionMatrix();fx.parts.mat.uniforms.uS.value=h*renderer.getPixelRatio()/(2*Math.tan(camera.fov*PI/360));
}
addEventListener('resize',resize);resize();
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const rdt=min(.05,max(.001,(now-last)/1000))*(G.ts??1);last=now;if(rdt>0)G.update(rdt);composer.render();}
requestAnimationFrame(frame);
