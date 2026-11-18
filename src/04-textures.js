// ===================== MATERIALS =====================
// Every surface is generated on the GPU at load: a small shader per material writes albedo, height, roughness,
// metalness and cavity for one seamlessly tiling square; the height becomes a normal map. Nothing is drawn by hand.
// Geometry carries UVs in metres divided by the material's tile size (see TILE), so texel density is even everywhere.
const NOISE=`
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 h22(vec2 p){float n=h21(p);return vec2(n,h21(p+n*37.1+11.3));}
// value noise that repeats every 'per' lattice cells, so uv*f with per=f tiles
float vn(vec2 p,vec2 per){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  float a=h21(mod(i,per)),b=h21(mod(i+vec2(1.,0.),per)),c=h21(mod(i+vec2(0.,1.),per)),d=h21(mod(i+vec2(1.,1.),per));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 uv,vec2 f,int oct){float a=.5,s=0.,n=0.;for(int i=0;i<7;i++){if(i>=oct)break;s+=a*vn(uv*f+float(i)*7.31,f);n+=a;f*=2.;a*=.5;}return s/n;}
// voronoi: x = distance to the nearest site, y = distance to the cell border, z = cell id
vec3 vor(vec2 uv,float f){vec2 p=uv*f,i=floor(p),fr=fract(p);float d1=9.,d2=9.,id=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y)),c=mod(i+g,f);float d=length(g+h22(c)-fr);
    if(d<d1){d2=d1;d1=d;id=h21(c+7.7);}else if(d<d2)d2=d;}
  return vec3(d1,d2-d1,id);}
// sparse straight scratches: f = cells (few along the scratch, many across), w = half width in cell units
float scr(vec2 uv,vec2 f,float w,float dens){vec2 p=uv*f,i=mod(floor(p),f),fr=fract(p);float r=h21(i+1.3);
  float y=.15+.7*h21(i+5.9)+(fr.x-.5)*(r-.5)*.8;return step(1.-dens,r)*smoothstep(0.,.2,fr.x)*smoothstep(1.,.8,fr.x)*smoothstep(w,0.,abs(fr.y-y));}
// n x n grid of plates: xy = position inside the plate, z = distance to its edge (in uv units), w = plate id
vec4 tile(vec2 uv,vec2 n){vec2 g=uv*n,f=fract(g),e=min(f,1.-f)/n;return vec4(f,min(e.x,e.y),h21(mod(floor(g),n)+2.2));}
`;
const SURF={
// deck plating: 2 m plates, alternating studded tread and grooved plates, bolts, worn bright on the high spots
floor:`void surf(vec2 uv,out vec3 al,out float h,out float ro,out float me,out float ao){
  vec4 t=tile(uv,vec2(2.));vec2 g=floor(uv*2.);float chk=mod(g.x+g.y,2.);
  float gap=smoothstep(.0012,.0028,t.z),bev=smoothstep(0.,.008,t.z);
  vec2 q=abs(t.xy-.5);float fr=max(q.x,q.y),inner=smoothstep(.415,.4,fr),grv=smoothstep(.006,.002,abs(fr-.425));
  float stud=smoothstep(.36,.2,length(fract(t.xy*14.)-.5))*inner*chk;
  float slot=(1.-chk)*inner*smoothstep(.075,.03,abs(fract(t.x*5.)-.5))*smoothstep(.36,.33,q.y);
  vec2 bq=min(t.xy,1.-t.xy);float bolt=smoothstep(.024,.016,length(bq-.045))*(1.-smoothstep(.006,.003,abs(length(bq-.045)-.008))*.6);
  float n1=fbm(uv,vec2(3.),5),n2=fbm(uv+3.3,vec2(12.),4),n3=fbm(uv+7.1,vec2(56.),3);
  float wear=smoothstep(.46,.72,n1*.55+n2*.45)*(.35+.65*max(stud,bev*(1.-inner)));
  float grime=smoothstep(.38,.72,n1*.45+n3*.55);
  float sc=scr(uv,vec2(6.,90.),.12,.35)+scr(uv.yx+.37,vec2(5.,70.),.1,.3);
  h=gap*(.55+.12*bev)+bolt*.2+stud*.16-grv*.1-slot*.18+(n3-.5)*.035+(n2-.5)*.03-sc*.03;
  vec3 base=mix(vec3(.105,.115,.135),vec3(.17,.18,.2),t.w*.55+n1*.45)*(.8+.4*n2);
  al=mix(base,vec3(.4,.41,.43),wear*.55+sc*.35);
  al=mix(al,vec3(.2,.105,.05),smoothstep(.6,.82,n2*.55+n3*.45)*(1.-bev)*.75);
  al=mix(al,vec3(.02,.019,.018),max((1.-gap)*.95,max(grv,slot)*.7)+grime*.3);
  ro=clamp(mix(.56,.26,wear)+grime*.28+(1.-gap)*.3+(n3-.5)*.22-sc*.1,.08,1.);
  me=mix(.9,.25,max(grime*.6,1.-gap));
  ao=mix(.45,1.,gap)*(1.-grv*.35)*(1.-slot*.45)*mix(1.,.85,stud*0.);}`,
// wall cladding: riveted 2 m panels, some with louvre vents, leak streaks running down from the seams
wall:`void surf(vec2 uv,out vec3 al,out float h,out float ro,out float me,out float ao){
  vec4 t=tile(uv,vec2(2.));float gap=smoothstep(.0015,.0032,t.z),bev=smoothstep(0.,.01,t.z);
  vec2 e=min(t.xy,1.-t.xy);
  float riv=max(smoothstep(.2,.11,length(vec2(fract(t.x*9.)-.5,(e.y-.05)*9.))),smoothstep(.2,.11,length(vec2((e.x-.05)*9.,fract(t.y*9.)-.5))));
  vec2 c=abs(t.xy-.5);float vm=step(.7,t.w)*smoothstep(.31,.3,c.x)*smoothstep(.2,.19,c.y),lou=vm*fract(t.y*22.);
  float rim=step(.7,t.w)*(smoothstep(.34,.33,c.x)*smoothstep(.23,.22,c.y)-smoothstep(.31,.3,c.x)*smoothstep(.2,.19,c.y));
  float rib=(1.-step(.7,t.w))*step(t.w,.35)*smoothstep(.03,.02,abs(fract(t.x*3.)-.5))*smoothstep(.4,.38,c.y);
  float n1=fbm(uv,vec2(3.),5),n2=fbm(uv+2.1,vec2(14.),4),n3=fbm(uv+8.4,vec2(60.),3);
  float st=smoothstep(.5,.85,vn(uv*vec2(40.,2.)+.5,vec2(40.,2.))*.6+vn(uv*vec2(90.,4.),vec2(90.,4.))*.4)*mix(.25,1.,t.y);
  float chip=smoothstep(.07,.02,vor(uv,26.).y)*smoothstep(.55,.75,n2);
  h=gap*(.5+.15*bev)+riv*.16+rim*.12+rib*.14-lou*.22-vm*.12+(n3-.5)*.03-chip*.05;
  vec3 base=mix(vec3(.075,.085,.105),vec3(.12,.13,.15),t.w*.6+n1*.4)*(.8+.4*n2);
  al=mix(base,vec3(.34,.35,.37),chip*.7+riv*.25);
  al=mix(al,vec3(.16,.085,.045),st*.55);
  al=mix(al,vec3(.018,.018,.02),max(1.-gap,vm*.8)+st*.25);
  ro=clamp(.5+st*.3+(1.-gap)*.3+(n3-.5)*.25-chip*.2+(n1-.5)*.2,.1,1.);
  me=mix(.85,.3,max(st*.7,1.-gap));
  ao=mix(.45,1.,gap)*(1.-vm*.5)*(1.-lou*.3);}`,
// dark structural steel: mill scale, faint panel joints, chipped edges
plate:`void surf(vec2 uv,out vec3 al,out float h,out float ro,out float me,out float ao){
  vec4 t=tile(uv,vec2(2.));float gap=smoothstep(.001,.003,t.z);
  float n1=fbm(uv,vec2(4.),5),n2=fbm(uv+5.5,vec2(20.),4),n3=fbm(uv+1.7,vec2(80.),3);
  vec3 v=vor(uv,34.);float chip=smoothstep(.09,.02,v.y)*smoothstep(.52,.74,n2*.6+n1*.4);
  float sc=scr(uv,vec2(5.,80.),.1,.4)+scr(uv.yx+.2,vec2(4.,60.),.1,.3);
  float brush=vn(uv*vec2(6.,220.),vec2(6.,220.));
  h=gap*.5+(n3-.5)*.05+(n2-.5)*.04-chip*.06-sc*.04+(brush-.5)*.02;
  al=mix(vec3(.045,.05,.06),vec3(.085,.09,.105),n1*.6+n2*.4);
  al=mix(al,vec3(.36,.37,.39),chip*.75+sc*.4);
  al=mix(al,vec3(.015),(1.-gap)*.9);
  ro=clamp(.44+(n2-.5)*.35+(brush-.5)*.15-chip*.18+(1.-gap)*.3,.1,1.);
  me=mix(.8,1.,chip);ao=mix(.5,1.,gap);}`,
// painted armour (neutral, tinted per character): a matte coat over metal, so a foe keeps its own colour under coloured light.
// The shells are mapped every which way, so nothing here has a direction or a pattern: soft mottling, an orange-peel grain,
// a few chips down to bare metal, broad patches rubbed thin. Panel lines are real gaps in the geometry (see shell in 07-rig).
armor:`void surf(vec2 uv,out vec3 al,out float h,out float ro,out float me,out float ao){
  float n1=fbm(uv,vec2(3.),5),n2=fbm(uv+4.2,vec2(11.),4),n3=fbm(uv+9.1,vec2(72.),3);
  vec3 v=vor(uv,13.);float chip=smoothstep(.055,.012,v.y)*smoothstep(.66,.8,n2*.6+n1*.4);
  float rub=smoothstep(.6,.9,n1*.65+n2*.35);
  h=.5+(n3-.5)*.018-chip*.06;
  al=vec3(.8)*(.93+.12*n1);al=mix(al,al*vec3(.8,.78,.75),smoothstep(.45,.85,n2)*.35);al=mix(al,vec3(.66,.67,.7),chip);
  ro=clamp(.58+(n2-.5)*.14-rub*.14-chip*.32,.12,1.);me=max(chip,.06+rub*.08);ao=1.-chip*.15;}`,
// frame: dark gunmetal for struts, hinges and everything under the plates. Machined, faintly oiled, edges knocked bright.
frame:`void surf(vec2 uv,out vec3 al,out float h,out float ro,out float me,out float ao){
  float n1=fbm(uv,vec2(4.),4),n2=fbm(uv+2.7,vec2(26.),3),br=vn(uv*vec2(8.,160.),vec2(8.,160.));
  vec3 v=vor(uv,24.);float chip=smoothstep(.05,.01,v.y)*smoothstep(.6,.78,n2);
  h=.5+(n2-.5)*.03+(br-.5)*.015-chip*.04;
  al=vec3(.36,.37,.4)*(.85+.3*n1);al=mix(al,vec3(.7),chip*.7);
  ro=clamp(.36+(n2-.5)*.16+(br-.5)*.08-chip*.1,.1,1.);me=.92;ao=1.;}`,
// forged plate (the bosses): bare steel armour, mottled by hammer and heat, shallow dents, scuffs rubbed bright. No direction.
iron:`void surf(vec2 uv,out vec3 al,out float h,out float ro,out float me,out float ao){
  float n1=fbm(uv,vec2(3.),5),n2=fbm(uv+4.2,vec2(12.),4),n3=fbm(uv+9.1,vec2(64.),3);
  vec3 v=vor(uv,16.);float chip=smoothstep(.06,.015,v.y)*smoothstep(.6,.78,n2*.6+n1*.4);
  float dent=smoothstep(.3,0.,vor(uv+.37,7.).x)*.5;
  h=.5+(n2-.5)*.05+(n3-.5)*.02-dent*.08-chip*.03;
  al=vec3(.62,.63,.66)*(.8+.3*n1)*(1.-.25*smoothstep(.4,.8,n2));al=mix(al,vec3(.85),chip*.6);
  ro=clamp(.44+(n2-.5)*.22+(n3-.5)*.08-chip*.15,.12,1.);me=.95;ao=1.-dent*.2;}`,
// painted composite shell (tinted per character): smooth satin lacquer, not metal; sparse chips down to the alloy, faint grime
shell:`void surf(vec2 uv,out vec3 al,out float h,out float ro,out float me,out float ao){
  float n1=fbm(uv,vec2(3.),5),n2=fbm(uv+4.2,vec2(14.),4),n3=fbm(uv+9.1,vec2(64.),3);
  vec3 v=vor(uv,18.);float chip=smoothstep(.07,.015,v.y)*smoothstep(.64,.8,n2*.65+n1*.35);
  float sc=scr(uv,vec2(4.,64.),.08,.3)+scr(uv.yx+.6,vec2(3.,52.),.07,.25);
  float dirt=smoothstep(.5,.85,n1*.6+n3*.4);
  h=.5+(n3-.5)*.012-chip*.07-sc*.03;
  al=vec3(.88)*(.94+.08*n1);al=mix(al,al*vec3(.74,.72,.68),dirt*.45);al=mix(al,vec3(.6),sc*.25);al=mix(al,vec3(.22,.23,.25),chip);
  ro=clamp(.3+(n2-.5)*.12+dirt*.2+sc*.1-chip*.05,.12,1.);me=chip;ao=1.-chip*.2;}`,
// bright machined steel: a faint brushed grain (kept faint: on a turned part a strong one reads as wood), fine scratches, oil staining
steel:`void surf(vec2 uv,out vec3 al,out float h,out float ro,out float me,out float ao){
  float br=vn(uv*vec2(4.,300.),vec2(4.,300.))*.6+vn(uv*vec2(9.,140.),vec2(9.,140.))*.4;
  float n1=fbm(uv,vec2(4.),4),n2=fbm(uv+2.7,vec2(22.),3);
  float sc=scr(uv,vec2(5.,90.),.12,.5)+scr(uv.yx+.4,vec2(6.,70.),.1,.25);
  float stain=smoothstep(.55,.8,n1*.6+n2*.4);
  h=.5+(br-.5)*.016-sc*.04+(n2-.5)*.02;
  al=vec3(.6,.61,.63)*(.93+.1*br)*(1.-stain*.35);al=mix(al,vec3(.9),sc*.3);
  ro=clamp(.28+(br-.5)*.08+stain*.22-sc*.06,.08,1.);me=1.;ao=1.-stain*.15;}`,
// ribbed rubber for joints, bellows and cable
rubber:`void surf(vec2 uv,out vec3 al,out float h,out float ro,out float me,out float ao){
  float r=.5+.5*cos(uv.y*6.2832*8.),n=fbm(uv,vec2(16.),4);
  h=r*.6+(n-.5)*.1;al=vec3(.028,.03,.034)*(.7+.6*n)+vec3(.03)*r*.2;ro=clamp(.7-r*.12+(n-.5)*.2,.3,1.);me=0.;ao=.55+.45*r;}`,
// hazard chevrons over steel, heavily chipped
hazard:`void surf(vec2 uv,out vec3 al,out float h,out float ro,out float me,out float ao){
  float s=step(.5,fract((uv.x+uv.y)*4.)),n1=fbm(uv,vec2(4.),5),n2=fbm(uv+1.9,vec2(18.),4);
  float chip=max(smoothstep(.1,.02,vor(uv,20.).y)*smoothstep(.45,.7,n2),smoothstep(.62,.72,n1*.5+n2*.5));
  al=mix(vec3(.03,.03,.032),vec3(.72,.4,.03),s)*(.75+.5*n2);al=mix(al,vec3(.3,.31,.33),chip);
  h=.5-chip*.08+(n2-.5)*.04;ro=clamp(.5-chip*.15+(n2-.5)*.3,.15,1.);me=mix(.3,1.,chip);ao=1.;}`
};
// tile size in metres, bake size in pixels, normal strength
const TILE={floor:4,wall:4,plate:2,armor:.7,frame:.7,iron:.9,shell:.7,steel:1,rubber:.3,hazard:1};
const BAKE={floor:[1024,3.2],wall:[1024,3],plate:[512,1.6],armor:[512,1.2],frame:[512,1.2],iron:[512,1.4],shell:[512,1.2],steel:[512,1],rubber:[256,2.2],hazard:[512,1.2]};
const TEX={};
{
  const cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1),sc=new THREE.Scene(),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));quad.frustumCulled=false;sc.add(quad);
  const VS=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
  const rt=(size,type,srgb)=>{const t=new THREE.WebGLRenderTarget(size,size,{type,depthBuffer:false,generateMipmaps:type!==THREE.HalfFloatType,minFilter:type===THREE.HalfFloatType?THREE.LinearFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter,wrapS:THREE.RepeatWrapping,wrapT:THREE.RepeatWrapping});
    t.texture.anisotropy=8;if(srgb)t.texture.colorSpace=THREE.SRGBColorSpace;return t;};
  const scale=QLOW?.5:1;
  for(const k in SURF){
    const size=BAKE[k][0]*scale,A=rt(size,THREE.UnsignedByteType,true),O=rt(size,THREE.UnsignedByteType),Hh=rt(size,THREE.HalfFloatType),N=rt(size,THREE.UnsignedByteType);
    const m=new THREE.ShaderMaterial({uniforms:{uOut:{value:0}},vertexShader:VS,depthTest:false,depthWrite:false,
      fragmentShader:`uniform int uOut;varying vec2 vUv;${NOISE}${SURF[k]}
      void main(){vec3 al;float h,ro,me,ao;surf(vUv,al,h,ro,me,ao);gl_FragColor=uOut==0?vec4(al,1.):uOut==1?vec4(ao,ro,me,1.):vec4(h,h,h,1.);}`});
    quad.material=m;[A,O,Hh].forEach((t,i)=>{m.uniforms.uOut.value=i;renderer.setRenderTarget(t);renderer.render(sc,cam);});
    const nm=new THREE.ShaderMaterial({uniforms:{tH:{value:Hh.texture},uK:{value:BAKE[k][1]*size/256},uPx:{value:1/size}},vertexShader:VS,depthTest:false,depthWrite:false,
      fragmentShader:`uniform sampler2D tH;uniform float uK,uPx;varying vec2 vUv;
      void main(){float l=texture2D(tH,vUv-vec2(uPx,0.)).r,r=texture2D(tH,vUv+vec2(uPx,0.)).r,d=texture2D(tH,vUv-vec2(0.,uPx)).r,u=texture2D(tH,vUv+vec2(0.,uPx)).r;
        gl_FragColor=vec4(normalize(vec3((l-r)*uK,(d-u)*uK,1.))*.5+.5,1.);}`});
    quad.material=nm;renderer.setRenderTarget(N);renderer.render(sc,cam);
    m.dispose();nm.dispose();Hh.dispose();TEX[k]={map:A.texture,orm:O.texture,nrm:N.texture};
  }
  renderer.setRenderTarget(null);
}
const MSM=THREE.MeshStandardMaterial;
const hdr=(hex,k)=>new THREE.Color(hex).multiplyScalar(k);
// Last line of every lit shader: a pixel that came out NaN, negative or enormous (a mirror-sharp highlight can overflow the
// 16-bit HDR buffer) is zeroed or capped here. One such pixel is enough for bloom to smear a black block over the screen.
const GUARD=`#include <dithering_fragment>
  gl_FragColor.rgb=vec3(gl_FragColor.r>=0.?min(gl_FragColor.r,48.):0.,gl_FragColor.g>=0.?min(gl_FragColor.g,48.):0.,gl_FragColor.b>=0.?min(gl_FragColor.b,48.):0.);`;
