// ===================== FX =====================
// Shape language: hard and directional, with mass; energy goes into shape and contrast, not into exposure. Every additive particle
// (thick slash marks, tapered spikes, chunky sparks stretched along their velocity, rings, small cores, lightning) is one instanced
// quad in one draw call; a second, alpha-blended system draws dust and smoke. Nothing here is a big soft sprite.
const _f0=V(),_f1=V(),_f2=V(),_fl=V(),_fc=new THREE.Color();
const FXS={value:600},FXK={value:130},FXH={value:V()};   // pixels per metre at one metre from the camera; the largest a core may be on screen, in pixels (both set on resize); the hero's middle
const WCOL=[0x4fe3ff,0x9fd0ff,0xcfefff];   // what each weapon set paints its hits and trails with. Cool belongs to the hero: Fangs cyan, sword ice blue, Maul a pale cyan-white (amber is only in what flies off the enemy)
// One 256 px noise sheet, tiling, for every effect shader: nothing here is a clean drawn primitive. R: fbm (erodes edges, breaks
// rings into arcs), G: noise drawn out 8:1 along u (streaks: sample it with u along the length), B: cells (0 at a cell's middle,
// 1 on its walls: breaks smoke into lumps).
const fxNoise=(()=>{
  const lat=(sx,sy=sx)=>{const a=Array.from({length:sx*sy},random),at=(i,j)=>a[(j%sy)*sx+i%sx];return (u,v)=>{const x=u*sx,y=v*sy,xi=floor(x),yi=floor(y),kx=smooth(x-xi),ky=smooth(y-yi);return lerp(lerp(at(xi,yi),at(xi+1,yi),kx),lerp(at(xi,yi+1),at(xi+1,yi+1),kx),ky);};};
  const t=canvasTex(256,256,(g,w)=>{const f=[lat(4),lat(9),lat(19),lat(41)],s=[lat(3,24),lat(7,56),lat(13,104)],N=9,cp=Array.from({length:N*N},()=>[random(),random()]),im=g.createImageData(w,w);
    for(let y=0;y<w;y++)for(let x=0;x<w;x++){const u=x/w,v=y/w,i=(y*w+x)*4,cx=floor(u*N),cy=floor(v*N);let d=9;
      for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++){const p=cp[((cy+b+N)%N)*N+(cx+a+N)%N],ex=(cx+a+p[0])/N-u,ey=(cy+b+p[1])/N-v;d=min(d,ex*ex+ey*ey);}
      im.data[i]=clamp((f[0](u,v)*.5+f[1](u,v)*.27+f[2](u,v)*.15+f[3](u,v)*.08-.5)*1.9+.5,0,1)*255;
      im.data[i+1]=clamp((s[0](u,v)*.5+s[1](u,v)*.3+s[2](u,v)*.2-.5)*1.9+.5,0,1)*255;
      im.data[i+2]=min(1,sqrt(d)*N*1.15)*255;im.data[i+3]=255;}
    g.putImageData(im,0,0);});
  t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;})();
