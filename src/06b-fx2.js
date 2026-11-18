// ===================== FX 2: warnings, lock-on, tracers, lightning, floor marks, afterimages, wreckage, set pieces, shockwaves, beams =====================
const addMat=(hex,k)=>new THREE.MeshBasicMaterial({color:hdr(hex,k),blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,fog:false,side:THREE.DoubleSide});
const addMesh=(geo,hex,k)=>{const m=new THREE.Mesh(geo,addMat(hex,k));m.visible=false;m.frustumCulled=false;scene.add(m);return m;};
const PREMUL={blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,depthWrite:false,transparent:true,side:THREE.DoubleSide};
// Danger marks on the floor. uP: (radius or half width, length or 0 for a disc, progress 0..1, time).
// Disc: a filled area in the tier colour (leave it), a bold rim, one ring that closes on the centre as the time runs out. Where
// discs overlap they are drawn as one shape: uO lists up to three others as (x, z, radius), and this one drops its rim and closing
// ring inside them (and its fill too, where the radius is given as positive), so two Brutes winding up side by side give one outline.
// Lane: bright edge lines, a fill that fades toward the far end, chevrons running the way the attack will travel.
const MARK_VS=`varying vec2 vU;varying vec2 vW;void main(){vU=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const MARK_FS=`uniform vec3 uC;uniform vec4 uP;uniform float uA;uniform vec3 uO[3];varying vec2 vU;varying vec2 vW;
void main(){float k=clamp(uP.z,0.,1.),a=0.;
  if(uP.y<.001){vec2 q=vU*2.-1.;float r=length(q),e=max(.05/max(uP.x,.2),fwidth(r)*2.4),ln=1.,fl=1.;
    for(int i=0;i<3;i++){float d=length(vW-uO[i].xy),R=abs(uO[i].z);if(R>.01){ln*=smoothstep(R-.12,R,d);if(uO[i].z>0.)fl*=step(R,d);}}
    a=(smoothstep(e,e*.3,abs(r-(1.-e)))*1.6+smoothstep(e*.8,e*.25,abs(r-(1.-k)*(1.-e)))*step(r,1.)*.9)*ln+step(r,1.)*(.12+.07*k*r*r)*fl;}
  else{float x=abs(vU.x*2.-1.),v=1.-vU.y,hw=max(uP.x,.2),e=max(.035/hw,fwidth(x)*1.3);
    float ch=abs(fract((v*uP.y+x*hw*.9)*.36-uP.w*2.2)-.5);
    a=smoothstep(e,e*.3,abs(x-(1.-e)))*(1.5-v)+(smoothstep(.1,.05,ch)*.5+.1)*step(x,1.-e*2.)*(1.-v)*(.45+.55*k);}
  gl_FragColor=vec4(uC*a*uA*(.82+.18*sin(uP.w*26.)*k),1.);}`;
// Warning flare: one design, two tiers. Four thick tapered arms and a white-hot core; a ring closes on the core across the wind-up
// (the strike lands when it gets there). The heavy tier is twice the size, yellow-white, with four extra diagonal arms. Drawn over
// everything with its own alpha so it keeps its colour on any background. It is placed on screen by the shader (so it is right for
// whichever camera draws it): always wholly inside the picture area between the letterbox bars, never on the style block, and when
// it comes within about 150 pixels of the hero it shrinks to 110 pixels and goes partly transparent, so a foe standing between the
// camera and the hero cannot cover the hero with its own warning. Off screen it becomes a small chevron 48 pixels in from the frame
// edge, pushed off the vitality bar, the weapon chips, the style block and the boss bar.
// uQ: (progress, size in metres, tier, pop), uV: (aspect, smallest size, letterbox bar height as a share of the frame, 1 style block + 2 boss bar), uH: the hero.
const WARN_VS=`uniform vec3 uP,uH;uniform vec4 uQ,uV;varying vec2 vU;varying vec4 vD;
void main(){mat4 pv=projectionMatrix*viewMatrix;vec4 c=pv*vec4(uP,1.),h=pv*vec4(uH,1.);float w=max(abs(c.w),.01),ax=1./(360.*uV.x),st=mod(uV.w,2.),bs=step(1.5,uV.w);
  vec2 n=c.w>0.?c.xy/w:c.xy*(8./max(length(c.xy),.001));
  float s=clamp(uQ.y*projectionMatrix[1][1]/w,uV.y,uV.y*2.2)*uQ.w;   // never tiny when far away, never huge when close
  float near=h.w>0.?smoothstep(190.,150.,length((n-h.xy/max(h.w,.01))*vec2(uV.x,1.))*360.):0.;s=mix(s,min(s,.153),near);
  float top=1.-2.*uV.z;vec2 lim=vec2(.97-s/uV.x,top-.03-s*.86),cl=clamp(n,-lim,lim),o=n-cl;float off=step(.45,length(o));
  if(off>.5){s=.065;lim=vec2(1.-48.*ax,top-.133);cl=clamp(n,-lim,lim);
    if(cl.x<-1.+410.*ax&&cl.y>.72)cl.y=.72;
    if(cl.x<-1.+245.*ax&&cl.y<-.5&&cl.y>-.92)cl.y=-.5;
    if(st>.5&&cl.x>1.-340.*ax&&cl.y>-.04&&cl.y<.68)cl.y=cl.y>.32?.68:-.04;
    if(bs>.5&&abs(cl.x)<.6&&cl.y<-.7)cl.y=-.7;}
  else{float m=s*.7,mx=m/uV.x;
    if(st>.5&&cl.x>1.-330.*ax-s/uV.x&&cl.y>-.02-s&&cl.y<.66+s)cl.x=1.-330.*ax-s/uV.x;
    if(cl.x<-1.+410.*ax+mx&&cl.y>.72-m)cl.y=.72-m;
    if(cl.x<-1.+245.*ax+mx&&cl.y<-.5+m)cl.y=-.5+m;
    if(bs>.5&&abs(cl.x)<.6+mx&&cl.y<-.7+m)cl.y=-.7+m;}
  vD=vec4(off>.5?o/max(length(o),.001):vec2(1.,0.),off,1.-.3*near);vU=position.xz;gl_Position=vec4(cl+position.xz*vec2(s/uV.x,s),0.,1.);}`;
const WARN_FS=`uniform vec3 uC;uniform vec4 uQ;varying vec2 vU;varying vec4 vD;
float arm(vec2 p,float L,float W){float t=clamp(1.-abs(p.x)/L,0.,1.),w=W*t*t+.004;return smoothstep(w,w*.55,abs(p.y))*step(abs(p.x),L);}
void main(){vec2 p=vU;float r=length(p),k=clamp(uQ.x,0.,1.),a=0.,wh=0.;
  if(vD.z>.5){vec2 q=vec2(dot(p,vD.xy),abs(dot(p,vec2(-vD.y,vD.x))));float f=.62-q.x-q.y*.9;a=smoothstep(0.,.07,f)*smoothstep(.62,.54,f)*step(q.y,.7);wh=smoothstep(.16,.25,f)*smoothstep(.46,.37,f)*step(q.y,.52)*.9;}
  else{a=max(arm(p,.82,.115),arm(p.yx,.6,.115));
    if(uQ.z>.5){vec2 q=vec2(p.x+p.y,p.x-p.y)*.7071;a=max(a,max(arm(q,.44,.08),arm(q.yx,.44,.08)));}
    float rr=mix(.95,.15,k),e=.024;a=max(a,smoothstep(e,e*.45,abs(r-rr)));
    wh=smoothstep(.11,.03,r)+smoothstep(.3,0.,r)*.25*a;
    wh=clamp(wh+a*smoothstep(.86,1.,k)*.8,0.,1.);}
  vec3 col=mix(uC*a,vec3(2.6,2.45,2.2),wh)+uC*exp(-r*r*7.)*.28*(1.-vD.z);
  gl_FragColor=vec4(col,clamp(max(a,wh),0.,1.)*.94)*vD.w;}`;
// Lock-on reticle, drawn in the scene (not in the page) so it sits on the target's chest for whichever camera renders the frame.
// Two pairs of arcs turning against each other, four ticks, a health bar beneath; it closes from 1.4x on acquiring a target.
// uQ: (acquire 0..1, health 0..1, hard lock, time), uV: (aspect, style block on)
const LOCK_VS=`uniform vec3 uP;uniform vec4 uQ,uV;varying vec2 vU;
void main(){vec4 c=projectionMatrix*viewMatrix*vec4(uP,1.);float w=max(c.w,.01),s=.125,ax=1./(360.*uV.x);vec2 n=clamp(c.xy/w,vec2(-.94,-.8),vec2(.94,.8));
  if(uV.y>.5&&n.x>1.-320.*ax-s/uV.x&&n.y>-.02-s&&n.y<.66+s)n.x=1.-320.*ax-s/uV.x;
  vU=position.xz;gl_Position=c.w>.1?vec4(n+position.xz*vec2(s/uV.x,-s),0.,1.):vec4(2.,2.,2.,1.);}`;
const LOCK_FS=`uniform vec4 uQ;varying vec2 vU;
void main(){vec2 p=vU;float r=length(p),an=atan(p.y,p.x+1e-6),k=clamp(uQ.x,0.,1.),R=.56*(1.4-.4*k),px=.0222;
  float o1=smoothstep(.2,.235,abs(fract((an+uQ.w*1.5)*.31831)-.5)),o2=smoothstep(.31,.345,abs(fract((an-uQ.w*2.2)*.31831+.25)-.5));
  float d1=abs(r-R),d2=abs(r-R*.72),t4=abs(fract(an*.63662+.5)-.5)*1.5708*r,tk=step(R*1.08,r)*step(r,R*1.34);
  float ln=max(max(smoothstep(px*1.5,px*.5,d1)*o1,smoothstep(px*1.5,px*.5,d2)*o2*.8),smoothstep(px*1.5,px*.5,t4)*tk);
  float sh=max(max(smoothstep(px*4.,px*1.5,d1)*o1,smoothstep(px*4.,px*1.5,d2)*o2),smoothstep(px*4.,px*1.5,t4)*tk)*.55;
  vec2 b=abs(vec2(p.x,p.y-.87))-vec2(.667,.056);float bd=max(b.x,b.y),bar=step(bd,0.),fr=step(bd,px*1.2)*(1.-bar),fill=bar*step(p.x,-.667+1.334*clamp(uQ.y,0.,1.));
  vec3 rc=mix(vec3(1.45,1.7,1.9),vec3(.5,1.9,2.5),uQ.z)*(1.+.8*(1.-k)),col=rc*ln+mix(vec3(.03,.02,.02),mix(vec3(1.5,.22,.05),vec3(2.2,.75,.25),clamp(p.x*.75+.5,0.,1.)),fill)*bar;
  gl_FragColor=vec4(col,max(max(ln,sh),max(bar*.9,fr*.8)));}`;
// the finishing cut: one line across about 70% of the screen, through the target along the last swing. A 6 pixel white core with a
// fringe in the weapon colour, tapered to points. uQ: (life left 0..1, aspect)
const CUT_VS=`uniform vec3 uP,uD;uniform vec4 uQ;varying vec2 vU;
void main(){mat4 pv=projectionMatrix*viewMatrix;vec4 c=pv*vec4(uP,1.),e=pv*vec4(uP+uD,1.);vec2 n=c.xy/max(c.w,.01),d=(e.xy/max(e.w,.01)-n)*vec2(uQ.y,1.);
  float l=dot(d,d);d=l>1e-8?d*inversesqrt(max(l,1e-8)):vec2(.96,.28);float g=.25+.75*(1.-pow(clamp(uQ.x,0.,1.),4.));   // it shoots out to full length in the first frame or two
  vec2 q=d*position.x*.7*uQ.y*g+vec2(-d.y,d.x)*position.z*.036;vU=position.xz;gl_Position=c.w>.1?vec4(n+q/vec2(uQ.y,1.),0.,1.):vec4(2.,2.,2.,1.);}`;
const CUT_FS=`uniform vec3 uC;uniform vec4 uQ;varying vec2 vU;
void main(){float k=clamp(uQ.x,0.,1.),t=clamp(1.-abs(vU.x),0.,1.),w=max(t*(1.8-.8*t)*(k>.45?1.:k/.45),.001),y=abs(vU.y);
  float co=smoothstep(w*.26,w*.14,y),fr=smoothstep(w,w*.3,y);gl_FragColor=vec4((uC*fr*1.5+vec3(3.)*co)*min(1.,k*4.),1.);}`;
// Dodge afterimage: the hero's shape frozen where it was, as a flat filled silhouette with a bright outline and nothing inside it.
// Two draws per bone (the bone's parts merged once into one geometry, whatever their materials): the fill, then a hull of back faces
// pushed out a few pixels for the outline. Both add colour x destination alpha and then write alpha 0, and they are the first
// transparent things drawn (the opaque world leaves alpha at 1), so every pixel of a ghost is painted exactly once: layers of the
// body cannot add up into interior lines, the outline cannot draw inside the shape, and overlapping ghosts do not stack.
const GHOST_VS=`varying vec3 vN;varying vec3 vP;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vP=mv.xyz;vN=normalMatrix*normal;gl_Position=projectionMatrix*mv;}`;
const HULL_VS=`uniform vec2 uW;void main(){vec4 c=projectionMatrix*modelViewMatrix*vec4(position,1.);vec3 n=normalMatrix*normal;float l=dot(n.xy,n.xy);
  c.xy+=(l>1e-8?n.xy*inversesqrt(max(l,1e-8)):vec2(0.))*uW*c.w;gl_Position=c;}`;
const GHOST_FS=`uniform vec3 uC;uniform float uA;void main(){gl_FragColor=vec4(uC*uA,0.);}`;
const ghostMat=(u,hull)=>new THREE.ShaderMaterial({uniforms:u,vertexShader:hull?HULL_VS:`void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:GHOST_FS,side:hull?THREE.BackSide:THREE.DoubleSide,
  blending:THREE.CustomBlending,blendSrc:THREE.DstAlphaFactor,blendDst:THREE.OneFactor,blendSrcAlpha:THREE.ZeroFactor,blendDstAlpha:THREE.ZeroFactor,depthWrite:false,transparent:true});
