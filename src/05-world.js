// ===================== WORLD =====================
// The level is a set of axis-aligned walkable AREAS (rooms, corridors, ramps). Walls, floors, ceilings,
// lamps and door barriers are generated from them, except for areas marked `manual` (the first corridor).
const HW=6.5,H=10.5,LEN=88,PLAY_X=4.4,WM=.5;
const MSM=THREE.MeshStandardMaterial;
const world=new THREE.Group(); scene.add(world);
const GB=new THREE.BoxGeometry(1,1,1), GS=new THREE.SphereGeometry(1,16,12);
const hdr=(hex,k)=>new THREE.Color(hex).multiplyScalar(k);
const stone=new MSM({color:0x9aa0aa,map:wallCol,roughness:.86,metalness:.12,envMapIntensity:.25});
const pillarMat=new MSM({color:0x8a9099,map:wallCol.clone(),roughness:.7,metalness:.25,envMapIntensity:.3}); pillarMat.map.repeat.set(1,3);
const darkM=new MSM({color:0x14161a,roughness:.75,metalness:.4,envMapIntensity:.25});
const metalM=new MSM({color:0x3a3f47,roughness:.38,metalness:.9,envMapIntensity:.6});
const stepM=new MSM({color:0x2c3038,roughness:.6,metalness:.35,envMapIntensity:.3});
const tealGlow=new THREE.MeshBasicMaterial({color:hdr(0x2ec4e6,1.5)});
const amberGlow=new THREE.MeshBasicMaterial({color:hdr(0xff8a2e,4)});
const skyGlow=new THREE.MeshBasicMaterial({color:hdr(0x9cc8ff,3)});
function box(w,h,d,m,x,y,z,sh=true){const o=new THREE.Mesh(GB,m);o.scale.set(w,h,d);o.position.set(x,y,z);o.castShadow=sh;o.receiveShadow=true;world.add(o);return o;}
const matCache={};
function floorMat(w,d,off){
  const k='f'+Math.round(w)+'_'+Math.round(d)+(off?'o':''); if(matCache[k])return matCache[k];
  const t=(tex,r)=>{const c=tex.clone();c.repeat.set(w/r,d/r);return c;};
  const m=new MSM({map:t(floorCol,4),roughnessMap:t(blotch,9),bumpMap:t(floorBump,4),bumpScale:1.2,roughness:.7,metalness:.3,envMapIntensity:.22,color:0x9aa2ad});
  if(off){m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-2;}
  return matCache[k]=m;
}
function wallMat(len,h){
  const k='w'+Math.round(len/2)+'_'+Math.round(h/2); if(matCache[k])return matCache[k];
  const m=stone.clone(); m.map=wallCol.clone(); m.map.repeat.set(max(1,Math.round(len/5)),max(1,Math.round(h/5))); return matCache[k]=m;
}
// pooled lights: the nearest few light spots get a real light each frame
const lightSpots=[];
const spot=(x,y,z,hex,i,d=17)=>lightSpots.push({x,y,z,c:new THREE.Color(hex),i,d,q:0});
function lamp(x,y,z,nx,nz,lit=true){
  box(.5,.12,.5,metalM,x+nx*.3,y-.25,z+nz*.3,false); const o=new THREE.Mesh(GS,amberGlow); o.scale.setScalar(.15); o.position.set(x+nx*.3,y,z+nz*.3); world.add(o);
  if(lit)spot(x+nx*.7,y+.1,z+nz*.7,0xff8a3a,34);
}
const lightPool=[]; for(let i=0;i<8;i++){const L=new THREE.PointLight(0xffffff,0,17,2);scene.add(L);lightPool.push(L);}
function updateLights(px,py,pz){
  for(const s of lightSpots){const dx=s.x-px,dy=(s.y-py)*2,dz=s.z-pz;s.q=dx*dx+dy*dy+dz*dz;}
  lightSpots.sort((a,b)=>a.q-b.q); const d9=lightSpots.length>8?sqrt(lightSpots[8].q):1e9;
  for(let i=0;i<8;i++){const L=lightPool[i],s=lightSpots[i];if(!s){L.intensity=0;continue;}const d=sqrt(s.q);
    L.position.set(s.x,s.y,s.z);L.color.copy(s.c);L.distance=s.d;L.intensity=s.i*sat((d9-d)/5)*sat((44-d)/8);}
}