// iP centre, iA world-space extent (tail to head), iC colour, iM (width, shape, life left 0..1, extra). The quad faces the camera and
// lies along the extent as seen on screen. No hairlines: every shape has a least width in pixels (spikes 3.5, the slash mark 22 and
// at least 230 long, of which the visible blade is about two thirds); cores and spikes have a greatest size on screen; anything nearer the camera than about a metre and a half
// fades out, so no sprite can fill the frame.
// The slash mark is placed by the shader, so it is right for whichever camera draws it: if more than 40% of its length would lie
// behind (or over) the hero's rectangle on screen, it slides along its own line, the way the blade is going if that is not much
// further, until 60% of it is clear (or sideways, clear of the hero altogether, when that is the shorter way). A light hit seen from the chase camera is no longer hidden by the hero's own back, and a
// heavy mark never sits on the hero's head.
const QUAD_VS=`attribute vec3 iP,iA,iC;attribute vec4 iM;uniform float uS,uK;uniform vec3 uH;varying vec3 vC;varying vec2 vU;varying vec4 vK;varying float vS;
void main(){vec4 mv=viewMatrix*vec4(iP,1.);vec3 a=(viewMatrix*vec4(iA,0.)).xyz;
  float sh=iM.y,px=max(.1,-mv.z)/uS,cap=uK*px,wd=step(3.5,sh)*step(sh,4.5),sl=step(4.5,sh)*step(sh,5.5),sq=sl*(1.-1.6*(sh-5.));   // (shape 5.3: a lesser mark, with half the least size)
  float w=iM.x>0.?max(iM.x,(2.+1.5*wd+20.*sq)*px):0.,l2=dot(a.xy,a.xy),sd=fract(float(gl_InstanceID)*.61803);
  vec2 d=l2>1e-9?a.xy*inversesqrt(max(l2,1e-9)):vec2(1.,0.);
  if(sl>.5){float fs=sqrt(max(l2,0.))*inversesqrt(max(dot(a,a),1e-9));   // a thrust into the screen has no line to lie along: it is laid across the view instead
    if(fs<.6){vec2 dg=vec2(sd<.5?.9:-.9,.45),e2=d*fs+dg*(.6-fs);float el=dot(e2,e2);d=el>1e-6?e2*inversesqrt(max(el,1e-6)):dg;}}
  float len=max(max(sqrt(max(l2,0.)),w),230.*px*sq);
  if(sh<.5){w=min(w,cap);len=min(len,cap);}else if(wd+sl>.5)len=min(len,cap*(1.7+1.3*sl));
  if(sl>.5){vec4 hv=viewMatrix*vec4(uH,1.);float hz=max(.3,-hv.z),mz=max(.3,-mv.z),hl=.5*len/mz;vec2 c=mv.xy/mz-hv.xy/hz,hb=vec2(.5,1.08)/hz;
    vec2 dd=vec2(abs(d.x)>1e-4?d.x:1e-4,abs(d.y)>1e-4?d.y:1e-4),t0=(-hb-c)/dd,t1=(hb-c)/dd,nn=vec2(-d.y,d.x);
    float s0=max(min(t0.x,t1.x),min(t0.y,t1.y)),s1=min(max(t0.x,t1.x),max(t0.y,t1.y));
    if(hv.z<-.3&&s1>s0&&min(s1,hl)-max(s0,-hl)>.8*hl){float f=s1+.2*hl,b=s0-.2*hl,al=f<=-b*1.4?f:b,cn=dot(c,nn),pp=(abs(nn.x)*hb.x+abs(nn.y)*hb.y-abs(cn)+.6*w/mz)*(cn<0.?-1.:1.);
      mv.xy+=(abs(pp)<abs(al)*.8?nn*pp:d*al)*mz;}}   // beside the hero if that is the shorter way (a downward cut seen from behind)
  mv.xy+=d*(position.x+.5*wd)*len+vec2(-d.y,d.x)*position.y*w;
  gl_Position=projectionMatrix*mv;vU=position.xy*2.;vC=iC;vK=vec4(iM.yzw,smoothstep(.9,1.7,-mv.z));vS=sd;}`;
// shape 0 small soft core, 1 spark (round hot head, tail tapering away), 2 lens (pointed at both ends, streaked along its length),
// 3 ring (two arcs: a hard edge with a soft falloff inside it), 4 wedge (base at iP; its tip frays into streaks), 5 slash mark
// (not a symmetric lens: widest three quarters of the way along, a point at the head, a long tail that breaks up into streaks; the
// white core (iM.w of the width: a quarter on a heavy hit, 0.4 on a light one) lies toward the head and to one side, and is held
// near 1.6 so the colour round it survives),
// 6 bar (lightning: a white core a quarter of the width in a blue halo)
const QUAD_FS=`uniform sampler2D uN;varying vec3 vC;varying vec2 vU;varying vec4 vK;varying float vS;
void main(){float x=vU.x,y=abs(vU.y),sh=vK.x,a=0.,co=0.,m=max(vC.r,max(vC.g,vC.b));
  if(sh<.5){float r=clamp(1.-length(vU),0.,1.);a=r*r*(.3+.7*r*r);}
  else if(sh<1.5){float t=clamp(x*.5+.5,0.,1.),w=max((.08+.92*t*t)*(1.-.85*smoothstep(.82,1.,t)),.001);a=smoothstep(w,w*.35,y)*smoothstep(0.,.2,t);co=smoothstep(w*.5,0.,y)*t;}
  else if(sh<2.5){float t=clamp(1.-abs(x),0.,1.),w=max(t*(1.6-.6*t),.001),n=texture2D(uN,vec2(x*.17+vS,vU.y*.3+vS*5.)).g;a=smoothstep(w,w*.55,y)*(.5+n);co=smoothstep(w*.45,w*.12,y);}
  else if(sh<3.5){float r=length(vU),th=.03+vK.z,f=clamp((r-(1.-th*6.))/(th*5.),0.,1.);a=(smoothstep(th,th*.3,abs(r-(1.-th)))+f*f*.2*step(r,1.-th))*smoothstep(.25,.85,abs(x)/max(r,.01));}
  else if(sh<4.5){float t=clamp(.5-x*.5,0.,1.),w=max(t,.001),n=texture2D(uN,vec2(x*.15+vS,vU.y*.34+vS*5.)).g;a=smoothstep(w,w*.5,y)*smoothstep(-1.,-.8,x)*smoothstep(0.,.3,n+t*1.3-.55);co=smoothstep(w*.4,w*.1,y)*a;}
  else if(sh<5.5){float t=clamp(x*.5+.5,0.,1.),w=max(pow(max(t,1e-4),.75)*(1.-smoothstep(.74,1.,t))*1.22,.001);
    float n=texture2D(uN,vec2(x*.2+vS,vU.y*.4+vS*7.)).g,n2=texture2D(uN,vec2(x*.8+vS*3.,vU.y*1.1+vS)).r,er=(1.-t)*.85;
    a=smoothstep(w,w*.66,y)*smoothstep(er-.1,er+.16,n*.78+n2*.3+.1);float cf=vK.z,dy=abs(vU.y-w*.28);co=smoothstep(w*cf,w*cf*.45,dy)*smoothstep(.3,.62,t)*a;
    gl_FragColor=vec4((vC*a*(.7+.5*smoothstep(w*.9,w*cf,dy)+.4*n)*(1.-.8*co)+vec3(1.6-1.6*(cf-.25))*co*min(1.,m*1.7))*vK.w,1.);return;}
  else{float h=clamp(1.-y,0.,1.),n=texture2D(uN,vec2(x*.3+vS,vS*3.)).g;a=h*h*h*(.16+.2*n);co=smoothstep(.25,.14,y);}
  gl_FragColor=vec4((vC*a+vec3(m)*co*vK.z)*vK.w,1.);}`;
