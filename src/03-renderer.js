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
// The same pass caps how bright a pixel may be on its way in (hue kept): stacked additive effects used to reach 40 and more, and
// bloom turned every heavy hit into a white disc. Nothing in the resting scene is brighter than the cap.
composer.addPass(new ShaderPass({uniforms:{tDiffuse:{value:null}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;
    c=vec3(c.r>=0.?min(c.r,48.):0.,c.g>=0.?min(c.g,48.):0.,c.b>=0.?min(c.b,48.):0.);float m=max(c.r,max(c.g,c.b));gl_FragColor=vec4(m>6.5?c*(6.5/m):c,1.);}`}));
const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.52,.66,.95); composer.addPass(bloom);
// Screen treatments are part of this pass and are all shaped, never a full-frame wash:
//   uAb    hit: radial chromatic aberration (nothing at the centre, about three pixels in the corners at full)
//   uDmg   taking damage: a red vignette on the frame edges only, heavier on the side uDir points to
//   uSlow  slow motion: world at half saturation with cool shadows, closer vignette, slight radial blur at the edges;
//          bright saturated things (the hero's lights, warning flares) keep their colour
//   uExp   exposure (lightning lifts it for a frame, then pulls it under for a few)
//   uDip   how far the world is pulled down (hit-stop, the dark frames that open a finisher, a boss changing phase); what already
//          glows is exempt, so the hit mark and the rim-lit fighters stand out of a darker frame
//   uStop  the same moments: world saturation falls (0.3 on a heavy hit-stop, 0.75 on the dark frames) and the vignette closes a little
//   uRb    radial blur after a finisher (150 ms, easing out), about uRc: where the target is on screen. Nothing within a quarter
//          of the frame's height of that point is touched, nor anything near the hero (uRh); beyond it the blur grows to at most 4% of
//          the frame's width. 22 samples, the first offset per pixel by interleaved gradient noise and weighted from 1 down to 0.3
//          toward the far end, so bright edges dissolve into grain and never repeat as stepped copies. Slow motion's slight edge
//          blur shares the loop with 8 samples.
//   uLow   low health (0 none, 1 under a quarter, 2 under a tenth): a red vignette that pulses on the frame edges only, and the
//          world a little less saturated; the middle of the frame stays clean
const RBW=V(),RBH=V(),_rb=V();   // where in the world the radial blur is centred (the finished foe); projected at render time, so it is right for whichever camera drew the frame
const grade=new ShaderPass({
  uniforms:{tDiffuse:{value:null},uAb:{value:0},uDmg:{value:0},uLow:{value:0},uDir:{value:new THREE.Vector2()},uSlow:{value:0},uStop:{value:0},uDip:{value:1},uRb:{value:0},uRc:{value:new THREE.Vector3(.5,.5,1.78)},uRh:{value:new THREE.Vector2(.5,.5)},uT:{value:0},uExp:{value:2.05}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uAb,uDmg,uLow,uSlow,uStop,uDip,uRb,uT,uExp;uniform vec2 uDir,uRh;uniform vec3 uRc;varying vec2 vUv;
  // ACES (Hill fit): keeps the amber and teal emitters saturated, rolls highlights off to white
  vec3 aces(vec3 x){
    const mat3 a=mat3(.59719,.07600,.02840,.35458,.90834,.13383,.04823,.01566,.83777);
    const mat3 b=mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602);
    vec3 v=a*x;v=(v*(v+.0245786)-.000090537)/(v*(.983729*v+.4329510)+.238081);return clamp(b*v,0.,1.);}
  void main(){
    vec2 d=vUv-.5;float r2=dot(d,d),r=sqrt(max(r2,0.));
    // lens: chromatic aberration grows with the cube of the radius, so the middle of the frame is never split
    vec2 o=d*r2*(.003+uAb*.0095);
    vec3 c=vec3(texture2D(tDiffuse,vUv+o).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-o).b);
    if(uSlow+uRb>.01){vec2 pc=(vUv-uRc.xy)*vec2(uRc.z,1.);float pl=sqrt(max(dot(pc,pc),1e-8));
      vec2 ph=(vUv-uRh)*vec2(uRc.z,1.),ov=d*r2*.15*uSlow+pc/pl*(.04*uRb*smoothstep(.25,.85,pl*2.)*smoothstep(.2,.5,length(ph)*2.))*vec2(1.,uRc.z);   // how far the last sample reaches (uv)
      float jt=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715)))),ws=1.;int n=uRb>.01?22:8;
      for(int i=0;i<22;i++){if(i>=n)break;float t=(float(i)+jt)/float(n),w=1.-.7*t;c+=texture2D(tDiffuse,vUv-ov*t).rgb*w;ws+=w;}c/=ws;}
    c=vec3(c.r>=0.?c.r:0.,c.g>=0.?c.g:0.,c.b>=0.?c.b:0.);
    // the dip darkens the world, not what glows: anything already bright (hit marks, flares, rims, the hero's lights) keeps its level
    c*=uExp*(1.-.19*uSlow)*mix(uDip,1.,smoothstep(.5,1.5,max(c.r,max(c.g,c.b))));
    c*=mix(1.,smoothstep(1.12,.22,r*1.32),.88)*(1.-max(uSlow,uStop)*.5*smoothstep(.22,.75,r));
    c=aces(c);
    // grade (display-linear): teal shadows, warm highlights, a little extra chroma and contrast
    float l=dot(c,vec3(.2126,.7152,.0722));
    c=mix(c,c*vec3(.84,1.03,1.24),smoothstep(.42,0.,l)*.55);
    c=mix(c,c*vec3(1.09,1.,.87),smoothstep(.35,1.,l)*.45);
    c=mix(vec3(l),c,1.1);
    float mx=max(c.r,max(c.g,c.b)),keep=smoothstep(.45,.9,mx)*smoothstep(.12,.45,mx-min(c.r,min(c.g,c.b)));
    c=mix(c,mix(mix(vec3(l),c,.5)*mix(vec3(.7,.9,1.28),vec3(1.),smoothstep(0.,.45,l)),c,keep),uSlow);
    c=mix(c,vec3(dot(c,vec3(.2126,.7152,.0722))),uStop*(1.-keep));
    c=mix(c,c*c*(3.-2.*c),.3);
    float v=smoothstep(.55,1.03,r*1.4142)*clamp(1.+.75*dot(d/max(r,.001),uDir),.35,1.75);
    c=mix(c,vec3(.62,.012,.03)*(.3+l),clamp(v*uDmg*.46,0.,.7));
    // low health: the world a little greyer and a red vignette from 0.72 of the half-diagonal outward (uLow is its strength, pulsing)
    c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,1.-.15*min(1.,uLow*8.));c=mix(c,vec3(.68,.012,.03)*(.34+l),smoothstep(.72,1.03,r*1.4142)*uLow);
    c=max(c,0.);
    c=mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));
    // animated grain, weighted to the mid-tones; also dithers the dark gradients
    float n=fract(sin(dot(vUv*vec2(1721.,1013.)+uT*61.,vec2(12.9898,78.233)))*43758.5453);
    c+=(n-.5)*(.012+.03*l*(1.-l));
    gl_FragColor=vec4(c,1.);}`});
grade.material.onBeforeRender=()=>{const u=grade.uniforms;if(u.uRb.value>.01){_rb.copy(RBW).project(camera);u.uRc.value.set(_rb.z<1?clamp(_rb.x*.5+.5,0,1):.5,_rb.z<1?clamp(_rb.y*.5+.5,0,1):.5,camera.aspect);
  _rb.copy(RBH).project(camera);if(_rb.z<1)u.uRh.value.set(_rb.x*.5+.5,_rb.y*.5+.5);else u.uRh.value.set(-9,-9);}};
composer.addPass(grade);