// ---------- walkable areas ----------
const LOCKS={gate:true,warden:true,upper:true};
const AREAS=[
  {id:'cor', x0:-4.4,x1:4.4,z0:1.3,z1:86.8,y:0,ceil:10.5,manual:true},
  {id:'gate',x0:-2.6,x1:2.6,z0:86.8,z1:89.8,y:0,ceil:8,manual:true,lock:'gate'},
  {id:'hall',x0:-14.2,x1:14.2,z0:89.8,z1:128.2,y:0,ceil:16},
  {id:'wexit',x0:-3.4,x1:3.4,z0:128.2,z1:131,y:0,ceil:6,lock:'warden'},
  {id:'r1',x0:-4.5,x1:4.5,z0:131,z1:143,y:0,y1:5,ax:'z',ceil:8},
  {id:'l1',x0:-4.5,x1:4.5,z0:143,z1:153,y:5,ceil:8},
  {id:'r2',x0:4.5,x1:16.5,z0:143.5,z1:152.5,y:5,y1:10,ax:'x',ceil:8},
  {id:'l2',x0:16.5,x1:26.5,z0:143.5,z1:152.5,y:10,ceil:8},
  {id:'r3',x0:17,x1:26,z0:152.5,z1:164.5,y:10,y1:14,ax:'z',ceil:8},
  {id:'l3',x0:17,x1:26,z0:164.5,z1:171,y:14,ceil:8},
  {id:'u1',x0:19,x1:24,z0:171,z1:182,y:14,ceil:6},
  {id:'A', x0:8,x1:36,z0:182,z1:206,y:14,ceil:9},
  {id:'u2',x0:-8,x1:8,z0:190,z1:196,y:14,ceil:6},
  {id:'B', x0:-36,x1:-8,z0:180,z1:206,y:14,ceil:9},
  {id:'u3',x0:19,x1:25,z0:206,z1:214,y:14,ceil:6},
  {id:'u4',x0:-25,x1:-19,z0:206,z1:214,y:14,ceil:6},
  {id:'u5',x0:-25,x1:33,z0:214,z1:220,y:14,ceil:6},
  {id:'u6',x0:-3,x1:3,z0:220,z1:228,y:14,ceil:6},
  {id:'u7',x0:-3,x1:3,z0:206,z1:214,y:14,ceil:6},
  {id:'C', x0:-16,x1:16,z0:228,z1:254,y:14,ceil:9},
  {id:'u8',x0:-4,x1:4,z0:254,z1:262,y:14,ceil:6,lock:'upper'},
  {id:'r4',x0:-4,x1:4,z0:262,z1:274,y:14,y1:19,ax:'z',open:true},
  {id:'roof',x0:-30,x1:30,z0:274,z1:334,y:19,open:true}
];
const AREA={}; for(const a of AREAS){AREA[a.id]=a; a.yv=a.y1===undefined?a.y:a.y1; a.top=a.open?a.yv+1.3:a.yv+a.ceil; a.openings=[];}
const BLOCKERS=[{x:0,z:304,r:2.3}];
function areaH(a,x,z){if(a.y1===undefined)return a.y;const t=a.ax==='z'?(z-a.z0)/(a.z1-a.z0):(x-a.x0)/(a.x1-a.x0);return a.y+(a.y1-a.y)*sat(t);}
function areaAt(x,z,m=0,locks=true){for(const a of AREAS){if(locks&&a.lock&&LOCKS[a.lock])continue;if(x>=a.x0-m&&x<=a.x1+m&&z>=a.z0-m&&z<=a.z1+m)return a;}return null;}
function groundAt(x,z){const a=areaAt(x,z);return a?areaH(a,x,z):null;}
function walkable(x,z){if(!areaAt(x,z))return false;for(const b of BLOCKERS)if(hypot(x-b.x,z-b.z)<b.r)return false;return true;}

