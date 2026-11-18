// ===================== ORBS + LANTERN =====================
// Slow homing orbs fired by Lanterns and the Stormvane. Slash one to send it back at its owner; shoot it to pop it.
const orbs={list:[],pool:[],
  make(){
    const m=new THREE.Mesh(GS,new THREE.MeshBasicMaterial({color:hdr(0xcfe4ff,3)})); m.scale.setScalar(.3);
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:hdr(0x8fc0ff,1.6),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false})); s.scale.setScalar(6); m.add(s);
    scene.add(m); return m;
  },
  spawn(x,y,z,dx,dy,dz,owner,speed=7.8){
    const o={pos:V(x,y,z),vel:V(dx,dy,dz).normalize().multiplyScalar(speed),owner,life:7,back:false,dodged:false,dead:false,speed,m:this.pool.pop()||this.make()};
    o.m.visible=true; o.m.material.color.copy(hdr(0xcfe4ff,3)); o.m.position.copy(o.pos); this.list.push(o); sfx.orb(); return o;
  },
  kill(o,burst=true){
    const i=this.list.indexOf(o); if(i>=0)this.list.splice(i,1); o.m.visible=false; this.pool.push(o.m); o.dead=true;
    if(burst){fx.sparks(o.pos,0,.3,0,10,[1.6,2.2,3.2],5);fx.glows.spawn(o.pos,0x9fc8ff,2,.15,.3,.3,1.6,1.6);}
  },
  deflect(o){
    o.back=true; o.life=5; o.m.material.color.copy(hdr(0x7fffe0,4));
    fx.flares.spawn(o.pos,0x9fffe0,5,.2,.5,.4,4.5,.03,rand(-.6,.6)); fx.flash(o.pos,0x9fffe0,60,.15); sfx.deflect();
  },
  update(dt){
    const p=G.player;
    for(let i=this.list.length-1;i>=0;i--){
      const o=this.list[i]; o.life-=dt; if(o.life<=0){this.kill(o);continue;}
      if(o.back){
        const w=o.owner; if(!w||w.dead){this.kill(o);continue;}
        _a.set(w.pos.x,w.cy(),w.pos.z).sub(o.pos); const d=_a.length()||.01;
        if(d<w.radius+.8){w.orbHit(o);this.kill(o);continue;} o.vel.copy(_a).multiplyScalar(22/d);
      }else if(G.state==='play'){
        _a.set(p.pos.x,p.pos.y+1.1,p.pos.z).sub(o.pos); const d=_a.length()||.01;
        if(d<.85){const hit=p.takeHit(9,o); if(hit||p.state!=='dodge'){this.kill(o);continue;}}
        const lead=min(.3,d*.05); _a.x+=p.vel.x*lead; _a.z+=p.vel.z*lead; _a.setLength(o.speed); o.vel.lerp(_a,1-exp(-2*dt)).setLength(o.speed);
      }
      o.pos.addScaledVector(o.vel,dt); o.m.position.copy(o.pos);
    }
  },
  clear(){while(this.list.length)this.kill(this.list[0],false);}
};

