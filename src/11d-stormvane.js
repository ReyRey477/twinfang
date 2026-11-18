// ===================== STORMVANE =====================
// Phase 1: circles the roof - orb volleys (slash them back), dive passes, a breath attack the pistol can interrupt.
// Phase 2: lands - wing sweeps, tail slam, bite; armoured until a charged maul hit or sustained damage pins it.
// Phase 3: perches on the spire shielded by two Lanterns while lightning falls, then alternates passes and landings.
class Stormvane{
  constructor(enc){
    this.kind='storm';this.boss=true;this.name='STORMVANE';this.B=true;this.S=false;this.scale=1;this.radius=3;this.hp=this.maxHp=2200;
    this.gy=enc.gy;this.ar=enc.ar;this.C=V(0,enc.gy,304);
    const pp=G.player.pos,a0=atan2(-pp.x,304-pp.z);this.pos=V(sin(a0)*22,enc.gy+16,304+cos(a0)*22);this.vel=V();this.yaw=a0+PI/2;this.pitch=0;this.roll=0;this.state='intro';this.t=0;this.phase=1;this.th=a0;this.ph=0;
    this.armor=0;this.maxArmor=220;this.cd=2.5;this.atk=0;this.gun=0;this.orbN=0;this.fired=0;this.flash=0;this.dead=false;this.gone=false;this.dodged=false;this.struck=false;this.shield=null;
    this.boltCd=2;this.groundT=0;this.passes=0;this.pinned=false;this.side=0;this.stunT=0;this.rec=1;this.shieldOn=false;this.marked=false;
    this.ls=V();this.ld=V();this.lt=0;this.spot=V();
    this.J={wrL:.1,wrR:.1,we:0,wf:0,wsL:0,wsR:0,np:0,hp:0,tp:0};this.T=Object.assign({},this.J);
    this.build();
  }
  build(){
    const iron=this.iron=new MSM({color:0x16181d,metalness:.85,roughness:.35,emissive:0x9fc8ff,emissiveIntensity:0,envMapIntensity:1}),
      trim=new MSM({color:0x3a3f49,metalness:1,roughness:.3,envMapIntensity:1.2}),glass=new THREE.MeshBasicMaterial({color:hdr(0x8fd0ff,1.4)});
    this.coreM=new THREE.MeshBasicMaterial({color:hdr(0xbfe4ff,2.5)});
    const root=this.root=new THREE.Group(); root.rotation.order='YXZ'; scene.add(root);
    const add=(par,geo,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);m.castShadow=true;par.add(m);return m;};
    add(root,GS,iron,0,0,0,1.25,1.05,2.7); add(root,GS,trim,0,.4,-.5,.95,.75,2);
    this.core=add(root,GS,this.coreM,0,-.45,1.35,.6,.55,.7);
    for(let k=0;k<4;k++)add(root,GB,trim,0,-.55,.75+k*.4,1.5,.07,.07); for(const sx of [-1,1])add(root,GB,trim,sx*.45,-.75,1.35,.07,.07,1.5);
    for(let k=0;k<5;k++)add(root,cone(.14,.9-k*.1,4),trim,0,1,.9-k*.7,1,1,1,-.5,0,0);
    const n1=this.n1=new THREE.Group(); n1.position.set(0,.4,2.1); root.add(n1); add(n1,limb(.5,.34,1.5),iron,0,0,0,1,1,1,-PI/2,0,0);
    const n2=this.n2=new THREE.Group(); n2.position.z=1.5; n1.add(n2); add(n2,limb(.36,.28,1.2),iron,0,0,0,1,1,1,-PI/2,0,0);
    const hd=this.hd=new THREE.Group(); hd.position.z=1.2; n2.add(hd);
    add(hd,GS,iron,0,.05,.35,.46,.44,.72); add(hd,cone(.3,1.5,6),trim,0,0,1.55,1,1,1,PI/2,0,0); add(hd,cone(.2,.9,6),trim,0,-.22,1.2,1,1,1,PI/2+.25,0,0);
    for(const sx of [-1,1]){add(hd,GS,glass,sx*.3,.18,.62,.11,.09,.16); add(hd,GB,trim,sx*.16,.5,-.2,.05,.5,1,-.5,sx*.2,0);}
    this.wing=[];
    for(const sx of [1,-1]){
      const g0=new THREE.Group(); g0.position.set(sx*1,.45,.5); g0.scale.x=sx; root.add(g0);
      const s1=new THREE.Group(),s2=new THREE.Group(),s3=new THREE.Group(); g0.add(s1); s2.position.x=3.2; s1.add(s2); s3.position.x=3.3; s2.add(s3);
      add(s1,GB,iron,1.6,0,0,3.2,.16,.5); add(s2,GB,iron,1.65,0,0,3.3,.13,.42); add(s3,GB,iron,1.2,0,0,2.4,.1,.3);
      for(let k=0;k<4;k++){add(s1,GB,trim,.5+k*.75,-.03,-1.15,.55,.05,2.1,0,.06*k,0); add(s1,GB,glass,.5+k*.75,.0,-1.2,.07,.07,1.6,0,.06*k,0);}
      for(let k=0;k<4;k++){add(s2,GB,trim,.45+k*.8,-.03,-1.35,.55,.05,2.5,0,.1+.07*k,0); add(s2,GB,glass,.45+k*.8,0,-1.4,.07,.07,2,0,.1+.07*k,0);}
      for(let k=0;k<3;k++){add(s3,GB,trim,.5+k*.8,-.03,-1.5,.45,.05,2.9,0,.35+.16*k,0); add(s3,GB,glass,.5+k*.8,0,-1.55,.06,.07,2.3,0,.35+.16*k,0);}
      this.wing.push({s1,s2,s3});
    }
    const tl=this.tail=new THREE.Group(); tl.position.set(0,.1,-2.4); root.add(tl);
    for(let k=-1;k<=1;k++){add(tl,GB,trim,k*.55,0,-1.8,.55,.06,3.7,0,-k*.22,0); add(tl,GB,glass,k*.55,.04,-1.9,.08,.07,3,0,-k*.22,0);}
    this.legs=new THREE.Group(); root.add(this.legs);
    for(const sx of [-1,1]){add(this.legs,limb(.26,.15,1.35),iron,sx*.7,-.7,.3); for(let k=-1;k<=1;k++)add(this.legs,cone(.07,.6,4),trim,sx*.7+k*.2,-2.02,.55,1,1,1,PI/2-.2,0,0);}
  }
  get ghost(){return this.state==='intro'||this.state==='shift'||this.state==='toperch';}
  get air(){return true;}
  get grounded(){const s=this.state;return s==='gidle'||s==='wsw'||s==='wsws'||s==='tail'||s==='tails'||s==='bite'||s==='bites'||s==='grec'||s==='stun';}
  solid(){return this.grounded?3.1:0;}
  cy(){return this.pos.y;}
  hitPos(o,ux,uz){return o.set(this.pos.x-ux*2.2,this.pos.y+rand(-.7,.9),this.pos.z-uz*2.2);}
  remove(){scene.remove(this.root);}
  mult(){return this.state==='stun'?1.5:(this.phase===2&&this.armor>0&&this.grounded?.35:1);}
  go(s){this.state=s;this.t=0;this.struck=false;this.dodged=false;this.gun=0;this.fired=0;this.marked=false;}
  ping(){fx.flares.spawn(this.pos,0x9fd0ff,3,.15,.5,.5,4,.04,rand(3));}
  takeHit(h){
    if(this.dead||this.ghost)return;if(this.shieldOn)return this.ping();
    this.hp-=h.dmg*this.mult();this.flash=1;
    if(this.phase===2&&this.armor>0&&this.grounded&&this.state!=='stun'){this.armor-=h.dmg*(h.maul?2.5:1);if(h.breaker)this.armor=0;
      if(this.armor<=0){this.armor=0;this.pinned=true;this.stunT=6;this.go('stun');G.onBreak(this);}}
    if(this.hp<=0)this.die();
  }
  gunHit(){
    if(this.dead||this.ghost)return false;if(this.shieldOn){this.ping();return true;}
    this.hp-=2*this.mult();this.flash=max(this.flash,.45);if(this.hp<=0){this.die();return true;}
    if(this.state==='breath'&&++this.gun>=8)this.crash();
    return true;
  }
  orbHit(){
    if(this.dead||this.shieldOn)return;this.hp-=60;this.flash=1;fx.hit(this.pos,0,0,true,0);cam.shake(.3);G.addStyle('ORB',30);
    if(this.hp<=0)return this.die();
    if(this.phase===1&&++this.orbN%3===0&&(this.state==='circle'||this.state==='volley'))this.crash();
  }
  onPerfect(){const s=this.state;if(!this.dead&&(s==='wsws'||s==='tails'||s==='bites'||s==='wsw'||s==='tail'||s==='bite')){this.stunT=2.2;this.go('stun');G.onBreak(this);}}
  crash(){this.stunT=5;this.vel.set(0,0,0);this.go('fall');const P=this.pos,C=this.C,ar=this.ar;let x=clamp(P.x,ar.x0+3,ar.x1-3),z=clamp(P.z,ar.z0+3,ar.z1-3);
    const d=hypot(x-C.x,z-C.z);if(d<7){const a=d>.1?atan2(x-C.x,z-C.z):0;x=C.x+sin(a)*7;z=C.z+cos(a)*7;}this.spot.set(x,this.gy+2.1,z);sfx.roar();G.onBreak(this);}
  die(){this.dead=true;this.hp=0;this.shieldOn=false;this.go('dead');G.onKill(this);}
  head(o){this.hd.updateWorldMatrix(true,false);return o.set(0,0,1.6).applyMatrix4(this.hd.matrixWorld);}
  landFx(big){const P=this.pos,gy=this.gy;fx.rings.spawn(P.x,gy+.06,P.z,0x9fc8ff,4,.6,big?10:7,.6);fx.puff(P.x,P.z,50,1.8,gy);_a.set(P.x,gy+.5,P.z);fx.sparks(_a,0,1,0,40,[1.6,2.2,3.4],12);cam.shake(big?.8:.5);sfx.land(1);if(big)sfx.hit(1);}
  flyTo(x,y,z,k,dt,faceMove=true){const P=this.pos,ox=P.x,oz=P.z;P.x=damp(P.x,x,k,dt);P.y=damp(P.y,y,k,dt);P.z=damp(P.z,z,k,dt);
    const vx=P.x-ox,vz=P.z-oz;if(faceMove&&hypot(vx,vz)>.02)this.yaw=turnTo(this.yaw,atan2(vx,vz),4*dt);}
  update(dt){
    const pl=G.player,P=this.pos,gy=this.gy,C=this.C,ar=this.ar,T=this.T;
    const dx=pl.pos.x-P.x,dz=pl.pos.z-P.z,dist=hypot(dx,dz),toP=atan2(dx,dz),py=pl.pos.y-gy;
    this.t+=dt;this.cd-=dt;this.flash=max(0,this.flash-dt*4);this.ph+=dt*7.2;const S=this.state,t=this.t,live=G.state==='play'&&pl.state!=='dead';
    let flap=true,tp=0,tr=0,kJ=9,coreK=2.5,gY=gy+2.1;
    T.wsL=T.wsR=0;T.np=.15;T.hp=0;T.tp=-.1;T.wf=.1;T.we=-.15;
    const want=this.hp>this.maxHp*.66?1:this.hp>this.maxHp*.33?2:3;
    if(!this.dead&&want>this.phase&&(S==='circle'||S==='volley'||S==='stun'||S==='gidle'||S==='grec')){this.phase=want;this.pinned=false;this.go('shift');sfx.roar();cam.shake(.6);G.storm.flash=1;sfx.thunder(1);
      G.msg('',want===2?'IT COMES DOWN':'THE STORM ANSWERS',2.2);return this.pose(dt,true,0,0,9,4);}
    if(this.phase===3&&!this.dead&&live&&S!=='shift'&&S!=='toperch'){this.boltCd-=dt;if(this.boltCd<=0){this.boltCd=S==='perch'?1:2.1;
      G.strike(clamp(pl.pos.x+pl.vel.x*.35,ar.x0,ar.x1),clamp(pl.pos.z+pl.vel.z*.35,ar.z0,ar.z1),gy,.9,3.2,16,this);}}
    const circle=()=>{this.th+=.78*dt;this.flyTo(C.x+sin(this.th)*24,gy+10+sin(G.rt*.8)*.8,C.z+cos(this.th)*24,3.7,dt,false);this.yaw=turnTo(this.yaw,this.th+PI/2,4.8*dt);tr=.45;};
    if(S==='intro'){this.th+=1.25*dt;this.flyTo(C.x+sin(this.th)*22,gy+lerp(16,10,smooth(sat(t/4.6))),C.z+cos(this.th)*22,6,dt,false);this.yaw=turnTo(this.yaw,this.th+PI/2,6*dt);tr=.5;
      if(!this.marked&&t>.4){this.marked=true;sfx.roar();sfx.thunder(.8);G.storm.flash=1;}
      if(t>4.6){this.go('circle');this.cd=1.2;}}
    else if(S==='circle'){circle();
      if(this.cd<=0&&live){const a=this.atk++%4;this.go(a===1?'dpre':a===3?'breath':'volley');if(a===1)this.passes=1;}}
    else if(S==='volley'){circle();T.np=.4;
      if(this.fired<4&&t>=.5+this.fired*.45){this.fired++;this.head(_b);orbs.spawn(_b.x,_b.y,_b.z,pl.pos.x-_b.x,pl.pos.y+1-_b.y,pl.pos.z-_b.z,this,8.4);}
      if(t>=3){this.go('circle');this.cd=2.6;}}
    else if(S==='dpre'){
      const dur=this.phase===3?.8:1.1;
      if(!this.marked){this.marked=true;let ux=dx/(dist||1),uz=dz/(dist||1);if(dist<2){ux=sin(this.yaw);uz=cos(this.yaw);}
        this.ld.set(ux,0,uz);this.ls.set(pl.pos.x-ux*32,gy+7,pl.pos.z-uz*32);fx.line(pl.pos.x,gy,pl.pos.z,atan2(ux,uz),64,13.6,dur,0x9fc8ff);sfx.telegraph(true);}
      this.flyTo(this.ls.x,this.ls.y,this.ls.z,5.3,dt,false);this.yaw=turnTo(this.yaw,atan2(this.ld.x,this.ld.z),5*dt);tp=.25;
      if(t>=dur){this.go('dpass');this.lt=0;P.copy(this.ls);sfx.whoosh(.4,2);}}
    else if(S==='dpass'){flap=false;T.wrL=T.wrR=.25;T.wf=.55;T.np=-.1;kJ=14;
      this.lt+=44*dt;const s=this.lt,k=(s-32)/32;P.set(this.ls.x+this.ld.x*s,gy+1.9+k*k*5.2,this.ls.z+this.ld.z*s);this.yaw=atan2(this.ld.x,this.ld.z);tp=k*.3;
      if(random()<dt*120)fx.parts.spawn(P.x+rand(-6,6),P.y+rand(-.5,.5),P.z+rand(-6,6),0,0,0,1.4,2,3.4,rand(.1,.25),.5);
      const ax=pl.pos.x-P.x,az=pl.pos.z-P.z;   // hit zone: 3.6 m along the flight line, 6.8 m to either side
      if(!this.struck&&abs(ax*this.ld.x+az*this.ld.z)<3.6&&abs(ax*this.ld.z-az*this.ld.x)<6.8&&py<2.8&&pl.takeHit(20,this))this.struck=true;
      if(s>=64)this.go('dshot');}
    else if(S==='dshot'){
      P.x+=this.ld.x*16*dt;P.z+=this.ld.z*16*dt;P.y=damp(P.y,gy+9,2.5,dt);this.yaw=turnTo(this.yaw,toP,5*dt);T.np=.4;tr=.3;
      if(this.fired<3&&t>=.15+this.fired*.22){this.fired++;this.head(_b);orbs.spawn(_b.x,_b.y,_b.z,pl.pos.x-_b.x,pl.pos.y+1-_b.y,pl.pos.z-_b.z,this,8.4);}
      if(t>=.9){this.passes--;if(this.phase===1){this.th=atan2(P.x-C.x,P.z-C.z);this.go('circle');this.cd=2.2;}else if(this.passes>0)this.go('dpre');else this.go('land');}}
    else if(S==='breath'){
      this.flyTo(C.x+sin(this.th)*20,gy+6.5,C.z+cos(this.th)*20,2.5,dt,false);this.yaw=turnTo(this.yaw,toP,3*dt);T.np=.55;coreK=2.5+t*6;
      this.head(_b);if(random()<dt*60){const a=rand(TAU),rr=rand(2,4);fx.parts.spawn(P.x+cos(a)*rr,P.y-.4+rand(-1,1),P.z+sin(a)*rr,-cos(a)*rr*2,0,-sin(a)*rr*2,1.6,2.2,3.4,rand(.08,.16),.5);}
      if(!this.marked){this.marked=true;sfx.tone({type:'sawtooth',f0:70,f1:240,dur:2.1,g:.25,a:1.6});G.msg('','SHOOT THE CORE',1.6);}
      if(t>=2.3)this.go('barrage');}
    else if(S==='barrage'){this.yaw=turnTo(this.yaw,toP,3*dt);T.np=.2;T.hp=.3;coreK=6;
      if(this.fired<6&&t>=this.fired*.3){this.fired++;G.strike(clamp(pl.pos.x+pl.vel.x*.3+rand(-1,1),ar.x0,ar.x1),clamp(pl.pos.z+pl.vel.z*.3+rand(-1,1),ar.z0,ar.z1),gy,.7,3,16,this);}
      if(t>=2.4){this.go('circle');this.cd=3;}}
    else if(S==='fall'){flap=false;T.wrL=.7;T.wrR=-.3;T.we=.2;T.np=-.4;this.vel.y=(this.vel.y||0)-30*dt;
      P.x=damp(P.x,this.spot.x,3,dt);P.z=damp(P.z,this.spot.z,3,dt);P.y+=this.vel.y*dt;tr=sin(t*9)*.5;tp=.4;
      if(P.y<=gY){P.y=gY;this.vel.y=0;this.landFx(true);this.go('stun');}}
    else if(S==='stun'){flap=false;T.wrL=this.pinned?-.55:-.25;T.wrR=-.25;T.we=.12;T.wf=.25;T.np=-.55;T.hp=.3+sin(t*4)*.08;T.tp=-.3;P.y=damp(P.y,gY-.5,8,dt);tr=this.pinned?.12:0;
      if(random()<dt*30)fx.parts.spawn(P.x+rand(-3,3),gy+rand(.4,2.6),P.z+rand(-3,3),0,rand(1,3),0,1.4,2,3.4,rand(.06,.12),.5,-1,1);
      if(t>=this.stunT){
        if(this.phase===1){this.th=atan2(P.x-C.x,P.z-C.z);this.go('circle');this.cd=2;}
        else if(this.phase===2&&!this.pinned){this.go('gidle');this.cd=.8;}
        else{this.pinned=false;this.passes=this.phase===3?2:1;this.go('dpre');}}}
    else if(S==='shift'){flap=true;this.ph+=dt*4;T.np=.7;T.hp=-.4;coreK=6;this.flyTo(P.x,max(P.y,gy+5),P.z,2,dt,false);
      if(t>=1.6){if(this.phase===2)this.go('land');else this.go('toperch');}}
    else if(S==='land'){
      if(!this.marked){this.marked=true;let ux=-dx/(dist||1),uz=-dz/(dist||1);let x=clamp(pl.pos.x+ux*11,ar.x0+4,ar.x1-4),z=clamp(pl.pos.z+uz*11,ar.z0+4,ar.z1-4);
        const d=hypot(x-C.x,z-C.z);if(d<8){const a=d>.1?atan2(x-C.x,z-C.z):0;x=C.x+sin(a)*8;z=C.z+cos(a)*8;}this.spot.set(x,gY,z);}
      this.flyTo(this.spot.x,gY,this.spot.z,3.7,dt);
      if(P.distanceTo(this.spot)<.8||t>2.6){P.copy(this.spot);this.landFx(false);if(this.phase===2)this.armor=this.maxArmor;this.groundT=0;this.go('gidle');this.cd=.9;}}
    else if(S==='gidle'){flap=false;T.wrL=T.wrR=.35;T.we=-.9;T.wf=1;T.np=.5;P.y=damp(P.y,gY+abs(sin(G.rt*5))*(dist>9?.35:0),8,dt);
      this.yaw=turnTo(this.yaw,toP,1.9*dt);this.groundT+=dt;
      if(dist>9){P.x+=sin(this.yaw)*3.2*dt;P.z+=cos(this.yaw)*3.2*dt;}
      if(this.cd<=0&&live){const ang=abs(wrapA(toP-this.yaw));
        if(this.phase===3&&this.groundT>6.5){this.passes=2;this.go('dpre');}
        else if(dist<10&&ang>1.9)this.go('tail');else if(dist>11||ang>1.1)this.go('bite');else this.go((this.side^=1)?'wsw':'bite');
        if(this.state!=='gidle'&&this.state!=='dpre'){sfx.telegraph(true);this.head(_b);fx.flares.spawn(_b,0x9fc8ff,6,.5,.5,.5,7,.06,0);fx.flares.spawn(_b,0x9fc8ff,6,.5,.5,.5,5,.06,PI/2);}}}
    else if(S==='wsw'){flap=false;this.yaw=turnTo(this.yaw,toP,1.2*dt);T.wrL=T.wrR=.3;T.we=-.3;T.wf=.2;T.np=.5;if(this.side)T.wrR=1.05;else T.wrL=1.05;if(this.side)T.wsR=-.5;else T.wsL=-.5;
      if(t>=.8){this.go('wsws');sfx.whoosh(.3,2);}}
    else if(S==='wsws'){flap=false;kJ=22;T.wrL=T.wrR=.3;T.we=-.1;T.wf=0;if(this.side){T.wsR=1.5;T.wrR=-.05;}else{T.wsL=1.5;T.wrL=-.05;}
      if(t>=.1&&!this.struck){this.struck=true;fx.puff(P.x+sin(this.yaw)*5,P.z+cos(this.yaw)*5,40,2,gy);cam.shake(.35);
        if(dist<10.5&&abs(wrapA(toP-this.yaw))<2&&py<1.5)pl.takeHit(18,this);}
      if(t>=.5){this.rec=.8;this.go('grec');}}
    else if(S==='tail'){flap=false;T.wrL=T.wrR=.5;T.we=-.6;T.wf=.6;T.tp=.7;T.np=.3;if(t>=.55){this.go('tails');sfx.whoosh(.35,1.8);}}
    else if(S==='tails'){flap=false;kJ=22;T.wrL=T.wrR=.5;T.we=-.6;T.wf=.6;T.tp=-.7;if(t<.3)this.yaw+=PI/.3*dt;
      if(t>=.3&&!this.struck){this.struck=true;this.landFx(false);if(dist<6.5&&py<1.3)pl.takeHit(16,this);waves.ring(P.x,gy,P.z,14,22,14,this,0x9fc8ff,3);}
      if(t>=.6){this.rec=.9;this.go('grec');}}
    else if(S==='bite'){flap=false;T.wrL=T.wrR=.45;T.we=-.8;T.wf=.9;T.np=.95;T.hp=-.6;if(t<.48)this.yaw=turnTo(this.yaw,toP,4.5*dt);
      if(t>=.66){this.go('bites');this.vel.set(sin(this.yaw)*30,0,cos(this.yaw)*30);sfx.whoosh(.6,1.8);}}
    else if(S==='bites'){flap=false;kJ=26;T.wrL=T.wrR=.2;T.we=-.3;T.wf=.9;T.np=-.25;T.hp=.25;
      if(t<.34){P.x+=this.vel.x*dt;P.z+=this.vel.z*dt;}
      if(!this.struck&&t<.4&&dist<4.2&&abs(wrapA(toP-this.yaw))<1.1&&py<2.4){this.struck=true;pl.takeHit(22,this);}
      if(t>=.58){this.rec=1;this.go('grec');}}
    else if(S==='grec'){flap=false;T.wrL=T.wrR=.35;T.we=-.9;T.wf=1;T.np=.2;if(t>=this.rec){this.go('gidle');this.cd=.7;}}
    else if(S==='toperch'){this.flyTo(C.x,gy+17.7,C.z,3.5,dt);
      if(t>=1.9){P.set(C.x,gy+17.7,C.z);this.go('perch');for(const sx of [-1,1])G.spawnFoe('lantern',C.x+sx*13,C.z+sx*4,{link:this});G.msg('','BREAK THE LANTERNS',2.4);}}
    else if(S==='perch'){flap=false;T.wrL=T.wrR=.2;T.we=-1.2;T.wf=1.3;T.np=.7;T.hp=.2;this.yaw=turnTo(this.yaw,toP,1.5*dt);coreK=1.2;
      let n=0;for(const e of G.enemies)if(e.kind==='lantern'&&!e.dead&&e.link===this)n++;this.shieldOn=n>0;
      if(n===0&&t>1){this.shieldOn=false;this.stunT=5;this.vel.set(0,0,0);this.go('fall');const a=atan2(pl.pos.x-C.x,pl.pos.z-C.z);this.spot.set(C.x+sin(a)*8,gY,C.z+cos(a)*8);sfx.roar();G.onBreak(this);}}
    else if(S==='dead'){flap=t<1.4;this.ph+=dt*8;T.np=sin(t*14)*.6;T.hp=.4;tr=sin(t*11)*.6;tp=.5;coreK=3+t*8;
      if(P.y>gY){this.vel.y=(this.vel.y||0)-14*dt;P.y=max(gY,P.y+this.vel.y*dt);}
      if(random()<dt*70)fx.parts.spawn(P.x+rand(-4,4),P.y+rand(-1,1.5),P.z+rand(-4,4),0,rand(2,7),0,1.4,2,3.4,rand(.1,.25),.8,-1,1);
      if(random()<dt*2.5)fx.bolt(P.x+rand(-5,5),gy,P.z+rand(-5,5));
      if(t>2.6&&!this.gone){this.gone=true;fx.embers(P.x,P.y,P.z,340,[1.4,2,3.4],3);fx.embers(P.x,P.y,P.z,120,[3.2,1.6,.5],2);fx.glows.spawn(P,0x9fc8ff,7,.5,2,2,26,26);fx.flash(P,0x9fc8ff,400,.5);
        fx.rings.spawn(P.x,gy+.06,P.z,0x9fc8ff,5,1,22,.9);sfx.death();sfx.boom();sfx.thunder(1);cam.shake(1);G.storm.flash=1.5;this.remove();return;}}
    if(this.grounded||S==='bites'){P.x=clamp(P.x,ar.x0+2,ar.x1-2);P.z=clamp(P.z,ar.z0+2,ar.z1-2);}
    if(flap){const a=this.ph;T.wrL=T.wrR=.15+sin(a)*.55;T.we=-.15-sin(a-.9)*.35;}
    this.pose(dt,flap,tp,tr,kJ,coreK);
  }
  pose(dt,flap,tp,tr,kJ,coreK){
    const J=this.J,T=this.T;for(const k in J)J[k]=damp(J[k],T[k],flap&&(k==='wrL'||k==='wrR'||k==='we')?30:kJ,dt);
    this.pitch=damp(this.pitch,tp,5,dt);this.roll=damp(this.roll,tr,4,dt);
    this.root.position.copy(this.pos);this.root.rotation.set(this.pitch,this.yaw,this.roll);
    const [wl,wr2]=this.wing;wl.s1.rotation.set(0,-J.wsL+J.wf*.35,J.wrL);wl.s2.rotation.set(0,J.wf,J.we);wl.s3.rotation.set(0,J.wf*.8,J.we*.6);
    wr2.s1.rotation.set(0,-J.wsR+J.wf*.35,J.wrR);wr2.s2.rotation.set(0,J.wf,J.we);wr2.s3.rotation.set(0,J.wf*.8,J.we*.6);
    this.n1.rotation.x=-J.np;this.n2.rotation.x=-J.np*.5+J.hp*.4;this.hd.rotation.x=J.np*1.2+J.hp;this.tail.rotation.x=J.tp;
    this.legs.visible=!flap;
    const sh=this.shieldOn;this.coreM.color.setHex(sh?0x6fffe0:this.phase===2&&this.armor>0?0xffc070:0xbfe4ff).multiplyScalar(coreK*(1+.2*sin(G.rt*8)));
    this.core.scale.set(.6,.55,.7).multiplyScalar(1+min(.6,(coreK-2.5)*.05));
    this.iron.emissiveIntensity=this.flash*this.flash*1.4;
  }
}
