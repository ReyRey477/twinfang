// ===================== FX 2: warnings, tracers, lightning, floor marks, afterimages, wreckage, shockwaves, beams =====================
const addMat=(hex,k)=>new THREE.MeshBasicMaterial({color:hdr(hex,k),blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,fog:false,side:THREE.DoubleSide});
const addMesh=(geo,hex,k)=>{const m=new THREE.Mesh(geo,addMat(hex,k));m.visible=false;m.frustumCulled=false;scene.add(m);return m;};
// Danger marks on the floor. uP: (radius or half width, length or 0 for a disc, progress 0..1, time).
// Disc: a bright rim (this far and no further), a ring that closes on the centre as the time runs out, a faint fill.
// Lane: bright edge lines, a fill that fades toward the far end, chevrons running the way the attack will travel.
const MARK_FS=`uniform vec3 uC;uniform vec4 uP;uniform float uA;varying vec2 vU;
void main(){float k=clamp(uP.z,0.,1.),a=0.;
  if(uP.y<.001){vec2 q=vU*2.-1.;float r=length(q),e=max(.04/max(uP.x,.2),fwidth(r)*1.3);
    a=smoothstep(e,e*.3,abs(r-(1.-e)))*1.5+smoothstep(e,e*.3,abs(r-(1.-k)*(1.-e)))*step(r,1.)+step(r,1.)*(.03+.13*k*r*r);}
  else{float x=abs(vU.x*2.-1.),v=1.-vU.y,hw=max(uP.x,.2),e=max(.035/hw,fwidth(x)*1.3);
    float ch=abs(fract((v*uP.y+x*hw*.9)*.36-uP.w*2.2)-.5);
    a=smoothstep(e,e*.3,abs(x-(1.-e)))*(1.5-v)+(smoothstep(.1,.05,ch)*.5+.1)*step(x,1.-e*2.)*(1.-v)*(.45+.55*k);}
  gl_FragColor=vec4(uC*a*uA*(.82+.18*sin(uP.w*26.)*k),1.);}`;
// Warning flare: one design, two tiers. Four thick tapered arms and a white-hot core; a ring closes on the core across the wind-up
// (the strike lands when it gets there). The heavy tier is twice the size, yellow-white, with four extra diagonal arms. Drawn over
// everything with its own alpha so it keeps its colour on any background, kept inside the frame, and replaced by a chevron on the
// frame edge when its source is off screen. uQ: (progress, size in metres, tier, pop), uV: (aspect, smallest size on screen).
const WARN_VS=`uniform vec3 uP;uniform vec4 uQ,uV;varying vec2 vU;varying vec3 vD;
void main(){vec4 c=projectionMatrix*viewMatrix*vec4(uP,1.);float w=max(abs(c.w),.01);
  vec2 n=c.w>0.?c.xy/w:c.xy*(8./max(length(c.xy),.001)),lim=vec2(.9,.76),cl=clamp(n,-lim,lim),o=n-cl;float off=step(.5,length(o));   // a little outside the frame: the flare itself, held at the edge; far outside or behind: an arrow
  float s=off>.5?uV.y*1.1:clamp(uQ.y*projectionMatrix[1][1]/w,uV.y,uV.y*2.2)*uQ.w;   // never tiny when far away, never huge when close
  vD=vec3(off>.5?o/max(length(o),.001):vec2(1.,0.),off);vU=position.xy;gl_Position=vec4(cl+position.xy*vec2(s/uV.x,s),0.,1.);}`;