const lanternGeo={ring:new THREE.TorusGeometry(.62,.035,6,22),cap:new THREE.ConeGeometry(.3,.4,6)};
class Lantern{
  constructor(x,z,o={}){
    this.kind='lantern';this.B=false;this.S=false;this.scale=1;this.radius=.75;this.hp=this.maxHp=55;this.gy=o.gy||0;this.ar=o.ar;
    this.pos=V(x,this.gy+4.2,z);this.vel=V();this.state='spawn';this.t=0;this.low=0;this.lowT=0;this.fireCd=rand(1.6,3.2);this.linkCd=1.2;this.link=o.link||null;this.forced=!!o.link;
    this.flash=0;this.dead=false;this.gone=false;this.strafe=random()<.5?-1:1;this.strafeT=rand(2,4);this.seed=rand(10);
    const root=this.root=new THREE.Group(); scene.add(root);
    this.metal=pbr('plate',{color:0xb4bac6,emissive:0x9fd0ff,emissiveIntensity:0,envMapIntensity:1});
    this.cage=new THREE.Group(); root.add(this.cage);
    for(const r of [[0,0,0],[PI/2,0,0],[0,PI/2,0]]){const m=new THREE.Mesh(lanternGeo.ring,this.metal);m.rotation.set(r[0],r[1],r[2]);m.castShadow=true;this.cage.add(m);}
    const top=new THREE.Mesh(lanternGeo.cap,this.metal);top.position.y=.8;root.add(top);
    for(let k=0;k<3;k++){const c=new THREE.Mesh(lanternGeo.cap,this.metal);c.scale.set(.3,1.4-k*.3,.3);c.rotation.x=PI;c.position.set((k-1)*.22,-.85+abs(k-1)*.12,0);root.add(c);}
    this.coreM=new THREE.MeshBasicMaterial({color:hdr(0xcfe4ff,3)}); this.core=new THREE.Mesh(GS,this.coreM); this.core.scale.setScalar(.3); root.add(this.core);
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:hdr(0x8fc0ff,.55),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false})); s.scale.setScalar(2.4); root.add(s);
    this.beam=makeBeam(0x9fd0ff); if(this.link)this.link.shield=this;
    root.position.copy(this.pos); root.scale.setScalar(.01);
    fx.rings.spawn(x,this.gy+.05,z,0x9fc8ff,3,.3,2,.9);
  }
  get ghost(){return this.state==='spawn';}
  get air(){return true;}
  solid(){return 0;}
  cy(){return this.pos.y;}
  hitPos(o){return o.copy(this.pos);}
  remove(){scene.remove(this.root);this.unlink();this.beam.dispose();}
  unlink(cd=3){if(this.link&&this.link.shield===this)this.link.shield=null;if(!this.forced||this.dead)this.link=null;this.linkCd=cd;}
  takeHit(h,dx,dz){
    if(this.dead||this.ghost)return;this.hp-=h.dmg;this.flash=1;if(!this.forced)this.unlink();
    if(this.hp<=0)return this.die();
    const kb=(h.kb??2)*.6;this.vel.x=dx*kb;this.vel.z=dz*kb;
    if(h.spike||h.launch||h.down||h.big){this.state='stun';this.t=0;}else if(this.state!=='stun'){this.state='stagger';this.t=0;}
  }
  gunHit(){
    if(this.dead||this.ghost)return false;this.hp-=2;this.flash=.7;this.low=min(2.6,this.low+.65);this.lowT=2.2;
    if(this.hp<=0){this.die();return true;}
    if(this.state==='charge'||this.state==='float'){this.state='stagger';this.t=0;if(!this.forced)this.unlink(2);}
    return true;
  }
  orbHit(){this.hp-=30;this.flash=1;fx.hit(this.pos,0,0,true,0);cam.shake(.25);if(this.hp<=0)this.die();else{this.state='stun';this.t=0;if(!this.forced)this.unlink();}}
  die(){this.dead=true;this.state='dead';this.t=0;this.unlink();this.beam.hide();G.onKill(this);}
  update(dt){
    const pl=G.player,P=this.pos,dx=pl.pos.x-P.x,dz=pl.pos.z-P.z,dist=hypot(dx,dz)||.01,S=this.state,gy=this.gy;
    this.t+=dt;this.flash=max(0,this.flash-dt*4);let ty=gy+4.2-this.low,ky=3,glow=3;
    const fr=k=>{const e=exp(-k*dt);this.vel.x*=e;this.vel.z*=e;};
    if(S==='spawn'){this.root.scale.setScalar(smooth(min(1,this.t)));if(this.t>1)this.state='float';}
    else if(S==='float'||S==='charge'){
      this.strafeT-=dt;if(this.strafeT<0){this.strafeT=rand(2,4);this.strafe=-this.strafe;}
      const ux=dx/dist,uz=dz/dist;let mx,mz;
      if(dist>11){mx=ux*2.4;mz=uz*2.4;}else if(dist<7){mx=-ux*2.6;mz=-uz*2.6;}else{mx=-uz*this.strafe*1.3;mz=ux*this.strafe*1.3;}
      this.vel.x=damp(this.vel.x,mx,3,dt);this.vel.z=damp(this.vel.z,mz,3,dt);
      this.lowT-=dt;if(this.lowT<=0)this.low=max(0,this.low-.5*dt);
      this.linkCd-=dt;
      if(!this.link&&this.linkCd<=0){this.linkCd=1;let best=null,bs=1e9;
        for(const e of G.enemies){if(e.dead||e.ghost||e.shield||e.boss||e.kind==='lantern')continue;const d=hypot(e.pos.x-P.x,e.pos.z-P.z)-(e.B?6:0);if(d<16&&d<bs){bs=d;best=e;}}
        if(best){this.link=best;best.shield=this;}}
      if(S==='float'){this.fireCd-=dt;if(this.fireCd<=0&&dist<26&&G.state==='play'&&pl.state!=='dead'){this.state='charge';this.t=0;sfx.tone({f0:500,f1:1500,dur:.6,g:.12,type:'triangle',a:.4});}}
      else{glow=3+this.t*9;if(this.t>=.7){orbs.spawn(P.x,P.y,P.z,dx,pl.pos.y+1.1-P.y,dz,this);this.fireCd=rand(2.6,3.8);this.state='float';}}
    }
    else if(S==='stagger'){fr(5);if(this.t>.5)this.state='float';}
    else if(S==='stun'){fr(5);ty=gy+.95;ky=9;glow=1+random();if(random()<dt*25)fx.parts.spawn(P.x+rand(-.4,.4),P.y+rand(-.3,.5),P.z+rand(-.4,.4),rand(-1,1),rand(1,3),rand(-1,1),1.4,2,3,rand(.05,.1),.4,6,1);if(this.t>2.6)this.state='float';}
    else if(S==='dead'){ty=P.y;glow=3+this.t*30;this.root.scale.setScalar(1+this.t);
      if(this.t>.3&&!this.gone){this.gone=true;fx.embers(P.x,P.y,P.z,60,[1.4,2,3.2],.5);fx.glows.spawn(P,0x9fc8ff,5,.3,.5,.5,5,5);fx.flash(P,0x9fc8ff,120,.3);sfx.death();this.remove();return;}}
    P.x+=this.vel.x*dt;P.z+=this.vel.z*dt;if(this.ar){P.x=clamp(P.x,this.ar.x0,this.ar.x1);P.z=clamp(P.z,this.ar.z0,this.ar.z1);}
    P.y=damp(P.y,ty+(S==='stun'?0:sin(G.rt*2+this.seed)*.15),ky,dt);
    const L=this.link;
    if(L){if(L.dead||L.gone||(!this.forced&&hypot(L.pos.x-P.x,L.pos.z-P.z)>20)||S==='stun'&&!this.forced)this.unlink(1.5);
      else if(!this.dead){L.shield=this;_a.set(L.pos.x,L.cy(),L.pos.z);this.beam.set(P,_a,.035);}}
    if(!this.link||this.dead)this.beam.hide();
    this.root.position.copy(P);this.cage.rotation.y+=dt*(S==='stun'?.3:1.6);this.cage.rotation.x=sin(G.rt+this.seed)*.3;
    this.coreM.color.setHex(0xcfe4ff).multiplyScalar(glow);this.core.scale.setScalar(.3+(S==='charge'?this.t*.15:0));
    this.metal.emissiveIntensity=this.flash*this.flash*2;
  }
}
