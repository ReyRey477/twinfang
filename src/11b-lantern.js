// ===================== ORBS + LANTERN =====================
// Slow homing orbs fired by Lanterns and the Stormvane. Slash one to send it back at its owner; shoot it to pop it.
const ORB_RED=new THREE.Color(3.4,.07,.16);
const orbs={list:[],pool:[],
  make(){
    // a hot core in a dark shell with a bright rim, and a thin ring tumbling round it. Pure red while it is the enemy's (the
    // colour of danger, and nothing like the amber wall lamps), the hero's cyan once it has been slashed back (the shell and
    // ring read the core's colour). It pulses at 6 Hz, drags a ribbon and throws a pool of its light on the floor under it.
    const m=new THREE.Mesh(GS,new THREE.MeshBasicMaterial({color:ORB_RED.clone()})),u={uC:{value:m.material.color}}; m.scale.setScalar(.175);
    const sh=new THREE.Mesh(GS,new THREE.ShaderMaterial({uniforms:u,vertexShader:GHOST_VS,fragmentShader:`uniform vec3 uC;varying vec3 vN;varying vec3 vP;void main(){vec3 n=vN*inversesqrt(max(dot(vN,vN),1e-10)),v=vP*inversesqrt(max(dot(vP,vP),1e-10));float f=1.-clamp(abs(dot(n,v)),0.,1.),r=f*f*f;gl_FragColor=vec4(uC*r*.8,.85*(1.-r)*smoothstep(.08,.5,f));}`,
      blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,depthWrite:false,transparent:true})); sh.scale.setScalar(2.1); m.add(sh);
    m.add(new THREE.Mesh(new THREE.TorusGeometry(2.7,.12,6,40),new THREE.ShaderMaterial({uniforms:u,vertexShader:GHOST_VS,fragmentShader:`uniform vec3 uC;void main(){gl_FragColor=vec4(uC*.7,1.);}`})));
    scene.add(m); return m;
  },
  spawn(x,y,z,dx,dy,dz,owner,speed=7.8){
    const o={pos:V(x,y,z),vel:V(dx,dy,dz).normalize().multiplyScalar(speed),owner,life:7,back:false,dodged:false,dead:false,speed,m:this.pool.pop()||this.make()};
    o.m.visible=true; o.m.material.color.copy(ORB_RED); o.m.position.copy(o.pos); this.list.push(o); sfx.orb(); return o;
  },
  kill(o,burst=true){
    const i=this.list.indexOf(o); if(i>=0)this.list.splice(i,1); o.m.visible=false; this.pool.push(o.m); o.dead=true;
    if(burst){const c=o.back?[.6,2.4,3.2]:[3.2,.3,.3];fx.sparks(o.pos,0,.3,0,12,c,6);fx.halo(o.pos,c,.2,1.5,.14,0,0,0,1,.03);fx.core(o.pos,c,.7);}
  },
  deflect(o){
    o.back=true; o.life=5; o.m.material.color.copy(hdr(0x45d4ff,3.6));
    fx.glint(o.pos,0x9fefff,4,1.5,.14); fx.halo(o.pos,[.8,2.6,3.2],.2,1.7,.13); fx.flash(o.pos,0x45d4ff,40,.12); sfx.deflect();
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
      o.pos.addScaledVector(o.vel,dt); o.m.position.copy(o.pos); const rg=o.m.children[1]; rg.rotation.x+=dt*7; rg.rotation.y+=dt*4.3;
      const pu=1+.13*sin(G.rt*TAU*6+o.life*9); o.m.scale.setScalar(.175*pu);
      if(o.back){fx.tail(o.pos,o.vel,[.5,2.6,3.4],1.8,.28);fx.pool(o.pos.x,p.gy,o.pos.z,2.6,[.1,.55,.8],.5);}
      else{fx.tail(o.pos,o.vel,[3.2,.12,.2],1.2,.3);fx.pool(o.pos.x,(o.owner&&o.owner.gy)||p.gy,o.pos.z,3,[1,.02,.05],.55*pu);}
      fx.parts.put(o.pos.x,o.pos.y,o.pos.z,o.back?1.2:2.6,o.back?2.2:1.5,o.back?2.6:1.3,0,1,.3,.3,2|64);   // the white-hot centre
    }
  },
  clear(){while(this.list.length)this.kill(this.list[0],false);}
};

