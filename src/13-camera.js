// ===================== CAMERA =====================
const cam={yaw:0,pitch:.2,dist:5.3,cd:5.3,ad:5.3,focus:V(0,1.4,7),trauma:0,fovKick:0,ab:0,side:0,zoom:0,up:0,
  shake(a){this.trauma=min(1,this.trauma+a);},
  update(dt){
    const p=G.player,tg=G.lock,boss=G.boss&&!G.boss.gone?G.boss:null,play=G.state==='play';
    let fx_=p.pos.x,fy=p.gy+(p.pos.y-p.gy)*.6+1.45,fz=p.pos.z;
    if(play){
      if(tg&&!tg.dead&&G.inCombat){const k=boss?.1:.2;fx_=lerp(fx_,tg.pos.x,k);fz=lerp(fz,tg.pos.z,k);
        if(G.hard)this.yaw+=wrapA(atan2(tg.pos.x-p.pos.x,tg.pos.z-p.pos.z)-this.yaw)*(1-exp(-3.5*dt));}
      if(!document.pointerLockElement&&!G.hard){const d=wrapA(p.yaw-this.yaw);if(hypot(p.vel.x,p.vel.z)>2&&abs(d)<2.3)this.yaw+=d*(1-exp(-1.4*dt));}
      if(keys.ArrowLeft)this.yaw+=2.2*dt;if(keys.ArrowRight)this.yaw-=2.2*dt;if(keys.ArrowUp)this.pitch=max(-.45,this.pitch-1.2*dt);if(keys.ArrowDown)this.pitch=min(1.1,this.pitch+1.2*dt);
    }
    if(play&&boss&&boss.state==='intro'&&boss.kind==='storm'){   // turn to watch the Stormvane arrive
      this.yaw+=wrapA(atan2(boss.pos.x-p.pos.x,boss.pos.z-p.pos.z)-this.yaw)*(1-exp(-4*dt));this.pitch=damp(this.pitch,.03,3,dt);}
    fx_+=-cos(this.yaw)*this.side;fz+=sin(this.yaw)*this.side;
    const k=1-exp(-11*dt);this.focus.x+=(fx_-this.focus.x)*k;this.focus.y+=(fy-this.focus.y)*k;this.focus.z+=(fz-this.focus.z)*k;
    const want=this.dist+(G.inCombat?1.2:0)+(boss?(boss.kind==='storm'?3.4:2.4):0)+(p.pos.y-p.gy)*.3-this.zoom;
    this.cd=damp(this.cd,want,3.5,dt);
    const high=boss&&boss.kind==='storm'&&play?boss.pos.y-p.pos.y:0;this.up=damp(this.up,high>5?clamp(high*.24,0,3.6):0,2,dt);
    // keep the camera inside the level: walk out from the focus until a wall is reached
    const cp=cos(this.pitch),ux=-sin(this.yaw)*cp,uy=sin(this.pitch),uz=-cos(this.yaw)*cp;
    let d=this.cd;for(let s=.6;s<this.cd+.3;s+=.3){if(!areaAt(this.focus.x+ux*s,this.focus.z+uz*s,.3,false)){d=max(.5,s-.35);break;}}
    this.ad=d<this.ad?d:damp(this.ad,d,5,dt);
    let x=this.focus.x+ux*this.ad,y=this.focus.y+uy*this.ad,z=this.focus.z+uz*this.ad;
    const a=areaAt(x,z,.35,false);
    if(a){const fl=areaH(a,clamp(x,a.x0,a.x1),clamp(z,a.z0,a.z1));y=max(y,fl+.35);if(!a.open)y=min(y,a.top-.45);}
    this.trauma=max(0,this.trauma-dt*2.4);const s=this.trauma*this.trauma,t=G.rt*38;
    const sx=(sin(t*1.3)+sin(t*2.7+1))*.5*s*.3,sy=(sin(t*1.7+2)+sin(t*3.1))*.5*s*.3;
    camera.position.set(x+sx*cos(this.yaw),y+sy,z-sx*sin(this.yaw));camera.lookAt(this.focus.x,this.focus.y+this.up+sy*.4,this.focus.z);camera.rotateZ(sin(t*2.1)*s*.035);
    this.fovKick=damp(this.fovKick,0,6,dt);this.zoom=damp(this.zoom,0,2.5,dt);const fov=58+this.fovKick-this.zoom*5+(boss?4:0);if(abs(camera.fov-fov)>.01){camera.fov=damp(camera.fov,fov,8,dt);camera.updateProjectionMatrix();}
    this.ab=max(0,this.ab-dt*.14);   // gone within 100 ms
    moon.position.set(p.pos.x+3,p.pos.y+18,p.pos.z-7);moon.target.position.set(p.pos.x,p.pos.y,p.pos.z+2);
  }};
