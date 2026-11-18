// ===================== ENEMY =====================
// Shared interface for everything in G.enemies: pos, vel, radius, scale, hp, maxHp, dead, gone, ghost,
// cy(), hitPos(), takeHit(hit,dx,dz), gunHit(), update(dt), remove().
class Enemy{
  constructor(kind,x,z,o={}){
    const B=this.B=kind==='brute',S=this.S=kind==='stalker';this.kind=kind;this.scale=B?1.5:S?1:1.04;this.radius=B?.9:.5;this.hp=this.maxHp=B?480:S?74:78;
    this.gy=o.gy||0;this.ar=o.ar;this.delay=o.delay||0;this.mark=false;this.tx=x;this.tz=z;
    this.pos=V(x,this.gy+(S?min(8.4,(o.ceil||10.5)-2.15):0),z);this.vel=V();this.yaw=PI;this.state=S?'drop':'spawn';this.t=0;this.atkCd=S?rand(.6,1.6):rand(.5,2);this.strafe=random()<.5?-1:1;this.strafeT=rand(1,3);
    this.flash=0;this.hang=0;this.chain=0;this.token=false;this.dead=false;this.gone=false;this.spiked=false;this.struck=false;this.dodged=false;this.shield=null;this.poise=120;this.gunPoise=0;
    this.mats=enemyMats(kind);this.baseEm=S?0xa050ff:0xff6a2a;this.rig=new Rig({kind,scale:this.scale,mats:this.mats});scene.add(this.rig.root);
    this.rig.play(S?CL.sHang:CL.eIdle,0);this.trail=B?null:new Trail(14,S?0xa050ff:0xff4a12);
    if(!S){fx.rings.spawn(x,this.gy+.05,z,0xff5a1a,3,.3,2.2*this.scale,.9);sfx.noise({f0:200,f1:1300,dur:.8,q:2,g:.3,a:.4});}
  }
  get ghost(){return this.state==='spawn'||this.state==='drop';}
  get air(){return this.pos.y>this.gy+.05;}
  solid(){return this.pos.y<this.gy+.5&&!this.ghost&&!(this.S&&this.state==='strike')?this.radius:0;}
  cy(){return this.pos.y+.9*this.scale;}
  hitPos(o,ux,uz){return o.set(this.pos.x-ux*.45*this.scale,this.pos.y+1.15*this.scale,this.pos.z-uz*.45*this.scale);}
  remove(){scene.remove(this.rig.root);if(this.trail)scene.remove(this.trail.mesh);}
  set(s){
    if(this.token&&s!=='windup'&&s!=='strike'&&s!=='recover'){this.token=false;G.tokens--;}
    this.state=s;this.t=0;const r=this.rig,B=this.B,S=this.S;
    if(s==='idle')r.play(CL.eIdle,.3);else if(s==='windup')r.play(B?CL.bWind:S?CL.sWind:CL.eWind,.1,true);else if(s==='strike')r.play(B?CL.bStrike:S?CL.sDash:CL.eStrike,.03,true);else if(s==='land')r.play(CL.sLand,.1,true);
    else if(s==='stagger')r.play(random()<.5?CL.eStag:CL.eStag2,.04,true);else if(s==='air')r.play(CL.eAir,.08,true);else if(s==='down')r.play(CL.eDown,.1,true);else if(s==='getup')r.play(CL.eIdle,.45,true);
    else if(s==='broken')r.play(CL.kneel,.12,true);
  }
  takeHit(h,dx,dz){
    if(this.dead||this.ghost)return;const B=this.B,kb=h.kb??2;
    this.hp-=h.dmg*(this.shield?.25:1)*(this.state==='broken'?1.3:1);this.flash=1;
    if(this.hp<=0){this.vel.set(dx*max(kb,4)*.8,max(this.vel.y,h.launch?9:5),dz*max(kb,4)*.8);this.pos.y=max(this.pos.y,this.gy+.03);return this.die();}
    if(this.shield&&!h.big)return;
    if(B&&this.state!=='broken'&&this.state!=='air'&&this.state!=='down'){
      this.poise-=h.dmg*(h.maul?2:1);
      if(h.breaker||this.poise<=0){this.poise=120;this.set('broken');G.onBreak(this);}
      return;
    }
    if(h.launch){this.vel.set(dx*kb,h.launch*(B?.74:1),dz*kb);this.pos.y=max(this.pos.y,this.gy+.05);this.spiked=false;this.set('air');}
    else if(this.state==='air'||this.air){
      if(h.spike){this.vel.set(dx*2,-27,dz*2);this.spiked=true;this.hang=0;}
      else{this.vel.x=dx*kb*.35;this.vel.z=dz*kb*.35;this.vel.y=clamp(max(this.vel.y,0)*.3+(h.pop??3.7),0,5.6);this.hang=.2;}
      if(this.state!=='air')this.set('air');
    }
    else if(h.down||this.state==='down'){this.vel.set(dx*kb,h.down?6:4.6,dz*kb);this.pos.y=this.gy+.05;this.set('air');}
    else if(this.state==='broken'){this.vel.x=dx*kb*.4;this.vel.z=dz*kb*.4;}
    else{this.vel.x=dx*kb;this.vel.z=dz*kb;this.yaw=atan2(-dx,-dz);this.set('stagger');}
  }
  // pistol: tiny damage, interrupts attacks, keeps airborne enemies up
  gunHit(){
    if(this.dead||this.ghost)return false;this.hp-=this.shield?.5:2;this.flash=max(this.flash,.6);
    if(this.hp<=0){this.vel.y=max(this.vel.y,3);this.pos.y=max(this.pos.y,this.gy+.03);this.die();return true;}
    if(this.air||this.state==='air'){this.vel.y=max(this.vel.y,2.7);this.hang=.3;}
    else if((this.state==='windup'||this.state==='strike')&&!this.shield){if(!this.B||++this.gunPoise>=4){this.gunPoise=0;this.set('stagger');}}
    return true;
  }
  die(){this.dead=true;if(this.token){this.token=false;G.tokens--;}this.state='dead';this.t=0;this.rig.play(CL.eAir,.1,true);G.onKill(this);}
  update(dt){
    const pl=G.player,dx=pl.pos.x-this.pos.x,dz=pl.pos.z-this.pos.z,dist=hypot(dx,dz),toP=atan2(dx,dz),r=this.rig,B=this.B,St=this.S,S=this.state,gy=this.gy,ar=this.ar;
    this.t+=dt;this.flash=max(0,this.flash-dt*5);
    if(this.shield&&(this.shield.dead||this.shield.link!==this))this.shield=null;
    const fr=k=>{const e=exp(-k*dt);this.vel.x*=e;this.vel.z*=e;};
    if(S==='drop'){
      const T=this.t-this.delay;this.yaw=toP;
      if(T>=0&&T<.75){
        if(!this.mark){this.mark=true;this.dodged=false;
          this.tx=clamp(pl.pos.x,ar.x0+.5,ar.x1-.5);this.tz=clamp(pl.pos.z,ar.z0+.5,ar.z1-.5);
          sfx.telegraph(false);fx.rings.spawn(this.tx,gy+.07,this.tz,0xa050ff,4,2.6,.4,.78);
          _a.set(this.pos.x,this.pos.y+1,this.pos.z);fx.flares.spawn(_a,0xa050ff,6,.5,.3,.3,4.5,.05,0);fx.flares.spawn(_a,0xa050ff,6,.5,.3,.3,3.2,.05,PI/2);}
        this.pos.x=damp(this.pos.x,this.tx,7,dt);this.pos.z=damp(this.pos.z,this.tz,7,dt);
        if(T>.5)r.play(CL.sDive,.2);
      }else if(T>=.75){
        this.pos.y-=36*dt;
        if(this.pos.y<=gy){this.pos.y=gy;const x=this.pos.x,z=this.pos.z;
          fx.rings.spawn(x,gy+.06,z,0xa050ff,4,.4,3,.4);fx.puff(x,z,22,1.2,gy);_a.set(x,gy+.4,z);fx.sparks(_a,0,1,0,22,[1.6,.6,3.2],9);fx.flash(_a,0xa050ff,80,.2);
          cam.shake(.35);sfx.land(.9);sfx.hit(.6);
          if(hypot(pl.pos.x-x,pl.pos.z-z)<2.3&&pl.pos.y<gy+1.3)pl.takeHit(13,this);
          this.set('land');}
      }
    }else if(S==='spawn'){
      if(random()<dt*45)fx.parts.spawn(this.pos.x+rand(-.6,.6),gy+.1,this.pos.z+rand(-.6,.6),0,rand(2,5),0,3,.9,.2,rand(.06,.14),rand(.4,.9),-1,1);
      this.yaw=toP;if(this.t>1.1)this.set('idle');
    }else if(S==='idle'){
      this.yaw=turnTo(this.yaw,toP,5*dt);this.atkCd-=dt;this.strafeT-=dt;if(this.strafeT<0){this.strafeT=rand(1.5,3.5);this.strafe=-this.strafe;}
      const R=B?3:St?6.5:2.5,sp=B?2.1:St?5:3,ss=St?3.4:1.3,ux=dx/(dist||1),uz=dz/(dist||1);let mx,mz;
      if(dist>R+(St?1:.5)){mx=ux*sp;mz=uz*sp;}else if(dist<R-(St?1.8:.8)){mx=-ux*sp*(St?.8:.6);mz=-uz*sp*(St?.8:.6);}else{mx=-uz*this.strafe*ss;mz=ux*this.strafe*ss;}
      this.vel.x=damp(this.vel.x,mx,6,dt);this.vel.z=damp(this.vel.z,mz,6,dt);
      if(this.atkCd<=0&&dist<(B?4.2:St?11:3.8)&&G.tokens<G.maxTokens&&pl.state!=='dead'&&G.state==='play'){
        this.token=true;G.tokens++;this.atkCd=B?rand(1.6,3.2):St?rand(1.4,2.6):rand(.9,2);this.gunPoise=0;this.chain=0;this.set('windup');sfx.telegraph(B);
        _a.set(this.pos.x,this.pos.y+1.75*this.scale,this.pos.z);const gc=St?0xa050ff:0xff5a1a;fx.flares.spawn(_a,gc,5,.45,.3,.3,3.4,.04,0);fx.flares.spawn(_a,gc,5,.45,.3,.3,2.4,.04,PI/2);
      }
    }else if(S==='windup'){
      const w=B?.95:this.chain?(St?.36:.3):St?.5:.55;fr(8);if(this.t<w-(St?.1:.16))this.yaw=turnTo(this.yaw,toP,(this.chain?18:St?10:6)*dt);
      if(this.t>=w){this.set('strike');this.struck=false;this.dodged=false;if(!B){const v=St?26:11;this.vel.x=sin(this.yaw)*v;this.vel.z=cos(this.yaw)*v;}sfx.whoosh(B?.5:St?1.4:.72,1.1);}
    }else if(S==='strike'){
      if(!St)fr(7);
      if(St){
        if(!this.struck&&dist<1.5&&abs(pl.pos.y-this.pos.y)<1.4){this.struck=true;pl.takeHit(12,this);}
        if(random()<dt*120)fx.parts.spawn(this.pos.x,gy+rand(.3,1.5),this.pos.z,0,0,0,1.6,.6,3.2,rand(.08,.18),.35);
      }else if(B){
        if(this.t>=.1&&!this.struck){this.struck=true;const cx=this.pos.x+sin(this.yaw)*1.8,cz=this.pos.z+cos(this.yaw)*1.8;
          fx.rings.spawn(cx,gy+.06,cz,0xff5a1a,4,.4,3.4,.45);fx.puff(cx,cz,26,1.3,gy);cam.shake(.55);sfx.hit(1);sfx.land(1);
          _a.set(cx,gy+.4,cz);fx.sparks(_a,0,1,0,26,[3,1.1,.3],9);fx.flash(_a,0xff6a2a,80,.2);
          if(hypot(pl.pos.x-cx,pl.pos.z-cz)<2.9&&pl.pos.y<gy+1.1)pl.takeHit(24,this);
          if(this.hp<this.maxHp*.55)waves.ring(cx,gy,cz,8.5,7,10,this,0xff6a2a,1);}   // enraged: the slam throws a shockwave to jump or dodge
      }else if(this.t>=.04&&this.t<=.18&&!this.struck){
        if(dist<2.25&&abs(wrapA(toP-this.yaw))<1.05&&abs(pl.pos.y-this.pos.y)<1.4){this.struck=true;pl.takeHit(11,this);}
      }
      if(this.t>=(B||St?.3:.24)){
        // husks and stalkers sometimes chain a second, faster attack (announced again), so one dodge is not always enough
        if(!B&&!this.chain&&pl.state!=='dead'&&dist<(St?12:5)&&random()<(St?.4:.45)){this.chain=1;this.set('windup');sfx.telegraph(false);
          _a.set(this.pos.x,this.pos.y+1.75*this.scale,this.pos.z);fx.flares.spawn(_a,St?0xa050ff:0xff5a1a,5,.3,.3,.3,2.6,.04,PI/4);}
        else this.set('recover');}
    }else if(S==='recover'){fr(8);if(this.t>=(B?1.1:St?.6:.55))this.set('idle');}
    else if(S==='stagger'){fr(6);if(this.t>=.55)this.set('idle');}
    else if(S==='broken'){fr(8);if(random()<dt*20)fx.parts.spawn(this.pos.x+rand(-.5,.5),gy+rand(.4,1.8),this.pos.z+rand(-.5,.5),0,rand(1,3),0,3,1.2,.3,rand(.05,.1),.5,-1,1);if(this.t>=4)this.set('idle');}
    else if(S==='down'){fr(9);if(this.t>.8)this.set('getup');}
    else if(S==='getup'){fr(9);if(this.t>.45)this.set('idle');}
    else if(S==='land'){fr(10);if(this.t>.6)this.set('idle');}
    if(S!=='drop'&&(this.pos.y>gy||this.vel.y>0)){
      this.hang-=dt;this.vel.y-=(this.hang>0?5:28)*dt;this.pos.y+=this.vel.y*dt;
      if(this.pos.y<=gy){this.pos.y=gy;this.vel.y=0;
        if(this.state==='air'){
          if(this.spiked){this.spiked=false;this.vel.y=7;this.pos.y=gy+.02;fx.rings.spawn(this.pos.x,gy+.06,this.pos.z,0x8fdcff,3,.3,2.6,.35);fx.puff(this.pos.x,this.pos.z,18,1,gy);cam.shake(.3);sfx.land(.8);}
          else{this.set('down');fx.puff(this.pos.x,this.pos.z,10,.7,gy);sfx.land(.4);}
        }else fr(200);
      }
    }
    this.pos.x+=this.vel.x*dt;this.pos.z+=this.vel.z*dt;
    if(ar){this.pos.x=clamp(this.pos.x,ar.x0,ar.x1);this.pos.z=clamp(this.pos.z,ar.z0,ar.z1);}
    if(S==='idle')r.phase+=hypot(this.vel.x,this.vel.z)*dt*2.4;
    r.root.position.copy(this.pos);if(S==='spawn')r.root.position.y=lerp(gy-2.3*this.scale,gy,smooth(min(1,this.t/.9)));
    r.root.rotation.y=this.yaw;r.update(dt);
    const m=this.mats.armor;m.emissive.setHex(this.shield?0x9fd0ff:this.baseEm);
    m.emissiveIntensity=this.flash*this.flash*1.8+(S==='windup'?sat(this.t/.5)*.9:0)+(S==='dead'?this.t*9:0)+(this.shield?.5+.2*sin(G.rt*9):0)+(B&&this.hp<this.maxHp*.55&&S!=='dead'?.22+.14*sin(G.rt*7):0);
    if(this.trail){r.root.updateMatrixWorld(true);const sw=r.sword[1];_a.set(0,.12,0);sw.localToWorld(_a);_b.set(0,1.05,0);sw.localToWorld(_b);this.trail.sample(_a,_b,S==='strike'&&this.t<(St?.34:.2)||S==='drop'&&this.t>this.delay+.7);}
    if(S==='dead'){
      r.root.scale.setScalar(this.scale*(1+this.t*.3));
      if(this.t>.42&&!this.gone){this.gone=true;const y=this.pos.y+1.1*this.scale;
        fx.embers(this.pos.x,y,this.pos.z,B?140:70,St?[1.6,.6,3.2]:[3.2,1,.25],.5*this.scale);fx.embers(this.pos.x,y,this.pos.z,30,[.6,.7,.9],.4);
        _a.set(this.pos.x,y,this.pos.z);fx.glows.spawn(_a,0xff7a3a,5,.3,.5,.5,5*this.scale,5*this.scale);fx.flash(_a,0xff6a2a,120,.3);
        fx.rings.spawn(this.pos.x,gy+.06,this.pos.z,0xff5a1a,3,.3,3*this.scale,.5);fx.debris(this.pos.x,y,this.pos.z,B?16:9,this.scale,gy);sfx.death();this.remove();}
    }
  }
}