// ---------- barriers ----------
const barrierMat=()=>new THREE.ShaderMaterial({uniforms:{uT:{value:0},uA:{value:0}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float uT,uA;varying vec2 vUv;void main(){vec2 p=vUv*vec2(13.,10.5);
    float l=abs(fract(p.x*1.5+sin(p.y*2.+uT*1.3)*.1)-.5);float ln=smoothstep(.07,0.,l);
    float sc=.5+.5*sin(p.y*7.-uT*5.);float e=pow(clamp(1.-vUv.y,0.001,1.),2.5)*2.+.2;
    float hz=smoothstep(.04,0.,abs(fract(p.y*.7-uT*.25)-.5))*.5;
    vec3 c=vec3(1.,.36,.08)*(ln*(.35+sc*.65)+hz+.05)*e;gl_FragColor=vec4(c*uA*1.6,1.);}`,
  blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,transparent:true});
const barriers=[];
function makeBarrier(x,y,z,len,h,alongX=true){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(len,h),barrierMat()); m.position.set(x,y+h/2,z); if(!alongX)m.rotation.y=PI/2; m.visible=false; scene.add(m);
  const b={m,on:false,a:0}; barriers.push(b); return b;
}
function openingBarrier(a,o){
  const hz=o.side<2,mid=(o.s0+o.s1)/2,h=min(a.open?5:a.ceil,o.o.open?5:o.o.ceil);
  return hz?makeBarrier(mid,a.yv,o.side===0?a.z0:a.z1,o.s1-o.s0,h,true):makeBarrier(o.side===2?a.x0:a.x1,a.yv,mid,o.s1-o.s0,h,false);
}
const areaBarriers=id=>AREA[id].openings.map(o=>openingBarrier(AREA[id],o));

// ---------- first corridor (hand-built) ----------
{
  const CL_=LEN+7,cz=CL_/2-6;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(HW*2+2,CL_),floorMat(HW*2+2,CL_));
  floor.rotation.x=-PI/2; floor.position.set(0,0,cz); floor.receiveShadow=true; world.add(floor);
  for(const sx of [-1,1]){
    const wm=stone.clone(); wm.map=wallCol.clone(); wm.map.repeat.set(CL_/5,2);
    const wall=new THREE.Mesh(new THREE.PlaneGeometry(CL_,H+4),wm); wall.rotation.y=-sx*PI/2; wall.position.set(sx*HW,(H+4)/2,cz); wall.receiveShadow=true; world.add(wall);
    const v=box(7.6,.3,CL_,darkM,sx*HW/2,H+1.7,cz,false); v.rotation.z=-sx*.482;
    box(.07,.02,LEN,tealGlow,sx*3.2,.012,LEN/2,false);
  }
  for(let i=0;i<=10;i++){
    const z=4+8*i;
    for(const sx of [-1,1]){
      const x=sx*5.85;
      box(1.3,H,1.3,pillarMat,x,H/2,z); box(1.8,.7,1.8,darkM,x,.35,z); box(1.55,.3,1.55,metalM,x,.85,z); box(1.8,.6,1.8,darkM,x,H-.3,z);
      box(.06,H-4.5,.2,tealGlow,x-sx*.67,2.2+(H-4.5)/2,z,false);
      const rib=box(7.5,.5,.6,darkM,sx*HW/2,H+1.5,z,false); rib.rotation.z=-sx*.482;
      if((i%2===0)===(sx>0))lamp(x-sx*.55,3.4,z,-sx,0);
      if(i<10){
        const zb=z+4;
        if(i%2===0){const b=new THREE.Mesh(new THREE.PlaneGeometry(2.3,5.75),new MSM({map:bannerTex,alphaTest:.5,side:THREE.DoubleSide,roughness:.95,metalness:0,envMapIntensity:.2}));
          b.position.set(sx*(HW-.1),6.2,zb); b.rotation.y=-sx*PI/2; world.add(b); box(.12,.12,2.7,metalM,sx*(HW-.14),9.15,zb,false);}
        else{box(.1,4.6,.34,tealGlow,sx*(HW-.04),5,zb,false); box(.3,5.2,.9,darkM,sx*(HW-.02),5,zb,false);}
      }
    }
    if(i%2===1&&i<10){
      const zs=z+4; box(.7,.08,5.2,skyGlow,0,H+3.18,zs,false);
      for(const ry of [0,PI/2]){const r=new THREE.Mesh(new THREE.PlaneGeometry(ry?5:3.2,H+3),new THREE.MeshBasicMaterial({map:rayTex,color:0x7fb2ff,transparent:true,opacity:.09,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
        r.position.set(0,(H+3)/2+.1,zs); r.rotation.y=ry; world.add(r);}
      spot(0,6.5,zs,0x7fb0ff,22,16);
    }
  }
  for(let k=0;k<16;k++){const sx=random()<.5?-1:1,s=rand(.25,.7);const r=box(s,s*rand(.5,1),s*rand(.7,1.4),k%3?stone:darkM,sx*rand(4.95,5.5),s*.3,rand(2,LEN-3));r.rotation.set(rand(-.3,.3),rand(0,3),rand(-.3,.3));}
  box(HW*2+2,H+5,1,stone,0,(H+5)/2,-.5); box(6.4,8.4,.5,darkM,0,4.2,.05); box(.1,8.2,.52,metalM,0,4.1,.06);
}
// gate between corridor and hall
const door={open:false,k:0};
{
  const GH=H+8;
  box(3.6,GH,1,stone,-(HW-1.3),GH/2,LEN+.5); box(3.6,GH,1,stone,HW-1.3,GH/2,LEN+.5); box(7,GH-8,1,stone,0,8+(GH-8)/2,LEN+.5);
  box(7.4,.5,1.3,metalM,0,8.2,LEN+.4); box(.5,8,1.3,metalM,-3.5,4,LEN+.4); box(.5,8,1.3,metalM,3.5,4,LEN+.4);
  door.l=box(3.3,8,.5,darkM,1.65,4,LEN+.3); door.r=box(3.3,8,.5,darkM,-1.65,4,LEN+.3);
  door.seam=box(.08,7.6,.56,amberGlow,0,4,LEN+.3,false);
}

// ---------- generated geometry ----------
function wallSeg(a,side,s0,s1,y0,y1,decor){
  const len=s1-s0,h=y1-y0,mid=(s0+s1)/2,off=WM+.3,hz=side<2;
  const x=hz?mid:(side===2?a.x0-off:a.x1+off),z=hz?(side===0?a.z0-off:a.z1+off):mid;
  box(hz?len:.6,h,hz?.6:len,wallMat(len,h),x,(y0+y1)/2,z);
  if(!decor||a.open)return;
  const nx=hz?0:(side===2?1:-1),nz=hz?(side===0?1:-1):0;
  const at=s=>{const px=hz?s:(side===2?a.x0-WM:a.x1+WM),pz=hz?(side===0?a.z0-WM:a.z1+WM):s;return [px,areaH(a,clamp(px,a.x0,a.x1),clamp(pz,a.z0,a.z1)),pz];};
  for(let s=s0+3.5;s<s1-2;s+=7){const [px,gy,pz]=at(s);box(hz?.2:.06,a.ceil-4.4,hz?.06:.2,tealGlow,px+nx*.02,gy+2.2+(a.ceil-4.4)/2,pz+nz*.02,false);}
  for(let s=s0+7;s<s1-3;s+=14){const [px,gy,pz]=at(s);lamp(px,gy+3.4,pz,nx,nz);}
}
function buildAreas(){
  AREAS.forEach(a=>{
    for(let side=0;side<4;side++){
      const hz=side<2,lo=hz?a.x0:a.z0,hi=hz?a.x1:a.z1,pts=[lo,hi];
      for(const b of AREAS){if(b===a)continue;const b0=hz?b.x0:b.z0,b1=hz?b.x1:b.z1;if(b0>lo+.01&&b0<hi-.01)pts.push(b0);if(b1>lo+.01&&b1<hi-.01)pts.push(b1);}
      pts.sort((p,q)=>p-q); const segs=[];
      for(let i=0;i<pts.length-1;i++){
        const s0=pts[i],s1=pts[i+1]; if(s1-s0<.02)continue; const mid=(s0+s1)/2,e=.06;
        const px=hz?mid:(side===2?a.x0-e:a.x1+e),pz=hz?(side===0?a.z0-e:a.z1+e):mid; let o=null;
        for(const b of AREAS)if(b!==a&&px>=b.x0&&px<=b.x1&&pz>=b.z0&&pz<=b.z1){o=b;break;}
        const L=segs[segs.length-1]; if(L&&L[2]===o&&abs(L[1]-s0)<.02)L[1]=s1; else segs.push([s0,s1,o]);
      }
      for(const [s0,s1,o] of segs){
        if(o){a.openings.push({side,s0,s1,o}); if(!a.manual&&!a.open&&!o.open&&o.top<a.top-.2)wallSeg(a,side,s0,s1,o.top,a.top,false);}
        else if(!a.manual){const ex=WM+.6;wallSeg(a,side,s0-(abs(s0-lo)<.02?ex:0),s1+(abs(s1-hi)<.02?ex:0),a.y-1,a.top,true);}
      }
    }
    if(a.manual)return;
    const w=a.x1-a.x0,d=a.z1-a.z0,ex=WM+.6,cx=(a.x0+a.x1)/2,cz=(a.z0+a.z1)/2;
    if(a.y1===undefined){
      const small=a.ceil!==undefined&&a.ceil<=8;
      const f=new THREE.Mesh(new THREE.PlaneGeometry(w+ex*2,d+ex*2),floorMat(w+ex*2,d+ex*2,small)); f.rotation.x=-PI/2; f.position.set(cx,a.y+(small?.004:0),cz); f.receiveShadow=true; world.add(f);
    }else{
      const rise=a.y1-a.y,n=Math.round(rise/.25),hz=a.ax==='x',len=hz?w:d,run=len/n;
      for(let i=0;i<n;i++){const top=a.y+(i+.5)*rise/n,c=(hz?a.x0:a.z0)+(i+.5)*run,hh=top-(a.y-.6);
        box(hz?run:w+ex*2,hh,hz?d+ex*2:run,stepM,hz?c:cx,top-hh/2,hz?cz:c);}
    }
    if(!a.open)box(w+ex*2+.6,.4,d+ex*2+.6,darkM,cx,a.top+.2,cz,false);
  });
}
buildAreas();
const lockBarriers={
  warden:openingBarrier(AREA.hall,AREA.hall.openings.find(o=>o.o.id==='wexit')),
  upper:openingBarrier(AREA.C,AREA.C.openings.find(o=>o.o.id==='u8'))};

// ---------- warden hall dressing ----------
{
  const cz=109;
  for(const [r0,r1,m] of [[8.9,9.08,amberGlow],[12.6,12.72,tealGlow],[3.2,3.3,tealGlow]]){const g=new THREE.Mesh(new THREE.RingGeometry(r0,r1,96),m);g.rotation.x=-PI/2;g.position.set(0,.02,cz);world.add(g);}
  for(let i=0;i<4;i++){const z=95+i*9.4;
    for(const sx of [-1,1]){const x=sx*15.2;
      box(2,16,2,pillarMat,x,8,z); box(2.5,.9,2.5,darkM,x,.45,z); box(2.5,.8,2.5,darkM,x,15.6,z);
      box(.08,10,.3,tealGlow,x-sx*1.02,7.5,z,false);
      lamp(x-sx*.9,4.2,z,-sx,0,false);
      if(i%2===(sx>0?0:1))spot(x-sx*2,4.6,z,0xff8a3a,70,26);
    }}
  for(const z of [100,118]){box(1,.1,7,skyGlow,0,15.9,z,false); spot(0,10,z,0x7fb0ff,70,30);
    const r=new THREE.Mesh(new THREE.PlaneGeometry(4,16),new THREE.MeshBasicMaterial({map:rayTex,color:0x7fb2ff,transparent:true,opacity:.08,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
    r.position.set(0,8,z); world.add(r);}
  for(const sx of [-1,1])for(const z of [99.7,118.5]){const b=new THREE.Mesh(new THREE.PlaneGeometry(3.4,8.5),new MSM({map:bannerTex,alphaTest:.5,side:THREE.DoubleSide,roughness:.95,metalness:0,envMapIntensity:.2}));
    b.position.set(sx*14.6,9,z); b.rotation.y=-sx*PI/2; world.add(b);}
  box(8.4,.6,1,metalM,0,6.3,128.9); box(.6,6.6,1,metalM,-3.9,3.3,128.9); box(.6,6.6,1,metalM,3.9,3.3,128.9);
}
// ---------- roof ----------
const sky=new THREE.Mesh(new THREE.SphereGeometry(170,24,16),new THREE.ShaderMaterial({uniforms:{uT:{value:0},uF:{value:0}},side:THREE.BackSide,fog:false,depthWrite:false,
  vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float uT,uF;varying vec3 vP;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
    void main(){vec3 d=normalize(vP);vec2 uv=d.xz/(abs(d.y)+.3)*1.6+uT*.04;float c=n(uv)*.5+n(uv*2.1+3.)*.3+n(uv*4.3+7.)*.2;
      vec3 col=mix(vec3(.012,.018,.035),vec3(.07,.09,.15),smoothstep(.35,.8,c));col+=vec3(.55,.65,1.)*uF*(.25+c);
      col*=smoothstep(-.15,.3,d.y)+.2;gl_FragColor=vec4(col,1.);}`}));
