// ===================== FX =====================
// Shape language: hard and directional, with mass; energy goes into shape and contrast, not into exposure. Every additive particle
// (thick slash marks, tapered spikes, chunky sparks stretched along their velocity, rings, small cores, lightning) is one instanced
// quad in one draw call; a second, alpha-blended system draws dust and smoke. Nothing here is a big soft sprite.
const _f0=V(),_f1=V(),_f2=V(),_fl=V(),_fc=new THREE.Color();
const FXS={value:600},FXK={value:130};   // pixels per metre at one metre from the camera; the largest a core may be on screen, in pixels (both set on resize)
const WCOL=[0x45d4ff,0xa6c6ff,0xffb060];   // what each weapon set paints its hits and trails with: Fangs cyan, sword pale blue-white, Maul amber
const fxNoise=(()=>{   // tiling value noise: erodes dust, streaks the blade trail
  const lat=s=>{const a=Array.from({length:s*s},random),at=(i,j)=>a[(j%s)*s+i%s];return (u,v)=>{const x=u*s,y=v*s,xi=floor(x),yi=floor(y),kx=smooth(x-xi),ky=smooth(y-yi);return lerp(lerp(at(xi,yi),at(xi+1,yi),kx),lerp(at(xi,yi+1),at(xi+1,yi+1),kx),ky);};};
  const t=canvasTex(64,64,(g,w)=>{const a=lat(5),b=lat(11),c=lat(23),im=g.createImageData(w,w);for(let y=0;y<w;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;im.data[i]=im.data[i+1]=im.data[i+2]=(a(x/w,y/w)*.55+b(x/w,y/w)*.3+c(x/w,y/w)*.15)*255;im.data[i+3]=255;}g.putImageData(im,0,0);});
  t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;})();
// iP centre, iA world-space extent (tail to head), iC colour, iM (width, shape, life left 0..1, extra). The quad faces the camera and
// lies along the extent as seen on screen. No hairlines: every shape has a least width in pixels (spikes 3.5, the slash mark 6 and
// at least 90 long); cores and spikes have a greatest size on screen; anything nearer the camera than about a metre and a half
// fades out, so no sprite can fill the frame.
const QUAD_VS=`attribute vec3 iP,iA,iC;attribute vec4 iM;uniform float uS,uK;varying vec3 vC;varying vec2 vU;varying vec4 vK;
void main(){vec4 mv=viewMatrix*vec4(iP,1.);vec3 a=(viewMatrix*vec4(iA,0.)).xyz;
  float sh=iM.y,px=max(.1,-mv.z)/uS,cap=uK*px,wd=step(3.5,sh)*step(sh,4.5),sl=step(4.5,sh)*step(sh,5.5);
  float w=iM.x>0.?max(iM.x,(2.+1.5*wd+4.*sl)*px):0.,l2=dot(a.xy,a.xy);
  vec2 d=l2>1e-9?a.xy*inversesqrt(max(l2,1e-9)):vec2(1.,0.);float len=max(max(sqrt(max(l2,0.)),w),90.*px*sl);
  if(sh<.5){w=min(w,cap);len=min(len,cap);}else if(wd+sl>.5)len=min(len,cap*(1.7+1.3*sl));
  mv.xy+=d*(position.x+.5*wd)*len+vec2(-d.y,d.x)*position.y*w;
  gl_Position=projectionMatrix*mv;vU=position.xy*2.;vC=iC;vK=vec4(iM.yzw,smoothstep(.9,1.7,-mv.z));}`;
// shape 0 small soft core, 1 spark (round hot head, tail tapering away), 2 lens (pointed at both ends), 3 ring (two arcs: a hard edge
// with a soft falloff inside it), 4 wedge (base at iP), 5 slash mark (a thick blade shape: white through its middle third, the
// colour at its edges), 6 bar (lightning: a white core in a halo)
const QUAD_FS=`varying vec3 vC;varying vec2 vU;varying vec4 vK;
void main(){float x=vU.x,y=abs(vU.y),sh=vK.x,a=0.,co=0.;
  if(sh<.5){float r=clamp(1.-length(vU),0.,1.);a=r*r*(.3+.7*r*r);}
  else if(sh<1.5){float t=clamp(x*.5+.5,0.,1.),w=max((.08+.92*t*t)*(1.-.85*smoothstep(.82,1.,t)),.001);a=smoothstep(w,w*.35,y)*smoothstep(0.,.2,t);co=smoothstep(w*.5,0.,y)*t;}
  else if(sh<2.5){float t=clamp(1.-abs(x),0.,1.),w=max(t*(1.6-.6*t),.001);a=smoothstep(w,w*.55,y);co=smoothstep(w*.45,w*.12,y);}
  else if(sh<3.5){float r=length(vU),th=.03+vK.z,f=clamp((r-(1.-th*6.))/(th*5.),0.,1.);a=(smoothstep(th,th*.3,abs(r-(1.-th)))+f*f*.2*step(r,1.-th))*smoothstep(.25,.85,abs(x)/max(r,.01));}
  else if(sh<4.5){float t=clamp(.5-x*.5,0.,1.),w=max(t,.001);a=smoothstep(w,w*.5,y)*smoothstep(-1.,-.8,x);co=smoothstep(w*.4,w*.1,y);}
  else if(sh<5.5){float t=clamp(1.-abs(x),0.,1.),w=max(t*(1.75-.75*t),.001);a=smoothstep(w,w*.74,y);co=smoothstep(w*.4,w*.24,y);}
  else{float h=clamp(1.-y,0.,1.);a=h*h*.55;co=smoothstep(.36,.14,y);}
  gl_FragColor=vec4((vC*a+vec3(max(vC.r,max(vC.g,vC.b)))*co*vK.z)*vK.w,1.);}`;
