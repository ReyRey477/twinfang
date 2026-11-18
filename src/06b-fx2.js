// ===================== FX 2: tracers, lightning, markers, shockwaves, beams =====================
const addMat=(hex,k)=>new THREE.MeshBasicMaterial({color:hdr(hex,k),blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,fog:false,side:THREE.DoubleSide});
const addMesh=(geo,hex,k)=>{const m=new THREE.Mesh(geo,addMat(hex,k));m.visible=false;m.frustumCulled=false;scene.add(m);return m;};
Object.assign(fx,{
  tracers:Array.from({length:6},()=>({m:addMesh(GB,0xfff0c0,6),life:0})),ti:0,
  tracer(a,b){const t=this.tracers[this.ti=(this.ti+1)%6];t.m.position.copy(a).lerp(b,.5);t.m.scale.set(.035,.035,max(.1,a.distanceTo(b)));t.m.lookAt(b);t.m.visible=true;t.life=.07;},
  bolts:Array.from({length:4},()=>{const g=new THREE.Group();g.visible=false;scene.add(g);for(let i=0;i<4;i++){const m=new THREE.Mesh(GB,addMat(0xbfd8ff,7));m.scale.set(.3,10,.3);g.add(m);}return {g,life:0};}),bi:0,
  bolt(x,y,z,quiet){
    const b=this.bolts[this.bi=(this.bi+1)%4];b.g.position.set(x,y,z);b.g.visible=true;b.life=.16;let ox=0,oz=0;
    b.g.children.forEach((m,i)=>{const nx=ox+rand(-1.2,1.2),nz=oz+rand(-1.2,1.2);m.position.set((ox+nx)/2,5+i*10,(oz+nz)/2);m.rotation.set((nz-oz)/10,0,-(nx-ox)/10);ox=nx;oz=nz;});
    _a.set(x,y+.6,z);this.flares.spawn(_a,0xbfd8ff,7,.22,1,1,9,.06,0);this.flares.spawn(_a,0xbfd8ff,7,.22,1,1,7,.06,PI/2);this.glows.spawn(_a,0x9cc0ff,4,.25,1,1,7,7);
    this.flash(_a,0x9cc0ff,260,.25);this.rings.spawn(x,y+.06,z,0x9cc0ff,4,.4,3.4,.35);this.sparks(_a,0,1,0,26,[2,2.6,3.6],11);
    if(!quiet){sfx.thunder(1);cam.shake(.3);}
  },
  discs:Array.from({length:10},()=>({m:addMesh(new THREE.CircleGeometry(1,48),0xff5a1a,1),t:0,life:0})),di:0,
  disc(x,y,z,r,life,hex=0xff5a1a){const d=this.discs[this.di=(this.di+1)%10];d.m.rotation.x=-PI/2;d.m.position.set(x,y+.05,z);d.m.scale.setScalar(r);d.m.material.color.setHex(hex).multiplyScalar(1.2);d.m.visible=true;d.t=0;d.life=life;return d;},
  lines:Array.from({length:3},()=>({m:addMesh(new THREE.PlaneGeometry(1,1),0xff5a1a,1.4),t:0,life:0})),li2:0,
  line(x,y,z,yaw,len,w,life,hex=0xff5a1a){const d=this.lines[this.li2=(this.li2+1)%3];d.m.rotation.order='YXZ';d.m.rotation.set(-PI/2,yaw,0);d.m.position.set(x,y+.06,z);d.m.scale.set(w,len,1);d.m.material.color.setHex(hex).multiplyScalar(1.4);d.m.visible=true;d.t=0;d.life=life;return d;},
  update2(gdt,rdt){
    this.updateDeb(gdt);
    for(const t of this.tracers){if(t.life>0){t.life-=rdt;if(t.life<=0)t.m.visible=false;}}
    for(const b of this.bolts){if(b.life>0){b.life-=rdt;b.g.visible=b.life>0&&(b.life>.1||random()<.6);}}
    for(const d of this.discs.concat(this.lines)){if(!d.m.visible)continue;d.t+=gdt;if(d.t>=d.life){d.m.visible=false;continue;}const k=d.t/d.life;d.m.material.opacity=.12+.3*k+.12*sin(d.t*30)*k;}
  },
  clearMarks(){for(const d of this.discs.concat(this.lines))d.m.visible=false;},
  // wreckage: instanced plates with gravity, one bounce and a spin; they cool from glowing to dark as they settle
  deb:(()=>{const n=120,m=new THREE.InstancedMesh(new RoundedBoxGeometry(1,1,1,1,.1),pbr('armor',{color:0x5a606c,emissive:0xff5a14,emissiveIntensity:.0}),n);m.castShadow=true;m.frustumCulled=false;m.count=n;scene.add(m);
    const it=Array.from({length:n},()=>({p:V(0,-999,0),v:V(),r:new THREE.Euler(),w:V(),s:V(1,1,1),life:0,gy:0}));const o=new THREE.Object3D();
    for(let i=0;i<n;i++){o.position.set(0,-999,0);o.updateMatrix();m.setMatrixAt(i,o.matrix);}
    return {m,it,o,i:0};})(),
  debris(x,y,z,n,sc=1,gy=0){const D=this.deb;for(let k=0;k<n;k++){const d=D.it[D.i=(D.i+1)%D.it.length],a=rand(TAU),sp=rand(2,8);
    d.p.set(x+rand(-.3,.3)*sc,y+rand(-.5,.5)*sc,z+rand(-.3,.3)*sc);d.v.set(cos(a)*sp,rand(3,9),sin(a)*sp);d.w.set(rand(-12,12),rand(-12,12),rand(-12,12));d.s.set(rand(.08,.3)*sc,rand(.03,.1)*sc,rand(.08,.26)*sc);d.life=rand(2.2,3.6);d.gy=gy;}},
  updateDeb(dt){const D=this.deb,o=D.o;let any=false;for(let i=0;i<D.it.length;i++){const d=D.it[i];if(d.life<=0)continue;any=true;d.life-=dt;d.v.y-=22*dt;d.p.addScaledVector(d.v,dt);
      if(d.p.y<d.gy+d.s.y*.5){d.p.y=d.gy+d.s.y*.5;if(abs(d.v.y)>1.5){d.v.y*=-.35;d.v.x*=.6;d.v.z*=.6;d.w.multiplyScalar(.5);}else{d.v.set(0,0,0);d.w.set(0,0,0);}}
      d.r.x+=d.w.x*dt;d.r.y+=d.w.y*dt;d.r.z+=d.w.z*dt;o.position.copy(d.p);o.rotation.copy(d.r);const k=clamp(d.life*2.5,.05,1);o.scale.set(d.s.x*k,d.s.y*k,d.s.z*k);if(d.life<=0)o.position.y=-999;o.updateMatrix();D.m.setMatrixAt(i,o.matrix);}
    if(any||D.dirty){D.m.instanceMatrix.needsUpdate=true;D.dirty=any;}}
});
function makeBeam(hex){
  const m=addMesh(new THREE.CylinderGeometry(1,1,1,6,1,true).rotateX(PI/2),hex,1.1);
  return {m,set(a,b,w=.06){m.position.copy(a).lerp(b,.5);m.scale.set(w*(1+.3*sin(G.rt*40)),w,max(.1,a.distanceTo(b)));m.lookAt(b);m.visible=true;},hide(){m.visible=false;},dispose(){scene.remove(m);}};
}
// shockwaves that can hurt the player: expanding rings and travelling lines
const waves={
  rings:Array.from({length:6},()=>({ring:addMesh(new THREE.RingGeometry(.9,1,72),0xff6a2a,3),wall:addMesh(new THREE.CylinderGeometry(1,1,1,56,1,true),0xff6a2a,1.2),on:false,pos:V()})),
  lines:Array.from({length:5},()=>({m:addMesh(GB,0xff6a2a,2.2),g:addMesh(new THREE.PlaneGeometry(1,1),0xff6a2a,1.2),on:false,pos:V()})),ri:0,li:0,
  ring(x,y,z,speed,maxR,dmg,owner,hex=0xff6a2a,r0=.5){
    const o=this.rings[this.ri=(this.ri+1)%6];Object.assign(o,{on:true,r:r0,speed,maxR,dmg,owner,hit:false,dodged:false,y});o.pos.set(x,y,z);
    for(const m of [o.ring,o.wall]){m.material.color.setHex(hex).multiplyScalar(m===o.ring?3:1.1);m.visible=true;}
    o.ring.rotation.x=-PI/2;o.ring.position.set(x,y+.07,z);o.wall.position.set(x,y+.45,z);
  },
  line(x0,x1,y,z,dir,speed,dist,dmg,owner){
    const o=this.lines[this.li=(this.li+1)%5];Object.assign(o,{on:true,x0,x1,y,z,dir,speed,left:dist,dmg,owner,hit:false,dodged:false});
    o.m.scale.set(x1-x0,1.1,.3);o.g.scale.set(x1-x0,2.4,1);o.g.rotation.x=-PI/2;o.m.visible=o.g.visible=true;
  },
  update(dt){
    const p=G.player,live=G.state==='play';
    for(const o of this.rings){if(!o.on)continue;o.r+=o.speed*dt;const k=o.r/o.maxR;
      if(k>=1){o.on=false;o.ring.visible=o.wall.visible=false;continue;}
      o.ring.scale.setScalar(o.r);o.wall.scale.set(o.r,.9,o.r);o.ring.material.opacity=1-k*k;o.wall.material.opacity=(1-k)*.8;
      if(live&&!o.hit){const d=hypot(p.pos.x-o.pos.x,p.pos.z-o.pos.z);if(abs(d-o.r)<.75&&p.pos.y-o.y<.9&&p.takeHit(o.dmg,o))o.hit=true;}}
    for(const o of this.lines){if(!o.on)continue;const st=o.speed*dt;o.z+=o.dir*st;o.left-=st;
      if(o.left<=0){o.on=false;o.m.visible=o.g.visible=false;continue;}
      const cx=(o.x0+o.x1)/2;o.pos.set(cx,o.y,o.z-o.dir*2);o.m.position.set(cx,o.y+.55,o.z);o.g.position.set(cx,o.y+.06,o.z-o.dir);o.m.material.opacity=.7+.3*sin(G.rt*50);
      if(live&&!o.hit&&abs(p.pos.z-o.z)<.7&&p.pos.x>=o.x0&&p.pos.x<=o.x1&&p.pos.y-o.y<1&&p.takeHit(o.dmg,o))o.hit=true;}
  },
  clear(){for(const o of this.rings){o.on=false;o.ring.visible=o.wall.visible=false;}for(const o of this.lines){o.on=false;o.m.visible=o.g.visible=false;}}
};
