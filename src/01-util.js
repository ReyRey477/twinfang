import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ===================== UTIL =====================
const {sin,cos,abs,min,max,PI,sqrt,atan2,floor,random,pow,exp,hypot}=Math;
const TAU=PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, sat=v=>v<0?0:v>1?1:v;
const smooth=t=>t*t*(3-2*t);
const rand=(a=1,b)=>b===undefined?random()*a:a+random()*(b-a);
const damp=(a,b,k,dt)=>a+(b-a)*(1-exp(-k*dt));
const wrapA=a=>{a=(a+PI)%TAU;if(a<0)a+=TAU;return a-PI;};
const turnTo=(a,b,st)=>a+clamp(wrapA(b-a),-st,st);
const $=id=>document.getElementById(id);
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
