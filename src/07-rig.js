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
// hull: a faceted solid, for everything that should read as cut and folded plate rather than a moulded shell. rings = [[y, pts], ...];
// pts is the outline at that height, [[x, z] or [x, z, dy], ...], the same count in every ring (dy lifts one point off its ring, which
// slopes a face; points may coincide, which closes a face to a triangle or an edge). Every face is flat. A strip c wide inside each
// edge leans its shading normal toward the neighbouring face, so every edge catches its own line of light as a bevel would without
// rounding the silhouette, and carries the wear data (aW: x = metres to the nearest edge, y = to the next nearest, small at a corner;
// only an edge that turns by more than about 40 degrees counts: a shallow crease across one plate does not chip).
// cap: 1 = close the first ring, 2 = the last, 3 = both. c = 0: plain flat faces that never wear (a painted band, a decal). soft: outline
// points whose upright edges are seams inside one plate, not borders: they keep their line of light but do not wear.
const rect=(w,d,cx=0,cz=0,ch=0)=>{const a=w/2,b=d/2;return (ch?[[a,-b+ch],[a,b-ch],[a-ch,b],[-a+ch,b],[-a,b-ch],[-a,-b+ch],[-a+ch,-b],[a-ch,-b]]:[[a,-b],[a,b],[-a,b],[-a,-b]]).map(p=>[p[0]+cx,p[1]+cz]);};
const hull=(rings,c=.008,cap=3,soft)=>{const key='H'+c+cap+(soft||'')+JSON.stringify(rings);if(geoCache[key])return geoCache[key];
  const n=rings.length,m=rings[0][1].length,P=[];for(const [y,pts] of rings)for(const p of pts)P.push([p[0],y+(p[2]||0),p[1]]);
  let F=[],ar=0;for(let j=0;j<n-1;j++)for(let i=0;i<m;i++){const a=j*m+i,b=j*m+(i+1)%m;F.push([a,a+m,b+m,b]);}
  const R=[...Array(m).keys()];if(cap&1)F.push(R);if(cap&2)F.push(R.map(i=>n*m-1-i));
  for(const [,pts] of rings){let s=0;pts.forEach((p,i)=>{const q=pts[(i+1)%m];s+=p[0]*q[1]-q[0]*p[1];});if(abs(s)>abs(ar))ar=s;}
  if((ar>0)!==(rings[n-1][0]>rings[0][0]))F=F.map(f=>f.slice().reverse());
  const pk=p=>Math.round(p[0]*2e4)+','+Math.round(p[1]*2e4)+','+Math.round(p[2]*2e4),sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const unit=a=>{const l=hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];},mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],ek=(p,q)=>{const a=pk(p),b=pk(q);return a<b?a+'|'+b:b+'|'+a;};
  const faces=[],vn=new Map(),en=new Map();
  for(const f of F){const v=f.map(i=>Object.assign(P[i].slice(),{o:i%m})).filter((p,i,a)=>pk(p)!==pk(a[(i+1)%a.length]));if(v.length<3)continue;let N=[0,0,0];
    v.forEach((p,i)=>{const q=v[(i+1)%v.length];N[0]+=(p[1]-q[1])*(p[2]+q[2]);N[1]+=(p[2]-q[2])*(p[0]+q[0]);N[2]+=(p[0]-q[0])*(p[1]+q[1]);});if(hypot(N[0],N[1],N[2])<1e-9)continue;N=unit(N);faces.push({v,N});
    v.forEach((p,i)=>{const k=pk(p),a=vn.get(k)||[0,0,0];a[0]+=N[0];a[1]+=N[1];a[2]+=N[2];vn.set(k,a);const e=ek(p,v[(i+1)%v.length]);if(!en.has(e))en.set(e,[]);en.get(e).push(N);});}
  const pos=[],nor=[],uv=[],aw=[],bb=[1e9,1e9,1e9,-1e9,-1e9,-1e9];for(const p of P)for(let k=0;k<3;k++){bb[k]=min(bb[k],p[k]);bb[k+3]=max(bb[k+3],p[k]);}const us=1/max(bb[3]-bb[0],bb[4]-bb[1],bb[5]-bb[2],1e-4);
  for(const {v,N} of faces){const k=v.length,ax=abs(N[0]),ay=abs(N[1]),az=abs(N[2]),ua=ax>=ay&&ax>=az?2:0,va=ay>ax&&ay>=az?2:1;
    const put=(p,n2,x,y)=>{pos.push(p[0],p[1],p[2]);nor.push(n2[0],n2[1],n2[2]);uv.push(p[ua]*us,p[va===ua?1:va]*us);aw.push(min(x,WB)-WB,min(y,WB)-WB,0,1);},tri=(a,b,d)=>{put(...a);put(...b);put(...d);};
    if(!(c>0)){for(let i=1;i<k-1;i++)tri([v[0],N,WB,WB],[v[i],N,WB,WB],[v[i+1],N,WB,WB]);continue;}
    const G=v.reduce((s,p)=>[s[0]+p[0]/k,s[1]+p[1]/k,s[2]+p[2]/k],[0,0,0]);
    const E=v.map((p,i)=>{const q=v[(i+1)%k],d=sub(q,p),L=hypot(d[0],d[1],d[2]),e=[d[0]/L,d[1]/L,d[2]/L],inw=[N[1]*e[2]-N[2]*e[1],N[2]*e[0]-N[0]*e[2],N[0]*e[1]-N[1]*e[0]],o=en.get(ek(p,q)).find(x=>x!==N);
      return {L,inw,sharp:(!o||dot(N,o)<.75)&&!(soft&&p.o===q.o&&soft.includes(p.o)),EN:o?unit([N[0]+o[0],N[1]+o[1],N[2]+o[2]]):N,gd:dot(sub(G,p),inw)};});
    const ci=min(c,max(1e-4,min(...E.map(e=>e.gd))*.45)),gs=E.filter(e=>e.sharp).map(e=>e.gd).sort((a,b)=>a-b);
    const Q=v.map((p,i)=>{const a=E[(i+k-1)%k].inw,b=E[i].inw,s=ci/max(.3,1+dot(a,b));return [p[0]+(a[0]+b[0])*s,p[1]+(a[1]+b[1])*s,p[2]+(a[2]+b[2])*s];}),CN=v.map(p=>unit(vn.get(pk(p)))),g=[G,N,gs[0]??WB,gs[1]??WB];
    for(let i=0;i<k;i++){const j=(i+1)%k,e=E[i],sp=E[(i+k-1)%k].sharp,sn=E[j].sharp,Li=hypot(...sub(Q[j],Q[i])),ts=e.L>.1?[0,.03/e.L,1-.03/e.L,1]:[0,.5,1];
      const O=ts.map(t=>[mix(v[i],v[j],t),t===0?CN[i]:t===1?CN[j]:e.EN,e.sharp?0:WB,min(sp?t*e.L:WB,sn?(1-t)*e.L:WB)]),I=ts.map(t=>[mix(Q[i],Q[j],t),N,e.sharp?ci:WB,min(sp?ci+t*Li:WB,sn?ci+(1-t)*Li:WB)]);
      for(let s=0;s<ts.length-1;s++){tri(O[s],O[s+1],I[s+1]);tri(O[s],I[s+1],I[s]);tri(g,I[s],I[s+1]);}}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setAttribute('aW',new THREE.Float32BufferAttribute(aw,4));
  return geoCache[key]=geo;};
// slab: a block whose edges each catch their own line of light (a hull with a rectangular section). A strip thinner than 8 mm is a painted band: no wear.
const slab=(w,h,d,c=.014)=>hull([[-h/2,rect(w,d)],[h/2,rect(w,d)]],c<.008?0:c);
// fold: a plate folded along straight lines, th thick: one flat facet between each pair of neighbouring outline points, through every
// ring. Rings as in hull, but the outline is an open row of points across the plate, going round from +X toward +Z (the plate's
// thickness is laid on the inside of that turn). Each facet is its own hull, so every fold line shows as a seam between two lames.
// mirX: the same rings for the other side of the body.
const fold=(rings,th=.012,c=.006)=>{const key='F'+th+c+JSON.stringify(rings);if(geoCache[key])return geoCache[key];const m=rings[0][1].length;
  const Q=rings.map(([,pts])=>pts.map((p,i)=>{const nr=k=>{const a=pts[k],b=pts[k+1],l=hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[1]-a[1])/l,(a[0]-b[0])/l];},a=nr(max(0,i-1)),b=nr(min(m-2,i)),s=th/max(.4,1+a[0]*b[0]+a[1]*b[1]);
    return [p[0]-(a[0]+b[0])*s,p[1]-(a[1]+b[1])*s,p[2]||0];}));
  const out=[];for(let i=0;i<m-1;i++)out.push(hull(rings.map(([y,pts],j)=>[y,[pts[i],pts[i+1],Q[j][i+1],Q[j][i]]]),c,3,[...(i?[0,3]:[]),...(i<m-2?[1,2]:[])]));
  return geoCache[key]=mergeGeometries(out,false);};
