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
// armour plate: the wall of a loft between the angles a0 and a1 (0 = +X, a quarter turn = +Z), th thick, its rim rolled over so it
// catches a line of light, and open behind so the frame under it shows. A ring may end with two trims (radians) that pull the
// start and the end of the arc in at that height: [y, rx, rz, cx, cz, t0, t1]. Plates like this floating over a dark frame,
// with gaps between them, are what the cast is built from.
const shell=(rings,a0,a1,th=.012,seg=8,ex=2.4)=>{const key='S'+[a0,a1,th,seg,ex]+rings.join('|');if(geoCache[key])return geoCache[key];
  const n=rings.length,pw=2/ex,dir=rings[n-1][0]>rings[0][0]?1:-1,R=n+2,C=seg+3,out=[];
  for(let inner=0;inner<2;inner++){const pos=[],uv=[],idx=[];
    for(let j=0;j<R;j++){const [y,rx,rz,cx=0,cz=0,t0=0,t1=0]=rings[clamp(j-1,0,n-1)],ej=j===0?-1:j===R-1?1:0,b0=a0+t0,b1=a1-t1,o=pos.length;
      for(let i=0;i<C;i++){const a=b0+(b1-b0)*clamp(i-1,0,seg)/seg,c=cos(a),s=sin(a),d=inner||ej||i===0||i===C-1?th:0;
        pos.push(cx+(rx-d)*Math.sign(c)*pow(abs(c),pw),y+ej*dir*th,cz+(rz-d)*Math.sign(s)*pow(abs(s),pw));uv.push(i/(C-1),j/(R-1));}
      for(const [e,p,q] of [[0,1,2],[C-1,C-2,C-3]]){const k=o+e*3,dx=pos[o+p*3]-pos[o+q*3],dz=pos[o+p*3+2]-pos[o+q*3+2],l=th/(hypot(dx,dz)||1);pos[k]+=dx*l;pos[k+2]+=dz*l;}}   // the rim: one plate thickness further along the surface
    for(let j=0;j<R-1;j++)for(let i=0;i<C-1;i++){const a=j*C+i,b=a+C;if((dir>0)!==!!inner)idx.push(a,b,a+1,b,b+1,a+1);else idx.push(a,a+1,b,b,a+1,b+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();out.push(g.toNonIndexed());}
  return geoCache[key]=mergeGeometries(out,false);};
const ring7=r=>[r[0],r[1],r[2],r[3]||0,r[4]||0,r[5]||0,r[6]||0];
const mirS=rings=>rings.map(r=>[r[0],r[1],r[2],-(r[3]||0),r[4]||0,r[6]||0,r[5]||0]);   // the same plate for the other side of the body
// the part of a ring stack between two heights: splits one shell into panels with a dark seam between them
const cut=(rings,ya,yb)=>{const R=rings.map(ring7),n=R.length,lo=min(ya,yb),hi=max(ya,yb),up=R[n-1][0]>R[0][0];
  const at=y=>{for(let j=0;j<n-1;j++){const a=R[j],b=R[j+1];if((y-a[0])*(y-b[0])<=0){const k=(y-a[0])/((b[0]-a[0])||1);return a.map((v,i)=>v+(b[i]-v)*k);}}return (abs(y-R[0][0])<abs(y-R[n-1][0])?R[0]:R[n-1]).slice();};
  const mid=R.filter(r=>r[0]>lo+1e-4&&r[0]<hi-1e-4);return up?[at(lo),...mid,at(hi)]:[at(hi),...mid,at(lo)];};
const UC=new THREE.CylinderGeometry(1,1,1,12);   // unit rod: scaled into struts, pistons, hinge discs (UPV, the up vector, is from 05-world)
// thin strip along a polyline edge (a blade's honed edge, the line of light behind it): between i0 and i1 in from the edge
const edgeStrip=(E,i0,i1)=>[...E.map(p=>[p[0]-i0,p[1]]),...E.slice().reverse().map(p=>[p[0]-i1,p[1]])];
// proportions per kind: leg = [thigh, shin] against the standard lengths, knee = how far the knees point outwards
const FRAME={hero:{leg:[1,1.1],knee:.05},brute:{leg:[1.1,1.14],knee:.16},warden:{leg:[1.08,1.14],knee:.1}};

const SPR=[I.ch,I.ch+1,I.ch+2,I.hd,I.hd+1,I.hd+2];   // pose channels that get spring follow-through
class Rig{
  constructor(cfg){
    const c=this.cfg=Object.assign({scale:1,kind:'hero'},cfg),fr=FRAME[c.kind]||{},lg=fr.leg||[1,1]; this.mats=c.mats;
    const L1=this.L1=LEG1*lg[0],L2=this.L2=LEG2*lg[1]; this.hipH=HIPH+L1+L2-LEG1-LEG2; this.knee=fr.knee??.22;
    const root=this.root=new THREE.Group(), body=this.body=new THREE.Group(); root.add(body); root.scale.setScalar(c.scale); body.rotation.order='YXZ';
    const hips=this.hips=new THREE.Group(); hips.rotation.order='YXZ'; body.add(hips);
    const chest=this.chest=new THREE.Group(); chest.rotation.order='YXZ'; chest.position.y=.14; hips.add(chest);
    const head=this.head=new THREE.Group(); head.rotation.order='YXZ'; head.position.y=.56; chest.add(head);
    this.arm=[];this.fore=[];this.sword=[];this.hand=[];this.leg=[];this.shin=[];this.foot=[];this.gripD=[0,0];this.palm=[V(0,-.4,.9).normalize(),V(0,-.4,.9).normalize()];this.gz=[V(0,0,1),V(0,0,1)];this.gb=[V(0,1,0),V(0,1,0)];this.gc=[0,0];
    for(let s=0;s<2;s++){const sx=s?-1:1;
      const ua=new THREE.Group(); ua.position.set(sx*SHX,SHY,0); chest.add(ua);
      const fa=new THREE.Group(); fa.position.y=-ARM1; ua.add(fa);
      const sw=new THREE.Group(); sw.position.y=-ARM2; fa.add(sw); const hd=new THREE.Group(); hd.position.y=-ARM2; fa.add(hd); this.hand.push(hd);
      const ul=new THREE.Group(); body.add(ul); const ll=new THREE.Group(); ll.position.y=-L1; ul.add(ll); const ft=new THREE.Group(); ft.position.y=-L2; ll.add(ft);
      this.arm.push(ua);this.fore.push(fa);this.sword.push(sw);this.leg.push(ul);this.shin.push(ll);this.foot.push(ft);
    }
    this.cur=new Float32Array(PN);this.from=new Float32Array(PN);this.tmp=new Float32Array(PN);this.spx=new Float32Array(PN);this.spv=new Float32Array(PN);this.spOn=false;
    this.edge=[V(1,0,0),V(1,0,0)];this.tipPrev=[V(),V()];
    this.phase=0;this.seed=rand(10);this.air=0;this.vy=0;this.lv=V();this.pry=0;this.tt=0;this.clip=null;this.t=0;this.bt=0;this.bd=0;
    this.speed=1;this.twoHand=false;this.aimHand=false;this.aimW=0;this.aimDir=V(0,0,1);this.post=null;this.wp=[[],[]];this.hide=[];this.hot=[];this.tailBase=.14;
    const add=(par,geo,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);m.castShadow=true;par.add(m);return m;};
    // kit shared by the builders. rod: a strut or piston between two points. hinge: a disc joint across X with a dark ring and a bolt cap.
    // S: an armour plate (see shell). SX: the same plate, mirrored for the right side when sx is -1.
    const rod=(par,mat,x0,y0,z0,x1,y1,z1,r)=>{const m=add(par,UC,mat,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2,r,hypot(x1-x0,y1-y0,z1-z0),r);m.quaternion.setFromUnitVectors(UPV,_a.set(x1-x0,y1-y0,z1-z0).normalize());return m;};
    const hinge=(par,m1,m2,x,y,z,r,w)=>{add(par,UC,m1,x,y,z,r,w,r,0,0,PI/2);add(par,UC,m2,x,y,z,r*.64,w+.014,r*.64,0,0,PI/2);add(par,UC,m1,x,y,z,r*.26,w+.026,r*.26,0,0,PI/2);};
    const S=(par,rings,a0,a1,mat,th=.012,x=0,y=0,z=0,rx=0,ry=0,rz=0,ex=2.4,seg=8)=>add(par,shell(rings,a0,a1,th,seg,ex),mat,x,y,z,1,1,1,rx,ry,rz);
    const SX=(sx,par,rings,a0,a1,mat,th,x=0,y=0,z=0,rx=0,ry=0,rz=0,ex,seg)=>sx<0?S(par,mirS(rings),PI-a1,PI-a0,mat,th,-x,y,z,rx,-ry,-rz,ex,seg):S(par,rings,a0,a1,mat,th,x,y,z,rx,ry,rz,ex,seg);
    // struts: the frame of a limb segment, two rods side by side and a bright piston behind them. blade: body, dark fuller, a honed
    // edge along the polyline E and a line of light behind it, starting y0 up from the grip.
    const struts=(par,mF,mP,y0,y1,dx,dz,r)=>{rod(par,mF,dx,y0,dz,dx*.8,y1,dz*.8,r);rod(par,mF,-dx,y0,-dz,-dx*.8,y1,-dz*.8,r);rod(par,mP,dx*.2,y0-.03,-dz*2.6,dx*.2,y1+.03,-dz*2.2,r*.62);};
    const blade=(o,pts,E,ful,y0,gw=.006)=>{const M=this.mats;add(o,plate(pts,.014,.005),M.blade,0,y0,0);if(ful)add(o,plate(ful,.017,.003),M.dark||M.frame,0,y0,0);
      add(o,plate(edgeStrip(E,-.003,.011),.016,.007),M.edge,0,y0,0);add(o,plate(edgeStrip(E.slice(0,-1),.019,.019+gw),.018,.002),M.glow,0,y0,0);};
    // flat: fold a temporary group's parts into its parent (the group only gave a tilted frame to build in), so they merge with the rest
    const flat=(g,to=g.parent)=>{g.updateMatrix();for(const c of [...g.children]){c.updateMatrix();c.applyMatrix4(g.matrix);to.add(c);}g.parent.remove(g);};
    this.K={rod,hinge,struts,blade,flat,S,SX};
    if(c.kind==='hero')this.buildHero(add);else if(c.kind==='warden')this.buildWarden(add);else this.buildFoe(add);
    this.bake();
  }
  // chains of hinged plates hanging from the belt (coat tails, a mantle). lens = the length of each segment but the last;
  // fn(group, segment, tail) adds the parts of one segment, hanging down from the group's origin and facing +Z.
  addTails(angles,rx,rz,lens,fn){
    this.tails=[];
    angles.forEach((a,i)=>{let par=this.hips;const seg=[],v=[];
      for(let k=0;k<=lens.length;k++){const g=new THREE.Group();g.rotation.order='YXZ';if(k)g.position.y=-lens[k-1];else{g.position.set(sin(a)*rx,-.02,cos(a)*rz);g.rotation.y=a;}
        par.add(g);fn(g,k,i);seg.push(g);v.push(.1);par=g;}
      this.tails.push({a,seg,v});});
  }
  // ---------- models: every character is a machine, assembled from rounded plates, joints, pistons and cable ----------
  // The hero is designed from the back, the side the camera sees: wide layered shoulders over a narrow waist, a lit spine, a sheath
  // slung across the shoulder blades and two long split coat tails. White plates float over a graphite core and a gunmetal frame.
  buildHero(add){
    const M=this.mats,{hips,chest,head}=this,{rod,hinge,flat,S,SX,blade:bladeOf}=this.K,A=M.shell,B=M.shell2,F=M.frame,D=M.dark,J=M.steel,R=M.rubber,GL=M.glow,L1=this.L1,L2=this.L2,HP=PI/2;
    this.gripD=[.07,.07];
    // stand tall at rest, feet under the shoulders and the weight on the rear leg (the idle clip itself is a wider, lower guard)
    this.pose=(o,c)=>{if(c.loco==='idle'){o[I.hy]+=.03;o[I.fl]=.12;o[I.fl+2]=.17;o[I.fr]=-.13;o[I.fr+2]=-.13;o[I.hip+2]+=.045;}};
    // pelvis: a dark V girdle with a gunmetal wedge in front, white hip plates raked out over the joints, a slim navy belt
    add(hips,loft([[-.16,.03,.04],[-.1,.07,.066],[-.02,.1,.08],[.07,.096,.076]],14,2.2),D);
    add(hips,loft([[-.172,.014,.018,0,.046],[-.11,.04,.03,0,.06],[-.03,.056,.032,0,.064],[.03,.05,.028,0,.058]],10,1.7),F);
    add(hips,loft([[.062,.108,.086],[.094,.104,.082]],16,2.4),B); add(hips,GB,GL,0,.078,.087,.034,.008,.006);
    S(hips,[[.056,.114,.092],[-.02,.112,.09],[-.08,.088,.07,0,0,.3,.3]],-HP-.55,-HP+.55,A,.01);
    for(const sx of [-1,1]){
      SX(sx,hips,[[.06,.116,.094],[-.01,.122,.1],[-.07,.112,.09,0,0,.1,.25],[-.115,.094,.074,0,0,.3,.6]],-.8,.92,A,.011,0,-.028,0,0,0,.24);
      hinge(hips,F,J,sx*.128,-.05,0,.042,.03);
    }
    // waist: a slim dark core, four bright piston rods, two overlapping lames in front
    add(chest,loft([[-.07,.07,.058],[0,.054,.046],[.08,.052,.044],[.15,.078,.062]],12,2.4),D);
    S(chest,[[-.04,.078,.064],[.03,.07,.058,0,0,.12,.12]],HP-1.05,HP+1.05,A,.01); S(chest,[[.036,.08,.066,0,0,.1,.1],[.1,.088,.07],[.128,.094,.074]],HP-.9,HP+.9,A,.01);
    // rib cage: graphite core with three truss slats under each arm; two pectoral plates meeting on a dark centre seam, shoulder-blade
    // plates behind, and a collar yoke standing proud of the neck with its pistons showing in the gap
    add(chest,loft([[.12,.08,.064],[.2,.118,.086],[.32,.15,.096],[.42,.146,.09],[.475,.1,.07]],14,2.6),D);
    const PEC=[[.2,.1,.092,0,0,.55,0],[.25,.138,.108,0,0,.16,0],[.33,.164,.118],[.398,.172,.114]],BLD=[[.2,.1,.09,0,0,0,.8],[.26,.136,.104,0,0,0,.3],[.34,.164,.114],[.398,.172,.108]];
    const YOKE=[[.428,.177,.113],[.458,.172,.1],[.482,.138,.084],[.494,.106,.072]];
    S(chest,YOKE,.4,PI-.4,A,.01,0,0,0,0,0,0,2.6,14); S(chest,YOKE,-PI+.4,-.4,A,.01,0,0,0,0,0,0,2.6,14);
    S(chest,[[.452,.112,.09,0,-.004],[.492,.106,.086,0,-.004],[.522,.086,.072,0,-.008]],0,TAU,A,.012,0,0,0,0,0,0,2.4,16);
    add(chest,loft([[.47,.05,.05],[.565,.036,.04]],10,2),D); for(const [x,z] of [[.03,.034],[-.03,.034],[.04,-.012],[-.04,-.012]])rod(chest,J,x,.47,z,x*.7,.57,z*.8,.006);
    add(chest,UC,D,0,.352,.118,.03,.016,.03,HP); add(chest,ringGeo(.0155,.0045,0),GL,0,.352,.128); add(chest,UC,J,0,.352,.12,.007,.018,.007,HP);   // core light in a dark socket on the sternum
    for(const sx of [-1,1]){
      rod(chest,J,sx*.062,-.05,.04,sx*.084,.17,.054,.0075); rod(chest,J,sx*.058,-.05,-.04,sx*.08,.17,-.05,.0075);
      rod(chest,F,sx*.062,-.05,.04,sx*.07,.04,.045,.0125); rod(chest,F,sx*.058,-.05,-.04,sx*.066,.04,-.044,.0125);
      SX(sx,chest,PEC,.42,HP-.05,A,.008,0,0,0,0,0,0,2.6,10); SX(sx,chest,BLD,-HP+.15,-.42,A,.008,0,0,0,0,0,0,2.6,10);
      for(let k=0;k<3;k++)add(chest,GR,F,sx*(.124+k*.012),.215+k*.046,0,.016,.02,.1);
      hinge(chest,F,J,sx*.2,SHY,0,.044,.044);
      // thruster vent under the shoulder blade
      add(chest,GR,F,sx*.08,.178,-.092,.056,.1,.05,.42,0,sx*.28); add(chest,GR,D,sx*.086,.142,-.118,.04,.03,.02,.42,0,sx*.28); add(chest,GB,GL,sx*.087,.135,-.124,.03,.008,.012,.42,0,sx*.28);
    }
    // spine: gunmetal vertebrae either side of one unbroken strip of light, nape to waist
    const SP=[[.44,-.11],[.36,-.126],[.28,-.118],[.2,-.097],[.12,-.073],[.04,-.058],[-.045,-.062]];
    for(let k=0;k<SP.length-1;k++){const [y0,z0]=SP[k],[y1,z1]=SP[k+1],ym=(y0+y1)/2,zm=(z0+z1)/2,ln=hypot(y1-y0,z1-z0),th=atan2(z0-z1,y0-y1);
      add(chest,GB,GL,0,ym,zm-.004,.011,ln*1.04,.01,th); for(const sx of [-1,1])add(chest,GR,F,sx*.021,ym,zm-.004,.027,ln*.8,.03,th);}
    // sheath slung across the back; the long sword's hilt stands over the right shoulder whenever it is not drawn
    const sh=new THREE.Group();sh.position.set(-.2,.55,-.172);sh.quaternion.setFromUnitVectors(UPV,_a.set(.37,-.6,-.012).normalize());chest.add(sh);
    add(sh,loft([[0,.031,.018],[.05,.034,.02],[.5,.029,.017],[.65,.02,.012],[.7,.006,.005]],10,3),B); add(sh,GB,GL,0,.38,-.019,.004,.24,.006);
    add(sh,loft([[-.014,.037,.023],[.03,.038,.024]],10,3),J); add(sh,loft([[.2,.035,.022],[.24,.035,.022]],10,3),A); add(sh,loft([[.52,.031,.019],[.555,.03,.019]],10,3),A);
    add(sh,GR,F,0,.22,.03,.03,.05,.06); add(sh,GR,F,0,.5,.03,.03,.05,.06);
    const hl=this.hilt=new THREE.Group();sh.add(hl);
    add(hl,UC,R,0,-.13,0,.018,.2,.018); add(hl,plate([[-.07,0],[-.05,-.03],[.05,-.03],[.07,0],[.05,.014],[-.05,.014]],.032,.008),J,0,-.022,0); add(hl,UC,J,0,-.238,0,.023,.03,.023); add(hl,cone(.022,.05,4),J,0,-.275,0,1,1,1,PI); flat(sh);
    // head: a white helmet over a dark faceplate. A hard brow keeps the face in shadow, one V of light for eyes, cheek and neck guards
    // split from the dome by a seam, a vented plate and cables behind, swept antenna blades at the ears
    add(head,loft([[-.036,.014,.02,0,.05],[0,.046,.058,0,.03],[.05,.07,.086,0,.006],[.1,.076,.094,0,-.004],[.126,.07,.09,0,-.008]],14,2),M.visor);
    add(head,loft([[.098,.088,.108,0,-.006],[.126,.089,.109,0,-.007],[.166,.082,.102,0,-.012],[.198,.062,.08,0,-.02],[.214,.03,.042,0,-.026]],16,2.8),A);
    add(head,plate([[-.1,.13],[-.092,.17],[-.064,.204],[0,.226],[.06,.218],[.1,.196],[.122,.16],[.1,.146],[0,.196],[-.08,.13]],.014,.004),B,0,0,0,1,1,1,0,HP,0);   // crest
    S(head,[[.094,.09,.118,0,-.004,.5,.5],[.112,.089,.115,0,-.006],[.134,.086,.108,0,-.008,.3,.3]],HP-1.15,HP+1.15,A,.012,0,0,0,0,0,0,2.5,10);
    for(let k=0;k<3;k++)add(head,GR,F,0,.022+k*.024,-.094-k*.005,.044,.012,.02);
    for(const x of [-.033,-.011,.011,.033])rod(head,R,x,.03,-.07,x*1.15,-.09,-.058,.007);
    for(const sx of [-1,1]){
      SX(sx,head,[[0,.06,.074,0,-.01,0,.55],[.04,.079,.097,0,-.007,0,.14],[.082,.088,.108,0,-.006]],-HP+.3,HP-.92,A,.011,0,0,0,0,0,0,2.5,10);
      add(head,shell([[-.0036,.0745,.091,0,.0035],[.0036,.0745,.091,0,.0035]],sx>0?HP-.56:HP,sx>0?HP:HP+.56,.003,6,2),GL,0,.056,0,1,1,1,0,0,sx*.3);
      add(head,UC,J,sx*.089,.074,-.012,.026,.02,.026,0,0,HP); add(head,UC,F,sx*.091,.074,-.012,.014,.026,.014,0,0,HP);
      add(head,plate([[0,-.016],[.07,-.026],[.25,.054],[.238,.07],[.03,.018]],.01,.004),B,sx*.101,.078,-.016,1,1,1,0,HP-sx*.22,0);
    }
    // coat tails: two long split plates of three hinged segments each, navy with a line of light down the outer edge
    this.addTails([PI-.46,PI+.46],.1,.094,[.25,.24],(g,k,i)=>{const e=i?1:-1,w=[.066,.06,.052][k],w2=[.06,.052,0][k],ln=[.25,.24,.26][k];
      add(g,plate(k<2?[[-w,0],[w,0],[w2,-ln+.014],[-w2,-ln+.014]]:[[-w,0],[w,0],[w*.8,-.17],[0,-ln],[-w*.8,-.17]],.018,.006),B);
      add(g,GR,B,0,-ln*.45,.008,.034,ln*.7,.014); add(g,UC,B,0,0,0,.011,w*2.1,.011,0,0,HP);
      add(g,GB,GL,e*(k<2?(w+w2)/2:w*.92),k<2?-ln/2:-.085,.002,.006,k<2?ln-.03:.15,.02,0,0,k<2?-e*(w-w2)/ln:-e*.064);});
    this.tailBase=.07;
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],hd=this.hand[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      // arm: a pauldron of three lames, twin-strut upper arm under a navy plate, hinge elbow, a leaf bracer over the forearm frame
      add(ua,GS,F,0,0,0,.046,.046,.046);
      SX(sx,ua,[[.098,.014,.018,.028],[.084,.04,.046,.028],[.05,.068,.074,.03],[0,.078,.084,.032],[-.034,.085,.091,.035]],-1.75,1.75,A,.011,0,0,0,0,0,0,2.1,10);
      SX(sx,ua,[[-.012,.07,.076,.03],[-.05,.072,.078,.032],[-.09,.081,.087,.037,0,.12,.12]],-1.45,1.45,A,.01,0,0,0,0,0,0,2.1,10);
      SX(sx,ua,[[-.07,.064,.07,.03],[-.105,.066,.072,.031],[-.142,.075,.081,.035,0,.18,.18]],-1.2,1.2,A,.01,0,0,0,0,0,0,2.1,10);
      rod(ua,F,sx*.004,-.04,.022,sx*.004,-.3,.018,.0125); rod(ua,F,sx*.004,-.04,-.022,sx*.004,-.3,-.018,.0125); rod(ua,J,-sx*.03,-.07,0,-sx*.024,-.28,0,.0075);
      SX(sx,ua,[[-.128,.04,.044,.006,0,.5,.5],[-.168,.05,.054,.008],[-.236,.045,.049,.006],[-.286,.034,.037,.004,0,.45,.45]],-1.85,1.85,B,.011);
      hinge(fa,J,F,0,0,0,.038,.074);
      rod(fa,F,sx*.014,-.02,.012,sx*.01,-.285,.008,.011); rod(fa,F,-sx*.016,-.02,-.006,-sx*.012,-.285,-.004,.011); rod(fa,J,0,-.05,-.03,0,-.27,-.022,.0065);
      SX(sx,fa,[[-.04,.032,.036,.004,0,.9,.9],[-.1,.052,.058,.008,0,.1,.1],[-.17,.048,.053,.006],[-.235,.037,.041,.003],[-.268,.031,.034,0,0,.5,.5]],-2.05,2.05,A,.012,0,0,0,0,0,0,2.4,10);
      add(fa,GR,B,sx*.052,-.15,-.004,.014,.13,.046); add(fa,GB,GL,sx*.06,-.15,0,.006,.1,.012); add(fa,UC,J,0,-.278,0,.03,.016,.03); add(fa,GS,F,0,-ARM2,0,.027,.027,.027);
      // hand, built round the grip axis (Y): palm block behind, four fingers and a thumb wrapped round, knuckle guard in front
      add(hd,GR,F,0,0,-.037,.056,.084,.03); add(hd,GR,A,0,-.004,.045,.05,.078,.012);
      for(let k=0;k<4;k++)add(hd,arcGeo(.031,.0085,s?-.6:-.87,4.6),J,0,-.03+k*.02,0);
      add(hd,arcGeo(.031,.0095,s?-.2:1.4,1.95),J,0,.052,0);
      // leg: a teardrop thigh shell, widest at the hip and open behind over the frame and its piston; hinge knee with a cap; shin plate
      // and calf shell split by a seam of light; a dark Achilles piston; a blade foot on a stilt heel
      add(ul,GS,F,0,0,0,.058,.058,.058); add(ul,limb(.04,.032,L1),D,0,0,-.008); rod(ul,J,-sx*.024,-.07,-.05,-sx*.012,-L1+.04,-.036,.009); rod(ul,F,-sx*.024,-.07,-.05,-sx*.019,-.25,-.044,.016);
      const TH=[[.05,.042,.048,.012,0,.6,.6],[-.03,.074,.082,.014,.004],[-.12,.07,.078,.01,.008],[-.24,.055,.062,.004,.008],[-.35,.046,.052,0,.005],[-.418,.042,.046,0,0,.4,.4]];
      SX(sx,ul,cut(TH,.05,-.186),-1.5,3,A,.012,0,0,0,0,0,0,2.4,12); SX(sx,ul,cut(TH,-.2,-.418),-1.5,3,A,.012,0,0,0,0,0,0,2.4,12);
      hinge(ll,F,J,0,0,0,.046,.088);
      S(ll,[[.066,.036,.046,0,.012,.5,.5],[0,.05,.064,0,.016],[-.062,.036,.046,0,.012,.5,.5]],HP-.95,HP+.95,A,.011);
      add(ll,limb(.03,.024,L2),D,0,0,-.012);
      const q=L2/LEG2,ys=r=>r.map(v=>[v[0]*q,...v.slice(1)]);
      S(ll,ys([[-.078,.04,.044,0,.012,.7,.7],[-.15,.052,.058,0,.016,.1,.1],[-.3,.042,.048,0,.01],[-.42,.033,.037,0,.004],[-.47,.03,.032,0,0,.35,.35]]),HP-1.45,HP+1.45,A,.012,0,0,0,0,0,0,2.4,10);
      S(ll,ys([[-.045,.03,.034,0,-.012,.8,.8],[-.13,.052,.064,0,-.02,.1,.1],[-.24,.048,.058,0,-.016],[-.36,.036,.042,0,-.01],[-.405,.03,.034,0,-.006,.5,.5]]),-HP-1.35,-HP+1.35,A,.012,0,0,0,0,0,0,2.4,10);
      add(ll,GB,GL,sx*.05,-.2*q,-.002,.006,.17,.012);
      rod(ll,F,0,-.38*q,-.036,0,-L2+.06,-.046,.016); rod(ll,J,0,-.38*q,-.036,0,-L2+.012,-.05,.008); add(ll,UC,J,0,-L2+.03,0,.034,.02,.034);
      hinge(ft,J,F,0,0,0,.03,.07);
      add(ft,loft([[-.02,.026,.024],[.04,.04,.03],[.12,.038,.024],[.2,.026,.013],[.25,.009,.005]],12,3),A,0,-.012,-.008,1,1,1,1.86);
      add(ft,GR,F,0,-.082,.112,.056,.014,.19); rod(ft,F,0,-.01,-.03,0,-.08,-.078,.011); add(ft,GR,F,0,-.083,-.08,.034,.012,.036);
      add(ft,plate([[-.022,0],[.022,0],[.013,.085],[0,.115],[-.013,.085]],.012,.004),B,0,-.02,-.05,1,1,1,-.45);
    }
    const grp=s=>{const o=new THREE.Group();this.sword[s].add(o);return o;};
    // weapons are modelled with the grip at the origin and the blade (or barrel, or hammer head) along +Y; +X is the cutting edge
    const hiltOf=(o,gd)=>{add(o,UC,R,0,-.015,0,.019,.19,.019); add(o,UC,J,0,-.122,0,.024,.03,.024); add(o,cone(.022,.06,4),J,0,-.165,0,1,1,1,PI); add(o,plate(gd,.034,.008),J,0,.094,0); add(o,GR,B,0,.094,0,.05,.03,.042);};
    // twin fang: a forward-curved chopping blade, widest in its last third, saw teeth down the spine, a hooked knuckle guard
    for(let s=0;s<2;s++){const o=this.wp[s][0]=grp(s);
      hiltOf(o,[[-.05,-.014],[.04,-.02],[.085,-.004],[.1,.03],[.05,.022],[-.03,.03],[-.062,.014]]);
      add(o,plate([[.06,.02],[.1,.03],[.108,-.05],[.09,-.115],[.074,-.108],[.086,-.05],[.078,0]],.02,.006),J,0,.094,0);
      bladeOf(o,[[-.03,0],[.03,0],[.026,.3],[.05,.62],[.075,.86],[.062,1.02],[.03,1.18],[-.004,1.02],[-.016,.8],[-.03,.72],[-.018,.7],[-.032,.62],[-.02,.6],[-.034,.52],[-.022,.5],[-.036,.42],[-.024,.4],[-.036,.32],[-.03,.2]],
        [[.03,.04],[.026,.3],[.05,.62],[.075,.86],[.062,1.02],[.034,1.16]],[[-.014,.1],[.004,.1],[.01,.3],[.028,.62],[.04,.84],[.012,.84],[-.006,.6],[-.014,.3]],.1);}
    // long sword: broad at the guard and tapering, dark fuller, a honed edge, an angular guard
    {const o=this.wp[1][1]=grp(1);
      hiltOf(o,[[-.1,.0],[-.06,-.026],[.07,-.026],[.13,.004],[.1,.03],[-.07,.03]]);
      bladeOf(o,[[-.06,0],[.08,0],[.07,.55],[.052,1.05],[.038,1.24],[-.028,1.5],[-.044,1.36],[-.054,.8]],[[.08,.03],[.07,.55],[.052,1.05],[.038,1.24],[-.02,1.47]],[[-.04,.06],[-.004,.06],[.002,.6],[-.008,1.1],[-.03,1.3],[-.038,.9]],.11);}
    const g=this.wp[0][1]=grp(0);   // pistol: barrel along +Y, top of the gun toward -Z, the hand wraps the raked handle at the origin
    add(g,GR,R,0,-.004,.014,.03,.042,.11,.2); add(g,GR,J,0,.11,-.056,.036,.34,.05); add(g,GR,F,0,.1,-.024,.03,.26,.026); add(g,GR,F,0,.19,-.004,.028,.15,.032);
    add(g,GR,F,0,.285,-.056,.046,.056,.06); for(const y of [.272,.298])add(g,GB,D,0,y,-.056,.05,.008,.03); add(g,UC,D,0,.312,-.056,.012,.006,.012);
    add(g,GR,F,0,.11,-.086,.016,.24,.012); for(let k=0;k<6;k++)add(g,GB,J,0,.01+k*.04,-.093,.02,.014,.004); add(g,GB,GL,0,.12,-.0945,.006,.2,.004);
    add(g,GR,F,0,.05,.018,.012,.012,.05); add(g,GR,F,0,.074,0,.012,.05,.012); for(let k=0;k<3;k++)add(g,GB,F,0,-.04+k*.02,-.056,.039,.008,.04);
    this.wp[0][2]=grp(0);
    const m=this.wp[1][2]=grp(1);   // maul: the right hand holds it at the origin, the left further down the shaft; the head at +Y strikes toward +X
    add(m,UC,F,0,.2,0,.021,1.62,.021); add(m,UC,R,0,0,0,.024,.22,.024); add(m,UC,R,0,-.4,0,.024,.4,.024);
    add(m,UC,J,0,.14,0,.03,.04,.03); add(m,UC,J,0,-.17,0,.029,.03,.029); add(m,UC,J,0,-.62,0,.03,.04,.03); add(m,cone(.026,.12,6),J,0,-.7,0,1,1,1,PI); add(m,UC,J,0,.79,0,.036,.05,.036);
    add(m,GR,F,0,.98,0,.3,.26,.25); add(m,GR,J,.186,.98,0,.07,.3,.29);   // gunmetal head with a bare-metal ram plate
    for(const a of [-1,1])for(const b of [-1,1])add(m,cone(.05,.06,4),J,.248,.98+a*.08,b*.078,1,1,1,PI/4,0,-HP);   // four pyramid studs on the striking face
    add(m,cyl(.115,.078,.13),F,-.212,.98,0,1,1,1,0,0,HP); add(m,UC,GL,-.258,.98,0,.088,.01,.088,0,0,HP); add(m,UC,D,-.262,.98,0,.042,.03,.042,0,0,HP);   // thruster bell behind
    add(m,GB,GL,.03,.98,0,.012,.266,.256); for(let k=-1;k<=1;k++){add(m,GB,GL,-.07+k*.044,1.108,0,.014,.01,.15); add(m,GB,GL,-.07+k*.044,.852,0,.014,.01,.15);}
    for(const b of [-1,1]){add(m,GR,B,0,.9,b*.128,.1,.22,.016); for(const y of [.83,.9,.97])add(m,UC,J,0,y,b*.136,.012,.012,.012,HP);}
    add(m,cone(.04,.1,4),J,0,1.158,0);
    this.setWeapon(0);
  }
  setWeapon(i){for(let s=0;s<2;s++)this.wp[s].forEach((o,k)=>{o.visible=k===i;});if(this.hilt)this.hilt.visible=i!==1;this.twoHand=i===2?-.42:0;this.aimHand=i===1;this.wset=i;}
  // The Gatewarden: the Husks' lord, built in their language but tall, in steel and gold. Sloped vented pauldrons, a skull mask over a
  // grille under a crest of three blades, a gorget of three lames, chest plates round the core, a mantle of hanging plates.
  // Everything put in AG() is armour it sheds in phase 2; what is left is a rib cage of dark struts round a burning core, twin-strut
  // limbs and hinge discs. HG() parts are the light that shows once it has: the core between the ribs and a ring in every joint.
  buildWarden(add){
    const M=this.mats,{hips,chest,head}=this,{rod,hinge,struts,flat,blade,S,SX}=this.K,D=M.dark,T=M.trim,A=M.armor,R=M.rubber,G=M.glow,HP=PI/2,L1=this.L1,L2=this.L2,q1=L1/LEG1,q2=L2/LEG2;
    const sub=(map,list,vis)=>par=>{let g=map.get(par);if(!g){g=new THREE.Group();g.visible=vis;par.add(g);map.set(par,g);list.push(g);}return g;};
    const AG=sub(new Map(),this.hide,true),HG=sub(new Map(),this.hot,false),sy=(r,q)=>r.map(v=>[v[0]*q,...v.slice(1)]);
    const L=(par,rings,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0,ex=3,seg=12)=>add(par,loft(rings,seg,ex),mat,x,y,z,1,1,1,rx,ry,rz);
    const joint=(par,r,w,x=0,y=0,z=0)=>{hinge(par,T,D,x,y,z,r,w);add(HG(par),UC,G,x,y,z,r*.8,w+.02,r*.8,0,0,HP);};   // hinge disc; a ring of fire in it once the armour is off
    // it stands tall on near-straight legs
    this.pose=(o,c)=>{if(c===CL.eIdle){o[I.hy]+=.12;o[I.hip]-=.2;o[I.ch]-=.2;o[I.hd]+=.3;o[I.fl]+=.02;o[I.fr]-=.02;}};
    head.scale.setScalar(.84);
    // pelvis and mantle
    L(hips,[[-.14,.06,.06],[-.05,.12,.095],[.05,.125,.1],[.1,.1,.085]],D); add(hips,UC,T,0,.1,0,.135,.05,.108);
    S(AG(hips),[[.07,.135,.11],[-.04,.13,.106,0,0,.1,.1],[-.2,.08,.07,0,.02,.3,.3],[-.3,.03,.03,0,.03,.4,.4]],HP-.62,HP+.62,A,.014,0,0,0,0,0,0,3);
    add(hips,plate([[-.03,.04],[.03,.04],[.02,-.05],[0,-.09],[-.02,-.05]],.02,.006),T,0,-.02,.125,1,1,1,.12);
    for(const sx of [-1,1]){SX(sx,AG(hips),[[.07,.14,.112],[-.03,.146,.116],[-.13,.12,.094,0,0,.25,.25]],-.6,.62,A,.014,0,-.02,0,0,0,.2,3); joint(hips,.05,.036,sx*.15,-.05,0);}
    this.addTails([PI-1.3,PI-.78,PI-.26,PI+.26,PI+.78,PI+1.3],.17,.135,[.5],(g,k)=>{const w=k?.062:.07,w2=k?.02:.062,ln=k?.56:.5;
      add(g,plate([[-w,0],[w,0],[w2,-ln+.01],[0,-ln-(k?.06:-.01)],[-w2,-ln+.01]],.02,.007),M.cloth);
      for(const e of [-1,1])add(g,GB,T,e*(w+w2)/2,-ln/2,0,.008,ln-.02,.026,0,0,-e*(w-w2)/ln); if(!k)add(g,UC,T,0,-.01,0,.014,w*2.1,.014,0,0,HP);});
    // torso: bellows waist between pistons, a spine, a reactor column inside a cage of ribs
    L(chest,[[-.02,.085,.07],[.06,.07,.058],[.15,.095,.08]],R); L(chest,[[.1,.07,.06],[.3,.1,.085],[.48,.09,.075],[.53,.07,.06]],D,0,0,0,0,0,0,2.4);
    L(HG(chest),[[.12,.074,.064],[.3,.108,.092],[.46,.094,.08]],G,0,0,0,0,0,0,2.4);
    for(let k=0;k<6;k++)add(chest,GR,D,0,.08+k*.085,[-.085,-.115,-.14,-.15,-.15,-.13][k],.06,.066,.05);
    add(chest,UC,T,0,.3,.168,.062,.03,.062,HP); add(chest,GS,G,0,.3,.186,.042,.042,.018); L(chest,[[.5,.06,.064],[.6,.05,.056,0,.012]],R);
    const PEC=[[.31,.2,.162,0,0,.3,0],[.39,.224,.168],[.47,.2,.15],[.525,.12,.1]],BLD=[[.2,.14,.128,0,0,0,.6],[.3,.2,.168,0,0,0,.15],[.42,.228,.176],[.5,.18,.142],[.53,.12,.1]];
    S(AG(chest),[[.12,.11,.09,0,0,.3,.3],[.2,.166,.136,0,0,.05,.05],[.288,.198,.164]],HP-1.05,HP+1.05,A,.014,0,0,0,0,0,0,3.2,12);   // plackart under the core
    for(let k=0;k<3;k++)S(AG(chest),[[.5+k*.03,.15-k*.016,.122-k*.013],[.548+k*.03,.132-k*.016,.108-k*.013]],0,TAU,k<2?A:T,.012,0,0,0,0,0,0,2.4,14);   // gorget of three lames
    for(const sx of [-1,1]){
      rod(chest,T,sx*.085,-.03,.045,sx*.1,.16,.06,.011); rod(chest,D,sx*.08,-.03,-.04,sx*.09,.17,-.05,.016);
      for(let k=0;k<5;k++){const y=.15+k*.075,w=1-abs(k-2.2)*.09;SX(sx,chest,[[y-.012,.19*w,.146*w],[y+.012,.19*w,.146*w]],-HP+.2,HP-.3-(k>1?.25:0),D,.014,0,0,0,0,0,0,2.6,10);}   // ribs
      SX(sx,AG(chest),PEC,.45,HP-.045,A,.014,0,0,0,0,0,0,3.2,10); SX(sx,AG(chest),BLD,-HP+.22,-.45,A,.014,0,0,0,0,0,0,3.2,10);
      joint(chest,.062,.07,sx*.215,SHY,0);
      // pauldron: two stacked sloped plates with slit vents and a gold rim, as the Husks wear but larger
      const g=new THREE.Group();g.position.set(sx*.2,.57,0);g.rotation.z=-sx*(HP+.66);chest.add(g);
      SX(sx,g,[[-.05,.04,.09],[.08,.08,.16],[.22,.1,.2],[.32,.086,.18,0,0,.25,.25]],PI-1.25,PI+1.25,A,.018,0,0,0,0,0,0,3.2,10);
      SX(sx,g,[[.13,.064,.14],[.26,.08,.178],[.39,.064,.15,0,0,.3,.3]],PI-1.15,PI+1.15,A,.016,0,0,0,0,0,0,3.2,10);
      SX(sx,g,[[.306,.09,.188],[.33,.088,.182]],PI-1,PI+1,T,.012,0,0,0,0,0,0,3.2,10);
      for(const z of [-.06,.06])add(g,GB,R,-sx*.094,.16,z,.016,.12,.02,0,0,-sx*.1); flat(g,AG(chest));
    }
    // skull: a dark head with a narrow visor over a grille; helm plates and cheek guards (shed), a crest of three flat blades
    L(head,[[-.02,.06,.07],[.05,.092,.11,0,.004],[.12,.094,.122,0,-.012],[.2,.07,.1,0,-.03],[.24,.03,.045,0,-.05]],D,0,0,0,0,0,0,2.6,12);
    S(AG(head),[[.03,.094,.118,0,0,.45,.45],[.1,.108,.136,0,-.012],[.19,.09,.118,0,-.03],[.245,.05,.07,0,-.05],[.262,.018,.03,0,-.06]],-HP-2.25,-HP+2.25,A,.014,0,0,0,0,0,0,2.6,12);
    S(AG(head),[[.118,.1,.146,0,0,.3,.3],[.16,.098,.14,0,-.006],[.2,.08,.118,0,-.02,.2,.2]],HP-.8,HP+.8,A,.014,0,0,0,0,0,0,2.6);
    add(head,GB,G,0,.094,.118,.13,.016,.016); add(head,GR,D,0,.09,.104,.15,.06,.04); for(let k=-2;k<=2;k++)add(head,GR,T,k*.022,.03,.114,.01,.085,.014,.12);
    for(const [x,ln,dy] of [[0,.36,0],[.05,.3,-.25],[-.05,.3,.25]])add(head,plate([[-.07,0],[.02,0],[ln,.15],[ln-.04,.2],[-.03,.07]],.014,.005),T,x,.2,.02,1,1,1,0,HP+dy,0);
    for(const sx of [-1,1]){add(AG(head),plate([[-.03,.05],[.024,.062],[.03,-.05],[.008,-.11],[-.02,-.04]],.018,.005),A,sx*.074,.04,.106,1,1,1,0,sx*.55,0); add(head,UC,T,sx*.11,.1,0,.036,.036,.036,0,0,HP);}
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      struts(ua,D,T,-.03,-ARM1+.02,.026,.02,.02); SX(sx,AG(ua),[[-.05,.072,.078,.012],[-.11,.078,.084,.012],[-.2,.066,.07,.008],[-.265,.046,.05,.004,0,.5,.5]],-1.4,1.4,A,.014,0,0,0,0,0,0,3.2);
      joint(fa,.058,.12); struts(fa,D,T,-.03,-ARM2+.03,.024,.018,.018);
      SX(sx,AG(fa),[[-.06,.076,.082,.01],[-.12,.084,.09,.01],[-.23,.07,.076,.004],[-.285,.05,.055,0,0,.5,.5]],-1.45,1.45,A,.014,0,0,0,0,0,0,3.2); add(fa,UC,T,0,-.29,0,.056,.03,.056);
      add(sw,GR,D,0,0,0,.11,.12,.11);
      if(s===1){add(sw,UC,R,0,-.04,0,.028,.34,.028); add(sw,plate([[-.2,.0],[-.12,-.04],[.12,-.04],[.2,.0],[.14,.04],[-.14,.04]],.06,.012),T,0,.13,0); add(sw,UC,T,0,-.23,0,.04,.05,.04); add(sw,cone(.04,.09,4),T,0,-.3,0,1,1,1,PI);
        blade(sw,[[-.075,0],[.085,0],[.08,.9],[.06,1.45],[-.02,1.78],[-.07,1.6]],[[.085,.03],[.08,.9],[.06,1.45],[-.012,1.75]],null,.16); add(sw,GB,G,-.014,.9,0,.03,1.4,.03);}
      joint(ul,.07,.06); struts(ul,D,T,-.04,-L1+.03,.034,.022,.024);
      SX(sx,AG(ul),sy([[-.03,.1,.104,.012,.014],[-.1,.112,.116,.014,.016],[-.28,.09,.094,.004,.014],[-.4,.064,.068,0,.008,.5,.5]],q1),-.6,2.2,A,.016,0,0,0,0,0,0,3.2,10);
      joint(ll,.068,.16); S(AG(ll),[[.09,.05,.07,0,.03,.4,.4],[0,.074,.1,0,.03],[-.08,.05,.07,0,.03,.4,.4]],HP-.9,HP+.9,A,.014,0,0,0,0,0,0,3);
      struts(ll,D,T,-.04,-L2+.04,.028,.02,.02);
      S(AG(ll),sy([[-.07,.074,.084,0,.014],[-.16,.08,.09,0,.014],[-.34,.07,.08,0,.008],[-.45,.058,.066,0,.004,.3,.3]],q2),HP-.85,HP+.85,A,.014,0,0,0,0,0,0,3.2);
      S(AG(ll),sy([[-.06,.07,.09,0,-.026,.2,.2],[-.15,.08,.104,0,-.03],[-.3,.066,.082,0,-.018],[-.42,.05,.056,0,-.006,.5,.5]],q2),-HP-1.15,-HP+1.15,A,.014,0,0,0,0,0,0,3.2);
      add(ll,UC,T,0,-L2+.04,0,.05,.03,.05); joint(ft,.044,.1);
      L(ft,[[-.09,.07,.13,0,.05],[-.04,.064,.118,0,.05],[.0,.04,.06,0,.02]],D,0,0,0,0,0,0,3.4); add(ft,GR,D,0,-.08,.05,.15,.02,.33);
      S(AG(ft),[[-.085,.09,.15,0,.05],[-.03,.082,.136,0,.05],[.02,.056,.08,0,.02]],HP-1.9,HP+1.9,A,.014,0,0,0,0,0,0,3.4); add(ft,GR,T,0,-.07,.195,.15,.04,.05);
    }
  }
  buildFoe(add){
    const k=this.cfg.kind,M=this.mats;
    const L=(par,rings,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0,ex=2.6,seg=12)=>add(par,loft(rings,seg,ex),mat,x,y,z,1,1,1,rx,ry,rz);
    if(k==='brute')this.buildBrute(add,L,M);else if(k==='stalker')this.buildStalker(add,L,M);else this.buildHusk(add,L,M);
  }
  // Husk: a gaunt skeletal soldier, the Gatewarden's foot troop. Bone-coloured plates float over a twin-strut frame: sloped triangular
  // pauldrons with slit vents, a skull mask over a grille, leaf-shaped plates on forearm and calf, a cleaver arm and a claw hand.
  buildHusk(add,L,M){
    const {hips,chest,head}=this,{rod,hinge,struts,flat,S,SX,blade}=this.K,A=M.armor,T=M.trim,F=M.frame,R=M.rubber,G=M.glow,HP=PI/2,L1=this.L1,L2=this.L2;
    // pelvis: frame block, a pointed loin plate, hip plates raked out over the joints
    L(hips,[[-.12,.045,.05],[-.05,.085,.07],[.03,.095,.075],[.08,.08,.065]],F); add(hips,UC,T,0,.084,0,.098,.028,.08);
    S(hips,[[.05,.1,.082],[-.04,.096,.08],[-.15,.05,.05,0,.016,.35,.35]],HP-.75,HP+.75,A,.012); S(hips,[[.05,.098,.08],[-.03,.092,.076],[-.09,.06,.05,0,0,.3,.3]],-HP-.6,-HP+.6,A,.011);
    for(const sx of [-1,1]){SX(sx,hips,[[.05,.106,.086],[-.03,.11,.088],[-.1,.09,.072,0,0,.25,.25]],-.62,.62,A,.011,0,-.02,0,0,0,.2); hinge(hips,T,F,sx*.122,-.05,0,.04,.03);}
    // torso: bellows waist between pistons, a dark rib cage, layered chest plates either side of the core, shoulder blades and a spine behind
    L(chest,[[-.03,.055,.048],[.06,.046,.042],[.14,.066,.056]],R); L(chest,[[.1,.08,.066],[.22,.132,.098],[.34,.156,.11],[.44,.138,.094],[.49,.085,.066]],F);
    add(chest,UC,T,0,.2,.09,.044,.03,.044,HP); add(chest,GS,G,0,.2,.104,.031,.031,.014);
    S(chest,[[.445,.108,.09],[.5,.09,.076],[.53,.072,.062]],-HP+.85,HP+PI-.85,A,.011,0,0,0,0,0,0,2.4,12); L(chest,[[.47,.042,.046],[.57,.036,.042,0,.012]],R);
    const UP=[[.262,.128,.106,0,0,.45,0],[.33,.16,.12],[.41,.172,.12],[.465,.15,.1],[.49,.1,.074]],LO=[[.14,.08,.066,0,0,.5,.15],[.19,.108,.086,0,0,.2,0],[.25,.132,.106]];
    for(let k=0;k<5;k++)add(chest,GR,F,0,.1+k*.085,[-.078,-.1,-.112,-.118,-.104][k],.038,.062,.04);
    for(const sx of [-1,1]){
      rod(chest,T,sx*.056,-.03,.03,sx*.07,.15,.045,.008); rod(chest,F,sx*.05,-.03,-.03,sx*.06,.16,-.04,.012);
      SX(sx,chest,UP,.5,HP-.06,A,.012,0,0,0,0,0,0,2.6,10); SX(sx,chest,LO,.4,HP-.42,A,.011,0,0,0,0,0,0,2.6);
      SX(sx,chest,[[.2,.104,.098,0,0,0,.7],[.28,.144,.116,0,0,0,.2],[.4,.17,.126],[.47,.14,.106]],-HP+.2,-.5,A,.012,0,0,0,0,0,0,2.6,10);
      hinge(chest,T,F,sx*.2,SHY,0,.042,.05); rod(chest,T,sx*.07,.2,-.1,sx*.1,.4,-.2,.02); add(chest,UC,R,sx*.1,.4,-.2,.014,.02,.014,-.46,0,sx*.15);
      // pauldron: two stacked sloped plates fixed to the shoulder, slit vents in the upper one
      const g=new THREE.Group();g.position.set(sx*.165,.5,0);g.rotation.z=-sx*(HP+.4);chest.add(g);
      SX(sx,g,[[-.03,.03,.07],[.08,.058,.125],[.2,.072,.165],[.3,.06,.15,0,0,.25,.25]],PI-1.25,PI+1.25,A,.014,0,0,0,0,0,0,3.2,10);
      SX(sx,g,[[.12,.046,.112],[.24,.058,.15],[.35,.046,.128,0,0,.3,.3]],PI-1.15,PI+1.15,A,.012,0,0,0,0,0,0,3.2,10);
      for(const z of [-.05,.05])add(g,GB,R,-sx*.07,.16,z,.014,.1,.016,0,0,-sx*.1);
      if(sx>0)for(let k=0;k<3;k++)add(g,GB,R,-.067,.238+k*.02,-.075,.012,.01,.07,0,0,-.1);   // unit mark: three stencilled bars on the left shoulder
      flat(g);
    }
    // skull: dark head under a cranium plate, a brow, cheek plates either side of a grille, slanted eyes, swept fins
    L(head,[[0,.036,.046],[.05,.062,.08,0,.004],[.11,.068,.096,0,-.012],[.165,.054,.082,0,-.035],[.19,.026,.042,0,-.06]],F,0,0,0,0,0,0,2.4,12);
    S(head,[[.03,.066,.086,0,0,.4,.4],[.09,.08,.106,0,-.012],[.15,.07,.096,0,-.034],[.19,.04,.058,0,-.058],[.205,.014,.024,0,-.066]],-HP-2.25,-HP+2.25,A,.011,0,0,0,0,0,0,2.4,12);
    S(head,[[.1,.07,.112,0,0,.3,.3],[.135,.07,.108,0,-.004],[.17,.056,.09,0,-.014,.2,.2]],HP-.8,HP+.8,A,.012);
    add(head,GR,F,0,.075,.086,.1,.05,.03); for(let k=-2;k<=2;k++)add(head,GR,T,k*.017,.03,.094,.008,.07,.012,.12);
    for(const sx of [-1,1]){add(head,GB,G,sx*.03,.082,.103,.032,.012,.008,0,0,sx*.32);
      add(head,plate([[-.022,.04],[.018,.05],[.022,-.04],[.006,-.085],[-.014,-.03]],.014,.004),A,sx*.056,.036,.084,1,1,1,0,sx*.55,0);
      add(head,plate([[0,.02],[.05,.03],[.2,-.06],[.17,-.1],[.02,-.03]],.014,.004),T,sx*.082,.1,0,1,1,1,0,HP-sx*.25,0);}
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      // limbs: twin struts and a piston, a plate over the outside that stops short of each hinge so the frame shows
      struts(ua,F,F,-.02,-ARM1+.01,.016,.012,.012); SX(sx,ua,[[-.05,.044,.048,.01],[-.1,.047,.052,.01],[-.18,.04,.045,.008],[-.25,.026,.03,.004,0,.5,.5]],-1.35,1.35,A,.011,0,0,0,0,0,0,3);
      hinge(fa,F,F,0,0,0,.034,.066); struts(fa,F,F,-.02,-ARM2+.02,.014,.01,.011);
      SX(sx,fa,[[-.055,.046,.052,.008],[-.105,.05,.056,.008],[-.2,.04,.045,.004],[-.262,.027,.03,0,0,.5,.5]],-1.4,1.4,A,.011,0,0,0,0,0,0,3); add(fa,UC,F,0,-.282,0,.032,.018,.032);
      struts(ul,F,F,-.03,-L1+.02,.02,.012,.014);
      SX(sx,ul,[[-.04,.06,.06,.01,.02],[-.1,.066,.066,.01,.022],[-.24,.05,.052,.004,.02],[-.37,.034,.036,0,.01,.5,.5]],-.55,2.15,A,.012,0,0,0,0,0,0,3);
      hinge(ll,F,F,0,0,0,.044,.094); S(ll,[[.05,.03,.04,0,.012,.5,.5],[0,.042,.054,0,.014],[-.05,.03,.04,0,.012,.5,.5]],HP-.9,HP+.9,A,.011);
      struts(ll,F,F,-.03,-L2+.03,.016,.012,.012);
      S(ll,[[-.06,.05,.062,0,-.02,.2,.2],[-.13,.056,.07,0,-.022],[-.26,.046,.056,0,-.014],[-.38,.03,.034,0,-.006,.5,.5]],-HP-1.2,-HP+1.2,A,.012,0,0,0,0,0,0,3);
      S(ll,[[-.07,.04,.046,0,.012],[-.14,.044,.05,0,.012],[-.3,.036,.04,0,.006],[-.4,.028,.03,0,0,.4,.4]],HP-.8,HP+.8,A,.011,0,0,0,0,0,0,3); add(ll,UC,F,0,-L2+.03,0,.03,.02,.03);
      hinge(ft,F,F,0,0,0,.028,.066); add(ft,cone(.016,.11,5),F,0,-.045,-.05,1,1,1,PI+.6);
      for(const k of [-1,1])L(ft,[[0,.022,.02],[.07,.03,.024],[.17,.02,.014],[.225,.006,.005]],A,k*.03,-.022,-.01,1.86,0,-k*.22);
      add(sw,GR,F,0,-.01,0,.06,.07,.06);
      if(s===1){add(sw,UC,F,0,.03,0,.034,.06,.034); blade(sw,[[-.05,0],[.05,0],[.062,.5],[.075,.8],[.04,.95],[-.05,.86]],[[.05,.03],[.062,.5],[.075,.8],[.044,.94]],[[-.03,.08],[0,.08],[.01,.6],[-.02,.78],[-.036,.6]],.07,.014);}
      else for(let k=-1;k<=1;k++){add(sw,cone(.016,.2,4),F,k*.032,.12,0,1,1,1,0,0,-k*.22); add(sw,cyl(.011,.011,.07),F,k*.032,.025,0);}
    }
  }
  // Brute: a walking siege engine in matte olive. Boulder pauldrons, a barrel chest behind a vent grille, twin exhaust stacks with
  // antenna blades, a sunken visor head, gauntlets the size of anvils. Its armour is thick closed shells, cut into panels by dark seams.
  buildBrute(add,L,M){
    const {hips,chest,head}=this,{rod,hinge,S,SX}=this.K,A=M.armor,T=M.trim,F=M.frame,R=M.rubber,G=M.glow,HZ=M.hazard,HP=PI/2,L1=this.L1,L2=this.L2,q1=L1/LEG1,q2=L2/LEG2;
    // it stands tall and square on long legs: the weight is all in the shoulders
    this.pose=(o,c)=>{if(c===CL.eIdle){o[I.hy]+=.1;o[I.hip]-=.17;o[I.ch]-=.17;o[I.hd]+=.26;o[I.fl]+=.05;o[I.fr]-=.05;}};
    // P: a closed shell cut into panels at the heights ys, with a dark core showing in the seams between them
    const P=(par,rings,ys,x=0,y=0,z=0,rx=0,ry=0,rz=0,ex=3.4,seg=12)=>{L(par,rings.map(r=>[r[0],r[1]*.93,r[2]*.93,r[3]||0,r[4]||0]),F,x,y,z,rx,ry,rz,ex,seg);
      for(let k=0;k<ys.length-1;k++)L(par,cut(rings,ys[k]+(k?.007:0),ys[k+1]-(k<ys.length-2?.007:0)),A,x,y,z,rx,ry,rz,ex,seg);};
    const sy=(r,q)=>r.map(v=>[v[0]*q,...v.slice(1)]),HB=GB.clone();{const uv=HB.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,uv.getY(i)*.115);}   // HB: a strip whose chevrons keep their shape
    L(hips,[[-.15,.11,.1],[-.05,.2,.15],[.06,.19,.14],[.1,.14,.11]],F,0,0,0,0,0,0,3.4); add(hips,UC,T,0,.09,0,.19,.05,.15);
    S(hips,[[.03,.2,.16],[-.1,.19,.15,0,0,.1,.1],[-.26,.1,.09,0,.02,.3,.3]],HP-.6,HP+.6,A,.016,0,0,0,0,0,0,3.4); S(hips,[[.03,.2,.15],[-.08,.19,.145],[-.2,.13,.1,0,0,.25,.25]],-HP-.7,-HP+.7,A,.016,0,0,0,0,0,0,3.4);
    // torso: bellows waist, dark barrel, chest and back each of two plates split down the middle and across, a vent grille in the belly
    L(chest,[[-.02,.13,.11],[.06,.115,.1],[.14,.16,.13]],R); L(chest,[[.1,.17,.14],[.24,.24,.19],[.38,.25,.19],[.48,.2,.15],[.53,.13,.1]],F,0,0,0,0,0,0,3);
    const CH=[[.2,.236,.19,0,0,.3,0],[.26,.256,.204],[.37,.266,.204],[.47,.232,.172],[.52,.15,.12]],BK=[[.14,.19,.15,0,0,0,.3],[.26,.252,.2],[.4,.262,.2],[.5,.2,.15],[.535,.14,.11]];
    add(chest,GR,T,0,.14,.19,.3,.11,.05); for(let k=-1;k<=1;k++)add(chest,GB,G,k*.08,.14,.212,.034,.075,.012);
    for(let k=0;k<4;k++)add(chest,GR,F,0,.16+k*.1,-.215,.07,.07,.05);
    for(const sx of [-1,1]){
      SX(sx,chest,cut(CH,.2,.33),.3,HP-.035,A,.016,0,0,0,0,0,0,3.6,10); SX(sx,chest,cut(CH,.358,.52),.3,HP-.035,A,.016,0,0,0,0,0,0,3.6,10);
      SX(sx,chest,cut(BK,.14,.3),-HP+.2,-.3,A,.016,0,0,0,0,0,0,3.6,10); SX(sx,chest,cut(BK,.328,.535),-HP+.2,-.3,A,.016,0,0,0,0,0,0,3.6,10);
      SX(sx,hips,[[.03,.045,.105],[-.1,.05,.125],[-.24,.036,.085,0,0,.2,.2]],-1.3,1.3,A,.014,.235,0,0,0,0,-.15,3.6);
      add(chest,UC,T,sx*.105,.27,.235,.05,.15,.05,0,0,HP); hinge(chest,T,F,sx*.3,SHY,0,.085,.1);
      P(chest,[[-.13,.1,.13],[-.03,.155,.185],[.09,.145,.165],[.15,.07,.09]],[-.13,-.035,.15],sx*.36,.43,0,0,0,-sx*.22,3.8);
      add(chest,GR,T,sx*.375,.3,0,.3,.03,.36,0,0,-sx*.22); add(chest,HB,HZ,sx*.375,.3,.183,.28,.032,.008,0,0,-sx*.22);
      add(chest,plate([[-.035,0],[.035,0],[.05,.3],[.012,.44],[-.02,.3]],.022,.006),T,sx*.2,.5,-.2,1,1,1,-.3,HP,0);
      add(chest,UC,F,sx*.12,.6,-.22,.048,.3,.048,-.25); add(chest,UC,T,sx*.12,.69,-.243,.054,.04,.054,-.25); add(chest,UC,T,sx*.12,.53,-.203,.054,.04,.054,-.25); add(chest,UC,G,sx*.12,.746,-.258,.032,.02,.032,-.25);
    }
    // head: a small armoured block sunk between the shoulders, one visor slit under a heavy brow
    L(head,[[-.04,.08,.09],[.03,.1,.11],[.09,.085,.1],[.13,.045,.06]],A,0,-.02,.02,0,0,0,3); add(head,GR,F,0,.02,.125,.15,.06,.05); add(head,GB,G,0,.025,.153,.13,.022,.012); add(head,GR,T,0,.07,.08,.2,.03,.16,.15);
    for(const sx of [-1,1])add(head,GR,T,sx*.1,.0,.05,.02,.09,.1);
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      add(ua,limb(.06,.05,ARM1),F,sx*.04); P(ua,[[.04,.07,.075],[-.08,.1,.105],[-.22,.085,.09],[-.3,.06,.065]],[-.3,-.13,.04],sx*.05,0,0,0,0,0,3);
      hinge(fa,T,F,0,0,0,.078,.17); add(fa,limb(.06,.05,ARM2),F); P(fa,[[-.03,.075,.08],[-.12,.12,.125],[-.24,.125,.13],[-.31,.09,.095]],[-.31,-.2,-.03],sx*.015);
      add(fa,UC,T,sx*.14,-.15,0,.03,.24,.03); add(fa,GB,G,sx*.142,-.18,0,.012,.11,.06);
      P(sw,[[.07,.09,.09],[-.02,.15,.15],[-.15,.15,.15],[-.21,.1,.1]],[-.21,-.03,.07],0,0,0,0,0,0,4); add(sw,GR,T,0,-.085,0,.32,.06,.32); add(sw,GB,G,0,-.085,0,.33,.026,.1); add(sw,GB,G,0,-.085,0,.1,.026,.33);
      for(const k of [-1,1])add(sw,cone(.04,.13,4),T,k*.08,-.26,0,1,1,1,PI);
      // leg: armoured thigh, a hinge knee with its cap and pistons, a shin plate flaring to a broad foot
      hinge(ul,F,F,0,0,0,.09,.1); add(ul,limb(.08,.065,L1),F); P(ul,sy([[.04,.08,.085],[-.1,.125,.13,sx*.02,.01],[-.3,.105,.11,sx*.01,.01],[-.44,.08,.085]],q1),[-.44*q1,-.2*q1,.04],0,0,0,0,0,0,3.2);
      hinge(ll,F,F,0,0,0,.088,.2); S(ll,[[.1,.06,.08,0,.04,.3,.3],[0,.09,.115,0,.04],[-.09,.06,.08,0,.04,.3,.3]],HP-.9,HP+.9,A,.016,0,0,0,0,0,0,3.4);
      add(ll,limb(.06,.05,L2),F); P(ll,sy([[-.05,.075,.08],[-.18,.092,.1],[-.36,.118,.132,0,.014],[-.46,.1,.12,0,.018]],q2),[-.46*q2,-.27*q2,-.05*q2],0,0,0,0,0,0,3.4);
      for(const k of [-1,1])rod(ll,F,k*.05,-.04,-.085,k*.05,-.36*q2,-.115,.014);
      P(ft,[[-.09,.13,.19,0,.05],[-.04,.124,.18,0,.05],[.02,.085,.115,0,.02]],[-.09,-.03,.02],0,0,0,0,0,0,3.6); add(ft,GR,F,0,-.07,.215,.23,.045,.07); add(ft,GR,F,0,-.083,.05,.22,.016,.4); add(ft,HB,HZ,0,-.07,.2515,.2,.03,.006);
    }
  }
  // Stalker: a lean assassin frame, violet-black. Keel chest, a long swept skull with one vertical eye, four broad wing blades in an X
  // on the back, a clipped blade on a bracket at each wrist. Thin lines of light on its limbs and blades carry it in a dark hall.
  buildStalker(add,L,M){
    const {hips,chest,head}=this,{rod,hinge,struts,flat,S,SX,blade}=this.K,A=M.armor,T=M.trim,F=M.frame,R=M.rubber,G=M.glow,HP=PI/2,L1=this.L1,L2=this.L2;
    // it waits lower than the others, leaning into the dash
    this.pose=(o,c)=>{if(c===CL.eIdle){o[I.hy]-=.07;o[I.hip]+=.12;o[I.ch]+=.14;o[I.hd]-=.26;}};
    L(hips,[[-.12,.04,.046],[-.05,.08,.068],[.03,.088,.072],[.08,.072,.06]],F); add(hips,UC,T,0,.082,0,.088,.026,.072);
    S(hips,[[.05,.092,.076],[-.04,.086,.072],[-.17,.03,.036,0,.016,.4,.4]],HP-.6,HP+.6,A,.011); S(hips,[[.05,.09,.074],[-.02,.084,.07],[-.08,.05,.044,0,0,.3,.3]],-HP-.55,-HP+.55,A,.01);
    for(const sx of [-1,1]){SX(sx,hips,[[.05,.096,.078],[-.03,.098,.08],[-.09,.08,.064,0,0,.25,.25]],-.55,.55,A,.01,0,-.02,0,0,0,.18); hinge(hips,T,F,sx*.11,-.05,0,.036,.028);}
    // torso: black bellows waist, dark ribs, two chest plates meeting on a keel with the eye of the core between them
    L(chest,[[-.02,.05,.044],[.07,.04,.036],[.15,.058,.05]],R); L(chest,[[.1,.07,.06],[.22,.118,.09],[.36,.15,.098],[.45,.122,.08],[.49,.07,.056]],F);
    add(chest,UC,T,0,.3,.118,.034,.024,.034,HP); add(chest,GS,G,0,.3,.128,.024,.03,.012); L(chest,[[.47,.034,.038],[.57,.03,.036,0,.014]],R);
    const KEEL=[[.17,.03,.05,0,.03,.3,0],[.25,.09,.094,0,.012,.1,0],[.36,.146,.112],[.45,.14,.096],[.488,.08,.064]];
    for(let k=0;k<5;k++)add(chest,GR,F,0,.12+k*.08,[-.07,-.09,-.1,-.104,-.09][k],.032,.056,.034);
    for(const sx of [-1,1]){
      SX(sx,chest,KEEL,.45,HP-.05,A,.011,0,0,0,0,0,0,2.2,10); SX(sx,chest,[[.22,.094,.092,0,0,0,.6],[.32,.134,.11],[.44,.138,.104],[.485,.08,.07]],-HP+.2,-.45,A,.011,0,0,0,0,0,0,2.4,10);
      hinge(chest,T,F,sx*.2,SHY,0,.036,.044);
      // shoulder plate, bevelled, fixed to the chest
      const g=new THREE.Group();g.position.set(sx*.19,.47,-.01);g.rotation.z=-sx*(HP+.2);chest.add(g);
      SX(sx,g,[[-.02,.02,.05],[.08,.036,.082],[.2,.026,.066],[.27,.012,.03]],PI-1.2,PI+1.2,A,.012,0,0,0,0,0,0,2.8,8); flat(g);
      // wing blades: broad at the root, tapering, a line of light down the trailing edge; the upper pair a fifth longer
      for(const [an,ln,rx] of [[.75,.66,-.6],[2.25,.54,.5]]){const w=new THREE.Group();w.position.set(sx*.07,.36,-.118);w.rotation.set(rx,0,-sx*an);chest.add(w);
        add(w,plate([[-.046,0],[.046,0],[.04,ln*.55],[.012,ln],[-.014,ln*.8],[-.04,ln*.3]],.018,.006),A); add(w,GB,G,-sx*.04,ln*.36,0,.007,ln*.6,.022,0,0,-sx*.07);
        add(w,UC,T,0,.02,0,.03,.03,.03,HP); flat(w);}
    }
    // head: mantis skull swept back to a crest, one vertical eye in a dark face, mandible plates
    L(head,[[0,.035,.045],[.05,.058,.082,0,.01],[.1,.058,.106,0,-.02],[.14,.038,.096,0,-.07],[.165,.014,.05,0,-.14]],F,0,0,0,0,0,0,2.2,12);
    S(head,[[.02,.05,.07,0,.004,.5,.5],[.06,.066,.094,0,.004],[.108,.065,.116,0,-.02],[.148,.044,.104,0,-.07],[.172,.016,.054,0,-.14]],-HP-2.4,-HP+2.4,A,.01,0,0,0,0,0,0,2.2,12);
    add(head,GB,G,0,.078,.106,.016,.09,.012); add(head,plate([[0,0],[.34,.1],[.4,.16],[.05,.07]],.012,.004),A,0,.14,-.02,1,1,1,0,HP,0);
    for(const sx of [-1,1])add(head,plate([[-.014,.03],[.014,.03],[.008,-.1],[0,-.15]],.012,.004),T,sx*.046,.02,.08,1,1,1,.5,sx*.4,0);
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      struts(ua,F,F,-.02,-ARM1+.01,.014,.01,.0105); SX(sx,ua,[[-.04,.04,.044,.008],[-.09,.042,.046,.008],[-.17,.034,.038,.006],[-.25,.022,.026,.002,0,.5,.5]],-1.3,1.3,A,.01,0,0,0,0,0,0,2.8);
      hinge(fa,F,F,0,0,0,.03,.058); struts(fa,F,F,-.02,-ARM2+.02,.012,.009,.0095);
      SX(sx,fa,[[-.05,.038,.044,.006],[-.1,.04,.046,.006],[-.2,.032,.036,.003],[-.262,.022,.025,0,0,.5,.5]],-1.35,1.35,A,.01,0,0,0,0,0,0,2.8); add(fa,cone(.016,.16,4),A,0,.05,-.04,1,1,1,-.5);
      // wrist blade on its bracket: tapering, clipped at the tip, honed along the cutting edge
      add(sw,GR,F,0,.03,0,.07,.06,.036); add(sw,GR,F,0,.11,0,.05,.12,.024); for(const y of [.07,.15])add(sw,UC,F,0,y,0,.008,.04,.008,HP);
      blade(sw,[[-.028,0],[.032,0],[.036,.3],[.026,.82],[-.01,.98],[-.03,.9]],[[.032,.04],[.036,.3],[.026,.82],[-.006,.97]],[[-.018,.1],[.006,.1],[.008,.6],[-.012,.8],[-.02,.6]],.06,.01);
      struts(ul,F,F,-.03,-L1+.02,.017,.011,.012);
      SX(sx,ul,[[-.04,.054,.058,.008,.014],[-.09,.058,.062,.008,.014],[-.24,.044,.048,.002,.012],[-.39,.028,.03,0,.006,.5,.5]],-.55,2.15,A,.011,0,0,0,0,0,0,2.8); add(ul,GB,G,sx*.062,-.16,.02,.005,.2,.008,0,0,sx*.06);
      hinge(ll,F,F,0,0,0,.038,.084); add(ll,cone(.02,.14,4),A,0,.06,.05,1,1,1,.25);
      struts(ll,F,F,-.03,-L2+.03,.014,.01,.0105);
      S(ll,[[-.05,.042,.052,0,-.016,.2,.2],[-.12,.046,.058,0,-.018],[-.27,.036,.044,0,-.01],[-.4,.024,.028,0,-.004,.5,.5]],-HP-1.2,-HP+1.2,A,.011,0,0,0,0,0,0,2.8);
      S(ll,[[-.06,.034,.04,0,.012],[-.14,.036,.042,0,.012],[-.3,.03,.034,0,.006],[-.42,.022,.024,0,0,.4,.4]],HP-.8,HP+.8,A,.01,0,0,0,0,0,0,2.8); add(ll,GB,G,sx*.04,-.22,0,.005,.2,.008);
      hinge(ft,F,F,0,0,0,.024,.056); L(ft,[[0,.024,.022],[.06,.034,.026],[.16,.024,.016],[.23,.006,.005]],A,0,-.02,-.012,1.875); add(ft,cone(.014,.11,5),F,0,-.045,-.05,1,1,1,PI+.6);
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
    if(this.pose)this.pose(tmp,this.clip);   // how this body carries itself (set by its builder)
    if(this.bt<this.bd){const k=smooth(this.bt/this.bd),f=this.from;for(let i=0;i<PN;i++)cur[i]=f[i]+(tmp[i]-f[i])*k;slerp3(cur,I.sl,f,tmp,k);slerp3(cur,I.sr,f,tmp,k);}else cur.set(tmp);
    if(dt>0&&dt<.1){const x=this.spx,v=this.spv;if(!this.spOn){this.spOn=true;for(const i of SPR)x[i]=cur[i];}
      for(let j=0;j<SPR.length;j++){const i=SPR[j],w=j<3?26:17,z=j<3?.5:.38;v[i]+=((cur[i]-x[i])*w*w-v[i]*2*z*w)*dt;x[i]+=v[i]*dt;cur[i]=x[i];}}
    // a foe's tell and hit flash run through its own lights: eyes, core and weapon strip flare with the armour's emissive level
    const am=this.mats.armor,gm=this.mats.glow;if(am&&gm&&am.emissive)gm.color.copy(gm.userData.base||(gm.userData.base=gm.color.clone())).multiplyScalar(1+min(1.2,am.emissiveIntensity)*2.2);
    this.apply(dt);
  }
  apply(dt){
    const p=this.cur,{body,hips,chest,head}=this;
    body.rotation.set(p[1],p[2],p[3]); _a.set(0,PIV,0).applyQuaternion(body.quaternion); body.position.set(-_a.x,p[0]+PIV-_a.y,-_a.z);
    hips.position.set(0,this.hipH+p[4],p[5]); hips.rotation.set(p[6],p[7],p[8]); chest.rotation.set(p[9],p[10],p[11]); head.rotation.set(p[12],p[13],p[14]);
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
      const fi=I.fl+s*3; _b.set(p[fi],p[fi+1]+ANK,p[fi+2]); _d.set(sx*this.knee,0,1);
      ik2(_a,_b,this.L1,this.L2,_d,ul.quaternion,ll.quaternion);
      _q2.copy(ul.quaternion).multiply(ll.quaternion).invert(); _q.setFromAxisAngle(XAX,clamp(p[fi+1]*1.6,0,.75)); this.foot[s].quaternion.copy(_q2).multiply(_q);
    }
    if(this.tails){
      const lv=this.lv,sp=min(30,abs(p[I.rot+1]-this.pry)/max(dt,1e-4)); this.pry=p[I.rot+1]; this.tt+=dt;
      const spd=hypot(lv.x,lv.z);
      for(const tl of this.tails){const nx=sin(tl.a),nz=cos(tl.a);
        const tg=clamp(this.tailBase-(nx*lv.x+nz*lv.z)*.085-this.vy*.05+sp*.05+sin(this.tt*(7+spd)+tl.a*3)*.05*(1+spd*.25),-.12,1.4);
        const v=tl.v,sg=tl.seg;for(let k=0;k<v.length;k++){v[k]=damp(v[k],tg,k?k>1?3:5:11,dt);sg[k].rotation.x=k?-v[k]*.55+(v[k-1]-v[k])*.5:-v[0];}}
    }
  }
}