// dust and smoke erode, they do not fade: the alpha is a threshold over noise (fbm cut into lumps by the cells) that rises through
// the puff's life, so it breaks from its thin edge inward into wisps. iM.y is its opacity, iM.w a noise offset; the quad is
// stretched along its velocity (see puff).
const DUST_FS=`uniform sampler2D uN;varying vec3 vC;varying vec2 vU;varying vec4 vK;
void main(){float k=clamp(vK.y,0.,1.),r=clamp(1.-length(vU),0.,1.);vec2 q=vU*vec2(.42,.3)+vK.z;
  float n=texture2D(uN,q).r*.72+texture2D(uN,q*2.1+.4).b*.36,t=mix(.2,.92,1.-k);
  gl_FragColor=vec4(vC*(.75+.5*n),smoothstep(t,t+.15,n*1.3*smoothstep(0.,.7,r))*min(1.,(1.-k)*12.)*vK.x*vK.w);}`;
class Quads{
  constructor(n,dust){
    this.n=n;this.i=0;this.top=0;this.floor=0;this.was=false;const F=k=>new Float32Array(n*k);
    this.p=F(3);this.a=F(3);this.c=F(3);this.m=F(4);this.v=F(3);this.d=F(3);this.c0=F(3);
    this.life=F(1);this.max=F(1);this.gr=F(1);this.dr=F(1);this.w0=F(1);this.w1=F(1);this.l0=F(1);this.l1=F(1);this.st=F(1);this.fl=new Uint8Array(n);
    const g=this.g=new THREE.InstancedBufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]),3));g.setIndex([0,1,2,0,2,3]);g.instanceCount=0;
    this.at=[['iP',this.p,3],['iA',this.a,3],['iC',this.c,3],['iM',this.m,4]].map(([k,arr,s])=>{const b=new THREE.InstancedBufferAttribute(arr,s);b.setUsage(THREE.DynamicDrawUsage);g.setAttribute(k,b);return b;});
    this.mat=new THREE.ShaderMaterial({uniforms:{uS:FXS,uK:FXK,uH:FXH,uN:{value:fxNoise}},vertexShader:QUAD_VS,fragmentShader:dust?DUST_FS:QUAD_FS,
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
// uE > 0 (every expanding shock: slams, bursts, strikes) erodes it: the edge swells and thins round the circumference, breaks into
// arcs where the noise falls under uE (which rises as it spreads, so it comes apart instead of fading), and streaks trail in
// behind it. Rings the player must read (an arrival closing, a damaging wave) stay whole.
const FLAT_VS=`varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const RING_FS=`uniform vec3 uC;uniform vec4 uP;uniform float uA,uE;uniform sampler2D uN;varying vec2 vU;
void main(){vec2 q=vU*2.-1.;float r=length(q),R=max(uP.x,.05),e=max(uP.y/R,fwidth(r)*1.3),fw=min(.5/R,.9),sg=1.,st=1.,an=atan(q.y,q.x+1e-6);
  if(uE>.01){vec2 c=q/max(r,.001);float n=texture2D(uN,c*.2+uP.w).r,n2=texture2D(uN,c*.57+uP.w*3.1).r;
    e=max(e*(.45+1.5*n2),fwidth(r)*1.3);sg=smoothstep(0.,.1,n*.8+n2*.2-uE);st=.35+1.5*texture2D(uN,vec2(r*.4+uP.w,an*.63662)).g;fw=min(.9/R,.9);}
  float edge=smoothstep(e,e*.3,abs(r-(1.-e))),fall=clamp((r-(1.-e-fw))/fw,0.,1.);fall=fall*fall*fall*step(r,1.-e)*.2*st;
  if(uP.z>.5){float f=abs(fract(an*.159155*uP.z+uP.w)-.5);sg=smoothstep(.38,.33,f);}
  gl_FragColor=vec4(uC*(edge+fall)*sg*uA,1.);}`;
// a shock leaving the point of impact: a ring in the world (not a billboard), so it is seen as an ellipse; three or four broken arcs
// covering about 60% of the way round, the edge 4 to 14 cm thick, streaks trailing in behind it. uP: (radius, seed, age 0..1, how many times thicker than that)
const SHOCK_FS=`uniform vec3 uC;uniform vec4 uP;uniform sampler2D uN;varying vec2 vU;
void main(){vec2 q=vU*2.-1.,c=q/max(length(q),.001);float r=length(q),R=max(uP.x,.05),k=clamp(uP.z,0.,1.),an=atan(q.y,q.x+1e-6);
  float n=texture2D(uN,c*.2+uP.y).r,n2=texture2D(uN,c*.57+uP.y*3.1).r,th=max(mix(.04,.14,smoothstep(.25,.75,n2))*uP.w/R,fwidth(r)*1.2);
  float arcs=smoothstep(0.,.09,n*.8+n2*.2-mix(.42,.78,k*k)),edge=smoothstep(th,th*.3,abs(r-(1.-th))),g=texture2D(uN,vec2(r*.4+uP.y,an*.63662)).g;
  float fw=min(.5/R,.6),fall=clamp((r-(1.-th-fw))/fw,0.,1.);fall=fall*fall*step(r,1.-th)*g*g*.35;
  gl_FragColor=vec4(uC*(edge+fall)*arcs*(1.-k*k),1.);}`;
const flatGeo=new THREE.PlaneGeometry(2,2).rotateX(-PI/2);
const addShader=(u,fs,vs=FLAT_VS)=>new THREE.ShaderMaterial({uniforms:u,vertexShader:vs,fragmentShader:fs,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,side:THREE.DoubleSide});
class Rings{
  constructor(n){this.it=[];this.i=0;
    for(let k=0;k<n;k++){const u={uC:{value:new THREE.Color()},uP:{value:new THREE.Vector4(1,.05,0,0)},uA:{value:1},uE:{value:0},uN:{value:fxNoise}},m=new THREE.Mesh(flatGeo,addShader(u,RING_FS));m.visible=false;scene.add(m);this.it.push({m,u,on:false,t:0,life:1,r0:0,r1:1,spin:0,er:0});}}
  // expanding rings ease out and come apart; contracting ones (r0 > r1) close at a steady rate so their timing can be read
  spawn(x,y,z,hex,boost,r0,r1,life,seg=0,spin=0,w=.05){const it=this.it[this.i++%this.it.length];Object.assign(it,{on:true,t:0,life,r0,r1,spin,er:r1>r0&&!seg?1:0});it.m.position.set(x,y,z);it.u.uC.value.setHex(hex).multiplyScalar(boost*.6);it.u.uP.value.set(r0,w,seg,rand(1));it.m.visible=false;return it;}   // shown from its first update
  update(dt){for(const it of this.it){if(!it.on)continue;it.t+=dt;const k=it.t/it.life;if(k>=1){it.on=it.m.visible=false;continue;}it.m.visible=true;
    const grow=it.r1>it.r0,r=max(.01,lerp(it.r0,it.r1,grow?1-pow(1-k,3):k));it.m.scale.setScalar(r);it.u.uP.value.x=r;it.u.uP.value.w+=it.spin*dt;it.u.uE.value=it.er?lerp(.3,.74,k*k):0;it.u.uA.value=grow?(it.er?1-k*k:(1-k)*(1-k)):min(1,.4+k);}}
}
// Blade ribbon. The blade is sampled several times a frame and a turn of more than a few degrees between two samples is filled in
// by turning the blade (not by cutting the corner), then a spline is drawn through the lot, so a fast spin draws a curve and never a
// polygon. As wide as the blade at its head and tapering to nothing. Three layers in one mesh, so it reads as a sheet of light and
// not as an outline: a body in the weapon colour (uB.x at the head, falling in a straight line to nothing at 70% of the length,
// torn into streaks along its length), a hot line over the last 18% of the width at the cutting edge, and a soft glow 1.3 times
// the blade's width under both. Seen edge-on it is still at least uB.y pixels wide at the head. Samples age out, so it is gone a
// moment after the swing ends.
const cmr=(a,b,c,d,t)=>.5*(2*b+(c-a)*t+(2*a-5*b+4*c-d)*t*t+(3*b-a-3*c+d)*t*t*t);
const TRAIL_VS=`attribute vec3 aW,aG;attribute vec2 aQ;uniform float uS;uniform vec4 uB;varying vec2 vQ;
void main(){vec4 mv=viewMatrix*vec4(position,1.);vec3 w=(viewMatrix*vec4(aW,0.)).xyz,g=(viewMatrix*vec4(aG,0.)).xyz;
  float gl=dot(g.xy,g.xy);vec2 n=gl>1e-10?vec2(-g.y,g.x)*inversesqrt(max(gl,1e-10)):vec2(0.);float ac=dot(w.xy,n);if(ac<0.){n=-n;ac=-ac;}
  w.xy+=n*max(0.,uB.y*(1.-aQ.x)*max(.1,-mv.z)/uS-ac);mv.xyz+=w*(1.15-1.3*aQ.y);vQ=aQ;gl_Position=projectionMatrix*mv;}`;   // (the quad is 1.3 blades wide: the blade's own sweep is the middle of it)
const TRAIL_FS=`uniform vec3 uC;uniform vec4 uB;uniform sampler2D uN;varying vec2 vQ;
void main(){float u=clamp(vQ.x,0.,1.),v=clamp(vQ.y,0.,1.),vv=clamp((v-.115)/.77,0.,1.),al=clamp(1.-u/.7,0.,1.),e2=(1.-u)*(1.-u),in_=step(.115,v)*smoothstep(.888,.872,v);
  float n=texture2D(uN,vec2(u*.5+uB.z,vv*1.5)).g,n2=texture2D(uN,vec2(u*1.7,vv*.6+.3)).r;   // streaks drawn out along the length; they open up toward the tail
  float body=in_*al*(.35+.65*vv)*smoothstep(-.05,.3,n+n2*.3-.2-.5*u)*(.62+.38*n)*uB.x,edge=in_*smoothstep(.82,.9,vv)*uB.w*(.4+.6*e2)*e2;
  gl_FragColor=vec4(uC*uC*(body*.62+smoothstep(0.,.3,v)*smoothstep(1.,.72,v)*.09*al)+(vec3(uB.z)+uC*.9)*edge,1.);}`;   // (uB.x is how solid the sheet looks once exposed: colour squared keeps it the weapon's hue, not white)
class Trail{
  // o: life (seconds of history), body (strength of the body at the head: 0.55 for the hero, 0.3 for a foe), px (least head width
  // on screen: 20 for the hero, 10 for a foe), white and edge (how white and how strong the cutting edge is: a foe's ribbon keeps
  // its own orange-red and sits well under the hero's)
  constructor(n,hex,o={}){const N=this.N=26,T=this.T=5,R=this.R=(N-1)*T+1;this.life=o.life||.13;this.sb=new Float32Array(N*3);this.st=new Float32Array(N*3);this.age=new Float32Array(N);this.cnt=0;this.acc=0;this.was=false;
    const F=k=>new Float32Array(R*2*k),idx=[];this.pos=F(3);this.aw=F(3);this.ag=F(3);this.aq=F(2);
    for(let i=0;i<R;i++){this.aq[i*4+3]=1;if(i<R-1){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
    const g=this.g=new THREE.BufferGeometry();this.at=[['position',this.pos,3],['aW',this.aw,3],['aG',this.ag,3],['aQ',this.aq,2]].map(([k,arr,s])=>{const b=new THREE.BufferAttribute(arr,s);b.setUsage(THREE.DynamicDrawUsage);g.setAttribute(k,b);return b;});g.setIndex(idx);
    this.mesh=new THREE.Mesh(g,addShader({uC:{value:new THREE.Color(hex)},uN:{value:fxNoise},uS:FXS,uB:{value:new THREE.Vector4(o.body||.55,o.px||20,o.white??.4,o.edge||1.25)}},TRAIL_FS,TRAIL_VS));
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
// the two warning colours (linear): red for ordinary attacks, a saturated yellow for heavy ones (not cream: cream was also the Maul
// and the A rank). Nothing else in the game uses them: warm means danger, cool is the hero's.
const WARN=[[1,.012,.04],[1,.66,.035]];
const HOT=[3.3,1.25,.28];   // struck metal: what flies off a foe is this orange whatever the weapon
const DUSTC=[.075,.09,.125];   // dust: a dark blue-grey at about a third opacity, so it reads as matter against lit floor and never as a pale disc
const _up=V(0,1,0);
const fx={
  parts:new Quads(2600),dust:new Quads(260,true),rings:new Rings(14),lights:[],li:0,hitN:0,
  shocks:Array.from({length:5},()=>{const u={uC:{value:new THREE.Color()},uP:{value:new THREE.Vector4()},uN:{value:fxNoise}},m=new THREE.Mesh(flatGeo,addShader(u,SHOCK_FS));m.visible=false;m.frustumCulled=false;m.renderOrder=3;scene.add(m);return {m,u,t:9,life:.14,r0:.4,r1:2.2};}),si:0,
  // n: the normal of its plane (it need not be a unit vector). Real time: 0.4 to r1 metres in 0.14 s, easing out.
  shock(pos,nx,ny,nz,col,r1=2.2,life=.14,r0=.4,th=1){const s=this.shocks[this.si=(this.si+1)%5];s.m.position.copy(pos);_f1.set(nx,ny,nz);if(_f1.lengthSq()<1e-6)_f1.set(0,1,0);s.m.quaternion.setFromUnitVectors(_up,_f1.normalize());
    s.u.uC.value.setRGB(col[0],col[1],col[2]);s.u.uP.value.set(r0,rand(1),0,th);s.t=0;s.life=life;s.r0=r0;s.r1=r1;s.m.scale.setScalar(r0);s.m.visible=true;},
  init(){for(let i=0;i<3;i++){const L=new THREE.PointLight(0xffffff,0,4.5,2);scene.add(L);this.lights.push({L,t:0,life:.1,i0:0,hold:0});}},
  rgb(hex,k){_fc.setHex(hex);return [_fc.r*k,_fc.g*k,_fc.b*k];},
  // pooled light: a small fraction of what it was, short range, never hugging the floor and pulled off the surface it was
  // spawned on (toward the camera). Sitting on the floor at full strength is what bleached every impact.
  flash(pos,hex,inten,life=.14,range=inten>150?9:4.5){const o=this.lights[this.li++%3],c=camera.position;_fl.set(c.x-pos.x,0,c.z-pos.z).setLength(1.2);
    o.L.color.setHex(hex);o.L.position.set(pos.x+_fl.x,max(pos.y,this.parts.floor+1.2),pos.z+_fl.z);o.L.distance=range;o.t=0;o.life=life;o.hold=0;o.i0=o.L.intensity=inten*.045;return o;},
  // ---- primitives (real time unless fl says otherwise) ----
  core(pos,col,size,life=.034){this.parts.put(pos.x,pos.y,pos.z,col[0],col[1],col[2],0,life,size,size*1.2,1|8);},
  lens(pos,dx,dy,dz,l0,l1,w0,w1,col,life,white=.8,fl=1|8,sh=2){const P=this.parts,i=P.put(pos.x,pos.y,pos.z,col[0],col[1],col[2],sh,life,w0,w1,fl),j=i*3;P.d[j]=dx;P.d[j+1]=dy;P.d[j+2]=dz;P.l0[i]=l0;P.l1[i]=l1;P.m[i*4+3]=white;return i;},
  wedge(pos,dx,dy,dz,len,w,col,life,white=.9,fl=1|8){return this.lens(pos,dx,dy,dz,len*.55,len,w,w*.4,col,life,white,fl,4);},
  // ring facing the camera, drawn as two arcs that open along (dx,dy,dz) (or across the screen). s0, s1: its diameter; th thickens the edge
  halo(pos,col,s0,s1,life,dx=0,dy=0,dz=0,fl=1,th=0){const P=this.parts,i=P.put(pos.x,pos.y,pos.z,col[0],col[1],col[2],3,life,s0,s1,fl),j=i*3;P.d[j]=dx;P.d[j+1]=dy;P.d[j+2]=dz;P.l0[i]=P.l1[i]=.001;P.m[i*4+3]=th;},
  // glint: four arms of unequal length in the screen plane, never a symmetric star. One arm dominates, twice the next, and lies
  // along dir (the weapon it flashes on) when one is given; full size for four frames at most, then it thins away.
  glint(pos,hex,k,len,life=.13,w=.07,dir=null){const c=this.rgb(hex,k),e=camera.matrixWorld.elements,a0=dir?atan2(dir.x*e[4]+dir.y*e[5]+dir.z*e[6],dir.x*e[0]+dir.y*e[1]+dir.z*e[2]):rand(.3,1.1)*(random()<.5?-1:1);life=min(life,.13);
    [[0,1,1],[PI+rand(-.12,.12),.5,.8],[PI/2+rand(-.25,.25),.3,.6],[-PI/2+rand(-.25,.25),.2,.55]].forEach(([da,l,ww])=>{const a=a0+da,cs=cos(a),sn=sin(a);this.wedge(pos,e[0]*cs+e[4]*sn,e[1]*cs+e[5]*sn,e[2]*cs+e[6]*sn,len*l,w*ww,c,life);});},
  // matter thrown off: 3 to 4.5 cm wide, stretched a little along its flight, falling, bouncing once, cooling from white through its colour to dark
  sparks(pos,dx,dy,dz,n,col,spd=9,spread=.9){const P=this.parts;n=Math.ceil(n*.75);
    for(let k=0;k<n;k++){const big=random()<.3,s=spd*rand(.35,1.25)*(big?.8:1),vx=(dx+rand(-spread,spread))*s,vy=(dy+rand(-spread,spread))*s+1.5,vz=(dz+rand(-spread,spread))*s,t0=rand(.012,.08);   // already a little way out, so they show in the frozen frames of a hit-stop
      const i=P.put(pos.x+vx*t0,pos.y+vy*t0,pos.z+vz*t0,col[0],col[1],col[2],1,rand(.34,.5)*(big?1.15:1),big?.046:.034,big?.022:.015,4|16),j=i*3;
      P.v[j]=vx;P.v[j+1]=vy;P.v[j+2]=vz;P.st[i]=.021;P.gr[i]=17;P.dr[i]=2.4;P.m[i*4+3]=.7;}},
  embers(x,y,z,n,col,r=.5){const P=this.parts;n=Math.ceil(n*.4);
    for(let k=0;k<n;k++){const a=rand(TAU),s=rand(.5,5),i=P.put(x+rand(-r,r),y+rand(-r,r)*1.6,z+rand(-r,r),col[0],col[1],col[2],1,rand(.5,1.3),rand(.022,.044),.01,4),j=i*3;
      P.v[j]=cos(a)*s;P.v[j+1]=rand(1,7);P.v[j+2]=sin(a)*s;P.st[i]=.03;P.gr[i]=-1.5;P.dr[i]=1.6;P.m[i*4+3]=.5;}},
  // one puff of dust or smoke: dark blue-grey unless col says otherwise, stretched 1.6x along the way it is thrown, eroding (see DUST_FS)
  mote(x,y,z,vx,vy,vz,c,op,life,w0,w1,drag,fl=64){const D=this.dust,i=D.put(x,y,z,c[0],c[1],c[2],op,life,w0,w1,fl),j=i*3,l=hypot(vx,vy,vz)||1;
    D.v[j]=vx;D.v[j+1]=vy;D.v[j+2]=vz;D.d[j]=vx/l;D.d[j+1]=vy/l;D.d[j+2]=vz/l;D.l0[i]=w0*1.6;D.l1[i]=w1*1.6;D.dr[i]=drag;D.m[i*4+3]=rand(1);return i;},
  // floor dust kicked outward, gone in well under a second
  puff(x,z,n,r=1,y=0,col=null){const c=col||DUSTC;n=Math.ceil(n*.4);
    for(let k=0;k<n;k++){const a=rand(TAU),s=rand(2,6)*r;this.mote(x+cos(a)*.25*r,y+rand(.1,.3),z+sin(a)*.25*r,cos(a)*s,rand(.2,1.1),sin(a)*s,c,.35,rand(.35,.7),rand(.25,.45)*r,rand(.7,1.2)*r,4.5);}},
  smoke(x,y,z,n,r=1){for(let k=0;k<n;k++){const a=rand(TAU),s=rand(.3,1.6)*r;this.mote(x+rand(-.25,.25)*r,y+rand(-.3,.3)*r,z+rand(-.25,.25)*r,cos(a)*s,rand(.6,2.2),sin(a)*s,[.03,.034,.045],.78,rand(.5,.8),rand(.45,.7)*r,rand(1.1,1.7)*r,2.5);}},
  // A hero attack connecting, in three layers. sw: the direction the blade is travelling in (or null); hex: the weapon colour;
  // o: {lvl 2 the target of the blow, 1 someone else caught by it, 0 deep in a crowd; metal, gy: the target's plate colour and floor;
  // av: a position the spikes must not point at (the hero)}.
  //  1 the mark   one thick ragged slash along the swing (see shape 5): a capped white core toward its head, the weapon's colour
  //               round it, full for three frames and thinning for three. The target of the blow gets the full mark, anyone else
  //               one at 40%. A light hit's is 2.1 m by 30 cm and never under about 150 by 14 pixels; the shader slides it clear of
  //               the hero, so it reads from the chase camera too.
  //  2 spikes     a few wide ones, most of them close to the line of the swing, two of them long
  //  3 matter     orange sparks with weight (and, on a heavy hit, shards of the target's plate) thrown along the blow
  // A heavy hit on its target also throws one shock ring: a real ring in the world, tilted between the blade's travel and the
  // line of the blow, so it is an ellipse from the chase camera and from the side, never a circle drawn round the hero.
  hit(pos,dx,dz,big,sw,hex=WCOL[0],o=null){
    const lvl=o?o.lvl:2;this.hitN++;if(lvl<1){this.sparks(pos,dx,.3,dz,7,HOT,8,.6);return;}
    const q=lvl>1?1:.4,C=this.rgb(hex,1).map(v=>pow(v,1.5)),e=camera.matrixWorld.elements;let sx,sy,sz;   // (the colour is deepened: after exposure and bloom the plain one reads as white)
    if(sw){sx=sw.x;sy=sw.y;sz=sw.z;}else{const a=rand(-1,1);sx=-dz*cos(a);sy=sin(a);sz=dx*cos(a);}
    const L=(big?3:2.1)*q,W=(big?.36:.3)*q;this.lens(pos,sx,sy,sz,L*.7,L,W,W*.15,[C[0]*.62+.015,C[1]*.62+.015,C[2]*.62+.015],.1,big?.25:.3,1|8,lvl>1?5:5.3);
    // spikes fan out in the plane of the screen (so they read from behind the hero too); any that would point at the hero is turned round
    const a0=atan2(sx*e[4]+sy*e[5]+sz*e[6],sx*e[0]+sy*e[1]+sz*e[2]),n=big?(lvl>1?7:3):3,S=[.1+C[0],.1+C[1],.1+C[2]];let hx=0,hy=0;
    if(o&&o.av){const ax=o.av.x-pos.x,ay=o.av.y+1.1-pos.y,az=o.av.z-pos.z,l=hypot(hx=ax*e[0]+ay*e[1]+az*e[2],hy=ax*e[4]+ay*e[5]+az*e[6]);if(l>.3){hx/=l;hy/=l;}else hx=hy=0;}
    for(let i=0;i<n;i++){const a=i<n*.7?a0+rand(-.6,.6)+(i%3===2?PI:0):rand(TAU);let c=cos(a),s=sin(a);if(c*hx+s*hy>.3){c=-c;s=-s;}
      this.wedge(pos,e[0]*c+e[4]*s,e[1]*c+e[5]*s,e[2]*c+e[6]*s,(i<2?rand(1.3,1.6):rand(.5,1))*(big?1:.6)*q,rand(.05,.09)*(big?1:.8),S,rand(.075,.11),.3);}
    this.sparks(pos,sx*.8+dx*.5,sy*.8+.2,sz*.8+dz*.5,(big?24:10)*q,HOT,big?11:8,.5);
    if(big&&lvl>1&&o&&o.metal!==undefined)this.debris(pos.x,pos.y,pos.z,5,.6,o.gy||0,o.metal,dx*5+sx*3,dz*5+sz*3);
    this.core(pos,[C[0]*.7+.55,C[1]*.7+.55,C[2]*.7+.55],(big?.6:.4)*q);
    if(big&&lvl>1){const t=rand(-.35,.35);this.shock(pos,sx+dx*.75-dz*t,sy+.15,sz+dz*.75+dx*t,[C[0]*.85+.1,C[1]*.85+.1,C[2]*.85+.1]);}
    this.flash(pos,hex,big?55:30,.12);
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
    const bk=o._brk!==undefined?max(0,1-(G.rt-o._brk)):0;if(bk>0){r+=3.2*bk*q;g+=1.05*bk*q;b+=.16*bk*q;}   // armour just broken: heat in the seams of what is left, cooling over a second
    for(const u of s.u){u.uRimC.value.setRGB(r,g,b);u.uRimF.value.set(hit>0?(o.B?6:4.5):bk>0?2.6:5,hit*.05+bk*.05);}   // bulky bodies get a narrower rim, or every plate edge lights up
    if(s.g)s.g.color.copy(s.g0).multiplyScalar(.8+wind*.9+min(heat,4)*.3+bk*2.2+(o._wp!==undefined&&G.rt-o._wp<.034?2.4:0));   // (and jump for two frames as a warning starts: the glint is on the weapon)   // eyes, vents and blade edge: the parts that already glow carry the wind-up and the heat
  },
  update(gdt,rdt){this.hitN=0;this.parts.update(gdt,rdt);this.dust.floor=this.parts.floor;this.dust.update(gdt,rdt);this.rings.update(gdt);
    const hp=G.player.pos;FXH.value.set(hp.x,hp.y+.98,hp.z);
    for(const s of this.shocks){if(!s.m.visible)continue;s.t+=rdt;const k=s.t/s.life;if(k>=1){s.m.visible=false;continue;}const r=lerp(s.r0,s.r1,1-pow(1-k,3));s.m.scale.setScalar(r);s.u.uP.value.x=r;s.u.uP.value.z=k;}
    for(const o of this.lights){if(o.L.intensity<=0)continue;o.t+=rdt;o.L.intensity=max(0,o.i0*min(1,(o.life-o.t)/(o.life-o.hold)));}}   // (hold: seconds at full before it falls)
};
fx.init();
