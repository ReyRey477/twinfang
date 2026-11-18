import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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
// Seeded generator for level dressing, so the level is identical on every load (and in every screenshot).
let _sd=90210; const srnd=(a=1,b)=>{_sd=(_sd*1664525+1013904223)>>>0;const r=_sd/4294967296;return b===undefined?r*a:a+r*(b-a);};
// URL options: ?q=low|high picks a quality tier, ?debug keeps the canvas readable. The dev harness (15-harness.js) adds more.
const BUILD='2026-11-18.4';   // shown on the title screen; bump it with every delivered change so a stale file is obvious
const QS=new URLSearchParams(location.search);
const QLOW=QS.get('q')==='low', QHIGH=QS.get('q')==='high';
window.__errors=[]; addEventListener('error',e=>window.__errors.push(String(e.message)));
