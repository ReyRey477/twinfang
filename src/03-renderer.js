// ===================== RENDERER =====================
// Pipeline: scene (HDR, 4x MSAA) -> ambient occlusion -> bloom -> lens + filmic tone map + grade (this file's last pass).
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:QS.has('debug')});
renderer.setPixelRatio(min(window.devicePixelRatio||1,QLOW?1:QHIGH?2:1.5));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.NoToneMapping;
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x020306); scene.fog=new THREE.FogExp2(0x070b13,.021);
const camera=new THREE.PerspectiveCamera(58,1,.1,460);
// Reflection environment: a dark machine hall with a cold overhead panel, teal strips and furnace-amber openings.
{
  const es=new THREE.Scene(),pm=new THREE.PMREMGenerator(renderer);
  es.add(new THREE.Mesh(new THREE.BoxGeometry(40,24,40),new THREE.MeshBasicMaterial({color:0x05070b,side:THREE.BackSide})));
  const pn=(w,h,x,y,z,rx,ry,hex,k)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(hex).multiplyScalar(k),side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.set(rx,ry,0);es.add(m);};
  pn(22,4,0,11.9,0,PI/2,0,0x8fb4ff,3.4); pn(4,14,0,11.8,0,PI/2,0,0x8fb4ff,2.2);
  pn(1.1,18,-19.9,1,-9,0,PI/2,0x2ec4e6,5.5); pn(1.1,18,19.9,1,9,0,PI/2,0x2ec4e6,5.5); pn(1.1,18,6,1,-19.9,0,0,0x2ec4e6,4);
  pn(7,3,-19.9,-4,11,0,PI/2,0xff8a3a,4.5); pn(7,3,19.9,-4,-11,0,PI/2,0xff8a3a,4.5); pn(5,2.4,-8,-5,19.9,0,0,0xff7a2a,3.5);
  pn(12,5,2,3,-19.9,0,0,0x4a6aa8,1.3); pn(40,40,0,-11.9,0,PI/2,0,0x0c1018,1);
  scene.environment=pm.fromScene(es,.03).texture; pm.dispose();
}
const composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(4,4,{type:THREE.HalfFloatType,samples:QLOW?0:4}));
composer.addPass(new RenderPass(scene,camera));
let gtao=null;
if(!QLOW&&!QS.has('noao')){
  gtao=new GTAOPass(scene,camera,4,4);
  gtao.updateGtaoMaterial({radius:.6,distanceExponent:1.2,thickness:1.4,scale:1.1,samples:QHIGH?16:10,screenSpaceRadius:false});
  gtao.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:5,rings:2,samples:QHIGH?16:8});
  gtao.blendIntensity=.85;
  // effects (additive, transparent, sprites) must not occlude anything
  gtao.overrideVisibility=function(){const c=this._visibilityCache;this.scene.traverse(o=>{c.set(o,o.visible);const m=o.material;
    if(o.isPoints||o.isLine||o.isSprite||o.userData.noAO||(m&&(m.transparent||m.depthWrite===false)))o.visible=false;});};
  composer.addPass(gtao);
}
// No invalid pixel may reach bloom: its blur pyramid spreads a single NaN into a block hundreds of pixels wide.
composer.addPass(new ShaderPass({uniforms:{tDiffuse:{value:null}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;
    gl_FragColor=vec4(c.r>=0.?min(c.r,48.):0.,c.g>=0.?min(c.g,48.):0.,c.b>=0.?min(c.b,48.):0.,1.);}`}));
const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.52,.66,.95); composer.addPass(bloom);
const grade=new ShaderPass({
  uniforms:{tDiffuse:{value:null},uAb:{value:0},uDmg:{value:0},uSlow:{value:0},uFlash:{value:0},uT:{value:0},uExp:{value:2.05}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uAb,uDmg,uSlow,uFlash,uT,uExp;varying vec2 vUv;
  // ACES (Hill fit): keeps the amber and teal emitters saturated, rolls highlights off to white
  vec3 aces(vec3 x){
    const mat3 a=mat3(.59719,.07600,.02840,.35458,.90834,.13383,.04823,.01566,.83777);
    const mat3 b=mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602);
    vec3 v=a*x;v=(v*(v+.0245786)-.000090537)/(v*(.983729*v+.4329510)+.238081);return clamp(b*v,0.,1.);}
  void main(){
    vec2 d=vUv-.5;float r2=dot(d,d);
    // lens: radial chromatic aberration (grows on impacts), natural vignette
    vec2 o=d*(uAb+.0016)*(.4+r2*3.2);
    vec3 c=vec3(texture2D(tDiffuse,vUv+o).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-o).b);
    c=vec3(c.r>=0.?c.r:0.,c.g>=0.?c.g:0.,c.b>=0.?c.b:0.)*uExp;
    c*=mix(1.,smoothstep(1.12,.22,sqrt(r2)*1.32),.88);
    c+=vec3(.8,.03,0.)*uDmg*r2*2.2; c+=uFlash;
    c=aces(c);
    // grade (display-linear): teal shadows, warm highlights, a little extra chroma and contrast
    float l=dot(c,vec3(.2126,.7152,.0722));
    c=mix(c,c*vec3(.84,1.03,1.24),smoothstep(.42,0.,l)*.55);
    c=mix(c,c*vec3(1.09,1.,.87),smoothstep(.35,1.,l)*.45);
    c=mix(vec3(l),c,1.1);
    c=mix(c,vec3(l)*vec3(.7,.92,1.3),uSlow*.7);
    c=mix(c,c*c*(3.-2.*c),.3);
    c=max(c,0.);
    c=mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));
    // animated grain, weighted to the mid-tones; also dithers the dark gradients
    float n=fract(sin(dot(vUv*vec2(1721.,1013.)+uT*61.,vec2(12.9898,78.233)))*43758.5453);
    c+=(n-.5)*(.012+.03*l*(1.-l));
    gl_FragColor=vec4(c,1.);}`});
composer.addPass(grade);
