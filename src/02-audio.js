// ===================== AUDIO =====================
class Sfx{
  constructor(){this.ok=false;}
  init(){
    if(this.ok)return; const C=window.AudioContext||window.webkitAudioContext; if(!C)return;
    const c=this.c=new C();
    this.master=c.createGain(); this.master.gain.value=.8;
    const comp=c.createDynamicsCompressor(); comp.threshold.value=-15; comp.ratio.value=5; comp.attack.value=.003; comp.release.value=.2;
    this.master.connect(comp); comp.connect(c.destination);
    this.sfx=c.createGain(); this.sfx.gain.value=.9; this.sfx.connect(this.master);
    const len=c.sampleRate*2.8|0, ir=c.createBuffer(2,len,c.sampleRate);
    for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++){const t=i/len;d[i]=(random()*2-1)*pow(1-t,2.8)*(i<500?i/500:1);}}
    this.rev=c.createConvolver(); this.rev.buffer=ir; const rg=c.createGain(); rg.gain.value=.3;
    this.sfx.connect(this.rev); this.rev.connect(rg); rg.connect(this.master);
    const nb=this.nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate), nd=nb.getChannelData(0);
    for(let i=0;i<nd.length;i++)nd[i]=random()*2-1;
    this.mFilter=c.createBiquadFilter(); this.mFilter.type='lowpass'; this.mFilter.frequency.value=18000;
    this.mGain=c.createGain(); this.mGain.gain.value=.5; this.mFilter.connect(this.mGain); this.mGain.connect(this.master);
    const mr=c.createGain(); mr.gain.value=.22; this.mFilter.connect(mr); mr.connect(this.rev);
    this.ok=true; this.startMusic();
  }
  env(g,T,a,d,pk){g.gain.setValueAtTime(.0001,T);g.gain.linearRampToValueAtTime(pk,T+a);g.gain.exponentialRampToValueAtTime(.0001,T+a+d);}
  noise({t=0,at,dur=.2,type='bandpass',f0=1000,fm,f1,q=1,g=.5,a=.004,dest}){
    if(!this.ok)return; const c=this.c,T=at??(c.currentTime+t); if(f1===undefined)f1=f0;
    const s=c.createBufferSource(); s.buffer=this.nb; s.loop=true;
    const f=c.createBiquadFilter(); f.type=type; f.Q.value=q; f.frequency.setValueAtTime(f0,T);
    if(fm){f.frequency.exponentialRampToValueAtTime(fm,T+dur*.35);} f.frequency.exponentialRampToValueAtTime(max(20,f1),T+dur);
    const gn=c.createGain(); this.env(gn,T,a,dur,g); s.connect(f); f.connect(gn); gn.connect(dest||this.sfx);
    s.start(T,random()*1.5); s.stop(T+dur+a+.05);
  }
  tone({t=0,at,dur=.2,type='sine',f0=440,f1,g=.4,a=.004,dest}){
    if(!this.ok)return; const c=this.c,T=at??(c.currentTime+t); if(f1===undefined)f1=f0;
    const o=c.createOscillator(); o.type=type; o.frequency.setValueAtTime(f0,T); o.frequency.exponentialRampToValueAtTime(max(10,f1),T+dur);
    const gn=c.createGain(); this.env(gn,T,a,dur,g); o.connect(gn); gn.connect(dest||this.sfx); o.start(T); o.stop(T+dur+a+.05);
  }
  whoosh(p=1,g=1){
    this.noise({dur:.21,f0:480*p,fm:2600*p,f1:560*p,q:1.4,g:.5*g});
    this.noise({dur:.16,f0:4200*p,fm:7800*p,f1:5200*p,q:9,g:.17*g,t:.01});
  }
  hit(pw=.5){
    const d=rand(.92,1.08);
    this.tone({f0:190*d,f1:42,dur:.16+pw*.12,g:.75+pw*.3});
    this.noise({type:'lowpass',f0:5200,f1:300,dur:.11+pw*.1,q:.7,g:.75+pw*.25});
    this.noise({type:'highpass',f0:3800,f1:6000,dur:.05,g:.3});
    const b=rand(1500,2100); for(const r of [1,1.48,2.31,3.17]) this.tone({f0:b*r,f1:b*r*.985,dur:.22+pw*.25,g:.07+pw*.03,type:'triangle',t:.004});
    if(pw>.7){this.tone({f0:84,f1:28,dur:.5,g:.9});this.noise({type:'lowpass',f0:900,f1:90,dur:.45,g:.5,q:.5});}
  }
  hurt(){this.tone({type:'sawtooth',f0:230,f1:70,dur:.3,g:.5});this.noise({type:'lowpass',f0:2400,f1:200,dur:.25,g:.8});this.tone({f0:110,f1:40,dur:.3,g:.8});}
  telegraph(big){const p=big?.7:1;this.tone({type:'sawtooth',f0:95*p,f1:260*p,dur:.42,g:.22,a:.3});this.noise({f0:700*p,f1:3200*p,dur:.42,q:5,g:.25,a:.3});this.tone({t:.36,f0:2100*p,f1:2500*p,dur:.25,g:.14,type:'triangle'});}
  death(){this.noise({type:'highpass',f0:5000,f1:300,dur:.55,g:.5});this.tone({f0:120,f1:30,dur:.6,g:.9});
    for(let i=0;i<7;i++)this.tone({t:rand(.02,.35),f0:rand(1800,5200),dur:rand(.15,.4),g:.06,type:'triangle'});}
  dodge(){this.noise({dur:.2,f0:1500,f1:280,q:1.2,g:.55});this.noise({dur:.14,type:'highpass',f0:5000,f1:9000,g:.12});}
  jump(){this.noise({dur:.12,f0:500,f1:1400,q:1,g:.3});}
  step(){this.noise({type:'lowpass',f0:520,f1:160,dur:.055,g:.22});this.tone({f0:95,f1:50,dur:.05,g:.18});}
  land(pw=.3){this.noise({type:'lowpass',f0:700,f1:120,dur:.14+pw*.2,g:.5+pw*.5});this.tone({f0:110,f1:36,dur:.18+pw*.3,g:.5+pw*.5});}
  glint(){this.tone({f0:3200,f1:3600,dur:.18,g:.1,type:'triangle'});this.tone({f0:4800,dur:.14,g:.06,type:'sine',t:.02});}
  rankUp(i){const b=293.66*pow(2,(i*3)/12);[0,7,12,19].forEach((s,k)=>this.tone({t:k*.045,f0:b*pow(2,s/12),dur:.4,g:.13,type:'triangle'}));this.noise({type:'highpass',f0:6000,f1:9000,dur:.3,g:.1});}
  barrier(){this.tone({type:'sawtooth',f0:60,f1:180,dur:.9,g:.3,a:.5});this.noise({f0:300,f1:2400,dur:.9,q:3,g:.35,a:.5});this.tone({t:.5,f0:55,f1:30,dur:.9,g:.9});}
  boom(){this.tone({f0:70,f1:24,dur:1.4,g:1});this.noise({type:'lowpass',f0:1200,f1:60,dur:1.2,g:.6,q:.5});}
  slow(on){if(!this.ok)return;const c=this.c;this.mFilter.frequency.cancelScheduledValues(c.currentTime);this.mFilter.frequency.setTargetAtTime(on?420:18000,c.currentTime,on?.05:.25);
    if(on){this.tone({f0:1400,f1:180,dur:.9,g:.22,type:'sine'});this.noise({f0:6000,f1:300,dur:.8,q:2,g:.3});}}
  gun(){const d=rand(.94,1.06);this.noise({type:'highpass',f0:1800*d,f1:5200,dur:.07,g:.5});this.noise({type:'lowpass',f0:3000,f1:300,dur:.16,g:.55,q:.6});this.tone({f0:260*d,f1:55,dur:.12,g:.6});this.tone({f0:1900*d,f1:900,dur:.05,g:.12,type:'square'});}
  orb(){this.tone({f0:300,f1:900,dur:.35,g:.12});this.noise({f0:1200,f1:2600,dur:.3,q:6,g:.1});}
  deflect(){this.hit(.5);for(const r of [1,1.5,2])this.tone({f0:1400*r,f1:2100*r,dur:.3,g:.09,type:'triangle'});}
  thunder(v=1){this.noise({type:'lowpass',f0:1400,f1:60,dur:1.8,g:.7*v,q:.4,a:.01});this.tone({f0:70,f1:22,dur:1.6,g:.8*v});this.noise({type:'highpass',f0:3000,f1:800,dur:.12,g:.4*v});}
  roar(){this.tone({type:'sawtooth',f0:140,f1:48,dur:1.3,g:.5,a:.08});this.tone({type:'square',f0:92,f1:40,dur:1.3,g:.25,a:.08});this.noise({f0:500,f1:160,dur:1.2,q:1.5,g:.6,a:.08});}
  armorBreak(){this.hit(1);this.noise({type:'highpass',f0:2500,f1:7000,dur:.5,g:.4});for(let i=0;i<6;i++)this.tone({t:rand(0,.25),f0:rand(900,3200),dur:rand(.2,.5),g:.07,type:'triangle'});}
  ready(){this.tone({f0:880,f1:1760,dur:.25,g:.16,type:'triangle'});this.tone({t:.06,f0:1320,dur:.3,g:.1});}
  swap(){this.noise({f0:2400,f1:5200,dur:.09,q:5,g:.3});this.tone({f0:700,f1:1100,dur:.08,g:.1,type:'triangle'});}
  pickup(){[0,4,7,12].forEach((s,k)=>this.tone({t:k*.06,f0:523*pow(2,s/12),dur:.3,g:.12,type:'triangle'}));}
  // ---------- music ----------
  startMusic(){
    const c=this.c;
    this.amb=c.createGain(); this.amb.gain.value=0; this.amb.connect(this.mFilter);
    const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=420; lp.Q.value=2; lp.connect(this.amb);
    [73.42,73.42*1.004,110,174.61*.998,146.83*1.003].forEach((f,i)=>{const o=c.createOscillator();o.type=i<3?'sawtooth':'triangle';o.frequency.value=f;const g=c.createGain();g.gain.value=.13;o.connect(g);g.connect(lp);o.start();});
    const lfo=c.createOscillator(); lfo.frequency.value=.07; const lg=c.createGain(); lg.gain.value=190; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    this.amb.gain.linearRampToValueAtTime(.55,c.currentTime+3);
    this.cmb=c.createGain(); this.cmb.gain.value=0; this.cmb.connect(this.mFilter);
    this.drive=c.createWaveShaper(); const cv=new Float32Array(1024); for(let i=0;i<1024;i++){const x=i/512-1;cv[i]=Math.tanh(x*7);} this.drive.curve=cv; this.drive.oversample='2x';
    const cab=c.createBiquadFilter(); cab.type='lowpass'; cab.frequency.value=2300; cab.Q.value=.9;
    const hp=c.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=75;
    const gg=c.createGain(); gg.gain.value=.2; this.drive.connect(cab); cab.connect(hp); hp.connect(gg); gg.connect(this.cmb);
    this.bpm=154; this.stepN=0; this.nextT=c.currentTime+.1; this.intensity=0; this.combat=false; this.idleT=9;
  }
  tick(combat,intensity,dt){
    if(!this.ok)return; const c=this.c,now=c.currentTime;
    if(combat!==this.combat){this.combat=combat;this.cmb.gain.setTargetAtTime(combat?.95:0,now,combat?.2:1.1);this.amb.gain.setTargetAtTime(combat?.22:.55,now,.8);}
    this.intensity=intensity; this.idleT=combat?0:this.idleT+dt; if(this.idleT>5){this.nextT=now+.1;return;}
    if(this.nextT<now-.2)this.nextT=now+.05;
    const spb=60/this.bpm/4;
    while(this.nextT<now+.14){this.sched(this.stepN++,this.nextT);this.nextT+=spb;}
  }
  sched(n,T){
    const s=n%16,bar=(n>>4)%4,spb=60/this.bpm/4,D=this.cmb,I=this.intensity;
    // drums
    if(s%4===0||(s===14&&bar===3)||(s===10&&bar%2===1)||(s===7&&I>=2)){this.tone({at:T,f0:165,f1:42,dur:.17,g:.95,dest:D});this.noise({at:T,type:'highpass',f0:2500,dur:.012,g:.3,dest:D});}
    if(s===4||s===12||(s===15&&bar===3)){this.noise({at:T,f0:1900,f1:1300,dur:.16,q:.7,g:.6,dest:D});this.tone({at:T,f0:230,f1:150,dur:.09,g:.4,dest:D});}
    if(s%2===0||I>=1)this.noise({at:T,type:'highpass',f0:8500,dur:s%4===2?.07:.025,g:s%2?.1:.2,dest:D});
    // riff
    const RIFF=[0,0,12,0,0,10,0,7,0,0,12,0,15,13,12,10], ROOT=[0,0,-4,-2];
    const semi=RIFF[s]+ROOT[bar], f=73.42*pow(2,semi/12), acc=RIFF[s]>=7||s===0||s===8, dur=acc?spb*1.6:spb*.75;
    for(const [m,ty,g] of [[1,'sawtooth',.5],[1.5,'sawtooth',acc?.3:0],[.5,'square',.35]]){
      if(!g)continue; const o=this.c.createOscillator(); o.type=ty; o.frequency.value=f*m*(1+rand(-.002,.002));
      const gn=this.c.createGain(); this.env(gn,T,.004,dur,g); o.connect(gn); gn.connect(this.drive); o.start(T); o.stop(T+dur+.05);
    }
    // lead
    if(I>=2&&s%2===0){const L=[24,27,31,34,36,34,31,27];const lf=146.83*pow(2,(L[(n>>1)%8]+ROOT[bar])/12);
      this.tone({at:T,f0:lf,dur:spb*1.8,g:.07,type:'square',dest:D});this.tone({at:T,f0:lf*1.005,dur:spb*1.8,g:.05,type:'sawtooth',dest:D});}
    if(I>=4&&s===0)this.tone({at:T,f0:1174.7*pow(2,ROOT[bar]/12),dur:spb*12,g:.05,type:'triangle',dest:D});
  }
}
const sfx=new Sfx();
