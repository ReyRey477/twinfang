// ===================== RIG =====================
// Body space: +Z forward, +Y up, +X is the character's LEFT. Side index 0 = left, 1 = right.
const ARM1=.31,ARM2=.30,LEG1=.47,LEG2=.47,ANK=.09,HIPH=1.03,SHX=.235,SHY=.40,HIPX=.115,PIV=1.0;
const I={by:0,rot:1,hy:4,hz:5,hip:6,ch:9,hd:12,hl:15,hr:18,sl:21,sr:24,fl:27,fr:30},PN=33;
const PKN={by:1,rot:3,hy:1,hz:1,hip:3,ch:3,hd:3,hl:3,hr:3,sl:3,sr:3,fl:3,fr:3};
function wr(p,o){for(const k in o){const i=I[k];if(PKN[k]===1)p[i]=o[k];else{p[i]=o[k][0];p[i+1]=o[k][1];p[i+2]=o[k][2];}}return p;}
function P(o,base){const p=new Float32Array(PN);if(base)p.set(base);return wr(p,o);}
const nrm=a=>{const l=hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};
const AL=(d,reach=.56,blade)=>{const n=nrm(d);return {hl:[SHX+n[0]*reach,SHY+n[1]*reach,n[2]*reach],sl:nrm(blade||d)};};
const AR=(d,reach=.56,blade)=>{const n=nrm(d);return {hr:[-SHX+n[0]*reach,SHY+n[1]*reach,n[2]*reach],sr:nrm(blade||d)};};
const DOWN=V(0,-1,0),XAX=V(1,0,0);
const _a=V(),_b=V(),_c=V(),_d=V(),_e=V(),_f=V(),_g=V(),_h=V(),_q=new THREE.Quaternion(),_q2=new THREE.Quaternion(),_m4=new THREE.Matrix4();
function ik2(o,t,l1,l2,pole,qa,qb){
  const d=_e.subVectors(t,o); let L=d.length(); L=clamp(L,abs(l1-l2)+.002,l1+l2-.002); d.normalize();
  const a=(l1*l1-l2*l2+L*L)/(2*L), h=sqrt(max(0,l1*l1-a*a));
  const p=_f.copy(pole).addScaledVector(d,-pole.dot(d)); if(p.lengthSq()<1e-6)p.set(0,0,1).addScaledVector(d,-d.z); p.normalize();
  const el=_g.copy(d).multiplyScalar(a).addScaledVector(p,h);
  const fo=_h.copy(d).multiplyScalar(L).sub(el).normalize(); el.normalize();
  qa.setFromUnitVectors(DOWN,el); _q.setFromUnitVectors(DOWN,fo); qb.copy(qa).invert().multiply(_q);
}
const geoCache={};
const limb=(rt,rb,len)=>geoCache['l'+rt+rb+len]||(geoCache['l'+rt+rb+len]=new THREE.CylinderGeometry(rt,rb,len,10).translate(0,-len/2,0));
const cyl=(rt,rb,h)=>geoCache['c'+rt+rb+h]||(geoCache['c'+rt+rb+h]=new THREE.CylinderGeometry(rt,rb,h,12));
const cone=(r,h,n=4)=>geoCache['k'+r+h+n]||(geoCache['k'+r+h+n]=new THREE.ConeGeometry(r,h,n));
const tailGeo=new THREE.PlaneGeometry(.21,.42,1,2).translate(0,-.21,0);
const coatGeo=new THREE.PlaneGeometry(.29,.44,1,2).translate(0,-.22,0);
const capeGeo=new THREE.PlaneGeometry(.34,.55,1,2).translate(0,-.275,0);