// wreckage shards: irregular plates a few centimetres thick. aE is 0 in the middle of a face and 1 on the cut edge (the wall round
// the plate), which glows and cools separately (aHeat per instance)
const shardGeo=(pts,h)=>{const pos=[],e=[],uv=[],n=pts.length,P=(x,y,z,k)=>{pos.push(x,y,z);e.push(k);uv.push(x*1.5+.5,z*1.5+.5);};
  for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n],t=h*.8;P(0,h,0,0);P(b[0],t,b[1],.5);P(a[0],t,a[1],.5);P(0,-h,0,0);P(a[0],-t,a[1],.5);P(b[0],-t,b[1],.5);
    P(a[0],t,a[1],1);P(b[0],t,b[1],1);P(b[0],-t,b[1],1);P(a[0],t,a[1],1);P(b[0],-t,b[1],1);P(a[0],-t,a[1],1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('aE',new THREE.Float32BufferAttribute(e,1));g.computeVertexNormals();return g;};
// floor crack left by a heavy impact: jagged dark lines that glow for a moment, drawn once on a canvas
const crackTex=canvasTex(256,256,(g,w)=>{g.translate(w/2,w/2);const sc=g.createRadialGradient(0,0,0,0,0,w*.3);sc.addColorStop(0,'rgba(255,255,255,.55)');sc.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=sc;g.fillRect(-w/2,-w/2,w,w);
  g.strokeStyle='#fff';g.lineCap='round';const br=(x,y,a,len,lw)=>{while(len>4&&lw>.4){const st=rand(8,20),nx=x+cos(a)*st,ny=y+sin(a)*st;g.lineWidth=lw;g.beginPath();g.moveTo(x,y);g.lineTo(nx,ny);g.stroke();x=nx;y=ny;a+=rand(-.5,.5);len-=st;lw*=.86;if(random()<.22)br(x,y,a+rand(.5,1.1)*(random()<.5?-1:1),len*.5,lw*.7);}};
  for(let i=0;i<9;i++)br(0,0,i/9*TAU+rand(-.25,.25),rand(60,118),rand(2.6,4.2));});
