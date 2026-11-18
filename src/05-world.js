// ===================== WORLD =====================
// The level is a set of axis-aligned walkable AREAS (rooms, corridors, ramps). Collision only ever looks at AREAS;
// everything drawn here is dressing built from a small kit of parts and merged into a few static meshes per material.
const HW=6.5,H=10.5,LEN=88,PLAY_X=4.4,WM=.5;
const world=new THREE.Group(); scene.add(world);
const GB=new THREE.BoxGeometry(1,1,1), GS=new THREE.SphereGeometry(1,16,12);
const M_FLOOR=worldMat('floor',{metalness:.62,roughness:.85,ns:.85,envMapIntensity:.7}),M_WALL=worldMat('wall',{metalness:.5,envMapIntensity:.5}),M_PLATE=worldMat('plate',{metalness:.6,envMapIntensity:.6}),
  M_STEEL=worldMat('steel',{color:0x8f96a0,envMapIntensity:.9}),M_BRASS=worldMat('steel',{color:0xc08f4a,envMapIntensity:.9}),M_HAZ=worldMat('hazard',{metalness:.6,envMapIntensity:.5}),M_RUB=worldMat('rubber',{envMapIntensity:.3}),
  M_FLOORW=worldMat('floor',{metalness:.62,envMapIntensity:1.2},1),M_WALLW=worldMat('wall',{metalness:.5,envMapIntensity:.9},1),M_PLATEW=worldMat('plate',{metalness:.6,envMapIntensity:1},1),M_STEELW=worldMat('steel',{color:0x8f96a0,envMapIntensity:1.2},1);
const stone=M_WALL,pillarMat=M_PLATE,darkM=M_PLATE,metalM=M_STEEL,stepM=M_PLATE;
const tealGlow=new THREE.MeshBasicMaterial({color:hdr(0x2ec4e6,1.5)});
const amberGlow=new THREE.MeshBasicMaterial({color:hdr(0xff8a2e,4)});
const skyGlow=new THREE.MeshBasicMaterial({color:hdr(0x9cc8ff,3)});
const dimGlow=new THREE.MeshBasicMaterial({color:hdr(0x9cc8ff,.9)});
const warmLine=new THREE.MeshBasicMaterial({color:hdr(0xff8a2e,1.1)});
// a single loose mesh (doors, markers); everything static goes through the kit below instead
function box(w,h,d,m,x,y,z,sh=true){const o=new THREE.Mesh(GB,m);o.scale.set(w,h,d);o.position.set(x,y,z);o.castShadow=sh;o.receiveShadow=true;world.add(o);return o;}