const guardOut=s=>{s.fragmentShader=s.fragmentShader.replace('#include <dithering_fragment>',GUARD);};
// A lit material from a baked set. o: any MeshStandardMaterial parameter, plus ns (normal strength).
function pbr(set,o={}){
  const t=TEX[set],ns=o.ns??1;delete o.ns;
  const m=new MSM(Object.assign({map:t.map,normalMap:t.nrm,roughnessMap:t.orm,metalnessMap:t.orm,aoMap:t.orm,roughness:1,metalness:1,envMapIntensity:.8},o));
  m.normalScale.set(ns,ns);m.userData.tile=TILE[set];m.onBeforeCompile=guardOut;m.customProgramCacheKey=()=>'pbr';return m;
}
// Character materials add three things to the standard shading:
//  - a tell or a hit flash (the material's emissive colour, raised by the enemy code) gathers on the silhouette instead of painting
//    the whole body one flat colour: the lit surface stays readable while its rim burns, white-hot at the peak of a hit;
//  - an optional rim light (o.rim = colour, o.rimK = strength, o.rimY = 1 from above, -1 from below) that lifts a figure off a dark room;
//  - o.hold (0..1): how far the colour of the direct light is ignored on the painted surface, so a khaki Husk stays khaki when a teal
//    strip light is behind it. The light still shades it; only its hue is pulled toward white.
//  - wear, driven by a per-vertex attribute the rig writes (aW, see loft and shell in 07-rig): where a plate's border or a hard crease
//    is within a centimetre or two the paint is rubbed through to bare metal, in patches; bolt heads are gunmetal; each plate darkens
//    toward its lower edge (o.grime); and a part can be flagged to take a second paint colour (o.tone). o.wear = the metal's colour,
//    o.wearK = how far in the wear reaches (0 = none). Geometry without the attribute reads as unworn.
function charMat(set,o={}){
  const c=new THREE.Color(o.rim||0).multiplyScalar(o.rimK??1),rim=new THREE.Vector4(c.r,c.g,c.b,o.rimY??1),hold={value:o.hold||0};
  const wc=new THREE.Color(o.wear??0xa4a8b2),wear={value:new THREE.Vector4(wc.r,wc.g,wc.b,o.wearK??1)},b=new THREE.Color(o.color??0xffffff),t=new THREE.Color(o.tone??o.color??0xffffff);
  const tone={value:new THREE.Vector4(t.r/max(b.r,.004),t.g/max(b.g,.004),t.b/max(b.b,.004),o.grime??.25)};
  for(const k of ['rim','rimK','rimY','hold','wear','wearK','tone','grime'])delete o[k];
  const m=pbr(set,o);m.userData.wear=wear;
  m.onBeforeCompile=s=>{guardOut(s);s.uniforms.uRim={value:rim};s.uniforms.uHold=hold;s.uniforms.uWear=wear;s.uniforms.uTone=tone;
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aW;varying vec4 vW;').replace('#include <begin_vertex>','#include <begin_vertex>\nvW=aW;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
      uniform vec4 uRim,uWear,uTone;uniform float uHold;varying vec4 vW;
      float cH(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
      float cN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(cH(i),cH(i+vec2(1.,0.)),f.x),mix(cH(i+vec2(0.,1.)),cH(i+vec2(1.,1.)),f.x),f.y);}`).replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
      {float wD=min(vW.x,vW.y)+.25,wA=cN(vMapUv*63.),wB=cN(vMapUv*17.+3.7),wN=wA*.5+wB*.5,wE=max(wN-.42,0.)*.026*uWear.a;   // how far in the wear reaches here: nowhere on about a third of an edge, a centimetre or two at most
      float wR=(1.-smoothstep(wE*.35,max(wE,1e-4),wD))*step(1e-4,wE),wK=step(wD,-.004);
      diffuseColor.rgb*=mix(vec3(1.),uTone.rgb,clamp(1.-vW.w,0.,1.))*(1.-uTone.a*clamp(vW.z,0.,1.)*(.55+.45*wB));
      diffuseColor.rgb=mix(mix(diffuseColor.rgb,uWear.rgb,wR),vec3(.15,.155,.17),wK);
      metalnessFactor=mix(mix(metalnessFactor,.9,wR),.85,wK);roughnessFactor=mix(mix(roughnessFactor,.4,wR),.42,wK);}`).replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
      {vec3 cL=reflectedLight.directDiffuse/max(material.diffuseColor,vec3(.004));reflectedLight.directDiffuse=mix(cL,vec3(dot(cL,vec3(.2126,.7152,.0722))),uHold)*material.diffuseColor;}`).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      {vec3 cV=vViewPosition*inversesqrt(max(dot(vViewPosition,vViewPosition),1e-12));float cF=1.-clamp(abs(dot(cV,normal)),0.,1.),cF3=cF*cF*cF;
      float cE=max(totalEmissiveRadiance.r,max(totalEmissiveRadiance.g,totalEmissiveRadiance.b)),cH=smoothstep(1.3,1.8,cE);
      totalEmissiveRadiance=mix(totalEmissiveRadiance,vec3(cE),cH*.85)*(.14*(1.-.7*cH)+3.*cF*cF*(1.-.45*cH));
      totalEmissiveRadiance+=uRim.rgb*cF3*clamp(.5+uRim.a*normal.y*.7,0.,1.);}`);};
  m.customProgramCacheKey=()=>'char';return m;
}
// World surfaces get large-scale variation from world position (hides tiling), and optional rain: standing water in
// the low spots with expanding rings, everything else damp. wet = 0 (dry interior) or 1 (the roof).
const TIMEU={value:0};
const WORLD_GLSL=`
float mh(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float mvn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mh(i),mh(i+vec2(1.,0.)),f.x),mix(mh(i+vec2(0.,1.)),mh(i+vec2(1.,1.)),f.x),f.y);}
float mfbm(vec2 p){return mvn(p)*.55+mvn(p*2.13+3.7)*.3+mvn(p*4.7+9.1)*.15;}
// one sparse layer of rain rings per octave: each cell gets a new drop every cycle; returns a slope in xz
vec2 rings(vec2 p,float t){vec2 s=vec2(0.);for(int k=0;k<2;k++){float fk=float(k);vec2 g=p*(1.1+fk*.8)+fk*5.7,i=floor(g),f=fract(g)-.5;float r=mh(i+fk*3.1),ph=fract(t*(.8+r*.5)+r*7.);
  vec2 d=f-(vec2(mh(i+1.7),mh(i+4.3))-.5)*.5;float l=length(d),w=sin(46.*(l-ph*.42))*smoothstep(.07,0.,abs(l-ph*.42))*(1.-ph);s+=w*d/max(l,.001);}return s;}`;