// ===================== MODEL KIT (Lantern, Stormvane) =====================
// Parts are added to a (parent, material) set with a transform and merged into one mesh per set, so a detailed model costs
// a handful of draw calls. UVs are scaled by part size (even texture grain); materials with vertexColors get a tint per part
// (a hex colour, or a THREE.Color, which may go above 1: bright gold on a dark metal set).
const LN_M=new THREE.Matrix4(),LN_Q=new THREE.Quaternion(),LN_E=new THREE.Euler(),LN_P=V(),LN_S=V(1,1,1),LN_C=new THREE.Color(),LN_ZAX=V(0,0,1);
const LN_a=V(),LN_b=V(),LN_c=V(),LN_d=V(),LN_e=V(),LN_f=V();
function LN_kit(){
  const sets=new Map();let n=0;
  const put=(par,geo,mat,M,col=0xffffff)=>{
    const g=geo.index?geo.toNonIndexed():geo.clone(),A=g.attributes;
    for(const k of Object.keys(A))if(k!=='position'&&k!=='normal'&&k!=='uv')g.deleteAttribute(k);
    g.applyMatrix4(M);const cnt=A.position.count;
    if(M.determinant()<0)for(const k of ['position','normal','uv']){const a=A[k].array,w=A[k].itemSize;for(let i=0;i<cnt;i+=3)for(let c=0;c<w;c++){const p=(i+1)*w+c,q=(i+2)*w+c,t=a[p];a[p]=a[q];a[q]=t;}}
    const tile=mat.userData.tile;
    if(tile){g.computeBoundingBox();const s=g.boundingBox.getSize(LN_P),k=max(s.x,s.y,s.z)/tile,uv=A.uv,ou=(++n*.37)%1,ov=(n*.61)%1;for(let i=0;i<cnt;i++)uv.setXY(i,uv.getX(i)*k+ou,uv.getY(i)*k+ov);}
    if(mat.vertexColors){col.isColor?LN_C.copy(col):LN_C.set(col);const c=new Float32Array(cnt*3);for(let i=0;i<cnt;i++){c[i*3]=LN_C.r;c[i*3+1]=LN_C.g;c[i*3+2]=LN_C.b;}g.setAttribute('color',new THREE.BufferAttribute(c,3));}
    const key=par.uuid+'|'+mat.uuid;let s=sets.get(key);if(!s)sets.set(key,s={par,mat,geos:[]});s.geos.push(g);
  };
  const add=(par,geo,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,col)=>put(par,geo,mat,LN_M.compose(LN_P.set(x,y,z),LN_Q.setFromEuler(LN_E.set(rx,ry,rz)),LN_S.set(sx,sy,sz)),col);
  // the same part on both sides, mirrored in X
  const pair=(par,geo,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,col)=>{add(par,geo,mat,x,y,z,sx,sy,sz,rx,ry,rz,col);add(par,geo,mat,-x,y,z,-sx,sy,sz,rx,-ry,-rz,col);};
  // a part of unit length (0..1 along Z) stretched from a to b
  const span=(par,geo,mat,a,b,sx=1,sy=sx,col)=>{LN_P.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const l=LN_P.length()||1;LN_Q.setFromUnitVectors(LN_ZAX,LN_P.divideScalar(l));put(par,geo,mat,LN_M.compose(LN_P.set(a[0],a[1],a[2]),LN_Q,LN_S.set(sx,sy,l)),col);};
  const collect=()=>{const out=[];for(const s of sets.values()){out.push({par:s.par,mat:s.mat,geo:mergeGeometries(s.geos,false)});for(const g of s.geos)g.dispose();}sets.clear();return out;};
  const flush=()=>collect().map(s=>{const m=new THREE.Mesh(s.geo,s.mat);m.castShadow=!s.mat.isMeshBasicMaterial;s.par.add(m);return m;});
  return {put,add,pair,span,collect,flush};
}
// matrix for a part that is long in +Z: placed at p, pointing along d, its Y axis as close to u as possible, scaled s
function LN_aim(M,px,py,pz,dx,dy,dz,ux,uy,uz,sx,sy,sz){
  let l=hypot(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l;
  let k=ux*dx+uy*dy+uz*dz;ux-=dx*k;uy-=dy*k;uz-=dz*k;l=hypot(ux,uy,uz);
  if(l<1e-5){ux=abs(dy)>.9?1:0;uy=abs(dy)>.9?0:1;uz=0;k=ux*dx+uy*dy;ux-=dx*k;uy-=dy*k;uz-=dz*k;l=hypot(ux,uy,uz);}
  ux/=l;uy/=l;uz/=l;
  const rx=uy*dz-uz*dy,ry=uz*dx-ux*dz,rz=ux*dy-uy*dx;
  return M.set(rx*sx,ux*sy,dx*sz,px, ry*sx,uy*sy,dy*sz,py, rz*sx,uz*sy,dz*sz,pz, 0,0,0,1);
}
// tube through superellipse cross-sections stacked along Z: [z, half width, half height, y offset, x offset, exponent]; flat = faceted
function LN_loft(secs,n=10,flat=false){
  const pos=[],uv=[],idx=[],m=secs.length,R=n+1;
  for(let i=0;i<m;i++){const [z,w,h,yo=0,xo=0,p=2]=secs[i];
    for(let j=0;j<=n;j++){const a=j/n*TAU-PI/2,c=cos(a),s=sin(a);pos.push(xo+w*Math.sign(c)*pow(abs(c),2/p),yo+h*Math.sign(s)*pow(abs(s),2/p),z);uv.push(j/n,i/(m-1));}}
  for(let i=0;i<m-1;i++)for(let j=0;j<n;j++){const a=i*R+j,b=a+1,c=a+R,d=c+1;idx.push(a,b,d,a,d,c);}
  const cap=(i,front)=>{const [z,w,h,yo=0,xo=0]=secs[i];if(w<1e-4||h<1e-4)return;const b=pos.length/3;
    for(let j=0;j<=n;j++){const k=(i*R+j)*3;pos.push(pos[k],pos[k+1],pos[k+2]);uv.push(.5,.5);}pos.push(xo,yo,z);uv.push(.5,.5);
    for(let j=0;j<n;j++)front?idx.push(b+R,b+j,b+j+1):idx.push(b+R,b+j+1,b+j);};
  cap(0,false);cap(m-1,true);
  let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
  if(flat){g=g.toNonIndexed();g.computeVertexNormals();return g;}
  g.computeVertexNormals();const N=g.attributes.normal;
  for(let i=0;i<m;i++){const a=i*R,b=a+n;LN_P.set(N.getX(a)+N.getX(b),N.getY(a)+N.getY(b),N.getZ(a)+N.getZ(b)).normalize();N.setXYZ(a,LN_P.x,LN_P.y,LN_P.z);N.setXYZ(b,LN_P.x,LN_P.y,LN_P.z);}
  return g;
}
// width, height and offsets of a loft at z (linear between its sections)
function LN_sec(secs,z){let i=0;while(i<secs.length-2&&z>secs[i+1][0])i++;const a=secs[i],b=secs[i+1],k=sat((z-a[0])/((b[0]-a[0])||1));return [lerp(a[1],b[1],k),lerp(a[2],b[2],k),lerp(a[3]||0,b[3]||0,k),lerp(a[4]||0,b[4]||0,k)];}
// curved plate with real thickness: f(u,v,out) gives a point of the outer face for u,v in 0..1 (du x dv must point outwards)
function LN_shell(f,nu,nv,th=.02){
  const P=[],Q=[],Nn=[],a=V(),b=V(),e=.002,W=nv+1,pos=[],nor=[],uv=[],ctr=V();
  for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){const u=i/nu,v=j/nv,p=f(u,v,V()),n=f(u+e,v,V()).sub(f(u-e,v,a)).cross(f(u,v+e,a).sub(f(u,v-e,b))).normalize();
    P.push(p);Nn.push(n);Q.push(p.clone().addScaledVector(n,-th));ctr.add(p);}
  ctr.divideScalar(P.length);
  const vtx=(p,n,u,v)=>{pos.push(p.x,p.y,p.z);nor.push(n.x,n.y,n.z);uv.push(u,v);};
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const k=[i*W+j,(i+1)*W+j,(i+1)*W+j+1,i*W+j+1];
    for(const [x,y,z] of [[0,1,2],[0,2,3]]){
      for(const q of [x,y,z]){const id=k[q];vtx(P[id],Nn[id],floor(id/W)/nu,(id%W)/nv);}
      for(const q of [x,z,y]){const id=k[q];a.copy(Nn[id]).negate();vtx(Q[id],a,floor(id/W)/nu,(id%W)/nv);}}}
  const rim=(i0,i1)=>{const p0=P[i0],p1=P[i1],q0=Q[i0],q1=Q[i1];a.subVectors(p1,p0).cross(b.subVectors(q0,p0));if(a.lengthSq()<1e-12)return;a.normalize();
    const fl=a.dot(b.addVectors(p0,p1).multiplyScalar(.5).sub(ctr))<0;if(fl)a.negate();for(const p of fl?[p0,q0,p1,p1,q0,q1]:[p0,p1,q0,p1,q1,q0])vtx(p,a,0,0);};
  for(let i=0;i<nu;i++){rim(i*W,(i+1)*W);rim(i*W+nv,(i+1)*W+nv);}
  for(let j=0;j<nv;j++){rim(j,j+1);rim(nu*W+j,nu*W+j+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return g;
}
const LN_plate=(pts,d=.03,bv=.008)=>{const s=new THREE.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));s.closePath();const dd=max(.001,d-bv*2);
  return new THREE.ExtrudeGeometry(s,{depth:dd,bevelEnabled:true,bevelThickness:bv,bevelSize:bv,bevelSegments:1}).translate(0,0,-dd/2);};