// ---------- static kit: geometry is collected per material and merged ----------
let SB=new Map(),CAST=true;
const _km=new THREE.Matrix4(),_ke=new THREE.Euler(),_kq=new THREE.Quaternion(),_k1=new THREE.Vector3(1,1,1),_kp=new THREE.Vector3(),_kd=new THREE.Vector3(),UPV=new THREE.Vector3(0,1,0);
function sgeoM(mat,geo,m4){
  const g=geo.index?geo.toNonIndexed():geo; if(g!==geo)geo.dispose(); g.applyMatrix4(m4);
  const t=mat.userData.tile;
  if(t){const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;   // project UVs along the dominant axis of each triangle, in metres
    for(let i=0;i<p.count;i+=3){const ax=abs(n.getX(i)+n.getX(i+1)+n.getX(i+2)),ay=abs(n.getY(i)+n.getY(i+1)+n.getY(i+2)),az=abs(n.getZ(i)+n.getZ(i+1)+n.getZ(i+2));
      for(let j=i;j<i+3;j++){if(ay>=ax&&ay>=az)uv.setXY(j,p.getX(j)/t,p.getZ(j)/t);else if(ax>=az)uv.setXY(j,p.getZ(j)/t,p.getY(j)/t);else uv.setXY(j,p.getX(j)/t,p.getY(j)/t);}}}
  const k=mat.uuid+(CAST?'c':'n')+floor(m4.elements[14]/48);let b=SB.get(k);if(!b){b={mat,cast:CAST,geos:[]};SB.set(k,b);}b.geos.push(g);
}
const sgeo=(mat,geo,x,y,z,rx=0,ry=0,rz=0)=>sgeoM(mat,geo,_km.compose(_kp.set(x,y,z),_kq.setFromEuler(_ke.set(rx,ry,rz)),_k1));
const sbox=(mat,w,h,d,x,y,z,rx=0,ry=0,rz=0)=>sgeo(mat,new THREE.BoxGeometry(w,h,d),x,y,z,rx,ry,rz);
const scyl=(mat,r0,r1,h,x,y,z,rx=0,rz=0,seg=12)=>sgeo(mat,new THREE.CylinderGeometry(r0,r1,h,seg),x,y,z,rx,0,rz);
function flushInto(parent){
  for(const b of SB.values()){const m=new THREE.Mesh(mergeGeometries(b.geos,false),b.mat),lit=!b.mat.isMeshBasicMaterial;m.castShadow=lit&&b.cast;m.receiveShadow=lit;parent.add(m);for(const g of b.geos)g.dispose();}
  SB.clear();
}
// build a moving part (door leaf, cog) from kit calls made around the origin
function dyn(fn,parent=world){const keep=SB;SB=new Map();fn();const g=new THREE.Group();flushInto(g);SB=keep;parent.add(g);return g;}
// a pipe between two points, with couplings
function pipe(mat,r,x0,y0,z0,x1,y1,z1,step=3){
  _kd.set(x1-x0,y1-y0,z1-z0);const L=_kd.length();_kd.normalize();_kq.setFromUnitVectors(UPV,_kd);
  sgeoM(mat,new THREE.CylinderGeometry(r,r,L,8),_km.compose(_kp.set((x0+x1)/2,(y0+y1)/2,(z0+z1)/2),_kq,_k1));
  for(let s=step/2;s<L;s+=step)sgeoM(M_STEEL,new THREE.CylinderGeometry(r*1.45,r*1.45,.14,8),_km.compose(_kp.set(x0+_kd.x*s,y0+_kd.y*s,z0+_kd.z*s),_kq,_k1));
}
// pooled lights: the nearest few light spots get a real light each frame
const lightSpots=[];
const spot=(x,y,z,hex,i,d=17)=>lightSpots.push({x,y,z,c:new THREE.Color(hex),i,d,q:0});
const lightPool=[]; for(let i=0;i<8;i++){const L=new THREE.PointLight(0xffffff,0,17,2);scene.add(L);lightPool.push(L);}
function updateLights(px,py,pz){
  for(const s of lightSpots){const dx=s.x-px,dy=(s.y-py)*2,dz=s.z-pz;s.q=dx*dx+dy*dy+dz*dz;}
  lightSpots.sort((a,b)=>a.q-b.q); const d9=lightSpots.length>8?sqrt(lightSpots[8].q):1e9;
  for(let i=0;i<8;i++){const L=lightPool[i],s=lightSpots[i];if(!s){L.intensity=0;continue;}const d=sqrt(s.q);
    L.position.set(s.x,s.y,s.z);L.color.copy(s.c);L.distance=s.d;L.intensity=s.i*sat((d9-d)/5)*sat((44-d)/8);}
}
// caged work lamp on a bracket; n = direction it faces
function lamp(x,y,z,nx,nz,lit=true){
  sbox(M_STEEL,nz?.46:.08,.62,nz?.08:.46,x+nx*.04,y-.04,z+nz*.04); sbox(M_PLATE,nx?.42:.14,.07,nz?.42:.14,x+nx*.24,y-.24,z+nz*.24); sbox(M_PLATE,.3,.05,.3,x+nx*.34,y+.2,z+nz*.34);
  sgeo(amberGlow,new THREE.SphereGeometry(.12,10,8),x+nx*.34,y,z+nz*.34);
  for(const a of [-1,1])for(const b of [-1,1])sbox(M_STEEL,.025,.42,.025,x+nx*.34+a*.13,y-.02,z+nz*.34+b*.13);
  if(lit)spot(x+nx*.75,y+.1,z+nz*.75,0xff8a3a,48,19);
}
// column: plated shaft, steel corner ribs and bands, hazard-striped foot, a light slot on the face that looks along (fx,fz)
function pillar(x,z,y0,h,w,fx,fz=0){
  sbox(M_PLATE,w,h,w,x,y0+h/2,z);
  for(const a of [-1,1])for(const b of [-1,1])sbox(M_STEEL,.16,h-1.5,.16,x+a*w/2,y0+h/2,z+b*w/2);
  sbox(M_PLATE,w+.55,.75,w+.55,x,y0+.375,z); sbox(M_HAZ,w+.6,.22,w+.6,x,y0+.46,z); sbox(M_STEEL,w+.3,.14,w+.3,x,y0+.83,z);
  sbox(M_PLATE,w+.55,.7,w+.55,x,y0+h-.35,z); sbox(M_STEEL,w+.3,.14,w+.3,x,y0+h-.78,z);
  for(const f of [.34,.66])sbox(M_STEEL,w+.14,.2,w+.14,x,y0+h*f,z);
  const sh=h*.44; sbox(tealGlow,fz?.22:.07,sh,fz?.07:.22,x+fx*(w/2+.02),y0+2.2+sh/2,z+fz*(w/2+.02));
  sbox(M_STEEL,fz?.36:.1,sh+.3,fz?.1:.36,x+fx*(w/2-.02),y0+2.2+sh/2,z+fz*(w/2-.02));
  for(let k=-1;k<=1;k++)scyl(M_RUB,.045,.045,h-1.5,x+(fz?fx:k*.2),y0+h/2,z+(fz?k*.2:0)+(fz?0:w/2+.05),0,0,6);
}
// light falling through dusty air: crossed planes with drifting noise
const shaftMat=(hex,op)=>new THREE.ShaderMaterial({uniforms:{uC:{value:new THREE.Color(hex)},uO:{value:op},uT:TIMEU},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false,
  vertexShader:`varying vec2 vUv;varying vec3 vW;void main(){vUv=uv;vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 uC;uniform float uO,uT;varying vec2 vUv;varying vec3 vW;
    float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
    void main(){vec2 q=clamp(vUv,0.001,1.);   // interpolated values can leave 0..1 at polygon edges; pow() of a negative is NaN on Direct3D
      float e=smoothstep(0.,.4,q.x)*smoothstep(1.,.6,q.x),f=pow(q.y,1.3)*smoothstep(0.,.12,q.y);
      float d=n(vec2(vW.x*.9+vW.z*.7+uT*.05,vW.y*.3-uT*.1))*.6+n(vec2(vW.x*3.1+vW.z*2.7,vW.y*1.1-uT*.28))*.4;
      gl_FragColor=vec4(uC*uO*e*f*(.4+d*1.2),1.);}`});