// a low wall of light that fades upward (shockwaves, the boss's phase change)
const WALL_FS=`uniform vec3 uC;uniform float uA;varying vec2 vU;void main(){float h=clamp(1.-vU.y,0.,1.);gl_FragColor=vec4(uC*(h*h*h*1.1+smoothstep(.12,0.,vU.y)*1.6)*uA,1.);}`;
const COOL=[.5,1.25,1.7],EMBER=[3,.9,.18];   // what a crack glows with: the hero's impacts, everyone else's
Object.assign(fx,{
  // ---- warnings ----
  warns:Array.from({length:8},()=>{const u={uP:{value:V()},uH:{value:V()},uC:{value:new THREE.Color()},uQ:{value:new THREE.Vector4()},uV:{value:new THREE.Vector4(1.78,.1,0,0)}};
    const m=new THREE.Mesh(flatGeo,new THREE.ShaderMaterial(Object.assign({uniforms:u,vertexShader:WARN_VS,fragmentShader:WARN_FS,depthTest:false},PREMUL)));
    m.visible=false;m.frustumCulled=false;m.renderOrder=9;scene.add(m);return {m,u,on:false};}),wi:0,
  // tg: whoever is winding up (the flare follows it and goes out if its state changes), tier 0 light or 1 heavy, dur: seconds of
  // game time until the strike, y: height above its feet, mark: [distance ahead, radius] of a floor mark for where a heavy blow lands
  warn(tg,tier,dur,y=1.7,mark=null){const w=this.warns[this.wi=(this.wi+1)%8];if(w.on&&w.mark)w.mark.m.visible=false;Object.assign(w,{on:true,tg,tier,dur,y,t:0,rt:0,st:tg.state,mark:null,mf:0});
    w.u.uC.value.setRGB(WARN[tier][0],WARN[tier][1],WARN[tier][2]).multiplyScalar(tier?1.05:.95);w.m.visible=true;G.warned();
    if(mark){w.mark=this.disc(tg.pos.x,tg.gy||0,tg.pos.z,mark[1],dur+.12);w.mf=mark[0];}this.warnSet(w);return w;},
  warnSet(w){const g=w.tg,p=G.player.pos;w.u.uP.value.set(g.pos.x,g.pos.y+w.y,g.pos.z);w.u.uH.value.set(p.x,p.y+1.2,p.z);w.u.uQ.value.set(w.t/w.dur,w.tier?1.7:1.05,w.tier,1+.3*max(0,1-w.rt/.067));
    w.u.uV.value.set(camera.aspect,w.tier?.13:.09,smooth(G.barK)*.11,(G.style.rank>=0?1:0)+(G.boss&&!G.boss.gone?2:0));
    if(w.mark)w.mark.m.position.set(g.pos.x+sin(g.yaw)*w.mf,(g.gy||0)+.05,g.pos.z+cos(g.yaw)*w.mf);},
  // ---- lock-on reticle ----
  lock:(()=>{const u={uP:{value:V()},uQ:{value:new THREE.Vector4(1,1,0,0)},uV:{value:new THREE.Vector4(1.78,0,0,0)}};
    const m=new THREE.Mesh(flatGeo,new THREE.ShaderMaterial(Object.assign({uniforms:u,vertexShader:LOCK_VS,fragmentShader:LOCK_FS,depthTest:false},PREMUL)));
    m.visible=false;m.frustumCulled=false;m.renderOrder=8;scene.add(m);return {m,u,tg:null,k:0};})(),
  // tg: the target (or null). It rides the chest bone, and lets go the frame the target dies.
  lockOn(tg,hard,rdt){const L=this.lock;if(!tg){L.tg=null;L.m.visible=false;return;}if(tg!==L.tg){L.tg=tg;L.k=0;}L.k=min(1,L.k+rdt/.16);
    if(tg.rig){const c=tg.rig.chest;c.updateWorldMatrix(true,false);const e=c.matrixWorld.elements;L.u.uP.value.set(e[12],e[13],e[14]);}else tg.hitPos(L.u.uP.value,0,0);
    L.u.uQ.value.set(1-(1-L.k)*(1-L.k),max(0,tg.hp/tg.maxHp),hard?1:0,G.rt);L.u.uV.value.set(camera.aspect,G.style.rank>=0?1:0,0,0);L.m.visible=true;},
  // ---- pistol: a fanned three-petal muzzle flash, a bolt with a white head and cyan tail, the line of the shot left hanging for a moment ----
  tracers:Array.from({length:6},()=>({a:V(),b:V(),t:0,dur:0,hit:false})),ti:0,
  tracer(a,b,hit){const t=this.tracers[this.ti=(this.ti+1)%6],d=_f1.copy(b).sub(a),l=d.length()||1;d.multiplyScalar(1/l);t.a.copy(a);t.b.copy(b);t.t=0;t.dur=max(.052,l/90);t.hit=hit;   // on screen for at least three frames
    const e=camera.matrixWorld.elements,W=[3.2,2.9,2.2];_f2.set(e[4],e[5],e[6]).cross(d);if(_f2.lengthSq()<.02)_f2.set(e[0],e[1],e[2]);_f2.normalize();   // sideways, as seen from the camera
    this.wedge(a,d.x,d.y,d.z,.55,.13,W,.06);for(const s of [-1,1])this.wedge(a,d.x*.62+_f2.x*s*.78,d.y*.62+_f2.y*s*.78+.12,d.z*.62+_f2.z*s*.78,.46,.1,W,.06);   // full for two frames
    _f0.copy(a).lerp(b,.5);this.lens(_f0,d.x,d.y,d.z,l,l,.08,.03,[.22,.95,1.35],.1,.3,1|8);   // the line of the shot, left hanging behind the bolt
    this.core(a,[1.5,1.35,1],.3,.05);this.flash(a,0xffe0a0,20,.06);},
  // a short ribbon behind something moving (orbs), redrawn every frame
  tail(pos,vel,col,len,w){const P=this.parts,l=vel.length()||1,i=P.put(pos.x-vel.x/l*len*.5,pos.y-vel.y/l*len*.5,pos.z-vel.z/l*len*.5,col[0],col[1],col[2],1,1,w,w,2|64),j=i*3;P.d[j]=vel.x/l;P.d[j+1]=vel.y/l;P.d[j+2]=vel.z/l;P.l0[i]=P.l1[i]=len;P.m[i*4+3]=.6;},
  // light pooled on the floor under something that glows (an orb): one soft additive disc, asked for again every frame
  pools:Array.from({length:8},()=>{const u={uC:{value:new THREE.Color()}},m=new THREE.Mesh(flatGeo,addShader(u,`uniform vec3 uC;varying vec2 vU;void main(){vec2 q=vU*2.-1.;float r=clamp(1.-length(q),0.,1.);gl_FragColor=vec4(uC*r*r,1.);}`));m.visible=false;m.frustumCulled=false;scene.add(m);return {m,u,on:false};}),pn:0,
  pool(x,y,z,r,col,k){if(this.pn>=8)return;const o=this.pools[this.pn++];o.m.position.set(x,y+.04,z);o.m.scale.set(r,1,r);o.u.uC.value.setRGB(col[0]*k,col[1]*k,col[2]*k);o.on=true;},
  // ---- lightning: a jagged ribbon from the sky (midpoint displacement, five levels, up to three branches), a white core in a blue
  // halo, full for three frames with a fainter afterimage for two; where it lands, a ring, a scorch, sparks and dust ----
  bolts:Array.from({length:4},()=>({s:new Float32Array(96*7),n:0,t:9})),bi:0,
  bolt(x,y,z,quiet,far=0){
    const b=this.bolts[this.bi=(this.bi+1)%4],S=b.s,ws=far?far:1;let n=0,br=0;
    const seg=(ax,ay,az,bx,by,bz,w)=>{if(n<96){const o=n++*7;S[o]=ax;S[o+1]=ay;S[o+2]=az;S[o+3]=bx;S[o+4]=by;S[o+5]=bz;S[o+6]=w;}};
    const gen=(ax,ay,az,bx,by,bz,lev,amp,w)=>{if(!lev)return seg(ax,ay,az,bx,by,bz,w);const mx=(ax+bx)/2+rand(-amp,amp),my=(ay+by)/2+rand(-amp,amp)*.35,mz=(az+bz)/2+rand(-amp,amp);
      gen(ax,ay,az,mx,my,mz,lev-1,amp*.58,w);gen(mx,my,mz,bx,by,bz,lev-1,amp*.58,w);
      if(lev>=2&&lev<5&&w>.5*ws&&br<3&&random()<.4){br++;const l=rand(3.5,8)*ws,a=rand(TAU);gen(mx,my,mz,mx+cos(a)*l*.8,my-l*rand(.4,.9),mz+sin(a)*l*.8,3,l*.22,w*.5);}};
    gen(x+rand(-8,8)*ws,y+(far?60*ws:42),z+rand(-8,8)*ws,x,y,z,5,4.6*ws,.55*ws);b.n=n;b.t=0;G.bolted(far);
    if(far)return;
    _f0.set(x,y+.5,z);this.glint(_f0,0xbfd8ff,5,3.2,.2,.16);this.core(_f0,[1.6,1.9,2.6],2.4,.05);
    this.flash(_f0,0x9cc0ff,260,.22,10);this.rings.spawn(x,y+.06,z,0xbfd8ff,5,.4,3.6,.32,0,0,.1);this.crack(x,y,z,1.7,1.8,[.7,1.1,2.2]);this.sparks(_f0,0,1,0,34,[2,2.6,3.6],12);this.puff(x,z,18,1.2,y);
    if(!quiet){sfx.thunder(1);cam.shake(.3);}
  },
  // ---- floor marks ----
  discs:Array.from({length:10},()=>{const u={uC:{value:new THREE.Color()},uP:{value:new THREE.Vector4()},uA:{value:1},uO:{value:[V(),V(),V()]}},m=new THREE.Mesh(flatGeo,addShader(u,MARK_FS,MARK_VS));m.visible=false;m.frustumCulled=false;scene.add(m);return {m,u,t:0,life:0};}),di:0,
  disc(x,y,z,r,life,tier=1){tier=tier===0?0:1;const d=this.discs[this.di=(this.di+1)%10];d.m.rotation.set(0,0,0);d.m.position.set(x,y+.05,z);d.m.scale.set(r,1,r);d.u.uC.value.setRGB(WARN[tier][0],WARN[tier][1],WARN[tier][2]).multiplyScalar(tier?1.25:1.1);d.u.uP.value.set(r,0,0,0);d.m.visible=true;d.t=0;d.life=life;return d;},
  line(x,y,z,yaw,len,w,life,tier=1){const d=this.disc(x,y+.01,z,1,life,tier);d.m.rotation.y=yaw;d.m.scale.set(w/2,1,len/2);d.u.uP.value.set(w/2,len,0,0);return d;},
  // ---- dodge afterimages ----
  ghosts:Array.from({length:3},()=>{const uf={uC:{value:new THREE.Color()},uA:{value:0}},uh={uC:uf.uC,uA:{value:0},uW:{value:new THREE.Vector2(.004,.007)}},g=new THREE.Group();
    g.visible=false;scene.add(g);return {g,uf,uh,mat:ghostMat(uf,false),hull:ghostMat(uh,true),pool:[],t:0,life:0};}),gi:0,
  // the hero's own pixels are marked in the frame (alpha 0), so an afterimage is never painted over the hero: dodging away from
  // the camera leaves the ghosts in front of the lens, and the hero must still read through them
  noGhost(mats){for(const k in mats){const m=mats[k],prev=m.onBeforeCompile,key=m.customProgramCacheKey();
    m.onBeforeCompile=(s,r)=>{if(prev)prev(s,r);s.fragmentShader=s.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.a=0.;');};m.customProgramCacheKey=()=>key+'|a0';m.needsUpdate=true;}},
  // everything that hangs directly on one bone, as one geometry (positions and normals only), built the first time it is needed
  ghostGeo(g){let key='';const ms=[];for(const c of g.children)if(c.isMesh&&c.visible&&!c.isInstancedMesh&&c.geometry.attributes.normal){ms.push(c);key+=c.id+',';}
    const u=g.userData;if(u.gk===key)return u.gg;if(u.gg)u.gg.dispose();u.gk=key;if(!ms.length)return u.gg=null;
    let n=0;const src=ms.map(c=>{const q=c.geometry.index?c.geometry.toNonIndexed():c.geometry;n+=q.attributes.position.count;return q;}),P=new Float32Array(n*3),N=new Float32Array(n*3),nm=new THREE.Matrix3();let o=0;
    ms.forEach((c,k)=>{c.updateMatrix();nm.getNormalMatrix(c.matrix);const p=src[k].attributes.position,q=src[k].attributes.normal;
      for(let i=0;i<p.count;i++,o+=3){_f1.fromBufferAttribute(p,i).applyMatrix4(c.matrix);P[o]=_f1.x;P[o+1]=_f1.y;P[o+2]=_f1.z;_f1.fromBufferAttribute(q,i).applyMatrix3(nm).normalize();N[o]=_f1.x;N[o+1]=_f1.y;N[o+2]=_f1.z;}
      if(src[k]!==c.geometry)src[k].dispose();});
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(N,3));return u.gg=geo;},
  ghost(root,hex,life=.18){const o=this.ghosts[this.gi=(this.gi+1)%3],cv=renderer.domElement;
    let n=0;const walk=s=>{if(!s.visible||s.isMesh)return;const geo=this.ghostGeo(s);
      if(geo)for(let k=0;k<2;k++){let m=o.pool[n];if(!m){m=o.pool[n]=new THREE.Mesh(geo,k?o.hull:o.mat);m.matrixAutoUpdate=false;m.frustumCulled=false;m.renderOrder=k?-1:-2;o.g.add(m);}m.geometry=geo;m.matrix.copy(s.matrixWorld);m.matrixWorldNeedsUpdate=true;m.visible=true;n++;}
      for(const c of s.children)walk(c);};
    walk(root);for(let k=n;k<o.pool.length;k++)o.pool[k].visible=false;o.uf.uC.value.setHex(hex);o.uh.uW.value.set(5/cv.width,5/cv.height);o.t=0;o.life=life;o.uf.uA.value=o.uh.uA.value=0;o.g.visible=n>0;},
  // ---- floor crack / scorch: glows in col for a moment, then stays as a dark mark for a while ----
  cracks:Array.from({length:6},()=>{const u={uM:{value:crackTex},uH:{value:0},uA:{value:0},uC:{value:V(3,.9,.18)}};
    const m=new THREE.Mesh(flatGeo,new THREE.ShaderMaterial(Object.assign({uniforms:u,vertexShader:FLAT_VS,fragmentShader:`uniform sampler2D uM;uniform float uH,uA;uniform vec3 uC;varying vec2 vU;void main(){float a=texture2D(uM,vU).a;gl_FragColor=vec4(uC*uH*a*a,a*uA*.85);}`,
      polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2},PREMUL)));
    m.visible=false;scene.add(m);return {m,u,t:0,life:0};}),ci:0,
  crack(x,y,z,r,life=1.6,col=EMBER){const c=this.cracks[this.ci=(this.ci+1)%6];c.m.position.set(x,y+.02,z);c.m.rotation.y=rand(TAU);c.m.scale.set(r,1,r);c.m.visible=true;c.t=0;c.life=life;c.u.uC.value.set(col[0],col[1],col[2]);},
  // A ground impact in one call: a shock ring, a wall of dust thrown outward at about 6 m/s, chips of floor plate, sparks and a
  // kick of the lens; heavy ones add a crack. hero: the hero's own impacts are always cyan-white with pale blue dust (orange and
  // red on the floor belong to the enemy), whatever hex says.
  slam(x,y,z,r,hex,heavy,hero=false){if(hero)hex=0x7fdcff;this.rings.spawn(x,y+.06,z,hex,hero?2.6:5,.3,r,.32,0,0,heavy?.09:.06);
    const D=this.dust,dc=hero?[.2,.27,.36]:[.2,.19,.185],n=heavy?16:12;
    for(let k=0;k<n;k++){const a=(k+rand(-.3,.3))/n*TAU,s=rand(5,7.5),i=D.put(x+cos(a)*r*.12,y+rand(.15,.4),z+sin(a)*r*.12,dc[0],dc[1],dc[2],.46,rand(.45,.75),rand(.4,.6),rand(1.1,1.7),1|64),j=i*3;D.v[j]=cos(a)*s;D.v[j+1]=rand(.5,1.6);D.v[j+2]=sin(a)*s;D.dr[i]=3.4;D.m[i*4+3]=rand(1);}
    _f0.set(x,y+.25,z);this.sparks(_f0,0,1.1,0,heavy?30:20,this.rgb(hex,3.2),10,.8);this.debris(x,y+.15,z,8,.55,y,0x3d434c,0,0,4.5);cam.fovKick=max(cam.fovKick,3.5);
    if(heavy)this.crack(x,y,z,max(1.25,r*.5),1.8,hero?COOL:EMBER);},
  // an enemy arriving: its own language and colour (violet), a thin column of light and a segmented ring that closes as it lands
  spawnIn(x,y,z,sc=1,dur=1){this.rings.spawn(x,y+.05,z,0x8a4dff,5,2.3*sc,.55*sc,dur,9,1.3,.06);_f0.set(x,y+3,z);this.lens(_f0,0,1,0,7.5,1.5,.16*sc,.02,[1.5,.55,3.4],dur*.85,.9,8);},
  // A foe destroyed. A white-hot core at the chest for three frames with ten thick spikes; the body itself comes apart at the
  // joints (src: {rig, o: the foe, v: its velocity}) and the pieces tumble away with their cut ends glowing; sparks, shards of its
  // plate, a dark puff of smoke that erodes over about 0.6 s, and a scorch on the floor under it.
  burst(x,y,z,sc,col,hex,gy,n,metal,src=null){_f0.set(x,y,z);this.smoke(x,y,z,Math.ceil(7*sc),sc);this.core(_f0,[col[0]*.5+2,col[1]*.5+2,col[2]*.5+1.8],1.05*sc,.05);
    for(let i=0;i<10;i++){const a=rand(TAU),u=rand(-.35,1);_f1.set(cos(a),u,sin(a)).normalize();this.wedge(_f0,_f1.x,_f1.y,_f1.z,rand(.7,1.6)*sc,rand(.09,.14)*sc,[col[0]*.7+1.7,col[1]*.7+1.7,col[2]*.7+1.7],rand(.09,.14));}
    if(src)this.shatter(src.rig,src.o,src.v,gy,sc);
    this.sparks(_f0,0,.5,0,34*sc,col,11,1);this.embers(x,y,z,22*sc,col,.4*sc);this.debris(x,y,z,src?Math.ceil(n*.6):n,sc,gy,metal);this.flash(_f0,hex,90,.2);this.rings.spawn(x,gy+.06,z,hex,4,.3,2.6*sc,.3,0,0,.07);
    if(y-gy<3.5*sc)this.crack(x,gy,z,1.15*sc,2.4,[col[0]*.6,col[1]*.6,col[2]*.6]);},
  // ---- a body coming apart ----
  // The rig's own meshes are regrouped under six pivots (head, arms with whatever they hold, legs, torso) and thrown: no new
  // geometry and no more draw calls than the living foe had. o._rim (its rim uniforms) carries the heat that cools over 0.8 s.
  chunks:[],shats:[],
  shatter(rig,o,vel,gy,sc=1){const R=rig.root;R.updateMatrixWorld(true);
    const cut=[rig.head,rig.arm[0],rig.arm[1],rig.leg[0],rig.leg[1]],parts=cut.map(()=>[]),torso=[];parts.push(torso);
    const walk=(s,cur)=>{if(!s.visible)return;const i=cut.indexOf(s);if(i>=0)cur=parts[i];if(s.isMesh&&!s.isInstancedMesh)cur.push(s);for(const c of s.children)walk(c,cur);};walk(R,torso);
    const ce=rig.chest.matrixWorld.elements,cx=ce[12],cy=ce[13],cz=ce[14];
    for(const ms of parts){if(!ms.length)continue;let px=0,py=0,pz=0;
      for(const s of ms){const bs=s.geometry.boundingSphere||(s.geometry.computeBoundingSphere(),s.geometry.boundingSphere);_f1.copy(bs.center).applyMatrix4(s.matrixWorld);px+=_f1.x;py+=_f1.y;pz+=_f1.z;}
      px/=ms.length;py/=ms.length;pz/=ms.length;const g=new THREE.Group();g.position.set(px,py,pz);
      for(const s of ms){const m=new THREE.Mesh(s.geometry,s.material);m.matrixAutoUpdate=false;m.matrix.copy(s.matrixWorld);const e=m.matrix.elements;e[12]-=px;e[13]-=py;e[14]-=pz;m.castShadow=s.castShadow;g.add(m);}
      _f1.set(px-cx,py-cy+.15*sc,pz-cz);if(_f1.lengthSq()<1e-4)_f1.set(rand(-1,1),.5,rand(-1,1));_f1.normalize().multiplyScalar(rand(3,6.5));
      scene.add(g);this.chunks.push({g,v:V(vel.x*.55+_f1.x,max(vel.y*.4,0)+_f1.y+rand(2.5,5.5),vel.z*.55+_f1.z),w:V(rand(-11,11),rand(-11,11),rand(-11,11)),t:0,life:rand(1.5,2.1),gy,r:.2*sc});}
    if(o&&o._rim)this.shats.push({s:o._rim,t:0});},
  // armour let go (the Gatewarden's phase change): each group of plates becomes a piece and leaves at 5 to 8 m/s
  shed(groups,cx,cy,cz,gy,sc=1){for(const h of groups){if(!h.visible||!h.children.length)continue;h.updateWorldMatrix(true,true);const e=h.matrixWorld.elements,px=e[12],py=e[13],pz=e[14],g=new THREE.Group();g.position.set(px,py,pz);
      for(const s of h.children){if(!s.isMesh)continue;const m=new THREE.Mesh(s.geometry,s.material);m.matrixAutoUpdate=false;m.matrix.copy(s.matrixWorld);const q=m.matrix.elements;q[12]-=px;q[13]-=py;q[14]-=pz;m.castShadow=true;g.add(m);}
      _f1.set(px-cx,0,pz-cz);if(_f1.lengthSq()<.01)_f1.set(rand(-1,1),0,rand(-1,1));_f1.normalize().multiplyScalar(rand(5,8));
      scene.add(g);this.chunks.push({g,v:V(_f1.x,rand(3,7),_f1.z),w:V(rand(-9,9),rand(-9,9),rand(-9,9)),t:0,life:rand(1.8,2.6),gy,r:.25*sc});}},
  updChunks(dt){const C=this.chunks,P=this.parts;
    for(let i=C.length-1;i>=0;i--){const c=C[i],g=c.g,p=g.position;c.t+=dt;if(c.t>=c.life){scene.remove(g);C.splice(i,1);continue;}
      c.v.y-=24*dt;p.addScaledVector(c.v,dt);
      if(p.y<c.gy+c.r){p.y=c.gy+c.r;if(c.v.y<-2.2){c.v.y*=-.36;c.v.x*=.62;c.v.z*=.62;c.w.multiplyScalar(.55);}else{c.v.set(0,0,0);c.w.multiplyScalar(max(0,1-9*dt));}}
      g.rotation.x+=c.w.x*dt;g.rotation.y+=c.w.y*dt;g.rotation.z+=c.w.z*dt;g.scale.setScalar(clamp((c.life-c.t)/.3,.001,1));
      if(c.t<.8){const h=1-c.t/.8;P.put(p.x,p.y,p.z,3.2*h*h,1.1*h*h,.22*h*h,0,1,.5*h+.12,.5,2|64);}}   // the cut end, glowing and cooling
    const S=this.shats;for(let i=S.length-1;i>=0;i--){const o=S[i],s=o.s;o.t+=dt;const h=max(0,1-o.t/.8);for(const u of s.u){u.uRimC.value.setRGB(2*h*h,.56*h*h,.09*h*h);u.uRimF.value.set(3,.05*h);}
      if(s.g)s.g.color.copy(s.g0).multiplyScalar(h);if(h<=0)S.splice(i,1);}},
  // armour breaking on a Brute or a boss: plates leave, a yellow-white ring, sparks
  armorBreak(e){const sc=e.scale||1,x=e.pos.x,y=e.cy(),z=e.pos.z,metal=e.mats&&e.mats.armor?e.mats.armor.color.getHex():0x7e838e;_f0.set(x,y,z);
    this.debris(x,y,z,11,sc*.8,e.gy||0,metal,0,0,6.5);this.rings.spawn(x,(e.gy||0)+.06,z,0xffe9a0,5,.3,2*sc,.3,0,0,.09);
    this.sparks(_f0,0,.4,0,27,[3.2,2.4,1],10,1);this.core(_f0,[2.4,2.2,1.6],.9*sc,.05);
    for(let i=0;i<6;i++){const a=rand(TAU);_f1.set(cos(a),rand(-.2,.8),sin(a)).normalize();this.wedge(_f0,_f1.x,_f1.y,_f1.z,rand(.6,1.2)*sc,.09*sc,[2.6,2.3,1.5],rand(.08,.12));}},
  // ---- set pieces ----
  // the finishing cut (see CUT_VS), then finish() two or three frames later, when the dark frames end
  cutM:(()=>{const u={uP:{value:V()},uD:{value:V(1,0,0)},uC:{value:new THREE.Color()},uQ:{value:new THREE.Vector4(0,1.78,0,0)}};
    const m=new THREE.Mesh(flatGeo,new THREE.ShaderMaterial({uniforms:u,vertexShader:CUT_VS,fragmentShader:CUT_FS,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,transparent:true,side:THREE.DoubleSide}));
    m.visible=false;m.frustumCulled=false;m.renderOrder=10;scene.add(m);return {m,u,t:9};})(),
  cut(pos,dir,hex){const c=this.cutM;c.u.uP.value.copy(pos);c.u.uD.value.copy(dir);c.u.uC.value.setHex(hex).multiplyScalar(2);c.t=0;c.m.visible=true;},
  finish(pos,gy,hex,metal){const C=this.rgb(hex,1),W=[C[0]*1.4+.8,C[1]*1.4+.8,C[2]*1.4+.8];
    this.rings.spawn(pos.x,gy+.07,pos.z,hex,6,.4,6,.3,0,0,.25);this.halo(pos,[C[0]*1.5+.4,C[1]*1.5+.4,C[2]*1.5+.4],.8,7,.3,0,0,0,1,.014);this.core(pos,[2.6,2.5,2.3],1.3,.05);
    this.sparks(pos,0,.5,0,40,HOT,13,1);this.debris(pos.x,pos.y,pos.z,10,.8,gy,metal,0,0,6);this.puff(pos.x,pos.z,24,1.5,gy);this.flash(pos,hex,140,.2,8);
    for(let i=0;i<8;i++){const a=rand(TAU);_f1.set(cos(a),rand(-.3,.9),sin(a)).normalize();this.wedge(pos,_f1.x,_f1.y,_f1.z,rand(1,2),.12,W,rand(.09,.14));}},
  // a boss changing phase: a ground ring with a 0.3 m hot edge and a low wall of light out to 14 m, dust, rising embers, large shards
  pw:(()=>{const u={uC:{value:new THREE.Color()},uA:{value:0}},m=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,64,1,true),addShader(u,WALL_FS));m.visible=false;m.frustumCulled=false;scene.add(m);return {m,u,t:9,r:14,y:0};})(),
  // (py: the height of its body, when it is not standing on the floor)
  phase(x,gy,z,hex,metal,sc=1,r=14,py=gy+1.4*sc){this.rings.spawn(x,gy+.08,z,hex,6,.5,r,.6,0,0,.3);const w=this.pw;w.t=0;w.r=r;w.y=gy;w.m.position.set(x,gy+.6,z);w.u.uC.value.setHex(hex).multiplyScalar(1.1);w.m.visible=true;
    this.puff(x,z,60,3.2,gy);this.embers(x,py+.2*sc,z,100,this.rgb(hex,3.2),1.1*sc);this.debris(x,py,z,12,1.25,gy,metal,0,0,7);
    _f0.set(x,py,z);this.sparks(_f0,0,.6,0,40,this.rgb(hex,3.2),13,1);this.flash(_f0,hex,200,.3,10);cam.fovKick=-5;cam.ab=.042;G.phaseT=.6;},
  // a thin line from a shooter to the hero, redrawn every frame: 3 cm when the charge starts, 8 cm at release (k 0..1), with a red
  // marker where it ends
  aim(a,b,k){const P=this.parts,dx=b.x-a.x,dy=b.y+1.1-a.y,dz=b.z-a.z,l=hypot(dx,dy,dz)||1,s=.5+1.5*k*k,R=WARN[0],i=P.put(a.x+dx*.5,a.y+dy*.5,a.z+dz*.5,R[0]*s,R[1]*s,R[2]*s,2,1,.03+.05*k,.03,2|64),j=i*3;
    P.d[j]=dx/l;P.d[j+1]=dy/l;P.d[j+2]=dz/l;P.l0[i]=P.l1[i]=l;P.m[i*4+3]=k*.6;
    _f0.set(b.x,b.y+1.1,b.z);const q=P.put(_f0.x,_f0.y,_f0.z,R[0]*2.4,R[1]*2.4,R[2]*2.4,3,1,.3+.12*(1-k),.3,2|64),e=camera.matrixWorld.elements,c=cos(G.rt*5),sn=sin(G.rt*5);
    P.d[q*3]=e[0]*c+e[4]*sn;P.d[q*3+1]=e[1]*c+e[5]*sn;P.d[q*3+2]=e[2]*c+e[6]*sn;P.l0[q]=P.l1[q]=.001;P.m[q*4+3]=.05;},
  update2(gdt,rdt){
    this.updateDeb(gdt);this.updChunks(gdt);const P=this.parts;
    for(const t of this.tracers){if(t.dur<=0)continue;t.t+=rdt;const k=min(1,t.t/t.dur),d=_f1.copy(t.b).sub(t.a),l=d.length()||1,L=min(2.5,l);d.multiplyScalar(1/l);
      const hp=max(l*k,L*.4),i=P.put(t.a.x+d.x*(hp-L*.5),t.a.y+d.y*(hp-L*.5),t.a.z+d.z*(hp-L*.5),.45,2.5,3.4,1,1,.16,.16,2|64),j=i*3;P.d[j]=d.x;P.d[j+1]=d.y;P.d[j+2]=d.z;P.l0[i]=P.l1[i]=L;P.m[i*4+3]=1.2;
      if(k>=1){t.dur=0;if(t.hit){const e=camera.matrixWorld.elements,a0=rand(TAU);this.sparks(t.b,-d.x*.4,.4,-d.z*.4,8,HOT,5,.7);this.halo(t.b,[.8,2,2.6],.15,1.1,.14,0,0,0,1,.04);this.core(t.b,[1.6,1.7,1.5],.55,.05);
        for(let n=0;n<3;n++){const a=a0+n*2.1,c=cos(a),s=sin(a);this.wedge(t.b,e[0]*c+e[4]*s,e[1]*c+e[5]*s,e[2]*c+e[6]*s,rand(.4,.7),.07,[1.3,2,2.4],.09);}}}}   // where it lands: a ring, three short spikes, sparks
    for(const b of this.bolts){if(b.t>.09)continue;b.t+=rdt;const k=b.t<.052?1:b.t<.09?.3:0,S=b.s;if(k<=0)continue;
      for(let n=0;n<b.n;n++){const o=n*7,dx=S[o+3]-S[o],dy=S[o+4]-S[o+1],dz=S[o+5]-S[o+2],l=hypot(dx,dy,dz)||1,w=S[o+6],i=P.put((S[o]+S[o+3])/2,(S[o+1]+S[o+4])/2,(S[o+2]+S[o+5])/2,.6*k,.95*k,2.2*k,6,1,w,w,2|64),j=i*3;
        P.d[j]=dx/l;P.d[j+1]=dy/l;P.d[j+2]=dz/l;P.l0[i]=P.l1[i]=l+w*.4;P.m[i*4+3]=1.3;}}
    // floor marks: where two discs overlap they are drawn as one shape (see MARK_FS)
    const D=this.discs;
    for(const d of D){if(!d.m.visible)continue;d.t+=gdt;if(d.t>=d.life){d.m.visible=false;continue;}d.u.uP.value.z=d.t/d.life;d.u.uP.value.w=G.rt;d.u.uA.value=min(1,d.t*12);}
    for(let i=0;i<10;i++){const d=D[i];if(!d.m.visible||d.u.uP.value.y>0)continue;const O=d.u.uO.value,p=d.m.position,r=d.m.scale.x;let n=0;
      for(let j=0;j<10&&n<3;j++){const q=D[j];if(j===i||!q.m.visible||q.u.uP.value.y>0)continue;const s=q.m.scale.x;if(hypot(q.m.position.x-p.x,q.m.position.z-p.z)<r+s&&abs(q.m.position.y-p.y)<1)O[n++].set(q.m.position.x,q.m.position.z,j<i?s:-s);}
      for(;n<3;n++)O[n].set(0,0,0);}
    for(const w of this.warns){if(!w.on)continue;const g=w.tg;w.t+=gdt;w.rt+=rdt;
      if(w.t>=w.dur||g.dead||g.gone||g.state!==w.st){w.on=false;w.m.visible=false;if(w.mark&&w.t<w.dur)w.mark.m.visible=false;continue;}this.warnSet(w);}
    for(const o of this.ghosts){if(!o.g.visible)continue;o.t+=rdt;if(o.t>=o.life){o.g.visible=false;continue;}const k=(1-o.t/o.life)*min(1,o.t/.035);o.uf.uA.value=.25*k;o.uh.uA.value=.9*k;}   // (it comes up over two frames, by which time the hero is clear of it)
    for(const c of this.cracks){if(!c.m.visible)continue;c.t+=gdt;if(c.t>=c.life){c.m.visible=false;continue;}const k=c.t/c.life;c.u.uH.value=max(0,1-c.t/.35);c.u.uA.value=min(1,(1-k)*2.5);}
    for(let i=0;i<8;i++){const o=this.pools[i];o.m.visible=o.on;o.on=false;}this.pn=0;
    const c=this.cutM;if(c.m.visible){c.t+=rdt;if(c.t>=.12)c.m.visible=false;else c.u.uQ.value.set(1-c.t/.12,camera.aspect,0,0);}
    const w=this.pw;if(w.m.visible){w.t+=gdt;const k=w.t/.6;if(k>=1)w.m.visible=false;else{const r=max(.3,w.r*(1-pow(1-k,3)));w.m.scale.set(r,1.2,r);w.u.uA.value=(1-k)*(1-k)*.9;}}
  },
  clearMarks(){for(const d of this.discs)d.m.visible=false;for(const w of this.warns){w.on=false;w.m.visible=false;}},
  // wreckage: instanced shards in the foe's own metal, a few centimetres thick, with gravity, one bounce and a spin of 6 to 14
  // rad/s; their cut edges glow and cool in about 0.6 s
  deb:(()=>{const n=70,mat=pbr('armor',{color:0xffffff,side:THREE.DoubleSide}),prev=mat.onBeforeCompile;
    mat.onBeforeCompile=s=>{prev(s);s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float aE;attribute float aHeat;varying vec2 vHt;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHt=vec2(aE,aHeat);');
      s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vHt;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(3.4,.85,.16)*vHt.y*(.025+smoothstep(.55,1.,vHt.x));');};
    mat.customProgramCacheKey=()=>'pbr|shard3';
    const o=new THREE.Object3D(),ms=[[[-.5,-.12],[.5,-.3],[.16,.42]],[[-.5,-.2],[-.1,-.5],[.5,-.16],[.34,.4],[-.3,.36]]].map(pts=>{const g=shardGeo(pts,.5),h=new THREE.InstancedBufferAttribute(new Float32Array(n),1);h.setUsage(THREE.DynamicDrawUsage);g.setAttribute('aHeat',h);
      const m=new THREE.InstancedMesh(g,mat,n);m.castShadow=true;m.frustumCulled=false;o.position.set(0,-999,0);o.updateMatrix();for(let i=0;i<n;i++){m.setMatrixAt(i,o.matrix);m.setColorAt(i,_fc.setHex(0x5a606c));}scene.add(m);return m;});
    return {ms,it:Array.from({length:n*2},()=>({p:V(0,-999,0),v:V(),r:new THREE.Euler(),w:V(),s:V(1,1,1),life:0,age:0,gy:0})),o,i:0,dirty:false};})(),
  // bx, bz: a push every shard shares (thrown along a blow); out: thrown outward at about this speed (plates leaving a body).
  // Shards are a shade darker than the plate they came from: broken metal, not paper.
  debris(x,y,z,n,sc=1,gy=0,hex=0x5a606c,bx=0,bz=0,out=0){const D=this.deb,sg=()=>rand(6,14)*(random()<.5?-1:1);_fc.setHex(hex).multiplyScalar(.6);for(let k=0;k<n;k++){const i=D.i=(D.i+1)%D.it.length,d=D.it[i],a=rand(TAU),sp=out?out*rand(.75,1.25):rand(2,8),m=D.ms[i&1];
    d.p.set(x+rand(-.3,.3)*sc,y+rand(-.5,.5)*sc,z+rand(-.3,.3)*sc);d.v.set(cos(a)*sp+bx,rand(3,9),sin(a)*sp+bz);if(out){d.p.x+=cos(a)*sc*.6;d.p.z+=sin(a)*sc*.6;d.p.addScaledVector(d.v,rand(.04,.1));}d.w.set(sg(),sg(),sg());d.r.set(rand(TAU),rand(TAU),rand(TAU));   // (plates leaving a body start clear of it: they must show in the frozen frames of the hit-stop)
    d.s.set(rand(.16,.42)*sc,rand(.035,.065)*sc,rand(.14,.34)*sc);d.life=rand(2.2,3.6);d.age=0;d.gy=gy;m.setColorAt(i>>1,_fc);m.instanceColor.needsUpdate=true;}},
  updateDeb(dt){const D=this.deb,o=D.o;let any=false;for(let i=0;i<D.it.length;i++){const d=D.it[i];if(d.life<=0)continue;any=true;d.life-=dt;d.age+=dt;d.v.y-=22*dt;d.p.addScaledVector(d.v,dt);const m=D.ms[i&1];
      if(d.p.y<d.gy+d.s.y*.5){d.p.y=d.gy+d.s.y*.5;if(abs(d.v.y)>1.5){d.v.y*=-.35;d.v.x*=.6;d.v.z*=.6;d.w.multiplyScalar(.5);}else{d.v.set(0,0,0);d.w.set(0,0,0);d.r.x=d.r.z=0;}}
      d.r.x+=d.w.x*dt;d.r.y+=d.w.y*dt;d.r.z+=d.w.z*dt;o.position.copy(d.p);o.rotation.copy(d.r);const k=clamp(d.life*2.5,.05,1);o.scale.set(d.s.x*k,d.s.y*k,d.s.z*k);if(d.life<=0)o.position.y=-999;o.updateMatrix();m.setMatrixAt(i>>1,o.matrix);
      m.geometry.attributes.aHeat.array[i>>1]=max(0,1-d.age/.6);}
    if(any||D.dirty){for(const m of D.ms){m.instanceMatrix.needsUpdate=true;m.geometry.attributes.aHeat.needsUpdate=true;}D.dirty=any;}}
});
// The Lantern's tether to the ally it shields. It belongs to the Lantern, so it wears the Lantern's gold with a thin dark-red fringe
// (never the hero's cyan-white), is about 4 cm wide and well below the brightness of a warning, and pulses run along it from the
// Lantern to whatever it protects, where a small ring of two turning arcs marks the receiving end.
function makeBeam(hex){
  const u={uT:{value:0},uL:{value:1}},m=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,6,1,true).rotateX(PI/2),new THREE.ShaderMaterial({uniforms:u,vertexShader:`varying vec3 vN;varying vec3 vP;varying float vL;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vP=mv.xyz;vN=normalMatrix*normal;vL=position.z+.5;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform float uT,uL;varying vec3 vN;varying vec3 vP;varying float vL;
      void main(){vec3 n=vN*inversesqrt(max(dot(vN,vN),1e-10)),v=vP*inversesqrt(max(dot(vP,vP),1e-10));float f=1.-clamp(abs(dot(n,v)),0.,1.),p=fract(vL*uL*.55-uT*2.6),pu=smoothstep(0.,.12,p)*smoothstep(.5,.12,p);
        gl_FragColor=vec4(mix(vec3(1.,.66,.2)*(.42+.75*pu),vec3(.5,.03,.02),smoothstep(.35,.9,f)),1.);}`,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));
  m.visible=false;m.frustumCulled=false;scene.add(m);
  return {m,set(a,b,w=.02){m.position.copy(a).lerp(b,.5);const l=max(.1,a.distanceTo(b));m.scale.set(w,w,l);m.lookAt(b);m.visible=true;u.uT.value=G.rt;u.uL.value=l;
    const e=camera.matrixWorld.elements,c=cos(G.rt*2.4),s=sin(G.rt*2.4);fx.halo(b,[1.5,.95,.25],1.15,1.15,1,e[0]*c+e[4]*s,e[1]*c+e[5]*s,e[2]*c+e[6]*s,2|64,.012);},hide(){m.visible=false;},dispose(){scene.remove(m);}};
}
// shockwaves that can hurt the player: expanding rings and travelling lines. A white-hot leading edge on the floor and a low wall of
// light that fades upward, in the heavy warning colour.
const waves={
  rings:Array.from({length:6},()=>{const ur={uC:{value:new THREE.Color()},uP:{value:new THREE.Vector4(1,.09,0,0)},uA:{value:1}},uw={uC:{value:new THREE.Color()},uA:{value:1}};
    const ring=new THREE.Mesh(flatGeo,addShader(ur,RING_FS)),wall=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,56,1,true),addShader(uw,WALL_FS));for(const m of [ring,wall]){m.visible=false;m.frustumCulled=false;scene.add(m);}
    return {ring,wall,ur,uw,on:false,pos:V()};}),
  lines:Array.from({length:5},()=>{const uw={uC:{value:new THREE.Color()},uA:{value:1}},m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),addShader(uw,WALL_FS)),g=addMesh(new THREE.PlaneGeometry(1,1),0xffd060,1.6);m.visible=false;m.frustumCulled=false;scene.add(m);return {m,g,uw,on:false,pos:V()};}),ri:0,li:0,
  ring(x,y,z,speed,maxR,dmg,owner,hex=0,r0=.5){
    const o=this.rings[this.ri=(this.ri+1)%6];Object.assign(o,{on:true,r:r0,speed,maxR,dmg,owner,hit:false,dodged:false,y});o.pos.set(x,y,z);
    o.ur.uC.value.setRGB(WARN[1][0],WARN[1][1],WARN[1][2]).multiplyScalar(2.6);o.uw.uC.value.setRGB(1,.42,.1).multiplyScalar(.9);o.ring.visible=o.wall.visible=true;
    o.ring.position.set(x,y+.07,z);o.wall.position.set(x,y+.45,z);
  },
  line(x0,x1,y,z,dir,speed,dist,dmg,owner){
    const o=this.lines[this.li=(this.li+1)%5];Object.assign(o,{on:true,x0,x1,y,z,dir,speed,left:dist,dmg,owner,hit:false,dodged:false});
    o.uw.uC.value.setRGB(1,.5,.14).multiplyScalar(1.3);o.m.scale.set(x1-x0,1.1,1);o.g.scale.set(x1-x0,.16,1);o.g.rotation.x=-PI/2;o.m.visible=o.g.visible=true;
  },
  update(dt){
    const p=G.player,live=G.state==='play';
    for(const o of this.rings){if(!o.on)continue;o.r+=o.speed*dt;const k=o.r/o.maxR;
      if(k>=1){o.on=false;o.ring.visible=o.wall.visible=false;continue;}
      o.ring.scale.set(o.r,1,o.r);o.ur.uP.value.x=o.r;o.wall.scale.set(o.r,.9,o.r);o.ur.uA.value=1-k*k;o.uw.uA.value=(1-k)*.8;
      if(live&&!o.hit){const d=hypot(p.pos.x-o.pos.x,p.pos.z-o.pos.z);if(abs(d-o.r)<.75&&p.pos.y-o.y<.9&&p.takeHit(o.dmg,o))o.hit=true;}}
    for(const o of this.lines){if(!o.on)continue;const st=o.speed*dt;o.z+=o.dir*st;o.left-=st;
      if(o.left<=0){o.on=false;o.m.visible=o.g.visible=false;continue;}
      const cx=(o.x0+o.x1)/2;o.pos.set(cx,o.y,o.z-o.dir*2);o.m.position.set(cx,o.y+.55,o.z);o.g.position.set(cx,o.y+.06,o.z);o.uw.uA.value=.85+.15*sin(G.rt*50);
      if(live&&!o.hit&&abs(p.pos.z-o.z)<.7&&p.pos.x>=o.x0&&p.pos.x<=o.x1&&p.pos.y-o.y<1&&p.takeHit(o.dmg,o))o.hit=true;}
  },
  clear(){for(const o of this.rings){o.on=false;o.ring.visible=o.wall.visible=false;}for(const o of this.lines){o.on=false;o.m.visible=o.g.visible=false;}}
};