const LN_tube=(pts,r,rs=6)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>V(p[0],p[1],p[2]))),pts.length*5,r,rs,false);
const LN_cyl=(rt,rb,h,n=8)=>new THREE.CylinderGeometry(rt,rb,h,n);
const LN_tor=(R,r,arc=TAU,n=24,rs=5)=>new THREE.TorusGeometry(R,r,rs,n,arc);
const LN_cone=(r,h,n=5)=>new THREE.ConeGeometry(r,h,n);
const LN_SPH=new THREE.SphereGeometry(1,10,7),LN_UZ=new THREE.CylinderGeometry(1,1,1,8).rotateX(PI/2).translate(0,0,.5),LN_UZT=new THREE.CylinderGeometry(.62,1,1,8).rotateX(PI/2).translate(0,0,.5);
// blade feather, unit size: quill at the origin, tip at z=1, width along X (leading edge +X), a ridge along the middle
const LN_BLADE=LN_loft([[0,.14,.25],[.05,.3,.45],[.16,.5,.5],[.72,.5,.4],[.9,.36,.25,0,.1],[1,.02,.04,0,.3]],4,true);
const LN_STRIP=new THREE.BoxGeometry(.05,1.6,.74).translate(.43,0,.5);   // the line of light along a feather's leading edge

// ===================== LANTERN =====================
// A slender six-armed automaton that hovers out of reach: antlered mask, halo, the core held in a gimbal inside an open chest.
// It is the dark counterpart of the white hero: gunmetal with gold trim, its light kept to rings, palms and the core.
// The core is the origin (orbs and the shield tether start there). The geometry is built once and shared by every Lantern.
const LN_COL={dark:0x595f6d,mid:0x767d8e,pale:0xa0a8ba,gold:new THREE.Color(0xe0b25c).multiplyScalar(2.6),joint:0x2a2d36};
const LN_LA=.5,LN_LF=.48,LN_SC=1;                                   // arm bone lengths, figure scale
const LN_SH=[[.3,.42,-.14],[.27,.22,-.24],[.22,.02,-.28]];            // left shoulders: upper, middle, lower pair
const LN_POLE=[[.5,-.6,-.5],[.8,-.3,-.5],[.5,.1,-.9]];                // where each pair's elbows point
// wrist targets for the left arms [upper, middle, lower]; the right side is the mirror image
const LN_POSE={
  idle:  [[.74,.74,.06],[.21,-.15,.43],[.46,-.5,-.12]],
  charge:[[.24,.5,.5],[.62,.02,.3],[.5,-.28,.16]],
  stun:  [[.46,-.4,.16],[.3,-.56,.34],[.42,-.46,-.04]],
  flinch:[[.78,.5,-.3],[.62,.12,-.12],[.5,-.4,-.3]]};
