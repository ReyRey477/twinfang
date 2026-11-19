// ===================== STORMVANE =====================
// Phase 1: circles the roof - orb volleys (slash them back), dive passes, a breath attack the pistol can interrupt.
// Phase 2: lands - wing sweeps, tail slam, bite; armoured until a charged maul hit or sustained damage pins it.
// Phase 3: perches on the spire shielded by two Lanterns while lightning falls, then alternates passes and landings.
// hull sections [z, half width, half height, y offset]: a long body with a deep keel under the chest, tapering to the tail
const SV_HULL=[[-3.3,.32,.3,.24],[-2.5,.74,.68,.1],[-1.2,1.16,1.1,-.02],[0,1.34,1.32,-.12],[.9,1.3,1.34,-.17],[1.7,.98,1.08,.02],[2.3,.58,.68,.28]];
// flight feathers of one wing: segment, root on the spar, fan angle (0 = straight back, + = towards the tip), size, how far it
// turns back along the body when the wing folds (fb), how much it bends against a wing beat (lg). They are broad enough to overlap
// their neighbours by a third or more, so the wing is a surface, and each carries two rows of coverts above it and one row hung
// below the spar's fairing (dn: how far it hangs out of the wing's plane), so there is feather to see from in front as well.
// They are near-black navy; every flight feather has a pale steel strip on its leading edge (edge), and the primaries and every
// third feather inboard of them a line of light; six primaries end in a small light (tip). md = how far a feather droops when the
// bird stands mantling on the ground, mf = how far it then fans away from its neighbours, so the mantled wing is a row of blades with
// gaps between their tips and not one dark block. Primaries alternate in length.
const SV_F=[],SV_m2=new THREE.Matrix4(),SV_m3=new THREE.Matrix4(),SV_EDGE=mergeGeometries([new THREE.BoxGeometry(.15,1.5,.82).translate(.428,0,.5),new THREE.BoxGeometry(.05,1.3,.6).translate(-.475,0,.52)],false),SV_TIP=new THREE.BoxGeometry(.34,1.9,.07).translate(.27,0,.925);
{const add=(s,x,z,psi,len,w,fb,lg,glow,mf=0,tip=false,md=[0,.45,.85,1.25][s])=>SV_F.push({s,x,y:-.02,z,psi,len,w,fb,lg,glow,dn:0,md,mf,tip,edge:true,col:0x56638f},{s,x:x-.16,y:.1,z:z+.1,psi:psi-.04,len:len*.5,w:w*.95,fb,lg:lg*.4,glow:false,dn:0,md:md*.6,mf,col:0x46527a},
    {s,x:x-.3,y:.2,z:z+.18,psi:psi-.07,len:len*.25,w:w*.9,fb,lg:lg*.2,glow:false,dn:0,md:md*.3,mf,col:0x6875a0},{s,x:x-.06,y:-.2,z:z+.06,psi:psi-.03,len:len*.34,w:w*.98,fb,lg:lg*.3,glow:false,dn:.75,md:md*.4,mf,col:0x4c5882});
  for(let k=0;k<5;k++)add(1,.75+k*.58,-.2,-.12+k*.05,2.3+k*.16,1.15,.35,.02,k%3===1);
  for(let k=0;k<6;k++)add(2,.35+k*.55,-.16,.1+k*.045,3.1+k*.14,1.15,.7,.03,k%3===1,(k-2.5)*.035);
  for(let k=0;k<7;k++)add(3,.15+k*.36,-.1,.36+k*.15,(4.3+sin(k/6*PI)*1)*(k%2?.9:1),1-k*.03,1,.045,true,(k-2)*.075,k>0);}
