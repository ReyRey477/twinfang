// ===================== RENDERER =====================
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:location.search.includes('debug')});
renderer.setPixelRatio(min(window.devicePixelRatio||1,1.5));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25;
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x04060a); scene.fog=new THREE.FogExp2(0x070c14,.024);
const camera=new THREE.PerspectiveCamera(58,1,.1,220);
{const pm=new THREE.PMREMGenerator(renderer); scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;}
const composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(4,4,{type:THREE.HalfFloatType,samples:4}));
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.6,.5,1.0); composer.addPass(bloom);
const grade=new ShaderPass({
  uniforms:{tDiffuse:{value:null},uAb:{value:0},uDmg:{value:0},uSlow:{value:0},uFlash:{value:0},uT:{value:0}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uAb,uDmg,uSlow,uFlash,uT;varying vec2 vUv;
  void main(){vec2 d=vUv-.5;float r2=dot(d,d);vec2 o=d*(uAb+.0025)*(.5+r2*3.);
    vec3 c=vec3(texture2D(tDiffuse,vUv+o).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-o).b);
    float l=dot(c,vec3(.2126,.7152,.0722));
    c=mix(c,c*vec3(.86,1.02,1.2),smoothstep(.45,0.,l)*.7);
    c=mix(c,c*vec3(1.1,1.,.88),smoothstep(.3,1.3,l)*.5);
    c=mix(c,vec3(l)*vec3(.7,.92,1.3),uSlow*.7);
    c*=mix(1.,smoothstep(1.05,.25,sqrt(r2)*1.3),.9);
    c+=vec3(.8,.03,0.)*uDmg*r2*2.2; c+=uFlash;
    float n=fract(sin(dot(vUv*vec2(1721.,1013.)+uT*61.,vec2(12.9898,78.233)))*43758.5453);
    c+=(n-.5)*.03*(.3+l);
    gl_FragColor=vec4(max(c,0.),1.);}`});
composer.addPass(grade); composer.addPass(new OutputPass());
