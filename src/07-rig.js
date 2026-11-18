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
const GR=new RoundedBoxGeometry(1,1,1,1,.12);                                        // unit plate with eased edges: catches a highlight on every rim
const tassetGeo=new RoundedBoxGeometry(.21,.42,.028,1,.012).translate(0,-.21,0);     // hinged skirt plate (hero)
const mantleGeo=new RoundedBoxGeometry(.3,.55,.04,1,.018).translate(0,-.275,0);      // lamellar mantle strip (warden)
// single-edged blade outline with a clipped point, extruded thin with a bevel so it has a real edge. Grip at the origin, blade along +Y.
const bladeGeo=(len,wid)=>{const k='b'+len+wid;if(geoCache[k])return geoCache[k];const s=new THREE.Shape();s.moveTo(-wid*.5,0);s.lineTo(wid*.5,0);s.lineTo(wid*.5,len*.72);s.quadraticCurveTo(wid*.44,len*.93,-wid*.36,len+.16);s.lineTo(-wid*.5,len*.9);s.closePath();
  return geoCache[k]=new THREE.ExtrudeGeometry(s,{depth:.004,bevelEnabled:true,bevelThickness:.005,bevelSize:.014,bevelSegments:1,curveSegments:6}).translate(0,0,-.002);};
const BAKED=new Map();
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
    this.arm=[];this.fore=[];this.sword=[];this.leg=[];this.shin=[];this.foot=[];
    for(let s=0;s<2;s++){const sx=s?-1:1;
      const ua=new THREE.Group(); ua.position.set(sx*SHX,SHY,0); chest.add(ua);
      const fa=new THREE.Group(); fa.position.y=-ARM1; ua.add(fa);
      const sw=new THREE.Group(); sw.position.y=-ARM2; fa.add(sw);
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
  // shared limbs: sleeved upper arm, bracer, armoured thigh, knee cap, flared greave, plated foot. A/B = the two shell materials.
  limbs(add,M,A,B,J,b=1,fb=b){
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      add(ua,limb(.04*b,.036*b,ARM1),M.frame); add(ua,limb(.058*b,.048*b,.2),A,0,-.07,0); add(ua,cyl(.011,.011,.2),J,-sx*.035*b,-.16,-.035*b);
      add(fa,cyl(.05*b,.05*b,.1*b),J,0,0,0,1,1,1,0,0,PI/2); add(fa,limb(.036*b,.032*b,ARM2),M.frame); add(fa,limb(.058*fb,.044*fb,.25),B,0,-.035,0); add(fa,GR,A,sx*.055*fb,-.15,-.012,.018,.2,.075*fb);
      add(fa,cyl(.048*fb,.048*fb,.028),M.brass||J,0,-.275,0); add(fa,GB,M.glow,sx*.06*fb,-.15,.024,.01,.13,.01);
      add(sw,GR,M.frame,0,-.01,0,.07*fb,.09*fb,.07*fb); add(sw,GR,B,0,0,.03*fb,.075*fb,.05,.03);
      add(ul,GS,J,0,0,0,.07*b,.07*b,.07*b); add(ul,limb(.092*b,.066*b,.4),A,0,-.035,0); add(ul,plate(P_THIGH,.04),B,0,-.2,.07*b,b,1,1); add(ul,cyl(.012,.012,.28),J,sx*.08*b,-.22,-.03);
      add(ll,cyl(.058*b,.058*b,.125*b),J,0,0,0,1,1,1,0,0,PI/2); add(ll,plate(P_KNEE,.04),A,0,.005,.07*b,b,1,1,-.15); add(ll,limb(.07*b,.048*b,.4),A,0,-.055,0,1,1,1.15);
      add(ll,limb(.045*b,.04*b,LEG2),M.frame); add(ll,cyl(.013,.013,.3),J,0,-.25,-.07*b); add(ll,cyl(.05*b,.05*b,.028),M.brass||J,0,-.445,0); add(ll,GB,M.glow,sx*.066*b,-.24,.012,.01,.16,.01);
      add(ft,GR,M.frame,0,-.072,.06,.1*b,.034,.27*b); add(ft,GR,A,0,-.036,.13,.1*b,.068,.13*b,.12); add(ft,GR,B,0,-.036,-.04,.088*b,.08,.08); add(ft,cone(.02,.1,4),J,0,-.03,-.1,1,1,1,-1.9);
    }
  }
  buildHero(add){
    const M=this.mats,{hips,chest,head}=this,A=M.shell,B=M.shell2;
    // pelvis: frame block, belt, hip actuators, fauld plate, rear power pack
    add(hips,GR,M.frame,0,-.03,0,.28,.16,.19); add(hips,plate(P_KNEE,.05),A,0,-.04,.1,1.6,1.7,1,.15); add(hips,cyl(.165,.165,.05),M.steel,0,.07,0,1,1,.72); add(hips,GR,M.brass,0,.07,.122,.07,.05,.02);
    add(hips,GR,B,0,.01,-.105,.17,.13,.06); add(hips,GB,M.glow,0,.01,-.137,.1,.012,.006);
    for(const sx of [-1,1]){add(hips,cyl(.035,.035,.34),M.brass,0,-.05,0,1,1,1,0,0,PI/2);}
    // torso: narrow bellows waist, rib frame, V-shaped chest plate over two abdominal lames, back plate, spine, reactor
    add(chest,cyl(.115,.105,.16),M.rubber,0,.04,0,1,1,.75); add(chest,cyl(.17,.125,.32),M.frame,0,.25,0,1,1,.72);
    add(chest,plate(P_AB,.06),B,0,.075,.092); add(chest,plate(P_AB,.06),B,0,.155,.1,1.15,1,1); add(chest,plate(P_CHEST,.12),A,0,.335,.07,1,1,1,-.1);
    add(chest,cyl(.045,.045,.02),M.brass,0,.345,.133,1,1,1,PI/2); add(chest,GS,M.glow,0,.345,.142,.028,.028,.012);
    add(chest,plate(P_BACK,.09),A,0,.3,-.09,1,1,1,0,PI); for(let k=0;k<4;k++)add(chest,GR,M.steel,0,.12+k*.085,-.148,.05,.05,.04);
    add(chest,cyl(.085,.115,.07),B,0,.465,0); add(chest,cyl(.048,.052,.1),M.rubber,0,.5,.005);
    for(const sx of [-1,1]){
      add(chest,GS,M.steel,sx*SHX,SHY,0,.058,.058,.058);
      add(chest,GR,A,sx*.265,.445,0,.17,.05,.2,0,0,-sx*.35); add(chest,GR,A,sx*.325,.385,0,.13,.042,.17,0,0,-sx*.8); add(chest,GR,B,sx*.352,.325,0,.1,.035,.14,0,0,-sx*1.15); add(chest,GR,M.brass,sx*.362,.292,0,.07,.012,.145,0,0,-sx*1.15);
      add(chest,GR,A,sx*.095,.37,-.165,.028,.22,.12,.55,0,sx*.1); add(chest,GB,M.glow,sx*.095,.31,-.2,.012,.1,.012,.55,0,sx*.1);
      add(chest,GR,M.steel,sx*.15,.2,.1,.04,.14,.03,0,0,sx*.22);
    }
    // head: helm, face plate with a T-visor, jaw, swept crest, ear discs, antenna
    add(head,GS,A,0,.115,0,.098,.115,.118); add(head,GR,M.frame,0,.085,.082,.135,.11,.06); add(head,GB,M.glow,0,.125,.11,.15,.022,.016); add(head,GB,M.glow,0,.085,.114,.016,.07,.012);
    add(head,GR,A,0,.03,.08,.1,.05,.07,.25); add(head,GR,B,0,.218,-.035,.022,.085,.21,-.38); add(head,GR,M.brass,0,.245,-.022,.012,.028,.21,-.38);
    for(const sx of [-1,1]){add(head,cyl(.035,.035,.03),M.steel,sx*.098,.11,0,1,1,1,0,0,PI/2); add(head,cyl(.012,.012,.1),M.steel,sx*.05,0,-.035); add(head,GR,B,sx*.085,.15,-.02,.02,.06,.13,-.25);}
    add(head,cyl(.006,.006,.14),M.steel,.105,.2,-.02);
    // tail plates: six hinged blades that swing like the skirts of a coat
    this.addTails([.8,1.75,PI-.55,PI+.55,-1.75,-.8],plate(P_TASSET,.022,.008),B,.17,.12,.3); this.tailBase=.05;
    this.limbs(add,M,A,B,M.steel);
    const grp=s=>{const o=new THREE.Group();this.sword[s].add(o);return o;};
    const blade=(o,len,wid)=>{
      add(o,cyl(.018,.018,.2),M.rubber,0,-.02,0); add(o,GS,M.brass,0,-.13,0,.026,.026,.026); add(o,GR,M.steel,0,.09,0,wid*3.4,.03,.05); add(o,cyl(.034,.034,.05),M.brass,0,.125,0,1,1,.6);
      add(o,bladeGeo(len,wid),M.blade,0,.11,0); add(o,GB,M.glow,-wid*.12,.14+len*.4,0,.012,len*.78,.018);
    };
    for(let s=0;s<2;s++){this.wp[s][0]=grp(s); blade(this.wp[s][0],1.02,.07);}
    this.wp[1][1]=grp(1); blade(this.wp[1][1],1.34,.088);
    const g=this.wp[0][1]=grp(0);   // pistol: barrel along +Y, grip along +Z
    add(g,GR,M.steel,0,.14,-.012,.046,.32,.068); add(g,GR,M.frame,0,.0,.055,.04,.075,.13,.25); add(g,GR,M.brass,0,.02,.0,.05,.09,.03); add(g,GB,M.glow,0,.16,-.05,.012,.2,.008);
    add(g,cyl(.016,.016,.05),M.frame,0,.31,-.012); add(g,cyl(.022,.022,.03),M.steel,0,.295,-.012); for(let k=0;k<3;k++)add(g,GB,M.frame,0,.2+k*.03,.024,.05,.012,.006); add(g,GR,M.steel,0,.25,.03,.012,.03,.016);
    this.wp[0][2]=grp(0);
    const m=this.wp[1][2]=grp(1);   // maul: shaft along +Y, head across X
    add(m,cyl(.028,.028,1.75),M.frame,0,.45,0); add(m,cyl(.032,.032,.5),M.rubber,0,-.1,0); add(m,GS,M.brass,0,-.44,0,.05,.05,.05); add(m,cyl(.04,.04,.12),M.brass,0,.15,0); add(m,cyl(.04,.04,.12),M.brass,0,.6,0);
    add(m,GR,M.steel,0,1.32,0,.56,.3,.3); add(m,GR,M.brass,.29,1.32,0,.04,.34,.34); add(m,GR,M.brass,-.29,1.32,0,.04,.34,.34); add(m,cyl(.07,.07,.4),M.frame,0,1.32,0,1,1,1,PI/2);
    add(m,GB,M.glow,0,1.32,.153,.4,.03,.01); add(m,GB,M.glow,0,1.32,-.153,.4,.03,.01); add(m,GB,M.glow,0,1.473,0,.4,.01,.03); add(m,cone(.07,.24,4),M.brass,0,1.58,0);
    add(m,cyl(.03,.03,.3),M.steel,.14,1.08,0); add(m,cyl(.03,.03,.3),M.steel,-.14,1.08,0);
    this.setWeapon(0);
  }
  setWeapon(i){for(let s=0;s<2;s++)this.wp[s].forEach((o,k)=>{o.visible=k===i;});this.twoHand=i===2;this.aimHand=i===1;this.wset=i;}
  buildWarden(add){
    const M=this.mats,{hips,chest,head}=this,b=1.25;
    const A=(...a)=>{const m=add(...a);m.userData.keep=true;this.hide.push(m);return m;};          // armour shed in phase 2
    const HOT=(...a)=>{const m=add(...a);m.userData.keep=true;m.visible=false;m.castShadow=false;this.hot.push(m);return m;};
    add(hips,GR,M.dark,0,-.03,0,.4,.22,.3); add(hips,cyl(.22,.22,.07),M.trim,0,.09,0,1,1,.75); A(hips,GR,M.armor,0,-.1,.14,.2,.24,.08,.2);
    add(chest,cyl(.17,.15,.22),M.rubber,0,.04,0,1,1,.8); add(chest,cyl(.26,.18,.36),M.dark,0,.27,0,1,1,.78);
    A(chest,plate(P_CHEST,.16),M.armor,0,.33,.1,1.25,1.15,1,-.1); A(chest,plate(P_AB,.07),M.armor,0,.09,.115,1.3,1.6,1); A(chest,GR,M.armor,0,.28,-.12,.42,.34,.13); A(chest,GR,M.trim,0,.44,.14,.3,.04,.14);
    add(chest,cyl(.07,.07,.03),M.trim,0,.3,.185,1,1,1,PI/2); add(chest,GS,M.glow,0,.3,.2,.045,.045,.02);
    for(let k=0;k<5;k++)add(chest,GR,M.trim,0,.1+k*.08,-.2,.06,.05,.05);
    for(const sx of [-1,1]){
      A(chest,GR,M.armor,sx*.31,.47,0,.26,.07,.3,0,0,-sx*.3); A(chest,GR,M.armor,sx*.4,.39,0,.2,.06,.26,0,0,-sx*.8); A(chest,GR,M.trim,sx*.435,.33,0,.14,.03,.24,0,0,-sx*1.1);
      A(chest,cone(.07,.3,5),M.trim,sx*.44,.56,0,1,1,1,0,0,-sx*.8); add(chest,GS,M.trim,sx*SHX*1.1,SHY,0,.09,.09,.09);
      HOT(chest,GB,M.glow,sx*.1,.2,.165,.015,.3,.01,0,0,sx*.3); HOT(chest,GB,M.glow,sx*.16,.3,-.165,.015,.26,.01,0,0,-sx*.4);
      add(chest,cyl(.02,.02,.3),M.trim,sx*.16,.2,-.17,1,1,1,.2);
    }
    add(chest,cyl(.1,.13,.1),M.trim,0,.49,0);
    add(head,GS,M.armor,0,.1,0,.12,.15,.135); add(head,GB,M.glow,0,.105,.122,.15,.02,.03); add(head,GR,M.armor,0,.03,.07,.13,.09,.11); add(head,GR,M.trim,0,.16,.1,.17,.02,.08,-.3);
    for(let k=-2;k<=2;k++)add(head,cone(.02,.17,4),M.trim,k*.045,.28-abs(k)*.018,.02,1,1,1,0,0,-k*.14);
    for(const sx of [-1,1])add(head,cyl(.04,.04,.04),M.trim,sx*.12,.1,0,1,1,1,0,0,PI/2);
    this.addTails([PI-1,PI-.35,PI+.35,PI+1],mantleGeo,M.cloth,.2,.15,.55);
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      add(ua,limb(.07*b,.06*b,ARM1),M.dark); A(ua,GR,M.armor,sx*.03,-.13,0,.15,.2,.16); add(ua,cyl(.016,.016,.22),M.trim,-sx*.06,-.15,-.05);
      add(fa,cyl(.075*b,.075*b,.15),M.trim,0,0,0,1,1,1,0,0,PI/2); add(fa,limb(.08*b,.06*b,ARM2),M.armor); A(fa,cyl(.1,.09,.1),M.trim,0,-.1,0); A(fa,GR,M.armor,sx*.08,-.15,0,.03,.2,.1);
      add(sw,GR,M.dark,0,0,0,.11,.12,.11); HOT(fa,GB,M.glow,0,-.15,.075,.012,.2,.01);
      add(ul,limb(.11*b,.085*b,LEG1),M.dark); A(ul,GR,M.armor,sx*.03,-.2,.05,.19,.32,.17); add(ul,cyl(.018,.018,.32),M.trim,sx*.1,-.22,-.05);
      add(ll,cyl(.085,.085,.19),M.trim,0,0,0,1,1,1,0,0,PI/2); A(ll,GR,M.armor,0,.01,.09,.14,.15,.07,-.2); add(ll,limb(.09*b,.065*b,LEG2),M.armor); add(ll,cyl(.02,.02,.3),M.trim,0,-.24,-.09);
      add(ft,GR,M.dark,0,-.07,.07,.13,.04,.32); add(ft,GR,M.armor,0,-.03,.15,.14,.09,.16); add(ft,GR,M.armor,0,-.03,-.04,.12,.1,.1); HOT(ll,GB,M.glow,0,-.22,.075,.012,.24,.01);
      if(s===1){add(sw,cyl(.028,.028,.34),M.rubber,0,-.04,0); add(sw,GR,M.trim,0,.13,0,.36,.05,.08); add(sw,cyl(.05,.05,.07),M.trim,0,.19,0,1,1,.6); add(sw,bladeGeo(1.62,.15),M.blade,0,.16,0); add(sw,GB,M.glow,-.02,.9,0,.03,1.4,.03);}
    }
  }
  buildFoe(add){
    const c=this.cfg,M=this.mats,brute=c.kind==='brute',stalk=c.kind==='stalker',b=brute?1.45:1,{hips,chest,head}=this,A=M.armor,T=M.trim;
    add(hips,GR,M.frame,0,-.03,0,.3*b,.18,.22*b); add(hips,cyl(.165*b,.165*b,.05),T,0,.07,0,1,1,.75); add(hips,plate(P_KNEE,.05),A,0,-.05,.1*b,1.5*b,1.6,1,.15);
    add(chest,cyl(.12*b,.11*b,.18),M.rubber,0,.04,0,1,1,.78); add(chest,cyl(.2*b,.14*b,.34),M.frame,0,.24,0,1,1,.8);
    add(chest,plate(P_CHEST,.13),A,0,.32,.075*b,b*(stalk?.8:1),1,b,-.16); add(chest,plate(P_BACK,.12),A,0,.32,-.1*b,b,1,b,.2,PI); add(chest,plate(P_AB,.06),A,0,.1,.1*b,b,1.2,1);
    add(chest,cyl(.055*b,.055*b,.03),T,0,.31,.15*b,1,1,1,PI/2); add(chest,GS,M.glow,0,.31,.16*b,.04*b,.04*b,.018);
    if(brute){for(let k=-1;k<=1;k++)add(chest,GB,M.glow,k*.08,.12,.19,.03,.09,.01); add(chest,GR,T,0,.12,.172,.32,.13,.05); for(const sx of [-1,1]){add(chest,cyl(.045,.05,.34),T,sx*.2,.52,-.2,1,1,1,-.3);add(chest,cyl(.03,.03,.02),M.glow,sx*.2,.69,-.25,1,1,1,-.3);}}
    else for(let k=0;k<4;k++)add(chest,cyl(.022,.028,.24+k*.04),T,(k%2?.07:-.07),.16+k*.1,-.2*b,1,1,1,-1.15-k*.1);
    for(const sx of [-1,1]){add(chest,GS,T,sx*SHX*b,SHY,0,.062*b,.062*b,.062*b);
      add(chest,GR,A,sx*.265*b,.445,0,.17*b,.05,.2*b,0,0,-sx*.35); add(chest,GR,A,sx*.325*b,.385,0,.13*b,.042,.17*b,0,0,-sx*.8);
      if(!stalk)add(chest,cone(.045*b,.24,4),T,sx*.31*b,.55,0,1,1,1,0,0,-sx*.7); else add(chest,GR,A,sx*.34,.5,-.06,.02,.16,.1,-.5,0,-sx*.5);}
    add(chest,cyl(.06*b,.08*b,.08),M.frame,0,.48,0);
    if(brute){add(head,GS,A,0,.04,.03,.11,.1,.12); add(head,GR,M.frame,0,.03,.1,.14,.07,.06); add(head,GB,M.glow,0,.05,.133,.12,.02,.012); add(head,GR,T,0,.11,.02,.18,.03,.16);}
    else if(stalk){add(head,GS,A,0,.1,.03,.082,.115,.16); add(head,GR,M.frame,0,.07,.12,.08,.1,.1); add(head,GB,M.glow,0,.1,.173,.018,.1,.012); add(head,GR,A,0,.2,-.12,.02,.07,.4,-.35); for(const sx of [-1,1])add(head,cone(.016,.2,4),T,sx*.06,.02,.16,1,1,1,2.2,0,sx*.2);}
    else{add(head,GS,A,0,.1,.02,.092,.12,.125); add(head,GR,M.frame,0,.075,.09,.13,.1,.08); add(head,GB,M.glow,.045,.1,.135,.03,.016,.012); add(head,GB,M.glow,-.045,.1,.135,.03,.016,.012); add(head,GR,A,0,.02,.08,.09,.05,.08,.3);
      for(const sx of [-1,1]){add(head,cone(.026,.3,4),T,sx*.09,.24,-.03,1,1,1,-.5,0,-sx*.45); add(head,cyl(.03,.03,.03),T,sx*.093,.1,.01,1,1,1,0,0,PI/2);}}
    this.limbs(add,M,A,A,T,b,brute?1.9:b);
    for(let s=0;s<2;s++){const sw=this.sword[s],fa=this.fore[s],sx=s?-1:1;
      if(brute){add(fa,cyl(.03,.03,.24),T,sx*.13,-.13,0); add(sw,GR,A,0,-.05,0,.32,.3,.32); add(sw,GR,T,0,-.05,0,.34,.08,.34); add(sw,GB,M.glow,0,-.05,0,.4,.035,.035); add(sw,GB,M.glow,0,-.05,0,.035,.035,.4); for(const k of [-1,1])add(sw,cone(.04,.14,4),T,k*.1,-.24,0,1,1,1,PI);}
      else if(s===1||stalk){add(sw,GR,T,0,.06,0,.14,.04,.06); add(sw,bladeGeo(.95,.1),M.blade,0,.07,0); add(sw,GB,M.glow,-.012,.48,0,.012,.8,.02);}
      else{for(let k=-1;k<=1;k++){add(sw,cone(.018,.22,4),T,k*.035,.14,0,1,1,1,0,0,-k*.2); add(sw,cyl(.012,.012,.08),M.frame,k*.035,.03,0);}}
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
    if(this.bt<this.bd){const k=smooth(this.bt/this.bd),f=this.from;for(let i=0;i<PN;i++)cur[i]=f[i]+(tmp[i]-f[i])*k;}else cur.set(tmp);
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
