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
const _w=V(),_fd=V(),_xh=V(),_yh=V(),_zh=V(),_zw=V(),_pole=V(),_rt=V();
// turn v about the axis ax by the fraction k of its angle to t (v and t both perpendicular to ax)
const rollTo=(v,t,ax,k)=>{const an=atan2(_rt.crossVectors(v,t).dot(ax),v.dot(t))*k;if(abs(an)>1e-5)v.applyQuaternion(_q.setFromAxisAngle(ax,an));};
// blend a direction channel along the arc instead of the chord, so a blade swings round at an even rate instead of snapping through the middle
function slerp3(o,i,a,b,k){
  const la=hypot(a[i],a[i+1],a[i+2])||1,lb=hypot(b[i],b[i+1],b[i+2])||1,c=(a[i]*b[i]+a[i+1]*b[i+1]+a[i+2]*b[i+2])/(la*lb);if(c>.9995||c<-.9995)return;
  const w=Math.acos(c),sn=sin(w),ka=sin((1-k)*w)/sn/la,kb=sin(k*w)/sn/lb;for(let j=0;j<3;j++)o[i+j]=a[i+j]*ka+b[i+j]*kb;}
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
const GR=new RoundedBoxGeometry(1,1,1,1,.12);                                        // unit plate with eased edges: catches a highlight on every rim
const tassetGeo=new RoundedBoxGeometry(.21,.42,.028,1,.012).translate(0,-.21,0);     // hinged skirt plate (hero)
const mantleGeo=new RoundedBoxGeometry(.3,.55,.04,1,.018).translate(0,-.275,0);      // lamellar mantle strip (warden)
// single-edged blade outline with a clipped point, extruded thin with a bevel so it has a real edge. Grip at the origin, blade along +Y.
const bladeGeo=(len,wid)=>{const k='b'+len+wid;if(geoCache[k])return geoCache[k];const s=new THREE.Shape();s.moveTo(-wid*.5,0);s.lineTo(wid*.5,0);s.lineTo(wid*.5,len*.72);s.quadraticCurveTo(wid*.44,len*.93,-wid*.36,len+.16);s.lineTo(-wid*.5,len*.9);s.closePath();
  return geoCache[k]=new THREE.ExtrudeGeometry(s,{depth:.004,bevelEnabled:true,bevelThickness:.005,bevelSize:.014,bevelSegments:1,curveSegments:6}).translate(0,0,-.002);};
const BAKED=new Map();
// lofted shell: rings [y, rx, rz, cx, cz] stacked along Y, each a superellipse (ex 2 = ellipse, higher = boxier), closed at both ends.
// This is what gives the characters smooth, sculpted shells instead of boxes and tubes.
const loft=(rings,seg=14,ex=2.4)=>{const key='L'+seg+ex+rings.join('|');if(geoCache[key])return geoCache[key];
  const n=rings.length,pos=[],uv=[],idx=[],W=seg+1,up=rings[n-1][0]>rings[0][0],pw=2/ex;
  for(let j=0;j<n;j++){const [y,rx,rz,cx=0,cz=0]=rings[j];for(let i=0;i<=seg;i++){const a=i/seg*TAU,c=cos(a),s=sin(a);
    pos.push(cx+rx*Math.sign(c)*pow(abs(c),pw),y,cz+rz*Math.sign(s)*pow(abs(s),pw));uv.push(i/seg,j/(n-1));}}
  for(let j=0;j<n-1;j++)for(let i=0;i<seg;i++){const a=j*W+i,b=a+W;if(up)idx.push(a,b,a+1,b,b+1,a+1);else idx.push(a,a+1,b,b,a+1,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const nr=g.attributes.normal;for(let j=0;j<n;j++){const a=j*W,b=a+seg,x=nr.getX(a)+nr.getX(b),y=nr.getY(a)+nr.getY(b),z=nr.getZ(a)+nr.getZ(b),l=hypot(x,y,z)||1;nr.setXYZ(a,x/l,y/l,z/l);nr.setXYZ(b,x/l,y/l,z/l);}
  // flat caps on their own vertices
  const cp=[],cu=[],cn=[],ci=[];for(const [j,top] of [[0,!up],[n-1,up]]){const [y,rx,rz,cx=0,cz=0]=rings[j],o=cp.length/3;cp.push(cx,y,cz);cu.push(.5,.5);cn.push(0,top?1:-1,0);
    for(let i=0;i<=seg;i++){const k=(j*W+i)*3;cp.push(pos[k],pos[k+1],pos[k+2]);cu.push(.5+cos(i/seg*TAU)*.5,.5+sin(i/seg*TAU)*.5);cn.push(0,top?1:-1,0);}
    for(let i=0;i<seg;i++)top?ci.push(o,o+2+i,o+1+i):ci.push(o,o+1+i,o+2+i);}
  const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(cp,3));cg.setAttribute('uv',new THREE.Float32BufferAttribute(cu,2));cg.setAttribute('normal',new THREE.Float32BufferAttribute(cn,3));cg.setIndex(ci);
  return geoCache[key]=mergeGeometries([g.toNonIndexed(),cg.toNonIndexed()],false);};
// a ring lying flat (axis Y), or upright facing +Z when flat=0
const ringGeo=(R,t,flat=1)=>{const k='r'+R+t+flat;if(geoCache[k])return geoCache[k];const g=new THREE.TorusGeometry(R,t,8,20);if(flat)g.rotateX(PI/2);return geoCache[k]=g;};
// part of a ring round the Y axis: a finger curled round a grip. a0 = start angle (0 = +X, quarter turn = +Z), len = sweep
const arcGeo=(R,t,a0,len)=>{const k='a'+R+t+a0+len;if(geoCache[k])return geoCache[k];return geoCache[k]=new THREE.TorusGeometry(R,t,6,12,len).rotateX(PI/2).rotateY(-a0);};
// bevelled plate from a 2D outline (faces +Z): gives armour its angular silhouettes
const plate=(pts,d=.03,bv=.012)=>{const k='p'+pts.join()+d+bv;if(geoCache[k])return geoCache[k];const s=new THREE.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));s.closePath();
  return geoCache[k]=new THREE.ExtrudeGeometry(s,{depth:max(.001,d-bv*2),bevelEnabled:true,bevelThickness:bv,bevelSize:bv,bevelSegments:1}).translate(0,0,-max(.001,d-bv*2)/2);};
const P_CHEST=[[-.2,.12],[.2,.12],[.15,-.1],[0,-.17],[-.15,-.1]],P_AB=[[-.1,.04],[.1,.04],[.08,-.04],[-.08,-.04]],P_BACK=[[-.19,.14],[.19,.14],[.12,-.17],[-.12,-.17]],
  P_THIGH=[[-.07,.14],[.07,.14],[.05,-.17],[-.05,-.17]],P_KNEE=[[-.05,.06],[.05,.06],[.06,0],[0,-.08],[-.06,0]],P_TASSET=[[-.075,0],[.075,0],[.065,-.28],[0,-.4],[-.065,-.28]];