// dust: iM.y is its opacity, iM.w a noise offset; the alpha erodes from the thin parts inward as it ages
const DUST_FS=`uniform sampler2D uN;varying vec3 vC;varying vec2 vU;varying vec4 vK;
void main(){float k=clamp(vK.y,0.,1.),r=clamp(1.-length(vU),0.,1.),n=texture2D(uN,vU*.23+vK.z).r,er=(1.-k)*.85;
  gl_FragColor=vec4(vC,smoothstep(er,er+.3,r*.7+n*.55)*smoothstep(0.,.4,r)*min(1.,(1.-k)*9.)*vK.x*vK.w);}`;
class Quads{
  constructor(n,dust){
    this.n=n;this.i=0;this.top=0;this.floor=0;this.was=false;const F=k=>new Float32Array(n*k);
    this.p=F(3);this.a=F(3);this.c=F(3);this.m=F(4);this.v=F(3);this.d=F(3);this.c0=F(3);
    this.life=F(1);this.max=F(1);this.gr=F(1);this.dr=F(1);this.w0=F(1);this.w1=F(1);this.l0=F(1);this.l1=F(1);this.st=F(1);this.fl=new Uint8Array(n);
    const g=this.g=new THREE.InstancedBufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]),3));g.setIndex([0,1,2,0,2,3]);g.instanceCount=0;
    this.at=[['iP',this.p,3],['iA',this.a,3],['iC',this.c,3],['iM',this.m,4]].map(([k,arr,s])=>{const b=new THREE.InstancedBufferAttribute(arr,s);b.setUsage(THREE.DynamicDrawUsage);g.setAttribute(k,b);return b;});
    this.mat=new THREE.ShaderMaterial({uniforms:{uS:FXS,uK:FXK,uN:{value:fxNoise}},vertexShader:QUAD_VS,fragmentShader:dust?DUST_FS:QUAD_FS,
      blending:dust?THREE.NormalBlending:THREE.AdditiveBlending,depthWrite:false,transparent:true,side:THREE.DoubleSide});
    this.mesh=new THREE.Mesh(g,this.mat);this.mesh.frustumCulled=false;this.mesh.renderOrder=dust?2:3;scene.add(this.mesh);
  }
  // flags: 1 runs on real time (not frozen by hit-stop or slow motion), 2 drawn for exactly one frame, 4 cools like a spark,
  // 8 keeps its colour and width for the first half of its life, then thins and drops, 16 bounces off the floor, 64 keeps its colour
  put(x,y,z,r,g,b,sh,life,w0,w1,fl=0){const i=this.i;this.i=(i+1)%this.n;if(i>=this.top)this.top=i+1;const j=i*3,q=i*4;
    this.p[j]=x;this.p[j+1]=y;this.p[j+2]=z;this.c0[j]=r;this.c0[j+1]=g;this.c0[j+2]=b;this.v[j]=this.v[j+1]=this.v[j+2]=this.d[j]=this.d[j+1]=this.d[j+2]=0;
    this.m[q]=0;this.m[q+1]=sh;this.m[q+2]=1;this.m[q+3]=0;this.life[i]=this.max[i]=life;this.w0[i]=w0;this.w1[i]=w1;this.l0[i]=this.l1[i]=this.st[i]=this.gr[i]=this.dr[i]=0;this.fl[i]=fl;return i;}
  // the old point-sprite call, kept for the many small emitters: a mote, stretched along its motion if it has any
  spawn(x,y,z,vx,vy,vz,r,g,b,size,life,grav=0,drag=0){const mv=vx||vy||vz,i=this.put(x,y,z,r,g,b,mv?1:0,life,size*(mv?.3:.55),size*.1),j=i*3;
    this.v[j]=vx;this.v[j+1]=vy;this.v[j+2]=vz;this.st[i]=.045;this.gr[i]=grav;this.dr[i]=drag;this.m[i*4+3]=.5;return i;}
  update(gdt,rdt){const {p,a,c,m,v,d,c0,life,max:mx,gr,dr,w0,w1,l0,l1,st,fl}=this,fy=this.floor+.02;let hi=0;
    for(let i=0;i<this.top;i++){if(life[i]<=0)continue;const j=i*3,q=i*4,f=fl[i],dt=f&1?rdt:gdt;
      if(f&2){if(f&32){life[i]=0;m[q]=0;continue;}fl[i]|=32;}else if((life[i]-=dt)<=0){m[q]=0;continue;}
      hi=i+1;const k=life[i]/mx[i],e=1-k*k*k,dg=1-min(1,dr[i]*dt);
      v[j]*=dg;v[j+1]=v[j+1]*dg-gr[i]*dt;v[j+2]*=dg;p[j]+=v[j]*dt;p[j+1]+=v[j+1]*dt;p[j+2]+=v[j+2]*dt;
      if(f&16&&p[j+1]<fy&&v[j+1]<0){p[j+1]=fy;v[j+1]*=-.38;v[j]*=.7;v[j+2]*=.7;}
      const s=st[i];if(s>0){a[j]=v[j]*s;a[j+1]=v[j+1]*s;a[j+2]=v[j+2]*s;}else{const l=lerp(l0[i],l1[i],e);a[j]=d[j]*l;a[j+1]=d[j+1]*l;a[j+2]=d[j+2]*l;}
      m[q]=lerp(w0[i],w1[i],f&8?(k>.5?0:1-k*2):e);m[q+2]=k;let cr=c0[j],cg=c0[j+1],cb=c0[j+2];
      if(f&4){if(k>.84){const h=(k-.84)/.16,w=max(cr,cg,cb)*1.15;cr+=(w-cr)*h;cg+=(w-cg)*h;cb+=(w-cb)*h;}else if(k<.4){const h=k/.4;cr*=h;cg*=h*h;cb*=h*h;}}   // white-hot, its own colour, then dark
      else if(f&8){const h=k>.5?1:k*2;cr*=h;cg*=h;cb*=h;}else if(!(f&64)){cr*=k;cg*=k;cb*=k;}
      c[j]=cr;c[j+1]=cg;c[j+2]=cb;}
    this.g.instanceCount=hi;if(hi||this.was)for(const b of this.at)b.needsUpdate=true;this.was=hi>0;if(!hi)this.top=0;}
}
// ground rings: a hot leading edge a few centimetres wide with a short soft falloff behind it. seg > 0 cuts it into turning segments.
const FLAT_VS=`varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const RING_FS=`uniform vec3 uC;uniform vec4 uP;uniform float uA;varying vec2 vU;
void main(){vec2 q=vU*2.-1.;float r=length(q),R=max(uP.x,.05),e=max(uP.y/R,fwidth(r)*1.3),fw=min(.5/R,.9);
  float edge=smoothstep(e,e*.3,abs(r-(1.-e))),fall=clamp((r-(1.-e-fw))/fw,0.,1.);fall=fall*fall*fall*step(r,1.-e)*.2;
  float sg=1.;if(uP.z>.5){float f=abs(fract(atan(q.y,q.x+1e-6)*.159155*uP.z+uP.w)-.5);sg=smoothstep(.38,.33,f);}
  gl_FragColor=vec4(uC*(edge+fall)*sg*uA,1.);}`;
const flatGeo=new THREE.PlaneGeometry(2,2).rotateX(-PI/2);
const addShader=(u,fs,vs=FLAT_VS)=>new THREE.ShaderMaterial({uniforms:u,vertexShader:vs,fragmentShader:fs,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,side:THREE.DoubleSide});
class Rings{
  constructor(n){this.it=[];this.i=0;
    for(let k=0;k<n;k++){const u={uC:{value:new THREE.Color()},uP:{value:new THREE.Vector4(1,.05,0,0)},uA:{value:1}},m=new THREE.Mesh(flatGeo,addShader(u,RING_FS));m.visible=false;scene.add(m);this.it.push({m,u,on:false,t:0,life:1,r0:0,r1:1,spin:0});}}
  // expanding rings ease out and fade; contracting ones (r0 > r1) close at a steady rate so their timing can be read
  spawn(x,y,z,hex,boost,r0,r1,life,seg=0,spin=0,w=.05){const it=this.it[this.i++%this.it.length];Object.assign(it,{on:true,t:0,life,r0,r1,spin});it.m.position.set(x,y,z);it.u.uC.value.setHex(hex).multiplyScalar(boost*.6);it.u.uP.value.set(r0,w,seg,rand(1));it.m.visible=false;return it;}   // shown from its first update
  update(dt){for(const it of this.it){if(!it.on)continue;it.t+=dt;const k=it.t/it.life;if(k>=1){it.on=it.m.visible=false;continue;}it.m.visible=true;
    const grow=it.r1>it.r0,r=max(.01,lerp(it.r0,it.r1,grow?1-pow(1-k,3):k));it.m.scale.setScalar(r);it.u.uP.value.x=r;it.u.uP.value.w+=it.spin*dt;it.u.uA.value=grow?(1-k)*(1-k):min(1,.4+k);}}
}
// Blade ribbon. The blade is sampled several times a frame and a turn of more than a few degrees between two samples is filled in
// by turning the blade (not by cutting the corner), then a spline is drawn through the lot, so a fast spin draws a curve and never a
// polygon. As wide as the blade at its head and tapering to nothing; a hot line on the cutting edge and a streaked body in the
// weapon colour, both fading with the square of the length. Seen edge-on it is still at least uB.y pixels wide at the head.
// Samples age out, so it is gone a moment after the swing ends.
const cmr=(a,b,c,d,t)=>.5*(2*b+(c-a)*t+(2*a-5*b+4*c-d)*t*t+(3*b-a-3*c+d)*t*t*t);
const TRAIL_VS=`attribute vec3 aW,aG;attribute vec2 aQ;uniform float uS;uniform vec4 uB;varying vec2 vQ;
void main(){vec4 mv=viewMatrix*vec4(position,1.);vec3 w=(viewMatrix*vec4(aW,0.)).xyz,g=(viewMatrix*vec4(aG,0.)).xyz;
  float gl=dot(g.xy,g.xy);vec2 n=gl>1e-10?vec2(-g.y,g.x)*inversesqrt(max(gl,1e-10)):vec2(0.);float ac=dot(w.xy,n);if(ac<0.){n=-n;ac=-ac;}
  w.xy+=n*max(0.,uB.y*(1.-aQ.x)*max(.1,-mv.z)/uS-ac);mv.xyz+=w*(1.-aQ.y);vQ=aQ;gl_Position=projectionMatrix*mv;}`;
const TRAIL_FS=`uniform vec3 uC;uniform vec4 uB;uniform sampler2D uN;varying vec2 vQ;
void main(){float u=clamp(vQ.x,0.,1.),v=clamp(vQ.y,0.,1.),al=(1.-u)*(1.-u);
  float n=texture2D(uN,vec2(u*.21,v*2.3)).r*texture2D(uN,vec2(u*.47+.37,v*6.1)).r*3.4;   // streaks drawn out along the length
  float edge=smoothstep(.86,.95,v),body=v*v*(.22+.78*v)*(.3+n)*uB.x;
  gl_FragColor=vec4((uC*body*1.2+(vec3(uB.z)+uC*.9)*edge*uB.w*(.4+.6*al))*al,1.);}`;
class Trail{
  // o: life (seconds of history), body (strength of the body), px (least head width on screen), white and edge (how white and how
  // strong the cutting edge is: a foe's ribbon keeps its own orange-red and sits well under the hero's)
  constructor(n,hex,o={}){const N=this.N=26,T=this.T=5,R=this.R=(N-1)*T+1;this.life=o.life||.13;this.sb=new Float32Array(N*3);this.st=new Float32Array(N*3);this.age=new Float32Array(N);this.cnt=0;this.acc=0;this.was=false;
    const F=k=>new Float32Array(R*2*k),idx=[];this.pos=F(3);this.aw=F(3);this.ag=F(3);this.aq=F(2);
    for(let i=0;i<R;i++){this.aq[i*4+3]=1;if(i<R-1){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
    const g=this.g=new THREE.BufferGeometry();this.at=[['position',this.pos,3],['aW',this.aw,3],['aG',this.ag,3],['aQ',this.aq,2]].map(([k,arr,s])=>{const b=new THREE.BufferAttribute(arr,s);b.setUsage(THREE.DynamicDrawUsage);g.setAttribute(k,b);return b;});g.setIndex(idx);
    this.mesh=new THREE.Mesh(g,addShader({uC:{value:new THREE.Color(hex)},uN:{value:fxNoise},uS:FXS,uB:{value:new THREE.Vector4(o.body||.35,o.px||14,o.white??.55,o.edge||2.1)}},TRAIL_FS,TRAIL_VS));
    this.mesh.frustumCulled=false;this.mesh.visible=false;this.mesh.renderOrder=3;scene.add(this.mesh);}
  push(bx,by,bz,tx,ty,tz,a){const {sb,st,age}=this,k=min(this.cnt,this.N-1);sb.copyWithin(3,0,k*3);st.copyWithin(3,0,k*3);age.copyWithin(1,0,k);sb[0]=bx;sb[1]=by;sb[2]=bz;st[0]=tx;st[1]=ty;st[2]=tz;age[0]=a;this.cnt=k+1;}
  // b, t: where the blade's root and tip are now; dt in the time of whoever swings it (so the ribbon freezes with them in hit-stop)
  sample(b,t,on,dt=1/60){const {sb,st,age,T,R,pos,aw,ag,aq}=this;let c=this.cnt;
    for(let i=0;i<c;i++)age[i]+=dt;while(c>0&&age[c-1]>this.life)c--;this.cnt=c;
    if(on){this.acc+=dt;
      if(c>0&&this.was&&this.acc<.004){sb[0]=b.x;sb[1]=b.y;sb[2]=b.z;st[0]=t.x;st[1]=t.y;st[2]=t.z;}   // time has barely moved (hit-stop): keep the head on the blade without spending a sample
      else{
        if(c>0&&this.was){const ox=sb[0],oy=sb[1],oz=sb[2],px=st[0]-ox,py=st[1]-oy,pz=st[2]-oz,qx=t.x-b.x,qy=t.y-b.y,qz=t.z-b.z,lp=hypot(px,py,pz)||1,lq=hypot(qx,qy,qz)||1,
            th=Math.acos(clamp((px*qx+py*qy+pz*qz)/(lp*lq),-1,1)),n=min(4,Math.ceil(th/.14)),a0=age[0],sn=sin(th);
          for(let j=1;j<n;j++){const f=j/n,wa=sin((1-f)*th)/sn,wb=sin(f*th)/sn,l=lerp(lp,lq,f),x=lerp(ox,b.x,f),y=lerp(oy,b.y,f),z=lerp(oz,b.z,f);
            this.push(x,y,z,x+(px/lp*wa+qx/lq*wb)*l,y+(py/lp*wa+qy/lq*wb)*l,z+(pz/lp*wa+qz/lq*wb)*l,a0*(1-f));}}
        this.push(b.x,b.y,b.z,t.x,t.y,t.z,0);this.acc=0;}
    }
    this.was=on;c=this.cnt;if(c<2){if(this.mesh.visible)this.mesh.visible=false;return;}
    const segs=(c-1)*T,L=this.life;
    for(let r=0;r<R;r++){const s=min(r,segs)/T,i1=min(floor(s),c-2),f=s-i1,i0=max(i1-1,0)*3,j1=i1*3,i2=j1+3,i3=min(i1+2,c-1)*3,o=r*6,u=min(1,(age[i1]+(age[i1+1]-age[i1])*f)/L),tp=1-u*sqrt(u);
      for(let k=0;k<3;k++){const P=cmr(st[i0+k],st[j1+k],st[i2+k],st[i3+k],f),B=cmr(sb[i0+k],sb[j1+k],sb[i2+k],sb[i3+k],f);pos[o+k]=pos[o+3+k]=P;aw[o+k]=aw[o+3+k]=(B-P)*tp;}
      aq[r*4]=aq[r*4+2]=u;}
    for(let r=0;r<R;r++){const a=max(r-1,0)*6,d=min(r+1,R-1)*6,o=r*6;for(let k=0;k<3;k++)ag[o+k]=ag[o+3+k]=pos[a+k]-pos[d+k];}   // along the path: the shader widens across it
    for(const a of this.at)a.needsUpdate=true;this.mesh.visible=true;}
  // the direction the tip is travelling in (unit vector into o); returns how far it moved over the last few samples
  dir(o){const c=this.cnt;if(c<2)return 0;const s=this.st,j=min(c-1,3)*3;o.set(s[0]-s[j],s[1]-s[j+1],s[2]-s[j+2]);const l=o.length();if(l>1e-4)o.multiplyScalar(1/l);return l;}
}
// Hit, wind-up and stagger feedback on lit characters: an additive rim (fresnel) plus a small flat part, never a repaint, so the
// metal and its panel lines stay readable. Patches any lit material once; uRimC is the rim colour, uRimF (power, flat share).
function rimPatch(m){
  if(m.userData.rim!==undefined)return m.userData.rim;if(!m.isMeshStandardMaterial)return m.userData.rim=null;
  const u=m.userData.rim={uRimC:{value:new THREE.Color(0)},uRimF:{value:new THREE.Vector2(2.5,0)}},prev=m.onBeforeCompile,key=m.customProgramCacheKey?m.customProgramCacheKey():'';
  m.onBeforeCompile=(s,r)=>{if(prev)prev(s,r);s.uniforms.uRimC=u.uRimC;s.uniforms.uRimF=u.uRimF;
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 uRimC;uniform vec2 uRimF;').replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      {vec3 rV=vViewPosition*inversesqrt(max(dot(vViewPosition,vViewPosition),1e-12));float rF=1.-clamp(abs(dot(normal,rV)),0.,1.);totalEmissiveRadiance+=uRimC*(pow(clamp(rF,.0001,1.),uRimF.x)+uRimF.y);}`);};
  m.customProgramCacheKey=()=>key+'|rim';m.needsUpdate=true;return u;
}
// the two warning colours (linear): red for ordinary attacks, yellow-white for heavy ones. Nothing else in the game uses them.
const WARN=[[1,.012,.04],[1,.8,.3]];
const HOT=[3.3,1.25,.28];   // struck metal: what flies off a foe is this orange whatever the weapon
const fx={
  parts:new Quads(2600),dust:new Quads(260,true),rings:new Rings(14),lights:[],li:0,hitN:0,
  init(){for(let i=0;i<3;i++){const L=new THREE.PointLight(0xffffff,0,4.5,2);scene.add(L);this.lights.push({L,t:0,life:.1,i0:0});}},
  rgb(hex,k){_fc.setHex(hex);return [_fc.r*k,_fc.g*k,_fc.b*k];},
  // pooled light: a small fraction of what it was, short range, never hugging the floor and pulled off the surface it was
  // spawned on (toward the camera). Sitting on the floor at full strength is what bleached every impact.
  flash(pos,hex,inten,life=.14,range=inten>150?9:4.5){const o=this.lights[this.li++%3],c=camera.position;_fl.set(c.x-pos.x,0,c.z-pos.z).setLength(1.2);
    o.L.color.setHex(hex);o.L.position.set(pos.x+_fl.x,max(pos.y,this.parts.floor+1.2),pos.z+_fl.z);o.L.distance=range;o.t=0;o.life=life;o.i0=o.L.intensity=inten*.045;},
  // ---- primitives (real time unless fl says otherwise) ----
  core(pos,col,size,life=.034){this.parts.put(pos.x,pos.y,pos.z,col[0],col[1],col[2],0,life,size,size*1.2,1|8);},
  lens(pos,dx,dy,dz,l0,l1,w0,w1,col,life,white=.8,fl=1|8,sh=2){const P=this.parts,i=P.put(pos.x,pos.y,pos.z,col[0],col[1],col[2],sh,life,w0,w1,fl),j=i*3;P.d[j]=dx;P.d[j+1]=dy;P.d[j+2]=dz;P.l0[i]=l0;P.l1[i]=l1;P.m[i*4+3]=white;return i;},
  wedge(pos,dx,dy,dz,len,w,col,life,white=.9,fl=1|8){return this.lens(pos,dx,dy,dz,len*.55,len,w,w*.4,col,life,white,fl,4);},
  // ring facing the camera, drawn as two arcs that open along (dx,dy,dz) (or across the screen). s0, s1: its diameter; th thickens the edge
  halo(pos,col,s0,s1,life,dx=0,dy=0,dz=0,fl=1,th=0){const P=this.parts,i=P.put(pos.x,pos.y,pos.z,col[0],col[1],col[2],3,life,s0,s1,fl),j=i*3;P.d[j]=dx;P.d[j+1]=dy;P.d[j+2]=dz;P.l0[i]=P.l1[i]=.001;P.m[i*4+3]=th;},
  // four-point glint: two crossed lenses in the screen plane
  glint(pos,hex,k,len,life=.16,w=.07){const c=this.rgb(hex,k),e=camera.matrixWorld.elements;this.lens(pos,e[0],e[1],e[2],len*.3,len,w,w*.3,c,life);this.lens(pos,e[4],e[5],e[6],len*.2,len*.62,w,w*.3,c,life);},
  // matter thrown off: 3 to 4.5 cm wide, stretched a little along its flight, falling, bouncing once, cooling from white through its colour to dark
  sparks(pos,dx,dy,dz,n,col,spd=9,spread=.9){const P=this.parts;n=Math.ceil(n*.75);
    for(let k=0;k<n;k++){const big=random()<.3,s=spd*rand(.35,1.25)*(big?.8:1),vx=(dx+rand(-spread,spread))*s,vy=(dy+rand(-spread,spread))*s+1.5,vz=(dz+rand(-spread,spread))*s,t0=rand(.012,.08);   // already a little way out, so they show in the frozen frames of a hit-stop
      const i=P.put(pos.x+vx*t0,pos.y+vy*t0,pos.z+vz*t0,col[0],col[1],col[2],1,rand(.34,.5)*(big?1.15:1),big?.046:.034,big?.022:.015,4|16),j=i*3;
      P.v[j]=vx;P.v[j+1]=vy;P.v[j+2]=vz;P.st[i]=.021;P.gr[i]=17;P.dr[i]=2.4;P.m[i*4+3]=.7;}},
  embers(x,y,z,n,col,r=.5){const P=this.parts;n=Math.ceil(n*.4);
    for(let k=0;k<n;k++){const a=rand(TAU),s=rand(.5,5),i=P.put(x+rand(-r,r),y+rand(-r,r)*1.6,z+rand(-r,r),col[0],col[1],col[2],1,rand(.5,1.3),rand(.022,.044),.01,4),j=i*3;
      P.v[j]=cos(a)*s;P.v[j+1]=rand(1,7);P.v[j+2]=sin(a)*s;P.st[i]=.03;P.gr[i]=-1.5;P.dr[i]=1.6;P.m[i*4+3]=.5;}},
  // floor dust kicked outward: pale grey (or col), alpha-blended, gone in well under a second
  puff(x,z,n,r=1,y=0,col=null){const D=this.dust,c=col||[.17,.175,.19];n=Math.ceil(n*.4);
    for(let k=0;k<n;k++){const a=rand(TAU),s=rand(2,6)*r,i=D.put(x+cos(a)*.25*r,y+rand(.1,.3),z+sin(a)*.25*r,c[0],c[1],c[2],.3,rand(.35,.7),rand(.25,.45)*r,rand(.7,1.2)*r,64),j=i*3;
      D.v[j]=cos(a)*s;D.v[j+1]=rand(.2,1.1);D.v[j+2]=sin(a)*s;D.dr[i]=4.5;D.m[i*4+3]=rand(1);}},
  smoke(x,y,z,n,r=1){const D=this.dust;
    for(let k=0;k<n;k++){const a=rand(TAU),s=rand(.3,1.6)*r,i=D.put(x+rand(-.25,.25)*r,y+rand(-.3,.3)*r,z+rand(-.25,.25)*r,.035,.036,.042,.72,rand(.5,.8),rand(.45,.7)*r,rand(1.1,1.7)*r,64),j=i*3;
      D.v[j]=cos(a)*s;D.v[j+1]=rand(.6,2.2);D.v[j+2]=sin(a)*s;D.dr[i]=2.5;D.m[i*4+3]=rand(1);}},
  // A hero attack connecting, in three layers. sw: the direction the blade is travelling in (or null); hex: the weapon colour;
  // o: {lvl 2 the target of the blow, 1 someone else caught by it, 0 deep in a crowd; metal, gy: the target's plate colour and floor;
  // av: a position the spikes must not point at (the hero)}.
  //  1 the mark   one thick tapered slash along the swing: white through the middle, the weapon's colour at the edges, full for
  //               three frames and thinning for three
  //  2 spikes     a few wide ones, most of them close to the line of the swing, two of them long
  //  3 matter     orange sparks with weight (and, on a heavy hit, shards of the target's plate) thrown along the blow
  hit(pos,dx,dz,big,sw,hex=0x45d4ff,o=null){
    const lvl=o?o.lvl:2;this.hitN++;if(lvl<1){this.sparks(pos,dx,.3,dz,7,HOT,8,.6);return;}
    const q=lvl>1?1:.66,C=this.rgb(hex,1),e=camera.matrixWorld.elements;let sx,sy,sz;
    if(sw){sx=sw.x;sy=sw.y;sz=sw.z;}else{const a=rand(-1,1);sx=-dz*cos(a);sy=sin(a);sz=dx*cos(a);}
    const L=(big?3:1.4)*q,W=(big?.32:.12)*q;this.lens(pos,sx,sy,sz,L*.6,L,W,W*.12,[C[0]*1.3+.07,C[1]*1.3+.07,C[2]*1.3+.07],.1,2.3,1|8,5);   // the colour is kept low enough to stay a colour; the core carries the white
    // spikes fan out in the plane of the screen (so they read from behind the hero too); any that would point at the hero is turned round
    const a0=atan2(sx*e[4]+sy*e[5]+sz*e[6],sx*e[0]+sy*e[1]+sz*e[2]),n=big?8:4,S=[1.5+C[0],1.5+C[1],1.5+C[2]];let hx=0,hy=0;
    if(o&&o.av){const ax=o.av.x-pos.x,ay=o.av.y+1.1-pos.y,az=o.av.z-pos.z,l=hypot(hx=ax*e[0]+ay*e[1]+az*e[2],hy=ax*e[4]+ay*e[5]+az*e[6]);if(l>.3){hx/=l;hy/=l;}else hx=hy=0;}
    for(let i=0;i<n;i++){const a=i<n*.7?a0+rand(-.6,.6)+(i%3===2?PI:0):rand(TAU);let c=cos(a),s=sin(a);if(c*hx+s*hy>.3){c=-c;s=-s;}
      this.wedge(pos,e[0]*c+e[4]*s,e[1]*c+e[5]*s,e[2]*c+e[6]*s,(i<2?rand(1.3,1.6):rand(.5,1))*(big?1:.6)*q,rand(.05,.09)*(big?1:.8),S,rand(.075,.11));}
    this.sparks(pos,sx*.8+dx*.5,sy*.8+.2,sz*.8+dz*.5,(big?26:19)*q,HOT,big?11:8,.5);
    if(big&&lvl>1&&o&&o.metal!==undefined)this.debris(pos.x,pos.y,pos.z,5,.6,o.gy||0,o.metal,dx*5+sx*3,dz*5+sz*3);
    this.core(pos,[C[0]+.9,C[1]+.9,C[2]+.9],(big?.85:.5)*q);
    if(big&&lvl>1)this.halo(pos,[C[0]*.95+.14,C[1]*.95+.14,C[2]*.95+.14],.6,4.6,.18,sx,sy,sz,1,.012);
    this.flash(pos,hex,big?90:45,.12);
  },
  // old sprite calls, kept as thin adapters so every caller gets the new shapes: a streak becomes a short lens, a glow a small core
  flares:{spawn(pos,hex,boost,life,w0,h0,w1,h1,rot=0){const e=camera.matrixWorld.elements,c=cos(rot),s=sin(rot),L=min(w1*.42,2.6);fx.lens(pos,e[0]*c+e[4]*s,e[1]*c+e[5]*s,e[2]*c+e[6]*s,L*.3,L,.09,.03,fx.rgb(hex,boost*.6),min(life,.22));}},
  glows:{spawn(pos,hex,boost,life,w0,h0,w1,h1){const s=w1>10?5:min(w1,2);fx.core(pos,fx.rgb(hex,boost*.5),s,min(life,.07));}},
  // rim feedback for one character. flash: its hit-flash value (only the rising edge is used, so the flash runs on real time: full
  // for two frames, gone 60 ms later, even through hit-stop). The flash takes the colour of the weapon that struck (o._hc) and
  // the share of the blow this body took (o._hk: 1 for the target, about a third for others caught in the swing), so the one that
  // was hit stands out and a wide swing does not turn the room into outlined figures. wind: wind-up 0..1 in the warning colour of
  // its tier. stag: staggered, a cool white flicker at 12 Hz. heat: a steady glow in hex (dying, enraged, shielded).
  rim(o,mats,flash,wind=0,tier=0,stag=false,heat=0,hex=0xff6a2a){
    let s=o._rim;if(!s){s=o._rim={pf:0,t0:-9,hk:1,hr:1,hg:1,hb:1,u:[],g:mats.glow&&mats.glow.isMeshBasicMaterial?mats.glow:null,g0:null};for(const k in mats){const u=rimPatch(mats[k]);if(u)s.u.push(u);}if(s.g)s.g0=s.g.color.clone();}
    if(flash>s.pf+.01){s.t0=G.rt;s.hk=o._hk??1;if(o._hc!==undefined){_fc.setHex(o._hc);s.hr=.5+_fc.r*.7;s.hg=.5+_fc.g*.7;s.hb=.5+_fc.b*.7;}else s.hr=s.hg=s.hb=1;o._hk=1;o._hc=undefined;}
    s.pf=flash;const a=G.rt-s.t0,hit=(a<.034?1:max(0,1-(a-.034)/.06))*s.hk;
    // never more than about 1.2 of added light, and next to nothing on surfaces that face the camera: the paint stays visible
    let r=hit*s.hr,g=hit*s.hg,b=hit*s.hb;const q=1-hit;
    if(wind>0){const c=WARN[tier],p=wind*(.75+.25*sin(G.rt*40))*(tier?.9:1.5)*q;r+=c[0]*p;g+=c[1]*p;b+=c[2]*p;}
    if(stag){const f=(sin(G.rt*TAU*12)>0?1:.2)*q;r+=.7*f;g+=.9*f;b+=1.2*f;}
    if(heat>0){_fc.setHex(hex);r+=_fc.r*heat*q;g+=_fc.g*heat*q;b+=_fc.b*heat*q;}
    for(const u of s.u){u.uRimC.value.setRGB(r,g,b);u.uRimF.value.set(hit>0?(o.B?6:4.5):5,hit*.05);}   // bulky bodies get a narrower rim, or every plate edge lights up
    if(s.g)s.g.color.copy(s.g0).multiplyScalar(.8+wind*.9+min(heat,4)*.3);   // eyes, vents and blade edge: the parts that already glow carry the wind-up and the heat
  },
  update(gdt,rdt){this.hitN=0;this.parts.update(gdt,rdt);this.dust.floor=this.parts.floor;this.dust.update(gdt,rdt);this.rings.update(gdt);
    for(const o of this.lights){if(o.L.intensity<=0)continue;o.t+=rdt;o.L.intensity=max(0,o.i0*(1-o.t/o.life));}}
};
fx.init();
