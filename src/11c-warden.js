// ===================== GATEWARDEN =====================
// Phase 1: armoured, slow sweeps and slams; break the armour (maul) for a stun.
// Phase 2: leaps to the ceiling and dives, then chains dashes; pistol fire interrupts both.
// Phase 3: fast sweep combos and travelling shockwaves; a perfect dodge stuns it.
class Warden{
  constructor(enc){
    this.kind='warden';this.boss=true;this.name='GATEWARDEN';this.B=true;this.S=false;this.scale=2.3;this.radius=1.5;this.hp=this.maxHp=1500;
    this.gy=enc.gy;this.ar=enc.ar;this.hangY=enc.gy+enc.ceil-2.1*this.scale;this.pos=V(0,this.gy,118);this.vel=V();this.yaw=PI;this.state='intro';this.t=0;
    this.phase=1;this.armor=this.maxArmor=160;this.cd=1;this.flash=0;this.dead=false;this.gone=false;this.dodged=false;this.struck=false;this.gun=0;this.left=false;this.farT=0;
    this.combo=0;this.dashes=0;this.rec=1;this.stunT=0;this.tx=0;this.tz=0;this.fired=0;this.marked=false;
    this.mats=wardenMats();this.rig=new Rig({kind:'warden',scale:this.scale,mats:this.mats});scene.add(this.rig.root);this.rig.play(CL.kneel,0);
    this.trail=new Trail(18,0xff7a2a);
  }
  get ghost(){return this.state==='intro'||this.state==='shift'||this.state==='leap';}
  get air(){return false;}
  solid(){return this.pos.y<this.gy+.5&&this.state!=='dash'?this.radius:0;}
  cy(){return this.pos.y+.9*this.scale;}
  hitPos(o,ux,uz){return o.set(this.pos.x-ux*1.2,this.pos.y+2.2+rand(-.6,.6),this.pos.z-uz*1.2);}
  remove(){scene.remove(this.rig.root);scene.remove(this.trail.mesh);}
  set(s,clip,blend=.12,speed=1){this.state=s;this.t=0;this.struck=false;this.dodged=false;this.gun=0;this.fired=0;this.marked=false;if(clip){this.rig.speed=speed;this.rig.play(clip,blend,true);}}
  mult(){return this.state==='stun'?1.5:(this.phase===1&&this.armor>0?.3:1);}
  takeHit(h){
    if(this.dead||this.ghost)return;this.hp-=h.dmg*this.mult();this.flash=1;
    if(this.phase===1&&this.state!=='stun'){this.armor-=h.dmg*(h.maul?2.5:1);if(h.breaker)this.armor=0;if(this.armor<=0){this.armor=0;this.stun(4.5);}}
    if(this.hp<=0)this.die();
  }
  gunHit(){
    if(this.dead||this.ghost)return false;this.hp-=2*this.mult();this.flash=max(this.flash,.5);
    if(this.hp<=0){this.die();return true;}
    if(this.state==='cling'&&++this.gun>=5)this.stun(3.5);else if(this.state==='dwind'&&++this.gun>=4)this.stun(2.6);
    return true;
  }
  stun(d){this.stunT=d;this.vel.set(0,0,0);this.set('stun',CL.kneel,.15);G.onBreak(this);}
  onPerfect(){if(this.phase===3&&!this.dead&&this.state!=='stun'&&this.state!=='shift')this.stun(2.6);}
  die(){this.dead=true;this.hp=0;this.set('dead',CL.wDead,.2);G.onKill(this);}
  slamFx(x,z,r){
    const gy=this.gy;fx.slam(x,gy,z,r,0xff5a1a,true);_a.set(x,gy+.5,z);fx.flash(_a,0xff6a2a,140,.2,8);
    cam.shake(.7);sfx.hit(1);sfx.land(1);
  }
  update(dt){
    const pl=G.player,P=this.pos,dx=pl.pos.x-P.x,dz=pl.pos.z-P.z,dist=hypot(dx,dz),toP=atan2(dx,dz),r=this.rig,S=this.state,gy=this.gy,ar=this.ar,ph=this.phase;
    this.t+=dt;this.cd-=dt;this.flash=max(0,this.flash-dt*5);const t=this.t;
    const fr=k=>{const e=exp(-k*dt);this.vel.x*=e;this.vel.z*=e;},face=k=>{this.yaw=turnTo(this.yaw,toP,k*dt);};
    const live=G.state==='play'&&pl.state!=='dead',fx_=sin(this.yaw),fz=cos(this.yaw);
    let glow=0,trail=false;
    const want=this.hp>this.maxHp*.66?1:this.hp>this.maxHp*.33?2:3;
    if(!this.dead&&want>ph&&S!=='shift'&&S!=='dash'&&S!=='dive'&&S!=='cling'&&S!=='leap'&&P.y<=gy+.01){
      this.phase=want;this.armor=0;this.vel.set(0,0,0);this.set('shift',CL.roar,.2);sfx.roar();cam.shake(.7);
      for(const m of r.hide)m.visible=false;for(const m of r.hot)m.visible=true;
      fx.rings.spawn(P.x,gy+.1,P.z,0xff5a1a,5,.5,14,.55);fx.embers(P.x,gy+2.4,P.z,120,[3.2,1,.25],1.4);
      G.msg('',want===2?'THE ARMOUR FALLS':'IT WILL NOT YIELD',2.2);
    }
    const sweep=()=>{const w=this.phase===3?.5:.9;this.wind=w;this.left=!this.left;this.set('windup',this.left?CL.eWindM:CL.eWind,.1,.4/(.65*w));sfx.telegraph(true);
      fx.warn(this,1,w,5.6);};
    const slam=()=>{const w=this.phase===3?.7:1.1;this.wind=w;this.set('swind',CL.bWind,.12,.6/(.7*w));sfx.telegraph(true);
      fx.warn(this,1,w,5.6,[3.6,4.2]);};
    if(S==='intro'){if(t>1.2&&r.clip!==CL.eIdle)r.play(CL.eIdle,.9);if(t>2.4){this.set('walk');this.cd=.6;}}
    else if(S==='shift'){fr(8);glow=1;if(random()<dt*40)fx.parts.spawn(P.x+rand(-1.5,1.5),gy+rand(.5,4.5),P.z+rand(-1.5,1.5),0,rand(2,6),0,3,1,.25,rand(.08,.2),.7,-1,1);
      if(t>1.6){if(this.phase===2){this.set('leap',CL.sWind,.15);}else{r.speed=1;r.play(CL.eIdle,.3,true);this.set('walk');this.cd=.3;}}}
    else if(S==='walk'){
      if(r.clip!==CL.eIdle){r.speed=1;r.play(CL.eIdle,.3);}
      face(ph===1?3.2:5);const sp=ph===1?2.6:ph===2?3.4:4.4;
      if(dist>4.4){this.vel.x=damp(this.vel.x,fx_*sp,5,dt);this.vel.z=damp(this.vel.z,fz*sp,5,dt);}else fr(6);
      r.phase+=hypot(this.vel.x,this.vel.z)*dt*1.1;this.farT=dist>10?this.farT+dt:0;
      if(this.cd<=0&&live){
        if(ph===1){if(dist<6.4){if(random()<.6)sweep();else slam();}else if(this.farT>2.5){this.farT=0;slam();}}
        else if(ph===2){if(dist<6&&random()<.4){this.combo=1;sweep();}else this.set('leap',CL.sWind,.15);}
        else{if(dist>9&&random()<.5){this.set('volley',CL.bWind,.15,.9);fx.warn(this,1,.7,5.6);}else if(dist<8){this.combo=3;sweep();}}
      }
    }
    else if(S==='windup'){fr(8);glow=sat(t/this.wind);if(t<this.wind-.2)face(4);
      if(t>=this.wind){this.set('strike',this.left?CL.eStrikeM:CL.eStrike,.03,.7);this.vel.x=fx_*8;this.vel.z=fz*8;sfx.whoosh(.45,1.5);}}
    else if(S==='strike'){fr(5);trail=t<.3;
      if(t>=.08&&t<=.26&&!this.struck&&dist<6&&abs(wrapA(toP-this.yaw))<1.35&&pl.pos.y-gy<2.2){this.struck=true;pl.takeHit(18,this);}
      if(t>=.42){if(ph===3&&--this.combo>0)sweep();else if(ph===3)slam();else{this.rec=.9;this.set('recover');}}}
    else if(S==='swind'){fr(8);glow=sat(t/this.wind);if(t<this.wind-.25)face(3);if(t>=this.wind){this.set('slam',CL.bStrike,.03,.8);sfx.whoosh(.35,1.6);}}
    else if(S==='slam'){fr(8);
      if(t>=.12&&!this.struck){this.struck=true;const cx=P.x+fx_*3.6,cz=P.z+fz*3.6;this.slamFx(cx,cz,6);
        if(hypot(pl.pos.x-cx,pl.pos.z-cz)<4.2&&pl.pos.y<gy+1.2)pl.takeHit(22,this);
        waves.ring(cx,gy,cz,13,24,12,this);}
      if(t>=.55){this.rec=ph===1?1.2:1;this.set('recover');}}
    else if(S==='volley'){fr(8);glow=.6;face(2);
      if(this.fired<3&&t>=.7+this.fired*.65){this.fired++;const dir=dz>=0?1:-1;this.slamFx(P.x+fx_*3,P.z+fz*3,5);
        waves.line(ar.x0-1.5,ar.x1+1.5,gy,P.z+dir*2.5,dir,15,46,14,this);r.speed=.9;r.play(CL.bStrike,.04,true);}
      else if(this.fired<3&&t>=.95+(this.fired-1)*.65&&r.clip===CL.bStrike&&this.fired>0){r.speed=1.6;r.play(CL.bWind,.12,true);}
      if(t>=2.7){this.rec=1.1;this.set('recover');}}
    else if(S==='recover'){fr(8);if(t>=this.rec){
      if(ph===2&&this.dashes>0)this.set('dwind',CL.sWind,.12,.8);else{this.set('walk');this.cd=ph===1?.8:ph===2?1.1:.45;}}}
    else if(S==='leap'){fr(10);if(t>.45){P.y=lerp(gy,this.hangY,smooth(sat((t-.45)/.45)));if(r.clip!==CL.sHang)r.play(CL.sHang,.2);}
      if(t>=.9){P.y=this.hangY;this.set('cling');sfx.telegraph(true);fx.warn(this,1,1.8,2.4);}}
    else if(S==='cling'){glow=.5+.5*sin(t*12);this.yaw=toP;
      if(t<1.05){P.x=damp(P.x,clamp(pl.pos.x,ar.x0+2,ar.x1-2),2.6,dt);P.z=damp(P.z,clamp(pl.pos.z,ar.z0+2,ar.z1-2),2.6,dt);}
      else if(!this.marked){this.marked=true;this.tx=P.x;this.tz=P.z;fx.disc(P.x,gy,P.z,4.6,.75+.2);r.play(CL.sDive,.25);}
      if(t>=1.8)this.set('dive');}
    else if(S==='dive'){P.y-=46*dt;trail=true;
      if(P.y<=gy){P.y=gy;this.slamFx(P.x,P.z,7);if(dist<4.6&&pl.pos.y<gy+1.3)pl.takeHit(22,this);waves.ring(P.x,gy,P.z,13,18,12,this);
        this.dashes=2;this.rec=.9;this.set('recover',CL.sLand,.1);}}
    else if(S==='dwind'){fr(10);glow=sat(t/.75);
      if(t<.3)face(9);else if(!this.marked){this.marked=true;fx.line(P.x+fx_*20,gy,P.z+fz*20,this.yaw,40,3.4,.5);fx.warn(this,1,.78-t,5.6);sfx.telegraph(false);}
      if(t>=.78){this.set('dash',CL.sDash,.04);this.vel.x=fx_*34;this.vel.z=fz*34;sfx.whoosh(1.2,1.6);}}
    else if(S==='dash'){trail=true;
      if(!this.struck&&dist<2.7&&pl.pos.y-gy<2.2){this.struck=true;pl.takeHit(16,this);}
      if(random()<dt*160)fx.parts.spawn(P.x+rand(-.6,.6),gy+rand(.4,3.6),P.z+rand(-.6,.6),0,0,0,3,1,.25,rand(.1,.22),.4);
      const edge=P.x<=ar.x0+.05||P.x>=ar.x1-.05||P.z<=ar.z0+.05||P.z>=ar.z1-.05;
      if(t>=.5||(edge&&t>.1)){this.dashes--;this.rec=this.dashes>0?.45:1.7;this.vel.multiplyScalar(.15);this.set('recover');}}
    else if(S==='stun'){fr(9);
      if(P.y>gy){P.y-=32*dt;if(P.y<=gy){P.y=gy;this.slamFx(P.x,P.z,5);}}
      if(random()<dt*24)fx.parts.spawn(P.x+rand(-1,1),gy+rand(.6,3.4),P.z+rand(-1,1),0,rand(1,3),0,3,1.2,.3,rand(.06,.12),.5,-1,1);
      if(t>=this.stunT){if(ph===1)this.armor=this.maxArmor;this.dashes=0;this.set('walk');this.cd=.7;}}
    else if(S==='dead'){fr(8);glow=t;
      if(random()<dt*50)fx.parts.spawn(P.x+rand(-1.4,1.4),gy+rand(.3,3),P.z+rand(-1.4,1.4),0,rand(2,6),0,3.2,1,.25,rand(.08,.2),.8,-1,1);
      if(t>2.3&&!this.gone){this.gone=true;fx.embers(P.x,gy+2,P.z,200,[3.2,1,.25],1.6);fx.burst(P.x,gy+2.2,P.z,2.6,[3.2,1,.25],0xff5a1a,gy,30,this.mats.armor.color.getHex());
        _a.set(P.x,gy+2,P.z);fx.flash(_a,0xff6a2a,300,.4);fx.rings.spawn(P.x,gy+.06,P.z,0xff5a1a,4,.5,12,.5);sfx.death();sfx.boom();cam.shake(.8);this.remove();return;}}
    P.x+=this.vel.x*dt;P.z+=this.vel.z*dt;P.x=clamp(P.x,ar.x0,ar.x1);P.z=clamp(P.z,ar.z0,ar.z1);
    r.root.position.copy(P);r.root.rotation.y=this.yaw;
    const cy=cos(this.yaw),sy=sin(this.yaw);r.lv.set((this.vel.x*cy-this.vel.z*sy)/this.scale,0,(this.vel.x*sy+this.vel.z*cy)/this.scale);
    r.update(dt);
    // rim only (see fx.rim): the armour is never painted over, so its steel and gold stay visible through the whole fight
    const wind=S==='windup'||S==='swind'||S==='dwind'||S==='cling'||S==='volley';
    fx.rim(this,this.mats,this.flash,wind?glow:0,1,S==='stun',S==='dead'?min(4,t*1.6):S==='shift'?1.8:ph>1?.6+.25*sin(G.rt*5):0,0xff5a14);
    r.root.updateMatrixWorld(true);const sw=r.sword[1];_a.set(0,.3,0);sw.localToWorld(_a);_b.set(0,1.95,0);sw.localToWorld(_b);this.trail.sample(_a,_b,trail);
  }
}
