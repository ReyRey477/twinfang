// ===================== FX =====================
class Particles{
  constructor(n){this.n=n;this.i=0;this.floor=0;this.p=new Float32Array(n*3);this.c=new Float32Array(n*3);this.s=new Float32Array(n);
    this.v=new Float32Array(n*3);this.c0=new Float32Array(n*3);this.s0=new Float32Array(n);this.life=new Float32Array(n);this.max=new Float32Array(n);this.gr=new Float32Array(n);this.dr=new Float32Array(n);
    const g=this.g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(this.p,3));g.setAttribute('aC',new THREE.BufferAttribute(this.c,3));g.setAttribute('aS',new THREE.BufferAttribute(this.s,1));
    this.mat=new THREE.ShaderMaterial({uniforms:{uS:{value:600},uMap:{value:glowTex}},
      vertexShader:`attribute vec3 aC;attribute float aS;uniform float uS;varying vec3 vC;void main(){vC=aC;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aS*uS/max(.1,-mv.z);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform sampler2D uMap;varying vec3 vC;void main(){float a=texture2D(uMap,gl_PointCoord).a;gl_FragColor=vec4(vC*a,1.);}`,
      blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
    this.m=new THREE.Points(g,this.mat);this.m.frustumCulled=false;scene.add(this.m);}
  spawn(x,y,z,vx,vy,vz,r,g,b,size,life,grav=0,drag=0){const i=this.i;this.i=(i+1)%this.n;const j=i*3;
    this.p[j]=x;this.p[j+1]=y;this.p[j+2]=z;this.v[j]=vx;this.v[j+1]=vy;this.v[j+2]=vz;this.c0[j]=r;this.c0[j+1]=g;this.c0[j+2]=b;this.s0[i]=size;this.life[i]=this.max[i]=life;this.gr[i]=grav;this.dr[i]=drag;}
  update(dt){const {p,v,c,c0,s,s0,life,max:mx,gr,dr}=this;
    for(let i=0;i<this.n;i++){if(life[i]<=0){if(s[i]!==0)s[i]=0;continue;}life[i]-=dt;const j=i*3,k=life[i]>0?life[i]/mx[i]:0,d=1-min(1,dr[i]*dt);
      v[j]*=d;v[j+1]=v[j+1]*d-gr[i]*dt;v[j+2]*=d;p[j]+=v[j]*dt;p[j+1]+=v[j+1]*dt;p[j+2]+=v[j+2]*dt;if(p[j+1]<this.floor+.03){p[j+1]=this.floor+.03;v[j+1]*=-.35;}
      c[j]=c0[j]*k;c[j+1]=c0[j+1]*k;c[j+2]=c0[j+2]*k;s[i]=s0[i]*(.4+.6*k);}
    const a=this.g.attributes;a.position.needsUpdate=a.aC.needsUpdate=a.aS.needsUpdate=true;}
}
class SpritePool{
  constructor(n,tex){this.it=[];this.i=0;for(let k=0;k<n;k++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));s.visible=false;scene.add(s);this.it.push({s,t:0,life:1});}}
  spawn(pos,hex,boost,life,w0,h0,w1,h1,rot=0){const it=this.it[this.i++%this.it.length];Object.assign(it,{t:0,life,w0,h0,w1,h1});it.s.position.copy(pos);it.s.material.color.setHex(hex).multiplyScalar(boost);it.s.material.rotation=rot;it.s.material.opacity=1;it.s.scale.set(w0,h0,1);it.s.visible=true;}
  update(dt){for(const it of this.it){if(!it.s.visible)continue;it.t+=dt;const k=it.t/it.life;if(k>=1){it.s.visible=false;continue;}const e=1-pow(1-k,3);it.s.scale.set(lerp(it.w0,it.w1,e),lerp(it.h0,it.h1,e),1);it.s.material.opacity=1-k*k;}}
}
class Rings{
  constructor(n){this.it=[];this.i=0;const g=new THREE.RingGeometry(.82,1,64);for(let k=0;k<n;k++){const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,side:THREE.DoubleSide,fog:false}));m.rotation.x=-PI/2;m.visible=false;scene.add(m);this.it.push({m,t:0,life:1,r0:0,r1:1});}}
  spawn(x,y,z,hex,boost,r0,r1,life){const it=this.it[this.i++%this.it.length];Object.assign(it,{t:0,life,r0,r1});it.m.position.set(x,y,z);it.m.material.color.setHex(hex).multiplyScalar(boost);it.m.visible=true;it.m.scale.setScalar(r0);}
  update(dt){for(const it of this.it){if(!it.m.visible)continue;it.t+=dt;const k=it.t/it.life;if(k>=1){it.m.visible=false;continue;}it.m.scale.setScalar(lerp(it.r0,it.r1,1-pow(1-k,3)));it.m.material.opacity=1-k;}}
}
class Trail{
  constructor(n,hex){this.n=n;this.pos=new Float32Array(n*6);this.al=new Float32Array(n*2);this.a=new Float32Array(n);const uv=new Float32Array(n*2),idx=[];
    for(let i=0;i<n;i++){uv[i*2+1]=1;if(i<n-1){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
    const g=this.g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(this.pos,3));g.setAttribute('aA',new THREE.BufferAttribute(this.al,1));g.setAttribute('aV',new THREE.BufferAttribute(uv,1));g.setIndex(idx);
    this.mesh=new THREE.Mesh(g,new THREE.ShaderMaterial({uniforms:{uC:{value:new THREE.Color(hex)}},
      vertexShader:`attribute float aA;attribute float aV;varying float vA;varying float vV;void main(){vA=aA;vV=aV;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform vec3 uC;varying float vA;varying float vV;void main(){float v=clamp(vV,0.001,1.);float a=clamp(vA,0.,1.);a=a*a*a*.85;gl_FragColor=vec4((uC*(.03+1.1*pow(v,2.5))+vec3(1.1)*pow(v,9.))*a,1.);}`,
      blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,transparent:true}));
    this.mesh.frustumCulled=false;this.mesh.visible=false;scene.add(this.mesh);this.live=0;this.init=false;}
  sample(b,t,on){const p=this.pos,n=this.n;
    if(!this.init){for(let i=0;i<n;i++){p[i*6]=b.x;p[i*6+1]=b.y;p[i*6+2]=b.z;p[i*6+3]=t.x;p[i*6+4]=t.y;p[i*6+5]=t.z;}this.init=true;}
    if(on)this.live=n;else if(this.live>0)this.live--;
    if(this.live<=0){if(this.mesh.visible)this.mesh.visible=false;this.a.fill(0);p[0]=b.x;p[1]=b.y;p[2]=b.z;p[3]=t.x;p[4]=t.y;p[5]=t.z;return;}
    p.copyWithin(6,0,(n-1)*6);this.a.copyWithin(1,0,n-1);p[0]=b.x;p[1]=b.y;p[2]=b.z;p[3]=t.x;p[4]=t.y;p[5]=t.z;this.a[0]=on?1:0;
    for(let i=0;i<n;i++){const f=this.a[i]*(1-i/(n-1));this.al[i*2]=f;this.al[i*2+1]=f;}
    this.g.attributes.position.needsUpdate=this.g.attributes.aA.needsUpdate=true;this.mesh.visible=true;}
}
const fx={
  parts:new Particles(3500),flares:new SpritePool(24,streakTex),glows:new SpritePool(16,glowTex),rings:new Rings(12),lights:[],li:0,
  init(){for(let i=0;i<3;i++){const L=new THREE.PointLight(0xffffff,0,12,2);scene.add(L);this.lights.push({L,t:0,life:.1,i0:0});}},
  flash(pos,hex,inten,life=.14){const o=this.lights[this.li++%3];o.L.color.setHex(hex);o.L.position.copy(pos);o.t=0;o.life=life;o.i0=inten;o.L.intensity=inten;},
  sparks(pos,dx,dy,dz,n,col,spd=9,spread=.9){for(let i=0;i<n;i++){const s=spd*rand(.3,1.2);this.parts.spawn(pos.x,pos.y,pos.z,(dx+rand(-spread,spread))*s,(dy+rand(-spread,spread))*s+2,(dz+rand(-spread,spread))*s,col[0],col[1],col[2],rand(.05,.13),rand(.22,.6),16,2.2);}},
  embers(x,y,z,n,col,r=.5){for(let i=0;i<n;i++){const a=rand(TAU),s=rand(.5,5);this.parts.spawn(x+rand(-r,r),y+rand(-r,r)*1.6,z+rand(-r,r),cos(a)*s,rand(1,7),sin(a)*s,col[0],col[1],col[2],rand(.06,.2),rand(.6,1.7),-1.5,1.6);}},
  puff(x,z,n,r=1,y=0){for(let i=0;i<n;i++){const a=rand(TAU),s=rand(2,7)*r;this.parts.spawn(x,y+.1,z,cos(a)*s,rand(.3,2),sin(a)*s,.22,.26,.32,rand(.2,.5),rand(.3,.8),2,4);}},
  hit(pos,dx,dz,big,ang){
    const C=[1.4,2.6,3.2];
    this.sparks(pos,dx*.6,.3,dz*.6,big?34:16,C,big?13:9);
    this.sparks(pos,dx,.1,dz,big?10:5,[3,2.2,1.2],6,.5);
    this.flares.spawn(pos,0xbfefff,big?5:3.5,big?.2:.14,.6,.5,big?6.5:4.2,.03,ang);
    if(big)this.flares.spawn(pos,0xffffff,4,.18,.5,.4,4.5,.02,ang+PI/2+rand(-.4,.4));
    this.glows.spawn(pos,0x8fe6ff,big?2.4:1.5,.11,.3,.3,big?2.2:1.3,big?2.2:1.3);
    this.flash(pos,0x8fdcff,big?90:45,.14);
  },
  update(gdt,rdt){this.parts.update(gdt);this.flares.update(rdt);this.glows.update(rdt);this.rings.update(gdt);
    for(const o of this.lights){if(o.L.intensity<=0)continue;o.t+=rdt;o.L.intensity=max(0,o.i0*(1-o.t/o.life));}}
};
fx.init();
