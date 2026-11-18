// ===================== INPUT =====================
const keys={},held={},pad={x:0,y:0,prev:[]};
const KEYMAP={Mouse0:'light',KeyJ:'light',Mouse2:'heavy',KeyK:'heavy',Space:'jump',ShiftLeft:'dodge',ShiftRight:'dodge',KeyL:'dodge',KeyE:'rush',KeyQ:'lock',Mouse1:'lock',KeyR:'restart',
  Digit1:'w0',Digit2:'w1',Digit3:'w2',KeyF:'wnext',Tab:'wnext'};
const MV={x:0,z:0,mag:0};
const input={buf:null,bufT:-9,
  peek(a){return this.buf===a&&G.rt-this.bufT<.3;},
  take(a){if(this.peek(a)){this.buf=null;return true;}return false;},
  clear(){this.buf=null;},
  move(){MV.x=MV.z=MV.mag=0;if(G.state!=='play')return MV;
    const x=(keys.KeyD?1:0)-(keys.KeyA?1:0)+pad.x,z=(keys.KeyW?1:0)-(keys.KeyS?1:0)-pad.y,m=min(1,hypot(x,z));if(m<.15)return MV;
    const fx_=sin(cam.yaw),fz=cos(cam.yaw),wx=fx_*z-fz*x,wz=fz*z+fx_*x,l=hypot(wx,wz)||1;MV.x=wx/l;MV.z=wz/l;MV.mag=m;return MV;}};
function onAction(a){
  if(a==='restart'){if(G.state==='dead')G.respawn();else if(G.state==='done')G.reset();return;}
  if(G.state!=='play')return;
  if(a==='lock'){G.toggleLock();return;}
  if(a[0]==='w'){const p=G.player;p.wantSet=a==='wnext'?(p.wantSet+1)%3:a==='wprev'?(p.wantSet+2)%3:+a[1];return;}
  input.buf=a;input.bufT=G.rt;
}
function lockPtr(){try{const r=canvas.requestPointerLock();if(r&&r.catch)r.catch(()=>{});}catch(e){}}
addEventListener('keydown',e=>{
  if(e.code==='Space'||e.code==='Tab'||e.code.startsWith('Arrow'))e.preventDefault();
  if(e.repeat)return; keys[e.code]=true;
  if(G.state==='title'){if(e.code==='Enter'||e.code==='Space')G.start();return;}
  const a=KEYMAP[e.code];if(a){held[a]=true;onAction(a);}
});
addEventListener('keyup',e=>{keys[e.code]=false;const a=KEYMAP[e.code];if(a)held[a]=false;});
addEventListener('mousedown',e=>{
  if(G.state==='title'){G.start();return;}
  if(G.state==='play'&&!document.pointerLockElement)lockPtr();
  const a=KEYMAP['Mouse'+e.button];if(a){held[a]=true;onAction(a);} if(e.button===1)e.preventDefault();
});
addEventListener('mouseup',e=>{const a=KEYMAP['Mouse'+e.button];if(a)held[a]=false;});
addEventListener('wheel',e=>{if(abs(e.deltaY)>4)onAction(e.deltaY>0?'wnext':'wprev');},{passive:true});
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousemove',e=>{if(document.pointerLockElement&&G.state==='play'){cam.yaw-=e.movementX*.0025;cam.pitch=clamp(cam.pitch+e.movementY*.002,-.45,1.1);}});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;for(const k in held)held[k]=false;});
const PADMAP={0:'jump',1:'dodge',2:'light',3:'heavy',4:'wprev',5:'lock',6:'dodge',7:'rush',14:'wprev',15:'wnext'};
function pollPad(dt){
  const gps=navigator.getGamepads?navigator.getGamepads():[];let gp=null;for(const g of gps)if(g&&g.connected){gp=g;break;}
  if(!gp){pad.x=pad.y=0;return;}
  const dz=v=>abs(v)<.18?0:v;pad.x=dz(gp.axes[0]||0);pad.y=dz(gp.axes[1]||0);
  cam.yaw-=dz(gp.axes[2]||0)*3*dt;cam.pitch=clamp(cam.pitch+dz(gp.axes[3]||0)*1.8*dt,-.45,1.1);
  gp.buttons.forEach((b,i)=>{const d=b.pressed;if(d===!!pad.prev[i])return;pad.prev[i]=d;const a=PADMAP[i];
    if(d&&G.state==='title')G.start();else if(d&&i===9)onAction('restart');else if(a){held[a]=d;if(d)onAction(a);}});
}