let LN_PARTS=null;
function LN_lanternParts(){
  if(LN_PARTS)return LN_PARTS;
  const K=LN_kit(),TM={uuid:'metal',userData:{tile:TILE.iron},vertexColors:true},TG={uuid:'glow',userData:{}},grp={};
  for(const k of ['body','head','cage','legs','shin','cab','ua','fa','palm'])grp[k]={uuid:k};
  const {body,head,cage,legs,shin,cab,ua,fa,palm}=grp,{dark:D,mid:Md,pale:Pl,gold:Au,joint:Jn}=LN_COL;
  const m=(par,geo,col,x,y,z,sx,sy,sz,rx,ry,rz)=>K.add(par,geo,TM,x,y,z,sx,sy,sz,rx,ry,rz,col),mm=(par,geo,col,x,y,z,sx,sy,sz,rx,ry,rz)=>K.pair(par,geo,TM,x,y,z,sx,sy,sz,rx,ry,rz,col);
  const gl=(par,geo,x,y,z,sx,sy,sz,rx,ry,rz)=>K.add(par,geo,TG,x,y,z,sx,sy,sz,rx,ry,rz),gg=(par,geo,x,y,z,sx,sy,sz,rx,ry,rz)=>K.pair(par,geo,TG,x,y,z,sx,sy,sz,rx,ry,rz);
  const bar=(par,a,b,r,col,geo=LN_UZ)=>K.span(par,geo,TM,a,b,r,r,col),bars=(par,a,b,r,col,geo)=>{bar(par,a,b,r,col,geo);bar(par,[-a[0],a[1],a[2]],[-b[0],b[1],b[2]],r,col,geo);};
  // ---- torso: spine, back plate, shoulder yoke, open ribs around the core, segmented waist, pelvis
  const zc=y=>-.17-.13*sin(sat((y+.56)/1.02)*PI);
  m(body,LN_tube([[0,-.56,zc(-.56)],[0,-.22,zc(-.22)],[0,.12,zc(.12)],[0,.46,zc(.46)]],.042),Jn);
  for(let k=0;k<8;k++){const y=-.5+k*.13;m(body,LN_cyl(.066,.058,.05),k%2?Md:D,0,y,zc(y));m(body,LN_cone(.018,.11,4),Md,0,y+.01,zc(y)-.09,1,1,1,-1.9);}
  m(body,LN_plate([[0,.5],[.16,.36],[.11,-.05],[0,-.32],[-.11,-.05],[-.16,.36]],.03),D,0,0,-.31);
  LN_SH.forEach(([x,y,z])=>{mm(body,LN_SPH,Md,x,y,z,.07,.07,.07);bars(body,[0,y+.03,zc(y)+.02],[x,y,z],.026,D,LN_UZT);});
  m(body,LN_shell((u,v,o)=>{const a=(u-.5)*2.5,e=-.12+v*1.3,k=.55+.45*sat(v*3);return o.set(sin(a)*cos(e)*.27*k,.3+sin(e)*.2,-.06+cos(a)*cos(e)*.25);},10,6,.02),Pl);
  m(body,LN_plate([[0,.07],[.05,0],[0,-.1],[-.05,0]],.03),Au,0,.33,.2,1,1,1,-.2);
  mm(body,LN_shell((u,v,o)=>{const a=(u-.5)*2.6,e=.25+v*1.25;return o.set(sin(a)*cos(e)*.13,sin(e)*.1,cos(a)*cos(e)*.13);},6,4,.016),Pl,.33,.43,-.14,1,1,1,0,.9,-.5);
  [[.2,.37,2.42,.16,Md],[.02,.39,2.66,.1,Pl],[-.17,.34,2.46,-.02,Md]].forEach(([y,R,arc,tilt,c])=>{
    mm(body,LN_tor(R,.026,arc,14).rotateX(PI/2),c,0,y,-.04,1,1,1,tilt,1.83,0);
    const a=arc-1.83,z0=sin(a)*R;mm(body,LN_SPH,Au,cos(a)*R,y-z0*sin(tilt),-.04+z0*cos(tilt),.03,.03,.03);});
  for(const [y,r,c] of [[-.3,.1,Md],[-.37,.082,Jn],[-.44,.09,Md],[-.5,.075,Jn]])m(body,LN_cyl(r,r*.92,.06,10),c,0,y,-.12,1,1,.85);
  m(body,LN_SPH,D,0,-.6,-.08,.19,.12,.15);
  m(body,LN_plate([[-.09,.08],[.09,.08],[.06,-.06],[0,-.22],[-.06,-.06]],.034),Pl,0,-.6,.08,1,1,1,.25);
  mm(body,LN_shell((u,v,o)=>{const a=-1.0+u*2.0,r=.2+.12*v,y=-.5-v*(.34-.2*pow(abs(2*u-1),2));return o.set(cos(a)*r,y,-.08+sin(a)*r*.8);},8,4,.018),Pl);
  bar(body,[0,.46,zc(.46)],[0,.64,-.14],.034,Jn); bars(body,[.03,.44,-.24],[.03,.62,-.2],.01,Md);
  for(const s of [-1,1])m(body,LN_tube([[s*.09,.66,-.24],[s*.3,.52,-.42],[s*.22,.2,-.46],[s*.05,.06,-.33]],.011,5),Jn);
  // ---- head: cowl, a blank mask narrowing to a point (no mouth: one gold seam down it, three ring marks in a triangle on the brow),
  // antlers of two swept pairs angled outwards, halo
  const mp=(a,e,off,o)=>{const k=.2+.8*smooth(sat((e+1.05)/2.25*1.45));return o.set(sin(a)*cos(e)*(.128+off)*k,.15+sin(e)*(.2+off)*(e<0?1.14:1),.012+cos(a)*cos(e)*(.168+off));};
  m(head,GS,D,0,.15,0,.112,.142,.15);
  m(head,LN_shell((u,v,o)=>mp((u-.5)*2.6,-1.05+v*2.25,0,o),10,10,.014),Pl);
  m(head,LN_shell((u,v,o)=>mp((u-.5)*.07,-1.0+v*1.05,.005,o),1,6,.008),Au);
  gl(head,LN_tor(.021,.0055,TAU,12,4),0,.3,.136,1,1,1,-.66); gg(head,LN_tor(.021,.0055,TAU,12,4),.046,.238,.153,1,1,1,-.4,.34,0);
  const horn=[1,1,1,-.18,.28,-.46];
  mm(head,LN_plate([[.06,.22],[.13,.2],[.3,.36],[.41,.58],[.39,.88],[.33,.93],[.31,.6],[.22,.45],[.09,.31]],.034,.01),D,-.04,.03,-.03,...horn);
  gg(head,LN_tor(.03,.007,TAU,14,4).scale(1,2.5,1).translate(.356,.7,.022),-.04,.03,-.03,...horn);
  mm(head,LN_plate([[.03,.24],[.08,.22],[.2,.4],[.25,.62],[.21,.66],[.15,.46]],.026,.008),Md,0,.0,-.06,1,1,1,-.5,.5,-1.0);
  mm(head,LN_cyl(.036,.036,.03,10),Md,.112,.14,-.03,1,1,1,0,0,PI/2);
  m(head,LN_tor(.45,.011,TAU,40),Au,0,.2,-.2);
  for(let k=0;k<3;k++)gl(head,LN_tor(.45,.017,.6,8),0,.2,-.2,1,1,1,0,0,PI/2-.3+k*TAU/3);
  for(let k=0;k<12;k++){const a=k*TAU/12;m(head,GB,D,sin(a)*.45,.2+cos(a)*.45,-.2,.03,.034,.02,0,0,-a);}
  m(head,LN_tor(.53,.007,TAU,40,4),Jn,0,.2,-.22,1,1,1,.5,0,.5); m(head,LN_tor(.5,.007,TAU,40,4),Jn,0,.2,-.22,1,1,1,-.45,.3,-.6);
  // ---- gimbal around the core (spins)
  m(cage,LN_tor(.33,.012,TAU,32),Au); m(cage,LN_tor(.33,.012,TAU,32),Au,0,0,0,1,1,1,PI/2,0,0);
  m(cage,LN_tor(.214,.009,TAU,24,4),D,0,0,0,1,1,1,0,PI/2,0); m(cage,LN_tor(.214,.009,TAU,24,4),D,0,0,0,1,1,1,PI/2,0,0); m(cage,LN_tor(.214,.009,TAU,24,4),D,0,0,0,1,1,1,0,0,0);   // ribs caging the glass of the orb
  for(const s of [-1,1])m(cage,LN_cone(.03,.1,5),D,0,s*.375,0,1,1,1,s>0?0:PI);
  // ---- legs: long tapering thighs with a pale shell and a ring light, shins that end in points
  const TH=[[0,.085,.1],[.12,.105,.12],[.38,.068,.078],[.57,.046,.052]],SN=[[0,.046,.052],[.13,.056,.066,.012],[.4,.032,.036,.004],[.6,.017,.02],[.72,.003,.004]];
  const thigh=LN_loft(TH,10),shn=LN_loft(SN,10);
  const tsh=LN_shell((u,v,o)=>{const t=.02+v*.5,[w,h]=LN_sec(TH,t),hs=1.75*(1-pow(sat(v),1.6))+.06,a=.85+(u-.5)*2*hs,f=.016+.02*(1-sat(v*3));return o.set(cos(a)*(w+f),sin(a)*(h+f),t);},10,8,.016);
  const ssh=LN_shell((u,v,o)=>{const t=.04+v*.42,[w,h,yo]=LN_sec(SN,t),hs=1.2*(1-v*v)+.05,a=PI/2+(u-.5)*2*hs;return o.set(cos(a)*(w+.012),yo+sin(a)*(h+.012),t);},6,8,.012);
  const tring=LN_tor(.036,.008,TAU,14,4).rotateY(PI/2).rotateZ(.25).translate(cos(.25)*.13,sin(.25)*.145,.17);
  const ank=LN_cyl(.031,.031,.022,8).rotateX(PI/2).translate(0,0,.43),spur=LN_cone(.012,.1,4).rotateZ(PI).translate(0,-.06,.47);
  for(const s of [1,-1]){const rx=PI/2-(s>0?.1:-.02),tp=[s*.115,0,0,s,1,1,rx,-s*.09,0],kz=s>0?.036:-.03,sp=[s*.062,0,kz,s,1,1,PI/2-.05,-s*.02,0];
    K.add(legs,thigh,TM,...tp,D);K.add(legs,tsh,TM,...tp,Pl);K.add(legs,tring,TG,...tp);
    K.add(shin,LN_SPH,TM,s*.062,0,kz,.052,.052,.052,0,0,0,Md);K.add(shin,shn,TM,...sp,D);K.add(shin,ssh,TM,...sp,Pl);K.add(shin,ank,TM,...sp,Au);K.add(shin,spur,TM,...sp,Md);}
  // ---- trailing cables
  for(const pts of [[[.05,0,0],[.09,-.5,-.06],[.06,-1.1,.02],[.1,-1.65,-.05]],[[-.06,0,0],[-.12,-.6,-.1],[-.07,-1.2,-.02],[-.13,-1.5,.03]],[[0,0,-.03],[.01,-.7,-.14],[-.02,-1.3,-.06],[.02,-1.95,-.1]],[[.1,.05,0],[.2,-.4,-.14],[.16,-.9,-.2]]]){
    m(cab,LN_tube(pts,.011,5),Jn);const e=pts[pts.length-1];m(cab,LN_cone(.022,.09,5),Au,e[0],e[1]-.03,e[2],1,1,1,PI);}
  // ---- arms: built along -Y from the joint, the same left and right, palm towards +Z
  // twin-strut upper arm under a shoulder cap and a sleeve plate, a hinge disc at the elbow, a forearm plate and a wrist bracer
  // that carries the ring glyph
  for(const s of [-1,1])m(ua,LN_cyl(.016,.014,LN_LA,6),Jn,s*.022,-LN_LA/2,0);
  m(ua,LN_shell((u,v,o)=>{const a=(u-.5)*3.4,y=.07-v*.2,r=.05+.03*sin(sat(v*1.4)*PI*.5);return o.set(sin(a)*r,y,-cos(a)*r);},6,3,.014),Pl);
  m(ua,LN_shell((u,v,o)=>{const a=(u-.5)*2.6,y=-.2-v*.22,r=.052-.012*v;return o.set(sin(a)*r,y,-cos(a)*r);},5,2,.012),Md);
  for(const s of [-1,1])m(ua,GB,Au,s*.05,-.31,-.012,.008,.2,.014);
  m(ua,LN_cyl(.05,.05,.08,10),D,0,-LN_LA,0,1,1,1,0,0,PI/2); m(ua,LN_cyl(.024,.024,.1,8),Au,0,-LN_LA,0,1,1,1,0,0,PI/2);
  for(const s of [-1,1])m(fa,LN_cyl(.013,.011,LN_LF,6),Jn,s*.018,-LN_LF/2,0);
  m(fa,LN_shell((u,v,o)=>{const a=(u-.5)*2.7,y=-.07-v*.25,r=.036+.02*sin(sat(v*2.5)*PI*.5)-.014*v;return o.set(sin(a)*r,y,-cos(a)*r);},5,3,.012),Pl);
  m(fa,LN_cyl(.046,.04,.1,8),D,0,-LN_LF+.07,0); m(fa,LN_cyl(.048,.048,.014,8),Au,0,-LN_LF+.118,0); m(fa,LN_cyl(.042,.042,.014,8),Au,0,-LN_LF+.022,0);
  gl(palm,LN_tor(.019,.005,TAU,10,4),0,-LN_LF+.07,-.047);
  m(fa,GB,D,0,-LN_LF-.065,0,.1,.12,.03);
  for(const [dx,l,rz] of [[0,1.15,0],[-.034,1,-.1],[.034,1,.1]]){const y=-LN_LF-.125;
    m(fa,GB,Md,dx+rz*.045,y-.05*l,.007,.02,.1*l,.02,-.15,0,rz); m(fa,GB,Md,dx+rz*.13,y-.14*l,.032*l,.016,.085*l,.016,-.5,0,rz);}
  for(const s of [-1,1])m(fa,GB,Md,s*.085,-LN_LF-.06,.012,.018,.085,.018,0,0,s*1.0);
  gl(palm,LN_tor(.032,.008,TAU,12,4),0,-LN_LF-.065,.02);
  const out={};for(const s of K.collect())(out[s.par.uuid]||(out[s.par.uuid]=[])).push([s.geo,s.mat===TM?'metal':'glow']);
  return LN_PARTS=out;
}
class Lantern{
  constructor(x,z,o={}){
    this.kind='lantern';this.B=false;this.S=false;this.scale=1;this.radius=.75;this.hp=this.maxHp=55;this.gy=o.gy||0;this.ar=o.ar;
    this.pos=V(x,this.gy+4.2,z);this.vel=V();this.state='spawn';this.t=0;this.low=0;this.lowT=0;this.fireCd=rand(1.6,3.2);this.linkCd=1.2;this.link=o.link||null;this.forced=!!o.link;
    this.flash=0;this.dead=false;this.gone=false;this.strafe=random()<.5?-1:1;this.strafeT=rand(2,4);this.seed=rand(10);
    const root=this.root=new THREE.Group(); root.rotation.order='YXZ'; scene.add(root);
    this.metal=charMat('iron',{vertexColors:true,roughness:1.1,emissive:0x9fd0ff,emissiveIntensity:0,envMapIntensity:.75,rim:0x8fe0ff,rimK:.6});
    this.glowM=new THREE.MeshBasicMaterial({color:hdr(0x4fe6dc,2.2)});
    const parts=LN_lanternParts(),mats={metal:this.metal,glow:this.glowM},fig=new THREE.Group(); fig.scale.setScalar(LN_SC); root.add(fig);
    const grp=(name,par,x=0,y=0,z=0)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.order='YXZ';par.add(g);
      for(const [geo,mk] of parts[name]){const m=new THREE.Mesh(geo,mats[mk]);m.castShadow=mk==='metal';g.add(m);}return g;};
    const body=this.body=grp('body',fig);this.head=grp('head',body,0,.62,-.14);this.head.scale.setScalar(1.15);this.cage=grp('cage',fig);this.legs=grp('legs',body,0,-.62,-.06);this.shin=grp('shin',this.legs,0,-.565,.02);this.cab=grp('cab',body,0,-.5,-.3);
    const inst=(name,mat)=>{const m=new THREE.InstancedMesh(parts[name][0][0],mat,6);m.frustumCulled=false;m.castShadow=!mat.isMeshBasicMaterial;body.add(m);return m;};
    this.ua=inst('ua',this.metal);this.fa=inst('fa',this.metal);this.palm=inst('palm',this.glowM);
    this.hand=[];for(let i=0;i<6;i++){const p=LN_POSE.idle[i>>1];this.hand.push(V(p[0]*(i&1?-1:1),p[1],p[2]));}
    // the orb: a small core of light inside a shell of dark glass, so the charge reads as the light rising to fill it
    this.coreM=new THREE.MeshBasicMaterial({color:hdr(0xcfe4ff,2)}); this.core=new THREE.Mesh(GS,this.coreM); this.core.scale.setScalar(.085); root.add(this.core);
    this.glassM=new THREE.MeshStandardMaterial({color:0x0c1826,roughness:.16,metalness:0,transparent:true,opacity:.5,depthWrite:false,envMapIntensity:2}); this.glassM.onBeforeCompile=guardOut;
    const gs=new THREE.Mesh(GS,this.glassM); gs.scale.setScalar(.2); gs.renderOrder=1; root.add(gs);
    const s=new THREE.Sprite(this.glowS=new THREE.SpriteMaterial({map:glowTex,color:hdr(0x8fc0ff,.4),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false})); s.scale.setScalar(1.6); root.add(s);
    this.beam=makeBeam(0x9fd0ff); if(this.link)this.link.shield=this;
    const pp=G.player.pos; this.yaw=atan2(pp.x-x,pp.z-z); this.fold=0;this.kick=0;this.pS='';this.hx=.3;
    root.scale.setScalar(.01); this.anim(0,3);
    fx.spawnIn(x,this.gy,z,1,1);
  }
  get ghost(){return this.state==='spawn';}
  get air(){return true;}
  solid(){return 0;}
  cy(){return this.pos.y;}
  hitPos(o){return o.copy(this.pos);}
  remove(){scene.remove(this.root);this.unlink();this.beam.dispose();for(const m of [this.ua,this.fa,this.palm])m.dispose();for(const m of [this.metal,this.glowM,this.coreM,this.glassM,this.glowS])m.dispose();}
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
  orbHit(){this.hp-=30;this.flash=1;fx.hit(this.pos,0,0,false,null);cam.shake(.25);if(this.hp<=0)this.die();else{this.state='stun';this.t=0;if(!this.forced)this.unlink();}}
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
      if(S==='float'){this.fireCd-=dt;if(this.fireCd<=0&&dist<26&&G.state==='play'&&pl.state!=='dead'){this.state='charge';this.t=0;sfx.charge();fx.warn(this,0,.7,1.25);}}
      else{glow=3+this.t*9;fx.aim(P,pl.pos,this.t/.7);if(this.t>=.7){orbs.spawn(P.x,P.y,P.z,dx,pl.pos.y+1.1-P.y,dz,this);this.fireCd=rand(2.6,3.8);this.state='float';}}
    }
    else if(S==='stagger'){fr(5);if(this.t>.5)this.state='float';}
    else if(S==='stun'){fr(5);ty=gy+.95;ky=9;glow=1+random();if(random()<dt*25)fx.parts.spawn(P.x+rand(-.4,.4),P.y+rand(-.3,.5),P.z+rand(-.4,.4),rand(-1,1),rand(1,3),rand(-1,1),1.4,2,3,rand(.05,.1),.4,6,1);if(this.t>2.6)this.state='float';}
    else if(S==='dead'){ty=P.y;glow=3+this.t*30;this.root.scale.setScalar(1+this.t);
      if(this.t>.3&&!this.gone){this.gone=true;fx.burst(P.x,P.y,P.z,1,[1.4,2,3.2],0x9fc8ff,this.gy,7,0x8890a0);sfx.death();this.remove();return;}}
    P.x+=this.vel.x*dt;P.z+=this.vel.z*dt;if(this.ar){P.x=clamp(P.x,this.ar.x0,this.ar.x1);P.z=clamp(P.z,this.ar.z0,this.ar.z1);}
    P.y=damp(P.y,ty+(S==='stun'?0:sin(G.rt*2+this.seed)*.15),ky,dt);
    const L=this.link;
    if(L){if(L.dead||L.gone||(!this.forced&&hypot(L.pos.x-P.x,L.pos.z-P.z)>20)||S==='stun'&&!this.forced)this.unlink(1.5);
      else if(!this.dead){L.shield=this;_a.set(L.pos.x,L.cy(),L.pos.z);this.beam.set(P,_a,.02);}}
    if(!this.link||this.dead)this.beam.hide();
    this.anim(dt,glow);
  }
  // everything you see: facing, the six arms (two-bone IK towards a pose per state), head, legs, halo, lights
  anim(dt,glow){
    const S=this.state,P=this.pos,pl=G.player,rt=G.rt+this.seed,dx=pl.pos.x-P.x,dz=pl.pos.z-P.z,dist=hypot(dx,dz)||.01,limp=S==='stun'||S==='dead';
    if(!limp)this.yaw=turnTo(this.yaw,atan2(dx,dz),3.5*dt);
    const cy=cos(this.yaw),sy=sin(this.yaw),vx=this.vel.x*cy-this.vel.z*sy,vz=this.vel.x*sy+this.vel.z*cy;
    // the legs fold and the cables reel in as the floor comes up (pulled low by gunfire, or stunned)
    const clear=(P.y-this.gy)/LN_SC,fold=this.fold=damp(this.fold,smooth(sat((2.5-clear)/1.3)),8,dt);
    let pose=LN_POSE.idle,k=7,mix=0;
    if(limp)pose=LN_POSE.stun;else if(S==='stagger'){pose=LN_POSE.flinch;k=16;}else if(S==='charge')mix=smooth(sat(this.t/.45));
    if(this.pS==='charge'&&S==='float')this.kick=1;this.pS=S;this.kick=max(0,this.kick-dt*3.5);
    // the arm on the side of a shielded ally points along the tether
    let ta=-1,tx=0,ty=0,tz=0;const L=this.link;
    if(L&&!limp&&!L.dead){const wx=L.pos.x-P.x,wy=L.cy()-P.y,wz=L.pos.z-P.z,lx=wx*cy-wz*sy,lz=wx*sy+wz*cy,l=hypot(lx,wy,lz)||1;ta=lx<0?1:0;tx=lx/l;ty=wy/l;tz=lz/l;}
    const LA=LN_LA,LF=LN_LF,d=LN_a,p=LN_b,el=LN_c,n=LN_d,Y=LN_e,Z=LN_f;
    for(let i=0;i<6;i++){const pr=i>>1,sx=i&1?-1:1,h=this.hand[i],sh=LN_SH[pr],a=pose[pr],c=LN_POSE.charge[pr],ph=rt*1.1+i*1.7,ox=sh[0]*sx,oy=sh[1],oz=sh[2];
      let gx=lerp(a[0],c[0],mix)*sx,gy=lerp(a[1],c[1],mix),gz=lerp(a[2],c[2],mix);
      if(!limp){gx+=sin(ph)*.025*sx;gy+=sin(ph*1.3)*.03;gz+=cos(ph*.9)*.02+(pr<2?this.kick*.3:0);}
      if(i===ta){gx=ox+tx*.95;gy=oy+ty*.95;gz=oz+tz*.95;}
      h.x=damp(h.x,gx,k,dt);h.y=damp(h.y,gy,k,dt);h.z=damp(h.z,gz,k,dt);
      d.set(h.x-ox,h.y-oy,h.z-oz);const Ld=clamp(d.length(),abs(LA-LF)+.01,LA+LF-.004);d.normalize();
      const po=LN_POLE[pr];p.set(po[0]*sx,po[1],po[2]);p.addScaledVector(d,-p.dot(d));if(p.lengthSq()<1e-6)p.set(0,0,-1).addScaledVector(d,d.z);p.normalize();
      const aa=(LA*LA-LF*LF+Ld*Ld)/(2*Ld),hh=sqrt(max(0,LA*LA-aa*aa));
      el.copy(d).multiplyScalar(aa).addScaledVector(p,hh);n.crossVectors(d,p);
      Y.copy(el).multiplyScalar(-1/LA);Z.crossVectors(n,Y);this.ua.setMatrixAt(i,LN_M.makeBasis(n,Y,Z).setPosition(ox,oy,oz));
      Y.copy(el).addScaledVector(d,-Ld).multiplyScalar(1/LF);Z.crossVectors(n,Y);LN_M.makeBasis(n,Y,Z).setPosition(ox+el.x,oy+el.y,oz+el.z);this.fa.setMatrixAt(i,LN_M);this.palm.setMatrixAt(i,LN_M);
    }
    this.ua.instanceMatrix.needsUpdate=this.fa.instanceMatrix.needsUpdate=this.palm.instanceMatrix.needsUpdate=true;
    const lean=clamp(vz*.05,-.15,.15);
    this.root.position.copy(P);this.root.rotation.set(limp?0:lean-this.kick*.12,this.yaw,limp?sin(rt*3)*.05:clamp(-vx*.05,-.15,.15)+sin(rt*.9)*.03);
    const look=limp?.8:clamp(atan2(P.y+.6-(pl.pos.y+1.3),dist),-.3,.8)-lean-(S==='charge'?.3*mix:0)+this.kick*.35;
    this.hx=damp(this.hx,look,limp?4:9,dt);this.head.rotation.set(this.hx,limp?0:sin(rt*.7)*.12,limp?.25:sin(rt*.5)*.05);
    this.legs.rotation.set(-fold*1.3+clamp(vz*.06,-.25,.25)+sin(rt*.8)*.035,0,clamp(-vx*.05,-.2,.2));this.shin.rotation.x=fold*2.8+.1+sin(rt*.8+1)*.04;
    this.cab.scale.y=clamp((clear-.6)/2.05,.15,1);this.cab.rotation.set(clamp(vz*.08,-.4,.4)+sin(rt*1.1)*.05,0,clamp(-vx*.08,-.4,.4)+sin(rt*.8)*.04);
    this.cage.rotation.y+=dt*(S==='stun'?.3:S==='charge'?1.6+this.t*10:1.6);this.cage.rotation.x=sin(rt)*.3;
    // light level of the orb: idle sits at about a third of a full charge, a stunned Lantern gutters at a few per cent
    const lv=S==='stun'?.035+.03*abs(sin(rt*23)*sin(rt*7.3)):min(4,glow/8.2);
    this.coreM.color.setHex(0xcfe4ff).multiplyScalar(lv*5.4);this.core.scale.setScalar(.085+(S==='charge'?min(.11,this.t*.16):0));
    this.glassM.opacity=.5-.3*sat(lv-.4);this.glowS.color.setHex(0x8fc0ff).multiplyScalar(.04+.5*lv*lv);
    this.glowM.color.setHex(0x4fe6dc).multiplyScalar(.75*glow);
    fx.rim(this,this.rimM||(this.rimM={m:this.metal}),this.flash,S==='charge'?sat(this.t/.7):0,0,S==='stun'||S==='stagger');
  }
}
