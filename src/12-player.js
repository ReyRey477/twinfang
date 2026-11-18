// ===================== PLAYER =====================
const MAUL_TR=[.34,1.26];   // the maul's ribbon runs from the upper shaft over the head: about a metre wide, like the sword's
class Player{
  constructor(){
    this.pos=V(0,0,7);this.prev=V(0,0,7);this.vel=V();this.yaw=0;this.pyaw=0;this.hp=100;this.state='move';this.t=0;this.grounded=true;this.gy=0;
    this.invuln=0;this.dodgeCd=0;this.airActs=0;this.airDash=false;this.dj=false;this.stepI=0;this.trailOn=0;this.trAcc=0;this.move=null;this.target=null;
    this.set=0;this.wantSet=0;this.gunCd=0;this.aimT=0;this.aimP=V();this.gunAir=0;this.charge=0;this.smash=0;this.ready=false;
    this.rig=new Rig({kind:'hero',mats:heroMats});scene.add(this.rig.root);this.rig.play(CL.idle,0);
    this.rig.post=(o,clip)=>{if(clip.loco)stance(o,clip.loco,this.set,this.rig);};
    this.trails=[new Trail(20,WCOL[0]),new Trail(20,WCOL[0])];
    this.light=new THREE.PointLight(0x58d8ff,3.2,8,2);scene.add(this.light);
  }
  angTo(e){return atan2(e.pos.x-this.pos.x,e.pos.z-this.pos.z);}
  distTo(e){return hypot(e.pos.x-this.pos.x,e.pos.z-this.pos.z);}
  // ---------- movement against the level ----------
  ok(x,z,arena){if(arena){const r=G.enc.def.ar;if(x<r.x0-.2||x>r.x1+.2||z<r.z0-.2||z>r.z1+.2)return false;}return walkable(x,z);}
  moveTo(nx,nz){
    const ar=!!G.enc&&this.ok(this.pos.x,this.pos.z,true);
    if(this.ok(nx,nz,ar)){this.pos.x=nx;this.pos.z=nz;}else if(this.ok(nx,this.pos.z,ar))this.pos.x=nx;else if(this.ok(this.pos.x,nz,ar))this.pos.z=nz;
  }
  nudge(dx,dz){this.moveTo(this.pos.x+dx,this.pos.z+dz);}
  // ---------- actions ----------
  switchSet(i){
    this.set=i;this.rig.setWeapon(i);this.trails[1].mesh.material.uniforms.uC.value.setHex(WCOL[i]);
    _a.set(0,.5,0);this.rig.sword[1].localToWorld(_a);if(_a.distanceTo(this.pos)>4)_a.copy(this.pos).setY(this.pos.y+1.2);
    fx.glint(_a,WCOL[i],3,1.2,.16);sfx.swap();
  }
  jump(){this.vel.y=11.8;this.grounded=false;this.pos.y=this.gy+.02;this.state='air';this.t=0;sfx.jump();fx.puff(this.pos.x,this.pos.z,6,.5,this.gy);}
  heavyIn(){if(this.set===1){if(held.heavy||input.peek('heavy')){input.take('heavy');this.shoot();}return false;}return input.take('heavy');}
  heavy(mv){
    const W=WEAPONS[this.set];if(!this.grounded)return this.startMove(W.airHeavy);
    if(this.set===2)return this.startMove('MCH');
    const tg=G.pickTarget(mv.mag>.3?atan2(mv.x,mv.z):this.yaw);this.startMove(tg&&this.distTo(tg)>4.6?'RUSH':'LAUNCH');
  }
  dodge(mv){
    this.state='dodge';this.t=0;this.dodgeCd=.5;
    if(mv.mag>.2){this.yaw=atan2(mv.x,mv.z);this.ddx=mv.x;this.ddz=mv.z;this.rig.play(CL.dash,.05,true);}
    else{this.ddx=-sin(this.yaw);this.ddz=-cos(this.yaw);this.rig.play(CL.back,.05,true);}
    if(!this.grounded)this.vel.y=2;else fx.puff(this.pos.x,this.pos.z,8,.6,this.gy);
    sfx.dodge();cam.fovKick=7;
    // an afterimage where the hero stood (two more follow 40 ms apart, see update) and a kick of sparks; the thruster streaks ride the back vents for four frames
    this.gN=1;fx.ghost(this.rig.root,0x58d8ff);_a.set(this.pos.x-this.ddx*.3,this.pos.y+1.32,this.pos.z-this.ddz*.3);
    fx.sparks(_a,-this.ddx,.05,-this.ddz,8,[.6,2.4,3.4],8,.3);fx.flash(_a,0x58d8ff,24,.1);
  }
  shoot(){
    if(this.gunCd>0)return;this.gunCd=.17;this.aimT=.45;
    const tg=G.pickTarget(this.yaw,42);let orb=null,od=9;
    for(const o of orbs.list){if(o.back)continue;const d=o.pos.distanceTo(this.pos);if(d<od){od=d;orb=o;}}
    const aim=this.aimP;let hit=0;
    if(orb&&(!tg||od<6)){aim.copy(orb.pos);hit=1;}else if(tg){aim.set(tg.pos.x,tg.cy(),tg.pos.z);hit=2;}
    else aim.set(this.pos.x+sin(this.yaw)*30,this.pos.y+1.3,this.pos.z+cos(this.yaw)*30);
    const a=atan2(aim.x-this.pos.x,aim.z-this.pos.z);if(abs(wrapA(a-this.yaw))>1.5&&(this.state==='move'||this.state==='air'))this.yaw=a;
    _c.set(0,.26,-.056);this.rig.sword[0].localToWorld(_c);if(_c.distanceTo(this.pos)>3)_c.set(this.pos.x,this.pos.y+1.4,this.pos.z);
    fx.tracer(_c,aim,hit===2);sfx.gun();cam.shake(.05);if(hit===2){tg._hk=.7;tg._hc=WCOL[0];}   // the target's rim answers the shot in the pistol's cyan
    if(hit===1){orbs.kill(orb);G.gunScore();}
    else if(hit===2&&tg.gunHit())G.gunScore();
    if(!this.grounded&&this.gunAir<10){this.gunAir++;this.vel.y=max(this.vel.y,1.6);}
  }
  startMove(id){
    const m=MOVES[id];if(!m)return;
    this.state='attack';this.move=m;this.t=0;this.hitIdx=0;this.swIdx=0;this.hitAny=false;this.rose=false;this.rushHit=false;this.glint=false;this.lspd=0;
    if(m.charge){this.charge=0;this.ready=false;}
    const mv=input.move(),pref=mv.mag>.3?atan2(mv.x,mv.z):this.yaw,tg=this.target=G.pickTarget(pref);
    if(tg){this.yaw=turnTo(this.yaw,this.angTo(tg),2.4);if(m.lunge)this.lspd=clamp(this.distTo(tg)-(1.3+tg.radius),0,m.lunge[2])/(m.lunge[1]-m.lunge[0]);}
    else{if(mv.mag>.3)this.yaw=pref;if(m.lunge)this.lspd=m.lunge[2]*.3/(m.lunge[1]-m.lunge[0]);}
    if(!this.grounded&&!m.dive){this.airActs++;this.vel.y=max(this.vel.y,this.airActs===1?3:.8);
      if(tg&&tg.air){const ty=tg.kind==='lantern'?tg.pos.y-1.1:min(tg.pos.y,this.gy+3.2);if(ty-this.pos.y<3)this.vel.y=clamp((ty-this.pos.y+.1)*6,-3,5);}}
    this.rig.play(m.clip,.05,true);
  }
  onLand(){
    this.airActs=0;this.airDash=false;this.dj=false;this.gunAir=0;const gy=this.gy;
    if(this.state==='attack'&&this.move.dive){
      const maul=this.move.land==='MPOUNDLAND',c=0x9fe8ff;   // the hero's marks on the floor are always the hero's cyan-white
      this.startMove(this.move.land);fx.slam(this.pos.x,gy,this.pos.z,maul?5:4,c,maul,true);_a.set(this.pos.x,gy+.3,this.pos.z);fx.flash(_a,c,90,.16);sfx.land(1);cam.shake(.4);
    }else if(this.state==='air'){this.state='move';sfx.land(.2);fx.puff(this.pos.x,this.pos.z,6,.5,gy);}
  }
  takeHit(dmg,e){
    if(this.state==='dead'||G.state!=='play')return false;
    if(this.state==='dodge'&&this.t<.3){if(!e.dodged){e.dodged=true;G.perfectDodge(e);}return false;}
    if(this.invuln>0)return false;
    this.hp=max(0,this.hp-dmg);G.dmgTaken+=dmg;this.invuln=1.1;const a=atan2(this.pos.x-e.pos.x,this.pos.z-e.pos.z);this.vel.x=sin(a)*8;this.vel.z=cos(a)*8;this.yaw=a+PI;
    cam.shake(.5);G.hurtFx(e.pos);sfx.hurt();G.style.m=max(0,G.style.m-200);G.combo=0;_a.copy(this.pos);_a.y+=1.1;fx.hit(_a,sin(a),cos(a),false,null,0xff3a28,{lvl:1});
    if(this.hp<=0){this.state='dead';this.t=0;this.rig.play(CL.dead,.06,true);G.onDeath();}
    else{this.state='hurt';this.t=0;this.rig.play(CL.hurt,.04,true);}
    return true;
  }
  updAttack(dt,mv){
    const m=this.move,t=this.t,tg=this.target,W=WEAPONS[this.set];
    if(tg&&!tg.dead&&t<(m.track??.12))this.yaw=turnTo(this.yaw,this.angTo(tg),(m.charge?4:14)*dt);
    const fwx=sin(this.yaw),fwz=cos(this.yaw),e14=exp(-14*dt);
    if(m.charge){   // maul: hold to charge, release to smash
      this.vel.x*=e14;this.vel.z*=e14;this.charge=sat(t/1);
      _a.set(0,.98,0);this.rig.sword[1].localToWorld(_a);
      if(random()<dt*(20+this.charge*60)){const a=rand(TAU),r=rand(.8,1.6);fx.parts.spawn(_a.x+cos(a)*r,_a.y+rand(-.8,.8),_a.z+sin(a)*r,-cos(a)*r*3,0,-sin(a)*r*3,3.2,1.8,.6,rand(.05,.12),.33);}
      if(this.charge>=1&&!this.ready){this.ready=true;sfx.ready();fx.glint(_a,0xffc070,4,1.7,.2);fx.flash(_a,0xffb060,45,.16);}
      if(this.dodgeCd<=0&&input.take('dodge')){this.dodge(mv);return 0;}
      if((!held.heavy&&t>.1)||t>2.4){this.smash=this.charge;this.startMove('MSMASH');}
      return 0;
    }
    if(m.rush){
      if(t>=.12&&t<.36&&!this.rushHit){this.vel.x=fwx*22;this.vel.z=fwz*22;cam.fovKick=max(cam.fovKick,8);if(G.playerHit(m,m.hits[0])){this.rushHit=true;this.hitAny=true;}}
      else{this.vel.x*=e14;this.vel.z*=e14;}
    }else if(m.dive){
      if(t<.2){this.vel.y=3.5;if(tg&&!tg.dead){const s=min(9,this.distTo(tg)*4);this.vel.x=fwx*s;this.vel.z=fwz*s;}else{this.vel.x*=e14;this.vel.z*=e14;}}
      else{this.vel.y=-32;this.vel.x*=e14;this.vel.z*=e14;}
    }else if(m.lunge&&t>=m.lunge[0]&&t<m.lunge[1]){this.vel.x=fwx*this.lspd;this.vel.z=fwz*this.lspd;}
    else{this.vel.x*=e14;this.vel.z*=e14;}
    while(!m.rush&&this.hitIdx<m.hits.length&&t>=m.hits[this.hitIdx].t){
      let h=m.hits[this.hitIdx++];const full=m.id==='MSMASH'&&this.smash>=1;
      if(m.id==='MSMASH')h=Object.assign({},h,{dmg:20+34*this.smash,breaker:full,range:full?4.4:3.6,arc:full?7:2.6,pts:full?30:20});
      if(h.ring){const x=this.pos.x+fwx*2,z=this.pos.z+fwz*2,gy=this.gy;fx.slam(x,gy,z,full?6:3.6,0x9fe8ff,true,true);
        _a.set(x,gy+.3,z);fx.flash(_a,0x9fe8ff,full?120:70,.16);sfx.land(full?1:.7);cam.shake(full?.5:.25);if(full)sfx.boom();}
      if(G.playerHit(m,h))this.hitAny=true;
    }
    while(m.sw&&this.swIdx<m.sw.length&&t>=m.sw[this.swIdx]){sfx.whoosh((m.pitch||1)*rand(.92,1.12),m.big?1.3:1);this.swIdx++;}
    if(m.rise&&!this.rose&&t>=.19&&this.hitAny&&held[m.rise]){this.rose=true;this.vel.y=12.6;this.grounded=false;this.pos.y=this.gy+.02;}
    if(m.pauseAt&&!this.glint&&t>=m.pauseAt){this.glint=true;sfx.glint();_a.set(0,1.2,0);this.rig.sword[0].localToWorld(_a);fx.glint(_a,0xbfefff,3,.9,.2,.05);}
    const tr=(t>=m.trail[0]&&t<=m.trail[1])?m.trail[2]:0;
    if(!m.dive){
      if(t>=m.cancel){
        if(input.take('dodge')){this.dodge(mv);return 0;}
        if(this.grounded&&input.take('jump')){this.jump();return 0;}
        if(input.peek('light')){
          let id=this.grounded?m.next:m.airNext;if(m.pauseAt&&t>=m.pauseAt&&this.grounded)id=m.pauseNext;
          if(this.grounded&&!id)id=W.light;if(!this.grounded&&this.airActs>=5)id=null;
          if(id){input.clear();this.startMove(id);return 0;}
        }
        if(this.set===1){if(held.heavy||input.peek('heavy')){this.state=this.grounded?'move':'air';input.take('heavy');this.shoot();return 0;}}
        else if(input.take('heavy')){this.heavy(mv);return 0;}
        if(this.grounded&&input.take('rush')){this.startMove(W.rush);return 0;}
      }else if(!m.commit&&t>.07&&!m.id.endsWith('LAND')&&this.dodgeCd<=0&&input.take('dodge')){this.dodge(mv);return 0;}
      if(this.grounded&&t>=m.free&&mv.mag>.3){this.state='move';return 0;}
    }
    if(t>=m.dur)this.state=this.grounded?'move':'air';
    return tr;
  }
  sampleTrails(dt){
    this.trAcc+=dt;if(this.trAcc<.005)return;const W=WEAPONS[this.set],td=this.trAcc;this.trAcc=0;   // every sub-step of a swing: about 180 samples a second
    for(let s=0;s<2;s++){const sw=this.rig.sword[s],tp=s&&this.set===2?MAUL_TR:W.trail[s]||[.1,.2];_a.set(0,tp[0],0);sw.localToWorld(_a);_b.set(0,tp[1],0);sw.localToWorld(_b);this.trails[s].sample(_a,_b,!!W.trail[s]&&!!(this.trailOn&(s?2:1)),td);}
  }
  update(dt){
    this.t+=dt;this.invuln-=dt;this.dodgeCd-=dt;this.gunCd-=dt;const rig=this.rig,mv=input.move();this.prev.copy(this.pos);this.pyaw=this.yaw;let trail=0;
    if(this.wantSet!==this.set&&this.state!=='dead'&&this.state!=='hurt'){
      const at=this.state==='attack';
      if(!at||this.move.charge||this.t>=min(this.move.cancel,.5)){this.switchSet(this.wantSet);if(at)this.state=this.grounded?'move':'air';}
    }
    const st=this.state,W=WEAPONS[this.set];
    if(st==='move'){
      if(mv.mag>.15){
        this.yaw=turnTo(this.yaw,atan2(mv.x,mv.z),15*dt);const sp=7.8*mv.mag;this.vel.x=damp(this.vel.x,mv.x*sp,13,dt);this.vel.z=damp(this.vel.z,mv.z*sp,13,dt);rig.play(CL.run,.12);
        rig.phase+=hypot(this.vel.x,this.vel.z)*dt*1.42;const si=floor(rig.phase/PI+.5);if(si!==this.stepI){this.stepI=si;sfx.step();}
      }else{this.vel.x=damp(this.vel.x,0,14,dt);this.vel.z=damp(this.vel.z,0,14,dt);rig.play(CL.idle,.2);}
      if(input.take('jump'))this.jump();else if(this.dodgeCd<=0&&input.take('dodge'))this.dodge(mv);else if(input.take('light'))this.startMove(W.light);
      else if(this.heavyIn())this.heavy(mv);else if(input.take('rush'))this.startMove(W.rush);
    }else if(st==='air'){
      if(mv.mag>.15){this.yaw=turnTo(this.yaw,atan2(mv.x,mv.z),10*dt);this.vel.x=damp(this.vel.x,mv.x*6.5,5,dt);this.vel.z=damp(this.vel.z,mv.z*6.5,5,dt);}
      else{this.vel.x=damp(this.vel.x,0,2,dt);this.vel.z=damp(this.vel.z,0,2,dt);}
      rig.play(CL.air,.12);
      if(input.take('jump')){if(!this.dj){this.dj=true;this.vel.y=10.5;sfx.jump();fx.rings.spawn(this.pos.x,this.pos.y,this.pos.z,0x5fdcff,2.5,.2,1.3,.3);}}
      else if(input.take('dodge')){if(!this.airDash){this.airDash=true;this.dodge(mv);}}
      else if(input.take('light')){if(this.airActs<5)this.startMove(W.light);}
      else if(this.heavyIn())this.heavy(mv);
    }else if(st==='attack'){trail=this.updAttack(dt,mv);}
    else if(st==='dodge'){
      const sp=lerp(18,5,sat(this.t/.36));this.vel.x=this.ddx*sp;this.vel.z=this.ddz*sp;
      if(this.gN<3&&this.t>=this.gN*.04){this.gN++;fx.ghost(this.rig.root,0x58d8ff);}
      if(this.t<.105){const l=min(1.25,.5+this.t*11)*min(1,(.105-this.t)/.035+.35),bx=this.pos.x+this.vel.x*dt-this.ddx*.2,bz=this.pos.z+this.vel.z*dt-this.ddz*.2;   // two tapered streaks about 1.2 m long, from the back vents, opposite the dodge
        for(const s of [-.17,.17]){_a.set(bx+this.ddz*s,this.pos.y+1.3,bz-this.ddx*s);fx.lens(_a,-this.ddx,.03,-this.ddz,l,l,.14,.14,[.45,2.1,3],1,1,2|64,4);}}
      if(this.t>=.2){if(input.take('light'))this.startMove(W.light);else if(this.heavyIn())this.heavy(mv);else if(this.grounded&&input.take('rush'))this.startMove(W.rush);}
      if(this.state==='dodge'&&this.t>=.36)this.state=this.grounded?'move':'air';
    }else if(st==='hurt'){this.vel.x=damp(this.vel.x,0,7,dt);this.vel.z=damp(this.vel.z,0,7,dt);if(this.t>=.45)this.state=this.grounded?'move':'air';}
    else{this.vel.x=damp(this.vel.x,0,7,dt);this.vel.z=damp(this.vel.z,0,7,dt);}
    if(!this.grounded){let g=34;if(this.state==='attack'&&!this.move.dive){g=9;if(this.vel.y<-2.5)this.vel.y=-2.5;}else if(this.state==='dodge')g=5;this.vel.y-=g*dt;}
    this.moveTo(this.pos.x+this.vel.x*dt,this.pos.z+this.vel.z*dt);
    const g=groundAt(this.pos.x,this.pos.z);if(g!==null)this.gy=g;
    if(this.grounded)this.pos.y=this.gy;
    else{this.pos.y+=this.vel.y*dt;if(this.pos.y<=this.gy){this.pos.y=this.gy;this.grounded=true;this.vel.y=0;this.onLand();}}
    // pistol arm
    if(this.aimT>0&&this.set===1){this.aimT-=dt;const ax=this.aimP.x-this.pos.x,ay=this.aimP.y-(this.pos.y+1.45),az=this.aimP.z-this.pos.z,l=hypot(ax,ay,az)||1,c=cos(this.yaw),s=sin(this.yaw);
      rig.aimDir.set((ax*c-az*s)/l,ay/l+max(0,this.gunCd)*.9,(ax*s+az*c)/l).normalize();rig.aimW=sat(this.aimT/.12);}else rig.aimW=0;
    rig.air=damp(rig.air,this.grounded?0:1,14,dt);rig.vy=this.vel.y;const cy=cos(this.yaw),sy=sin(this.yaw);rig.lv.set(this.vel.x*cy-this.vel.z*sy,0,this.vel.x*sy+this.vel.z*cy);
    const n=(this.state==='attack'||this.trailOn||trail)?3:1;this.trailOn=trail;
    for(let i=1;i<=n;i++){const k=i/n;rig.root.position.lerpVectors(this.prev,this.pos,k);rig.root.rotation.y=this.pyaw+wrapA(this.yaw-this.pyaw)*k;rig.update(dt/n);rig.root.updateMatrixWorld(true);this.sampleTrails(dt/n);}
    this.light.position.set(this.pos.x+sy*.9,this.pos.y+2.1,this.pos.z+cy*.9);
    // hurt and invulnerable: a white rim flash, then a rim flicker. The hero is never hidden (it used to blink out of sight).
    fx.rim(this,this.rimM||(this.rimM=Object.fromEntries(Object.entries(heroMats).filter(([k])=>k!=='glow'))),this.invuln>1.04?1:0,0,0,this.hp>0&&this.invuln>0&&this.state!=='dodge',G.dark>.001?2.5:G.boltA<.05?1.5*G.boltK:0,0x9fe8ff);   // and rim-lit through the dark frames that open a finisher, and for three frames by lightning
  }
}