function shaft(x,y0,y1,z,w,d,hex=0x7fb2ff,op=.16){
  for(const [ry,ww] of [[0,w],[PI/2,d]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(ww,y1-y0),shaftMat(hex,op));m.position.set(x,(y0+y1)/2,z);m.rotation.y=ry;world.add(m);}
}
// wall emblem: the twin fangs, lit, on a framed plate (stands where cloth banners would hang)
function emblem(x,y,z,nx,sc=1){
  const w=2.2*sc,h=5.4*sc; sbox(M_PLATE,.14,h,w,x,y,z); sbox(M_BRASS,.18,.12,w+.16,x,y+h/2,z); sbox(M_BRASS,.18,.12,w+.16,x,y-h/2,z);
  for(const s of [-1,1]){sbox(M_BRASS,.18,h,.1,x,y,z+s*(w/2+.03)); sbox(tealGlow,.05,2.6*sc,.13*sc,x+nx*.08,y+.2*sc,z+s*.36*sc,s*.17,0,0); sbox(M_STEEL,.1,3*sc,.3*sc,x+nx*.05,y+.2*sc,z+s*.36*sc,s*.17,0,0);}
  sgeo(amberGlow,new THREE.SphereGeometry(.12*sc,8,6),x+nx*.1,y+1.9*sc,z);
}
// toothed wheel, built around the origin facing +X
const spinners=[];
function cog(R,teeth,x,y,z,ry,speed){
  const g=dyn(()=>{
    scyl(M_PLATE,R,R,.34,0,0,0,0,PI/2,32); scyl(M_STEEL,R*.34,R*.34,.5,0,0,0,0,PI/2,16); scyl(M_BRASS,R*.12,R*.12,.62,0,0,0,0,PI/2,10); scyl(M_STEEL,R*.82,R*.82,.4,0,0,0,0,PI/2,32);scyl(M_PLATE,R*.76,R*.76,.42,0,0,0,0,PI/2,32);
    for(let k=0;k<teeth;k++){const a=k/teeth*TAU;sbox(M_PLATE,.34,R*.2,R*.24,0,cos(a)*R*1.06,sin(a)*R*1.06,a);}
    for(let k=0;k<6;k++){const a=k/6*TAU;sbox(M_STEEL,.46,R*.6,.2,0,cos(a)*R*.5,sin(a)*R*.5,a);}
  });
  g.position.set(x,y,z);const sp=new THREE.Group();world.add(sp);sp.position.copy(g.position);sp.rotation.y=ry;g.position.set(0,0,0);sp.add(g);spinners.push({g,speed});
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
// A surface, not a flood: half the old brightness, brightest along the floor line and thinning quickly upward, with a faint dark
// tint behind the light (its own alpha). It fades out within about 3 m of the camera and whenever the camera is on the other side
// of it from the hero (uPl), so it never veils the picture.
const barrierMat=()=>new THREE.ShaderMaterial({uniforms:{uT:{value:0},uA:{value:0},uPl:{value:new THREE.Vector3()}},
  vertexShader:`uniform vec3 uPl;varying vec2 vUv;varying vec3 vW;varying float vF;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;
    vec3 n=mat3(modelMatrix)*vec3(0.,0.,1.),o=modelMatrix[3].xyz;float sp=dot(uPl-o,n),sc=dot(cameraPosition-o,n);vF=smoothstep(-.25,.35,(sp<0.?-1.:1.)*sc);
    gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uT,uA;varying vec2 vUv;varying vec3 vW;varying float vF;void main(){vec2 p=vUv*vec2(13.,10.5);
    float l=abs(fract(p.x*1.5+sin(p.y*2.+uT*1.3)*.1)-.5);float ln=smoothstep(.07,0.,l);
    float sc=.5+.5*sin(p.y*7.-uT*5.),f=clamp(1.-vUv.y,0.,1.),e=f*f*f*f*f*1.5+.035;
    float hz=smoothstep(.04,0.,abs(fract(p.y*.7-uT*.25)-.5))*.5;
    vec2 hx=vec2(p.x*1.5,p.y*1.3+floor(p.x*1.5)*.5);float cell=smoothstep(.5,.42,max(abs(fract(hx.x)-.5),abs(fract(hx.y)-.5)))*.12;
    vec3 dv=vW-cameraPosition;float a=uA*vF*smoothstep(1.2,3.4,sqrt(max(dot(dv,dv),0.)));
    vec3 c=vec3(1.,.36,.08)*((ln*(.35+sc*.65)+hz+.05+cell)*e+smoothstep(.03,0.,vUv.y)*1.2)*.8;gl_FragColor=vec4(min(c,vec3(1.1))*a,a*(.1+.16*f));}`,   // the floor line at half its old level and capped, so it cannot bloom into a band wider than a fighter
  blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,depthWrite:false,side:THREE.DoubleSide,transparent:true});
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

// ---------- first corridor (hand-built): a nave of machine columns under a plated vault ----------
{
  const CL_=LEN+7,cz=CL_/2-6;
  sgeo(M_FLOOR,new THREE.PlaneGeometry(HW*2+2,CL_),0,0,cz,-PI/2);
  for(const sx of [-1,1]){
    sbox(M_WALL,.6,H+4,CL_,sx*(HW+.3),(H+4)/2,cz);
    sbox(M_PLATE,.9,.12,CL_,sx*(HW-.45),.06,cz); sbox(M_STEEL,.06,.14,CL_,sx*(HW-.92),.07,cz);
    sbox(tealGlow,.07,.02,LEN,sx*3.2,.012,LEN/2); sbox(M_STEEL,.3,.012,LEN,sx*3.2,.006,LEN/2);
    pipe(M_STEEL,.11,sx*(HW-.2),7.7,-5,sx*(HW-.2),7.7,LEN,4); pipe(M_RUB,.07,sx*(HW-.14),7.3,-5,sx*(HW-.14),7.3,LEN,4); pipe(M_BRASS,.05,sx*(HW-.12),1.5,-5,sx*(HW-.12),1.5,LEN,4);
    CAST=false; sbox(M_PLATE,7.6,.3,CL_,sx*HW/2,H+1.7,cz,0,0,-sx*.482); CAST=true;
  }
  for(let i=0;i<=10;i++){
    const z=4+8*i;
    for(const sx of [-1,1]){
      const x=sx*5.85;
      pillar(x,z,0,H,1.3,-sx);
      CAST=false; sbox(M_PLATE,7.5,.5,.6,sx*HW/2,H+1.5,z,0,0,-sx*.482); sbox(M_STEEL,7.5,.1,.7,sx*HW/2,H+1.22,z,0,0,-sx*.482); CAST=true;
      if((i%2===0)===(sx>0))lamp(x-sx*.55,3.4,z,-sx,0);
      if(i<10){
        const zb=z+4;
        if(i%2===0)emblem(sx*(HW-.08),6,zb,-sx);
        else{sbox(M_PLATE,.3,5.2,.9,sx*(HW-.02),5,zb); sbox(tealGlow,.1,4.6,.34,sx*(HW-.04)-sx*.14,5,zb); for(const k of [-1,1])sbox(M_STEEL,.36,.1,1,sx*(HW-.02),5+k*2.65,zb);
          scyl(M_PLATE,.26,.26,2,sx*(HW-.3),1.4,zb); scyl(M_STEEL,.28,.28,.1,sx*(HW-.3),.9,zb); scyl(M_STEEL,.28,.28,.1,sx*(HW-.3),1.9,zb); scyl(M_BRASS,.06,.06,1.2,sx*(HW-.3),3,zb,0,0,6);}
      }
    }
    if(i%2===1&&i<10){
      const zs=z+4; sbox(skyGlow,.7,.08,5.2,0,H+3.18,zs); CAST=false; sbox(M_STEEL,1,.2,5.6,0,H+3.3,zs); CAST=true;
      shaft(0,.1,H+3.1,zs,3.2,5); spot(0,6.5,zs,0x7fb0ff,22,16);
    }
  }
  for(let k=0;k<18;k++){const sx=srnd()<.5?-1:1,s=srnd(.2,.6);sbox(k%3?M_PLATE:M_STEEL,s,s*srnd(.4,1),s*srnd(.7,1.6),sx*srnd(4.95,5.5),s*.25,srnd(2,LEN-3),srnd(-.3,.3),srnd(0,3),srnd(-.3,.3));}
  // the sealed door the hero came in through
  sbox(M_WALL,HW*2+2,H+5,1,0,(H+5)/2,-.5); sbox(M_PLATE,6.4,8.4,.5,0,4.2,.05); sbox(M_HAZ,6.4,.5,.56,0,8.15,.05); sbox(M_STEEL,.14,8.2,.56,0,4.1,.06);
  for(const s of [-1,1]){sbox(M_STEEL,.4,8.6,.7,s*3.3,4.3,.1); for(const y of [2.2,5.6])sbox(M_STEEL,2.3,.3,.6,s*1.6,y,.07);}
}
// gate between corridor and hall
const door={open:false,k:0};
{
  const GH=H+8;
  sbox(M_WALL,3.6,GH,1,-(HW-1.3),GH/2,LEN+.5); sbox(M_WALL,3.6,GH,1,HW-1.3,GH/2,LEN+.5); sbox(M_WALL,7,GH-8,1,0,8+(GH-8)/2,LEN+.5);
  sbox(M_STEEL,7.8,.5,1.4,0,8.25,LEN+.4); sbox(M_HAZ,7.4,.4,1.5,0,8.7,LEN+.4);
  for(const s of [-1,1]){sbox(M_STEEL,.5,8,1.4,s*3.55,4,LEN+.4); scyl(M_PLATE,.32,.32,7.6,s*4.3,3.8,LEN-.1); scyl(M_BRASS,.36,.36,.2,s*4.3,7.5,LEN-.1); scyl(M_BRASS,.36,.36,.2,s*4.3,.5,LEN-.1);}
  const leaf=s=>{const g=dyn(()=>{sbox(M_PLATE,3.3,8,.5,0,0,0); for(const y of [-2.6,0,2.6])sbox(M_STEEL,3.3,.26,.6,0,y,0); sbox(M_HAZ,3.3,.7,.56,0,-3.5,0);
    scyl(M_STEEL,.55,.55,.62,-s*.95,.6,0,PI/2,0,20); scyl(M_BRASS,.22,.22,.7,-s*.95,.6,0,PI/2,0,12); sbox(M_STEEL,.2,8,.62,s*1.5,0,0);});g.position.set(s*1.65,4,LEN+.3);return g;};
  door.l=leaf(1); door.r=leaf(-1);
  door.seam=box(.08,7.6,.66,amberGlow,0,4,LEN+.3,false);
}

// ---------- generated geometry ----------
// a point on the wall of area a: s along the wall, off metres in from the wall face
const wp=(a,side,s,off)=>side<2?[s,side===0?a.z0-WM+off:a.z1+WM-off]:[side===2?a.x0-WM+off:a.x1+WM-off,s];
function wallSeg(a,side,s0,s1,y0,y1,decor){
  const len=s1-s0,h=y1-y0,mid=(s0+s1)/2,hz=side<2,wet=a.open,WALL=wet?M_WALLW:M_WALL,PL=wet?M_PLATEW:M_PLATE,ST=wet?M_STEELW:M_STEEL;
  const nx=hz?0:(side===2?1:-1),nz=hz?(side===0?1:-1):0;
  const wb=(mat,s,y,L,hh,dp,off=dp/2)=>{const [x,z]=wp(a,side,s,off);sbox(mat,hz?L:dp,hh,hz?dp:L,x,y,z);};
  const gyAt=s=>{const [px,pz]=wp(a,side,s,WM);return areaH(a,clamp(px,a.x0,a.x1),clamp(pz,a.z0,a.z1));};
  wb(WALL,mid,(y0+y1)/2,len,h,.6,-.3);
  if(!decor)return;
  if(a.open){   // parapet: coping, posts, beacons
    wb(ST,mid,y1+.06,len,.12,.8,-.3);
    for(let s=s0+3;s<s1-1;s+=6){const gy=gyAt(s);wb(PL,s,gy+.9,.5,1.8,.5,-.2);const [x,z]=wp(a,side,s,-.2);sgeo(tealGlow,new THREE.SphereGeometry(.1,8,6),x,gy+1.95,z);scyl(ST,.03,.05,.5,x,gy+2.2,z,0,0,6);}
    return;
  }
  const flat=a.y1===undefined,gy=a.y;
  if(flat){
    wb(PL,mid,gy+.3,len,.6,.14); wb(ST,mid,gy+.63,len,.06,.18); wb(warmLine,mid,gy+.7,len,.025,.02,.19);
    const [x0,z0]=wp(a,side,s0,.1),[x1,z1]=wp(a,side,s1,.1); pipe(M_STEEL,.055,x0,gy+1.25,z0,x1,gy+1.25,z1,3.5);
  }
  CAST=false; wb(PL,mid,a.top-.3,len,.6,.5);
  {const [x0,z0]=wp(a,side,s0,.34),[x1,z1]=wp(a,side,s1,.34),[x2,z2]=wp(a,side,s0,.2),[x3,z3]=wp(a,side,s1,.2);pipe(M_STEEL,.1,x0,a.top-.85,z0,x1,a.top-.85,z1,4);pipe(M_RUB,.06,x2,a.top-1.12,z2,x3,a.top-1.12,z3,4);}
  CAST=true;
  // pilasters with a light slot (every 7 m), lamps (every 14 m), wall machinery in the bays between
  for(let s=s0+3.5;s<s1-2;s+=7){const g=gyAt(s),hh=a.top-g;wb(PL,s,g+hh/2,.7,hh,.26);wb(ST,s,g+hh-.5,.9,.3,.36);wb(M_HAZ,s,g+.82,.74,.2,.3);
    const [px,pz]=wp(a,side,s,.27);sbox(tealGlow,hz?.2:.06,a.ceil-4.4,hz?.06:.2,px,g+2.2+(a.ceil-4.4)/2,pz);}
  for(let s=s0+7,k=0;s<s1-3;s+=7,k++){const g=gyAt(s);
    if(k%2===0||a.ceil>=9){const [px,pz]=wp(a,side,s,0);lamp(px,g+(k%2?4.6:3.4),pz,nx,nz);if(k%2===0)continue;}
    if(!flat)continue;
    const r=srnd();
    if(r<.36){wb(PL,s,gy+2.7,1.7,1.2,.12);for(let j=0;j<5;j++)wb(ST,s,gy+2.3+j*.2,1.5,.05,.2);wb(ST,s,gy+3.36,1.8,.08,.22);}
    else if(r<.7){wb(PL,s,gy+1.9,.7,.9,.2);wb(ST,s,gy+1.9,.5,.7,.25);wb(tealGlow,s+.14,gy+2.12,.06,.06,.27);wb(amberGlow,s-.14,gy+2.12,.05,.05,.27);
      for(const j of [-.18,.18]){const [px,pz]=wp(a,side,s+j,.09);scyl(M_RUB,.035,.035,a.top-gy-2.4,px,(a.top+gy+2.3)/2,pz,0,0,6);}}
    else{const [px,pz]=wp(a,side,s,.26);scyl(PL,.24,.24,2.3,px,gy+1.75,pz);for(const y of [.8,1.75,2.7])scyl(ST,.26,.26,.09,px,gy+y,pz);sgeo(PL,new THREE.SphereGeometry(.24,10,6),px,gy+2.9,pz);
      scyl(M_BRASS,.05,.05,a.top-gy-3.2,px,(a.top+gy+3.1)/2,pz,0,0,6);wb(amberGlow,s,gy+1.6,.1,.1,.02,.51);}
  }
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
    const w=a.x1-a.x0,d=a.z1-a.z0,ex=WM+.6,cx=(a.x0+a.x1)/2,cz=(a.z0+a.z1)/2,FL=a.open?M_FLOORW:M_FLOOR,PL=a.open?M_PLATEW:M_PLATE,ST=a.open?M_STEELW:M_STEEL;
    if(a.y1===undefined)sgeo(FL,new THREE.PlaneGeometry(w+ex*2,d+ex*2),cx,a.y,cz,-PI/2);
    else{
      const rise=a.y1-a.y,n=Math.round(rise/.25),hz=a.ax==='x',len=hz?w:d,run=len/n;
      for(let i=0;i<n;i++){const top=a.y+(i+.5)*rise/n,c=(hz?a.x0:a.z0)+(i+.5)*run,hh=top-(a.y-.6),e=c-run/2+.04;
        sbox(PL,hz?run:w+ex*2,hh,hz?d+ex*2:run,hz?c:cx,top-hh/2,hz?cz:c);
        sbox(ST,hz?.08:w+ex*2,.05,hz?d+ex*2:.08,hz?e:cx,top+.01,hz?cz:e);
        if(i%4===1)sbox(tealGlow,hz?.03:w-1,.04,hz?d-1:.03,hz?c-run/2-.012:cx,top-.07,hz?cz:c-run/2-.012);}
    }
    if(a.open)return;
    // ceiling: slab, cross beams, service pipes, lights
    CAST=false;
    sbox(M_PLATE,w+ex*2+.6,.4,d+ex*2+.6,cx,a.top+.2,cz);
    const alongZ=d>=w,span=alongZ?w:d,runL=alongZ?d:w;
    for(let s=2;s<runL-1;s+=4){const c=(alongZ?a.z0:a.x0)+s;sbox(M_PLATE,alongZ?span+1.2:.45,.5,alongZ?.45:span+1.2,alongZ?cx:c,a.top-.25,alongZ?c:cz);sbox(M_STEEL,alongZ?span+1.2:.55,.08,alongZ?.55:span+1.2,alongZ?cx:c,a.top-.52,alongZ?c:cz);}
    for(const f of [-.28,.3]){const o=span*f; if(alongZ)pipe(M_STEEL,.09,cx+o,a.top-.75,a.z0-.4,cx+o,a.top-.75,a.z1+.4,5);else pipe(M_STEEL,.09,a.x0-.4,a.top-.75,cz+o,a.x1+.4,a.top-.75,cz+o,5);}
    if(a.y1===undefined){
      if(a.ceil<=6){for(let s=3;s<runL-1;s+=7){const c=(alongZ?a.z0:a.x0)+s,x=alongZ?cx:c,z=alongZ?c:cz;sbox(dimGlow,alongZ?.16:1.6,.05,alongZ?1.6:.16,x,a.top-.06,z);sbox(M_STEEL,alongZ?.3:1.8,.1,alongZ?1.8:.3,x,a.top-.02,z);spot(x,a.top-1,z,0x86b4ff,13,11);}}
      else if(a.ceil<=9&&w>20){for(const fx of [-.25,.25]){const x=cx+w*fx;sbox(skyGlow,3,.08,.8,x,a.top-.03,cz);sbox(M_STEEL,3.4,.2,1.2,x,a.top+.05,cz);CAST=true;shaft(x,a.y+.1,a.top-.1,cz,3.4,2.2,0x7fb2ff,.2);CAST=false;spot(x,a.y+6,cz,0x7fb0ff,90,30);}}
    }
    CAST=true;
  });
  // door frames where two built areas meet
  const seen=new Set();
  for(const a of AREAS)for(const o of a.openings){
    const b=o.o,key=[a.id,b.id].sort().join('|'); if(seen.has(key)||a.manual||b.manual||(a.open&&b.open))continue; seen.add(key);
    const hz=o.side<2,mid=(o.s0+o.s1)/2,len=o.s1-o.s0,h=min(a.open?5:a.ceil,b.open?5:b.ceil),e=o.side===0?a.z0:o.side===1?a.z1:o.side===2?a.x0:a.x1;
    const px=hz?mid:e,pz=hz?e:mid,gy=areaH(a,clamp(px,a.x0,a.x1),clamp(pz,a.z0,a.z1));
    const fb=(mat,s,y,L,hh,dp)=>sbox(mat,hz?L:dp,hh,hz?dp:L,hz?s:e,y,hz?e:s);
    for(const s of [o.s0-.32,o.s1+.32]){fb(M_PLATE,s,gy+h/2,.64,h,1.1);fb(M_STEEL,s,gy+h/2,.3,h,1.24);fb(M_HAZ,s,gy+.5,.7,1,1.16);}
    fb(M_PLATE,mid,gy+h+.32,len+1.3,.64,1.1); fb(M_HAZ,mid,gy+h+.32,len*.6,.3,1.18); fb(tealGlow,mid,gy+h+.02,len*.5,.05,1.14);
    fb(M_STEEL,mid,gy+.012,len,.024,.7); fb(M_HAZ,mid,gy+.016,len-.4,.024,.4);
  }
}
buildAreas();
const lockBarriers={
  warden:openingBarrier(AREA.hall,AREA.hall.openings.find(o=>o.o.id==='wexit')),
  upper:openingBarrier(AREA.C,AREA.C.openings.find(o=>o.o.id==='u8'))};

