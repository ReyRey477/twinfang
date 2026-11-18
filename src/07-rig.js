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
// Wear data, one vec4 per vertex (aW): x and y are the metres from that point to the nearest plate border or hard crease, measured
// across and along the part, less WB (so geometry without the attribute reads as far from any edge); z is how low on its part the
// point sits (0..1, filled in by bake) and w is 1, or 0 for a part painted in the second tone. The character material (charMat in
// 04-textures) rubs the paint through to metal where x or y is small, darkens by z and swaps colour by w. Below zero = a bolt head.
const WB=.25;
// distance along the polyline P (points [x,y,z]) from each point to the nearest edge or crease. The edges of an open line are the
// points e in from its ends (0 for a closed shell's cap, 1 for a plate, whose first and last points are its rolled rim); a crease is
// a corner sharper than thr radians. Where a chamfer puts a crease right next to an edge, the crease alone counts.
const edgeD=(P,closed,thr,e=0,pre)=>{const m=P.length,s=[0],mk=new Set();for(let i=1;i<m;i++)s.push(s[i-1]+hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1],P[i][2]-P[i-1][2]));
  const tot=closed?s[m-1]+hypot(P[0][0]-P[m-1][0],P[0][1]-P[m-1][1],P[0][2]-P[m-1][2]):0;
  for(let i=closed?0:e+1;i<(closed?m:m-1-e);i++){if(pre){if(pre[i-e])mk.add(i);continue;}const a=P[(i+m-1)%m],p=P[i],b=P[(i+1)%m],ux=p[0]-a[0],uy=p[1]-a[1],uz=p[2]-a[2],vx=b[0]-p[0],vy=b[1]-p[1],vz=b[2]-p[2],l=hypot(ux,uy,uz)*hypot(vx,vy,vz);
    if(l>1e-10&&Math.acos(clamp((ux*vx+uy*vy+uz*vz)/l,-1,1))>thr)mk.add(i);}
  if(!closed){if(!mk.has(e+1))mk.add(e);if(!mk.has(m-2-e))mk.add(m-1-e);}
  return P.map((_,i)=>{let d=WB;for(const k of mk){let q=abs(s[i]-s[k]);if(closed)q=min(q,tot-q);d=min(d,q);}return d;});};
// which rings of a stack are creases: where the profile turns by more than 40 degrees (judged on the profile itself: a column of
// the built grid also runs sideways wherever a plate's ends are trimmed, and that is not a crease)
const ringCrease=rings=>rings.map((r,j)=>{if(!j||j===rings.length-1)return false;const a=ring7(rings[j-1]),p=ring7(r),b=ring7(rings[j+1]);
  for(const [k,c,g] of [[1,3,1],[1,3,-1],[2,4,1],[2,4,-1]]){const u=p[c]+g*p[k]-a[c]-g*a[k],v=b[c]+g*b[k]-p[c]-g*p[k],uy=p[0]-a[0],vy=b[0]-p[0],l=hypot(u,uy)*hypot(v,vy);if(l>1e-10&&Math.acos(clamp((u*v+uy*vy)/l,-1,1))>.7)return true;}return false;});
// write aW for a grid of rows x cols points (pt(j,i) = [x,y,z]); ring = the rows are closed loops (their last point repeats the
// first); rc = which rows are creases (see ringCrease), counted from the first row that is not rim
const wearGrid=(rows,cols,pt,ring,boxy,rc,span=TAU,e=0)=>{const w=new Float32Array(rows*cols*4),thr=boxy?max(.5,1.2*span/(cols-1-e*2)):9;   // only a boxy section has corners worth wearing
  for(let j=0;j<rows;j++){const P=[];for(let i=0;i<cols-(ring?1:0);i++)P.push(pt(j,i));const d=edgeD(P,ring,thr,e);for(let i=0;i<cols;i++){w[(j*cols+i)*4]=d[i%d.length]-WB;w[(j*cols+i)*4+3]=1;}}
  for(let i=0;i<cols;i++){const P=[];for(let j=0;j<rows;j++)P.push(pt(j,i));const d=edgeD(P,false,.7,e,rc);for(let j=0;j<rows;j++)w[(j*cols+i)*4+1]=d[j]-WB;}
  return w;};
// lofted shell: rings [y, rx, rz, cx, cz] stacked along Y, each a superellipse (ex 2 = ellipse, higher = boxier), closed at both ends.
// This is what gives the characters smooth, sculpted shells instead of boxes and tubes.
// The wear data needs a point that is not on an edge between any two edges: a part of two rings gets a middle one, and so does
// any band that lies between two creases (or a crease and an end).
const mid3=rings=>{let R=rings.map(ring7);const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);if(R.length===2)R=[R[0],mid(R[0],R[1]),R[1]];
  const n=R.length,mk=ringCrease(R);mk[0]=!mk[1];mk[n-1]=!mk[n-2];const out=[R[0]];for(let j=1;j<n;j++){if(mk[j-1]&&mk[j])out.push(mid(R[j-1],R[j]));out.push(R[j]);}return out;};
const loft=(rings,seg=14,ex=2.4)=>{const key='L'+seg+ex+rings.join('|');if(geoCache[key])return geoCache[key];rings=mid3(rings);
  const n=rings.length,pos=[],uv=[],idx=[],W=seg+1,up=rings[n-1][0]>rings[0][0],pw=2/ex;
  for(let j=0;j<n;j++){const [y,rx,rz,cx=0,cz=0]=rings[j];for(let i=0;i<=seg;i++){const a=i/seg*TAU,c=cos(a),s=sin(a);
    pos.push(cx+rx*Math.sign(c)*pow(abs(c),pw),y,cz+rz*Math.sign(s)*pow(abs(s),pw));uv.push(i/seg,j/(n-1));}}
  for(let j=0;j<n-1;j++)for(let i=0;i<seg;i++){const a=j*W+i,b=a+W;if(up)idx.push(a,b,a+1,b,b+1,a+1);else idx.push(a,a+1,b,b,a+1,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const wg=wearGrid(n,W,(j,i)=>[pos[(j*W+i)*3],pos[(j*W+i)*3+1],pos[(j*W+i)*3+2]],true,ex>=3,ringCrease(rings));g.setAttribute('aW',new THREE.Float32BufferAttribute(wg,4));
  const nr=g.attributes.normal;for(let j=0;j<n;j++){const a=j*W,b=a+seg,x=nr.getX(a)+nr.getX(b),y=nr.getY(a)+nr.getY(b),z=nr.getZ(a)+nr.getZ(b),l=hypot(x,y,z)||1;nr.setXYZ(a,x/l,y/l,z/l);nr.setXYZ(b,x/l,y/l,z/l);}
  // flat caps on their own vertices
  const cp=[],cu=[],cn=[],ci=[],cw=[];for(const [j,top] of [[0,!up],[n-1,up]]){const [y,rx,rz,cx=0,cz=0]=rings[j],o=cp.length/3;cp.push(cx,y,cz);cu.push(.5,.5);cn.push(0,top?1:-1,0);cw.push(min(rx,rz,WB)-WB,0,0,1);
    for(let i=0;i<=seg;i++){const k=(j*W+i)*3;cp.push(pos[k],pos[k+1],pos[k+2]);cu.push(.5+cos(i/seg*TAU)*.5,.5+sin(i/seg*TAU)*.5);cn.push(0,top?1:-1,0);cw.push(-WB,0,0,1);}
    for(let i=0;i<seg;i++)top?ci.push(o,o+2+i,o+1+i):ci.push(o,o+1+i,o+2+i);}
  const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(cp,3));cg.setAttribute('uv',new THREE.Float32BufferAttribute(cu,2));cg.setAttribute('normal',new THREE.Float32BufferAttribute(cn,3));cg.setAttribute('aW',new THREE.Float32BufferAttribute(cw,4));cg.setIndex(ci);
  return geoCache[key]=mergeGeometries([g.toNonIndexed(),cg.toNonIndexed()],false);};
// a ring lying flat (axis Y), or upright facing +Z when flat=0
const ringGeo=(R,t,flat=1)=>{const k='r'+R+t+flat;if(geoCache[k])return geoCache[k];const g=new THREE.TorusGeometry(R,t,8,20);if(flat)g.rotateX(PI/2);return geoCache[k]=g;};
// part of a ring round the Y axis: a finger curled round a grip. a0 = start angle (0 = +X, quarter turn = +Z), len = sweep
const arcGeo=(R,t,a0,len)=>{const k='a'+R+t+a0+len;if(geoCache[k])return geoCache[k];return geoCache[k]=new THREE.TorusGeometry(R,t,6,12,len).rotateX(PI/2).rotateY(-a0);};
// bevelled plate from a 2D outline (faces +Z): gives armour its angular silhouettes
const plate=(pts,d=.03,bv=.012)=>{const k='p'+pts.join()+d+bv;if(geoCache[k])return geoCache[k];const s=new THREE.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:max(.001,d-bv*2),bevelEnabled:true,bevelThickness:bv,bevelSize:bv,bevelSegments:1}).translate(0,0,-max(.001,d-bv*2)/2);
  const w=new Float32Array(g.attributes.position.count*4),sd=g.groups[1];for(let i=0;i<w.length;i+=4){w[i+3]=1;if(sd&&i/4>=sd.start&&i/4<sd.start+sd.count)w[i]=w[i+1]=-WB;}   // the bevel and the side wall are all edge
  g.setAttribute('aW',new THREE.BufferAttribute(w,4));return geoCache[k]=g;};
// armour plate: the wall of a loft between the angles a0 and a1 (0 = +X, a quarter turn = +Z), th thick, its rim rolled over so it
// catches a line of light, and open behind so the frame under it shows. A ring may end with two trims (radians) that pull the
// start and the end of the arc in at that height: [y, rx, rz, cx, cz, t0, t1]. Plates like this floating over a dark frame,
// with gaps between them, are what the cast is built from.
// bolts: fastener heads stood on the plate. A count (2 = one at each end, 4 = the corners, 6 = corners and mid sides) or a list of
// [u, v] (0..1 across and along the plate, measured inside a margin); br = head radius.
const BOLT=(()=>{const g=new THREE.CylinderGeometry(.7,1,1,6).toNonIndexed(),n=g.attributes.position.count,w=new Float32Array(n*4);for(let i=0;i<n;i++){w[i*4]=w[i*4+1]=-WB-.01;w[i*4+3]=1;}g.setAttribute('aW',new THREE.BufferAttribute(w,4));return g;})();
const BOLTS={2:[[.5,0],[.5,1]],3:[[0,0],[1,0],[.5,1]],4:[[0,0],[1,0],[0,1],[1,1]],5:[[0,0],[1,0],[0,1],[1,1],[.5,.5]],6:[[0,0],[1,0],[0,.5],[1,.5],[0,1],[1,1]]};
const shell=(rings,a0,a1,th=.012,seg=8,ex=2.4,bolts=0,br=.0065)=>{const key='S'+[a0,a1,th,seg,ex,br]+'b'+(bolts&&bolts.join?bolts.join(';'):bolts)+rings.join('|');if(geoCache[key])return geoCache[key];
  rings=mid3(rings);const n=rings.length,pw=2/ex,dir=rings[n-1][0]>rings[0][0]?1:-1,R=n+2,C=seg+3,out=[];let P0;
  for(let inner=0;inner<2;inner++){const pos=[],uv=[],idx=[];
    for(let j=0;j<R;j++){const [y,rx,rz,cx=0,cz=0,t0=0,t1=0]=rings[clamp(j-1,0,n-1)],ej=j===0?-1:j===R-1?1:0,b0=a0+t0,b1=a1-t1,o=pos.length;
      for(let i=0;i<C;i++){const a=b0+(b1-b0)*clamp(i-1,0,seg)/seg,c=cos(a),s=sin(a),d=inner||ej||i===0||i===C-1?th:0;
        pos.push(cx+(rx-d)*Math.sign(c)*pow(abs(c),pw),y+ej*dir*th,cz+(rz-d)*Math.sign(s)*pow(abs(s),pw));uv.push(i/(C-1),j/(R-1));}
      for(const [e,p,q] of [[0,1,2],[C-1,C-2,C-3]]){const k=o+e*3,dx=pos[o+p*3]-pos[o+q*3],dz=pos[o+p*3+2]-pos[o+q*3+2],l=th/(hypot(dx,dz)||1);pos[k]+=dx*l;pos[k+2]+=dz*l;}}   // the rim: one plate thickness further along the surface
    for(let j=0;j<R-1;j++)for(let i=0;i<C-1;i++){const a=j*C+i,b=a+C;if((dir>0)!==!!inner)idx.push(a,b,a+1,b,b+1,a+1);else idx.push(a,a+1,b,b,a+1,b+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    // wear: the edge is the crease where the face of the plate turns over into its rolled rim
    const at=(j,i)=>{const k=(j*C+i)*3;return [pos[k],pos[k+1],pos[k+2]];};
    g.setAttribute('aW',new THREE.BufferAttribute(wearGrid(R,C,at,false,ex>=3,ringCrease(rings),abs(a1-a0),1),4));if(!inner)P0=at;out.push(g.toNonIndexed());}
  if(bolts){const ins=br*2.6,bl=(fj,fi)=>{const j=clamp(floor(fj),0,n-2),i=clamp(floor(fi),0,seg-1),v=fj-j,u=fi-i,a=P0(j+1,i+1),b=P0(j+1,i+2),c=P0(j+2,i+1),d=P0(j+2,i+2);
      return [0,1,2].map(k=>(a[k]*(1-u)+b[k]*u)*(1-v)+(c[k]*(1-u)+d[k]*u)*v);},len=(f,g)=>{let l=0,p=f(0);for(let k=1;k<=g;k++){const q=f(k);l+=hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2]);p=q;}return l;};
    for(const [u,v] of BOLTS[bolts]||bolts){const Lc=len(k=>bl(k,seg/2),n-1);if(Lc<ins*2.4)continue;const fj=(ins+(Lc-ins*2)*v)/Lc*(n-1),Lr=len(k=>bl(fj,k),seg);if(Lr<ins*2.4)continue;const fi=(ins+(Lr-ins*2)*u)/Lr*seg;
      const p=bl(fj,fi),pu=bl(fj,min(seg,fi+.3)),pm=bl(fj,max(0,fi-.3)),pv=bl(min(n-1,fj+.3),fi),pw2=bl(max(0,fj-.3),fi),r=rings[clamp(Math.round(fj),0,n-1)];
      _a.set(pu[0]-pm[0],pu[1]-pm[1],pu[2]-pm[2]);_b.set(pv[0]-pw2[0],pv[1]-pw2[1],pv[2]-pw2[2]);_c.crossVectors(_a,_b);if(_c.lengthSq()<1e-12)continue;_c.normalize();
      if(_c.x*(p[0]-(r[3]||0))+_c.z*(p[2]-(r[4]||0))<0)_c.negate();const h=br*.6;
      out.push(BOLT.clone().applyMatrix4(_m4.compose(_a.set(p[0],p[1],p[2]).addScaledVector(_c,h*.5-.0012),_q.setFromUnitVectors(UPV,_c),_b.set(br,h,br))));}}
  return geoCache[key]=mergeGeometries(out,false);};