const WARN_FS=`uniform vec3 uC;uniform vec4 uQ;varying vec2 vU;varying vec3 vD;
float arm(vec2 p,float L,float W){float t=clamp(1.-abs(p.x)/L,0.,1.),w=W*t*t+.004;return smoothstep(w,w*.55,abs(p.y))*step(abs(p.x),L);}
void main(){vec2 p=vU;float r=length(p),k=clamp(uQ.x,0.,1.),a=0.,wh=0.;
  if(vD.z>.5){vec2 q=vec2(dot(p,vD.xy),abs(dot(p,vec2(-vD.y,vD.x))));float f=.55-q.x-q.y*.9;a=smoothstep(0.,.06,f)*smoothstep(.46,.4,f)*step(q.y,.66);wh=smoothstep(.2,.3,f)*a*.0;}
  else{a=max(arm(p,.82,.115),arm(p.yx,.6,.115));
    if(uQ.z>.5){vec2 q=vec2(p.x+p.y,p.x-p.y)*.7071;a=max(a,max(arm(q,.44,.08),arm(q.yx,.44,.08)));}
    float rr=mix(.95,.15,k),e=.024;a=max(a,smoothstep(e,e*.45,abs(r-rr)));
    wh=smoothstep(.11,.03,r)+smoothstep(.3,0.,r)*.25*a;}
  wh=clamp(wh+a*smoothstep(.86,1.,k)*.8,0.,1.);
  vec3 col=mix(uC*a,vec3(2.6,2.45,2.2),wh)+uC*exp(-r*r*7.)*.28*(1.-vD.z);
  gl_FragColor=vec4(col,clamp(max(a,wh),0.,1.)*.94);}`;
// dodge afterimage: the hero's own meshes, frozen where they were, drawn as a rim only
const GHOST_VS=`varying vec3 vN;varying vec3 vP;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vP=mv.xyz;vN=normalMatrix*normal;gl_Position=projectionMatrix*mv;}`;
const GHOST_FS=`uniform vec3 uC;uniform float uA;varying vec3 vN;varying vec3 vP;
void main(){vec3 n=vN*inversesqrt(max(dot(vN,vN),1e-10)),v=vP*inversesqrt(max(dot(vP,vP),1e-10));float f=1.-clamp(abs(dot(n,v)),0.,1.);gl_FragColor=vec4(uC*(f*f*f*2.2+.03)*uA,1.);}`;
// wreckage shards: thin irregular plates; aE is 1 on the rim and 0 in the middle, so the hot edge can cool separately (aHeat per instance)
const shardGeo=(pts,h)=>{const pos=[],e=[],uv=[],n=pts.length,P=(x,y,z,k)=>{pos.push(x,y,z);e.push(k);uv.push(x*1.5+.5,z*1.5+.5);};
  for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n];P(0,h,0,0);P(b[0],h*.3,b[1],1);P(a[0],h*.3,a[1],1);P(0,-h,0,0);P(a[0],-h*.3,a[1],1);P(b[0],-h*.3,b[1],1);
    P(a[0],h*.3,a[1],1);P(b[0],h*.3,b[1],1);P(b[0],-h*.3,b[1],1);P(a[0],h*.3,a[1],1);P(b[0],-h*.3,b[1],1);P(a[0],-h*.3,a[1],1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('aE',new THREE.Float32BufferAttribute(e,1));g.computeVertexNormals();return g;};
// floor crack left by the maul: jagged dark lines that glow for a moment, drawn once on a canvas
const crackTex=canvasTex(256,256,(g,w)=>{g.translate(w/2,w/2);const sc=g.createRadialGradient(0,0,0,0,0,w*.3);sc.addColorStop(0,'rgba(255,255,255,.55)');sc.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=sc;g.fillRect(-w/2,-w/2,w,w);
  g.strokeStyle='#fff';g.lineCap='round';const br=(x,y,a,len,lw)=>{while(len>4&&lw>.4){const st=rand(8,20),nx=x+cos(a)*st,ny=y+sin(a)*st;g.lineWidth=lw;g.beginPath();g.moveTo(x,y);g.lineTo(nx,ny);g.stroke();x=nx;y=ny;a+=rand(-.5,.5);len-=st;lw*=.86;if(random()<.22)br(x,y,a+rand(.5,1.1)*(random()<.5?-1:1),len*.5,lw*.7);}};
  for(let i=0;i<9;i++)br(0,0,i/9*TAU+rand(-.25,.25),rand(60,118),rand(2.6,4.2));});