const SPR=[I.ch,I.ch+1,I.ch+2,I.hd,I.hd+1,I.hd+2];   // pose channels that get spring follow-through
class Rig{
  constructor(cfg){
    const c=this.cfg=Object.assign({scale:1,kind:'hero'},cfg); this.mats=c.mats;
    const root=this.root=new THREE.Group(), body=this.body=new THREE.Group(); root.add(body); root.scale.setScalar(c.scale); body.rotation.order='YXZ';
    const hips=this.hips=new THREE.Group(); hips.rotation.order='YXZ'; body.add(hips);
    const chest=this.chest=new THREE.Group(); chest.rotation.order='YXZ'; chest.position.y=.14; hips.add(chest);
    const head=this.head=new THREE.Group(); head.rotation.order='YXZ'; head.position.y=.56; chest.add(head);
    this.arm=[];this.fore=[];this.sword=[];this.hand=[];this.leg=[];this.shin=[];this.foot=[];this.gripD=[0,0];this.palm=[V(0,-.4,.9).normalize(),V(0,-.4,.9).normalize()];this.gz=[V(0,0,1),V(0,0,1)];this.gb=[V(0,1,0),V(0,1,0)];this.gc=[0,0];
    for(let s=0;s<2;s++){const sx=s?-1:1;
      const ua=new THREE.Group(); ua.position.set(sx*SHX,SHY,0); chest.add(ua);
      const fa=new THREE.Group(); fa.position.y=-ARM1; ua.add(fa);
      const sw=new THREE.Group(); sw.position.y=-ARM2; fa.add(sw); const hd=new THREE.Group(); hd.position.y=-ARM2; fa.add(hd); this.hand.push(hd);
      const ul=new THREE.Group(); body.add(ul); const ll=new THREE.Group(); ll.position.y=-LEG1; ul.add(ll); const ft=new THREE.Group(); ft.position.y=-LEG2; ll.add(ft);
      this.arm.push(ua);this.fore.push(fa);this.sword.push(sw);this.leg.push(ul);this.shin.push(ll);this.foot.push(ft);
    }
    this.cur=new Float32Array(PN);this.from=new Float32Array(PN);this.tmp=new Float32Array(PN);this.spx=new Float32Array(PN);this.spv=new Float32Array(PN);this.spOn=false;
    this.edge=[V(1,0,0),V(1,0,0)];this.tipPrev=[V(),V()];
    this.phase=0;this.seed=rand(10);this.air=0;this.vy=0;this.lv=V();this.pry=0;this.tt=0;this.clip=null;this.t=0;this.bt=0;this.bd=0;
    this.speed=1;this.twoHand=false;this.aimHand=false;this.aimW=0;this.aimDir=V(0,0,1);this.post=null;this.wp=[[],[]];this.hide=[];this.hot=[];this.tailBase=.14;
    const add=(par,geo,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);m.castShadow=true;par.add(m);return m;};
    if(c.kind==='hero')this.buildHero(add);else if(c.kind==='warden')this.buildWarden(add);else this.buildFoe(add);
    this.bake();
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
  // ---------- models: every character is a machine, assembled from rounded plates, joints, pistons and cable ----------
  buildHero(add){
    const M=this.mats,{hips,chest,head}=this,A=M.shell,B=M.shell2,F=M.frame,J=M.steel,R=M.rubber,GL=M.glow;
    const sd=(rings,sx)=>rings.map(r=>[r[0],r[1],r[2],(r[3]||0)*sx,r[4]||0]);   // mirror the sideways offsets of a loft
    this.gripD=[.07,.07];
    // pelvis: dark frame, waist ring, a blue-grey girdle with a white centre tab, hip actuators
    add(hips,loft([[-.13,.05,.055],[-.07,.105,.085],[0,.12,.09],[.06,.105,.082]]),F); add(hips,cyl(.098,.104,.04),J,0,.085,0,1,1,.8);
    add(hips,loft([[-.165,.028,.03,0,.03],[-.1,.068,.05,0,.05],[-.03,.104,.058,0,.052],[.04,.116,.05,0,.04],[.072,.1,.04,0,.034]],14,3),B);
    add(hips,loft([[-.11,.06,.04,0,-.05],[-.02,.104,.05,0,-.05],[.055,.1,.045,0,-.04]],14,3),B);
    add(hips,plate([[-.036,.05],[.036,.05],[.028,-.06],[0,-.095],[-.028,-.06]],.022,.006),A,0,-.025,.1,1,1,1,.12); add(hips,GB,GL,0,-.02,.114,.012,.05,.006,.12);
    for(const sx of [-1,1]){add(hips,cyl(.058,.058,.05),J,sx*.1,-.05,0,1,1,1,0,0,PI/2); add(hips,loft([[-.1,.014,.04],[-.03,.022,.07],[.05,.02,.06]],10,3),A,sx*.15,0,0,1,1,1,0,0,-sx*.12);}
    // torso: ribbed waist with pistons, dark rib cage, a white yoke front and back, collar ring, neck
    add(chest,loft([[-.02,.08,.066],[.05,.068,.056],[.12,.076,.062],[.18,.1,.078]]),R);
    for(const sx of [-1,1]){add(chest,cyl(.009,.009,.2),J,sx*.078,.08,.05,1,1,1,.08,0,-sx*.06); add(chest,cyl(.009,.009,.2),J,sx*.06,.08,-.064,1,1,1,-.08,0,-sx*.05);}
    add(chest,loft([[.14,.09,.07],[.24,.142,.1],[.34,.17,.11],[.42,.158,.098],[.47,.1,.075]]),F);
    add(chest,loft([[.185,.035,.03,0,.072],[.25,.095,.05,0,.074],[.32,.15,.066,0,.064],[.39,.186,.076,0,.046],[.446,.192,.08,0,.02],[.478,.15,.07,0,.004]],16,3.2),A);
    add(chest,loft([[.2,.06,.03,0,-.07],[.28,.125,.046,0,-.076],[.38,.176,.06,0,-.06],[.446,.186,.066,0,-.036],[.472,.14,.06,0,-.02]],16,3.2),A);
    add(chest,ringGeo(.072,.017),B,0,.482,0); add(chest,cyl(.036,.044,.1),R,0,.525,0); add(chest,ringGeo(.022,.0055,0),GL,0,.365,.128,1,1,1,-.1);
    add(chest,plate([[-.05,.03],[.05,.03],[.03,-.03],[0,-.05],[-.03,-.03]],.016,.005),B,0,.27,.123,1,1,1,-.16);
    for(let k=0;k<5;k++)add(chest,GR,J,0,.035+k*.036,-.082,.044,.028,.03);
    for(const sx of [-1,1]){
      add(chest,cyl(.044,.044,.07),J,sx*.19,SHY,0,1,1,1,0,0,PI/2); add(chest,GS,F,sx*SHX,SHY,0,.05,.05,.05); add(chest,cyl(.007,.007,.1),J,sx*.03,.525,-.03,1,1,1,.12);
      for(let k=0;k<2;k++)add(chest,GR,J,sx*.15,.235+k*.05,0,.018,.018,.15);
      add(chest,cyl(.022,.022,.012),J,sx*.118,.41,.108,1,1,1,PI/2-.25,0,-sx*.3); add(chest,cyl(.012,.012,.016),F,sx*.118,.41,.109,1,1,1,PI/2-.25,0,-sx*.3);
      add(chest,loft([[0,.016,.012],[.07,.03,.02],[.2,.028,.018],[.27,.01,.008]],8,3),B,sx*.085,.21,-.125,1,1,1,-.3,0,sx*.14); add(chest,GB,GL,sx*.097,.33,-.172,.01,.11,.008,-.3,0,sx*.14);
    }
    // head: smooth white helm over a dark visor, slanted eye slits, chin guard, ear discs with swept fins
    add(head,loft([[0,.04,.05,0,-.005],[.04,.068,.084],[.1,.082,.1],[.155,.077,.096,0,-.008],[.195,.055,.07,0,-.02],[.213,.02,.03,0,-.03]],16,2.3),A);
    add(head,GS,M.visor||F,0,.078,.06,.066,.06,.052); add(head,loft([[-.012,.028,.03,0,.04],[.018,.05,.04,0,.05],[.044,.056,.034,0,.056]],12,2.6),B);
    for(const sx of [-1,1]){add(head,GB,GL,sx*.03,.09,.108,.038,.009,.012,0,-sx*.25,sx*.28); add(head,cyl(.03,.03,.018),J,sx*.083,.095,-.006,1,1,1,0,0,PI/2); add(head,cyl(.014,.014,.022),F,sx*.084,.095,-.006,1,1,1,0,0,PI/2);
      add(head,plate([[0,-.014],[.15,.03],[.19,.062],[.02,.02]],.012,.004),B,sx*.094,.1,-.01,1,1,1,0,PI/2+sx*.16,0);}
    add(head,GB,GL,0,.172,.078,.008,.03,.012,-.5);
    // coat tails: four slender blades hinged at the back of the belt
    this.addTails([PI-.95,PI-.32,PI+.32,PI+.95],plate([[-.046,0],[.046,0],[.036,-.25],[0,-.35],[-.036,-.25]],.018,.006),B,.125,.1,.27); this.tailBase=.06;
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],hd=this.hand[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      // arm: round pauldron with a side port, sleeved upper arm, flared bracer, ball wrist
      add(ua,limb(.034,.03,ARM1),F); add(ua,loft(sd([[.064,.02,.022,.004],[.04,.05,.054,.01],[-.01,.064,.068,.014],[-.07,.058,.062,.012],[-.118,.042,.046,.006]],sx)),A);
      add(ua,cyl(.026,.026,.012),J,sx*.078,-.012,0,1,1,1,0,0,PI/2); add(ua,cyl(.015,.015,.016),F,sx*.079,-.012,0,1,1,1,0,0,PI/2);
      add(ua,loft([[-.1,.038,.042],[-.16,.046,.05],[-.24,.041,.044],[-.288,.032,.035]]),B); add(ua,cyl(.008,.008,.16),J,0,-.19,-.046);
      add(fa,cyl(.04,.04,.078),J,0,0,0,1,1,1,0,0,PI/2); add(fa,cyl(.022,.022,.084),F,0,0,0,1,1,1,0,0,PI/2); add(fa,limb(.028,.024,ARM2),F);
      add(fa,loft(sd([[-.035,.03,.034,.004,-.004],[-.09,.048,.054,.008,-.006],[-.17,.046,.05,.006,-.004],[-.235,.036,.04,.002],[-.262,.029,.032]],sx)),A);
      add(fa,GR,B,sx*.05,-.14,-.004,.014,.13,.05); add(fa,GB,GL,sx*.059,-.14,0,.006,.09,.012); add(fa,cyl(.03,.03,.016),J,0,-.274,0); add(fa,GS,F,0,-ARM2,0,.027,.027,.027);
      // hand, built round the grip axis (Y): palm block behind, four fingers and a thumb wrapped round, knuckle guard in front
      add(hd,GR,F,0,0,-.037,.056,.084,.03); add(hd,GR,A,0,-.004,.045,.05,.078,.012);
      for(let k=0;k<4;k++)add(hd,arcGeo(.031,.0085,s?-.6:-.87,4.6),J,0,-.03+k*.02,0);
      add(hd,arcGeo(.031,.0095,s?-.2:1.4,1.95),J,0,.052,0);
      // leg: big smooth thigh shell, disc knee, shin shell over an open strutted calf, pointed foot with a heel spur
      add(ul,GS,J,0,0,0,.062,.062,.062); add(ul,limb(.05,.042,LEG1),F,0,0,-.012);
      add(ul,loft(sd([[.035,.05,.055,.01],[-.04,.086,.096,.014,.006],[-.14,.09,.1,.012,.012],[-.26,.076,.086,.005,.01],[-.37,.058,.066,0,.006],[-.43,.046,.052]],sx),16),A);
      add(ul,loft([[-.37,.05,.03,0,.03],[-.41,.058,.036,0,.03],[-.45,.05,.03,0,.026]],12,3),B); add(ul,cyl(.011,.011,.3),J,sx*.02,-.25,-.075,1,1,1,.06);
      add(ll,cyl(.054,.054,.128),J,0,0,0,1,1,1,0,0,PI/2); add(ll,cyl(.034,.034,.134),F,0,0,0,1,1,1,0,0,PI/2); add(ll,limb(.034,.028,LEG2),F,0,0,-.022);
      add(ll,loft([[-.02,.044,.04,0,.02],[-.1,.06,.062,0,.024],[-.22,.052,.056,0,.016],[-.34,.04,.044,0,.008],[-.43,.031,.034]],14),A);
      add(ll,cyl(.009,.009,.3),J,sx*.022,-.23,-.062,1,1,1,-.1); add(ll,cyl(.009,.009,.3),J,-sx*.022,-.23,-.062,1,1,1,-.1); add(ll,GR,J,0,-.1,-.06,.07,.02,.03); add(ll,GR,J,0,-.3,-.045,.06,.018,.026);
      add(ll,GB,GL,sx*.058,-.2,.02,.006,.15,.012); add(ll,cyl(.036,.036,.02),J,0,-.44,0);
      add(ft,cyl(.032,.032,.072),J,0,0,0,1,1,1,0,0,PI/2); add(ft,loft([[0,.03,.026],[.05,.044,.034],[.13,.04,.028],[.2,.022,.014],[.226,.008,.006]],12,2.6),A,0,-.02,-.012,1,1,1,1.875);
      add(ft,GR,F,0,-.08,.095,.066,.016,.2); add(ft,cone(.017,.12,5),J,0,-.045,-.052,1,1,1,PI+.6); add(ft,loft([[-.03,.03,.02],[.02,.036,.026],[.06,.026,.018]],10,3),B,0,-.01,-.04);
    }
    const grp=s=>{const o=new THREE.Group();this.sword[s].add(o);return o;};
    // weapons are modelled with the grip at the origin and the blade (or barrel, or hammer head) along +Y
    const blade=(o,len,wid)=>{
      add(o,cyl(.019,.019,.19),R,0,-.015,0); add(o,cyl(.025,.021,.03),J,0,-.125,0); add(o,GR,J,0,.092,0,wid*2.6,.022,.042); add(o,cyl(.03,.03,.03),B,0,.115,0,1,1,.6);
      add(o,bladeGeo(len,wid),M.blade,0,.11,0); add(o,GB,GL,-wid*.12,.14+len*.4,0,.01,len*.78,.016);
    };
    for(let s=0;s<2;s++){this.wp[s][0]=grp(s); blade(this.wp[s][0],1.02,.07);}
    this.wp[1][1]=grp(1); blade(this.wp[1][1],1.34,.088);
    const g=this.wp[0][1]=grp(0);   // pistol: barrel along +Y, top of the gun toward -Z, the hand wraps the raked handle at the origin
    add(g,GR,R,0,-.004,.014,.03,.042,.11,.2); add(g,GR,J,0,.09,-.056,.034,.27,.05); add(g,GR,F,0,.12,-.024,.028,.2,.024); add(g,cyl(.012,.012,.034),F,0,.236,-.056);
    add(g,GR,F,0,.05,.018,.012,.012,.05); add(g,GR,F,0,.074,.0,.012,.05,.012); add(g,GB,GL,0,.09,-.083,.008,.16,.006); for(let k=0;k<3;k++)add(g,GB,F,0,.01+k*.022,-.056,.037,.008,.04);
    this.wp[0][2]=grp(0);
    const m=this.wp[1][2]=grp(1);   // maul: the right hand holds it at the origin, the left further down the shaft; head at +Y
    add(m,cyl(.021,.021,1.62),F,0,.2,0); add(m,cyl(.024,.024,.22),R,0,0,0); add(m,cyl(.024,.024,.4),R,0,-.4,0); add(m,GS,J,0,-.64,0,.036,.036,.036); add(m,cyl(.03,.03,.05),J,0,.16,0); add(m,cyl(.03,.03,.05),J,0,.72,0);
    add(m,GR,J,0,.98,0,.5,.26,.26); add(m,GR,B,.26,.98,0,.04,.3,.3); add(m,GR,B,-.26,.98,0,.04,.3,.3); add(m,cyl(.062,.062,.34),F,0,.98,0,1,1,1,PI/2);
    add(m,GB,GL,0,.98,.132,.34,.026,.008); add(m,GB,GL,0,.98,-.132,.34,.026,.008); add(m,GB,GL,0,1.112,0,.34,.008,.026); add(m,cone(.055,.2,4),J,0,1.2,0);
    add(m,cyl(.026,.026,.24),J,.13,.8,0); add(m,cyl(.026,.026,.24),J,-.13,.8,0);
    this.setWeapon(0);
  }
  setWeapon(i){for(let s=0;s<2;s++)this.wp[s].forEach((o,k)=>{o.visible=k===i;});this.twoHand=i===2?-.42:0;this.aimHand=i===1;this.wset=i;}
  // The Gatewarden: a knight of layered plate over a dark frame. Everything added with A() is armour it sheds in phase 2;
  // HOT() parts are the glowing seams that show once it has.
  buildWarden(add){
    const M=this.mats,{hips,chest,head}=this,D=M.dark,T=M.trim;
    const A=(...a)=>{const m=add(...a);m.userData.keep=true;this.hide.push(m);return m;};
    const HOT=(...a)=>{const m=add(...a);m.userData.keep=true;m.visible=false;m.castShadow=false;this.hot.push(m);return m;};
    const L=(par,rings,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0,ex=3,seg=12)=>add(par,loft(rings,seg,ex),mat,x,y,z,1,1,1,rx,ry,rz);
    const LA=(par,rings,x=0,y=0,z=0,rx=0,ry=0,rz=0,ex=3.2,seg=12)=>A(par,loft(rings,seg,ex),M.armor,x,y,z,1,1,1,rx,ry,rz);
    L(hips,[[-.14,.07,.07],[-.05,.15,.11],[.05,.15,.11],[.1,.11,.09]],D); add(hips,cyl(.15,.16,.06),T,0,.1,0,1,1,.8);
    LA(hips,[[-.27,.05,.03,0,.09],[-.14,.1,.05,0,.115],[0,.145,.06,0,.1],[.07,.13,.05,0,.08]]);
    L(chest,[[-.02,.11,.09],[.06,.09,.075],[.15,.12,.1]],M.rubber); L(chest,[[.1,.13,.1],[.24,.2,.15],[.38,.22,.155],[.48,.18,.12],[.53,.11,.09]],D);
    LA(chest,[[.12,.08,.04,0,.12],[.22,.17,.08,0,.13],[.36,.225,.1,0,.11],[.47,.2,.09,0,.07],[.52,.12,.06,0,.04]],0,0,0,0,0,0,3.4,14);
    LA(chest,[[.14,.1,.05,0,-.12],[.28,.2,.09,0,-.14],[.42,.22,.09,0,-.11],[.52,.13,.06,0,-.07]],0,0,0,0,0,0,3.4,14);
    A(chest,ringGeo(.115,.032),T,0,.525,0); add(chest,cyl(.07,.07,.03),T,0,.3,.2,1,1,1,PI/2); add(chest,GS,M.glow,0,.3,.215,.045,.045,.02);
    add(chest,plate([[-.07,.05],[.07,.05],[.04,-.04],[0,-.09],[-.04,-.04]],.02,.006),T,0,.42,.2,1,1,1,-.25);
    for(let k=0;k<5;k++)add(chest,GR,T,0,.1+k*.08,-.165,.06,.05,.05);
    for(const sx of [-1,1]){
      LA(chest,[[0,.045,.11],[.1,.066,.17],[.22,.05,.14],[.3,.015,.05]],sx*.19,.53,0,0,0,-sx*1.8);
      LA(chest,[[0,.035,.1],[.08,.05,.15],[.18,.036,.12],[.25,.01,.04]],sx*.3,.42,0,0,0,-sx*2.2);
      A(chest,cone(.055,.3,5),T,sx*.38,.62,0,1,1,1,0,0,-sx*.8); add(chest,GS,T,sx*SHX,SHY,0,.085,.085,.085);
      HOT(chest,GB,M.glow,sx*.1,.2,.145,.015,.3,.01,0,0,sx*.3); HOT(chest,GB,M.glow,sx*.14,.3,-.15,.015,.26,.01,0,0,-sx*.4);
      add(chest,cyl(.02,.02,.3),T,sx*.14,.2,-.15,1,1,1,.2);
    }
    add(chest,cyl(.08,.1,.1),M.rubber,0,.53,0);
    // helm: tall dome, visor slit, face guard, brow, a crown of spikes
    L(head,[[-.02,.07,.08],[.05,.105,.12],[.12,.1,.12,0,-.01],[.2,.07,.09,0,-.02],[.24,.03,.04,0,-.03]],M.armor,0,0,0,0,0,0,2.8,14);
    add(head,GR,D,0,.1,.1,.17,.05,.06); add(head,GB,M.glow,0,.1,.128,.15,.02,.02); L(head,[[-.03,.05,.04,0,.07],[.03,.08,.05,0,.08],[.066,.085,.04,0,.085]],M.armor);
    add(head,GR,T,0,.14,.092,.2,.022,.1,-.3);
    for(let k=-2;k<=2;k++)add(head,cone(.02,.2,4),T,k*.045,.31-abs(k)*.022,0,1,1,1,0,0,-k*.14);
    for(const sx of [-1,1])add(head,cyl(.04,.04,.04),T,sx*.108,.1,0,1,1,1,0,0,PI/2);
    this.addTails([PI-1,PI-.35,PI+.35,PI+1],mantleGeo,M.cloth,.2,.15,.55);
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      add(ua,limb(.055,.048,ARM1),D); LA(ua,[[.03,.06,.065],[-.08,.09,.095],[-.2,.075,.08],[-.27,.05,.055]],sx*.02); add(ua,cyl(.016,.016,.22),T,-sx*.05,-.15,-.05);
      add(fa,cyl(.07,.07,.15),T,0,0,0,1,1,1,0,0,PI/2); add(fa,limb(.05,.042,ARM2),D); LA(fa,[[-.03,.06,.065],[-.12,.095,.1],[-.24,.085,.09],[-.3,.06,.065]],sx*.01);
      add(fa,cyl(.062,.062,.03),T,0,-.29,0); HOT(fa,GB,M.glow,0,-.15,.058,.012,.2,.01); add(sw,GR,D,0,0,0,.11,.12,.11);
      add(ul,GS,T,0,0,0,.085,.085,.085); add(ul,limb(.075,.06,LEG1),D); LA(ul,[[.03,.07,.075],[-.1,.115,.12,sx*.015,.012],[-.3,.095,.1,0,.012],[-.43,.07,.075]]); add(ul,cyl(.018,.018,.32),T,sx*.02,-.22,-.085);
      add(ll,cyl(.08,.08,.19),T,0,0,0,1,1,1,0,0,PI/2); LA(ll,[[.08,.055,.03,0,.075],[0,.08,.04,0,.09],[-.08,.055,.03,0,.08]]);
      add(ll,limb(.055,.045,LEG2),D); LA(ll,[[-.05,.065,.07],[-.18,.085,.095],[-.36,.075,.085,0,.008],[-.45,.06,.07,0,.01]]); add(ll,cyl(.02,.02,.3),T,0,-.24,-.085);
      HOT(ll,GB,M.glow,0,-.22,.06,.012,.24,.01);
      L(ft,[[-.09,.085,.14,0,.05],[-.04,.08,.13,0,.05],[.01,.06,.08,0,.02]],M.armor,0,0,0,0,0,0,3.4); add(ft,GR,D,0,-.08,.05,.15,.02,.33); add(ft,GR,T,0,-.07,.19,.15,.04,.05);
      if(s===1){add(sw,cyl(.028,.028,.34),M.rubber,0,-.04,0); add(sw,GR,T,0,.13,0,.36,.05,.08); add(sw,cyl(.05,.05,.07),T,0,.19,0,1,1,.6); add(sw,bladeGeo(1.62,.15),M.blade,0,.16,0); add(sw,GB,M.glow,-.02,.9,0,.03,1.4,.03);}
    }
  }
  buildFoe(add){
    const k=this.cfg.kind,M=this.mats;
    const L=(par,rings,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0,ex=2.6,seg=12)=>add(par,loft(rings,seg,ex),mat,x,y,z,1,1,1,rx,ry,rz);
    if(k==='brute')this.buildBrute(add,L,M);else if(k==='stalker')this.buildStalker(add,L,M);else this.buildHusk(add,L,M);
  }
  // Husk: a gaunt skeletal soldier. Bone-coloured plates over thin struts, swept shoulder guards, a blade arm and a claw hand.
  buildHusk(add,L,M){
    const {hips,chest,head}=this,A=M.armor,T=M.trim,F=M.frame,R=M.rubber,G=M.glow;
    L(hips,[[-.12,.05,.05],[-.05,.1,.08],[.03,.11,.085],[.08,.09,.07]],F); add(hips,cyl(.095,.1,.04),T,0,.085,0,1,1,.8);
    L(hips,[[-.17,.025,.03,0,.04],[-.1,.06,.05,0,.05],[-.02,.085,.05,0,.045],[.05,.08,.04,0,.035]],A,0,0,0,0,0,0,3);
    L(chest,[[-.02,.065,.055],[.06,.05,.045],[.14,.07,.06]],R); L(chest,[[.1,.085,.07],[.22,.15,.11],[.34,.18,.125],[.44,.155,.105],[.49,.09,.07]],F);
    for(const sx of [-1,1]){
      add(chest,cyl(.01,.01,.2),T,sx*.06,.06,.045,1,1,1,.1,0,-sx*.1);
      L(chest,[[.19,.03,.03],[.27,.085,.055],[.36,.1,.062],[.44,.085,.05],[.475,.045,.03]],A,sx*.078,0,.078,0,sx*.3,0,3);
      L(chest,[[0,.035,.09],[.08,.052,.145],[.18,.042,.125],[.27,.012,.04]],A,sx*.19,.5,0,0,0,-sx*1.87,3);
      add(chest,GS,T,sx*SHX,SHY,0,.06,.06,.06);
    }
    add(chest,cyl(.045,.045,.03),T,0,.31,.125,1,1,1,PI/2); add(chest,GS,G,0,.31,.137,.032,.032,.016);
    L(chest,[[.16,.07,.04,0,-.085],[.3,.145,.075,0,-.1],[.42,.165,.075,0,-.08],[.49,.1,.05,0,-.05]],A,0,0,0,0,0,0,3);
    for(let k=0;k<4;k++)add(chest,cyl(.02,.026,.22+k*.04),T,(k%2?.07:-.07),.18+k*.09,-.19,1,1,1,-1.15-k*.1);
    add(chest,cyl(.04,.05,.1),R,0,.52,.01);
    L(head,[[0,.04,.05],[.05,.07,.09,0,.005],[.11,.076,.105,0,-.012],[.165,.06,.09,0,-.035],[.195,.028,.045,0,-.06]],A,0,0,0,0,0,0,2.4,14);
    add(head,GR,F,0,.07,.085,.11,.1,.06); L(head,[[-.03,.03,.03,0,.05],[.01,.05,.04,0,.06],[.03,.05,.03,0,.065]],T);
    for(let k=-2;k<=2;k++)add(head,GR,T,k*.018,.04,.112,.009,.06,.012);
    for(const sx of [-1,1]){add(head,GB,G,sx*.034,.095,.118,.034,.014,.01,0,0,sx*.3);
      add(head,plate([[0,.02],[.05,.03],[.2,-.06],[.17,-.1],[.02,-.03]],.014,.004),T,sx*.082,.1,0,1,1,1,0,PI/2-sx*.25,0);}
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      add(ua,cyl(.013,.013,ARM1),F,sx*.018,-ARM1/2,.012); add(ua,cyl(.013,.013,ARM1),F,-sx*.018,-ARM1/2,-.012); L(ua,[[.03,.03,.035],[-.04,.05,.055],[-.14,.04,.045],[-.2,.02,.025]],A,sx*.02);
      add(fa,cyl(.038,.038,.07),T,0,0,0,1,1,1,0,0,PI/2); add(fa,limb(.022,.02,ARM2),F); L(fa,[[-.03,.03,.034],[-.1,.05,.058],[-.2,.042,.048],[-.27,.028,.032]],A,sx*.006); add(fa,cyl(.034,.034,.02),T,0,-.28,0);
      add(ul,GS,T,0,0,0,.06,.06,.06); add(ul,limb(.034,.028,LEG1),F); add(ul,cyl(.011,.011,.34),T,0,-.22,-.05);
      L(ul,[[0,.04,.04,sx*.01,.02],[-.1,.066,.06,sx*.012,.03],[-.26,.052,.05,sx*.004,.026],[-.4,.036,.036,0,.015]],A);
      add(ll,cyl(.05,.05,.11),T,0,0,0,1,1,1,0,0,PI/2); add(ll,limb(.026,.022,LEG2),F); L(ll,[[-.02,.04,.045],[-.12,.062,.078,0,-.012],[-.26,.05,.06,0,-.006],[-.4,.03,.034]],A); add(ll,cyl(.03,.03,.02),T,0,-.44,0);
      add(ft,cyl(.03,.03,.07),T,0,0,0,1,1,1,0,0,PI/2); add(ft,cone(.016,.11,5),T,0,-.045,-.05,1,1,1,PI+.6);
      for(const k of [-1,1])L(ft,[[0,.022,.02],[.07,.03,.024],[.17,.02,.014],[.225,.006,.005]],A,k*.03,-.022,-.01,1.86,0,-k*.22);
      add(sw,GR,F,0,-.01,0,.06,.07,.06);
      if(s===1){add(sw,cyl(.036,.03,.06),T,0,.03,0); add(sw,bladeGeo(.95,.1),M.blade,0,.07,0); add(sw,GB,G,-.012,.48,0,.012,.8,.02);}
      else for(let k=-1;k<=1;k++){add(sw,cone(.016,.2,4),T,k*.032,.12,0,1,1,1,0,0,-k*.22); add(sw,cyl(.011,.011,.07),F,k*.032,.025,0);}
    }
  }
  // Brute: a walking siege engine. Slab pauldrons, barrel chest with twin tanks, a sunken visor head, gauntlets the size of anvils.
  buildBrute(add,L,M){
    const {hips,chest,head}=this,A=M.armor,T=M.trim,F=M.frame,R=M.rubber,G=M.glow;
    L(hips,[[-.15,.11,.1],[-.05,.2,.15],[.06,.19,.14],[.1,.14,.11]],F,0,0,0,0,0,0,3.4); add(hips,cyl(.19,.19,.06),T,0,.09,0,1,1,.78);
    L(hips,[[-.25,.06,.03,0,.1],[-.12,.11,.05,0,.135],[.02,.13,.05,0,.125]],A,0,0,0,0,0,0,3.6);
    L(chest,[[-.02,.13,.11],[.06,.115,.1],[.14,.16,.13]],R); L(chest,[[.1,.17,.14],[.24,.24,.19],[.38,.25,.19],[.48,.2,.15],[.53,.13,.1]],F,0,0,0,0,0,0,3);
    L(chest,[[.14,.1,.05,0,.14],[.24,.2,.09,0,.145],[.36,.24,.1,0,.125],[.46,.21,.09,0,.085],[.51,.14,.06,0,.05]],A,0,0,0,0,0,0,3.6,14);
    L(chest,[[.14,.12,.05,0,-.14],[.28,.22,.1,0,-.165],[.42,.24,.1,0,-.135],[.52,.16,.07,0,-.08]],A,0,0,0,0,0,0,3.6,14);
    add(chest,GR,T,0,.14,.19,.3,.11,.05); for(let k=-1;k<=1;k++)add(chest,GB,G,k*.08,.14,.212,.034,.075,.012);
    for(const sx of [-1,1]){
      L(hips,[[-.22,.03,.08],[-.1,.045,.12],[.03,.04,.1]],A,sx*.24,0,0,0,0,-sx*.15,3.6);
      add(chest,cyl(.05,.05,.15),T,sx*.105,.27,.235,1,1,1,0,0,PI/2); add(chest,GS,T,sx*.3,SHY,0,.09,.09,.09);
      L(chest,[[-.13,.1,.13],[-.03,.155,.185],[.09,.145,.165],[.15,.07,.09]],A,sx*.36,.43,0,0,0,-sx*.22,3.8);
      add(chest,GR,T,sx*.375,.3,0,.3,.03,.36,0,0,-sx*.22);
      add(chest,plate([[-.035,0],[.035,0],[.05,.3],[.012,.44],[-.02,.3]],.022,.006),T,sx*.2,.5,-.2,1,1,1,-.3,PI/2,0);
      add(chest,cyl(.045,.05,.3),T,sx*.12,.6,-.22,1,1,1,-.25); add(chest,cyl(.032,.032,.02),G,sx*.12,.745,-.258,1,1,1,-.25);
    }
    L(head,[[-.04,.08,.09],[.03,.1,.11],[.09,.085,.1],[.13,.045,.06]],A,0,-.02,.02,0,0,0,3); add(head,GR,F,0,.02,.125,.15,.06,.05); add(head,GB,G,0,.025,.153,.13,.022,.012); add(head,GR,T,0,.07,.08,.2,.03,.16,.15);
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      add(ua,limb(.06,.05,ARM1),F,sx*.04); L(ua,[[.04,.07,.075],[-.08,.1,.105],[-.22,.085,.09],[-.3,.06,.065]],A,sx*.05,0,0,0,0,0,3);
      add(fa,cyl(.075,.075,.17),T,0,0,0,1,1,1,0,0,PI/2); add(fa,limb(.06,.05,ARM2),F); L(fa,[[-.03,.075,.08],[-.12,.12,.125],[-.24,.125,.13],[-.31,.09,.095]],A,sx*.015,0,0,0,0,0,3.4);
      add(fa,cyl(.03,.03,.24),T,sx*.14,-.15,0); add(fa,GB,G,sx*.142,-.18,0,.012,.11,.06);
      L(sw,[[.07,.09,.09],[-.02,.15,.15],[-.15,.15,.15],[-.21,.1,.1]],A,0,0,0,0,0,0,4); add(sw,GR,T,0,-.085,0,.32,.06,.32); add(sw,GB,G,0,-.085,0,.33,.026,.1); add(sw,GB,G,0,-.085,0,.1,.026,.33);
      for(const k of [-1,1])add(sw,cone(.04,.13,4),T,k*.08,-.26,0,1,1,1,PI);
      add(ul,GS,T,0,0,0,.09,.09,.09); add(ul,limb(.08,.065,LEG1),F); L(ul,[[.04,.08,.085],[-.1,.125,.13,sx*.02,.01],[-.3,.105,.11,sx*.01,.01],[-.44,.08,.085]],A,0,0,0,0,0,0,3.2);
      add(ll,cyl(.085,.085,.2),T,0,0,0,1,1,1,0,0,PI/2); L(ll,[[.08,.06,.03,0,.08],[0,.085,.04,0,.095],[-.08,.06,.03,0,.085]],A,0,0,0,0,0,0,3.4);
      add(ll,limb(.06,.05,LEG2),F); L(ll,[[-.05,.075,.08],[-.18,.09,.1],[-.36,.11,.125,0,.012],[-.46,.095,.115,0,.016]],A,0,0,0,0,0,0,3.4); add(ll,cyl(.016,.016,.3),T,0,-.24,-.1);
      L(ft,[[-.09,.11,.16,0,.04],[-.04,.105,.15,0,.04],[.01,.075,.1,0,.02]],A,0,0,0,0,0,0,3.6); add(ft,GR,T,0,-.07,.18,.2,.04,.06); add(ft,GR,F,0,-.082,.04,.19,.016,.34);
    }
  }
  // Stalker: a lean assassin frame. Keel chest, a long swept skull with one vertical eye, four wing blades on the back, a blade in each hand.
  buildStalker(add,L,M){
    const {hips,chest,head}=this,A=M.armor,T=M.trim,F=M.frame,R=M.rubber,G=M.glow;
    L(hips,[[-.12,.045,.05],[-.05,.09,.075],[.03,.1,.08],[.08,.08,.065]],F); add(hips,cyl(.085,.09,.035),T,0,.085,0,1,1,.8);
    L(hips,[[-.18,.02,.03,0,.035],[-.1,.055,.045,0,.045],[0,.085,.045,0,.04],[.06,.075,.035,0,.03]],A,0,0,0,0,0,0,2.4);
    L(chest,[[-.02,.06,.05],[.07,.045,.04],[.15,.065,.055]],R); L(chest,[[.1,.075,.065],[.22,.125,.095],[.36,.16,.105],[.45,.13,.085],[.49,.075,.06]],F);
    L(chest,[[.16,.02,.02,0,.07],[.26,.085,.05,0,.085],[.37,.135,.06,0,.07],[.45,.13,.055,0,.04],[.485,.07,.04,0,.02]],A,0,0,0,0,0,0,2.2,14);
    L(chest,[[.2,.05,.03,0,-.07],[.32,.12,.05,0,-.08],[.44,.13,.05,0,-.05],[.485,.07,.04,0,-.03]],A,0,0,0,0,0,0,2.4);
    add(chest,cyl(.035,.035,.02),T,0,.33,.135,1,1,1,PI/2); add(chest,GS,G,0,.33,.143,.024,.03,.012); add(chest,cyl(.03,.04,.09),R,0,.52,.01);
    for(const sx of [-1,1]){add(chest,GS,T,sx*SHX,SHY,0,.052,.052,.052); L(chest,[[0,.02,.06],[.1,.03,.085],[.22,.012,.03]],A,sx*.2,.47,-.02,0,0,-sx*1.75,2.4);
      for(const [an,ln,rx] of [[.75,.66,-.6],[2.25,.5,.5]])add(chest,plate([[-.035,0],[.035,0],[.02,ln*.7],[0,ln],[-.012,ln*.6]],.014,.005),A,sx*.085,.36,-.13,1,1,1,rx,0,-sx*an);}
    L(head,[[0,.035,.045],[.05,.06,.085,0,.01],[.1,.06,.11,0,-.02],[.14,.04,.1,0,-.07],[.165,.014,.05,0,-.14]],A,0,0,0,0,0,0,2.2,14);
    add(head,GR,F,0,.06,.085,.07,.09,.06); add(head,GB,G,0,.08,.117,.016,.09,.012); add(head,plate([[0,0],[.34,.1],[.4,.16],[.05,.07]],.012,.004),A,0,.13,-.02,1,1,1,0,PI/2,0);
    for(const sx of [-1,1])add(head,cone(.014,.18,4),T,sx*.05,.01,.1,1,1,1,2.2,0,sx*.2);
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      add(ua,limb(.026,.022,ARM1),F); L(ua,[[.04,.03,.035],[-.04,.046,.05],[-.16,.036,.04],[-.26,.024,.026]],A,sx*.012);
      add(fa,cyl(.032,.032,.064),T,0,0,0,1,1,1,0,0,PI/2); add(fa,limb(.02,.018,ARM2),F); L(fa,[[-.03,.026,.03],[-.1,.04,.046],[-.22,.032,.036],[-.28,.022,.024]],A); add(fa,cone(.016,.16,4),A,0,.05,-.04,1,1,1,-.5);
      add(sw,cyl(.03,.026,.05),T,0,.02,0); add(sw,bladeGeo(1,.075),M.blade,0,.05,0); add(sw,GB,G,-.01,.5,0,.01,.8,.016);
      add(ul,GS,T,0,0,0,.052,.052,.052); add(ul,limb(.03,.026,LEG1),F); L(ul,[[.02,.04,.045],[-.08,.066,.07,sx*.008,.01],[-.24,.05,.054,0,.01],[-.42,.032,.034]],A);
      add(ll,cyl(.042,.042,.1),T,0,0,0,1,1,1,0,0,PI/2); add(ll,limb(.024,.02,LEG2),F); L(ll,[[-.02,.034,.036,0,.012],[-.12,.046,.05,0,.014],[-.3,.032,.036,0,.006],[-.43,.022,.024]],A); add(ll,cone(.02,.14,4),A,0,.06,.05,1,1,1,.25);
      add(ft,cyl(.026,.026,.06),T,0,0,0,1,1,1,0,0,PI/2); L(ft,[[0,.024,.022],[.06,.034,.026],[.16,.024,.016],[.23,.006,.005]],A,0,-.02,-.012,1.875); add(ft,cone(.014,.11,5),T,0,-.045,-.05,1,1,1,PI+.6);
    }
  }
  // merge each bone's loose parts into one mesh per material (a hero drops from ~170 draw calls to ~45) and
  // scale UVs by part size so the armour texture has an even grain everywhere
  bake(){
    const groups=[];this.root.traverse(o=>{if(!o.isMesh)groups.push(o);});let n=0;const M=this.mats,names=new Map(Object.keys(M).map(k=>[M[k],k]));
    for(let gi=0;gi<groups.length;gi++){const g=groups[gi];
      const by=new Map();
      for(const c of g.children){if(!c.isMesh||c.userData.keep)continue;let l=by.get(c.material);if(!l)by.set(c.material,l=[]);l.push(c);}
      for(const [mat,list] of by){
        const key=this.cfg.kind+'|'+gi+'|'+names.get(mat);let geo=BAKED.get(key);
        if(geo){for(const c of list)g.remove(c);}else{
        const t=mat.userData.tile,geos=list.map(c=>{c.updateMatrix();const q=c.geometry.index?c.geometry.toNonIndexed():c.geometry.clone();q.applyMatrix4(c.matrix);
          if(t){q.computeBoundingBox();const s=q.boundingBox.getSize(_a),k=max(s.x,s.y,s.z)/t,uv=q.attributes.uv,ou=(++n*.37)%1,ov=(n*.61)%1;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*k+ou,uv.getY(i)*k+ov);}
          g.remove(c);return q;});
        geo=mergeGeometries(geos,false);BAKED.set(key,geo);for(const q of geos)q.dispose();}
        const m=new THREE.Mesh(geo,mat);m.castShadow=!mat.isMeshBasicMaterial;g.add(m);
      }
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
    if(this.bt<this.bd){const k=smooth(this.bt/this.bd),f=this.from;for(let i=0;i<PN;i++)cur[i]=f[i]+(tmp[i]-f[i])*k;slerp3(cur,I.sl,f,tmp,k);slerp3(cur,I.sr,f,tmp,k);}else cur.set(tmp);
    if(dt>0&&dt<.1){const x=this.spx,v=this.spv;if(!this.spOn){this.spOn=true;for(const i of SPR)x[i]=cur[i];}
      for(let j=0;j<SPR.length;j++){const i=SPR[j],w=j<3?26:17,z=j<3?.5:.38;v[i]+=((cur[i]-x[i])*w*w-v[i]*2*z*w)*dt;x[i]+=v[i]*dt;cur[i]=x[i];}}
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
        if(this.twoHand){   // the left hand slides along the shaft to wherever it can actually reach
          _d.set(p[I.sr],p[I.sr+1],p[I.sr+2]).normalize(); _e.set(p[I.hr],p[I.hr+1],p[I.hr+2]); _w.subVectors(_e,_a);
          const ad=_w.dot(_d),mr=ARM1+ARM2+this.gripD[0]-.03,disc=ad*ad-(_w.lengthSq()-mr*mr); let u=this.twoHand;
          if(disc>0){const q=sqrt(disc),lo=max(-ad-q,-.58),hi=min(-ad+q,-.24);u=lo>hi?(-ad-q>-.24?-.24:-.58):clamp(u,lo,hi);}else u=clamp(-ad,-.58,-.24);
          _b.copy(_e).addScaledVector(_d,u); bl.copy(_d);}
        else if(this.aimW>.001){_q.copy(hips.quaternion).multiply(chest.quaternion).invert(); _d.copy(this.aimDir).applyQuaternion(_q).normalize();
          _e.copy(_a).addScaledVector(_d,.56); _b.lerp(_e,this.aimW); bl.lerp(_d,this.aimW).normalize();}
      }
      // weapon frame: X = cutting edge (follows the swing), Y = blade, Z = flat.
      // The roll references (edge, and the hand's knuckle direction gz) are first carried along with the blade's own
      // rotation, so however fast it swings they only ever turn about the blade by what the rules below ask for.
      const ed=this.edge[s],pistol=s===0&&this.aimHand,gz=this.gz[s],gb=this.gb[s];
      _q.setFromUnitVectors(gb,bl); gb.copy(bl); ed.applyQuaternion(_q); gz.applyQuaternion(_q).addScaledVector(bl,-gz.dot(bl));
      ed.addScaledVector(bl,-ed.dot(bl)); if(ed.lengthSq()<1e-6)ed.set(1,0,0).addScaledVector(bl,-bl.x); ed.normalize();
      if(gz.lengthSq()<1e-6)gz.copy(ed); gz.normalize();
      let swung=pistol;
      if(pistol){   // gz is the top of the gun: it leans toward upright, and holds its line when the barrel points straight up or down
        _e.set(0,1,0).addScaledVector(bl,-bl.y); if(_e.lengthSq()>.05){_e.normalize(); rollTo(gz,_e,bl,dt>0?min(1,14*dt):1);}
        ed.crossVectors(gz,bl).normalize();
      }else{const tip=_d.copy(_b).addScaledVector(bl,1.1),vel=_e.subVectors(tip,this.tipPrev[s]); this.tipPrev[s].copy(tip);
        if(vel.lengthSq()>(dt>0?dt*dt*1.3:4e-5)){swung=true;vel.addScaledVector(bl,-vel.dot(bl));if(vel.lengthSq()>1e-8){vel.normalize();if(vel.dot(ed)<0)vel.negate();rollTo(ed,vel,bl,dt>0?1-exp(-60*dt):.4);}}}
      _zw.crossVectors(ed,bl);
      const ua=this.arm[s],fa=this.fore[s],gd=this.gripD[s],sw=this.sword[s]; _pole.set(sx*.5,-.8,-.45);
      if(gd>0){
        // The pose gives where the grip is. The wrist is a ball joint a palm's length behind it, on the side the forearm comes
        // from, so the hand always wraps the grip with its heel toward the arm, whatever angle the weapon is at.
        const hp=this.palm[s],hd=this.hand[s]; let c=this.gc[s];
        if(pistol){_yh.copy(gz); _zh.copy(bl);}else{_yh.copy(bl); _zh.copy(gz);}
        hp.copy(_zh).multiplyScalar(sqrt(1-c*c)).addScaledVector(_yh,c);
        _w.copy(_b).addScaledVector(hp,-gd); ik2(_a,_w,ARM1,ARM2,_pole,ua.quaternion,fa.quaternion);
        _q2.copy(ua.quaternion).multiply(fa.quaternion); _fd.set(0,-1,0).applyQuaternion(_q2);
        if(!pistol){_e.copy(_fd).addScaledVector(bl,-_fd.dot(bl)); if(_e.lengthSq()>.03){_e.normalize(); rollTo(gz,_e,bl,dt>0?1-exp(-26*dt):1);} _zh.copy(gz);}
        const ct=clamp(_fd.dot(_yh),-.45,.45); c=this.gc[s]=dt>0?damp(c,ct,26,dt):ct;
        hp.copy(_zh).multiplyScalar(sqrt(1-c*c)).addScaledVector(_yh,c);
        _w.copy(_b).addScaledVector(hp,-gd); ik2(_a,_w,ARM1,ARM2,_pole,ua.quaternion,fa.quaternion);
        if(!swung){rollTo(ed,_zh,bl,dt>0?min(1,9*dt):1); _zw.crossVectors(ed,bl);}   // at rest the edge settles toward the knuckles, as a held blade sits
        _q2.copy(ua.quaternion).multiply(fa.quaternion).invert();
        _xh.crossVectors(_yh,_zh); _m4.makeBasis(_xh,_yh,_zh); _q.setFromRotationMatrix(_m4); hd.quaternion.copy(_q2).multiply(_q);
        _w.copy(hp).multiplyScalar(gd).applyQuaternion(_q2); _w.y-=ARM2; hd.position.copy(_w); sw.position.copy(_w);
      }else{ik2(_a,_b,ARM1,ARM2,_pole,ua.quaternion,fa.quaternion); _q2.copy(ua.quaternion).multiply(fa.quaternion).invert();}
      _m4.makeBasis(ed,bl,_zw); _q.setFromRotationMatrix(_m4); sw.quaternion.copy(_q2).multiply(_q);
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