sky.position.set(0,19,304); sky.renderOrder=-1; scene.add(sky);
{
  const R=AREA.roof,y=R.y;
  const sp=new THREE.Mesh(new THREE.CylinderGeometry(.7,1.9,16,10),pillarMat); sp.position.set(0,y+8,304); sp.castShadow=true; world.add(sp);
  box(4.4,.5,4.4,darkM,0,y+.25,304); box(5,.35,.7,metalM,0,y+16.2,304); box(.7,.35,5,metalM,0,y+16.2,304);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.5,3,6),metalM); tip.position.set(0,y+18,304); world.add(tip);
  for(const sx of [-1,1])for(const sz of [-1,1]){const x=sx*28,z=304+sz*28;
    const rod=new THREE.Mesh(new THREE.CylinderGeometry(.12,.3,9,6),metalM); rod.position.set(x,y+4.5,z); rod.castShadow=true; world.add(rod);
    const o=new THREE.Mesh(GS,tealGlow); o.scale.setScalar(.3); o.position.set(x,y+9.2,z); world.add(o); box(2,1.2,2,darkM,x,y+.6,z);
    spot(x-sx*2,y+4,z-sz*2,0x55c8ff,60,34);}
  for(const [x,z] of [[0,292],[0,316],[-14,304],[14,304]])spot(x,y+7,z,0x7fa8ff,50,34);
  for(const r of [10,20]){const g=new THREE.Mesh(new THREE.RingGeometry(r,r+.12,96),tealGlow);g.rotation.x=-PI/2;g.position.set(0,y+.02,304);world.add(g);}
}
const rain=(()=>{
  const n=900,p=new Float32Array(n*6),sd=new Float32Array(n*3);
  for(let i=0;i<n;i++){sd[i*3]=rand(-24,24);sd[i*3+1]=rand(0,20);sd[i*3+2]=rand(-24,24);}
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(p,3));
  const m=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x8fb4e0,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.frustumCulled=false; m.visible=false; scene.add(m);
  return {m,update(dt,cx,cy,cz){for(let i=0;i<n;i++){let y=sd[i*3+1]-34*dt;if(y<0)y+=20;sd[i*3+1]=y;const x=cx+sd[i*3],z=cz+sd[i*3+2],j=i*6;p[j]=x;p[j+1]=cy+y;p[j+2]=z;p[j+3]=x+.12;p[j+4]=cy+y+.7;p[j+5]=z;}g.attributes.position.needsUpdate=true;}};
})();
// ---------- pickups ----------
const pickups=[[29.5,14,217],[0,14,208.5],[21.5,10,148]].map(([x,y,z])=>{
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.32),new THREE.MeshBasicMaterial({color:hdr(0x4dffb0,2.6)})); m.position.set(x,y+1.1,z); scene.add(m);
  return {x,y,z,m,taken:false};});
// ---------- global lights ----------
const hemi=new THREE.HemisphereLight(0x6d8fbd,0x1a120c,.55); scene.add(hemi);
const moon=new THREE.DirectionalLight(0x9cc0ff,1.7); moon.castShadow=true; moon.shadow.mapSize.set(2048,2048);
Object.assign(moon.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:60}); moon.shadow.bias=-.0006; moon.shadow.normalBias=.05;
scene.add(moon); scene.add(moon.target);
const dust=(()=>{const n=500,p=new Float32Array(n*3);for(let i=0;i<n;i++){p[i*3]=rand(-16,16);p[i*3+1]=rand(.2,9);p[i*3+2]=rand(-16,16);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
  const m=new THREE.Points(g,new THREE.PointsMaterial({map:glowTex,size:.07,color:0x9fc8ff,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));m.frustumCulled=false;scene.add(m);return m;})();