// leg joint angles (hip, knee, ankle, foot; negative = forward) for each stance
const SV_LEG={stand:[-.87,1.57,-1.05,.35],crouch:[-1.25,2.45,-1.4,.2],tuck:[-1.9,2.8,-1.8,1.8],strike:[-1.5,1,-.4,.3],lift:[-.45,.5,-.2,.25]};
class Stormvane{
  constructor(enc){
    this.kind='storm';this.boss=true;this.name='STORMVANE';this.B=true;this.S=false;this.scale=1;this.radius=3;this.hp=this.maxHp=2200;
    this.gy=enc.gy;this.ar=enc.ar;this.C=V(0,enc.gy,304);
    const pp=G.player.pos,a0=atan2(-pp.x,304-pp.z);this.pos=V(sin(a0)*22,enc.gy+16,304+cos(a0)*22);this.vel=V();this.yaw=a0+PI/2;this.pitch=0;this.roll=0;this.state='intro';this.t=0;this.phase=1;this.th=a0;this.ph=0;
    this.armor=0;this.maxArmor=220;this.cd=2.5;this.atk=0;this.gun=0;this.orbN=0;this.fired=0;this.flash=0;this.dead=false;this.gone=false;this.dodged=false;this.struck=false;this.shield=null;
    this.boltCd=2;this.groundT=0;this.passes=0;this.pinned=false;this.side=0;this.stunT=0;this.rec=1;this.shieldOn=false;this.marked=false;
    this.ls=V();this.ld=V();this.lt=0;this.spot=V();
    this.J={wrL:.1,wrR:.1,we:0,wf:0,wsL:0,wsR:0,np:0,hp:0,tp:0,jw:0,lg:1};this.T=Object.assign({},this.J);
    this.build();
  }
  // A mechanical raptor: dark frame, armour shells laid over it like scales, bright steel beak, talons and joints, and blade
  // feathers. The flight feathers are instances placed every frame (see feathers()), so they fan, stack and lag behind the wing.
  build(){
    // dark forged steel all over, rough enough that the highlights on chest and head stay below white; a cold rim light from
    // above (storm light) draws its outline against the night sky and the wet roof
    // Navy feathers and dark hull plates, pale steel on beak and leading edges, brass in the joints: three values, so the bird has
    // contrast of its own and does not melt into the floor it stands on. Against its own night sky it is drawn by light: the pale
    // leading-edge strips glow faintly, six primaries carry a tip light, the eyes burn, and the rim light from above is strong.
    // Plates wear pale along their edges (the bird is ten times a Husk, so the wear reaches further).
    const RIM={rim:0x9fc8ff,rimK:.85},iron=this.iron=charMat('iron',{vertexColors:true,roughness:1.5,emissive:0x9fc8ff,emissiveIntensity:0,envMapIntensity:.8,wear:0xc4cee0,wearK:18,...RIM}),
      trim=charMat('steel',{color:0x98a1b2,roughness:2.2,envMapIntensity:.9,...RIM}),frame=charMat('frame',{color:0x8a90a0,roughness:1.5,envMapIntensity:.7,...RIM}),
      brass=charMat('steel',{color:0xb08a40,metalness:.6,roughness:1.9,envMapIntensity:.7,hold:.7,...RIM}),
      fmat=charMat('steel',{metalness:.6,roughness:1.7,envMapIntensity:.9,wear:0xc4cee0,wearK:18,...RIM}),emat=charMat('steel',{color:0xb9c4d8,roughness:1.6,envMapIntensity:1,emissive:0x8fd0ff,emissiveIntensity:.8,...RIM}),glass=new THREE.MeshBasicMaterial({color:hdr(0x8fd0ff,1.4)});
    this.eyeM=new THREE.MeshBasicMaterial({color:hdr(0xbfe6ff,1.8)});   // eye lenses and the seam of the gape: about twice the reactor's idle level, flaring with a tell (see pose)
    this.coreM=new THREE.MeshBasicMaterial({color:hdr(0x4f9cff,.85)});
    const root=this.root=new THREE.Group(); root.rotation.order='YXZ'; scene.add(root);
    const K=LN_kit(),DK=0x3c455e,MD=0x5c6682,PL=0xb2bac9,M=LN_M;
    const ir=(par,geo,col,x,y,z,sx,sy,sz,rx,ry,rz)=>K.add(par,geo,iron,x,y,z,sx,sy,sz,rx,ry,rz,col),ir2=(par,geo,col,x,y,z,sx,sy,sz,rx,ry,rz)=>K.pair(par,geo,iron,x,y,z,sx,sy,sz,rx,ry,rz,col);
    const grp=(par,x=0,y=0,z=0)=>{const g=new THREE.Group();g.position.set(x,y,z);par.add(g);return g;};
    const blade=(par,mat,col,p,d,w,len,u=[0,1,0],th=.05)=>K.put(par,LN_BLADE,mat,LN_aim(M,p[0],p[1],p[2],d[0],d[1],d[2],u[0],u[1],u[2],w,th,len),col);
    // ---- body: hull, five dorsal shells with a swept-back point, flank shells, a fin on each, reactor cage under the chest
    const hp=(a,z,off,o)=>{const [w,h,yo]=LN_sec(SV_HULL,z);return o.set(cos(a)*(w+off),yo+sin(a)*(h+off),z);};
    K.add(root,LN_loft(SV_HULL,16),frame);
    for(let k=0;k<6;k++){const z1=2.15-k*.92;
      ir(root,LN_shell((u,v,o)=>hp(2.78-u*2.42,z1-v*(1.2+(1-pow(abs(2*u-1),2))*.5),.05+.11*v,o),10,5,.05),k===0?PL:k%2?DK:MD);
      const zf=z1-.75,[,h,yo]=LN_sec(SV_HULL,zf),s=1.15-k*.13;
      ir(root,LN_plate([[.4,0],[-.4,0],[-.85,.55],[-.5,.44]],.07,.02),k%2?PL:MD,0,yo+h+.1,zf,s,s,1,0,-PI/2,0);}
    ir2(root,LN_shell((u,v,o)=>hp(-.8+v*1.15,1.55-u*1.45-v*.3,.05,o),6,5,.05),DK);
    ir2(root,LN_shell((u,v,o)=>hp(-.7+v*1.05,-.05-u*1.7-v*.35,.05+.06*u,o),6,5,.05),MD);
    // the reactor sits up inside the keel behind a cage of dark bars and ring frames: a lamp seen through a grille, not a bare bulb
    K.span(root,LN_UZ,frame,[0,-1.52,.5],[0,-1.02,2.2],.085); for(const s of [-1,1]){K.span(root,LN_UZ,frame,[s*.33,-1.46,.55],[s*.27,-.96,2.18],.075);K.span(root,LN_UZ,frame,[s*.66,-1.3,.6],[s*.52,-.84,2.15],.065);}
    [[.75,1.1],[1.1,1.08],[1.45,.98],[1.8,.84]].forEach(([z,R])=>K.add(root,LN_tor(R,.06,2.44,10),trim,0,-.5,z,1,1,1,0,0,3.49));
    K.pair(root,LN_SPH,brass,1.2,.55,.5,.5,.44,.5); K.pair(root,LN_SPH,frame,1.16,-.5,-.1,.6,.6,.64);
    K.pair(root,LN_tube([[.5,.86,1.9],[.86,1.18,1.2],[1.04,1.06,.7]],.05,5),frame); K.pair(root,LN_tube([[.3,-.5,2.3],[.55,-.2,2.6],[.4,.1,2.9]],.045,5),frame);
    for(let k=-5;k<=5;k++){const a=PI/2+k*.3;blade(root,iron,k%2?DK:MD,[cos(a)*.62,.42+sin(a)*.62,2.4],[cos(a)*.5,sin(a)*.5,-1],.58,1.55-abs(k)*.06,[cos(a),sin(a),0]);}   // a ruff of broad plates from the neck back over the shoulders
    this.core=new THREE.Mesh(GS,this.coreM); this.core.position.set(0,-.8,1.3); root.add(this.core);
    // ---- neck (two segments of overlapping collars) and head
    const hackle=(par,S,z,len,c0,c1,n=11)=>{const [w,h]=LN_sec(S,z);for(let k=0;k<n;k++){const a=-.55+k*(PI+1.1)/(n-1);blade(par,iron,k%2?c0:c1,[cos(a)*(w+.02),sin(a)*(h+.02),z],[cos(a)*.42,sin(a)*.42,-1],.34,len,[cos(a),sin(a),0]);}};
    const N1=[[-.2,.5,.52],[.7,.38,.4],[1.6,.32,.34]],N2=[[-.1,.33,.35],[1.25,.27,.29]];
    const n1=this.n1=grp(root,0,.4,2.1); K.add(n1,LN_loft(N1,12),frame); [[1.5,.75],[1.05,.8],[.6,.86],[.15,.92]].forEach(([z,l],i)=>hackle(n1,N1,z,l,DK,i%2?MD:DK));
    for(const s of [-1,1])K.span(n1,LN_UZ,trim,[s*.2,-.4,0],[s*.15,-.3,1.5],.045);
    const n2=this.n2=grp(n1,0,0,1.5); K.add(n2,LN_loft(N2,12),frame); [[1.15,.6],[.7,.68],[.28,.72]].forEach(([z,l],i)=>hackle(n2,N2,z,l,i?DK:PL,MD));
    for(const s of [-1,1])K.span(n2,LN_UZ,trim,[s*.14,-.31,0],[s*.12,-.27,1.2],.04);
    const hd=this.hd=grp(n2,0,0,1.2),BK=[[.7,.36,.3,.04,0,1.7],[1.1,.3,.26,.02,0,1.7],[1.5,.21,.2,-.03,0,1.6],[1.85,.12,.14,-.13,0,1.5],[2.1,.055,.085,-.3,0,1.5],[2.22,.012,.02,-.47,0,1.5]];
    K.add(hd,GS,frame,0,.06,.3,.4,.38,.62);
    ir(hd,LN_shell((u,v,o)=>{const la=(u-.5)*2.3,lo=.02+v*2.75;return o.set(sin(la)*.45,.08+cos(la)*sin(lo)*.43,.3+cos(la)*cos(lo)*.72);},10,10,.045),DK);
    ir2(hd,LN_plate([[-.1,-.02],[.62,.02],[.66,.1],[.1,.2],[-.12,.12]],.09,.02),PL,.3,.25,.4,1,1,1,0,-PI/2,-.22);
    K.pair(hd,GS,this.eyeM,.31,.14,.68,.13,.1,.18); K.pair(hd,LN_tor(.15,.035,TAU,12,4),frame,.36,.14,.68,1,1,1,0,PI/2-.25,0);
    // the beak is a darker steel worn pale along its cutting edge and over its last hand's breadth
    {const bk=LN_loft(BK,10),p=bk.attributes.position,w=new Float32Array(p.count*4);for(let i=0;i<p.count;i++){const z=p.getZ(i),[,h,yo]=LN_sec(BK,z);w[i*4]=min(WB,max(0,p.getY(i)-yo+h)*.5)-WB;w[i*4+1]=min(WB,(2.22-z)*.12)-WB;w[i*4+3]=1;}
      bk.setAttribute('aW',new THREE.BufferAttribute(w,4));ir(hd,bk,0x8791a8);}
    // the upper beak reads as two plates: a dark seam along each flank, and a brow ridge shading each eye
    for(let i=0;i<4;i++){const a=BK[i],b=BK[i+1];for(const s of [-1,1]){K.span(hd,LN_UZ,frame,[s*a[1]*.97,a[3]+a[2]*.34,a[0]],[s*b[1]*.97,b[3]+b[2]*.34,b[0]],.02);
      if(i<3)K.span(hd,LN_UZ,this.eyeM,[s*a[1]*.9,a[3]-a[2]*.86,a[0]],[s*b[1]*.9,b[3]-b[2]*.86,b[0]],.016);}}   // (and a thin seam of light along the gape)
    ir2(hd,LN_plate([[-.26,0],[.2,-.02],[.3,.07],[-.2,.12]],.1,.024),DK,.33,.26,.6,1,1,1,-.25,-PI/2+.16,0);
    ir(hd,LN_shell((u,v,o)=>{const z=.66+u*.52,[w,h,yo]=LN_sec(BK,z),a=2.75-v*2.36;return o.set(cos(a)*(w+.03),yo+sin(a)*(h+.03),z);},3,8,.03),DK);
    K.add(hd,GS,glass,0,-.12,.85,.15,.08,.32);
    for(let k=-2;k<=2;k++)blade(hd,k?iron:trim,k%2?MD:PL,[k*.12,.42-abs(k)*.04,.02],[k*.14,.42-abs(k)*.08,-1],.28,1.55-abs(k)*.25);
    ir2(hd,LN_plate([[-.3,.12],[.25,.16],[.42,-.02],[.1,-.2],[-.26,-.1]],.05,.014),MD,.42,-.02,.3,1,1,1,0,-PI/2+.12,0);
    const jaw=this.jaw=grp(hd,0,-.22,.5);
    ir(jaw,LN_loft([[0,.3,.1,0,0,1.7],[.6,.24,.08,-.02,0,1.7],[1.1,.12,.06,0,0,1.6],[1.42,.015,.02,.07,0,1.5]],8),PL); K.pair(jaw,LN_cyl(.13,.13,.1,10),trim,.33,.02,0,1,1,1,0,0,PI/2);
    // ---- wings: three segments each. Built once for the left side; the right wing shows the same meshes mirrored.
    const S1=[[0,.4,.3],[.6,.36,.27],[3.2,.27,.2]],S2=[[0,.3,.22],[3.3,.2,.16]],S3=[[0,.23,.17],[1.6,.12,.1],[2.4,.035,.04]];   // spars: thick arms, not booms
    // fair: the arm is buried in a blade about 2.4 times as broad as it is deep, built from three overlapping lames a segment. Each is
    // a folded plate (see fold in 07-rig: belly, lower nose, upper nose and a long top plate that runs back over the feather roots),
    // a step smaller than the one inboard of it, so the blade narrows by 40% from shoulder to wrist; a pale strip is folded over the
    // nose of each. Side-on and from in front the wing is stepped plate with a pale edge, and no tube shows.
    // cov: a row of short covert plates along the top of a segment, overlapping the trailing edge of its fairing and each other.
    const FM=new THREE.Matrix4().makeBasis(V(0,0,1),V(1,0,0),V(0,1,0));   // fold's outline x, ring y, outline z -> the wing's chord (forward), span, up
    const fair=(par,x0,x1,f0,f1,col)=>{const sec=(f,o=0)=>[[-.62*f,-.36*f-o],[.36*f+o,-.36*f-o],[.66*f+o,-.02*f],[.3*f+o,.36*f+o],[-1.1*f,.2*f+o]];
      const nose=f=>{const q=sec(f,.014),m=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k];return [m(q[2],q[1],.3),q[2],m(q[2],q[3],.26)];};
      K.put(par,fold([[x0,sec(f0)],[x1,sec(f1)]],.05,.02),iron,FM,col); K.put(par,fold([[x0+.05,nose(f0)],[x1-.05,nose(f1)]],.03,0),emat,FM);};
    const cov=(par,x0,x1,n,f0,f1)=>{for(let k=0;k<n;k++){const u=k/(n-1),x=lerp(x0,x1,u),f=lerp(f0,f1,u);blade(par,iron,k%3===0?PL:k%2?DK:MD,[x,.2*f+.05,-.72*f],[.14,-.12,-1],.62*f+.12,(1+.25*(k%2))*f+.25,[.1,1,-.1],.06);}};
    const hub=(par,x,r)=>{K.add(par,LN_cyl(r*.8,r*.8,.24,16),brass,x,-.4,0);ir(par,LN_cyl(r*.56,r*.64,.34,16),DK,x,-.4,0);K.add(par,LN_cyl(r*.3,r*.3,.42,10),frame,x,-.4,0);K.add(par,LN_tor(r*.4,.035,TAU,18,4),glass,x,-.58,0,1,1,1,PI/2,0,0);};   // disc joint, set low: it shows under the fairing as a half-arc of brass
    this.wing=[];
    for(const sx of [1,-1]){
      const g0=grp(root,sx*1.12,.55,.5); g0.scale.x=sx; const s1=grp(g0),s2=grp(s1,3.2),s3=grp(s2,3.3);
      if(sx>0){
        K.add(s1,LN_loft(S1,10),frame,0,0,0,1,1,1,0,PI/2,0); fair(s1,.3,1.3,1,.97,DK); fair(s1,1.15,2.2,.94,.91,MD); fair(s1,2.05,3.05,.88,.85,DK); cov(s1,.45,2.95,8,1,.86);
        K.span(s1,LN_UZ,trim,[.5,-.46,-.1],[2.75,-.36,-.1],.06); K.span(s1,LN_UZ,frame,[.5,-.46,-.1],[1.6,-.41,-.1],.1); hub(s1,.42,.6); hub(s1,3.2,.56);
        K.add(s2,LN_loft(S2,10),frame,0,0,0,1,1,1,0,PI/2,0); fair(s2,.35,1.35,.82,.79,MD); fair(s2,1.2,2.3,.76,.74,DK); fair(s2,2.15,3.15,.71,.68,MD); cov(s2,.4,3.05,8,.82,.69);
        K.span(s2,LN_UZ,trim,[.55,-.36,-.08],[2.85,-.3,-.08],.05); K.span(s2,LN_UZ,frame,[.55,-.36,-.08],[1.7,-.33,-.08],.085); hub(s2,3.3,.46);
        K.add(s3,LN_loft(S3,8),frame,0,0,0,1,1,1,0,PI/2,0); fair(s3,.3,1.1,.64,.56,DK); fair(s3,.95,1.75,.53,.42,MD); fair(s3,1.6,2.3,.4,.26,DK); cov(s3,.35,1.9,5,.62,.36);
        K.add(s3,LN_loft([[0,.07,.07],[.5,.035,.04,.04],[.72,.004,.005,.12]],6),trim,.12,0,.2,1,1,1,0,.5,0);
        K.flush(); this.wparts=[s1,s2,s3].map(g=>g.children.filter(o=>o.isMesh));
      }else [s1,s2,s3].forEach((g,i)=>{for(const m of this.wparts[i])g.add(m.clone());});
      const fm=new THREE.InstancedMesh(LN_BLADE,fmat,SV_F.length),gm=new THREE.InstancedMesh(LN_STRIP,glass,SV_F.filter(f=>f.glow).length),em=new THREE.InstancedMesh(SV_EDGE,emat,SV_F.filter(f=>f.edge).length),tm=new THREE.InstancedMesh(SV_TIP,glass,SV_F.filter(f=>f.tip).length);
      fm.frustumCulled=gm.frustumCulled=em.frustumCulled=tm.frustumCulled=false;fm.castShadow=true;SV_F.forEach((f,i)=>fm.setColorAt(i,LN_C.set(f.col)));g0.add(fm,gm,em,tm);
      this.wing.push({s1,s2,s3,fm,gm,em,tm,pwr:.1,lag:0});
    }
    // ---- tail: two segments, a hub, and a fan of blades that spreads on the ground and narrows in a dive
    const T1=[[0,.42,.36],[.95,.3,.24]],T2=[[0,.3,.24],[.85,.22,.16]];
    const tl=this.tail=grp(root,0,.16,-3.05),t2=this.t2=grp(tl,0,0,-.9),t3=this.t3=grp(t2,0,0,-.8);
    K.add(tl,LN_loft(T1,10),frame,0,0,0,1,1,1,0,PI,0); K.add(t2,LN_loft(T2,10),frame,0,0,0,1,1,1,0,PI,0);
    ir(tl,LN_shell((u,v,o)=>{const z=.05+v*.75,[w,h]=LN_sec(T1,z),a=2.9-u*2.66,f=.04+.07*v;return o.set(cos(a)*(w+f),sin(a)*(h+f),-z);},8,3,.04),DK);
    ir(t2,LN_shell((u,v,o)=>{const z=.02+v*.7,[w,h]=LN_sec(T2,z),a=2.9-u*2.66,f=.04+.07*v;return o.set(cos(a)*(w+f),sin(a)*(h+f),-z);},8,3,.04),MD);
    for(const s of [-1,1]){K.span(tl,LN_UZ,trim,[s*.34,-.05,-.05],[s*.27,-.03,-.9],.04);K.span(t2,LN_UZ,trim,[s*.25,-.03,0],[s*.2,-.02,-.8],.035);}
    K.add(t3,LN_cyl(.42,.42,.16,14),brass,0,0,-.1); ir(t3,LN_cyl(.3,.34,.22,14),DK,0,0,-.1); for(const s of [-1,1])K.add(t3,LN_tor(.19,.03,TAU,18,4),glass,0,s*.12,-.1,1,1,1,PI/2,0,0);
    // seven long plates in the same dark steel as the wings, a thin line of light on each
    const tf=this.tfm=new THREE.InstancedMesh(LN_BLADE,fmat,7),tg=this.tgm=new THREE.InstancedMesh(LN_STRIP,glass,7); tf.frustumCulled=tg.frustumCulled=false;tf.castShadow=true;
    for(let i=0;i<7;i++)tf.setColorAt(i,LN_C.set(i%2?0x4a5680:0x5a678f)); t3.add(tf,tg); this.tsp=.7;
    // ---- legs: thigh, shank, tarsus, foot with three toes and a hallux. Posed in pose(): planted, crouched, tucked or striking
    this.leg=[];
    for(const sx of [1,-1]){
      const a=grp(root,sx*1.18,-.5,-.1); a.scale.x=sx; const b=grp(a,0,-.7,0),c=grp(b,0,-.8,0),f=grp(c,0,-.5,0);
      if(sx>0){
        // thigh housing: a heavy shell over the frame with a piston behind it, plated like the wings
        const TH=[[0,.58,.66],[.7,.3,.34]];K.add(a,LN_loft(TH,10),frame,0,0,0,1,1,1,PI/2,0,0); K.span(a,LN_UZ,trim,[0,-.08,-.62],[0,-.7,-.28],.06); K.span(a,LN_UZ,frame,[0,-.08,-.62],[0,-.4,-.45],.1);
        ir(a,LN_shell((u,v,o)=>{const t=.02+u*.56,[w,h]=LN_sec(TH,t),an=2.1-v*3.2;return o.set(cos(an)*(w+.05),-t,sin(an)*(h+.05));},4,8,.05),DK);
        for(let k=0;k<5;k++){const an=-.6+k*.75;blade(a,iron,k%2?MD:DK,[cos(an)*.54,-.3,sin(an)*.6],[cos(an)*.2,-1,sin(an)*.2-.25],.56,1,[cos(an),.2,sin(an)]);}
        K.add(b,LN_cyl(.25,.25,.36,12),brass,0,0,0,1,1,1,0,0,PI/2); K.add(b,LN_loft([[0,.16,.2],[.8,.11,.13]],8),frame,0,0,0,1,1,1,PI/2,0,0); K.span(b,LN_UZ,trim,[0,-.05,-.21],[0,-.72,-.14],.05);
        ir(b,LN_shell((u,v,o)=>{const t=.1+u*.5,an=2.64-v*2.14;return o.set(cos(an)*(.2-.06*u),-t,sin(an)*(.24-.07*u));},3,6,.04),MD);
        // tarsus: twin struts and a piston between two brass joints
        K.add(c,LN_cyl(.18,.18,.3,12),brass,0,0,0,1,1,1,0,0,PI/2); for(const s of [-1,1])K.span(c,LN_UZ,frame,[s*.1,0,.02],[s*.085,-.5,.02],.05); K.span(c,LN_UZ,trim,[0,-.04,-.1],[0,-.47,-.08],.036);
        ir(c,LN_plate([[-.13,.09],[.13,.09],[.09,-.09],[0,-.15],[-.09,-.09]],.04,.012),MD,0,-.16,.09,1,1,1,-.12);
        K.add(f,LN_SPH,frame,0,-.02,0,.28,.16,.3); K.add(f,LN_cyl(.18,.18,.36,10),brass,0,0,0,1,1,1,0,0,PI/2);
        const claw=LN_loft([[0,.065,.075,0],[.14,.055,.065,-.015],[.27,.03,.04,-.07],[.36,.006,.008,-.16]],6);
        for(const [yw,l] of [[-.5,.9],[0,1],[.5,.9],[PI,.62]]){const dx=sin(yw),dz=cos(yw),b0=[dx*.2,-.03,dz*.2],p1=[dx*(.2+.58*l),.02,dz*(.2+.58*l)],p2=[dx*(.2+1.02*l),-.05,dz*(.2+1.02*l)];
          K.span(f,LN_UZT,frame,b0,p1,.13,.115); K.span(f,LN_UZT,frame,p1,p2,.1,.09); K.add(f,LN_SPH,brass,p1[0],p1[1],p1[2],.12,.12,.12);
          K.put(f,claw,trim,LN_aim(M,p2[0],p2[1]+.02,p2[2],dx,-.1,dz,0,1,0,2.1,2.1,yw===PI?2.3:2));}
        K.flush(); this.lparts=[a,b,c,f].map(g=>g.children.filter(o=>o.isMesh));
      }else [a,b,c,f].forEach((g,i)=>{for(const m of this.lparts[i])g.add(m.clone());});
      this.leg.push({a,b,c,f});
    }
    K.flush(); this.pp=this.pos.clone(); this.walk=0; this.pose(0,true,0,0,9,2.5);
  }
  get ghost(){return this.state==='intro'||this.state==='shift'||this.state==='toperch';}
  get air(){return true;}
  get grounded(){const s=this.state;return s==='gidle'||s==='wsw'||s==='wsws'||s==='tail'||s==='tails'||s==='bite'||s==='bites'||s==='grec'||s==='stun';}
  solid(){return this.grounded?3.1:0;}
  cy(){return this.pos.y;}
  hitPos(o,ux,uz){return o.set(this.pos.x-ux*2.2,this.pos.y+rand(-.7,.9),this.pos.z-uz*2.2);}
  remove(){scene.remove(this.root);const mats=new Set();this.root.traverse(o=>{if(!o.isMesh)return;mats.add(o.material);if(o.isInstancedMesh)o.dispose();else if(o.geometry!==GS)o.geometry.dispose();});for(const m of mats)m.dispose();}
  mult(){return this.state==='stun'?1.5:(this.phase===2&&this.armor>0&&this.grounded?.35:1);}
  go(s){this.state=s;this.t=0;this.struck=false;this.dodged=false;this.gun=0;this.fired=0;this.marked=false;}
  ping(){fx.flares.spawn(this.pos,0x9fd0ff,3,.15,.5,.5,4,.04,rand(3));}
  takeHit(h){
    if(this.dead||this.ghost)return;if(this.shieldOn)return this.ping();
    this.hp-=h.dmg*this.mult();this.flash=1;
    if(this.phase===2&&this.armor>0&&this.grounded&&this.state!=='stun'){this.armor-=h.dmg*(h.maul?2.5:1);if(h.breaker)this.armor=0;
      if(this.armor<=0){this.armor=0;this.pinned=true;this.stunT=6;this.go('stun');G.onBreak(this);}}
    if(this.hp<=0)this.die();
  }
  gunHit(){
    if(this.dead||this.ghost)return false;if(this.shieldOn){this.ping();return true;}
    this.hp-=2*this.mult();this.flash=max(this.flash,.45);if(this.hp<=0){this.die();return true;}
    if(this.state==='breath'&&++this.gun>=8)this.crash();
    return true;
  }
  orbHit(){
    if(this.dead||this.shieldOn)return;this.hp-=60;this.flash=1;fx.hit(this.pos,0,0,true,null);cam.shake(.3);G.addStyle('ORB',30);
    if(this.hp<=0)return this.die();
    if(this.phase===1&&++this.orbN%3===0&&(this.state==='circle'||this.state==='volley'))this.crash();
  }
  onPerfect(){const s=this.state;if(!this.dead&&(s==='wsws'||s==='tails'||s==='bites'||s==='wsw'||s==='tail'||s==='bite')){this.stunT=2.2;this.go('stun');G.onBreak(this);}}
  crash(){this.stunT=5;this.vel.set(0,0,0);this.go('fall');const P=this.pos,C=this.C,ar=this.ar;let x=clamp(P.x,ar.x0+3,ar.x1-3),z=clamp(P.z,ar.z0+3,ar.z1-3);
    const d=hypot(x-C.x,z-C.z);if(d<7){const a=d>.1?atan2(x-C.x,z-C.z):0;x=C.x+sin(a)*7;z=C.z+cos(a)*7;}this.spot.set(x,this.gy+2.1,z);sfx.roar();G.onBreak(this);}
  die(){this.dead=true;this.hp=0;this.shieldOn=false;this.go('dead');G.onKill(this);}
  head(o){this.hd.updateWorldMatrix(true,false);return o.set(0,0,1.6).applyMatrix4(this.hd.matrixWorld);}
  landFx(big){const P=this.pos,gy=this.gy;fx.slam(P.x,gy,P.z,big?10:7,0x9fc8ff,true);cam.shake(big?.8:.5);sfx.land(1);if(big)sfx.hit(1);}
  flyTo(x,y,z,k,dt,faceMove=true){const P=this.pos,ox=P.x,oz=P.z;P.x=damp(P.x,x,k,dt);P.y=damp(P.y,y,k,dt);P.z=damp(P.z,z,k,dt);
    const vx=P.x-ox,vz=P.z-oz;if(faceMove&&hypot(vx,vz)>.02)this.yaw=turnTo(this.yaw,atan2(vx,vz),4*dt);}
  update(dt){
    const pl=G.player,P=this.pos,gy=this.gy,C=this.C,ar=this.ar,T=this.T;
    const dx=pl.pos.x-P.x,dz=pl.pos.z-P.z,dist=hypot(dx,dz),toP=atan2(dx,dz),py=pl.pos.y-gy;
    this.t+=dt;this.cd-=dt;this.flash=max(0,this.flash-dt*4);this.ph+=dt*7.2;const S=this.state,t=this.t,live=G.state==='play'&&pl.state!=='dead';
    let flap=true,tp=0,tr=0,kJ=9,coreK=2.5,gY=gy+2.1;
    T.wsL=T.wsR=0;T.np=.15;T.hp=0;T.tp=-.1;T.wf=.1;T.we=-.15;
    const want=this.hp>this.maxHp*.66?1:this.hp>this.maxHp*.33?2:3;
    if(!this.dead&&want>this.phase&&(S==='circle'||S==='volley'||S==='stun'||S==='gidle'||S==='grec')){this.phase=want;this.pinned=false;this.go('shift');sfx.roar();cam.shake(.6);G.storm.flash=1;sfx.thunder(1);fx.phase(P.x,gy,P.z,0x9fc8ff,0x6a7486,2.4,18,P.y);fx.bolt(P.x,gy,P.z,true);
      G.msg('',want===2?'IT COMES DOWN':'THE STORM ANSWERS',2.2);return this.pose(dt,true,0,0,9,4);}
    if(this.phase===3&&!this.dead&&live&&S!=='shift'&&S!=='toperch'){this.boltCd-=dt;if(this.boltCd<=0){this.boltCd=S==='perch'?1:2.1;
      G.strike(clamp(pl.pos.x+pl.vel.x*.35,ar.x0,ar.x1),clamp(pl.pos.z+pl.vel.z*.35,ar.z0,ar.z1),gy,.9,3.2,16,this);}}
    const circle=()=>{this.th+=.78*dt;this.flyTo(C.x+sin(this.th)*24,gy+10+sin(G.rt*.8)*.8,C.z+cos(this.th)*24,3.7,dt,false);this.yaw=turnTo(this.yaw,this.th+PI/2,4.8*dt);tr=.45;};
    if(S==='intro'){this.th+=1.25*dt;this.flyTo(C.x+sin(this.th)*22,gy+lerp(16,10,smooth(sat(t/4.6))),C.z+cos(this.th)*22,6,dt,false);this.yaw=turnTo(this.yaw,this.th+PI/2,6*dt);tr=.5;
      if(!this.marked&&t>.4){this.marked=true;sfx.roar();sfx.thunder(.8);G.storm.flash=1;}
      if(t>4.6){this.go('circle');this.cd=1.2;}}
    else if(S==='circle'){circle();
      if(this.cd<=0&&live){const a=this.atk++%4;this.go(a===1?'dpre':a===3?'breath':'volley');if(a===1)this.passes=1;}}
    else if(S==='volley'){circle();T.np=.4;
      if(this.fired<4&&t>=.5+this.fired*.45){this.fired++;this.head(_b);orbs.spawn(_b.x,_b.y,_b.z,pl.pos.x-_b.x,pl.pos.y+1-_b.y,pl.pos.z-_b.z,this,8.4);}
      if(t>=3){this.go('circle');this.cd=2.6;}}
    else if(S==='dpre'){
      const dur=this.phase===3?.8:1.1;
      if(!this.marked){this.marked=true;let ux=dx/(dist||1),uz=dz/(dist||1);if(dist<2){ux=sin(this.yaw);uz=cos(this.yaw);}
        this.ld.set(ux,0,uz);this.ls.set(pl.pos.x-ux*32,gy+7,pl.pos.z-uz*32);fx.line(pl.pos.x,gy,pl.pos.z,atan2(ux,uz),64,13.6,dur);fx.warn(this,1,dur,0);sfx.telegraph(true);}
      this.flyTo(this.ls.x,this.ls.y,this.ls.z,5.3,dt,false);this.yaw=turnTo(this.yaw,atan2(this.ld.x,this.ld.z),5*dt);tp=.25;
      if(t>=dur){this.go('dpass');this.lt=0;P.copy(this.ls);sfx.whoosh(.4,2);}}
    else if(S==='dpass'){flap=false;T.wrL=T.wrR=.25;T.wf=.55;T.np=-.1;kJ=14;
      this.lt+=44*dt;const s=this.lt,k=(s-32)/32;P.set(this.ls.x+this.ld.x*s,gy+1.9+k*k*5.2,this.ls.z+this.ld.z*s);this.yaw=atan2(this.ld.x,this.ld.z);tp=k*.3;
      if(random()<dt*120)fx.parts.spawn(P.x+rand(-6,6),P.y+rand(-.5,.5),P.z+rand(-6,6),0,0,0,1.4,2,3.4,rand(.1,.25),.5);
      const ax=pl.pos.x-P.x,az=pl.pos.z-P.z;   // hit zone: 3.6 m along the flight line, 6.8 m to either side
      if(!this.struck&&abs(ax*this.ld.x+az*this.ld.z)<3.6&&abs(ax*this.ld.z-az*this.ld.x)<6.8&&py<2.8&&pl.takeHit(20,this))this.struck=true;
      if(s>=64)this.go('dshot');}
    else if(S==='dshot'){
      P.x+=this.ld.x*16*dt;P.z+=this.ld.z*16*dt;P.y=damp(P.y,gy+9,2.5,dt);this.yaw=turnTo(this.yaw,toP,5*dt);T.np=.4;tr=.3;
      if(this.fired<3&&t>=.15+this.fired*.22){this.fired++;this.head(_b);orbs.spawn(_b.x,_b.y,_b.z,pl.pos.x-_b.x,pl.pos.y+1-_b.y,pl.pos.z-_b.z,this,8.4);}
      if(t>=.9){this.passes--;if(this.phase===1){this.th=atan2(P.x-C.x,P.z-C.z);this.go('circle');this.cd=2.2;}else if(this.passes>0)this.go('dpre');else this.go('land');}}
    else if(S==='breath'){
      this.flyTo(C.x+sin(this.th)*20,gy+6.5,C.z+cos(this.th)*20,2.5,dt,false);this.yaw=turnTo(this.yaw,toP,3*dt);T.np=.55;coreK=2.5+t*6;
      this.head(_b);if(random()<dt*60){const a=rand(TAU),rr=rand(2,4);fx.parts.spawn(P.x+cos(a)*rr,P.y-.4+rand(-1,1),P.z+sin(a)*rr,-cos(a)*rr*2,0,-sin(a)*rr*2,1.6,2.2,3.4,rand(.08,.16),.5);}
      if(!this.marked){this.marked=true;sfx.coreCharge();G.msg('','SHOOT THE CORE',1.6);}
      if(t>=2.3)this.go('barrage');}
    else if(S==='barrage'){this.yaw=turnTo(this.yaw,toP,3*dt);T.np=.2;T.hp=.3;coreK=6;
      if(this.fired<6&&t>=this.fired*.3){this.fired++;G.strike(clamp(pl.pos.x+pl.vel.x*.3+rand(-1,1),ar.x0,ar.x1),clamp(pl.pos.z+pl.vel.z*.3+rand(-1,1),ar.z0,ar.z1),gy,.7,3,16,this);}
      if(t>=2.4){this.go('circle');this.cd=3;}}
    else if(S==='fall'){flap=false;T.wrL=.7;T.wrR=-.3;T.we=.2;T.np=-.4;this.vel.y=(this.vel.y||0)-30*dt;
      P.x=damp(P.x,this.spot.x,3,dt);P.z=damp(P.z,this.spot.z,3,dt);P.y+=this.vel.y*dt;tr=sin(t*9)*.5;tp=.4;
      if(P.y<=gY){P.y=gY;this.vel.y=0;this.landFx(true);this.go('stun');}}
    else if(S==='stun'){flap=false;T.wrL=this.pinned?-.55:-.25;T.wrR=-.25;T.we=.12;T.wf=.25;T.np=-.55;T.hp=.3+sin(t*4)*.08;T.tp=-.3;P.y=damp(P.y,gY-.5,8,dt);tr=this.pinned?.12:0;
      if(random()<dt*30)fx.parts.spawn(P.x+rand(-3,3),gy+rand(.4,2.6),P.z+rand(-3,3),0,rand(1,3),0,1.4,2,3.4,rand(.06,.12),.5,-1,1);
      if(t>=this.stunT){
        if(this.phase===1){this.th=atan2(P.x-C.x,P.z-C.z);this.go('circle');this.cd=2;}
        else if(this.phase===2&&!this.pinned){this.go('gidle');this.cd=.8;}
        else{this.pinned=false;this.passes=this.phase===3?2:1;this.go('dpre');}}}
    else if(S==='shift'){flap=true;this.ph+=dt*4;T.np=.7;T.hp=-.4;coreK=6;this.flyTo(P.x,max(P.y,gy+5),P.z,2,dt,false);
      if(t>=1.6){if(this.phase===2)this.go('land');else this.go('toperch');}}
    else if(S==='land'){
      if(!this.marked){this.marked=true;let ux=-dx/(dist||1),uz=-dz/(dist||1);let x=clamp(pl.pos.x+ux*11,ar.x0+4,ar.x1-4),z=clamp(pl.pos.z+uz*11,ar.z0+4,ar.z1-4);
        const d=hypot(x-C.x,z-C.z);if(d<8){const a=d>.1?atan2(x-C.x,z-C.z):0;x=C.x+sin(a)*8;z=C.z+cos(a)*8;}this.spot.set(x,gY,z);}
      this.flyTo(this.spot.x,gY,this.spot.z,3.7,dt);
      if(P.distanceTo(this.spot)<.8||t>2.6){P.copy(this.spot);this.landFx(false);if(this.phase===2)this.armor=this.maxArmor;this.groundT=0;this.go('gidle');this.cd=.9;}}
    else if(S==='gidle'){flap=false;T.wrL=T.wrR=.35;T.we=-.9;T.wf=1;T.np=.5;P.y=damp(P.y,gY+abs(sin(G.rt*5))*(dist>9?.35:0),8,dt);
      this.yaw=turnTo(this.yaw,toP,1.9*dt);this.groundT+=dt;
      if(dist>9){P.x+=sin(this.yaw)*3.2*dt;P.z+=cos(this.yaw)*3.2*dt;}
      if(this.cd<=0&&live){const ang=abs(wrapA(toP-this.yaw));
        if(this.phase===3&&this.groundT>6.5){this.passes=2;this.go('dpre');}
        else if(dist<10&&ang>1.9)this.go('tail');else if(dist>11||ang>1.1)this.go('bite');else this.go((this.side^=1)?'wsw':'bite');
        if(this.state!=='gidle'&&this.state!=='dpre'){sfx.telegraph(true);fx.warn(this,1,this.state==='tail'?.55:this.state==='bite'?.66:.8,1.6);}}}
    else if(S==='wsw'){flap=false;this.yaw=turnTo(this.yaw,toP,1.2*dt);T.wrL=T.wrR=.3;T.we=-.3;T.wf=.2;T.np=.5;if(this.side)T.wrR=1.05;else T.wrL=1.05;if(this.side)T.wsR=-.5;else T.wsL=-.5;
      if(t>=.8){this.go('wsws');sfx.whoosh(.3,2);}}
    else if(S==='wsws'){flap=false;kJ=22;T.wrL=T.wrR=.3;T.we=-.1;T.wf=0;if(this.side){T.wsR=1.5;T.wrR=-.05;}else{T.wsL=1.5;T.wrL=-.05;}
      if(t>=.1&&!this.struck){this.struck=true;fx.puff(P.x+sin(this.yaw)*5,P.z+cos(this.yaw)*5,40,2,gy);cam.shake(.35);
        if(dist<10.5&&abs(wrapA(toP-this.yaw))<2&&py<1.5)pl.takeHit(18,this);}
      if(t>=.5){this.rec=.8;this.go('grec');}}
    else if(S==='tail'){flap=false;T.wrL=T.wrR=.5;T.we=-.6;T.wf=.6;T.tp=.7;T.np=.3;if(t>=.55){this.go('tails');sfx.whoosh(.35,1.8);}}
    else if(S==='tails'){flap=false;kJ=22;T.wrL=T.wrR=.5;T.we=-.6;T.wf=.6;T.tp=-.7;if(t<.3)this.yaw+=PI/.3*dt;
      if(t>=.3&&!this.struck){this.struck=true;this.landFx(false);if(dist<6.5&&py<1.3)pl.takeHit(16,this);waves.ring(P.x,gy,P.z,14,22,14,this,0x9fc8ff,3);}
      if(t>=.6){this.rec=.9;this.go('grec');}}
    else if(S==='bite'){flap=false;T.wrL=T.wrR=.45;T.we=-.8;T.wf=.9;T.np=.95;T.hp=-.6;if(t<.48)this.yaw=turnTo(this.yaw,toP,4.5*dt);
      if(t>=.66){this.go('bites');this.vel.set(sin(this.yaw)*30,0,cos(this.yaw)*30);sfx.whoosh(.6,1.8);}}
    else if(S==='bites'){flap=false;kJ=26;T.wrL=T.wrR=.2;T.we=-.3;T.wf=.9;T.np=-.25;T.hp=.25;
      if(t<.34){P.x+=this.vel.x*dt;P.z+=this.vel.z*dt;}
      if(!this.struck&&t<.4&&dist<4.2&&abs(wrapA(toP-this.yaw))<1.1&&py<2.4){this.struck=true;pl.takeHit(22,this);}
      if(t>=.58){this.rec=1;this.go('grec');}}
    else if(S==='grec'){flap=false;T.wrL=T.wrR=.35;T.we=-.9;T.wf=1;T.np=.2;if(t>=this.rec){this.go('gidle');this.cd=.7;}}
    else if(S==='toperch'){this.flyTo(C.x,gy+17.7,C.z,3.5,dt);
      if(t>=1.9){P.set(C.x,gy+17.7,C.z);this.go('perch');for(const sx of [-1,1])G.spawnFoe('lantern',C.x+sx*13,C.z+sx*4,{link:this});G.msg('','BREAK THE LANTERNS',2.4);}}
    else if(S==='perch'){flap=false;T.wrL=T.wrR=.2;T.we=-1.2;T.wf=1.3;T.np=.7;T.hp=.2;this.yaw=turnTo(this.yaw,toP,1.5*dt);coreK=1.2;
      let n=0;for(const e of G.enemies)if(e.kind==='lantern'&&!e.dead&&e.link===this)n++;this.shieldOn=n>0;
      if(n===0&&t>1){this.shieldOn=false;this.stunT=5;this.vel.set(0,0,0);this.go('fall');const a=atan2(pl.pos.x-C.x,pl.pos.z-C.z);this.spot.set(C.x+sin(a)*8,gY,C.z+cos(a)*8);sfx.roar();G.onBreak(this);}}
    else if(S==='dead'){flap=t<1.4;this.ph+=dt*8;T.np=sin(t*14)*.6;T.hp=.4;tr=sin(t*11)*.6;tp=.5;coreK=3+t*8;
      if(P.y>gY){this.vel.y=(this.vel.y||0)-14*dt;P.y=max(gY,P.y+this.vel.y*dt);}
      if(random()<dt*70)fx.parts.spawn(P.x+rand(-4,4),P.y+rand(-1,1.5),P.z+rand(-4,4),0,rand(2,7),0,1.4,2,3.4,rand(.1,.25),.8,-1,1);
      if(random()<dt*2.5)fx.bolt(P.x+rand(-5,5),gy,P.z+rand(-5,5));
      if(t>2.6&&!this.gone){this.gone=true;fx.embers(P.x,P.y,P.z,340,[1.4,2,3.4],3);fx.embers(P.x,P.y,P.z,120,[3.2,1.6,.5],2);fx.glows.spawn(P,0x9fc8ff,7,.5,2,2,26,26);fx.flash(P,0x9fc8ff,400,.5);
        fx.rings.spawn(P.x,gy+.06,P.z,0x9fc8ff,5,1,22,.9);sfx.death();sfx.boom();sfx.thunder(1);cam.shake(1);G.storm.flash=1.5;this.remove();return;}}
    if(this.grounded||S==='bites'){P.x=clamp(P.x,ar.x0+2,ar.x1-2);P.z=clamp(P.z,ar.z0+2,ar.z1-2);}
    if(flap){const a=this.ph;T.wrL=T.wrR=.15+sin(a)*.55;T.we=-.15-sin(a-.9)*.35;}
    this.pose(dt,flap,tp,tr,kJ,coreK);
  }
  pose(dt,flap,tp,tr,kJ,coreK){
    const J=this.J,T=this.T,S=this.state,t=this.t,P=this.pos,gnd=this.grounded;
    // beak and legs follow the state
    T.jw=S==='breath'?.45+.08*sin(G.rt*31):S==='barrage'||S==='shift'?.6:S==='volley'||S==='dshot'?.5:S==='bite'?.75:S==='bites'?(t<.14?.75:.05):S==='stun'?.22:S==='dead'?.5:S==='intro'&&t>.4&&t<1.8?.6:.04;
    T.lg=gnd?0:S==='land'&&P.y-this.gy<5?.35:S==='dpass'?2:1;
    for(const k in J)J[k]=damp(J[k],T[k],flap&&(k==='wrL'||k==='wrR'||k==='we')?30:kJ,dt);
    this.pitch=damp(this.pitch,tp,5,dt);this.roll=damp(this.roll,tr,4,dt);
    this.root.position.copy(this.pos);this.root.rotation.set(this.pitch,this.yaw,this.roll);
    // standing at rest it mantles: wings half open with the elbows up, the flight feathers drooping to the floor like a cloak
    const mt=this.mt=damp(this.mt||0,S==='gidle'||S==='grec'?1:0,5,dt),wf=J.wf-mt*.5,we=J.we+mt*.25;
    const [wl,wr2]=this.wing;wl.s1.rotation.set(0,-J.wsL+wf*.35,J.wrL+mt*.28);wl.s2.rotation.set(0,wf,we);wl.s3.rotation.set(0,wf*.8,we*.6);
    wr2.s1.rotation.set(0,-J.wsR+wf*.35,J.wrR+mt*.28);wr2.s2.rotation.set(0,wf,we);wr2.s3.rotation.set(0,wf*.8,we*.6);
    this.n1.rotation.x=-J.np;this.n2.rotation.x=-J.np*.5+J.hp*.4;this.hd.rotation.x=J.np*1.2+J.hp;this.jaw.rotation.x=J.jw;
    this.tail.rotation.x=J.tp*.5;this.t2.rotation.x=J.tp*.35;this.t3.rotation.x=J.tp*.3;
    // flight feathers: rooted on the wing segments, fanned when the wing is open, turned back along the body as it folds,
    // each lying in the plane of its spar and bending against the wing beat
    const fold=sat(wf*.85);
    for(let w=0;w<2;w++){const W=this.wing[w],wr=w?J.wrR:J.wrL;W.s1.updateMatrix();W.s2.updateMatrix();W.s3.updateMatrix();
      const M1=W.s1.matrix,M2=SV_m2.multiplyMatrices(M1,W.s2.matrix),M3=SV_m3.multiplyMatrices(M2,W.s3.matrix);
      W.lag=damp(W.lag,dt>0?clamp((wr-W.pwr)/dt,-6,6):0,10,dt);W.pwr=wr;let gi=0,ei=0,ti=0;
      for(let i=0;i<SV_F.length;i++){const f=SV_F[i],e=(f.s===1?M1:f.s===2?M2:M3).elements,ps=f.psi+mt*f.mf,sn=sin(ps),cs=cos(ps),wb=fold*f.fb;
        let dx=e[0]*sn-e[8]*cs,dy=e[1]*sn-e[9]*cs,dz=e[2]*sn-e[10]*cs;
        dx=lerp(dx,sin(f.psi*.45),wb)-e[4]*f.dn;dy=lerp(dy,-.06,wb)-W.lag*f.lg-e[5]*f.dn-mt*f.md;dz=lerp(dz,-cos(f.psi*.45),wb)-e[6]*f.dn;
        let nx=e[1]*dz-e[2]*dy,ny=e[2]*dx-e[0]*dz,nz=e[0]*dy-e[1]*dx;
        if(nx*e[4]+ny*e[5]+nz*e[6]<0){nx=-nx;ny=-ny;nz=-nz;}
        if(nx*nx+ny*ny+nz*nz<.02){nx=e[4];ny=e[5];nz=e[6];}
        const nl=1/hypot(nx,ny,nz);nx=nx*nl-e[0]*.14;ny=ny*nl-e[1]*.14;nz=nz*nl-e[2]*.14;
        LN_aim(LN_M,e[0]*f.x+e[4]*f.y+e[8]*f.z+e[12],e[1]*f.x+e[5]*f.y+e[9]*f.z+e[13],e[2]*f.x+e[6]*f.y+e[10]*f.z+e[14],dx,dy,dz,-nx,-ny,-nz,f.w,.06,f.len);
        W.fm.setMatrixAt(i,LN_M);if(f.glow)W.gm.setMatrixAt(gi++,LN_M);if(f.edge)W.em.setMatrixAt(ei++,LN_M);if(f.tip)W.tm.setMatrixAt(ti++,LN_M);}
      W.fm.instanceMatrix.needsUpdate=W.gm.instanceMatrix.needsUpdate=W.em.instanceMatrix.needsUpdate=W.tm.instanceMatrix.needsUpdate=true;}
    const sp=this.tsp=damp(this.tsp,S==='dpass'?.4:S==='tail'||S==='tails'?1.25:gnd||S==='perch'||S==='land'?1:.7,6,dt);
    for(let i=0;i<7;i++){const k=i-3,a=k*.25*sp,sn=sin(a),cs=cos(a);
      LN_aim(LN_M,sn*.26,-abs(k)*.02,-.1-cs*.26,sn,-.03,-cs,k<0?-.14:.14,k<0?1:-1,0,.8,.06,2.9-abs(k)*.17);this.tfm.setMatrixAt(i,LN_M);this.tgm.setMatrixAt(i,LN_M);}
    this.tfm.instanceMatrix.needsUpdate=this.tgm.instanceMatrix.needsUpdate=true;
    // legs: planted under the body whatever its height, stepping when it walks, tucked in flight, thrown forward in a dive
    const cr=clamp((2.1-(P.y-this.gy))/.5,-.7,1.2),lg=J.lg,Lp=SV_LEG;
    this.walk=damp(this.walk,gnd&&S==='gidle'&&hypot(P.x-this.pp.x,P.z-this.pp.z)>dt*1.5?1:0,8,dt);this.pp.copy(P);
    for(let s=0;s<2;s++){const L=this.leg[s],lift=this.walk*max(0,sin(G.rt*5+s*PI));
      for(let j=0;j<4;j++){const g=Lp.stand[j]+(Lp.crouch[j]-Lp.stand[j])*cr+Lp.lift[j]*lift;(j===0?L.a:j===1?L.b:j===2?L.c:L.f).rotation.x=lg<=1?lerp(g,Lp.tuck[j],lg):lerp(Lp.tuck[j],Lp.strike[j],lg-1);}}
    // the reactor idles a storm blue well below white (its level was about three times this) and burns up to white only as an attack charges
    const sh=this.shieldOn,hot=sat((coreK-2.5)/3.5);this.coreM.color.setHex(sh?0x6fffe0:this.phase===2&&this.armor>0?0xffc070:0x4f9cff).lerp(LN_C.setHex(0xd8ecff),hot*.8).multiplyScalar((.85+max(0,coreK-2.5)*.85)*(1+.2*sin(G.rt*8)));
    this.core.scale.set(.6,.5,.74).multiplyScalar(1+min(.6,(coreK-2.5)*.05));
    this.iron.emissiveIntensity=.04;   // a faint constant glow so the dark hull never vanishes into the night; hits and tells are the rim's job
    // the eyes and the gape burn at about twice the reactor's idle level, and flare with a wind-up or a charging attack: the head is where a tell shows first
    const tell=S==='wsw'?sat(t/.8):S==='tail'?sat(t/.55):S==='bite'?sat(t/.66):0;this.eyeM.color.setHex(0xbfe6ff).multiplyScalar(1.8*(1+2.4*tell+1.3*hot)*(S==='stun'?.35+.25*sin(G.rt*23):1));
    fx.rim(this,this.rimM||(this.rimM={m:this.iron}),this.flash,tell,1,S==='stun',G.boltA<.07?1.5*G.boltK:0,0xbfd8ff);   // lightning rims it for four frames
  }
}