const ring7=r=>[r[0],r[1],r[2],r[3]||0,r[4]||0,r[5]||0,r[6]||0];
const mirS=rings=>rings.map(r=>[r[0],r[1],r[2],-(r[3]||0),r[4]||0,r[6]||0,r[5]||0]);   // the same plate for the other side of the body
// the part of a ring stack between two heights: splits one shell into panels with a dark seam between them
const cut=(rings,ya,yb)=>{const R=rings.map(ring7),n=R.length,lo=min(ya,yb),hi=max(ya,yb),up=R[n-1][0]>R[0][0];
  const at=y=>{for(let j=0;j<n-1;j++){const a=R[j],b=R[j+1];if((y-a[0])*(y-b[0])<=0){const k=(y-a[0])/((b[0]-a[0])||1);return a.map((v,i)=>v+(b[i]-v)*k);}}return (abs(y-R[0][0])<abs(y-R[n-1][0])?R[0]:R[n-1]).slice();};
  const mid=R.filter(r=>r[0]>lo+1e-4&&r[0]<hi-1e-4);return up?[at(lo),...mid,at(hi)]:[at(hi),...mid,at(lo)];};
// shrink: the same section d smaller (an under-layer) or, with a negative d, larger (a strip laid on top). ends: pull in the first and
// the last ring of a plate, which rounds its corners. cham: a closed shell with its two end rims cut back at 45 degrees.
// prow: trims that end a plate on the plane x = xf at the front end and x = xb at the back end of its arc from -90 to 90 degrees;
// with 0, two mirrored halves meet there on a ridge.
const shrink=(rings,d)=>rings.map(r=>[r[0],r[1]-d,r[2]-d,...r.slice(3)]);
const ends=(rings,a,b=a,c=a,d=c)=>rings.map((r,i)=>i===0?[...ring7(r).slice(0,5),a,b]:i===rings.length-1?[...ring7(r).slice(0,5),c,d]:r);
const cham=(rings,c)=>{const n=rings.length,d=rings[n-1][0]>rings[0][0]?c:-c,a=rings[0],b=rings[n-1];return [[a[0],a[1]-c,a[2]-c,...a.slice(3)],[a[0]+d,...a.slice(1)],...rings.slice(1,-1),[b[0]-d,...b.slice(1)],[b[0],b[1]-c,b[2]-c,...b.slice(3)]];};
const prow=(rings,ex,xf=0,xb=xf)=>rings.map(r=>{const q=ring7(r),t=x=>PI/2-Math.acos(pow(clamp((x-q[3])/q[1],0,1),ex/2));return [...q.slice(0,5),t(xb),t(xf)];});
const UC=new THREE.CylinderGeometry(1,1,1,12);   // unit rod: scaled into struts, pistons, hinge discs (UPV, the up vector, is from 05-world)
const PISTON=mergeGeometries([new THREE.CylinderGeometry(.015,.015,.56,8).translate(0,.28,0),new THREE.CylinderGeometry(.008,.008,.5,8).translate(0,.75,0)],false);   // sleeve and rod, one unit long: stretched between two bones
const ZAX=V(0,0,1);
// slab: a block with a real bevel c wide on every edge: flat faces, smooth across the bevels, so each edge catches its own line of
// light. Its wear line runs down the middle of each bevel.
const slab=(w,h,d,c=.014)=>{const k='b'+[w,h,d,c];if(geoCache[k])return geoCache[k];const g=new RoundedBoxGeometry(w,h,d,2,c),n=g.attributes.normal,q=new Float32Array(n.count*4);
  for(let i=0;i<n.count;i++){const t=Math.acos(min(1,max(abs(n.getX(i)),abs(n.getY(i)),abs(n.getZ(i)))));q[i*4]=q[i*4+1]=c<.008?0:(t<.01?.03:max(0,c*(PI/4-t)))-WB;q[i*4+3]=1;}   // (the flat of a face counts as well clear of the edge; a thin strip is a painted band: no wear)
  g.setAttribute('aW',new THREE.BufferAttribute(q,4));return geoCache[k]=g;};
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
    const S=(par,rings,a0,a1,mat,th=.012,x=0,y=0,z=0,rx=0,ry=0,rz=0,ex=2.4,seg=8,bolts=0,br)=>add(par,shell(rings,a0,a1,th,seg,ex,bolts,br),mat,x,y,z,1,1,1,rx,ry,rz);
    const SX=(sx,par,rings,a0,a1,mat,th,x=0,y=0,z=0,rx=0,ry=0,rz=0,ex,seg,bolts,br)=>sx<0?S(par,mirS(rings),PI-a1,PI-a0,mat,th,-x,y,z,rx,-ry,-rz,ex,seg,bolts&&bolts.map?bolts.map(b=>[1-b[0],b[1]]):bolts,br):S(par,rings,a0,a1,mat,th,x,y,z,rx,ry,rz,ex,seg,bolts,br);
    // PL: a plate, or a row of plates split at the fractions o.cols of its arc with a groove o.gap wide between them: a panel line, with
    // whatever is underneath showing in it. A fraction may be a pair [at the first ring, at the last ring]: a diagonal cut.
    // o: sx (-1 = the mirrored plate for the right side), th, ex, seg, bolts, br, at [x,y,z], rot [x,y,z], tone (1, or a flag per
    // panel: painted in the material's second colour). T2 flags any part for that second colour.
    const T2=m=>{m.userData.tone=1;return m;},NW=m=>{m.userData.nw=1;return m;};   // NW: a painted mark (a stripe, a tally bar): it is all edge, but must not wear to metal
    const PL=(par,rings,a0,a1,mat,o={})=>{const {sx=1,th=.012,ex=2.4,seg=8,bolts=0,br,at=[0,0,0],rot=[0,0,0],cols=[],gap=.008,tone=0}=o,cs=[0,...cols,1],n=cs.length-1;
      const ga=gap/max(.01,rings.reduce((s,r)=>s+r[1]+r[2],0)/rings.length/2)/2;
      const nr=rings.length,f=(c,j)=>c.length?c[0]+(c[1]-c[0])*j/(nr-1):c,lo=c=>c.length?min(c[0],c[1]):c,hi=c=>c.length?max(c[0],c[1]):c,sp=a1-a0;
      return cs.slice(0,n).map((c,k)=>{const d=cs[k+1],R=n>1?rings.map((r,j)=>{const q=ring7(r);return [...q.slice(0,5),k?(f(c,j)-lo(c))*sp:q[5],k<n-1?(hi(d)-f(d,j))*sp:q[6]];}):rings;
        const m=SX(sx,par,R,a0+sp*lo(c)+(k?ga:0),a0+sp*hi(d)-(k<n-1?ga:0),mat,th,at[0],at[1],at[2],rot[0],rot[1],rot[2],ex,max(3,Math.round(seg*(hi(d)-lo(c)))),bolts,br);if(tone===1||tone[k])T2(m);return m;});};
    // struts: the frame of a limb segment, two rods side by side and a bright piston behind them. blade: body, dark fuller, a honed
    // edge along the polyline E and a line of light behind it, starting y0 up from the grip.
    const struts=(par,mF,mP,y0,y1,dx,dz,r)=>{rod(par,mF,dx,y0,dz,dx*.8,y1,dz*.8,r);rod(par,mF,-dx,y0,-dz,-dx*.8,y1,-dz*.8,r);rod(par,mP,dx*.2,y0-.03,-dz*2.6,dx*.2,y1+.03,-dz*2.2,r*.62);};
    const blade=(o,pts,E,ful,y0,gw=.006,ew=.011)=>{const M=this.mats;add(o,plate(pts,.014,.005),M.blade,0,y0,0);if(ful)add(o,plate(ful,.017,.003),M.dark||M.frame,0,y0,0);
      add(o,plate(edgeStrip(E,-.003,ew),.016,.007),M.edge,0,y0,0);add(o,plate(edgeStrip(E.slice(0,-1),ew+.008,ew+.008+gw),.018,.002),M.glow,0,y0,0);};
    // flat: fold a temporary group's parts into its parent (the group only gave a tilted frame to build in), so they merge with the rest
    const flat=(g,to=g.parent)=>{g.updateMatrix();for(const c of [...g.children]){c.updateMatrix();c.applyMatrix4(g.matrix);to.add(c);}g.parent.remove(g);};
    this.K={rod,hinge,struts,blade,flat,S,SX,PL,T2,NW};
    if(c.kind==='hero')this.buildHero(add);else if(c.kind==='warden')this.buildWarden(add);else this.buildFoe(add);
    this.bake();
  }
  // chains of hinged plates hanging from the belt (coat tails, a mantle). lens = the length of each segment but the last;
  // fn(group, segment, tail) adds the parts of one segment, hanging down from the group's origin and facing +Z.
  // An entry of angles is where on the belt the chain hangs, or [where, the way it faces, how far it leans sideways].
  addTails(angles,rx,rz,lens,fn){
    if(!this.tails)this.tails=[];
    angles.forEach((s,i)=>{const [a,face=a,roll=0]=s.length?s:[s];let par=this.hips;const seg=[],v=[];
      for(let k=0;k<=lens.length;k++){const g=new THREE.Group();g.rotation.order='YXZ';if(k)g.position.y=-lens[k-1];else{g.position.set(sin(a)*rx,-.02,cos(a)*rz);g.rotation.y=face;g.rotation.z=roll;}
        par.add(g);fn(g,k,i);seg.push(g);v.push(.1);par=g;}
      this.tails.push({a:face,seg,v});});
  }
  // ---------- models: every character is a machine, assembled from rounded plates, joints, pistons and cable ----------
  // The hero is designed from the back, the side the camera sees: pauldrons and two back fins spread wide over a narrow waist, a lit
  // spine, a sheath slung across navy shoulder blades, coat tails hanging in an A. White armour is kept to the surfaces that face
  // outwards; flanks, abdomen and the inside and back of the limbs are navy, gunmetal or bare graphite frame, so the figure is layered.
  buildHero(add){
    const M=this.mats,{hips,chest,head}=this,{rod,hinge,flat,S,SX,PL,NW,blade:bladeOf}=this.K,A=M.shell,B=M.shell2,F=M.frame,D=M.dark,J=M.steel,R=M.rubber,GL=M.glow,MG=M.mglow,L1=this.L1,L2=this.L2,HP=PI/2;
    this.gripD=[.07,.07];this.pad=[];this.pist=[];this.fins=[];this.finK=0;this.swing=0;
    // stand tall at rest, feet under the shoulders and the weight on the rear leg (the idle clip itself is a wider, lower guard)
    this.pose=(o,c)=>{if(c.loco==='idle'){o[I.hy]+=.03;o[I.fl]=.12;o[I.fl+2]=.17;o[I.fr]=-.13;o[I.fr+2]=-.13;o[I.hip+2]+=.045;}};
    // pelvis: a dark V girdle with a gunmetal wedge in front, bolted white hip plates raked out over the joints, a slim navy belt
    add(hips,loft([[-.16,.03,.04],[-.1,.07,.066],[-.02,.1,.08],[.07,.096,.076]],14,2.2),D);
    add(hips,loft([[-.172,.014,.018,0,.046],[-.11,.04,.03,0,.06],[-.03,.056,.032,0,.064],[.03,.05,.028,0,.058]],10,1.7),F);
    add(hips,loft([[.062,.108,.086],[.094,.104,.082]],16,2.4),B); add(hips,GB,GL,0,.078,.087,.034,.008,.006);
    S(hips,[[.056,.114,.092],[-.02,.112,.09],[-.08,.088,.07,0,0,.3,.3]],-HP-.55,-HP+.55,B,.01);
    for(const sx of [-1,1]){
      PL(hips,[[.06,.116,.094],[-.01,.122,.1],[-.07,.112,.09,0,0,.1,.25],[-.115,.094,.074,0,0,.3,.6]],-.8,.92,A,{sx,th:.011,at:[0,-.028,0],rot:[0,0,.24],bolts:[[.12,.1],[.88,.1],[.5,.85]]});
      hinge(hips,D,J,sx*.128,-.05,0,.042,.03);
    }
    // waist: a slim dark core, four bright piston rods, two dark lames in front (gunmetal, then navy): a machine waist under the chest
    add(chest,loft([[-.07,.07,.058],[0,.054,.046],[.08,.052,.044],[.15,.072,.056]],12,2.4),D);
    S(chest,[[-.04,.078,.064],[.03,.07,.058,0,0,.12,.12]],HP-1.05,HP+1.05,F,.01); S(chest,[[.036,.08,.066,0,0,.1,.1],[.1,.086,.068],[.13,.09,.07]],HP-.9,HP+.9,B,.01);
    // rib cage: a graphite core, flat in front and narrow at the lower ribs. Standing proud of it: two white pectoral plates with a dark
    // gap down the sternum, a navy rib plate under each, gunmetal flank plates with three vent slots, navy shoulder blades bordered in
    // white, and a white yoke that overhangs the lot by a step. A raised collar, open at the throat, with the neck pistons in the gap.
    const PEC=[[.292,.148,.107,0,0,.1,0],[.33,.158,.11],[.392,.164,.109]],RIB=[[.208,.11,.09,0,0,.42,.1],[.25,.132,.101,0,0,.1,.04],[.28,.145,.106]];
    const FLK=[[.2,.108,.082],[.3,.142,.094],[.392,.152,.094]],BLD=[[.21,.11,.088,0,0,0,.7],[.27,.138,.1,0,0,0,.25],[.34,.156,.108],[.392,.163,.107]];
    const YOKE=[[.404,.176,.118],[.414,.186,.128],[.446,.188,.122],[.476,.158,.1],[.498,.116,.078]];
    add(chest,loft([[.12,.074,.058],[.2,.104,.08],[.3,.136,.092],[.4,.146,.092],[.47,.1,.07]],16,3),D);
    PL(chest,YOKE,.32,PI-.32,A,{th:.01,ex:3,seg:16,cols:[.36,.64],gap:.007}); PL(chest,YOKE,-PI+.32,-.32,A,{th:.01,ex:3,seg:14,cols:[.5],gap:.03});
    PL(chest,[[.452,.112,.09,0,-.004],[.492,.106,.086,0,-.004],[.522,.086,.072,0,-.008]],HP+.42,HP+TAU-.42,A,{th:.012,seg:16});
    add(chest,loft([[.47,.05,.05],[.565,.036,.04]],10,2),D); for(const [x,z] of [[.03,.034],[-.03,.034],[.04,-.012],[-.04,-.012]])rod(chest,J,x,.47,z,x*.7,.57,z*.8,.006);
    add(chest,UC,D,0,.345,.112,.03,.016,.03,HP); add(chest,ringGeo(.0155,.0045,0),GL,0,.345,.122); add(chest,UC,J,0,.345,.114,.007,.018,.007,HP);   // core light in a dark socket on the sternum
    for(const sx of [-1,1]){
      rod(chest,J,sx*.062,-.05,.04,sx*.084,.17,.054,.0075); rod(chest,J,sx*.058,-.05,-.04,sx*.08,.17,-.05,.0075);
      rod(chest,F,sx*.062,-.05,.04,sx*.07,.04,.045,.0125); rod(chest,F,sx*.058,-.05,-.04,sx*.066,.04,-.044,.0125);
      PL(chest,PEC,.74,HP-.02,A,{sx,th:.01,ex:3,bolts:[[.1,.5],[.9,.14],[.9,.86]]}); PL(chest,RIB,.74,HP-.02,B,{sx,th:.009,ex:3});
      PL(chest,FLK,-.6,.6,F,{sx,th:.008,ex:3,seg:6}); for(let k=0;k<3;k++)SX(sx,chest,cut(shrink(FLK,-.0015),.262+k*.024,.274+k*.024),-.26,.26,R,.003,0,0,0,0,0,0,3,4);
      PL(chest,BLD,-HP+.11,-.74,A,{sx,th:.008,ex:3}); PL(chest,cut(shrink(BLD,-.005),.236,.376),-HP+.2,-.86,B,{sx,th:.006,ex:3,bolts:4});
      // shoulder: the ball of the joint sits in a dark collar; the pauldron (pad) rides over it, see apply
      add(chest,UC,D,sx*.2,SHY,0,.054,.052,.054,0,0,HP); add(chest,UC,F,sx*.172,SHY,0,.06,.012,.06,0,0,HP);
      // thruster vent under the shoulder blade
      add(chest,GR,F,sx*.08,.168,-.088,.056,.09,.05,.42,0,sx*.28); add(chest,GR,D,sx*.086,.136,-.112,.04,.03,.02,.42,0,sx*.28); add(chest,GB,GL,sx*.087,.13,-.118,.03,.008,.012,.42,0,sx*.28);
      // back fin: hinged on the shoulder blade and pointing down and out, so the back spreads into an inverted V. White outside, navy
      // inside, a line of light down the outer edge. It opens wider in a dodge and trails on the run (see apply).
      const fn=new THREE.Group();fn.rotation.order='YXZ';fn.position.set(sx*.15,.372,-.13);chest.add(fn);this.fins[sx>0?0:1]=fn;
      const FO=[[-.058,0],[.058,0],[.066,-.11],[.036,-.38],[.006,-.5],[-.018,-.49],[-.046,-.22]].map(p=>[p[0]*sx,p[1]]);
      add(fn,plate(FO,.012,.004),A,0,0,-.006); add(fn,plate(FO.map(p=>[p[0]*.82,p[1]*.95-.012]),.008,.003),B,0,0,.003); add(fn,plate([[-.012,-.03],[.012,-.03],[.007,-.3],[-.007,-.3]].map(p=>[p[0]*sx,p[1]]),.006,.002),B,0,0,-.013);
      add(fn,GB,GL,sx*.052,-.245,-.011,.006,.265,.008,0,0,-sx*.11); add(fn,UC,F,0,0,-.002,.03,.036,.03,HP); add(chest,GR,F,sx*.15,.372,-.11,.05,.064,.03);
      // shoulder piston: one end under the housing, the other on the upper arm (stretched every frame in apply)
      const pm=new THREE.Mesh(PISTON,F);pm.castShadow=true;pm.userData.keep=true;chest.add(pm);this.pist[sx>0?0:1]={m:pm,a:V(sx*.168,.3,-.016),b:V(-sx*.022,-.118,-.012)};
    }
    // spine: gunmetal vertebrae either side of one unbroken strip of light, nape to waist
    const SP=[[.44,-.106],[.36,-.12],[.28,-.113],[.2,-.094],[.12,-.07],[.04,-.056],[-.045,-.06]];
    for(let k=0;k<SP.length-1;k++){const [y0,z0]=SP[k],[y1,z1]=SP[k+1],ym=(y0+y1)/2,zm=(z0+z1)/2,ln=hypot(y1-y0,z1-z0),th=atan2(z0-z1,y0-y1);
      add(chest,GB,GL,0,ym,zm-.004,.011,ln*1.04,.01,th); for(const sx of [-1,1])add(chest,GR,F,sx*.021,ym,zm-.004,.027,ln*.8,.03,th);}
    // sheath slung across the back, navy with a band of light at the throat and a white tip; the long sword's hilt stands over the
    // right shoulder whenever it is not drawn
    const sh=new THREE.Group();sh.position.set(-.2,.55,-.172);sh.quaternion.setFromUnitVectors(UPV,_a.set(.37,-.6,-.012).normalize());chest.add(sh);
    add(sh,loft([[0,.031,.018],[.05,.034,.02],[.58,.029,.017],[.74,.021,.013]],10,3),B); add(sh,loft([[.742,.022,.014],[.79,.013,.009],[.812,.005,.004]],10,3),A); add(sh,GB,GL,0,.42,-.019,.004,.3,.006);
    add(sh,loft([[-.014,.037,.023],[.03,.038,.024]],10,3),J); add(sh,loft([[.036,.0365,.0225],[.052,.0365,.0225]],10,3),GL); add(sh,loft([[.24,.035,.022],[.28,.035,.022]],10,3),A);
    add(sh,GR,F,0,.2,.03,.03,.05,.06); add(sh,GR,F,0,.56,.03,.03,.05,.06);
    const hl=this.hilt=new THREE.Group();sh.add(hl);
    add(hl,UC,R,0,-.13,0,.018,.2,.018); add(hl,plate([[-.07,0],[-.05,-.03],[.05,-.03],[.07,0],[.05,.014],[-.05,.014]],.032,.008),J,0,-.022,0); add(hl,UC,J,0,-.238,0,.023,.03,.023); add(hl,cone(.022,.05,4),J,0,-.275,0,1,1,1,PI); flat(sh);
    // head: a white helmet in two halves that meet on a ridge from brow to nape, a navy crest blade standing on the ridge; a hard brow
    // over a dark faceplate with one V of light; cheek guards; a dark vented plate and cables behind; antenna blades splayed outwards
    add(head,loft([[-.036,.014,.02,0,.05],[0,.046,.058,0,.03],[.05,.07,.086,0,.006],[.1,.076,.094,0,-.004],[.126,.07,.09,0,-.008]],14,2),M.visor);
    const HELM=prow([[.1,.122,.112,-.034,-.008],[.134,.124,.114,-.034,-.012],[.172,.112,.104,-.034,-.02],[.2,.088,.08,-.034,-.03],[.217,.06,.046,-.034,-.038],[.225,.04,.02,-.034,-.042]],2.6);
    add(head,plate([[-.098,.126],[-.094,.176],[-.06,.214],[-.014,.24],[.04,.253],[.086,.246],[.126,.222],[.143,.19],[.137,.148],[.117,.15],[.115,.176],[.1,.2],[.07,.214],[.035,.222],[-.004,.213],[-.044,.195],[-.077,.168],[-.088,.126]],.02,.005),B,0,0,0,1,1,1,0,HP,0);
    S(head,[[.092,.094,.127,0,-.004,.5,.5],[.112,.093,.125,0,-.006],[.136,.09,.114,0,-.01,.3,.3]],HP-1.2,HP+1.2,A,.012,0,0,0,0,0,0,2.9,10);
    const OCC=[[0,.06,.076,0,-.012,.3,.3],[.045,.082,.1,0,-.008],[.094,.09,.11,0,-.007]];
    S(head,OCC,-HP-.98,-HP+.98,F,.011,0,0,0,0,0,0,2.5,10); for(let k=0;k<3;k++)S(head,cut(shrink(OCC,-.0015),.03+k*.02,.038+k*.02),-HP-.36,-HP+.36,R,.003,0,0,0,0,0,0,2.5,4);
    for(const x of [-.036,-.012,.012,.036])rod(head,R,x,.03,-.066,x*1.15,-.09,-.056,.0105);
    for(const sx of [-1,1]){
      SX(sx,head,HELM,-HP,HP,A,.012,0,0,0,0,0,0,2.6,12);
      SX(sx,head,[[0,.06,.074,0,-.01,0,.55],[.04,.079,.097,0,-.007,0,.14],[.082,.088,.108,0,-.006]],-HP+1.06,HP-.92,A,.011,0,0,0,0,0,0,2.5,8);
      add(head,shell([[-.0036,.0745,.091,0,.0035],[.0036,.0745,.091,0,.0035]],sx>0?HP-.56:HP,sx>0?HP:HP+.56,.003,6,2),GL,0,.056,0,1,1,1,0,0,sx*.3);
      add(head,UC,J,sx*.089,.074,-.012,.026,.02,.026,0,0,HP); add(head,UC,F,sx*.091,.074,-.012,.014,.026,.014,0,0,HP);
      add(head,plate([[0,-.018],[.09,-.03],[.325,.066],[.31,.086],[.04,.022]],.01,.004),B,sx*.1,.078,-.016,1,1,1,0,HP-sx*.56,0);
    }
    // coat tails: two long split plates hung from the hip points and leaning outwards, so the legs show between them in an A; a short
    // centre tail to the back of the knee. Navy, a line of light down each outer edge.
    this.addTails([[PI-.95,PI-.32,-.2],[PI+.95,PI+.32,.2]],.136,.1,[.25,.24],(g,k,i)=>{const e=i?1:-1,w=[.07,.058,.046][k],w2=[.058,.046,0][k],ln=[.25,.24,.26][k];
      add(g,plate(k<2?[[-w,0],[w,0],[w2,-ln+.014],[-w2,-ln+.014]]:[[-w,0],[w,0],[w*.75,-.16],[.012,-ln],[-.012,-ln],[-w*.75,-.16]],.018,.006),B);
      add(g,GR,B,0,-ln*.45,.008,.034,ln*.7,.014); add(g,UC,B,0,0,0,.011,w*2.1,.011,0,0,HP);
      add(g,GB,GL,e*(k<2?(w+w2)/2:w*.88),k<2?-ln/2:-.08,.002,.006,k<2?ln-.03:.14,.02,0,0,k<2?-e*(w-w2)/ln:-e*.07);});
    this.addTails([PI],.1,.09,[.22],(g,k)=>{const w=k?.034:.042,ln=k?.2:.22;
      add(g,plate(k?[[-w,0],[w,0],[w*.7,-.13],[0,-ln],[-w*.7,-.13]]:[[-w,0],[w,0],[.034,-ln+.012],[-.034,-ln+.012]],.016,.005),B); add(g,GR,A,0,-ln*.45,.007,.014,ln*.6,.01); if(!k)add(g,UC,B,0,0,0,.01,w*2.1,.01,0,0,HP);});
    this.tailBase=.07;
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],hd=this.hand[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      // pauldron: three lames over the joint's dark ball, the lowest navy; three tally bars on the left one. It hangs on its own pivot
      // (pad), which follows the arm forward and back but only part of the way out to the side.
      const pd=new THREE.Group();pd.position.set(sx*SHX,SHY,0);chest.add(pd);this.pad.push({g:pd});
      const P2=[[-.012,.078,.084,.014],[-.05,.081,.087,.016],[-.094,.088,.094,.02,0,.12,.12]];
      SX(sx,pd,[[.1,.024,.032,.008],[.084,.052,.06,.01],[.05,.076,.084,.012,0,.3,.3],[0,.086,.092,.014,0,.75,.75],[-.03,.09,.096,.016,0,.9,.9]],-2.5,2.5,A,.011,0,0,0,0,0,0,2.7,12);
      add(pd,UC,B,sx*.008,.097,0,.03,.012,.036); SX(sx,pd,P2,-1.5,1.5,A,.01,0,0,0,0,0,0,2.7,10,[[.06,.5],[.94,.5]]); SX(sx,pd,[[-.074,.07,.076,.014],[-.11,.072,.078,.015],[-.15,.08,.086,.018,0,.18,.18]],-1.22,1.22,B,.01,0,0,0,0,0,0,2.7,10);
      if(!s)for(const a of [-.21,0,.21])NW(S(pd,cut(shrink(P2,-.0015),-.03,-.064),a-.055,a+.055,B,.003,0,0,0,0,0,0,2.7,3));
      // arm: twin-strut upper arm under a navy plate, hinge elbow, a white bracer over the outside of the forearm and navy inside it
      add(ua,GS,D,0,0,0,.05,.05,.05);
      rod(ua,F,sx*.004,-.04,.022,sx*.004,-.3,.018,.0125); rod(ua,F,sx*.004,-.04,-.022,sx*.004,-.3,-.018,.0125); rod(ua,J,-sx*.03,-.07,0,-sx*.024,-.28,0,.0075);
      SX(sx,ua,[[-.128,.04,.044,.006,0,.5,.5],[-.168,.05,.054,.008],[-.236,.045,.049,.006],[-.286,.034,.037,.004,0,.45,.45]],-1.85,1.85,B,.011,0,0,0,0,0,0,2.4,8,2);
      hinge(fa,D,J,0,0,0,.038,.074);
      rod(fa,F,sx*.014,-.02,.012,sx*.01,-.285,.008,.011); rod(fa,F,-sx*.016,-.02,-.006,-sx*.012,-.285,-.004,.011); rod(fa,J,0,-.05,-.03,0,-.27,-.022,.0065);
      const FA=[[-.04,.032,.036,.004,0,.6,.6],[-.1,.052,.058,.008,0,.1,.1],[-.17,.048,.053,.006],[-.235,.037,.041,.003],[-.268,.031,.034,0,0,.4,.4]];
      SX(sx,fa,FA,-1.35,1.35,A,.012,0,0,0,0,0,0,2.6,8,[[.5,.08],[.5,.92]]); SX(sx,fa,shrink(cut(FA,-.07,-.25),.004),1.55,TAU-1.55,B,.009,0,0,0,0,0,0,2.6,8);
      add(fa,GR,B,sx*.052,-.15,-.004,.014,.13,.046); add(fa,GB,GL,sx*.06,-.15,0,.006,.1,.012); add(fa,UC,J,0,-.278,0,.03,.016,.03); add(fa,GS,D,0,-ARM2,0,.027,.027,.027);
      // hand, built round the grip axis (Y): palm block behind, four fingers and a thumb wrapped round, knuckle guard in front
      add(hd,GR,F,0,0,-.037,.056,.084,.03); add(hd,GR,A,0,-.004,.045,.05,.078,.012);
      for(let k=0;k<4;k++)add(hd,arcGeo(.031,.0085,s?-.6:-.87,4.6),J,0,-.03+k*.02,0);
      add(hd,arcGeo(.031,.0095,s?-.2:1.4,1.95),J,0,.052,0);
      // leg: white plates down the front and the outside of the thigh with a dark groove between them, navy round the inside and the
      // back; a navy knee cap on a hinge; a white shin plate; behind it a short calf shell over an open strut frame with a strip of
      // light in the gap; a blade foot on a navy sole with a separate heel strut
      add(ul,GS,D,0,0,0,.058,.058,.058); add(ul,limb(.04,.032,L1),D,0,0,-.008);
      const TH=[[.05,.042,.048,.012],[-.03,.074,.082,.014,.004],[-.12,.07,.078,.01,.008],[-.24,.055,.062,.004,.008],[-.35,.046,.052,0,.005],[-.418,.042,.046]];
      PL(ul,ends(TH,.25,.1,.12,.1),-1.02,2.16,A,{sx,seg:12,cols:[.5],gap:.017,bolts:[[.5,.03],[.5,.97]]}); PL(ul,shrink(cut(TH,0,-.4),.004),2.32,5.1,B,{sx,th:.009,seg:10});
      if(s)for(const y of [-.1,-.128])PL(ul,cut(shrink(TH,-.0015),y,y-.014),-1.02,2.16,B,{sx,th:.003,seg:12,cols:[.5],gap:.017}).forEach(NW);   // two pinstripes across the right thigh
      hinge(ll,D,J,0,0,0,.046,.088);
      S(ll,[[.066,.036,.046,0,.012,.5,.5],[0,.05,.064,0,.016],[-.062,.036,.046,0,.012,.5,.5]],HP-.95,HP+.95,B,.011);
      add(ll,limb(.03,.024,L2),D,0,0,-.012);
      const q=L2/LEG2,ys=r=>r.map(v=>[v[0]*q,...v.slice(1)]);
      S(ll,ys([[-.078,.04,.044,0,.012,.7,.7],[-.15,.052,.058,0,.016,.1,.1],[-.3,.042,.048,0,.01],[-.42,.033,.037,0,.004],[-.47,.03,.032,0,0,.35,.35]]),HP-1.3,HP+1.3,A,.012,0,0,0,0,0,0,2.6,10,[[.5,.05],[.12,.4],[.88,.4]]);
      S(ll,ys([[-.045,.03,.034,0,-.012,.8,.8],[-.12,.052,.064,0,-.02,.1,.1],[-.2,.05,.06,0,-.018],[-.262,.04,.046,0,-.012,.45,.45]]),-HP-1.25,-HP+1.25,A,.012,0,0,0,0,0,0,2.4,10);
      for(const k of [-1,1])rod(ll,F,k*.027,-.24*q,-.05,k*.017,-L2+.045,-.04,.0095); for(const y of [-.31,-.41])add(ll,UC,F,0,y*q,-.049-(y+.31)*-.06,.006,.05,.006,0,0,HP);
      add(ll,GB,GL,0,-.35*q,-.046,.009,.2,.005); add(ll,UC,D,0,-L2+.03,0,.034,.02,.034);
      hinge(ft,D,J,0,0,0,.034,.076);
      add(ft,loft([[-.03,.03,.03],[.03,.046,.036],[.11,.05,.027],[.19,.042,.017],[.245,.024,.009]],12,3.2),A,0,-.018,-.012,1,1,1,1.84);
      add(ft,GR,B,0,-.082,.1,.098,.016,.21); rod(ft,F,0,-.012,-.03,0,-.08,-.084,.012); add(ft,GR,F,0,-.083,-.088,.04,.014,.044);
      add(ft,plate([[-.022,0],[.022,0],[.013,.085],[0,.115],[-.013,.085]],.012,.004),B,0,-.02,-.05,1,1,1,-.45);
    }
    const grp=s=>{const o=new THREE.Group();this.sword[s].add(o);return o;};
    // weapons are modelled with the grip at the origin and the blade (or barrel, or hammer head) along +Y; +X is the cutting edge
    const hiltOf=(o,gd)=>{add(o,UC,R,0,-.015,0,.019,.19,.019); add(o,UC,J,0,-.122,0,.024,.03,.024); add(o,cone(.022,.06,4),J,0,-.165,0,1,1,1,PI); add(o,plate(gd,.034,.008),J,0,.094,0); add(o,GR,B,0,.094,0,.05,.03,.042);};
    // twin fang: a forward-curved chopping blade, widest in its last third. Three bands show at a distance: a bright honed edge, a
    // broad dark fuller, a steel back with a thick spine rib (so the blade is more than a hairline edge-on) and saw teeth; a hooked guard.
    for(let s=0;s<2;s++){const o=this.wp[s][0]=grp(s);
      hiltOf(o,[[-.05,-.014],[.04,-.02],[.085,-.004],[.1,.03],[.05,.022],[-.03,.03],[-.062,.014]]);
      add(o,plate([[.06,.02],[.1,.03],[.108,-.05],[.09,-.115],[.074,-.108],[.086,-.05],[.078,0]],.02,.006),J,0,.094,0);
      bladeOf(o,[[-.03,0],[.03,0],[.028,.3],[.056,.62],[.092,.86],[.078,1.02],[.036,1.19],[-.004,1.02],[-.016,.8],[-.03,.72],[-.018,.7],[-.032,.62],[-.02,.6],[-.034,.52],[-.022,.5],[-.036,.42],[-.024,.4],[-.036,.32],[-.03,.2]],
        [[.03,.04],[.028,.3],[.056,.62],[.092,.86],[.078,1.02],[.04,1.17]],[[-.012,.08],[.01,.08],[.01,.3],[.036,.62],[.068,.86],[.056,1],[.02,1],[.002,.8],[-.008,.6],[-.012,.3]],.1,.006,.02);
      add(o,plate([[-.03,.02],[-.014,.02],[-.012,.3],[-.004,.6],[.006,.8],[.02,1],[.034,1.16],[.024,1.165],[-.002,1.02],[-.014,.8],[-.022,.6],[-.028,.3]],.028,.007),M.blade,0,.1,0);}
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
    // gunmetal head; the ram plate and its four studs are dull bare steel, no light on the face. The light is a seam behind the ram
    // plate, the vents and the thruster bell (their own material, mglow: dim at rest, raised by the speed of the swing in apply)
    add(m,GR,F,0,.98,0,.3,.26,.25); add(m,GR,M.blade,.186,.98,0,.07,.3,.29);
    for(const a of [-1,1])for(const b of [-1,1])add(m,cone(.046,.03,4),M.blade,.236,.98+a*.08,b*.078,1,1,1,PI/4,0,-HP);
    add(m,cyl(.115,.078,.13),F,-.212,.98,0,1,1,1,0,0,HP); add(m,UC,MG,-.258,.98,0,.088,.01,.088,0,0,HP); add(m,UC,D,-.262,.98,0,.042,.03,.042,0,0,HP);
    add(m,GB,MG,.147,.98,0,.01,.272,.262); for(let k=-1;k<=1;k++){add(m,GB,MG,-.07+k*.044,1.108,0,.014,.01,.15); add(m,GB,MG,-.07+k*.044,.852,0,.014,.01,.15);}
    for(const b of [-1,1]){add(m,GR,B,0,.9,b*.128,.1,.22,.016); for(const y of [.83,.9,.97])add(m,UC,J,0,y,b*.136,.012,.012,.012,HP);}
    add(m,cone(.04,.1,4),J,0,1.158,0);
    this.setWeapon(0);
  }
  setWeapon(i){for(let s=0;s<2;s++)this.wp[s].forEach((o,k)=>{o.visible=k===i;});if(this.hilt)this.hilt.visible=i!==1;this.twoHand=i===2?-.42:0;this.aimHand=i===1;this.wset=i;}
  // The Gatewarden: the Husks' lord, built in their language but tall, in forged dark steel edged with gold. Sloped vented pauldrons, a
  // skull mask over a grille under a crest of three red blades, a gorget of three lames, chest plates round the core, a mantle of
  // hanging plates in two tiers, gauntlets. Everything put in AG() is armour it sheds in phase 2. HG() is what shows once it has: a
  // wide cage of ribs round the fire in its chest, scorched plates between heavier struts on every limb, the bare yokes of the
  // pauldrons (and half of one plate still hanging on the left), loose cables, a ring of fire in each joint and a seam of it down each limb.
  buildWarden(add){
    const M=this.mats,{hips,chest,head}=this,{rod,hinge,struts,flat,blade,S,SX}=this.K,D=M.dark,T=M.trim,A=M.armor,C=M.cloth,K=M.char,R=M.rubber,G=M.glow,G2=M.seam,HP=PI/2,L1=this.L1,L2=this.L2,q1=L1/LEG1,q2=L2/LEG2;
    const sub=(map,list,vis)=>par=>{let g=map.get(par);if(!g){g=new THREE.Group();g.visible=vis;par.add(g);map.set(par,g);list.push(g);}return g;};
    const AG=sub(new Map(),this.hide,true),HG=sub(new Map(),this.hot,false),sy=(r,q)=>r.map(v=>[v[0]*q,...v.slice(1)]);
    const L=(par,rings,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0,ex=3,seg=12)=>add(par,loft(rings,seg,ex),mat,x,y,z,1,1,1,rx,ry,rz);
    const BX=(par,mat,w,h,d,x=0,y=0,z=0,rx=0,ry=0,rz=0,c=.01)=>add(par,slab(w,h,d,c),mat,x,y,z,1,1,1,rx,ry,rz);
    const joint=(par,r,w,x=0,y=0,z=0)=>{hinge(par,D,T,x,y,z,r,w);for(const e of [-1,1])add(HG(par),ringGeo(+(r*.62).toFixed(3),+(r*.11).toFixed(3),0),G,x+e*(w/2+.01),y,z,1,1,1,0,HP,0);};   // hinge disc; a ring of fire on each face once the armour is off
    // P: an armour plate with a raised gold strip all the way round its edge
    const P=(sx,par,rings,a0,a1,th=.014,ex=3.2,seg=10,bolts=0,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{SX(sx,par,rings,a0,a1,A,th,x,y,z,rx,ry,rz,ex,seg,bolts,.008);
      const Q=shrink(rings,-.003).map(ring7),n=Q.length,y0=Q[0][0],y1=Q[n-1][0],w=y1>y0?.01:-.01,dA=.01/max(.03,Q.reduce((s,r)=>s+r[1]+r[2],0)/n/2);
      SX(sx,par,cut(Q,y0,y0+w),a0,a1,T,.004,x,y,z,rx,ry,rz,ex,seg);SX(sx,par,cut(Q,y1-w,y1),a0,a1,T,.004,x,y,z,rx,ry,rz,ex,seg);
      SX(sx,par,Q.map(r=>[...r.slice(0,5),r[5],-r[5]]),a0,a0+dA,T,.004,x,y,z,rx,ry,rz,ex,2);SX(sx,par,Q.map(r=>[...r.slice(0,5),-r[6],r[6]]),a1-dA,a1,T,.004,x,y,z,rx,ry,rz,ex,2);};
    // bare: what a limb segment keeps when the armour is gone: a scorched plate, two heavy struts, a seam of fire in the gap between them
    const bare=(par,sx,rings,a0,a1,y0,y1,dx,r)=>{const g=HG(par);SX(sx,g,rings,a0,a1,K,.014,0,0,0,0,0,0,3,8);for(const e of [-1,1])rod(g,D,e*dx,y0,.004,e*dx*.8,y1,.004,r);add(g,GB,G2,0,(y0+y1)/2,.012,.009,abs(y1-y0)*.78,.009);};
    // it stands tall on near-straight legs; with the armour gone it hunches forward, head low
    this.pose=(o,c)=>{if(c===CL.eIdle){o[I.hy]+=.12;o[I.hip]-=.2;o[I.ch]-=.2;o[I.hd]+=.3;o[I.fl]+=.02;o[I.fr]-=.02;if(!this.hide[0].visible){o[I.hip]+=.09;o[I.ch]+=.2;o[I.hd]+=.1;}}};
    head.scale.setScalar(.84);
    // pelvis: a dark block under a gold belt, a pointed loin plate, a plate over each hip
    L(hips,[[-.14,.06,.06],[-.05,.12,.095],[.05,.125,.1],[.1,.1,.085]],D); add(hips,UC,T,0,.1,0,.135,.05,.108);
    P(1,AG(hips),[[.07,.135,.11],[-.04,.13,.106,0,0,.1,.1],[-.2,.08,.07,0,.02,.3,.3],[-.3,.03,.03,0,.03,.4,.4]],HP-.62,HP+.62,.014,3,8);
    add(hips,plate([[-.03,.04],[.03,.04],[.02,-.05],[0,-.09],[-.02,-.05]],.02,.006),T,0,-.02,.125,1,1,1,.12);
    for(const sx of [-1,1]){P(sx,AG(hips),[[.07,.14,.112],[-.03,.146,.116],[-.13,.12,.094,0,0,.25,.25]],-.6,.62,.014,3,8,0,0,-.02,0,0,0,.2); joint(hips,.05,.036,sx*.15,-.05,0);
      for(const [a,b] of [[[.11,.06,.09],[.15,-.1,.13]],[[.15,-.1,.13],[.13,-.26,.1]]])rod(HG(hips),R,sx*a[0],a[1],a[2],sx*b[0],b[1],b[2],.011);}
    // mantle: two tiers of dark red plates edged in gold, a ridge down the middle of each. Six hang to mid-thigh; under them, set half
    // a plate round so they cover the gaps, five more hang to the ankle
    const mp=(g,w,w2,ln)=>{add(g,plate([[-w,0],[w,0],[w2,-ln+.03],[0,-ln],[-w2,-ln+.03]],.02,.007),C);add(g,GR,C,0,-ln*.46,.012,.024,ln*.8,.014);
      for(const e of [-1,1])add(g,GB,T,e*(w+w2)/2,-(ln-.03)/2,.002,.009,ln-.04,.026,0,0,-e*(w-w2)/(ln-.03));add(g,UC,T,0,-.008,0,.014,w*2.05,.014,0,0,HP);};
    this.addTails([PI-1.3,PI-.78,PI-.26,PI+.26,PI+.78,PI+1.3],.172,.137,[],g=>mp(g,.078,.06,.42));
    this.addTails([PI-1.04,PI-.52,PI,PI+.52,PI+1.04],.156,.122,[.34],(g,k)=>{if(k)mp(g,.074,.042,.7);});
    // torso: bellows waist between pistons, a spine of eight blocks, a reactor column, the core in its gold ring
    L(chest,[[-.02,.085,.07],[.06,.07,.058],[.15,.095,.08]],R); L(chest,[[.1,.06,.052],[.3,.08,.068],[.48,.075,.062],[.53,.07,.06]],D,0,0,0,0,0,0,2.4);
    L(HG(chest),[[.13,.07,.062],[.3,.094,.08],[.45,.084,.07]],G2,0,0,0,0,0,0,2.4);   // the fire inside, seen between the ribs
    for(let k=0;k<8;k++)add(chest,GR,D,0,.06+k*.065,[-.08,-.104,-.126,-.143,-.152,-.154,-.147,-.13][k],.06,.052,.05);
    add(chest,UC,T,0,.3,.168,.07,.03,.07,HP); add(chest,GS,G,0,.3,.186,.052,.052,.02); L(chest,[[.5,.06,.064],[.6,.05,.056,0,.012]],R);
    const PEC=[[.31,.2,.162,0,0,.3,0],[.39,.224,.168],[.47,.2,.15],[.525,.12,.1]],BLD=[[.2,.14,.128,0,0,0,.6],[.3,.2,.168,0,0,0,.15],[.42,.228,.176],[.5,.18,.142],[.53,.12,.1]];
    P(1,AG(chest),[[.12,.11,.09,0,0,.3,.3],[.2,.166,.136,0,0,.05,.05],[.288,.198,.164]],HP-1.05,HP+1.05,.014,3.2,12);   // plackart under the core
    for(let k=0;k<3;k++)S(AG(chest),[[.5+k*.03,.15-k*.016,.122-k*.013],[.548+k*.03,.132-k*.016,.108-k*.013]],0,TAU,k<2?A:T,.012,0,0,0,0,0,0,2.4,14);   // gorget of three lames
    for(const [a,b] of [[[.05,.5,.08],[.1,.36,.17]],[[.1,.36,.17],[.07,.2,.15]],[[-.06,.5,.07],[-.13,.34,.15]],[[-.13,.34,.15],[-.12,.16,.12]]])rod(HG(chest),R,a[0],a[1],a[2],b[0],b[1],b[2],.011);   // loose cables
    for(const sx of [-1,1]){
      rod(chest,T,sx*.085,-.03,.045,sx*.1,.16,.06,.011); rod(chest,D,sx*.08,-.03,-.04,sx*.09,.17,-.05,.016);
      for(let k=0;k<6;k++){const y=.13+k*.068,w=1-abs(k-2.8)*.075;SX(sx,HG(chest),[[y-.016,.25*w,.172*w],[y+.016,.25*w,.172*w]],-HP+.16,HP-.2-(k>2?.14:0),D,.02,0,0,0,0,0,0,2.6,10);}   // ribs
      rod(HG(chest),D,sx*.04,.11,.168,sx*.036,.24,.172,.016); add(HG(chest),GR,K,sx*.05,.44,.146,.07,.13,.03,-.2,0,sx*.12);
      P(sx,AG(chest),PEC,.45,HP-.045,.014,3.2,10,[[.12,.12],[.12,.88],[.9,.3]]); P(sx,AG(chest),BLD,-HP+.22,-.45,.014,3.2,10);
      joint(chest,.062,.07,sx*.215,SHY,0);
      // pauldron: two stacked sloped plates with slit vents. Under them a yoke of two ribs on a spar, which is what stays at the
      // shoulder when the armour falls; on the left, half of a plate hangs on, scorched
      const PD=[[-.05,.04,.09],[.08,.08,.16],[.22,.1,.2],[.32,.086,.18,0,0,.25,.25]];
      const g=new THREE.Group();g.position.set(sx*.2,.57,0);g.rotation.z=-sx*(HP+.66);chest.add(g);
      P(sx,g,PD,PI-1.25,PI+1.25,.018,3.2,10,4); P(sx,g,[[.13,.064,.14],[.26,.08,.178],[.39,.064,.15,0,0,.3,.3]],PI-1.15,PI+1.15,.016,3.2,10);
      for(const z of [-.06,.06])add(g,GB,R,-sx*.094,.16,z,.016,.12,.02,0,0,-sx*.1); flat(g,AG(chest));
      const f=new THREE.Group();f.position.set(sx*.2,.57,0);f.rotation.z=-sx*(HP+.66);chest.add(f);
      for(const y of [.09,.27])SX(sx,f,cut(shrink(PD,.014),y,y+.034),PI-1.2,PI+1.2,D,.024,0,0,0,0,0,0,3.2,8); rod(f,D,-sx*.03,-.04,0,-sx*.084,.37,0,.02);
      if(sx>0)SX(sx,f,shrink(PD,.01).map(ring7).map((r,i)=>[...r.slice(0,5),0,[.15,.6,.2,.7][i]]),PI-1.2,PI+.6,K,.014,0,0,0,0,0,0,3.2,8);
      flat(f,HG(chest));
    }
    // skull: a dark head with a narrow visor over a grille; helm plates and cheek guards (shed); a crest of three red blades, each with a gold spine
    L(head,[[-.02,.06,.07],[.05,.092,.11,0,.004],[.12,.094,.122,0,-.012],[.2,.07,.1,0,-.03],[.24,.03,.045,0,-.05]],D,0,0,0,0,0,0,2.6,12);
    S(AG(head),[[.03,.094,.118,0,0,.45,.45],[.1,.108,.136,0,-.012],[.19,.09,.118,0,-.03],[.245,.05,.07,0,-.05],[.262,.018,.03,0,-.06]],-HP-2.25,-HP+2.25,A,.014,0,0,0,0,0,0,2.6,12);
    S(AG(head),[[.118,.1,.146,0,0,.3,.3],[.16,.098,.14,0,-.006],[.2,.08,.118,0,-.02,.2,.2]],HP-.8,HP+.8,A,.014,0,0,0,0,0,0,2.6);
    add(head,GB,G,0,.094,.118,.13,.016,.016); add(head,GR,D,0,.09,.104,.15,.06,.04); for(let k=-2;k<=2;k++)add(head,GR,T,k*.022,.03,.114,.01,.085,.014,.12);
    for(const [x,ln,dy] of [[0,.36,0],[.05,.3,-.25],[-.05,.3,.25]]){add(head,plate([[-.07,0],[.02,0],[ln,.15],[ln-.04,.2],[-.03,.07]],.016,.005),C,x,.2,.02,1,1,1,0,HP+dy,0);
      add(head,plate([[-.038,.06],[ln-.046,.19],[ln-.03,.212],[-.042,.084]],.024,.004),T,x,.2,.02,1,1,1,0,HP+dy,0);}
    for(const sx of [-1,1]){add(AG(head),plate([[-.03,.05],[.024,.062],[.03,-.05],[.008,-.11],[-.02,-.04]],.018,.005),A,sx*.074,.04,.106,1,1,1,0,sx*.55,0); add(head,UC,T,sx*.11,.1,0,.036,.036,.036,0,0,HP);}
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      struts(ua,D,T,-.03,-ARM1+.02,.026,.02,.02); P(sx,AG(ua),[[-.05,.072,.078,.012],[-.11,.078,.084,.012],[-.2,.066,.07,.008],[-.265,.046,.05,.004,0,.5,.5]],-1.4,1.4,.014,3.2,8);
      bare(ua,sx,[[-.05,.054,.058,.008],[-.12,.062,.066,.008],[-.26,.042,.046,.004]],-1.3,1.3,-.03,-ARM1+.02,.04,.021);
      joint(fa,.058,.12); struts(fa,D,T,-.03,-ARM2+.03,.024,.018,.018);
      P(sx,AG(fa),[[-.06,.076,.082,.01],[-.12,.084,.09,.01],[-.23,.07,.076,.004],[-.285,.05,.055,0,0,.5,.5]],-1.45,1.45,.014,3.2,8); add(fa,UC,T,0,-.29,0,.05,.03,.05);
      S(AG(fa),[[-.225,.056,.06],[-.27,.064,.068],[-.318,.084,.088]],0,TAU,A,.012,0,0,0,0,0,0,2.8,12); S(AG(fa),[[-.306,.083,.087],[-.32,.088,.092]],0,TAU,T,.006,0,0,0,0,0,0,2.8,12);   // the gauntlet's bell cuff
      bare(fa,sx,[[-.07,.058,.062,.008],[-.13,.066,.07,.008],[-.27,.046,.05,.002]],-1.35,1.35,-.04,-ARM2+.03,.04,.02);
      // gauntlet: a dark hand (palm and four finger bars); over it a knuckle ridge with gold studs, four finger lames that step down
      // and narrow toward the little finger, and a thumb plate. Its bell cuff is on the forearm.
      BX(sw,D,.08,.11,.07,0,0,-.016); for(let k=0;k<4;k++)BX(sw,D,.086,.018,.05,0,.022-k*.029,.04,0,0,0,.006);
      BX(AG(sw),A,.118,.036,.07,0,.056,.044,.25,0,0,.012); for(const x of [-.036,-.012,.012,.036])add(AG(sw),cone(.011,.02,4),T,x,.062,.086,1,1,1,HP+.25);
      for(let k=0;k<4;k++)BX(AG(sw),A,.112-k*.007,.021,.07-k*.005,0,.022-k*.029,.045-k*.002,0,0,0,.008); BX(AG(sw),A,.034,.075,.05,-sx*.064,.012,.004,0,0,-sx*.3);
      if(s===1){add(sw,UC,R,0,-.04,0,.028,.34,.028); add(sw,plate([[-.2,.0],[-.12,-.04],[.12,-.04],[.2,.0],[.14,.04],[-.14,.04]],.06,.012),T,0,.13,0); add(sw,UC,T,0,-.23,0,.04,.05,.04); add(sw,cone(.04,.09,4),T,0,-.3,0,1,1,1,PI);
        blade(sw,[[-.075,0],[.085,0],[.08,.9],[.06,1.45],[-.02,1.78],[-.07,1.6]],[[.085,.03],[.08,.9],[.06,1.45],[-.012,1.75]],null,.16); add(sw,GB,G,-.014,.9,0,.03,1.4,.03);}
      joint(ul,.07,.06); struts(ul,D,T,-.04,-L1+.03,.034,.022,.024);
      P(sx,AG(ul),sy([[-.03,.1,.104,.012,.014],[-.1,.112,.116,.014,.016],[-.28,.09,.094,.004,.014],[-.4,.064,.068,0,.008,.5,.5]],q1),-.6,2.2,.016,3.2,10,[[.3,.08],[.75,.08],[.5,.92]]);
      bare(ul,sx,sy([[-.05,.076,.08,.01,.012],[-.12,.084,.088,.012,.014],[-.3,.066,.07,.004,.012],[-.42,.048,.052,0,.008]],q1),-.5,2.1,-.04,-L1+.03,.05,.028);
      joint(ll,.068,.16); P(1,AG(ll),[[.09,.05,.07,0,.03,.4,.4],[0,.074,.1,0,.03],[-.08,.05,.07,0,.03,.4,.4]],HP-.9,HP+.9,.014,3,8);
      struts(ll,D,T,-.04,-L2+.04,.028,.02,.02);
      P(1,AG(ll),sy([[-.07,.074,.084,0,.014],[-.16,.08,.09,0,.014],[-.34,.07,.08,0,.008],[-.45,.058,.066,0,.004,.3,.3]],q2),HP-.85,HP+.85,.014,3.2,8);
      S(AG(ll),sy([[-.06,.07,.09,0,-.026,.2,.2],[-.15,.08,.104,0,-.03],[-.3,.066,.082,0,-.018],[-.42,.05,.056,0,-.006,.5,.5]],q2),-HP-1.15,-HP+1.15,A,.014,0,0,0,0,0,0,3.2);
      bare(ll,1,sy([[-.08,.058,.066,0,.012],[-.17,.064,.072,0,.012],[-.36,.052,.06,0,.006],[-.46,.044,.05,0,.002]],q2),HP-.8,HP+.8,-.04,-L2+.04,.044,.024);
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
    const {hips,chest,head}=this,{rod,hinge,struts,flat,S,SX,PL,T2,blade}=this.K,A=M.armor,T=M.trim,F=M.frame,R=M.rubber,G=M.glow,HP=PI/2,L1=this.L1,L2=this.L2;
    // pelvis: frame block, a pointed loin plate, hip plates raked out over the joints
    L(hips,[[-.12,.045,.05],[-.05,.085,.07],[.03,.095,.075],[.08,.08,.065]],F); add(hips,UC,T,0,.084,0,.098,.028,.08);
    S(hips,[[.05,.1,.082],[-.04,.096,.08],[-.15,.05,.05,0,.016,.35,.35]],HP-.75,HP+.75,A,.012,0,0,0,0,0,0,2.4,8,[[.1,.08],[.9,.08]]); T2(S(hips,[[.05,.098,.08],[-.03,.092,.076],[-.09,.06,.05,0,0,.3,.3]],-HP-.6,-HP+.6,A,.011));
    for(const sx of [-1,1]){SX(sx,hips,[[.05,.106,.086],[-.03,.11,.088],[-.1,.09,.072,0,0,.25,.25]],-.62,.62,A,.011,0,-.02,0,0,0,.2,2.4,8,[[.5,.2]]); hinge(hips,T,F,sx*.122,-.05,0,.04,.03);}
    // torso: bellows waist between pistons, a dark rib cage, layered chest plates either side of the core, shoulder blades and a spine behind
    L(chest,[[-.03,.055,.048],[.06,.046,.042],[.14,.066,.056]],R); L(chest,[[.1,.08,.066],[.22,.132,.098],[.34,.156,.11],[.44,.138,.094],[.49,.085,.066]],F);
    add(chest,UC,T,0,.2,.09,.044,.03,.044,HP); add(chest,GS,G,0,.2,.104,.031,.031,.014);
    S(chest,[[.445,.108,.09],[.5,.09,.076],[.53,.072,.062]],-HP+.85,HP+PI-.85,A,.011,0,0,0,0,0,0,2.4,12); L(chest,[[.47,.042,.046],[.57,.036,.042,0,.012]],R);
    const UP=[[.262,.128,.106,0,0,.45,0],[.33,.16,.12],[.41,.172,.12],[.465,.15,.1],[.49,.1,.074]],LO=[[.14,.08,.066,0,0,.5,.15],[.19,.108,.086,0,0,.2,0],[.25,.132,.106]];
    for(let k=0;k<5;k++)add(chest,GR,F,0,.1+k*.085,[-.078,-.1,-.112,-.118,-.104][k],.038,.062,.04);
    for(const sx of [-1,1]){
      rod(chest,T,sx*.056,-.03,.03,sx*.07,.15,.045,.008); rod(chest,F,sx*.05,-.03,-.03,sx*.06,.16,-.04,.012);
      SX(sx,chest,UP,.5,HP-.06,A,.012,0,0,0,0,0,0,2.6,10,[[.1,.1],[.1,.9],[.88,.5]]); T2(SX(sx,chest,LO,.4,HP-.42,A,.011,0,0,0,0,0,0,2.6));
      PL(chest,[[.2,.104,.098,0,0,0,.7],[.28,.144,.116,0,0,0,.2],[.4,.17,.126],[.47,.14,.106]],-HP+.2,-.5,A,{sx,ex:2.6,seg:10,cols:[.5],bolts:2});
      hinge(chest,T,F,sx*.2,SHY,0,.042,.05); rod(chest,T,sx*.07,.2,-.1,sx*.1,.4,-.2,.02); add(chest,UC,R,sx*.1,.4,-.2,.014,.02,.014,-.46,0,sx*.15);
      // pauldron, fixed to the shoulder: a sloped plate bolted at its corners with a stepped border, two raised panels on it split by a
      // diagonal groove (the inner one dark umber), slit vents in the outer panel, an umber lame under its tip
      const g=new THREE.Group();g.position.set(sx*.165,.5,0);g.rotation.z=-sx*(HP+.4);chest.add(g);
      const PD=[[-.03,.03,.07],[.08,.058,.125],[.2,.072,.165],[.3,.06,.15,0,0,.25,.25]];
      SX(sx,g,PD,PI-1.25,PI+1.25,A,.012,0,0,0,0,0,0,3.2,10,6,.008); PL(g,cut(shrink(PD,-.009),.02,.268),PI-.95,PI+.95,A,{sx,th:.009,ex:3.2,seg:10,cols:[[.26,.74]],gap:.012,tone:[0,1]});
      T2(SX(sx,g,[[.12,.046,.112],[.24,.058,.15],[.35,.046,.128,0,0,.3,.3]],PI-1.15,PI+1.15,A,.012,0,0,0,0,0,0,3.2,10));
      for(const z of [.03,.085])add(g,GB,R,-sx*.079,.2,z,.014,.085,.016,0,0,-sx*.1);
      if(sx>0)for(let k=0;k<3;k++)add(g,GB,R,-.072,.085+k*.02,.06,.012,.01,.05,0,0,-.2);   // unit mark: three stencilled bars on the left shoulder
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
      // limbs: twin struts and a bright piston under leaf-shaped plates nearly as wide as the thigh, which stop short of each hinge so
      // the frame shows; shins in dark umber
      struts(ua,F,T,-.02,-ARM1+.01,.025,.012,.0125); SX(sx,ua,[[-.035,.046,.05,.006,0,.5,.5],[-.09,.06,.064,.008],[-.16,.053,.057,.006],[-.225,.036,.04,.003,0,.4,.4]],-1.9,1.9,A,.011,0,0,0,0,0,0,3,8,2);
      hinge(fa,F,T,0,0,0,.036,.07); struts(fa,F,T,-.02,-ARM2+.02,.022,.011,.011);
      SX(sx,fa,[[-.03,.03,.034,.004,0,.7,.7],[-.1,.047,.052,.006],[-.17,.043,.047,.004],[-.25,.03,.033,.002],[-.276,.025,.027,0,0,.4,.4]],-2.2,2.2,A,.011,0,0,0,0,0,0,3,10,[[.5,.1],[.5,.9]]); add(fa,UC,F,0,-.282,0,.034,.02,.034);
      struts(ul,F,T,-.03,-L1+.02,.02,.012,.014);
      PL(ul,[[-.04,.06,.06,.01,.02],[-.1,.066,.066,.01,.022],[-.24,.05,.052,.004,.02],[-.37,.034,.036,0,.01,.5,.5]],-.55,2.15,A,{sx,ex:3,seg:10,cols:[[.42,.5]],bolts:[[.5,.04],[.5,.9]]});
      hinge(ll,F,T,0,0,0,.044,.094); S(ll,[[.05,.03,.04,0,.012,.5,.5],[0,.042,.054,0,.014],[-.05,.03,.04,0,.012,.5,.5]],HP-.9,HP+.9,A,.011);
      struts(ll,F,T,-.03,-L2+.03,.016,.012,.012);
      T2(S(ll,[[-.06,.05,.062,0,-.02,.2,.2],[-.13,.056,.07,0,-.022],[-.26,.046,.056,0,-.014],[-.38,.03,.034,0,-.006,.5,.5]],-HP-1.2,-HP+1.2,A,.012,0,0,0,0,0,0,3));
      T2(S(ll,[[-.07,.04,.046,0,.012],[-.14,.044,.05,0,.012],[-.3,.036,.04,0,.006],[-.4,.028,.03,0,0,.4,.4]],HP-.8,HP+.8,A,.011,0,0,0,0,0,0,3,8,[[.5,.06]])); add(ll,UC,F,0,-L2+.03,0,.03,.02,.03);
      hinge(ft,F,F,0,0,0,.028,.066); add(ft,cone(.016,.11,5),F,0,-.045,-.05,1,1,1,PI+.6);
      for(const k of [-1,1])L(ft,[[0,.022,.02],[.07,.03,.024],[.17,.02,.014],[.225,.006,.005]],A,k*.03,-.022,-.01,1.86,0,-k*.22);
      add(sw,GR,F,0,-.012,0,.078,.09,.078);
      if(s===1){add(sw,UC,F,0,.04,0,.036,.06,.036); blade(sw,[[-.05,0],[.05,0],[.062,.5],[.075,.8],[.04,.95],[-.05,.86]],[[.05,.03],[.062,.5],[.075,.8],[.044,.94]],[[-.03,.08],[0,.08],[.01,.6],[-.02,.78],[-.036,.6]],.07,.014);}
      else for(let k=-1;k<=1;k++){add(sw,cone(.018,.24,4),F,k*.036,.15,0,1,1,1,0,0,-k*.22); add(sw,cyl(.012,.012,.08),F,k*.036,.03,0);}
    }
  }
  // Brute: a walking siege engine in matte olive, built from slabs. Every form is a bevelled block or a plate, bolted, with the dark
  // frame showing in the gaps: stacked slab pauldrons over a hazard lip, a raked glacis between two side plates, grey fuel tanks and
  // exhaust stacks, a visor head under a cowl, block fists with four finger slabs, broad thighs under flared hip plates.
  buildBrute(add,L,M){
    const {hips,chest,head}=this,{rod,hinge,flat,T2}=this.K,A=M.armor,T=M.trim,F=M.frame,G=M.glow,HZ=M.hazard,HP=PI/2,L1=this.L1,L2=this.L2,q1=L1/LEG1,q2=L2/LEG2;
    // it stands tall and square, feet planted wider than its shoulders
    this.pose=(o,c)=>{if(c===CL.eIdle){o[I.hy]+=.1;o[I.hip]-=.17;o[I.ch]-=.17;o[I.hd]+=.26;o[I.fl]+=.1;o[I.fr]-=.1;}};
    // BX: a block (see slab). bolt: a fastener head at a point, standing along n. tilt: a frame to build a leaning assembly in, then folded away.
    const BX=(par,mat,w,h,d,x=0,y=0,z=0,rx=0,ry=0,rz=0,c=.014)=>add(par,slab(w,h,d,c),mat,x,y,z,1,1,1,rx,ry,rz);
    const bolt=(par,x,y,z,nx,ny,nz,r=.011)=>{const m=add(par,BOLT,A,x,y,z,r,r*.6,r);m.quaternion.setFromUnitVectors(UPV,_a.set(nx,ny,nz).normalize());return m;};
    const tilt=(par,x,y,z,rx,ry,rz)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.set(rx,ry,rz);par.add(g);return g;};
    const HB=GB.clone();{const uv=HB.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,uv.getY(i)*.115);}   // HB: a strip whose chevrons keep their shape
    // pelvis: a frame block and belt, a loin plate and a rear plate, a flared skirt plate over each hip
    BX(hips,F,.36,.24,.26,0,-.03,0,0,0,0,.03); add(hips,UC,T,0,.09,0,.19,.05,.15);
    BX(hips,A,.22,.22,.045,0,-.08,.14,-.14); for(const x of [-.08,.08])bolt(hips,x,0,.158,0,.14,1); T2(BX(hips,A,.1,.05,.012,0,-.12,.172,-.14,0,0,.004)); BX(hips,A,.26,.17,.045,0,-.05,-.135,.1);
    for(const sx of [-1,1]){const g=tilt(hips,sx*.225,-.07,0,0,0,sx*.2);BX(g,A,.05,.27,.27);T2(BX(g,A,.012,.05,.2,sx*.027,-.08,0,0,0,0,.004));for(const z of [-.09,.09])bolt(g,sx*.026,.09,z,sx,0,0);flat(g);}
    // waist: the dark frame showing between two pistons; a barrel of frame under the chest armour
    L(chest,[[-.04,.12,.1],[.06,.1,.085],[.14,.14,.11]],F,0,0,0,0,0,0,3.2,16); L(chest,[[.1,.17,.14],[.24,.235,.175],[.38,.245,.175],[.48,.2,.15],[.53,.13,.1]],F,0,0,0,0,0,0,3.4,16);
    // vent grille in the belly: its bars are the Brute's own light. Above it, two grey tanks with end caps
    add(chest,GR,T,0,.115,.185,.3,.1,.05); for(let k=-1;k<=1;k++)add(chest,GB,G,k*.08,.115,.207,.034,.068,.012);
    // glacis: a raked plate in two halves, its top edge standing proud, a grey band across it
    {const g=tilt(chest,0,.375,.185,-.3,0,0);for(const sx of [-1,1]){BX(g,A,.2,.27,.045,sx*.106,0,0);T2(BX(g,A,.2,.035,.012,sx*.106,.06,.026,0,0,0,.004));for(const [x,y] of [[.17,.1],[.17,-.1],[.04,-.1]])bolt(g,sx*x,y,.023,0,0,1);}flat(g);}
    for(let k=0;k<4;k++)add(chest,GR,F,0,.16+k*.1,-.215,.07,.07,.05);
    BX(chest,A,.3,.22,.04,0,.63,-.14,-.22); for(const x of [-.1,.1])bolt(chest,x,.7,-.136,0,.2,1);   // cowl behind the head
    for(const sx of [-1,1]){
      rod(chest,T,sx*.1,-.05,.1,sx*.13,.17,.15,.016); rod(chest,F,sx*.1,-.05,.1,sx*.116,.06,.127,.025);
      T2(add(chest,UC,A,sx*.105,.228,.212,.05,.15,.05,0,0,HP)); for(const x of [.026,.184])add(chest,UC,T,sx*x,.228,.212,.056,.014,.056,0,0,HP);
      BX(chest,A,.13,.3,.045,sx*.262,.345,.105,0,sx*.75,0); bolt(chest,sx*.3,.44,.1,sx*.68,0,.73); bolt(chest,sx*.3,.25,.1,sx*.68,0,.73);   // side plate
      BX(chest,A,.2,.3,.045,sx*.106,.37,-.185,.08); for(const [x,y] of [[.17,.47],[.17,.27]])bolt(chest,sx*x,y,-.205,0,0,-1);   // back plate
      BX(chest,A,.04,.18,.2,sx*.17,.6,-.06,0,0,-sx*.14);   // cowl cheek
      hinge(chest,T,F,sx*.3,SHY,0,.085,.1);
      // pauldron: two stacked slabs with the dark core showing in the gap between them, bolted, a grey plate on top, a hazard lip below
      const g=tilt(chest,sx*.375,.455,0,0,0,-sx*.2);
      BX(g,F,.26,.25,.36,0,0,0,0,0,0,.02); BX(g,A,.32,.15,.43,0,.083,0,0,0,0,.016); BX(g,A,.3,.115,.41,0,-.066,0,0,0,0,.016); T2(BX(g,A,.2,.02,.3,sx*.02,.163,0,0,0,0,.006));
      for(const z of [-.15,.15]){bolt(g,sx*.161,.083,z,sx,0,0);bolt(g,sx*.151,-.066,z,sx,0,0);} for(const x of [-.1,.1])bolt(g,x,.083,.216,0,0,1);
      add(g,GR,T,sx*.01,-.142,0,.31,.03,.42); add(g,HB,HZ,sx*.01,-.142,.212,.29,.032,.008); flat(g);
      add(chest,plate([[-.035,0],[.035,0],[.05,.3],[.012,.44],[-.02,.3]],.022,.006),T,sx*.2,.5,-.2,1,1,1,-.3,HP,0);
      // exhaust stack in grey, collared, a glow in its mouth
      T2(add(chest,UC,A,sx*.12,.6,-.22,.048,.3,.048,-.25)); add(chest,UC,T,sx*.12,.69,-.243,.054,.04,.054,-.25); add(chest,UC,T,sx*.12,.53,-.203,.054,.04,.054,-.25); add(chest,UC,G,sx*.12,.746,-.258,.032,.02,.032,-.25);
    }
    // head: an armoured block, larger than before, one visor slit under a heavy brow, a grey crown plate
    head.scale.setScalar(1.3);
    BX(head,A,.2,.17,.22,0,.025,.02,0,0,0,.022); add(head,GR,F,0,.02,.125,.15,.06,.05); add(head,GB,G,0,.025,.153,.13,.022,.012); add(head,GR,T,0,.07,.08,.2,.03,.16,.15);
    T2(BX(head,A,.13,.02,.15,0,.115,.0,0,0,0,.006)); for(const sx of [-1,1]){add(head,GR,T,sx*.1,.0,.05,.02,.09,.1);bolt(head,sx*.07,-.03,.131,0,0,1,.009);}
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      // arm: a slab over the upper arm, two stacked slabs on the forearm with the tell light down the outside
      add(ua,limb(.06,.05,ARM1),F,sx*.04); BX(ua,A,.19,.2,.21,sx*.055,-.145,0); T2(BX(ua,A,.2,.03,.22,sx*.055,-.2,0,0,0,0,.006)); for(const z of [-.07,.07])bolt(ua,sx*.151,-.09,z,sx,0,0);
      hinge(fa,T,F,0,0,0,.078,.17); add(fa,limb(.06,.05,ARM2),F); BX(fa,F,.2,.26,.22,sx*.015,-.17,0,0,0,0,.02);
      BX(fa,A,.23,.125,.25,sx*.015,-.107,0); BX(fa,A,.25,.115,.27,sx*.015,-.242,0); for(const z of [-.09,.09]){bolt(fa,sx*.015+.08,-.107,z>0?.126:-.126,0,0,z);bolt(fa,sx*.015-.08,-.242,z>0?.136:-.136,0,0,z);}
      add(fa,UC,T,sx*.15,-.15,0,.03,.24,.03); add(fa,GB,G,sx*.152,-.18,0,.012,.11,.06);
      // fist: a dark palm block under a banded cuff (the band glows), four bevelled finger slabs across the knuckles, a thumb plate
      BX(sw,F,.21,.17,.21,0,.02,0,0,0,0,.02); add(sw,GR,T,0,-.05,0,.27,.055,.27); add(sw,GB,G,0,-.05,0,.28,.024,.1); add(sw,GB,G,0,-.05,0,.1,.024,.28);
      for(let k=0;k<4;k++)BX(sw,A,.2,.105,.047,0,.098,(k-1.5)*.053,0,0,0,.012); T2(BX(sw,A,.214,.026,.222,0,.05,0,0,0,0,.005)); BX(sw,A,.05,.13,.13,-sx*.127,.055,.02);
      // leg: a broad thigh in two slabs over the frame; a hinge knee under a grey cap; a calf block behind a forward-raked shin plate
      // that widens to the foot; a long foot with a separate toe plate and a heel strut
      hinge(ul,F,F,0,0,0,.09,.1); add(ul,limb(.08,.065,L1),F); BX(ul,F,.24,.4*q1,.2,sx*.045,-.24*q1,0,0,0,0,.02);
      BX(ul,A,.3,.2*q1,.27,sx*.05,-.13*q1,0,0,0,0,.016); BX(ul,A,.27,.2*q1,.25,sx*.045,-.345*q1,0,0,0,0,.016); for(const x of [-.09,.09]){bolt(ul,sx*.05+x,-.07*q1,.136,0,0,1);bolt(ul,sx*.045+x,-.41*q1,.126,0,0,1);}
      hinge(ll,F,F,0,0,0,.088,.2); T2(BX(ll,A,.2,.17,.06,0,.005,.105,.1,0,0,.016)); add(ll,limb(.06,.05,L2),F); BX(ll,A,.2,.3*q2,.17,0,-.25*q2,-.035);
      {const g=tilt(ll,0,-.075*q2,.09,-.2,0,0);add(g,plate([[-.085,0],[.085,0],[.14,-.4*q2],[-.14,-.4*q2]],.05,.014),A);T2(BX(g,A,.2,.03,.012,0,-.3*q2,.028,0,0,0,.004));for(const [x,y] of [[.06,-.03],[-.06,-.03],[.11,-.36],[-.11,-.36]])bolt(g,x,y*q2,.025,0,0,1);flat(g);}
      for(const k of [-1,1])rod(ll,F,k*.05,-.04,-.085,k*.05,-.36*q2,-.125,.014);
      BX(ft,A,.27,.1,.34,0,-.04,.075,0,0,0,.018); BX(ft,A,.25,.066,.125,0,-.052,.322); add(ft,HB,HZ,0,-.05,.3855,.21,.03,.006); BX(ft,F,.25,.022,.5,0,-.079,.13,0,0,0,.008);
      rod(ft,F,0,-.01,-.07,0,-.066,-.2,.03); BX(ft,F,.15,.03,.09,0,-.075,-.21,0,0,0,.01); for(const x of [-.09,.09])bolt(ft,x,.011,.14,0,1,0);
    }
  }
  // Stalker: a lean assassin frame in violet-black, all facets and ridges. Two flat chest plates meeting on a keel, wedge shoulder
  // caps with a ridge pointing outward, a narrow wedge skull with a brow over one vertical eye, four broad wing blades in an X on the
  // back, a clipped blade on a bracket at each wrist and a spur behind each elbow. Its plates are low-exponent sections (a ridge down
  // the middle of each), worn bright at the rims; pink only as thin lines and the eye.
  buildStalker(add,L,M){
    const {hips,chest,head}=this,{rod,hinge,struts,flat,S,SX,blade}=this.K,A=M.armor,T=M.trim,F=M.frame,R=M.rubber,G=M.glow,HP=PI/2,L1=this.L1,L2=this.L2;
    // it waits low and pitched forward, one foot leading, both blades held back and out behind its hips like folded wings, never
    // resting on the floor (the walk cycle of the idle clip still drives its feet)
    this.pose=(o,c)=>{if(c===CL.eIdle){o[I.hy]-=.1;o[I.hip]+=.06;o[I.hd]+=.14;o[I.fl+2]+=.2;o[I.fr+2]-=.14;const b=sin(this.t*2.6+this.seed)*.02;
      wr(o,AL([.55,-.62,-.56],.5,[.42,-.7,-.6]));wr(o,AR([-.55,-.62,-.56],.5,[-.42,-.7,-.6]));o[I.hl+1]-=b;o[I.hr+1]+=b;}};
    L(hips,[[-.12,.04,.046],[-.05,.08,.068],[.03,.088,.072],[.08,.072,.06]],F); add(hips,UC,T,0,.082,0,.088,.026,.072);
    S(hips,[[.05,.092,.076],[-.04,.086,.072],[-.17,.03,.036,0,.016,.4,.4]],HP-.6,HP+.6,A,.011,0,0,0,0,0,0,1.6); S(hips,[[.05,.09,.074],[-.02,.084,.07],[-.08,.05,.044,0,0,.3,.3]],-HP-.55,-HP+.55,A,.01,0,0,0,0,0,0,1.6);
    for(const sx of [-1,1]){SX(sx,hips,[[.05,.096,.078],[-.03,.098,.08],[-.09,.08,.064,0,0,.25,.25]],-.55,.55,A,.01,0,-.02,0,0,0,.18,1.6); hinge(hips,T,F,sx*.11,-.05,0,.036,.028);}
    // torso: black bellows waist, dark ribs, two flat chest plates meeting on a keel with the eye of the core set in it
    L(chest,[[-.02,.05,.044],[.07,.04,.036],[.15,.058,.05]],R); L(chest,[[.1,.07,.06],[.22,.118,.09],[.36,.15,.098],[.45,.122,.08],[.49,.07,.056]],F);
    add(chest,UC,T,0,.3,.118,.034,.024,.034,HP); add(chest,GS,G,0,.3,.128,.024,.03,.012); L(chest,[[.47,.034,.038],[.57,.03,.036,0,.014]],R);
    rod(chest,G,0,.19,.094,0,.262,.114,.0028); rod(chest,G,0,.338,.12,0,.45,.104,.0028);   // a thin line of light down the keel
    const KEEL=[[.17,.03,.05,0,.03,.3,0],[.25,.09,.094,0,.012,.1,0],[.36,.146,.112],[.45,.14,.096],[.488,.08,.064]];
    for(let k=0;k<5;k++)add(chest,GR,F,0,.12+k*.08,[-.07,-.09,-.1,-.104,-.09][k],.032,.056,.034);
    for(const sx of [-1,1]){
      SX(sx,chest,KEEL,.45,HP-.03,A,.011,0,0,0,0,0,0,1.2,8,[[.12,.55],[.3,.88]],.005); SX(sx,chest,[[.22,.094,.092,0,0,0,.6],[.32,.134,.11],[.44,.138,.104],[.485,.08,.07]],-HP+.2,-.45,A,.011,0,0,0,0,0,0,1.3,8);
      hinge(chest,T,F,sx*.2,SHY,0,.036,.044);
      // shoulder cap: a wedge of three planes, two slopes and a narrow flat between them, its ridge pointing outward; a line of light on the ridge
      const g=new THREE.Group();g.position.set(sx*.185,.455,-.01);g.rotation.z=-sx*(HP+.3);chest.add(g);
      const SL=[[0,-.04],[.088,.01],[.076,.15],[0,.3]];
      add(g,plate(SL,.014,.006),A,-sx*.036,0,.007,1,1,1,0,sx>0?-.95:.95-PI,0); add(g,plate(SL,.014,.006),A,-sx*.036,0,-.007,1,1,1,0,sx>0?.95:PI-.95,0);
      add(g,plate([[-.012,-.04],[.012,-.04],[.01,.16],[0,.31],[-.01,.16]],.012,.005),A,-sx*.04,0,0,1,1,1,0,-sx*HP,0); add(g,GB,G,-sx*.047,.1,0,.004,.2,.005); flat(g);
      // wing blades: broad at the root, tapering, a line of light down the trailing edge; the upper pair a fifth longer
      for(const [an,ln,rx] of [[.75,.66,-.6],[2.25,.54,.5]]){const w=new THREE.Group();w.position.set(sx*.07,.36,-.118);w.rotation.set(rx,0,-sx*an);chest.add(w);
        add(w,plate([[-.046,0],[.046,0],[.04,ln*.55],[.012,ln],[-.014,ln*.8],[-.04,ln*.3]],.018,.006),A); add(w,GB,G,-sx*.04,ln*.36,0,.007,ln*.6,.022,0,0,-sx*.07);
        add(w,UC,T,0,.02,0,.03,.03,.03,HP); flat(w);}
    }
    // head: a narrow wedge skull in two halves that meet on a ridge and leave a slot for the one vertical eye; a brow plate over it,
    // a long crest behind, mandible plates
    L(head,[[0,.035,.045],[.05,.054,.082,0,.01],[.1,.052,.104,0,-.02],[.14,.034,.094,0,-.07],[.165,.012,.05,0,-.14]],F,0,0,0,0,0,0,2.2,12);
    const SK=prow([[.02,.08,.072,-.03,.004],[.06,.098,.098,-.03,.004],[.108,.096,.12,-.03,-.02],[.148,.074,.108,-.03,-.07],[.172,.046,.058,-.03,-.14]],1.7,.016,0);
    add(head,GB,G,0,.078,.106,.016,.09,.012); add(head,plate([[0,0],[.34,.1],[.4,.16],[.05,.07]],.012,.004),A,0,.14,-.02,1,1,1,0,HP,0);
    add(head,plate([[-.05,.004],[0,.034],[.05,.004],[.034,-.02],[0,-.004],[-.034,-.02]],.014,.005),A,0,.132,.096,1,1,1,.55);
    for(const sx of [-1,1]){SX(sx,head,SK,-HP,HP,A,.01,0,0,0,0,0,0,1.7,10); add(head,plate([[-.014,.03],[.014,.03],[.008,-.1],[0,-.15]],.012,.004),T,sx*.046,.02,.08,1,1,1,.5,sx*.4,0);}
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      // limbs: twin struts and a piston under narrow ridged plates; the forearm plate runs on past the elbow as a spur
      struts(ua,F,T,-.02,-ARM1+.01,.02,.01,.011); SX(sx,ua,[[-.03,.032,.036,.006,0,.5,.5],[-.09,.044,.048,.008],[-.17,.038,.042,.006],[-.245,.024,.028,.002,0,.4,.4]],-1.8,1.8,A,.01,0,0,0,0,0,0,1.6,8);
      hinge(fa,F,T,0,0,0,.03,.058); struts(fa,F,T,-.02,-ARM2+.02,.018,.009,.0095);
      SX(sx,fa,[[.1,.004,.006,.034],[.045,.018,.022,.03],[-.03,.036,.042,.014],[-.1,.042,.048,.008],[-.2,.032,.036,.003],[-.262,.022,.025,0,0,.5,.5]],-1.7,1.7,A,.01,0,0,0,0,0,0,1.6,8);
      // wrist blade on its bracket: tapering, clipped at the tip, honed along the cutting edge
      add(sw,GR,F,0,.03,0,.07,.06,.036); add(sw,GR,F,0,.11,0,.05,.12,.024); for(const y of [.07,.15])add(sw,UC,F,0,y,0,.008,.04,.008,HP);
      blade(sw,[[-.028,0],[.032,0],[.036,.3],[.026,.82],[-.01,.98],[-.03,.9]],[[.032,.04],[.036,.3],[.026,.82],[-.006,.97]],[[-.018,.1],[.006,.1],[.008,.6],[-.012,.8],[-.02,.6]],.06,.01);
      struts(ul,F,T,-.03,-L1+.02,.019,.011,.012);
      SX(sx,ul,[[-.04,.054,.058,.008,.014],[-.09,.06,.064,.008,.014],[-.24,.046,.05,.002,.012],[-.39,.028,.03,0,.006,.5,.5]],-.7,2.3,A,.011,0,0,0,0,0,0,1.7,8); add(ul,GB,G,sx*.066,-.16,.02,.005,.2,.006,0,0,sx*.06);
      hinge(ll,F,T,0,0,0,.038,.084); add(ll,cone(.02,.14,4),A,0,.06,.05,1,1,1,.25);
      struts(ll,F,T,-.03,-L2+.03,.014,.01,.0105);
      S(ll,[[-.05,.042,.052,0,-.016,.2,.2],[-.12,.046,.058,0,-.018],[-.27,.036,.044,0,-.01],[-.4,.024,.028,0,-.004,.5,.5]],-HP-1.2,-HP+1.2,A,.011,0,0,0,0,0,0,1.7);
      S(ll,[[-.06,.034,.04,0,.012],[-.14,.038,.044,0,.012],[-.3,.03,.034,0,.006],[-.42,.022,.024,0,0,.4,.4]],HP-.9,HP+.9,A,.01,0,0,0,0,0,0,1.7); add(ll,GB,G,sx*.042,-.22,0,.005,.2,.006);
      hinge(ft,F,F,0,0,0,.024,.056); L(ft,[[0,.024,.022],[.06,.034,.026],[.16,.024,.016],[.23,.006,.005]],A,0,-.02,-.012,1.875,0,0,1.7); add(ft,cone(.014,.11,5),F,0,-.045,-.05,1,1,1,PI+.6);
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
        const t=mat.userData.tile,wear=mat.userData.wear,geos=list.map(c=>{c.updateMatrix();const q=c.geometry.index?c.geometry.toNonIndexed():c.geometry.clone();q.applyMatrix4(c.matrix);q.computeBoundingBox();const bb=q.boundingBox;
          if(t){const s=bb.getSize(_a),k=max(s.x,s.y,s.z)/t,uv=q.attributes.uv,ou=(++n*.37)%1,ov=(n*.61)%1;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*k+ou,uv.getY(i)*k+ov);}
          // wear data (see WB): how low each point sits on its own part (grime gathers there), and the part's paint tone
          if(wear){const ps=q.attributes.position,cnt=ps.count,y0=bb.min.y,h=bb.max.y-y0,tn=c.userData.tone?0:1;let w=q.attributes.aW;if(!w){w=new THREE.BufferAttribute(new Float32Array(cnt*4),4);q.setAttribute('aW',w);}
            for(let i=0;i<cnt;i++){w.setZ(i,h>.05?1-smooth(sat((ps.getY(i)-y0)/(h*.34))):0);w.setW(i,tn);if(c.userData.nw)w.setXY(i,0,0);}}
          else if(q.attributes.aW)q.deleteAttribute('aW');
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
        if(s&&this.swing!==undefined){   // the maul's seam, vents and thruster bell burn with the speed of the swing
          const k=dt>0&&this.wset===2?sat((vel.length()/dt-4)/16):0;this.swing=dt>0?damp(this.swing,k,k>this.swing?30:5,dt):0;this.mats.mglow.color.setRGB(.045,.5,1).multiplyScalar(.55+3.4*this.swing);}
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
      if(this.pad){   // the pauldron follows the arm forward and back, but only part of the way out to the side: it neither hangs off the
        // shoulder nor cuts into the collar. The flank piston stretches to its lug on the upper arm.
        const pd=this.pad[s],ps=this.pist[s];_d.set(0,-1,0).applyQuaternion(ua.quaternion);const w=hypot(_d.y,_d.z),al=atan2(-_d.z,-_d.y);
        if(w>.12||pd.a===undefined)pd.a=dt>0&&pd.a!==undefined?pd.a+wrapA(al-pd.a)*(1-exp(-45*w*dt)):al;
        pd.g.quaternion.setFromAxisAngle(XAX,pd.a).multiply(_q.setFromAxisAngle(ZAX,clamp(Math.asin(clamp(_d.x,-1,1))*sx,0,1.4)*sx*.4));
        _e.copy(ps.b).applyQuaternion(ua.quaternion).add(ua.position).sub(ps.a);const l=_e.length()||.01;ps.m.position.copy(ps.a);ps.m.scale.set(1,l,1);ps.m.quaternion.setFromUnitVectors(UPV,_e.divideScalar(l));}
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
    if(this.fins){   // back fins: an inverted V at rest; they snap wider in a dodge, open a little in a fall and trail back on the run
      const dg=this.clip===CL.dash||this.clip===CL.back?1:0,lv=this.lv;this.finK=dt>0?damp(this.finK,dg,dg?26:6,dt):dg;
      const op=.6+this.finK*.48+clamp(-this.vy*.02,-.06,.22)+sin(this.tt*1.7)*.012,bk=.3+clamp(lv.z*.03,-.1,.28)+this.finK*.2;
      this.fins[0].rotation.set(bk,0,op);this.fins[1].rotation.set(bk,0,-op);}
  }
}