Object.assign(fx,{
  // ---- warnings ----
  warns:Array.from({length:8},()=>{const u={uP:{value:V()},uC:{value:new THREE.Color()},uQ:{value:new THREE.Vector4()},uV:{value:new THREE.Vector4(1.78,.1,0,0)}};
    const m=new THREE.Mesh(flatGeo,new THREE.ShaderMaterial({uniforms:u,vertexShader:WARN_VS.replace(/position\.xy/g,'position.xz'),fragmentShader:WARN_FS,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,depthTest:false,depthWrite:false,transparent:true,side:THREE.DoubleSide}));
    m.visible=false;m.frustumCulled=false;m.renderOrder=9;scene.add(m);return {m,u,on:false};}),wi:0,
  // tg: whoever is winding up (the flare follows it and goes out if its state changes), tier 0 light or 1 heavy, dur: seconds of
  // game time until the strike, y: height above its feet, mark: [distance ahead, radius] of a floor mark for where a heavy blow lands
  warn(tg,tier,dur,y=1.7,mark=null){const w=this.warns[this.wi=(this.wi+1)%8];if(w.on&&w.mark)w.mark.m.visible=false;Object.assign(w,{on:true,tg,tier,dur,y,t:0,rt:0,st:tg.state,mark:null,mf:0});
    w.u.uC.value.setRGB(WARN[tier][0],WARN[tier][1],WARN[tier][2]).multiplyScalar(tier?1.05:.95);w.m.visible=true;
    if(mark){w.mark=this.disc(tg.pos.x,tg.gy||0,tg.pos.z,mark[1],dur+.12);w.mf=mark[0];}this.warnSet(w);return w;},
  warnSet(w){const g=w.tg;w.u.uP.value.set(g.pos.x,g.pos.y+w.y,g.pos.z);w.u.uQ.value.set(w.t/w.dur,w.tier?1.7:1.05,w.tier,1+.3*max(0,1-w.rt/.067));w.u.uV.value.set(camera.aspect,w.tier?.13:.09,0,0);
    if(w.mark)w.mark.m.position.set(g.pos.x+sin(g.yaw)*w.mf,(g.gy||0)+.05,g.pos.z+cos(g.yaw)*w.mf);},
  // ---- pistol: a three-petal muzzle flash and a short bolt with a white head that travels to the target ----
  tracers:Array.from({length:6},()=>({a:V(),b:V(),t:0,dur:0,hit:false})),ti:0,
  tracer(a,b,hit){const t=this.tracers[this.ti=(this.ti+1)%6],d=_f1.copy(b).sub(a),l=d.length()||1;d.multiplyScalar(1/l);t.a.copy(a);t.b.copy(b);t.t=0;t.dur=max(.05,l/90);t.hit=hit;
    const e=camera.matrixWorld.elements,W=[3.2,3,2.4];_f2.set(e[4],e[5],e[6]).cross(d).normalize();   // sideways, as seen from the camera
    this.wedge(a,d.x,d.y,d.z,.65,.11,W,.04);for(const s of [-1,1])this.wedge(a,d.x*.5+_f2.x*s*.85,d.y*.5+_f2.y*s*.85+.2,d.z*.5+_f2.z*s*.85,.42,.09,W,.04);
    _f0.copy(a).lerp(b,.5);this.lens(_f0,d.x,d.y,d.z,l,l,.035,.012,[.25,1.3,1.7],.09,.3,1);   // the line of the shot, fading behind the bolt
    this.core(a,[1.5,1.3,.9],.32);this.flash(a,0xffe0a0,20,.06);},
  // a short ribbon behind something moving (orbs), redrawn every frame
  tail(pos,vel,col,len,w){const P=this.parts,l=vel.length()||1,i=P.put(pos.x-vel.x/l*len*.5,pos.y-vel.y/l*len*.5,pos.z-vel.z/l*len*.5,col[0],col[1],col[2],1,1,w,w,2|64),j=i*3;P.d[j]=vel.x/l;P.d[j+1]=vel.y/l;P.d[j+2]=vel.z/l;P.l0[i]=P.l1[i]=len;P.m[i*4+3]=.6;},
  // ---- lightning ----
  bolts:Array.from({length:4},()=>{const g=new THREE.Group();g.visible=false;scene.add(g);for(let i=0;i<4;i++){const m=new THREE.Mesh(GB,addMat(0xbfd8ff,5));m.scale.set(.16,10,.16);g.add(m);}return {g,life:0};}),bi:0,
  bolt(x,y,z,quiet){
    const b=this.bolts[this.bi=(this.bi+1)%4];b.g.position.set(x,y,z);b.g.visible=true;b.life=.16;let ox=0,oz=0;
    b.g.children.forEach((m,i)=>{const nx=ox+rand(-1.2,1.2),nz=oz+rand(-1.2,1.2);m.position.set((ox+nx)/2,5+i*10,(oz+nz)/2);m.rotation.set((nz-oz)/10,0,-(nx-ox)/10);ox=nx;oz=nz;});
    _f0.set(x,y+.5,z);this.glint(_f0,0xbfd8ff,5,3.6,.2,.14);this.core(_f0,[1.6,1.9,2.6],2.4,.05);
    this.flash(_f0,0x9cc0ff,260,.22,10);this.rings.spawn(x,y+.06,z,0xbfd8ff,5,.4,3.4,.3);this.sparks(_f0,0,1,0,30,[2,2.6,3.6],12);this.puff(x,z,14,1.2,y);
    if(!quiet){sfx.thunder(1);cam.shake(.3);}
  },
  // ---- floor marks ----
  discs:Array.from({length:10},()=>{const u={uC:{value:new THREE.Color()},uP:{value:new THREE.Vector4()},uA:{value:1}},m=new THREE.Mesh(flatGeo,addShader(u,MARK_FS));m.visible=false;m.frustumCulled=false;scene.add(m);return {m,u,t:0,life:0};}),di:0,
  disc(x,y,z,r,life,tier=1){tier=tier===0?0:1;const d=this.discs[this.di=(this.di+1)%10];d.m.rotation.set(0,0,0);d.m.position.set(x,y+.05,z);d.m.scale.set(r,1,r);d.u.uC.value.setRGB(WARN[tier][0],WARN[tier][1],WARN[tier][2]).multiplyScalar(tier?1.25:1.1);d.u.uP.value.set(r,0,0,0);d.m.visible=true;d.t=0;d.life=life;return d;},
  line(x,y,z,yaw,len,w,life,tier=1){const d=this.disc(x,y+.01,z,1,life,tier);d.m.rotation.y=yaw;d.m.scale.set(w/2,1,len/2);d.u.uP.value.set(w/2,len,0,0);return d;},
  // ---- dodge afterimages ----
  ghosts:Array.from({length:3},()=>{const u={uC:{value:new THREE.Color()},uA:{value:0}},g=new THREE.Group(),mat=new THREE.ShaderMaterial({uniforms:u,vertexShader:GHOST_VS,fragmentShader:GHOST_FS,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
    g.visible=false;scene.add(g);return {g,u,mat,pool:[],t:0,life:0};}),gi:0,
  ghost(root,hex,life=.2){const o=this.ghosts[this.gi=(this.gi+1)%3];
    let n=0;const walk=s=>{if(!s.visible)return;
      if(s.isMesh&&!s.isInstancedMesh&&s.geometry.attributes.normal){let m=o.pool[n];if(!m){m=o.pool[n]=new THREE.Mesh(s.geometry,o.mat);m.matrixAutoUpdate=false;m.frustumCulled=false;o.g.add(m);}m.geometry=s.geometry;m.matrix.copy(s.matrixWorld);m.matrixWorldNeedsUpdate=true;m.visible=true;n++;}
      for(const c of s.children)walk(c);};
    walk(root);for(let k=n;k<o.pool.length;k++)o.pool[k].visible=false;o.u.uC.value.setHex(hex);o.t=0;o.life=life;o.u.uA.value=1;o.g.visible=n>0;},
  // ---- floor crack ----
  cracks:Array.from({length:3},()=>{const u={uM:{value:crackTex},uH:{value:0},uA:{value:0}};
    const m=new THREE.Mesh(flatGeo,new THREE.ShaderMaterial({uniforms:u,vertexShader:FLAT_VS,fragmentShader:`uniform sampler2D uM;uniform float uH,uA;varying vec2 vU;void main(){float a=texture2D(uM,vU).a;gl_FragColor=vec4(vec3(3.,.9,.18)*uH*a*a,a*uA*.85);}`,
      blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,depthWrite:false,transparent:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
    m.visible=false;scene.add(m);return {m,u,t:0,life:0};}),ci:0,
  crack(x,y,z,r,life=1.6){const c=this.cracks[this.ci=(this.ci+1)%3];c.m.position.set(x,y+.02,z);c.m.rotation.y=rand(TAU);c.m.scale.set(r,1,r);c.m.visible=true;c.t=0;c.life=life;},
  // a ground impact in one call: thin shock ring, dust thrown outward, sparks; heavy ones add radial dust streaks and a crack
  slam(x,y,z,r,hex,heavy){this.rings.spawn(x,y+.06,z,hex,5,.3,r,.32);this.puff(x,z,heavy?34:22,r*.3,y);_f0.set(x,y+.25,z);this.sparks(_f0,0,1.1,0,heavy?30:20,this.rgb(hex,3.2),10,.8);
    if(heavy){const D=this.dust;for(let k=0;k<12;k++){const a=k/12*TAU+rand(-.2,.2),s=rand(7,12)*r*.25,i=D.put(x+cos(a)*.4,y+.12,z+sin(a)*.4,.19,.19,.2,.34,rand(.3,.5),.22,.5,64),j=i*3;D.v[j]=cos(a)*s;D.v[j+2]=sin(a)*s;D.st[i]=.11;D.dr[i]=5;D.m[i*4+3]=rand(1);}
      this.crack(x,y,z,r*.55);}},
  // an enemy arriving: its own language and colour (violet), a thin column of light and a segmented ring that closes as it lands
  spawnIn(x,y,z,sc=1,dur=1){this.rings.spawn(x,y+.05,z,0x8a4dff,5,2.3*sc,.55*sc,dur,9,1.3,.06);_f0.set(x,y+3,z);this.lens(_f0,0,1,0,7.5,1.5,.16*sc,.02,[1.5,.55,3.4],dur*.85,.9,8);},
  // a foe destroyed: dark smoke under a small hot core, a thin ring, spikes, sparks and shards of its own metal
  burst(x,y,z,sc,col,hex,gy,n,metal){_f0.set(x,y,z);this.smoke(x,y,z,Math.ceil(6*sc),sc);this.core(_f0,[col[0]*.7+.9,col[1]*.7+.9,col[2]*.7+.7],1.5*sc,.05);
    for(let i=0;i<7;i++){const a=rand(TAU),u=rand(-.3,1);_f1.set(cos(a),u,sin(a)).normalize();this.wedge(_f0,_f1.x,_f1.y,_f1.z,rand(.5,1.4)*sc,.09*sc,[col[0]*.8+1.6,col[1]*.8+1.6,col[2]*.8+1.6],rand(.06,.11));}
    this.sparks(_f0,0,.5,0,40*sc,col,11,1);this.embers(x,y,z,22*sc,col,.4*sc);this.debris(x,y,z,n,sc,gy,metal);this.flash(_f0,hex,90,.2);this.rings.spawn(x,gy+.06,z,hex,4,.3,2.6*sc,.3);},
  // a thin line from a shooter to the hero, redrawn every frame: it thickens and brightens as the shot charges (k 0..1)
  aim(a,b,k){const P=this.parts,dx=b.x-a.x,dy=b.y+1.1-a.y,dz=b.z-a.z,l=hypot(dx,dy,dz)||1,s=.35+1.5*k*k,i=P.put(a.x+dx*.5,a.y+dy*.5,a.z+dz*.5,WARN[0][0]*s,WARN[0][1]*s,WARN[0][2]*s,2,1,.02+.06*k,.02,2|64),j=i*3;
    P.d[j]=dx/l;P.d[j+1]=dy/l;P.d[j+2]=dz/l;P.l0[i]=P.l1[i]=l;P.m[i*4+3]=k*.6;},
  update2(gdt,rdt){
    this.updateDeb(gdt);const P=this.parts;
    for(const t of this.tracers){if(t.dur<=0)continue;t.t+=rdt;const k=min(1,t.t/t.dur),d=_f1.copy(t.b).sub(t.a),l=d.length()||1,L=min(1.5,l);d.multiplyScalar(1/l);
      const hp=l*k,i=P.put(t.a.x+d.x*(hp-L*.5),t.a.y+d.y*(hp-L*.5),t.a.z+d.z*(hp-L*.5),.5,2.6,3.4,1,1,.12,.12,2|64),j=i*3;P.d[j]=d.x;P.d[j+1]=d.y;P.d[j+2]=d.z;P.l0[i]=P.l1[i]=L;P.m[i*4+3]=1;
      if(k>=1){t.dur=0;if(t.hit){this.sparks(t.b,-d.x*.4,.4,-d.z*.4,7,[3,2.4,1.2],5,.7);this.halo(t.b,[1.2,2.2,2.6],.12,.75,.1);this.core(t.b,[1.6,1.5,1.1],.4);}}}
    for(const b of this.bolts){if(b.life>0){b.life-=rdt;b.g.visible=b.life>0&&(b.life>.1||random()<.6);}}
    for(const d of this.discs){if(!d.m.visible)continue;d.t+=gdt;if(d.t>=d.life){d.m.visible=false;continue;}d.u.uP.value.z=d.t/d.life;d.u.uP.value.w=G.rt;d.u.uA.value=min(1,d.t*12);}
    for(const w of this.warns){if(!w.on)continue;const g=w.tg;w.t+=gdt;w.rt+=rdt;
      if(w.t>=w.dur||g.dead||g.gone||g.state!==w.st){w.on=false;w.m.visible=false;if(w.mark&&w.t<w.dur)w.mark.m.visible=false;continue;}this.warnSet(w);}
    for(const o of this.ghosts){if(!o.g.visible)continue;o.t+=rdt;if(o.t>=o.life){o.g.visible=false;continue;}const k=1-o.t/o.life;o.u.uA.value=k*k;}
    for(const c of this.cracks){if(!c.m.visible)continue;c.t+=gdt;if(c.t>=c.life){c.m.visible=false;continue;}const k=c.t/c.life;c.u.uH.value=max(0,1-c.t/.35);c.u.uA.value=min(1,(1-k)*2.5);}
  },
  clearMarks(){for(const d of this.discs)d.m.visible=false;for(const w of this.warns){w.on=false;w.m.visible=false;}},
  // wreckage: instanced shards in the foe's own metal, with gravity, one bounce and a spin; their edges glow and cool in about 0.6 s
  deb:(()=>{const n=60,mat=pbr('armor',{color:0xffffff,side:THREE.DoubleSide}),prev=mat.onBeforeCompile;
    mat.onBeforeCompile=s=>{prev(s);s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float aE;attribute float aHeat;varying vec2 vHt;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHt=vec2(aE,aHeat);');
      s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vHt;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(3.4,.85,.16)*vHt.y*(.12+smoothstep(.45,1.,vHt.x));');};
    mat.customProgramCacheKey=()=>'pbr|shard';
    const o=new THREE.Object3D(),ms=[[[-.5,-.12],[.5,-.3],[.16,.42]],[[-.5,-.2],[-.1,-.5],[.5,-.16],[.34,.4],[-.3,.36]]].map(pts=>{const g=shardGeo(pts,.5),h=new THREE.InstancedBufferAttribute(new Float32Array(n),1);h.setUsage(THREE.DynamicDrawUsage);g.setAttribute('aHeat',h);
      const m=new THREE.InstancedMesh(g,mat,n);m.castShadow=true;m.frustumCulled=false;o.position.set(0,-999,0);o.updateMatrix();for(let i=0;i<n;i++){m.setMatrixAt(i,o.matrix);m.setColorAt(i,_fc.setHex(0x5a606c));}scene.add(m);return m;});
    return {ms,it:Array.from({length:n*2},()=>({p:V(0,-999,0),v:V(),r:new THREE.Euler(),w:V(),s:V(1,1,1),life:0,age:0,gy:0})),o,i:0,dirty:false};})(),
  debris(x,y,z,n,sc=1,gy=0,hex=0x5a606c){const D=this.deb;_fc.setHex(hex);for(let k=0;k<n;k++){const i=D.i=(D.i+1)%D.it.length,d=D.it[i],a=rand(TAU),sp=rand(2,8),m=D.ms[i&1];
    d.p.set(x+rand(-.3,.3)*sc,y+rand(-.5,.5)*sc,z+rand(-.3,.3)*sc);d.v.set(cos(a)*sp,rand(3,9),sin(a)*sp);d.w.set(rand(-14,14),rand(-14,14),rand(-14,14));d.r.set(rand(TAU),rand(TAU),rand(TAU));
    d.s.set(rand(.14,.42)*sc,rand(.025,.05)*sc,rand(.12,.34)*sc);d.life=rand(2.2,3.6);d.age=0;d.gy=gy;m.setColorAt(i>>1,_fc);m.instanceColor.needsUpdate=true;}},
  updateDeb(dt){const D=this.deb,o=D.o;let any=false;for(let i=0;i<D.it.length;i++){const d=D.it[i];if(d.life<=0)continue;any=true;d.life-=dt;d.age+=dt;d.v.y-=22*dt;d.p.addScaledVector(d.v,dt);const m=D.ms[i&1];
      if(d.p.y<d.gy+d.s.y*.5){d.p.y=d.gy+d.s.y*.5;if(abs(d.v.y)>1.5){d.v.y*=-.35;d.v.x*=.6;d.v.z*=.6;d.w.multiplyScalar(.5);}else{d.v.set(0,0,0);d.w.set(0,0,0);d.r.x=d.r.z=0;}}
      d.r.x+=d.w.x*dt;d.r.y+=d.w.y*dt;d.r.z+=d.w.z*dt;o.position.copy(d.p);o.rotation.copy(d.r);const k=clamp(d.life*2.5,.05,1);o.scale.set(d.s.x*k,d.s.y*k,d.s.z*k);if(d.life<=0)o.position.y=-999;o.updateMatrix();m.setMatrixAt(i>>1,o.matrix);
      m.geometry.attributes.aHeat.array[i>>1]=max(0,1-d.age/.6);}
    if(any||D.dirty){for(const m of D.ms){m.instanceMatrix.needsUpdate=true;m.geometry.attributes.aHeat.needsUpdate=true;}D.dirty=any;}}
});
function makeBeam(hex){
  const m=addMesh(new THREE.CylinderGeometry(1,1,1,6,1,true).rotateX(PI/2),hex,1.1);
  return {m,set(a,b,w=.06){m.position.copy(a).lerp(b,.5);m.scale.set(w*(1+.3*sin(G.rt*40)),w,max(.1,a.distanceTo(b)));m.lookAt(b);m.visible=true;},hide(){m.visible=false;},dispose(){scene.remove(m);}};
}
// shockwaves that can hurt the player: expanding rings and travelling lines. A white-hot leading edge on the floor and a low wall of
// light that fades upward, in the heavy warning colour.
const WALL_FS=`uniform vec3 uC;uniform float uA;varying vec2 vU;void main(){float h=clamp(1.-vU.y,0.,1.);gl_FragColor=vec4(uC*(h*h*h*1.1+smoothstep(.12,0.,vU.y)*1.6)*uA,1.);}`;
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