class Rig{
  constructor(cfg){
    const c=this.cfg=Object.assign({scale:1,kind:'hero'},cfg); this.mats=c.mats;
    const root=this.root=new THREE.Group(), body=this.body=new THREE.Group(); root.add(body); root.scale.setScalar(c.scale); body.rotation.order='YXZ';
    const hips=this.hips=new THREE.Group(); hips.rotation.order='YXZ'; body.add(hips);
    const chest=this.chest=new THREE.Group(); chest.rotation.order='YXZ'; chest.position.y=.14; hips.add(chest);
    const head=this.head=new THREE.Group(); head.rotation.order='YXZ'; head.position.y=.56; chest.add(head);
    this.arm=[];this.fore=[];this.sword=[];this.leg=[];this.shin=[];this.foot=[];
    for(let s=0;s<2;s++){const sx=s?-1:1;
      const ua=new THREE.Group(); ua.position.set(sx*SHX,SHY,0); chest.add(ua);
      const fa=new THREE.Group(); fa.position.y=-ARM1; ua.add(fa);
      const sw=new THREE.Group(); sw.position.y=-ARM2; fa.add(sw);
      const ul=new THREE.Group(); body.add(ul); const ll=new THREE.Group(); ll.position.y=-LEG1; ul.add(ll); const ft=new THREE.Group(); ft.position.y=-LEG2; ll.add(ft);
      this.arm.push(ua);this.fore.push(fa);this.sword.push(sw);this.leg.push(ul);this.shin.push(ll);this.foot.push(ft);
    }
    this.cur=new Float32Array(PN);this.from=new Float32Array(PN);this.tmp=new Float32Array(PN);
    this.edge=[V(1,0,0),V(1,0,0)];this.tipPrev=[V(),V()];
    this.phase=0;this.seed=rand(10);this.air=0;this.vy=0;this.lv=V();this.pry=0;this.tt=0;this.clip=null;this.t=0;this.bt=0;this.bd=0;
    this.speed=1;this.twoHand=false;this.aimHand=false;this.aimW=0;this.aimDir=V(0,0,1);this.post=null;this.wp=[[],[]];this.hide=[];this.hot=[];this.tailBase=.14;
    const add=(par,geo,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);m.castShadow=true;par.add(m);return m;};
    if(c.kind==='hero')this.buildHero(add);else if(c.kind==='warden')this.buildWarden(add);else this.buildFoe(add);
  }
  addTails(angles,geo,mat,rx,rz,len){
    this.tails=[];
    for(const a of angles){
      const pv=new THREE.Group(); pv.rotation.order='YXZ'; pv.position.set(sin(a)*rx,-.02,cos(a)*rz); pv.rotation.y=a; this.hips.add(pv);
      const m1=new THREE.Mesh(geo,mat); m1.castShadow=true; pv.add(m1);
      const s2=new THREE.Group(); s2.position.y=-len; pv.add(s2); const m2=new THREE.Mesh(geo,mat); m2.castShadow=true; m2.scale.set(.9,1,1); s2.add(m2);
      this.tails.push({a,pv,s2,v:.1,v2:.1});
    }
  }
  buildHero(add){
    const M=this.mats,{hips,chest,head}=this;
    add(hips,GB,M.pants,0,-.03,0,.33,.2,.22); add(hips,GB,M.boot,0,.08,0,.35,.05,.24); add(hips,GB,M.trim,0,.08,.125,.07,.045,.01);
    add(chest,cyl(.2,.15,.46),M.shirt,0,.2,0,1,1,.68);
    add(chest,GB,M.coat,0,.25,-.105,.38,.52,.07);
    for(const sx of [-1,1]){
      add(chest,GB,M.coat,sx*.185,.23,-.01,.07,.5,.2);
      add(chest,GB,M.coat,sx*.125,.26,.1,.1,.44,.04,0,0,sx*.12);
      add(chest,GB,M.lining,sx*.09,.36,.125,.05,.2,.02,0,0,sx*.35);
      add(chest,GS,M.coat,sx*.25,.415,0,.105,.075,.12);
      add(chest,GB,M.coat,sx*.1,.5,-.02,.05,.13,.16,0,0,-sx*.25);
    }
    add(chest,GB,M.coat,0,.5,-.1,.24,.14,.04); add(chest,cyl(.05,.06,.1),M.skin,0,.49,.01);
    add(head,GS,M.skin,0,.1,.005,.098,.122,.108); add(head,GS,M.hair,0,.14,-.016,.107,.108,.118);
    add(head,GB,M.hair,0,.212,.015,.14,.03,.17,.3,0,0); add(head,GB,M.hair,.02,.19,.092,.12,.03,.05,.85,0,.15);
    add(head,GB,M.shade,0,.118,.098,.172,.036,.03); add(head,GB,M.glow,0,.137,.113,.172,.004,.004);
    this.addTails([.8,1.75,PI-.55,PI+.55,-1.75,-.8],coatGeo,M.coat,.175,.125,.44); this.tailBase=.05;
    for(let s=0;s<2;s++){const ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      add(ua,limb(.062,.054,ARM1),M.coat); add(fa,GS,M.coat,0,0,0,.057,.057,.057); add(fa,limb(.06,.05,ARM2),M.coat); add(fa,cyl(.058,.054,.05),M.lining,0,-.25,0);
      add(sw,GS,M.boot,0,0,0,.048,.048,.048);
      add(ul,limb(.092,.07,LEG1),M.pants); add(ll,GS,M.pants,0,0,.01,.066,.066,.066); add(ll,limb(.074,.056,LEG2),M.boot); add(ll,cyl(.08,.076,.05),M.boot,0,-.06,0);
      add(ft,GB,M.boot,0,-.04,.06,.1,.09,.27);
    }
    const grp=s=>{const o=new THREE.Group();this.sword[s].add(o);return o;};
    const blade=(o,len,wid)=>{
      add(o,cyl(.02,.02,.2),M.dark,0,-.02,0); add(o,GS,M.trim,0,-.13,0,.028,.028,.028); add(o,GB,M.trim,0,.09,0,wid*3.2,.03,.05); add(o,GB,M.trim,0,.115,0,.09,.04,.03);
      add(o,GB,M.blade,0,.11+len/2,0,wid,len,.014); add(o,cone(.045,.17,4),M.blade,0,.195+len,0,wid/.064,1,.31,0,PI/4,0); add(o,GB,M.glow,0,.11+len/2,0,.016,len+.02,.018);
    };
    for(let s=0;s<2;s++){this.wp[s][0]=grp(s); blade(this.wp[s][0],1.02,.064);}
    this.wp[1][1]=grp(1); blade(this.wp[1][1],1.34,.08);
    const g=this.wp[0][1]=grp(0);   // pistol: barrel along +Y, grip along +Z
    add(g,GB,M.gun,0,.14,-.012,.048,.32,.07); add(g,GB,M.dark,0,.0,.055,.042,.075,.13,.25,0,0); add(g,GB,M.trim,0,.02,.0,.05,.09,.03); add(g,GB,M.glow,0,.16,-.052,.012,.2,.01);
    add(g,cyl(.016,.016,.05),M.dark,0,.31,-.012);
    this.wp[0][2]=grp(0);
    const m=this.wp[1][2]=grp(1);   // maul: shaft along +Y, head across X
    add(m,cyl(.028,.028,1.75),M.dark,0,.45,0); add(m,GS,M.trim,0,-.44,0,.05,.05,.05); add(m,cyl(.04,.04,.12),M.trim,0,.15,0); add(m,cyl(.04,.04,.12),M.trim,0,.6,0);
    add(m,GB,M.gun,0,1.32,0,.56,.3,.3); add(m,GB,M.trim,.29,1.32,0,.03,.34,.34); add(m,GB,M.trim,-.29,1.32,0,.03,.34,.34);
    add(m,GB,M.glow,0,1.32,.153,.4,.03,.01); add(m,GB,M.glow,0,1.32,-.153,.4,.03,.01); add(m,GB,M.glow,0,1.473,0,.4,.01,.03); add(m,cone(.07,.24,4),M.trim,0,1.58,0);
    this.setWeapon(0);
  }
  setWeapon(i){for(let s=0;s<2;s++)this.wp[s].forEach((o,k)=>{o.visible=k===i;});this.twoHand=i===2;this.aimHand=i===1;this.wset=i;}
  buildWarden(add){
    const M=this.mats,{hips,chest,head}=this,b=1.25;
    const A=(...a)=>{const m=add(...a);this.hide.push(m);return m;};          // armour shed in phase 2
    const HOT=(...a)=>{const m=add(...a);m.visible=false;m.castShadow=false;this.hot.push(m);return m;};
    add(hips,GB,M.armor,0,-.03,0,.4,.22,.3); add(hips,GB,M.trim,0,.09,0,.43,.06,.32);
    add(chest,cyl(.26,.18,.5),M.dark,0,.2,0,1,1,.78);
    A(chest,GB,M.armor,0,.3,.09,.44,.28,.2); A(chest,GB,M.armor,0,.08,.1,.26,.2,.08); A(chest,GB,M.armor,0,.28,-.12,.4,.32,.12);
    add(chest,GS,M.glow,0,.3,.14,.06,.09,.05);
    for(const sx of [-1,1]){
      A(chest,GS,M.armor,sx*.34,.45,0,.19,.15,.2); A(chest,cone(.07,.3,5),M.trim,sx*.44,.56,0,1,1,1,0,0,-sx*.8); A(chest,GS,M.trim,sx*.36,.52,0,.09,.06,.12);
      HOT(chest,GB,M.glow,sx*.1,.2,.165,.015,.3,.01,0,0,sx*.3); HOT(chest,GB,M.glow,sx*.16,.3,-.165,.015,.26,.01,0,0,-sx*.4);
    }
    add(chest,cyl(.1,.13,.1),M.armor,0,.49,0);
    add(head,GS,M.armor,0,.1,0,.12,.15,.135); add(head,GB,M.glow,0,.105,.122,.15,.02,.03); add(head,GB,M.armor,0,.03,.07,.13,.09,.11);
    for(let k=-2;k<=2;k++)add(head,cone(.02,.17,4),M.trim,k*.045,.28-abs(k)*.018,.02,1,1,1,0,0,-k*.14);
    this.addTails([PI-1,PI-.35,PI+.35,PI+1],capeGeo,M.cloth,.2,.15,.55);
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      add(ua,limb(.07*b,.06*b,ARM1),M.dark); add(fa,GS,M.armor,0,0,0,.07*b,.07*b,.07*b); add(fa,limb(.08*b,.06*b,ARM2),M.armor); A(fa,cyl(.1,.09,.1),M.trim,0,-.1,0);
      add(sw,GS,M.armor,0,0,0,.08,.08,.08); HOT(fa,GB,M.glow,0,-.15,.075,.012,.2,.01);
      add(ul,limb(.11*b,.085*b,LEG1),M.dark); add(ll,GS,M.trim,0,0,.02,.085,.085,.085); add(ll,limb(.09*b,.065*b,LEG2),M.armor); A(ul,GB,M.armor,sx*.03,-.2,.05,.17,.3,.16);
      add(ft,GB,M.armor,0,-.04,.07,.13,.1,.32); HOT(ll,GB,M.glow,0,-.22,.075,.012,.24,.01);
      if(s===1){add(sw,cyl(.028,.028,.34),M.dark,0,-.04,0); add(sw,GB,M.trim,0,.13,0,.36,.05,.08); add(sw,GB,M.blade,0,.92,0,.14,1.55,.03); add(sw,cone(.1,.3,4),M.blade,0,1.84,0,1,1,.3,0,PI/4,0); add(sw,GB,M.glow,0,.9,0,.03,1.5,.036);}
    }
  }
  buildFoe(add){
    const c=this.cfg,M=this.mats,brute=c.kind==='brute',stalk=c.kind==='stalker',b=brute?1.45:1,{hips,chest,head}=this;
    add(hips,GB,M.armor,0,-.03,0,.34*b,.22,.26*b);
    add(chest,cyl(.24*b,.15*b,.5),M.armor,0,.2,0,1,1,.8); add(chest,GS,M.armor,0,.34,-.04,.25*b,.2,.2*b);
    add(chest,GS,M.glow,0,.26,.13*b,.055*b,.075*b,.03);
    for(let k=0;k<4;k++)add(chest,cone(.05*b,.32+k*.05,4),M.trim,0,.1+k*.13,-.17*b,1,1,1,-1.2-k*.12,0,0);
    for(const sx of [-1,1]){add(chest,GS,M.armor,sx*.27*b,.42,0,.14*b,.12*b,.15*b); add(chest,cone(.05*b,.26,4),M.trim,sx*.33*b,.54,0,1,1,1,0,0,-sx*.7);}
    if(brute){add(head,GS,M.armor,0,.04,.03,.11,.11,.12); add(head,GB,M.glow,0,.05,.13,.12,.02,.02);}
    else if(stalk){add(head,GS,M.armor,0,.1,.03,.085,.12,.16); add(head,GB,M.glow,0,.1,.168,.02,.09,.02); add(head,cone(.04,.42,4),M.trim,0,.2,-.15,1,1,1,-1.9,0,0);}
    else{add(head,GS,M.armor,0,.1,.02,.095,.13,.14); add(head,GB,M.glow,.045,.1,.14,.03,.015,.02); add(head,GB,M.glow,-.045,.1,.14,.03,.015,.02);
      for(const sx of [-1,1])add(head,cone(.03,.3,4),M.trim,sx*.09,.24,-.03,1,1,1,-.5,0,-sx*.45);}
    for(let s=0;s<2;s++){const ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s],fb=brute?1.9:b;
      add(ua,limb(.06*b,.05*b,ARM1),M.armor); add(fa,GS,M.armor,0,0,0,.058*b,.058*b,.058*b); add(fa,limb(.066*fb,.05*fb,ARM2),M.armor);
      add(sw,GS,M.armor,0,0,0,.05*fb,.05*fb,.05*fb);
      add(ul,limb(.095*b,.07*b,LEG1),M.armor); add(ll,GS,M.armor,0,0,.02,.066*b,.066*b,.066*b); add(ll,limb(.076*b,.052*b,LEG2),M.armor);
      add(ft,GB,M.armor,0,-.04,.06,.1*b,.09,.27*b);
      if(brute){add(sw,GS,M.armor,0,-.05,0,.19,.19,.19); add(sw,GB,M.glow,0,-.05,0,.4,.035,.035); add(sw,GB,M.glow,0,-.05,0,.035,.035,.4);}
      else if(s===1||stalk){add(sw,cone(.08,1.05,4),M.armor,0,.52,0,1,1,.3,0,PI/4,0); add(sw,GB,M.glow,0,.45,0,.012,.85,.034);}
      else{for(let k=-1;k<=1;k++)add(sw,cone(.016,.2,4),M.trim,k*.035,.1,0,1,1,1);}
    }
  }
  play(clip,blend=.08,force=false){
    if(this.clip===clip&&!force)return; this.from.set(this.cur);
    this.from[I.rot]=wrapA(this.from[I.rot]); this.from[I.rot+1]=wrapA(this.from[I.rot+1]); this.from[I.rot+2]=wrapA(this.from[I.rot+2]);
    this.clip=clip;this.t=0;this.bt=0;this.bd=blend;
  }
  update(dt){
    this.t+=dt*this.speed;this.bt+=dt;const tmp=this.tmp,cur=this.cur;
    this.clip.fn(this.t,tmp,this);
    if(this.air>.01&&!this.clip.noAir){const a=this.air;tmp[I.fl+1]+=.34*a;tmp[I.fl+2]+=.1*a;tmp[I.fr+1]+=.14*a;tmp[I.fr+2]-=.08*a;}
    if(this.post)this.post(tmp,this.clip);
    if(this.bt<this.bd){const k=smooth(this.bt/this.bd),f=this.from;for(let i=0;i<PN;i++)cur[i]=f[i]+(tmp[i]-f[i])*k;}else cur.set(tmp);
    this.apply(dt);
  }
  apply(dt){
    const p=this.cur,{body,hips,chest,head}=this;
    body.rotation.set(p[1],p[2],p[3]); _a.set(0,PIV,0).applyQuaternion(body.quaternion); body.position.set(-_a.x,p[0]+PIV-_a.y,-_a.z);
    hips.position.set(0,HIPH+p[4],p[5]); hips.rotation.set(p[6],p[7],p[8]); chest.rotation.set(p[9],p[10],p[11]); head.rotation.set(p[12],p[13],p[14]);
    for(let s=0;s<2;s++){const sx=s?-1:1;
      // arm
      _a.set(sx*SHX,SHY,0); const hi=I.hl+s*3; _b.set(p[hi],p[hi+1],p[hi+2]);
      const bi=I.sl+s*3,bl=_c.set(p[bi],p[bi+1],p[bi+2]); if(bl.lengthSq()<1e-6)bl.set(0,-1,0); bl.normalize();
      if(s===0){
        if(this.twoHand){_d.set(p[I.sr],p[I.sr+1],p[I.sr+2]).normalize(); _b.set(p[I.hr],p[I.hr+1],p[I.hr+2]).addScaledVector(_d,.42); bl.copy(_d);}
        else if(this.aimW>.001){_q.copy(hips.quaternion).multiply(chest.quaternion).invert(); _d.copy(this.aimDir).applyQuaternion(_q).normalize();
          _e.copy(_a).addScaledVector(_d,.56); _b.lerp(_e,this.aimW); bl.lerp(_d,this.aimW).normalize();}
      }
      const ua=this.arm[s],fa=this.fore[s]; _d.set(sx*.5,-.8,-.45); ik2(_a,_b,ARM1,ARM2,_d,ua.quaternion,fa.quaternion);
      const ed=this.edge[s];
      if(s===0&&this.aimHand){ed.crossVectors(bl,DOWN); if(ed.lengthSq()<.02)ed.set(1,0,0);}
      else{const tip=_d.copy(_b).addScaledVector(bl,1.1),vel=_e.subVectors(tip,this.tipPrev[s]); this.tipPrev[s].copy(tip);
        if(vel.lengthSq()>4e-5){vel.addScaledVector(bl,-vel.dot(bl));if(vel.lengthSq()>1e-6){vel.normalize();if(vel.dot(ed)<0)vel.negate();ed.lerp(vel,.4);}}}
      ed.addScaledVector(bl,-ed.dot(bl)); if(ed.lengthSq()<1e-6)ed.set(1,0,0).addScaledVector(bl,-bl.x); ed.normalize();
      _f.crossVectors(ed,bl); _m4.makeBasis(ed,bl,_f); _q.setFromRotationMatrix(_m4);
      _q2.copy(ua.quaternion).multiply(fa.quaternion).invert(); this.sword[s].quaternion.copy(_q2).multiply(_q);
      // leg
      const ul=this.leg[s],ll=this.shin[s]; _a.set(sx*HIPX,-.05,0).applyQuaternion(hips.quaternion).add(hips.position); ul.position.copy(_a);
      const fi=I.fl+s*3; _b.set(p[fi],p[fi+1]+ANK,p[fi+2]); _d.set(sx*.22,0,1);
      ik2(_a,_b,LEG1,LEG2,_d,ul.quaternion,ll.quaternion);
      _q2.copy(ul.quaternion).multiply(ll.quaternion).invert(); _q.setFromAxisAngle(XAX,clamp(p[fi+1]*1.6,0,.75)); this.foot[s].quaternion.copy(_q2).multiply(_q);
    }
    if(this.tails){
      const lv=this.lv,sp=min(30,abs(p[I.rot+1]-this.pry)/max(dt,1e-4)); this.pry=p[I.rot+1]; this.tt+=dt;
      const spd=hypot(lv.x,lv.z);
      for(const tl of this.tails){const nx=sin(tl.a),nz=cos(tl.a);
        const tg=clamp(this.tailBase-(nx*lv.x+nz*lv.z)*.085-this.vy*.05+sp*.05+sin(this.tt*(7+spd)+tl.a*3)*.05*(1+spd*.25),-.12,1.4);
        tl.v=damp(tl.v,tg,11,dt); tl.v2=damp(tl.v2,tg,5,dt); tl.pv.rotation.x=-tl.v; tl.s2.rotation.x=-tl.v2*.55+(tl.v-tl.v2)*.5;}
    }
  }
}