function worldMat(set,o={},wet=0){
  const m=pbr(set,o);
  m.onBeforeCompile=s=>{
    guardOut(s);s.uniforms.uTm=TIMEU;
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>','#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;uniform float uTm;\n#define WET '+wet.toFixed(1)+'\n#define WETI '+(wet?1:0)+WORLD_GLSL)
      .replace('#include <map_fragment>',`#include <map_fragment>
        vec3 wC=cross(dFdx(vWP),dFdy(vWP));vec3 wN=wC*inversesqrt(max(dot(wC,wC),1e-24));float wUp=smoothstep(.75,.95,wN.y);
        float mA=mfbm(vWP.xz*.09+vWP.y*.05),mB=mfbm(vWP.xz*.31+vWP.y*.17+9.);
        float pud=WET*wUp*smoothstep(.5,.6,mfbm(vWP.xz*.21+4.)+(mB-.5)*.25);
        diffuseColor.rgb*=mix(.68,1.16,mA)*mix(1.,.5,pud)*mix(1.,.8,WET*wUp);`)
      .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=clamp(roughnessFactor*mix(.62,1.3,mB)*mix(1.,.5,WET*wUp),.05,1.);roughnessFactor=mix(roughnessFactor,.07,pud);`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        #if WETI
        normal=normalize(mix(normal,nonPerturbedNormal,pud*.94));
        vec2 rg=rings(vWP.xz,uTm)*pud*.3;normal=normalize(normal+(viewMatrix*vec4(rg.x,0.,rg.y,0.)).xyz);
        #endif`);
  };
  m.customProgramCacheKey=()=>'world'+wet;return m;
}
// ---------- sprites for effects (drawn on a canvas: soft gradients only) ----------
function canvasTex(w,h,draw){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);return new THREE.CanvasTexture(cv);}
const glowTex=canvasTex(128,128,(g,w)=>{const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.5)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,w,w);});
const streakTex=canvasTex(256,64,(g,w,h)=>{g.translate(w/2,h/2);g.scale(1,.11);const r=g.createRadialGradient(0,0,0,0,0,w/2);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.6)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.beginPath();g.arc(0,0,w/2,0,TAU);g.fill();});
const rayTex=canvasTex(64,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.globalCompositeOperation='destination-in';const g2=g.createLinearGradient(0,0,w,0);g2.addColorStop(0,'rgba(0,0,0,0)');g2.addColorStop(.5,'rgba(0,0,0,1)');g2.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=g2;g.fillRect(0,0,w,h);});