const mirX=(rings,sx=-1)=>sx>0?rings:rings.map(([y,pts])=>[y,pts.map(p=>[-p[0],p[1],p[2]||0]).reverse()]);
// thin strip along a polyline edge (a blade's honed edge, the line of light behind it): between i0 and i1 in from the edge
const edgeStrip=(E,i0,i1)=>[...E.map(p=>[p[0]-i0,p[1]]),...E.slice().reverse().map(p=>[p[0]-i1,p[1]])];
// proportions per kind: leg = [thigh, shin] against the standard lengths, knee = how far the knees point outwards
const FRAME={hero:{leg:[1,1.1],knee:.05},brute:{leg:[1.27,1.31],knee:.16},warden:{leg:[1.08,1.14],knee:.1}};

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
    // H: a faceted solid (see hull). FD: a folded plate (see fold). sx = -1 builds and places the mirrored part for the right side.
    // stud: a bolt head at a point, standing along the direction n.
    const H=(par,rings,mat,c=.008,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1)=>add(par,hull(mirX(rings,sx),c),mat,sx*x,y,z,1,1,1,rx,sx*ry,sx*rz);
    const FD=(par,rings,mat,th=.012,c=.006,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1)=>add(par,fold(mirX(rings,sx),th,c),mat,sx*x,y,z,1,1,1,rx,sx*ry,sx*rz);
    const stud=(par,mat,x,y,z,nx,ny,nz,r=.0065)=>{const m=add(par,BOLT,mat,x,y,z,r,r*.6,r);m.quaternion.setFromUnitVectors(UPV,_a.set(nx,ny,nz).normalize());return m;};
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
    this.K={rod,hinge,struts,blade,flat,S,SX,PL,T2,NW,H,FD,stud};
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
    const M=this.mats,{hips,chest,head}=this,{rod,hinge,flat,S,SX,PL,NW,H,FD,stud,blade:bladeOf}=this.K,A=M.shell,B=M.shell2,F=M.frame,D=M.dark,J=M.steel,R=M.rubber,GL=M.glow,GL2=M.glow2,GL3=M.glow3,MG=M.mglow,L1=this.L1,L2=this.L2,HP=PI/2;
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
    // rib cage: a graphite core, flat in front and narrow at the lower ribs. Standing proud of it: two faceted white pectoral plates with
    // a dark gap down the sternum, three graphite lames under them, gunmetal flank plates with three vent slots, navy shoulder blades
    // bordered in white under a white yoke (the back only), a navy plate sloping from the neck to each shoulder.
    const FLK=[[.2,.108,.082],[.3,.142,.094],[.392,.152,.094]],BLD=[[.21,.11,.088,0,0,0,.7],[.27,.138,.1,0,0,0,.25],[.34,.156,.108],[.392,.163,.107]];
    const YOKE=[[.404,.176,.118],[.414,.186,.128],[.446,.188,.122],[.476,.158,.1]];
    add(chest,loft([[.12,.074,.058],[.2,.104,.08],[.3,.136,.092],[.4,.146,.092],[.47,.1,.07]],16,3),D);
    PL(chest,YOKE,-PI+.32,-.32,A,{th:.01,ex:3,seg:14,cols:[.5],gap:.03});
    // neck: the head stands 3.5 cm higher on a dark column between four pistons; round it a white collar ring floats on four more, open at the throat
    head.position.y=.595; add(chest,loft([[.47,.05,.05],[.606,.036,.04]],10,2),D);
    for(const [x,z] of [[.032,.036],[-.032,.036],[.042,-.014],[-.042,-.014]]){rod(chest,F,x,.468,z,x*.86,.53,z*.9,.0085);rod(chest,J,x*.86,.53,z*.9,x*.68,.612,z*.78,.005);}
    S(chest,[[0,.124,.104],[.024,.124,.104]],HP+.62,HP+TAU-.62,A,.014,0,.494,-.014,.16,0,0,2.6,18);
    for(const [x,z] of [[.088,-.07],[-.088,-.07],[.112,.026],[-.112,.026]])rod(chest,J,x*.86,.45,z*.86,x,.497-(z+.014)*.16,z,.0055);
    // core light: a ring in a dark housing with a thin white bezel, under the point the two pectorals make
    add(chest,UC,D,0,.254,.1,.036,.03,.036,HP); add(chest,ringGeo(.027,.0035,0),A,0,.254,.1155); add(chest,ringGeo(.0155,.0045,0),GL,0,.254,.117); add(chest,UC,J,0,.254,.108,.007,.018,.007,HP);
    // three graphite lames under the pectorals, each overlapping the next, two bolts on the first
    for(let k=0;k<3;k++){const y=.292-k*.031,w=.118-k*.011,f=.072-k*.007,z=.106-k*.005;
      FD(chest,[[y,[[w,.064],[f,z],[-f,z],[-w,.064]]],[y-.036,[[w+.003,.066],[f+.002,z+.004],[-f-.002,z+.004],[-w-.003,.066]]]],F,.01,.005);}
    for(const sx of [-1,1]){
      rod(chest,J,sx*.062,-.05,.04,sx*.084,.17,.054,.0075); rod(chest,J,sx*.058,-.05,-.04,sx*.08,.17,-.05,.0075);
      rod(chest,F,sx*.062,-.05,.04,sx*.07,.04,.045,.0125); rod(chest,F,sx*.058,-.05,-.04,sx*.066,.04,-.044,.0125);
      // pectoral plate: a faceted block creased at 55% of its height; above the crease it leans back to a chamfered top edge, below it
      // rakes back under by about 25 degrees to a lower edge that runs down toward the sternum, so the two make a V over the core
      H(chest,[[.286,[[.15,.034,.052],[.138,.072,.046],[.1,.092,.022],[.014,.096],[.014,.045]]],[.38,[[.172,.03],[.156,.092],[.112,.124],[.011,.13],[.011,.05]]],
        [.445,[[.176,.03],[.158,.088],[.112,.116],[.011,.122],[.011,.05]]],[.462,[[.168,.03],[.15,.078],[.108,.102],[.011,.108],[.011,.05]]]],A,.007,0,0,0,0,0,0,sx);
      stud(chest,J,sx*.0965,.276,.0865,sx*.67,0,.74,.006);
      H(chest,[[0,[[.056,-.06],[.056,.046],[-.05,.03],[-.05,-.04]]],[.014,[[.052,-.056],[.052,.042],[-.046,.027],[-.046,-.037]]]],B,.005,.136,.462,-.014,0,0,-.42,sx);   // navy plate from the neck down to the shoulder
      PL(chest,FLK,-.6,.6,F,{sx,th:.008,ex:3,seg:6}); for(let k=0;k<3;k++)SX(sx,chest,cut(shrink(FLK,-.0015),.262+k*.024,.274+k*.024),-.26,.26,R,.003,0,0,0,0,0,0,3,4);
      PL(chest,BLD,-HP+.11,-.74,A,{sx,th:.008,ex:3}); PL(chest,cut(shrink(BLD,-.005),.236,.376),-HP+.2,-.86,B,{sx,th:.006,ex:3,bolts:4});
      // shoulder: the ball of the joint sits in a dark collar; the pauldron (pad) rides over it, see apply
      add(chest,UC,D,sx*.2,SHY,0,.054,.052,.054,0,0,HP); add(chest,UC,F,sx*.172,SHY,0,.06,.012,.06,0,0,HP);
      // thruster vent under the shoulder blade
      add(chest,GR,F,sx*.08,.168,-.088,.056,.09,.05,.42,0,sx*.28); add(chest,GR,D,sx*.086,.136,-.112,.04,.03,.02,.42,0,sx*.28); add(chest,GB,GL3,sx*.087,.13,-.118,.03,.008,.012,.42,0,sx*.28);
      // back fin: hinged on the shoulder blade and pointing down and out, so the back spreads into an inverted V. A wedge, 3 cm thick at
      // its root and thinning to a blade, with a step notch a third of the way from the tip; white outside, navy inside, a line of
      // light (at 60%) down the trailing edge. It hangs from a dark hinge block and is worked by a short piston. It opens wider in a
      // dodge and trails on the run (see apply).
      const fn=new THREE.Group();fn.rotation.order='YXZ';fn.position.set(sx*.15,.372,-.13);chest.add(fn);this.fins[sx>0?0:1]=fn;
      const fr=(y,x0,x1,t,z=0)=>[y,rect(x1-x0,t,(x0+x1)/2,z)];
      H(fn,[fr(0,-.058,.058,.03),fr(-.11,-.052,.066,.026),fr(-.33,-.03,.043,.013),fr(-.337,-.03,.029,.013),fr(-.5,-.012,.003,.005)],A,.006,0,0,-.008,0,0,0,sx);
      H(fn,[fr(-.03,-.042,.042,.004,.008),fr(-.11,-.04,.052,.004,.006),fr(-.32,-.022,.03,.004,0)],B,0,0,0,0,0,0,0,sx);
      H(fn,[fr(-.1,.052,.064,.004,-.0222),fr(-.325,.0325,.0415,.004,-.0152)],GL2,0,0,0,0,0,0,0,sx); add(fn,UC,F,0,0,-.002,.03,.04,.03,HP);
      rod(fn,F,-sx*.04,.012,-.03,-sx*.014,-.07,-.028,.011); rod(fn,J,-sx*.014,-.07,-.028,sx*.006,-.135,-.024,.006); add(fn,GR,F,sx*.008,-.14,-.022,.03,.024,.014);
      H(chest,[[-.036,rect(.066,.034)],[.036,rect(.054,.03)]],D,.006,sx*.15,.374,-.112); for(const y of [.35,.398])stud(chest,J,sx*.15,y,-.1295,0,0,-1,.005);
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
    add(sh,loft([[0,.031,.018],[.05,.034,.02],[.58,.029,.017],[.74,.021,.013]],10,3),B); add(sh,loft([[.742,.022,.014],[.79,.013,.009],[.812,.005,.004]],10,3),A);
    add(sh,loft([[-.014,.037,.023],[.03,.038,.024]],10,3),J); add(sh,loft([[.036,.0365,.0225],[.052,.0365,.0225]],10,3),GL3); add(sh,loft([[.24,.035,.022],[.28,.035,.022]],10,3),A);
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
    // coat tails: two navy plates hung from the hip points on hinge barrels, leaning 20 degrees outward and ending at the back of the
    // knee, so the legs show under and between them. Each is two hinged wedges (the lower one lags in motion, see apply) with a dim
    // line of light on its outer edge only. Between them a short tab.
    this.addTails([[PI-.95,PI-.32,-.35],[PI+.95,PI+.32,.35]],.136,.1,[.25],(g,k,i)=>{const e=i?1:-1;
      if(k){H(g,[[-.008,rect(.1,.013)],[-.1,rect(.074,.01)],[-.168,rect(.014,.005)]],B,.005); add(g,UC,F,0,0,0,.008,.09,.008,0,0,HP); add(g,GB,GL3,e*.046,-.052,0,.005,.085,.015,0,0,-e*.13);}
      else{H(g,[[0,rect(.132,.024)],[-.07,rect(.136,.02)],[-.242,rect(.106,.013)]],B,.005); add(g,UC,F,0,0,.004,.014,.15,.014,0,0,HP); add(g,GR,F,0,.014,.01,.05,.03,.02);
        add(g,GB,GL3,e*.064,-.15,0,.005,.17,.017,0,0,-e*.085); H(g,[[-.04,rect(.05,.004,0,.012)],[-.2,rect(.034,.004,0,.008)]],F,0);}});
    this.addTails([PI],.1,.09,[],g=>{H(g,[[0,rect(.084,.018)],[-.06,rect(.076,.014)],[-.12,rect(.024,.008)]],B,.005); H(g,[[-.02,rect(.016,.004,0,.009)],[-.09,rect(.012,.004,0,.006)]],A,0);});
    this.tailBase=.07;
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],hd=this.hand[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      // pauldron: lames folded round the shoulder with a ridge down the outside, each tucked a step under the one above and navy where
      // it shows in the step. Three on the left, the lowest drawn down to a point, with three tally bars; two on the right, which
      // leaves the dark joint housing and its piston in view. It hangs on its own pivot (pad), which follows the arm forward and back
      // but only part of the way out to the side.
      const pd=new THREE.Group();pd.position.set(sx*SHX,SHY,0);chest.add(pd);this.pad.push({g:pd});
      const pt=(a,R)=>[.012+R*cos(a),R*sin(a)*1.04],arc=(R,dy=[0,0,0,0,0])=>[-1.92,-.96,0,.96,1.92].map((a,i)=>[...pt(a,R),dy[i]]),lame=(rings,m,th=.012,c=.006)=>FD(pd,rings,m,th,c,0,0,0,0,0,0,sx);
      H(pd,[[.004,arc(.098,[.012,-.004,-.02,-.004,.012])],[.064,arc(.066)],[.09,arc(.03)]],A,.006,0,0,0,0,0,0,sx);
      lame([[.016,arc(.08)],[-.016,arc(.084)]],B,.011,.004); lame([[-.016,arc(.084)],[-.088,arc(.104,s?[.008,-.006,-.022,-.006,.008]:[.01,-.01,-.034,-.01,.01])]],A);
      if(!s){lame([[-.074,arc(.086)],[-.104,arc(.089)]],B,.011,.004); lame([[-.104,arc(.089)],[-.16,arc(.102,[.024,-.012,-.064,-.012,.024])]],A);
        const bar=y=>{const p=pt(0,.087+.02*(-.016-y)/.106),q=pt(.96,.087+.02*(-.016-y)/.082);return [y,[[p[0]+(q[0]-p[0])*.22,p[1]+(q[1]-p[1])*.22],[p[0]+(q[0]-p[0])*.8,p[1]+(q[1]-p[1])*.8]]];};
        for(let k=0;k<3;k++)NW(lame([bar(-.034-k*.017),bar(-.043-k*.017)],B,.004,0));}
      // arm: twin-strut upper arm under a navy plate, hinge elbow, a white bracer over the outside of the forearm and navy inside it
      add(ua,GS,D,0,0,0,.05,.05,.05);
      rod(ua,F,sx*.004,-.04,.022,sx*.004,-.3,.018,.0125); rod(ua,F,sx*.004,-.04,-.022,sx*.004,-.3,-.018,.0125); rod(ua,J,-sx*.03,-.07,0,-sx*.024,-.28,0,.0075);
      SX(sx,ua,[[-.128,.04,.044,.006,0,.5,.5],[-.168,.05,.054,.008],[-.236,.045,.049,.006],[-.286,.034,.037,.004,0,.45,.45]],-1.85,1.85,B,.011,0,0,0,0,0,0,2.4,8,2);
      hinge(fa,D,J,0,0,0,.038,.074);
      rod(fa,F,sx*.014,-.02,.012,sx*.01,-.285,.008,.011); rod(fa,F,-sx*.016,-.02,-.006,-sx*.012,-.285,-.004,.011); rod(fa,J,0,-.05,-.03,0,-.27,-.022,.0065);
      const FA=[[-.04,.032,.036,.004,0,.6,.6],[-.1,.052,.058,.008,0,.1,.1],[-.17,.048,.053,.006],[-.235,.037,.041,.003],[-.268,.031,.034,0,0,.4,.4]];
      SX(sx,fa,FA,-1.35,1.35,A,.012,0,0,0,0,0,0,2.6,8,[[.5,.08],[.5,.92]]); SX(sx,fa,shrink(cut(FA,-.07,-.25),.004),1.55,TAU-1.55,B,.009,0,0,0,0,0,0,2.6,8);
      add(fa,GR,B,sx*.052,-.15,-.004,.014,.13,.046); add(fa,GB,GL3,sx*.06,-.15,0,.006,.1,.012); add(fa,UC,J,0,-.278,0,.03,.016,.03); add(fa,GS,D,0,-ARM2,0,.027,.027,.027);
      // hand, built round the grip axis (Y): palm block behind, four fingers and a thumb wrapped round, knuckle guard in front
      add(hd,GR,F,0,0,-.037,.056,.084,.03); add(hd,GR,A,0,-.004,.045,.05,.078,.012);
      for(let k=0;k<4;k++)add(hd,arcGeo(.031,.0085,s?-.6:-.87,4.6),J,0,-.03+k*.02,0);
      add(hd,arcGeo(.031,.0095,s?-.2:1.4,1.95),J,0,.052,0);
      // leg: the thigh is navy all round, with one white blade down its front that narrows by a quarter toward the knee and ends in a
      // point over the knee cap; a navy knee cap on a hinge; a white blade down the shin over navy side plates; a white calf shell
      // over the whole back of the shin with one dim strip of light down it; a blade foot on a navy sole with a separate heel strut
      add(ul,GS,D,0,0,0,.058,.058,.058); add(ul,limb(.04,.032,L1),D,0,0,-.008);
      const TH=[[.05,.042,.048,.012],[-.03,.074,.082,.014,.004],[-.12,.07,.078,.01,.008],[-.24,.055,.062,.004,.008],[-.35,.046,.052,0,.005],[-.418,.042,.046]];
      PL(ul,ends(TH,.25,.1,.12,.1),-1.02,2.16,B,{sx,seg:12,cols:[.34],gap:.012,bolts:[[.16,.04],[.16,.96]]}); PL(ul,shrink(cut(TH,0,-.4),.004),2.32,5.1,B,{sx,th:.009,seg:10});
      // blade rings: [y, half width, z of the ridge, x of the ridge]; bl gives the outline at any height
      const TB=[[.03,.03,.072,.012],[-.04,.05,.097,.014],[-.14,.048,.097,.01],[-.3,.038,.08,.004],[-.42,.026,.072,0],[-.505,0,.09,0]],SB=[[-.062,.008,.062,0],[-.15,.044,.082,0],[-.3,.036,.066,0],[-.42,.029,.049,0],[-.468,.022,.04,0]];
      const bl=(T,y,d=0)=>{let j=0;while(j<T.length-2&&y<T[j+1][0])j++;const a=T[j],b=T[j+1],k=(y-a[0])/(b[0]-a[0]),w=a[1]+(b[1]-a[1])*k,z=a[2]+(b[2]-a[2])*k+d,x=a[3]+(b[3]-a[3])*k;return [y,[[x+w,z-.01-w*.14],[x,z],[x-w,z-.01-w*.14]]];};
      FD(ul,TB.map(r=>bl(TB,r[0])),A,.012,.006,0,0,0,0,0,0,sx);
      if(s)for(const y of [-.1,-.128])NW(FD(ul,[bl(TB,y,.002),bl(TB,y-.014,.002)],B,.004,0,0,0,0,0,0,0,sx));   // two pinstripes across the right thigh
      hinge(ll,D,J,0,0,0,.046,.088);
      S(ll,[[.066,.036,.046,0,.012,.5,.5],[0,.05,.064,0,.016],[-.062,.036,.046,0,.012,.5,.5]],HP-.95,HP+.95,B,.011);
      add(ll,limb(.03,.024,L2),D,0,0,-.012);
      const q=L2/LEG2,ys=r=>r.map(v=>[v[0]*q,...v.slice(1)]);
      S(ll,ys([[-.078,.038,.042,0,.012,.7,.7],[-.15,.05,.056,0,.016,.1,.1],[-.3,.04,.046,0,.01],[-.42,.031,.035,0,.004],[-.47,.028,.03,0,0,.35,.35]]),HP-1.3,HP+1.3,B,.011,0,0,0,0,0,0,2.6,10);
      FD(ll,SB.map(r=>{const o=bl(SB,r[0]);o[0]*=q;return o;}),A,.012,.006);
      S(ll,ys([[-.045,.03,.034,0,-.012,.8,.8],[-.12,.052,.064,0,-.02,.1,.1],[-.2,.05,.06,0,-.018],[-.33,.039,.046,0,-.012],[-.435,.03,.034,0,-.006,.4,.4]]),-HP-1.25,-HP+1.25,A,.012,0,0,0,0,0,0,2.4,10,[[.5,.06]]);
      add(ll,GB,GL3,0,-.285*q,-.0655,.008,.15,.006,-.16); add(ll,UC,D,0,-L2+.03,0,.034,.02,.034);
      hinge(ft,D,J,0,0,0,.034,.076);
      add(ft,loft([[-.03,.03,.03],[.03,.046,.036],[.11,.05,.027],[.19,.042,.017],[.245,.024,.009]],12,3.2),A,0,-.018,-.012,1,1,1,1.84);
      add(ft,GR,B,0,-.082,.1,.098,.016,.21); rod(ft,F,0,-.012,-.03,0,-.08,-.084,.012); add(ft,GR,F,0,-.083,-.088,.04,.014,.044);
      add(ft,plate([[-.022,0],[.022,0],[.013,.085],[0,.115],[-.013,.085]],.012,.004),B,0,-.02,-.05,1,1,1,-.45);
    }
    const grp=s=>{const o=new THREE.Group();this.sword[s].add(o);return o;};
    // weapons are modelled with the grip at the origin and the blade (or barrel, or hammer head) along +Y; +X is the cutting edge
    const hiltOf=(o,gd,gm=J)=>{add(o,UC,R,0,-.015,0,.019,.19,.019); add(o,UC,J,0,-.122,0,.024,.03,.024); add(o,cone(.022,.06,4),J,0,-.165,0,1,1,1,PI); add(o,plate(gd,.034,.008),gm,0,.094,0); add(o,GR,B,0,.094,0,.05,.03,.042);};
    // twin fang: a heavy chopping blade that curves forward into a belly two thirds of the way along and is then clipped back to its
    // point. A bright honed edge with a line of light behind it (dim at rest along its whole length, full on the last hand's
    // breadth), a white flat, a steel back with a spine 3 cm thick, so that edge-on it is a bar and not a hairline; a white swept
    // quillon over a knuckle hook. (Its length is the length of its trail: see WEAPONS in 10-data.)
    for(let s=0;s<2;s++){const o=this.wp[s][0]=grp(s),E=[[.03,.04],[.034,.27],[.056,.53],[.094,.75],[.108,.87],[.1,.99],[.086,1.05],[.07,1.11],[.036,1.185]];
      hiltOf(o,[[-.05,-.014],[.04,-.02],[.09,-.004],[.132,.05],[.11,.064],[.076,.027],[.03,.022],[-.03,.03],[-.062,.014]],A);
      add(o,plate([[.06,.02],[.1,.03],[.108,-.05],[.09,-.115],[.074,-.108],[.086,-.05],[.078,0]],.02,.006),J,0,.094,0);
      add(o,plate([[-.03,0],[.03,0],...E.slice(1),[.006,1.12],[-.012,.97],[-.028,.75],[-.04,.48],[-.04,.24]],.016,.005),M.blade,0,.1,0);
      add(o,plate([[-.014,.1],[.012,.1],[.016,.36],[.038,.58],[.072,.77],[.084,.88],[.072,1],[.04,1.09],[.01,.97],[-.006,.72],[-.018,.36]],.021,.003),A,0,.1,0);
      add(o,plate(edgeStrip(E,-.003,.02),.018,.007),M.edge,0,.1,0);
      add(o,plate(edgeStrip(E.slice(0,-2),.022,.031),.025,.002),GL3,0,.1,0); add(o,plate(edgeStrip(E.slice(-3),.006,.031),.025,.002),GL,0,.1,0);
      add(o,plate([[-.04,.02],[-.022,.02],[-.024,.48],[-.012,.75],[.004,.97],[.02,1.12],[.034,1.18],[.006,1.12],[-.012,.97],[-.028,.75],[-.04,.48]],.03,.008),M.blade,0,.1,0);}
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
  // The Gatewarden: the Husks' lord, built in their language but tall, in forged dark steel. Gold is kept to five places, so it reads
  // as metal and not as an outline: the brow of the helm, the gorget, the border of the chest plates, the leading edge of each
  // pauldron, the belt. Every other plate has a dark groove just inside its rim. Sloped vented pauldrons, a skull mask over a grille
  // under a crest of three red blades, a gorget of three lames, chest plates round the core, a mantle of pointed red plates in two
  // tiers that parts behind so the legs show, gauntlets. Everything put in AG() is armour it sheds in phase 2. HG() is what shows
  // once it has: a cage of flat ribs round the fire in its chest, scorched plates between heavier struts on every limb, the bare
  // yokes of the pauldrons (the left one torn, a quarter of its plate still hanging), loose cables, a ring of fire in each joint and
  // a seam of it down each limb.
  buildWarden(add){
    const M=this.mats,{hips,chest,head}=this,{rod,hinge,struts,flat,blade,S,SX,H,FD}=this.K,D=M.dark,T=M.trim,J=M.blade,A=M.armor,C=M.cloth,K=M.char,R=M.rubber,G=M.glow,G2=M.seam,HP=PI/2,L1=this.L1,L2=this.L2,q1=L1/LEG1,q2=L2/LEG2;
    const sub=(map,list,vis)=>par=>{let g=map.get(par);if(!g){g=new THREE.Group();g.visible=vis;par.add(g);map.set(par,g);list.push(g);}return g;};
    const AG=sub(new Map(),this.hide,true),HG=sub(new Map(),this.hot,false),sy=(r,q)=>r.map(v=>[v[0]*q,...v.slice(1)]);
    const L=(par,rings,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0,ex=3,seg=12)=>add(par,loft(rings,seg,ex),mat,x,y,z,1,1,1,rx,ry,rz);
    const BX=(par,mat,w,h,d,x=0,y=0,z=0,rx=0,ry=0,rz=0,c=.01)=>add(par,slab(w,h,d,c),mat,x,y,z,1,1,1,rx,ry,rz);
    const joint=(par,r,w,x=0,y=0,z=0)=>{hinge(par,D,J,x,y,z,r,w);for(const e of [-1,1])add(HG(par),ringGeo(+(r*.62).toFixed(3),+(r*.11).toFixed(3),0),G,x+e*(w/2+.01),y,z,1,1,1,0,HP,0);};   // hinge disc; a ring of fire on each face once the armour is off
    // P: an armour plate. edge 0: a dark groove a centimetre wide just inside its rim, all the way round (limbs, tassets, back).
    // edge 2: a broad raised gold border instead (the chest). edge 3: the groove, and gold along its leading edge only (pauldrons).
    const P=(sx,par,rings,a0,a1,th=.014,ex=3.2,seg=10,bolts=0,x=0,y=0,z=0,rx=0,ry=0,rz=0,edge=0)=>{SX(sx,par,rings,a0,a1,A,th,x,y,z,rx,ry,rz,ex,seg,bolts,.008);
      const Q=shrink(rings,-.003).map(ring7),n=Q.length,y0=Q[0][0],y1=Q[n-1][0],u=y1>y0?1:-1,g=edge===2,w=g?.011:.0045,i=g?0:.006,m=g?T:R,rad=max(.03,Q.reduce((s,r)=>s+r[1]+r[2],0)/n/2),dA=w/rad,dI=i/rad,Qi=cut(Q,y0+u*i,y1-u*i);
      SX(sx,par,cut(Q,y0+u*i,y0+u*(i+w)),a0+dI,a1-dI,m,.004,x,y,z,rx,ry,rz,ex,seg);SX(sx,par,cut(Q,y1-u*(i+w),y1-u*i),a0+dI,a1-dI,m,.004,x,y,z,rx,ry,rz,ex,seg);
      SX(sx,par,Qi.map(r=>[...r.slice(0,5),r[5],-r[5]]),a0+dI,a0+dI+dA,m,.004,x,y,z,rx,ry,rz,ex,2);SX(sx,par,Qi.map(r=>[...r.slice(0,5),-r[6],r[6]]),a1-dI-dA,a1-dI,m,.004,x,y,z,rx,ry,rz,ex,2);
      if(edge===3)SX(sx,par,shrink(Q,-.002).map(r=>[...r.slice(0,5),r[5],-r[5]]),a0,a0+.0055/rad,T,.005,x,y,z,rx,ry,rz,ex,2);};
    // bare: what a limb segment keeps when the armour is gone: a scorched plate, two heavy struts, a seam of fire in the gap between them
    const bare=(par,sx,rings,a0,a1,y0,y1,dx,r)=>{const g=HG(par);SX(sx,g,rings,a0,a1,K,.014,0,0,0,0,0,0,3,8);for(const e of [-1,1])rod(g,D,e*dx,y0,.004,e*dx*.8,y1,.004,r);add(g,GB,G2,0,(y0+y1)/2,.012,.009,abs(y1-y0)*.78,.009);};
    // it stands tall on near-straight legs; with the armour gone it hunches forward, head low
    this.pose=(o,c)=>{if(c===CL.eIdle){o[I.hy]+=.12;o[I.hip]-=.2;o[I.ch]-=.2;o[I.hd]+=.3;o[I.fl]+=.02;o[I.fr]-=.02;if(!this.hide[0].visible){o[I.hip]+=.09;o[I.ch]+=.2;o[I.hd]+=.1;}}};
    head.scale.setScalar(.84);
    // pelvis: a dark block under a gold belt, a pointed loin plate, a plate over each hip
    L(hips,[[-.14,.06,.06],[-.05,.12,.095],[.05,.125,.1],[.1,.1,.085]],D); add(hips,UC,T,0,.1,0,.135,.05,.108);
    P(1,AG(hips),[[.07,.135,.11],[-.04,.13,.106,0,0,.1,.1],[-.2,.08,.07,0,.02,.3,.3],[-.3,.03,.03,0,.03,.4,.4]],HP-.62,HP+.62,.014,3,8);
    add(hips,plate([[-.03,.04],[.03,.04],[.02,-.05],[0,-.09],[-.02,-.05]],.02,.006),A,0,-.02,.125,1,1,1,.12);
    for(const sx of [-1,1]){P(sx,AG(hips),[[.07,.14,.112],[-.03,.146,.116],[-.13,.12,.094,0,0,.25,.25]],-.6,.62,.014,3,8,0,0,-.02,0,0,0,.2); joint(hips,.05,.036,sx*.15,-.05,0);
      for(const [a,b] of [[[.11,.06,.09],[.15,-.1,.13]],[[.15,-.1,.13],[.13,-.26,.1]]])rod(HG(hips),R,sx*a[0],a[1],a[2],sx*b[0],b[1],b[2],.011);}
    // mantle: two tiers of dark red plates, each tapered to a point with a ridge down its middle, hung on dark hinge bars with a gap
    // between neighbours. Four hang to the knee; under them, set half a plate round, four more hang to mid-shin. Neither tier
    // crosses the middle of the back: the mantle parts there, a hand's width, and the legs show between and below the plates
    const mp=(g,w,ln)=>{add(g,plate([[-w,0],[w,0],[w*.86,-ln*.5],[0,-ln],[-w*.86,-ln*.5]],.02,.007),C);add(g,GR,C,0,-ln*.44,.012,.02,ln*.78,.014);add(g,UC,D,0,-.008,0,.014,w*2.1,.014,0,0,HP);};
    this.addTails([PI-1.26,PI-.62,PI+.62,PI+1.26],.172,.137,[],g=>mp(g,.05,.5));
    this.addTails([PI-1.6,PI-.94,PI+.94,PI+1.6],.156,.122,[.3],(g,k)=>{if(k)mp(g,.046,.54);});
    // torso: bellows waist between pistons, a spine of eight blocks, a reactor column, the core in its gold ring
    L(chest,[[-.02,.085,.07],[.06,.07,.058],[.15,.095,.08]],R); L(chest,[[.1,.06,.052],[.3,.08,.068],[.48,.075,.062],[.53,.07,.06]],D,0,0,0,0,0,0,2.4);
    L(HG(chest),[[.13,.07,.062],[.3,.094,.08],[.45,.084,.07]],G2,0,0,0,0,0,0,2.4);   // the fire inside, seen between the ribs
    for(let k=0;k<8;k++)add(chest,GR,D,0,.06+k*.065,[-.08,-.104,-.126,-.143,-.152,-.154,-.147,-.13][k],.06,.052,.05);
    add(chest,UC,D,0,.3,.168,.07,.03,.07,HP); add(chest,ringGeo(.058,.006,0),J,0,.3,.184); add(chest,GS,G,0,.3,.186,.052,.052,.02); L(chest,[[.5,.06,.064],[.6,.05,.056,0,.012]],R);
    const PEC=[[.31,.2,.162,0,0,.3,0],[.39,.224,.168],[.47,.2,.15],[.525,.12,.1]],BLD=[[.2,.14,.128,0,0,0,.6],[.3,.2,.168,0,0,0,.15],[.42,.228,.176],[.5,.18,.142],[.53,.12,.1]];
    P(1,AG(chest),[[.12,.11,.09,0,0,.3,.3],[.2,.166,.136,0,0,.05,.05],[.288,.198,.164]],HP-1.05,HP+1.05,.014,3.2,12);   // plackart under the core
    for(let k=0;k<3;k++)S(AG(chest),[[.5+k*.03,.15-k*.016,.122-k*.013],[.548+k*.03,.132-k*.016,.108-k*.013]],0,TAU,k<2?A:T,.012,0,0,0,0,0,0,2.4,14);   // gorget of three lames
    for(const [a,b] of [[[.05,.5,.08],[.1,.36,.17]],[[.1,.36,.17],[.07,.2,.15]],[[-.06,.5,.07],[-.13,.34,.15]],[[-.13,.34,.15],[-.12,.16,.12]]])rod(HG(chest),R,a[0],a[1],a[2],b[0],b[1],b[2],.011);   // loose cables
    for(const sx of [-1,1]){
      rod(chest,J,sx*.085,-.03,.045,sx*.1,.16,.06,.011); rod(chest,D,sx*.08,-.03,-.04,sx*.09,.17,-.05,.016);
      // ribs: flat arcs, open in front either side of the sternum bar, each tilted down toward the front; the cage narrows from the
      // top rib to two thirds at the waist, and alternate ribs stand a little proud
      for(let k=0;k<6;k++){const y=.13+k*.068,w=(.66+.34*k/5)*(1+(k%2)*.035),o=[];for(let i=0;i<=6;i++){const a=-HP+.2+i*(PI-.52)/6,c=cos(a),z=sin(a);o.push([.25*w*Math.sign(c)*pow(abs(c),.77),.172*w*Math.sign(z)*pow(abs(z),.77),-z*.172*w*.24]);}
        FD(HG(chest),[[y-.019,o],[y+.019,o]],D,.013,.004,0,0,0,0,0,0,sx);}
      rod(HG(chest),D,sx*.04,.11,.168,sx*.036,.24,.172,.016); add(HG(chest),GR,K,sx*.05,.44,.146,.07,.13,.03,-.2,0,sx*.12);
      P(sx,AG(chest),PEC,.45,HP-.045,.014,3.2,10,[[.12,.12],[.12,.88],[.9,.3]],0,0,0,0,0,0,2); P(sx,AG(chest),BLD,-HP+.22,-.45,.014,3.2,10);
      joint(chest,.062,.07,sx*.215,SHY,0);
      // pauldron: two stacked sloped plates with slit vents. Under them a yoke of two ribs on a spar, which is what stays at the
      // shoulder when the armour falls; on the left, half of a plate hangs on, scorched
      const PD=[[-.05,.04,.09],[.08,.08,.16],[.22,.1,.2],[.32,.086,.18,0,0,.25,.25]];
      const g=new THREE.Group();g.position.set(sx*.2,.57,0);g.rotation.z=-sx*(HP+.66);chest.add(g);
      P(sx,g,PD,PI-1.25,PI+1.25,.018,3.2,10,4,0,0,0,0,0,0,3); P(sx,g,[[.13,.064,.14],[.26,.08,.178],[.39,.064,.15,0,0,.3,.3]],PI-1.15,PI+1.15,.016,3.2,10,0,0,0,0,0,0,0,3);
      for(const z of [-.06,.06])add(g,GB,R,-sx*.094,.16,z,.016,.12,.02,0,0,-sx*.1); flat(g,AG(chest));
      const f=new THREE.Group();f.position.set(sx*.2,.57,0);f.rotation.z=-sx*(HP+.66);chest.add(f);
      // (the yoke: two flat ribs on a beam that ends in a torn bracket; half a scorched plate on the left, a jagged quarter on the right)
      for(const y of [.09,.26])SX(sx,f,cut(shrink(PD,.014),y,y+.05),PI-1.2,PI+1.2,D,.012,0,0,0,0,0,0,3.2,8);
      H(f,[[-.05,rect(.05,.074,-.028)],[.2,rect(.034,.056,-.062)],[.37,[[-.064,-.026,.03],[-.064,.026,-.012],[-.094,.026,.022],[-.094,-.026,0]]]],D,.005,0,0,0,0,0,0,sx);
      H(f,[[0,rect(.03,.1)],[.05,[[.015,-.05,.02],[.015,.05,-.01],[-.015,.05,.03],[-.015,-.05,0]]]],K,.004,-.08,.33,0,0,0,.5,sx);
      if(sx>0)SX(sx,f,shrink(PD,.01).map(ring7).map((r,i)=>[...r.slice(0,5),0,[.15,.6,.2,.7][i]]),PI-1.2,PI+.6,K,.014,0,0,0,0,0,0,3.2,8);
      else SX(sx,f,shrink(PD,.01).map(ring7).slice(0,3).map((r,i)=>[...r.slice(0,5),[.1,.45,.15][i],[.9,1.35,1.75][i]]),PI-1.2,PI+1.2,K,.014,0,0,0,0,0,0,3.2,8);
      flat(f,HG(chest));
    }
    // skull: a dark head with a narrow visor over a grille; helm plates and cheek guards (shed); a crest of three red blades, each with a gold spine
    L(head,[[-.02,.06,.07],[.05,.092,.11,0,.004],[.12,.094,.122,0,-.012],[.2,.07,.1,0,-.03],[.24,.03,.045,0,-.05]],D,0,0,0,0,0,0,2.6,12);
    S(AG(head),[[.03,.094,.118,0,0,.45,.45],[.1,.108,.136,0,-.012],[.19,.09,.118,0,-.03],[.245,.05,.07,0,-.05],[.262,.018,.03,0,-.06]],-HP-2.25,-HP+2.25,A,.014,0,0,0,0,0,0,2.6,12);
    S(AG(head),[[.118,.1,.146,0,0,.3,.3],[.16,.098,.14,0,-.006],[.2,.08,.118,0,-.02,.2,.2]],HP-.8,HP+.8,A,.014,0,0,0,0,0,0,2.6); S(AG(head),[[.116,.103,.149,0,0,.3,.3],[.14,.102,.147,0,-.003,.1,.1]],HP-.8,HP+.8,T,.006,0,0,0,0,0,0,2.6);   // the brow: a band of gold
    add(head,GB,G,0,.094,.118,.13,.016,.016); add(head,GR,D,0,.09,.104,.15,.06,.04); for(let k=-2;k<=2;k++)add(head,GR,J,k*.022,.03,.114,.01,.085,.014,.12);
    for(const [x,ln,dy] of [[0,.36,0],[.05,.3,-.25],[-.05,.3,.25]]){add(head,plate([[-.07,0],[.02,0],[ln,.15],[ln-.04,.2],[-.03,.07]],.016,.005),C,x,.2,.02,1,1,1,0,HP+dy,0);
      add(head,plate([[-.038,.06],[ln-.046,.19],[ln-.03,.212],[-.042,.084]],.024,.004),D,x,.2,.02,1,1,1,0,HP+dy,0);}
    for(const sx of [-1,1]){add(AG(head),plate([[-.03,.05],[.024,.062],[.03,-.05],[.008,-.11],[-.02,-.04]],.018,.005),A,sx*.074,.04,.106,1,1,1,0,sx*.55,0); add(head,UC,J,sx*.11,.1,0,.036,.036,.036,0,0,HP);}
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      struts(ua,D,J,-.03,-ARM1+.02,.026,.02,.02); P(sx,AG(ua),[[-.05,.072,.078,.012],[-.11,.078,.084,.012],[-.2,.066,.07,.008],[-.265,.046,.05,.004,0,.5,.5]],-1.4,1.4,.014,3.2,8);
      bare(ua,sx,[[-.05,.054,.058,.008],[-.12,.062,.066,.008],[-.26,.042,.046,.004]],-1.3,1.3,-.03,-ARM1+.02,.04,.021);
      joint(fa,.058,.12); struts(fa,D,J,-.03,-ARM2+.03,.024,.018,.018);
      P(sx,AG(fa),[[-.06,.076,.082,.01],[-.12,.084,.09,.01],[-.23,.07,.076,.004],[-.285,.05,.055,0,0,.5,.5]],-1.45,1.45,.014,3.2,8); add(fa,UC,J,0,-.29,0,.05,.03,.05);
      S(AG(fa),[[-.225,.056,.06],[-.27,.064,.068],[-.318,.084,.088]],0,TAU,A,.012,0,0,0,0,0,0,2.8,12); S(AG(fa),[[-.306,.083,.087],[-.32,.088,.092]],0,TAU,R,.005,0,0,0,0,0,0,2.8,12);   // the gauntlet's bell cuff
      bare(fa,sx,[[-.07,.074,.08,.008],[-.13,.086,.092,.008],[-.27,.06,.065,.002]],-1.35,1.35,-.04,-ARM2+.03,.04,.02);
      // gauntlet: a dark hand (palm and four finger bars); over it a knuckle ridge with gold studs, four finger lames that step down
      // and narrow toward the little finger, and a thumb plate. Its bell cuff is on the forearm.
      BX(sw,D,.08,.11,.07,0,0,-.016); for(let k=0;k<4;k++)BX(sw,D,.086,.018,.05,0,.022-k*.029,.04,0,0,0,.006);
      BX(AG(sw),A,.118,.036,.07,0,.056,.044,.25,0,0,.012); for(const x of [-.036,-.012,.012,.036])add(AG(sw),cone(.011,.02,4),J,x,.062,.086,1,1,1,HP+.25);
      for(let k=0;k<4;k++)BX(AG(sw),A,.112-k*.007,.021,.07-k*.005,0,.022-k*.029,.045-k*.002,0,0,0,.008); BX(AG(sw),A,.034,.075,.05,-sx*.064,.012,.004,0,0,-sx*.3);
      if(s===1){add(sw,UC,R,0,-.04,0,.028,.34,.028); add(sw,UC,J,0,-.23,0,.04,.05,.04); add(sw,cone(.04,.09,4),J,0,-.3,0,1,1,1,PI);
        // crossguard: a dark block with a slit of the blade's fire in each face, and two tapered quillons swept toward the blade
        H(sw,[[.094,rect(.12,.06,0,0,.012)],[.168,rect(.1,.052,0,0,.01)]],D,.006); for(const z of [-.031,.031])add(sw,GB,G,0,.131,z,.06,.012,.006);
        for(const e of [-1,1])H(sw,[[0,rect(.05,.044)],[.07,rect(.036,.032)],[.17,rect(.012,.014)]],A,.005,e*.045,.118,0,0,0,-e*1.1);
        blade(sw,[[-.075,0],[.085,0],[.08,.9],[.06,1.45],[-.02,1.78],[-.07,1.6]],[[.085,.03],[.08,.9],[.06,1.45],[-.012,1.75]],null,.16); add(sw,GB,G,-.014,.9,0,.03,1.4,.03);}
      joint(ul,.07,.06); struts(ul,D,J,-.04,-L1+.03,.034,.022,.024);
      P(sx,AG(ul),sy([[-.03,.1,.104,.012,.014],[-.1,.112,.116,.014,.016],[-.28,.09,.094,.004,.014],[-.4,.064,.068,0,.008,.5,.5]],q1),-.6,2.2,.016,3.2,10,[[.3,.08],[.75,.08],[.5,.92]]);
      bare(ul,sx,sy([[-.05,.076,.08,.01,.012],[-.12,.084,.088,.012,.014],[-.3,.066,.07,.004,.012],[-.42,.048,.052,0,.008]],q1),-.5,2.1,-.04,-L1+.03,.05,.028);
      joint(ll,.068,.16); P(1,AG(ll),[[.09,.05,.07,0,.03,.4,.4],[0,.074,.1,0,.03],[-.08,.05,.07,0,.03,.4,.4]],HP-.9,HP+.9,.014,3,8);
      struts(ll,D,J,-.04,-L2+.04,.028,.02,.02);
      P(1,AG(ll),sy([[-.07,.074,.084,0,.014],[-.16,.08,.09,0,.014],[-.34,.07,.08,0,.008],[-.45,.058,.066,0,.004,.3,.3]],q2),HP-.85,HP+.85,.014,3.2,8);
      S(AG(ll),sy([[-.06,.07,.09,0,-.026,.2,.2],[-.15,.08,.104,0,-.03],[-.3,.066,.082,0,-.018],[-.42,.05,.056,0,-.006,.5,.5]],q2),-HP-1.15,-HP+1.15,A,.014,0,0,0,0,0,0,3.2);
      bare(ll,1,sy([[-.08,.074,.084,0,.012],[-.17,.082,.092,0,.012],[-.36,.066,.076,0,.006],[-.46,.056,.062,0,.002]],q2),HP-.8,HP+.8,-.04,-L2+.04,.044,.024);
      add(ll,UC,J,0,-L2+.04,0,.05,.03,.05); joint(ft,.044,.1);
      L(ft,[[-.09,.07,.13,0,.05],[-.04,.064,.118,0,.05],[.0,.04,.06,0,.02]],D,0,0,0,0,0,0,3.4); add(ft,GR,D,0,-.08,.05,.15,.02,.33);
      S(AG(ft),[[-.085,.09,.15,0,.05],[-.03,.082,.136,0,.05],[.02,.056,.08,0,.02]],HP-1.9,HP+1.9,A,.014,0,0,0,0,0,0,3.4); add(ft,GR,J,0,-.07,.195,.15,.04,.05);
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
    const {hips,chest,head}=this,{rod,hinge,struts,flat,S,SX,PL,T2,stud,blade}=this.K,A=M.armor,T=M.trim,F=M.frame,R=M.rubber,G=M.glow,HP=PI/2,L1=this.L1,L2=this.L2;
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
      // diagonal groove (the inner one dark umber), slit vents in the front of the outer panel and a bolted access plate behind them,
      // an umber lame under its tip
      const g=new THREE.Group();g.position.set(sx*.165,.5,0);g.rotation.z=-sx*(HP+.4);chest.add(g);
      const PD=[[-.03,.03,.07],[.08,.058,.125],[.2,.072,.165],[.3,.06,.15,0,0,.25,.25]];
      SX(sx,g,PD,PI-1.25,PI+1.25,A,.012,0,0,0,0,0,0,3.2,10,6,.008); PL(g,cut(shrink(PD,-.009),.02,.268),PI-.95,PI+.95,A,{sx,th:.009,ex:3.2,seg:10,cols:[[.26,.74]],gap:.012,tone:[0,1]});
      T2(SX(sx,g,[[.12,.046,.112],[.24,.058,.15],[.35,.046,.128,0,0,.3,.3]],PI-1.15,PI+1.15,A,.012,0,0,0,0,0,0,3.2,10));
      for(const z of [.03,.085])add(g,GB,R,-sx*.079,.2,z,.014,.085,.016,0,0,-sx*.1);
      add(g,slab(.012,.072,.056,.008),A,-sx*.074,.2,-.056,1,1,1,0,0,-sx*.1); for(const y of [.176,.224])stud(g,A,-sx*.0815,y,-.056,-sx,.1,0,.005);
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
  // Brute: a walking siege engine in dark matte green, built from faceted hulls that taper, rake and flare so no two parts share a
  // shape: wedge pauldron shells over a thin lame and a hazard lip, a torso that narrows from the shoulders to a pinched frame waist
  // under a raked glacis, round grey tanks under the glacis, a small wedge head sunk in its collar, forearms that widen to the wrist,
  // thighs that narrow to the knee and shins that flare to the foot. Broad faces carry a panel groove and a vent or an access plate.
  // Its back is its hot side: two exhaust stacks with heat in their slots and a three-slot vent between them.
  buildBrute(add,L,M){
    const {hips,chest,head}=this,{rod,hinge,flat,T2,H,stud}=this.K,A=M.armor,T=M.trim,F=M.frame,R=M.rubber,G=M.glow,HZ=M.hazard,HP=PI/2,L1=this.L1,L2=this.L2;
    // it stands tall and square, feet planted wider than its shoulders
    this.pose=(o,c)=>{if(c===CL.eIdle){o[I.hy]+=.1;o[I.hip]-=.17;o[I.ch]-=.17;o[I.hd]+=.26;o[I.fl]+=.1;o[I.fr]-=.1;}};
    // BX: a block (see slab). bolt: a fastener head at a point, standing along n. tilt: a frame to build a leaning assembly in, then
    // folded away. face: the same, set on a slab face: +Z along the face's normal n, +Y along u as near as the face allows.
    const BX=(par,mat,w,h,d,x=0,y=0,z=0,rx=0,ry=0,rz=0,c=.014)=>add(par,slab(w,h,d,c),mat,x,y,z,1,1,1,rx,ry,rz);
    const bolt=(par,x,y,z,nx,ny,nz,r=.011)=>stud(par,A,x,y,z,nx,ny,nz,r);
    const tilt=(par,x,y,z,rx,ry,rz)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.set(rx,ry,rz);par.add(g);return g;};
    const face=(par,x,y,z,nx,ny,nz,ux=0,uy=1,uz=0)=>{const g=new THREE.Group(),n=_a.set(nx,ny,nz).normalize(),u=_b.set(ux,uy,uz);u.addScaledVector(n,-u.dot(n)).normalize();
      g.quaternion.setFromRotationMatrix(_m4.makeBasis(_c.crossVectors(u,n),u,n));g.position.set(x,y,z);par.add(g);return g;};
    const HB=GB.clone();{const uv=HB.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,uv.getY(i)*.115);}   // HB: a strip whose chevrons keep their shape
    // what a broad face carries (built in a face frame): groove, a panel line 8 mm wide; vent, a dark recess with three slats; hatch,
    // an access plate standing 2 cm proud on four bolts
    const groove=(g,x0,y0,x1,y1)=>{const m=add(g,GB,R,(x0+x1)/2,(y0+y1)/2,.001,.0055,hypot(x1-x0,y1-y0),.004);m.rotation.z=atan2(x0-x1,y1-y0);};
    const vent=(g,x,y,w=.1,h=.07)=>{add(g,GB,R,x,y,.0015,w,h,.005);for(let k=-1;k<=1;k++)add(g,GB,A,x,y+k*h*.3,.004,w*.88,h*.13,.007,.5);};
    const hatch=(g,x,y,w=.1,h=.08)=>{add(g,slab(w,h,.016,.008),A,x,y,.006);for(const a of [-1,1])for(const b of [-1,1])bolt(g,x+a*(w/2-.014),y+b*(h/2-.014),.014,0,0,1,.007);};
    // pelvis: a frame block and belt, a loin wedge and a rear plate, a skirt plate over each hip that flares toward its lower edge
    BX(hips,F,.34,.24,.24,0,-.03,0,0,0,0,.03); add(hips,UC,T,0,.09,0,.18,.05,.14);
    H(hips,[[.04,rect(.2,.05,0,.142)],[-.1,rect(.19,.055,0,.162)],[-.24,rect(.06,.04,0,.15)]],A,.01); for(const x of [-.07,.07])bolt(hips,x,-.02,.178,0,.1,1); T2(BX(hips,A,.1,.04,.01,0,-.115,.188,0,0,0,.004));
    BX(hips,A,.26,.17,.045,0,-.05,-.13,.1);
    for(const sx of [-1,1]){const g=tilt(hips,sx*.215,-.06,0,0,0,sx*.22);H(g,[[.13,rect(.05,.2)],[-.16,rect(.05,.31)]],A,.012);T2(BX(g,A,.01,.04,.2,sx*.027,-.09,0,0,0,0,.004));for(const z of [-.07,.07])bolt(g,sx*.026,.08,z,sx,0,0);flat(g);}
    // waist: the dark frame, in view between the pelvis and the chest, a piston either side. The vent grille low in the belly is the
    // Brute's own light
    L(chest,[[-.05,.12,.1],[.05,.095,.08],[.19,.14,.11]],F,0,0,0,0,0,0,3.2,16);
    add(chest,GR,T,0,.012,.112,.21,.085,.05); for(let k=-1;k<=1;k++)add(chest,GB,G,k*.058,.012,.134,.03,.056,.012);
    // torso: one hull, as wide as the shoulders at the top and 0.6 of that at the waist; its front is a glacis raked 25 degrees, split
    // down the middle, with a grey band, a vent and an access plate
    const TR=(y,w,zf,zb,ch)=>[y,[[w/2,zb+ch],[w/2,zf-ch],[w/2-ch,zf],[-w/2+ch,zf],[-w/2,zf-ch],[-w/2,zb+ch],[-w/2+ch,zb],[w/2-ch,zb]]];
    H(chest,[TR(.16,.3,.19,-.14,.05),TR(.27,.38,.245,-.18,.07),TR(.56,.55,.11,-.21,.1),TR(.61,.47,.07,-.18,.09)],A,.012);
    {const g=face(chest,0,.415,.178,0,.42,.906); groove(g,0,-.155,0,.15); T2(BX(g,A,.31,.034,.008,0,.085,.003,0,0,0,.004)); vent(g,.075,-.055,.09,.075); hatch(g,-.075,-.05,.1,.09);
      for(const [x,y] of [[.15,.135],[-.15,.135],[.1,-.135],[-.1,-.135]])bolt(g,x,y,.004,0,0,1); flat(g);}
    // back: spine blocks, and above them a dark recess with three hot slots
    for(let k=0;k<3;k++)add(chest,GR,F,0,.2+k*.09,-.192-k*.009,.07,.07,.05);
    {const g=face(chest,0,.475,-.203,0,-.103,-.995); add(g,GB,R,0,0,.003,.2,.1,.008); for(let k=-1;k<=1;k++)add(g,GB,G,0,k*.03,.007,.16,.013,.008); for(const x of [-.115,.115])bolt(g,x,0,.004,0,0,1,.008); flat(g);}
    // collar: a cowl behind the head, a cheek either side, a lip in front
    BX(chest,A,.3,.2,.04,0,.69,-.19,-.22); for(const x of [-.1,.1])bolt(chest,x,.75,-.184,0,.2,1); BX(chest,A,.25,.045,.03,0,.628,.105,-.5);
    for(const sx of [-1,1]){
      rod(chest,T,sx*.15,-.06,.03,sx*.17,.17,.05,.016); rod(chest,F,sx*.15,-.06,.03,sx*.16,.06,.04,.026);
      // grey tank under the glacis, capped and banded, piped up into the chest
      {const g=tilt(chest,sx*.125,.118,.15,0,sx*.42,-sx*.3); T2(add(g,UC,A,0,0,0,.064,.13,.064,0,0,HP)); for(const x of [-.07,.07])add(g,UC,T,x,0,0,.069,.014,.069,0,0,HP); add(g,GS,T,sx*.072,0,0,.03,.05,.05); flat(g);}
      rod(chest,T,sx*.09,.16,.12,sx*.1,.25,.1,.014);
      {const g=face(chest,sx*.2,.3,.04,sx*.96,-.28,0); vent(g,0,0,.12,.07); flat(g);}
      BX(chest,A,.04,.13,.22,sx*.135,.665,-.05,0,0,-sx*.14);   // cowl cheek
      hinge(chest,T,F,sx*.3,SHY,0,.085,.1);
      // pauldron: one wedge shell, its top sloping 20 degrees down and outward, its outer face raked in, over a dark core; under it a
      // thin lame and the hazard lip. On the top a grey plate, a groove and a vent
      const g=tilt(chest,sx*.385,.475,0,0,0,0),PB=[[.19,-.17],[.19,.17],[.125,.24],[-.16,.24],[-.16,-.24],[.125,-.24]];
      BX(g,F,.24,.2,.36,0,-.03,0,0,0,0,.02);
      H(g,[[-.085,PB],[.125,[[.15,-.145,-.112],[.15,.145,-.112],[.095,.205,-.092],[-.16,.205,0],[-.16,-.205,0],[.095,-.205,-.092]]]],A,.012,0,0,0,0,0,0,sx);
      H(g,[[-.168,PB.map(p=>[p[0]*1.04+.004,p[1]*1.03])],[-.112,PB]],A,.01,0,0,0,0,0,0,sx);
      add(g,GR,T,sx*.02,-.188,0,.33,.028,.47); for(const z of [-.237,.237])add(g,HB,HZ,sx*.02,-.188,z,.3,.03,.008);
      {const t=face(g,-sx*.005,.07,0,sx*.34,.94,0,0,0,1); T2(BX(t,A,.15,.12,.01,sx*.06,-.085,.004,0,0,0,.004)); groove(t,-.15,.02,.15,.02); vent(t,sx*.01,.105,.13,.075);
        for(const [x,y] of [[.13,-.17],[.13,.17],[-.13,-.11],[-.13,.11]])bolt(t,sx*x,y,.004,0,0,1); flat(t);}
      {const f=face(g,-sx*.02,.01,.224,0,.16,.987); T2(BX(f,A,.11,.024,.008,-sx*.06,.045,.003,0,0,0,.004)); bolt(f,sx*.13,-.06,.004,0,0,1); bolt(f,-sx*.11,-.06,.004,0,0,1); flat(f);}
      {const f=face(g,sx*.171,-.035,0,sx*.93,.38,0); hatch(f,0,0,.12,.055); flat(f);}
      flat(g);
      add(chest,plate([[-.035,0],[.035,0],[.05,.3],[.012,.44],[-.02,.3]],.022,.006),T,sx*.21,.52,-.21,1,1,1,-.3,HP,0);
      // exhaust stack in grey, collared; heat in its mouth and in three slots down its back
      T2(add(chest,UC,A,sx*.12,.62,-.235,.05,.3,.05,-.25)); add(chest,UC,T,sx*.12,.71,-.258,.056,.04,.056,-.25); add(chest,UC,T,sx*.12,.54,-.215,.056,.04,.056,-.25); add(chest,UC,G,sx*.12,.767,-.272,.036,.02,.036,-.25);
      for(const t of [-.05,0,.05])add(chest,GB,G,sx*.12,.608+t*.969,-.283-t*.247,.052,.014,.012,-.25);
    }
    // head: a small wedge, sunk in the collar so that only its top third clears the lip: a slit of light and two lens rings in a
    // dark recess under a grey crown plate
    head.scale.setScalar(1);
    H(head,[[.035,rect(.2,.24,0,-.035)],[.135,[[.085,-.16],[.085,.045],[-.085,.045],[-.085,-.16]]]],A,.012); T2(BX(head,A,.12,.014,.13,0,.14,-.06,0,0,0,.005));
    {const g=face(head,0,.108,.0565,0,.37,.93); add(g,GB,R,0,0,.001,.165,.04,.006); add(g,GB,G,0,0,.004,.15,.02,.008); for(const x of [-.045,.045])add(g,ringGeo(.016,.0045,0),T,x,0,.009); flat(g);}
    for(const sx of [-1,1])add(head,GR,T,sx*.103,.075,-.04,.014,.06,.12);
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      // arm: the upper arm narrows to the elbow; the forearm is a third wider at the wrist than at the elbow, banded in grey, with
      // the tell light in a conduit down its outside
      add(ua,limb(.06,.05,ARM1),F,sx*.04); H(ua,[[-.035,rect(.21,.23,.055,0,.03)],[-.255,rect(.16,.18,.05,0,.025)]],A,.012,0,0,0,0,0,0,sx);
      T2(BX(ua,A,.172,.028,.192,sx*.051,-.215,0,0,0,0,.006)); for(const z of [-.07,.07])bolt(ua,sx*.157,-.07,z,sx,.1,0);
      hinge(fa,T,F,0,0,0,.078,.17); add(fa,limb(.06,.05,ARM2),F);
      H(fa,[[-.045,rect(.2,.21,.015,0,.03)],[-.3,rect(.27,.28,.015,0,.04)]],A,.012,0,0,0,0,0,0,sx); T2(BX(fa,A,.262,.026,.272,sx*.015,-.262,0,0,0,0,.006));
      {const f=face(fa,sx*.1325,-.1725,0,sx*.99,.136,0); add(f,UC,T,0,.02,.012,.03,.2,.03); add(f,GB,G,0,0,.016,.062,.11,.012); flat(f);}
      {const f=face(fa,sx*.015,-.1725,.1225,0,.136,.99); vent(f,0,.01,.11,.075); flat(f);}
      // fist: a dark palm block under a banded cuff (the band glows), four bevelled finger slabs across the knuckles, a thumb plate
      BX(sw,F,.21,.17,.21,0,.02,0,0,0,0,.02); add(sw,GR,T,0,-.05,0,.27,.055,.27); add(sw,GB,G,0,-.05,0,.28,.024,.1); add(sw,GB,G,0,-.05,0,.1,.024,.28);
      for(let k=0;k<4;k++)BX(sw,A,.2,.105,.047,0,.098,(k-1.5)*.053,0,0,0,.012); T2(BX(sw,A,.214,.026,.222,0,.05,0,0,0,0,.005)); BX(sw,A,.05,.13,.13,-sx*.127,.055,.02);
      // leg: a thigh that narrows from the hip to three quarters at the knee; a hinge knee under a grey cap; a shin that flares from
      // the knee to the ankle, a dark channel down its front; a wedge foot with a separate toe plate and a heel strut
      hinge(ul,F,F,0,0,0,.09,.1); add(ul,limb(.08,.065,L1),F); const th=L1-.12,sh=L2-.185;
      H(ul,[[-.01,rect(.3,.28,.05,0,.05)],[-.01-th,rect(.225,.21,.04,0,.04)]],A,.014,0,0,0,0,0,0,sx);
      {const f=face(ul,sx*.045,-.01-th/2,.1225,0,-.08,1); groove(f,-.125,.035,.125,.035); hatch(f,0,-.07,.12,.09); for(const x of [-.1,.1])bolt(f,x,th/2-.035,.004,0,0,1); flat(f);}
      {const f=face(ul,sx*.176,-.01-th/2,0,sx,-.1,0); vent(f,0,.03,.12,.08); flat(f);}
      hinge(ll,F,F,0,0,0,.088,.2); T2(BX(ll,A,.2,.17,.06,0,.005,.105,.1,0,0,.016)); add(ll,limb(.06,.05,L2),F);
      H(ll,[[-.11,rect(.2,.19,0,-.02,.03)],[-.11-sh,rect(.34,.34,0,.01,.055)]],A,.014);
      {const f=face(ll,0,-.11-sh/2,.1275,0,.24,.97); add(f,GB,R,0,0,.002,.07,sh*.84,.006); for(const y of [-.3,0,.3])add(f,GB,A,0,y*sh,.004,.066,.012,.008); for(const x of [-.07,.07])bolt(f,x,sh*.38,.004,0,0,1,.009); flat(f);}
      {const f=face(ll,sx*.135,-.11-sh/2,-.005,sx,.16,0); hatch(f,0,-.04,.13,.1); flat(f);}
      T2(BX(ll,A,.334,.03,.334,0,-.085-sh,.01,0,0,0,.006)); for(const k of [-1,1])rod(ll,F,k*.05,-.04,-.085,k*.06,-.1-sh,-.14,.014);
      H(ft,[[-.09,rect(.3,.38,0,.07)],[.012,[[.14,-.11],[.14,.11],[-.14,.11],[-.14,-.11]]]],A,.014); BX(ft,A,.27,.066,.13,0,-.052,.325); add(ft,HB,HZ,0,-.05,.391,.23,.03,.006); BX(ft,F,.28,.022,.54,0,-.079,.13,0,0,0,.008);
      rod(ft,F,0,-.01,-.07,0,-.066,-.21,.03); BX(ft,F,.16,.03,.09,0,-.075,-.22,0,0,0,.01); for(const x of [-.09,.09])bolt(ft,x,.014,.05,0,1,0);
    }
  }
  // Stalker: the elite, a lean assassin frame in violet-black, cut entirely from flat plates that meet on ridges. A broad chest of two
  // plates meeting on a keel at about 110 degrees, with a slit of light down the keel so its facing reads in a fight; a collar plate
  // behind the head; angular shoulder yokes with a spike; three dark lames for a waist over a pelvis wedge with flared hip plates;
  // four wing blades of diamond section on hinge arms from a hub on its back, in an X. Its limbs are ridged plates over twin struts:
  // wedge thighs, a knee spike, a shin that breaks backward to a hock like a reverse joint, heavy bladed vambraces that run on past
  // the elbow as a spur, a clipped blade on a bracket at each wrist. Pink only as thin lines and the eye.
  buildStalker(add,L,M){
    const {hips,chest,head}=this,{rod,hinge,struts,flat,S,SX,H,FD,blade}=this.K,A=M.armor,T=M.trim,F=M.frame,R=M.rubber,G=M.glow,HP=PI/2,L1=this.L1,L2=this.L2;
    this.body.scale.setScalar(1.12);   // it outranks the Husks, and stands taller than they do
    // it waits low and pitched forward, one foot leading, both blades held back and out behind its hips like folded wings, never
    // resting on the floor (the walk cycle of the idle clip still drives its feet)
    this.pose=(o,c)=>{if(c===CL.eIdle){o[I.hy]-=.1;o[I.hip]+=.06;o[I.hd]+=.14;o[I.fl+2]+=.2;o[I.fr+2]-=.14;const b=sin(this.t*2.6+this.seed)*.02;
      wr(o,AL([.55,-.62,-.56],.5,[.42,-.7,-.6]));wr(o,AR([-.55,-.62,-.56],.5,[-.42,-.7,-.6]));o[I.hl+1]-=b;o[I.hr+1]+=b;}};
    // outlines of ridged plates. kite: ridge at z = zf in front, flanks w either side at zs, back at zb. kx: the same turned to face
    // outward (ridge at x = xr, flanks at xs and z = +-w, back at xi), set back by cz
    const kite=(w,zf,zs,zb,cx=0)=>[[cx+w,zs],[cx,zf],[cx-w,zs],[cx,zb]],kx=(xr,xs,xi,w,cz=0)=>[[xr,cz],[xs,cz+w],[xi,cz],[xs,cz-w]];
    // pelvis: a wedge with its point down under a belt, a flared plate over each hip
    const CH=(y,w,zk,zs,zb)=>[y,[[w,zb],[w*1.06,zs],[0,zk],[-w*1.06,zs],[-w,zb],[0,zb-.022]]];
    add(hips,UC,T,0,.082,0,.086,.024,.07); H(hips,[CH(.07,.096,.094,.03,-.058),CH(-.05,.082,.092,.03,-.048),CH(-.2,.014,.056,.034,.03)],A,.006);
    for(const sx of [-1,1]){H(hips,[[.05,[[.02,-.06],[.03,.05],[-.012,.05],[-.012,-.06]]],[-.11,[[.052,-.09],[.064,.03],[.032,.03],[.022,-.09]]]],A,.006,.098,-.02,0,0,0,0,sx); hinge(hips,T,F,sx*.11,-.05,0,.036,.028);}
    // waist: three lames over a black core, each with a ridge in front and overlapping the next
    L(chest,[[-.03,.045,.04],[.07,.038,.034],[.17,.05,.044]],R);
    for(let k=0;k<3;k++){const y=.118-k*.042,w=.084-k*.006,o=(w,f)=>[[w*.55,-.05],[w,-.012],[w*.76,.04*f],[0,.062*f],[-w*.76,.04*f],[-w,-.012],[-w*.55,-.05]]; FD(chest,[[y,o(w,1)],[y-.047,o(w+.007,1.11)]],A,.008,.004);}
    // chest: one faceted hull, widest at the shoulders; the slit of light runs down its keel
    H(chest,[CH(.15,.05,.076,.03,-.03),CH(.3,.136,.13,.03,-.06),CH(.42,.168,.122,.02,-.078),CH(.49,.09,.076,.01,-.06)],A,.007);
    rod(chest,G,0,.19,.092,0,.3,.1315,.0034); rod(chest,G,0,.3,.1315,0,.41,.1245,.0034);
    H(chest,[[.47,rect(.17,.03,0,-.076)],[.575,[[.058,-.128],[.058,-.108],[-.058,-.108],[-.058,-.128]]]],A,.006);   // collar plate behind the head
    L(chest,[[.47,.034,.038],[.57,.03,.036,0,.014]],R);
    for(let k=0;k<4;k++)add(chest,GR,F,0,.13+k*.07,[-.07,-.09,-.1,-.106][k],.032,.05,.034);
    add(chest,UC,F,0,.36,-.108,.052,.05,.052,HP); add(chest,UC,T,0,.36,-.136,.03,.012,.03,HP);   // the hub the wings hinge on
    for(const sx of [-1,1]){
      // shoulder yoke: an angular block over the joint, a spike standing out and up from it with a line of light on its ridge
      H(chest,[[.385,[[.262,-.064],[.262,.04],[.12,.062],[.12,-.074]]],[.472,[[.212,-.05],[.212,.016],[.1,.036],[.1,-.062]]]],A,.006,0,0,0,0,0,0,sx);
      H(chest,[[0,kite(.05,.03,0,-.032)],[.05,kite(.046,.026,0,-.028)],[.2,kite(.004,.004,0,-.004)]],A,.005,.19,.44,-.012,0,0,-1.12,sx);
      {const g=new THREE.Group();g.position.set(sx*.19,.44,-.012);g.rotation.z=-sx*1.12;chest.add(g);rod(g,G,0,.04,.029,0,.185,.006,.003);flat(g);}
      hinge(chest,T,F,sx*.2,SHY,0,.036,.044);
      // wing blades: each on a hinge arm from the hub; a diamond section (a ridge 2.5 cm thick down the middle, a few millimetres at
      // the edges), its trailing side stepping out 30% of the way from the root; a line of light down that edge. The upper pair a fifth longer
      for(const [an,ln,rx] of [[.75,.66,-.6],[2.25,.54,.5]]){const w=new THREE.Group();w.position.set(sx*.05,.36,-.118);w.rotation.set(rx,0,-sx*an);chest.add(w);
        const WR=(y,a,b,t)=>[y+.075,[[a,0],[0,t/2],[-b,0],[0,-t/2]]];
        H(w,[WR(0,.022,.022,.02),WR(ln*.3-.004,.026,.028,.025),WR(ln*.3,.03,.054,.025),WR(ln*.72,.026,.04,.016),WR(ln,.003,.006,.003)],A,.005,0,0,0,0,0,0,sx);
        add(w,slab(.024,.11,.016,.008),F,0,.035,0); add(w,UC,T,0,.082,0,.016,.03,.016,HP); add(w,GB,G,-sx*.048,.075+ln*.51,0,.005,ln*.4,.009,0,0,-sx*.029/ln); flat(w);}
    }
    // head: a narrow wedge skull in two halves that meet on a ridge and leave a slot for the one vertical eye; a brow plate over it,
    // a long crest behind, mandible plates
    L(head,[[0,.035,.045],[.05,.054,.082,0,.01],[.1,.052,.104,0,-.02],[.14,.034,.094,0,-.07],[.165,.012,.05,0,-.14]],F,0,0,0,0,0,0,2.2,12);
    const SK=prow([[.02,.08,.072,-.03,.004],[.06,.098,.098,-.03,.004],[.108,.096,.12,-.03,-.02],[.148,.074,.108,-.03,-.07],[.172,.046,.058,-.03,-.14]],1.7,.016,0);
    add(head,GB,G,0,.078,.106,.016,.09,.012); add(head,plate([[0,0],[.34,.1],[.4,.16],[.05,.07]],.012,.004),A,0,.14,-.02,1,1,1,0,HP,0);
    add(head,plate([[-.05,.004],[0,.034],[.05,.004],[.034,-.02],[0,-.004],[-.034,-.02]],.014,.005),A,0,.132,.096,1,1,1,.55);
    for(const sx of [-1,1]){SX(sx,head,SK,-HP,HP,A,.01,0,0,0,0,0,0,1.7,10); add(head,plate([[-.014,.03],[.014,.03],[.008,-.1],[0,-.15]],.012,.004),T,sx*.046,.02,.08,1,1,1,.5,sx*.4,0);}
    for(let s=0;s<2;s++){const sx=s?-1:1,ua=this.arm[s],fa=this.fore[s],sw=this.sword[s],ul=this.leg[s],ll=this.shin[s],ft=this.foot[s];
      // arm: a slim ridged plate on the upper arm; on the forearm a heavy vambrace, 7 cm wide, that flares past the elbow into a spur
      struts(ua,F,T,-.02,-ARM1+.01,.02,.01,.011); H(ua,[[-.028,kx(.034,.014,.002,.022)],[-.09,kx(.058,.02,.002,.046)],[-.245,kx(.036,.012,.002,.028)]],A,.005,0,0,0,0,0,0,sx);
      hinge(fa,F,T,0,0,0,.03,.058); struts(fa,F,T,-.02,-ARM2+.02,.018,.009,.0095);
      H(fa,[[.12,kx(.04,.037,.034,.004,-.036)],[.03,kx(.056,.03,.012,.022,-.014)],[-.06,kx(.062,.024,.004,.036)],[-.2,kx(.046,.016,.002,.03)],[-.268,kx(.03,.012,.002,.02)]],A,.005,0,0,0,0,0,0,sx);
      add(fa,GB,G,sx*.059,-.11,0,.004,.15,.005,0,0,-sx*.1);
      // wrist blade on its bracket: tapering, clipped at the tip, honed along the cutting edge
      add(sw,GR,F,0,.03,0,.07,.06,.036); add(sw,GR,F,0,.11,0,.05,.12,.024); for(const y of [.07,.15])add(sw,UC,F,0,y,0,.008,.04,.008,HP);
      blade(sw,[[-.028,0],[.032,0],[.036,.3],[.026,.82],[-.01,.98],[-.03,.9]],[[.032,.04],[.036,.3],[.026,.82],[-.006,.97]],[[-.018,.1],[.006,.1],[.008,.6],[-.012,.8],[-.02,.6]],.06,.01);
      // leg: a wedge thigh, its ridge forward, 9 cm wide at the hip and 5 at the knee, the struts in view behind it; a knee spike; the
      // calf plate sweeps back to a hock with a hinge disc and a spur, the shin blade comes forward from it to the ankle
      struts(ul,F,T,-.03,-L1+.02,.019,.011,.012);
      H(ul,[[.01,kite(.036,.056,.02,-.02,sx*.006)],[-.06,kite(.06,.094,.03,-.03,sx*.006)],[-.24,kite(.044,.07,.02,-.022)],[-.4,kite(.03,.046,.012,-.008)]],A,.006);
      add(ul,GB,G,sx*.0535,-.15,.026,.004,.18,.005,0,0,-sx*.089);
      hinge(ll,F,T,0,0,0,.038,.084); H(ll,[[-.04,rect(.058,.014,0,.045)],[.03,rect(.046,.012,0,.054)],[.1,rect(.004,.003,0,.063)]],A,.005);
      struts(ll,F,T,-.03,-L2+.03,.014,.01,.0105);
      H(ll,[[-.035,kite(.034,-.05,-.018,.006)],[-.12,kite(.048,-.096,-.032,.004)],[-.205,kite(.036,-.122,-.056,-.012)],[-.25,kite(.012,-.092,-.064,-.03)]],A,.006);
      H(ll,[[0,rect(.034,.014)],[.05,rect(.026,.01)],[.13,rect(.003,.003)]],A,.004,0,-.2,-.112,-1.9);
      hinge(ll,F,T,0,-.21,-.062,.025,.062);
      H(ll,[[-.07,kite(.03,.04,.012,0)],[-.2,kite(.042,.058,.02,0)],[-.33,kite(.034,.046,.014,0)],[-.43,kite(.022,.03,.008,0)]],A,.006); add(ll,GB,G,sx*.0385,-.29,.017,.004,.17,.005,0,0,sx*.05);
      hinge(ft,F,F,0,0,0,.024,.056); H(ft,[[0,kite(.026,.024,.004,-.02)],[.07,kite(.034,.028,.004,-.022)],[.235,kite(.004,.006,.002,-.004)]],A,.005,0,-.02,-.012,1.875); add(ft,cone(.014,.11,5),F,0,-.045,-.05,1,1,1,PI+.6);
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