// ---------- warden hall dressing: the gear hall ----------
{
  const cz=109;
  for(const [r0,r1,m] of [[8.9,9.08,amberGlow],[12.6,12.72,tealGlow],[3.2,3.3,tealGlow]])sgeo(m,new THREE.RingGeometry(r0,r1,96),0,.02,cz,-PI/2);
  for(const [r0,r1] of [[8.5,8.86],[9.12,9.5],[2.7,3.16],[12.76,13]])sgeo(M_STEEL,new THREE.RingGeometry(r0,r1,96),0,.012,cz,-PI/2);
  for(let k=0;k<12;k++){const a=k/12*TAU;sbox(M_BRASS,.5,.03,.16,sin(a)*9.3,.02,cz+cos(a)*9.3,0,a,0);}
  for(let i=0;i<4;i++){const z=95+i*9.4;
    for(const sx of [-1,1]){const x=sx*15.2;
      pillar(x,z,0,16,2,-sx);
      lamp(x-sx*.95,4.2,z,-sx,0,false);
      if(i%2===(sx>0?0:1))spot(x-sx*2,4.6,z,0xff8a3a,70,26);
    }}
  CAST=false;
  sgeo(M_STEEL,new THREE.TorusGeometry(9,.2,8,72),0,14.6,cz,PI/2); sgeo(tealGlow,new THREE.TorusGeometry(9,.05,6,72),0,14.36,cz,PI/2);
  for(let k=0;k<8;k++){const a=k/8*TAU+.39;scyl(M_STEEL,.06,.06,1.4,sin(a)*9,15.3,cz+cos(a)*9,0,0,6);}
  for(const z of [100,118]){sbox(skyGlow,1,.1,7,0,15.9,z); sbox(M_STEEL,1.5,.24,7.5,0,16.02,z); spot(0,10,z,0x7fb0ff,70,30);}
  CAST=true;
  for(const z of [100,118])shaft(0,.1,15.8,z,4.4,7,0x7fb2ff,.14);
  for(const sx of [-1,1]){
    for(const z of [99.7,118.5])emblem(sx*14.62,7.6,z,-sx,1.5);
    cog(3.3,18,sx*14.5,9.3,cz-1.2,sx>0?PI:0,sx*.22); cog(1.65,9,sx*14.5,12.9,cz+2.75,sx>0?PI:0,-sx*.44);
    pipe(M_BRASS,.09,sx*14.55,2.2,90,sx*14.55,2.2,128,4.7);
  }
  sbox(M_STEEL,8.4,.6,1,0,6.3,128.9); sbox(M_HAZ,8.4,.4,1.06,0,6.9,128.9); for(const s of [-1,1]){sbox(M_STEEL,.6,6.6,1,s*3.9,3.3,128.9);scyl(M_PLATE,.4,.4,9,s*5.2,4.5,128.3);scyl(M_BRASS,.44,.44,.25,s*5.2,8.6,128.3);}
}
// ---------- roof ----------
const sky=new THREE.Mesh(new THREE.SphereGeometry(400,32,20),new THREE.ShaderMaterial({uniforms:{uT:{value:0},uF:{value:0}},side:THREE.BackSide,fog:false,depthWrite:false,
  vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float uT,uF;varying vec3 vP;
    float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
    float fb(vec2 p){return n(p)*.5+n(p*2.03+3.1)*.25+n(p*4.1+7.7)*.125+n(p*8.3+1.3)*.0625;}
    void main(){vec3 d=normalize(vP);vec2 uv=d.xz/(max(d.y,0.)+.2)*1.15;float t=uT*.018;
      // two drifting cloud decks; the upper one is torn open so the moon haze shows through
      float c=fb(uv+vec2(t,t*.6)),c2=fb(uv*2.3-vec2(t*1.5,0.)+c*.9),dens=smoothstep(.36,.82,c*.62+c2*.5);
      vec3 col=mix(vec3(.008,.013,.028),vec3(.05,.068,.115),dens);
      col+=vec3(.03,.045,.08)*exp(-max(d.y,0.)*5.)*(.5+dens);
      vec3 md=normalize(vec3(.16,.72,-.3));float ma=max(dot(d,md),0.);
      col+=vec3(.42,.52,.8)*pow(ma,48.)*(1.-dens*.75)*.7+vec3(.13,.17,.28)*pow(ma,5.)*smoothstep(.25,.6,c2)*(1.-dens*.6);
      // lightning: each flash lights a different part of the deck from inside
      float cell=smoothstep(.42,.8,fb(uv*.55+floor(uT*.9)*3.17));
      col+=vec3(.6,.72,1.)*uF*(.12+cell*1.25)*(.3+dens);
      col*=smoothstep(-.3,.04,d.y)*.92+.08;gl_FragColor=vec4(col,1.);}`}));
sky.position.set(0,19,304); sky.renderOrder=-1; sky.userData.noAO=true; scene.add(sky);
{
  const R=AREA.roof,y=R.y,PL=M_PLATEW,ST=M_STEELW;
  // the storm spire: a conductor mast on a ringed plinth, guyed to four coil pylons
  scyl(PL,.7,1.9,16,0,y+8,304,0,0,12); scyl(PL,2.3,2.5,.5,0,y+.25,304,0,0,16); scyl(ST,2.1,2.1,.14,0,y+.56,304,0,0,16);
  for(const [yy,r] of [[3,1.75],[6.5,1.4],[10,1.08],[13.5,.84]]){sgeo(ST,new THREE.TorusGeometry(r+.22,.09,6,24),0,y+yy,304,PI/2);scyl(M_BRASS,r+.06,r+.1,.3,0,y+yy,304,0,0,12);}
  for(let k=0;k<4;k++){const a=k/4*TAU+PI/4;pipe(ST,.08,sin(a)*2.2,y+.5,304+cos(a)*2.2,sin(a)*.95,y+12,304+cos(a)*.95,99);sbox(tealGlow,.05,7,.05,sin(a+PI/4)*1.35,y+6,304+cos(a+PI/4)*1.35);}
  sbox(ST,5,.35,.7,0,y+16.2,304); sbox(ST,.7,.35,5,0,y+16.2,304); sgeo(ST,new THREE.ConeGeometry(.5,3,6),0,y+18,304); sgeo(skyGlow,new THREE.SphereGeometry(.22,8,6),0,y+19.6,304);
  for(const sx of [-1,1])for(const sz of [-1,1]){const x=sx*28,z=304+sz*28;
    scyl(ST,.12,.3,9,x,y+4.5,z,0,0,8); sbox(PL,2,1.2,2,x,y+.6,z); sbox(M_HAZ,2.06,.3,2.06,x,y+.3,z);
    for(let k=0;k<5;k++)sgeo(M_BRASS,new THREE.TorusGeometry(.5-k*.05,.06,6,16),x,y+2+k*.9,z,PI/2);
    sgeo(tealGlow,new THREE.SphereGeometry(.3,10,8),x,y+9.2,z);
    // sagging cable from the mast head
    const pts=[];for(let k=0;k<=10;k++){const t=k/10;pts.push(new THREE.Vector3(lerp(0,x,t),lerp(y+15.8,y+9.2,t)-sin(t*PI)*5.5,lerp(304,z,t)));}
    sgeoM(M_RUB,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.05,5),_km.identity());
    spot(x-sx*2,y+4,z-sz*2,0x55c8ff,60,34);}
  for(const [x,z] of [[0,292],[0,316],[-14,304],[14,304]])spot(x,y+7,z,0x7fa8ff,50,34);
  for(const r of [10,20]){sgeo(tealGlow,new THREE.RingGeometry(r,r+.12,96),0,y+.02,304,-PI/2);sgeo(ST,new THREE.RingGeometry(r-.3,r-.04,96),0,y+.012,304,-PI/2);sgeo(ST,new THREE.RingGeometry(r+.16,r+.42,96),0,y+.012,304,-PI/2);}
  // vent stacks along the parapet
  for(const [x,z] of [[-29.4,286],[29.4,286],[-29.4,322],[29.4,322],[-12,333.4],[12,333.4]]){scyl(PL,.5,.6,2.6,x,y+1.3,z);scyl(ST,.56,.56,.12,x,y+2.5,z);scyl(M_HAZ,.62,.62,.2,x,y+.3,z);}
  // the rest of the citadel, far below and around: silhouettes with a few lit slits
  const sil=new THREE.MeshBasicMaterial({color:0x04060a,fog:false}),lit1=new THREE.MeshBasicMaterial({color:hdr(0xff8a2e,.9),fog:false}),lit2=new THREE.MeshBasicMaterial({color:hdr(0x2ec4e6,.7),fog:false});
  for(let k=0;k<46;k++){const a=k/46*TAU+srnd(.1),r=srnd(95,210),w=srnd(8,24),hh=srnd(18,95),x=sin(a)*r,z=304+cos(a)*r,top=y-34+hh;
    sbox(sil,w,hh+60,w*srnd(.7,1.3),x,top-(hh+60)/2,z,0,a,0);
    if(srnd()<.6)sbox(sil,w*.35,srnd(6,22),w*.35,x,top+4,z,0,a,0); if(srnd()<.35)scyl(sil,.4,.8,srnd(10,26),x+w*.2,top+8,z,0,0,5);
    for(let j=0;j<3;j++)if(srnd()<.6)sbox(srnd()<.6?lit1:lit2,.5,srnd(1.5,5),.5,x-sin(a)*(w*.5+.6)+cos(a)*srnd(-w*.35,w*.35),top-srnd(3,hh*.5),z-cos(a)*(w*.5+.6)-sin(a)*srnd(-w*.35,w*.35));}
}
flushInto(world);
const rain=(()=>{
  const n=1500,p=new Float32Array(n*6),sd=new Float32Array(n*3);
  for(let i=0;i<n;i++){sd[i*3]=rand(-26,26);sd[i*3+1]=rand(0,22);sd[i*3+2]=rand(-26,26);}
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(p,3));
  const m=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x9fc0ea,transparent:true,opacity:.26,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.frustumCulled=false; m.visible=false; scene.add(m);
  return {m,update(dt,cx,cy,cz){for(let i=0;i<n;i++){let y=sd[i*3+1]-36*dt;if(y<0)y+=22;sd[i*3+1]=y;const x=cx+sd[i*3]+y*.16,z=cz+sd[i*3+2],j=i*6;p[j]=x;p[j+1]=cy+y;p[j+2]=z;p[j+3]=x+.13;p[j+4]=cy+y+.8;p[j+5]=z;}g.attributes.position.needsUpdate=true;}};
})();
// ---------- pickups ----------
const pickups=[[29.5,14,217],[0,14,208.5],[21.5,10,148]].map(([x,y,z])=>{
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.32),new THREE.MeshBasicMaterial({color:hdr(0x4dffb0,2.6)})); m.position.set(x,y+1.1,z); scene.add(m);
  const r=new THREE.Mesh(new THREE.TorusGeometry(.5,.025,6,24),pbr('steel',{color:0xc08f4a})); r.rotation.x=1.1; m.add(r);
  return {x,y,z,m,taken:false};});
// ---------- global lights ----------
const hemi=new THREE.HemisphereLight(0x7a98c4,0x2a1c12,.75); scene.add(hemi);
const moon=new THREE.DirectionalLight(0x9cc0ff,1.7); moon.castShadow=true; moon.shadow.mapSize.set(2048,2048);
Object.assign(moon.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:60}); moon.shadow.bias=-.0006; moon.shadow.normalBias=.05;
scene.add(moon); scene.add(moon.target);
const dust=(()=>{const n=500,p=new Float32Array(n*3);for(let i=0;i<n;i++){p[i*3]=rand(-16,16);p[i*3+1]=rand(.2,9);p[i*3+2]=rand(-16,16);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
  const m=new THREE.Points(g,new THREE.PointsMaterial({map:glowTex,size:.07,color:0x9fc8ff,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));m.frustumCulled=false;scene.add(m);return m;})();
