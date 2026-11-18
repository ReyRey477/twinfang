// ===================== DEV HARNESS =====================
// Lets a script (or a person) look at any part of the game in isolation and measure it. Nothing here runs in normal play.
//   ?show=hero|husk|brute|stalker|lantern|warden|storm|mats|all   one subject (or the whole cast) on a lit stage, orbiting camera (&a=deg &d=dist &h=height &clip=name &t=sec &set=0..2)
//   ?tp=x,y,z[,yaw]      start playing at that spot          ?cam=x,y,z,tx,ty,tz   fix the camera (hides the HUD)
//   ?bench               fly a fixed path through the level and print frame times
//   ?nan                 live count of invalid (NaN / infinite) pixels in the top right corner
//   window.HX            the same controls from code; window.__stats() and window.__errors for automated checks
const HX={cam:null,stage:null,orbit:null,frames:0,calls:0,tris:0,
  view(px,py,pz,tx,ty,tz){this.cam={p:V(px,py,pz),t:V(tx,ty,tz)};this.orbit=null;},
  free(){this.cam=null;this.orbit=null;},
  hud(on){for(const id of ['hud','title','bt','bb'])$(id).style.display=on?'':'none';},
  begin(){if(G.state==='title')G.start();$('title').style.display='none';},
  tp(x,y,z,yaw=0){const p=G.player;p.pos.set(x,y,z);p.prev.copy(p.pos);p.gy=y;p.grounded=true;p.vel.set(0,0,0);p.state='move';p.yaw=p.pyaw=yaw;cam.yaw=yaw;cam.pitch=.14;cam.focus.set(x,y+1.45,z);},
  // put one subject on the stage in the middle of the gear hall, under a three-point light rig
  show(kind,o={}){
    this.begin();this.hud(false);for(const d of ENCS)d.done=true;G.resetCombat();
    const cx=0,cz=109,p=G.player;this.tp(cx,0,kind==='hero'?cz:cz-30,0);G.ts=0;
    if(!this.lights){this.lights=[[3,4.2,-4,0xfff2e0,46],[-4.5,2.6,-1.5,0x45d4ff,30],[3.5,3.4,4.5,0xff8a3a,28]].map(([x,y,z,c,i])=>{const L=new THREE.PointLight(c,i,16,2);L.position.set(cx+x,y,cz+z);scene.add(L);return L;});}
    this.lights.forEach((L,i)=>{L.intensity=[46,30,28][i]*(kind==='hero'?1:kind==='all'?1.5:2.2);L.distance=kind==='all'?26:16;});
    let root=null,h=1.1,d=4.2,upd=null;const enc={gy:0,ar:inset(AREA.hall,1),ceil:16};
    if(this.stage){this.stage.remove&&this.stage.remove();this.stage=null;}
    if(kind==='hero'){root=p.rig.root;root.position.set(cx,0,cz);root.rotation.y=PI;root.visible=true;const c=o.clip&&CL[o.clip];if(c)p.rig.play(c,0,true);if(o.set!==undefined){p.set=p.wantSet=+o.set;p.rig.setWeapon(+o.set);}upd=dt=>{p.rig.update(dt);};}
    else if(kind==='all'){   // the cast in a line: hero in front, foes either side, the Gatewarden behind
      const list=[];root=p.rig.root;root.position.set(cx,0,cz);root.rotation.y=PI;root.visible=true;p.rig.play(CL.idle,0,true);
      G.enc={def:Object.assign({bars:[],waves:[[]],tokens:0,id:'x'},enc),wave:0};
      for(const [k,x,z] of [['husk',-1.8,.2],['stalker',1.8,.2],['brute',-4.4,1],['lantern',4.2,.8],['warden',0,5]]){
        const e=k==='lantern'?new Lantern(cx+x,cz+z,enc):k==='warden'?new Warden(enc):new Enemy(k,cx+x,cz+z,enc),r=e.rig?e.rig.root:e.root;
        r.position.set(cx+x,k==='lantern'?2:0,cz+z);r.rotation.y=PI;r.visible=true;if(e.rig){r.scale.setScalar(e.scale);e.rig.play(CL.eIdle,0,true);}list.push(e);}
      G.enc=null;this.stage={remove(){for(const e of list)e.remove();}};upd=dt=>{p.rig.update(dt);for(const e of list)if(e.rig)e.rig.update(dt);};h=1.7;d=7.6;}
    else if(kind==='mats'){root=new THREE.Group();scene.add(root);const ks=['floor','wall','plate','armor','steel','rubber','hazard'];
      ks.forEach((k,i)=>{const m=pbr(k),t=TILE[k],g=new THREE.PlaneGeometry(1.6,1.6),s=new THREE.SphereGeometry(.42,32,20);for(const q of [g,s]){const uv=q.attributes.uv;for(let j=0;j<uv.count;j++)uv.setXY(j,uv.getX(j)*1.6/t,uv.getY(j)*1.6/t);}
        const a=new THREE.Mesh(g,m),b=new THREE.Mesh(s,m);a.position.set((i-3)*1.75,1.2,0);b.position.set((i-3)*1.75,2.75,0);root.add(a,b);});
      root.position.set(cx,0,cz);root.rotation.y=PI;h=1.9;d=7.5;this.stage={remove(){scene.remove(root);}};}
    else{
      p.rig.root.visible=false;p.light.intensity=0;
      G.enc={def:Object.assign({bars:[],waves:[[]],tokens:0,id:'x'},enc),wave:0};
      const e=kind==='lantern'?new Lantern(cx,cz,enc):kind==='warden'?new Warden(enc):kind==='storm'?new Stormvane(enc):new Enemy(kind,cx,cz,enc);
      root=e.rig?e.rig.root:e.root;this.stage=e;G.enc=null;
      if(e.rig){root.position.set(cx,0,cz);root.rotation.y=PI;root.scale.setScalar(e.scale);root.visible=true;e.rig.play(CL[o.clip]||CL.idle,0,true);upd=dt=>e.rig.update(dt);h=1.1*e.scale;d=4.2*e.scale;}
      else{root.position.set(cx,kind==='storm'?4.5:2,cz);root.rotation.y=PI;root.scale.setScalar(1);if(kind==='storm'){h=4.5;d=17;}else{h=2;d=3.4;}}
      if(kind==='warden')root.position.z=cz;
    }
    this.subject=root;this.upd=upd;
    this.orbit={x:cx,y:o.h!==undefined?+o.h:h,z:cz,d:o.d!==undefined?+o.d:d,a:o.a!==undefined?+o.a*PI/180:null,t:0};this.cam=null;
    if(upd&&o.t!==undefined){const c=kind==='hero'?p.rig:this.stage.rig;c.t=+o.t;upd(0);this.upd=null;}
    return {kind};
  },
  // render the scene alone into an HDR target and count pixels that are NaN, infinite or negative (any of these
  // becomes a screen-sized black block once bloom blurs it). Returns the count, the first bad pixel and the peak value.
  nanCheck(viaComposer){
    const w=renderer.domElement.width,h=renderer.domElement.height,a=new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,samples:QLOW?0:4}),b=new THREE.WebGLRenderTarget(w,h);
    renderer.setRenderTarget(a);renderer.render(scene,camera);
    const q=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:{t:{value:a.texture}},depthTest:false,vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader:`uniform sampler2D t;varying vec2 v;void main(){vec3 c=texture2D(t,v).rgb;float bad=0.;if(!(c.r>=0.&&c.r<3e4))bad=1.;if(!(c.g>=0.&&c.g<3e4))bad=1.;if(!(c.b>=0.&&c.b<3e4))bad=1.;gl_FragColor=vec4(bad,clamp(max(c.r,max(c.g,c.b))/200.,0.,1.),0.,1.);}`}));
    if(viaComposer){renderer.setRenderTarget(null);composer.render();q.material.uniforms.t.value=composer.writeBuffer.texture;}   // after a frame, writeBuffer holds what the final grade pass was given
    const s=new THREE.Scene();s.add(q);renderer.setRenderTarget(b);renderer.render(s,new THREE.OrthographicCamera(-1,1,1,-1,0,1));
    const px=new Uint8Array(w*h*4);renderer.readRenderTargetPixels(b,0,0,w,h,px);renderer.setRenderTarget(null);
    let bad=0,mx=0,first=null;for(let i=0;i<px.length;i+=4){if(px[i]>127){bad++;if(!first)first=[(i/4)%w,floor(i/4/w)];}if(px[i+1]>mx)mx=px[i+1];}
    a.dispose();b.dispose();q.geometry.dispose();q.material.dispose();return {bad,first,peak:+(mx/255*200).toFixed(1)};
  },
  stats(){const i=renderer.info;return {calls:this.calls,tris:this.tris,geos:i.memory.geometries,tex:i.memory.textures,progs:i.programs?i.programs.length:0,frames:this.frames,errors:window.__errors.length,state:G.state};}
};
window.HX=HX;window.sfx=sfx;window.__stats=()=>HX.stats();HX.render=()=>composer.render();
// every frame goes through here: apply a fixed or orbiting camera, count the work of all passes
renderer.info.autoReset=false;
{const render=composer.render.bind(composer);let last=performance.now();
  composer.render=function(){
    const now=performance.now(),dt=min(.05,(now-last)/1000);last=now;
    if(HX.orbit){const o=HX.orbit;o.t+=dt;const a=o.a??o.t*.5;camera.position.set(o.x+sin(a)*o.d,o.y+o.d*.16,o.z-cos(a)*o.d);camera.lookAt(o.x,o.y,o.z);if(HX.upd)HX.upd(dt);}
    else if(HX.cam){camera.position.copy(HX.cam.p);camera.lookAt(HX.cam.t);}
    renderer.info.reset();render();HX.calls=renderer.info.render.calls;HX.tris=renderer.info.render.triangles;HX.frames++;
  };}
{const b=document.createElement('div');b.textContent='build '+BUILD;b.style.cssText='position:absolute;right:16px;bottom:12px;font:11px monospace;letter-spacing:.12em;opacity:.5;color:#9fc8ff';$('title').appendChild(b);}
{
  const num=s=>s.split(',').map(Number);
  if(QS.has('show'))HX.show(QS.get('show'),Object.fromEntries(QS));
  if(QS.has('tp')){HX.begin();HX.tp(...num(QS.get('tp')));}
  if(QS.has('cam')){HX.begin();HX.hud(false);HX.view(...num(QS.get('cam')));}
  if(QS.has('nan')){   // live read-out of invalid pixels, for chasing GPU-specific shader faults
    const pre=document.createElement('pre');pre.style.cssText='position:fixed;right:12px;top:12px;z-index:99;margin:0;padding:8px 10px;font:12px/1.4 monospace;color:#d8f0d0;background:rgba(0,0,0,.7)';document.body.appendChild(pre);
    setInterval(()=>{const a=HX.nanCheck(),b=HX.nanCheck(true);pre.textContent=`build ${BUILD}\ninvalid pixels  scene ${a.bad}  final ${b.bad}\nfirst ${a.first||b.first||'-'}  peak ${b.peak}`;},1000);}
  if(QS.has('bench')){
    HX.begin();HX.hud(false);for(const d of ENCS)d.done=true;Object.assign(LOCKS,{gate:false,warden:false,upper:false});door.open=true;
    const path=[[0,2,8,0],[0,2.2,80,0],[0,3,100,0],[6,4,120,-1.2],[0,4,134,0],[20,13,150,.6],[21,16,176,0],[22,17,196,-1.5],[-22,17,196,1.5],[0,17,236,0],[0,17,258,0],[0,22,282,0],[14,24,300,-1.6],[0,26,322,PI]];
    const pre=document.createElement('pre');pre.style.cssText='position:fixed;left:12px;top:12px;z-index:99;margin:0;padding:10px 12px;font:12px/1.45 monospace;color:#d8f0d0;background:rgba(0,0,0,.6)';document.body.appendChild(pre);
    const ms=[];let t=0,lastT=performance.now(),lastP=0;const dur=42;
    const tick=()=>{requestAnimationFrame(tick);const now=performance.now(),dt=(now-lastT)/1000;lastT=now;t+=dt;const f=(t/dur%1)*(path.length-1),i=min(path.length-2,floor(f)),k=smooth(f-i),a=path[i],b=path[i+1];
      const x=lerp(a[0],b[0],k),y=lerp(a[1],b[1],k),z=lerp(a[2],b[2],k),yaw=lerp(a[3],b[3],k);HX.tp(x,y-2,z,yaw);G.player.rig.root.visible=false;HX.view(x,y,z,x+sin(yaw)*8,y-1.2,z+cos(yaw)*8);
      if(t>2)ms.push(dt*1000);if(ms.length>4000)ms.shift();
      if(t-lastP>1&&ms.length>20){lastP=t;const s=ms.slice().sort((p,q)=>p-q),avg=s.reduce((p,q)=>p+q,0)/s.length;
        pre.textContent=`TWINFANG BENCH  t=${t.toFixed(0)}s  ${renderer.domElement.width}x${renderer.domElement.height}  quality ${QLOW?'low':QHIGH?'high':'default'}\nframe ms  avg ${avg.toFixed(1)}  median ${s[s.length>>1].toFixed(1)}  p99 ${s[floor(s.length*.99)].toFixed(1)}  =>  ${(1000/avg).toFixed(0)} fps\n${JSON.stringify(HX.stats())}`;window.__bench={avg,median:s[s.length>>1],p99:s[floor(s.length*.99)]};}};
    requestAnimationFrame(tick);
  }
}
