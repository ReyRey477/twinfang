// ===================== AUDIO =====================
// Every sound is synthesised from scratch when the game starts: each recipe below writes samples into a buffer
// (layers of filtered noise, pitch sweeps and decaying metal resonances), several variants per sound, so repeated
// hits never sound identical. Playback goes through two convolution reverbs (machine hall / open roof) whose
// impulse responses are generated the same way, then a bus compressor and a soft clipper.
class Sfx{
  constructor(){this.ok=false;this.bank={};this.lastAt={};this.lastV={};}
  init(){
    if(this.ok)return; const C=window.AudioContext||window.webkitAudioContext; if(!C)return;
    const c=this.c=new C(),sr=c.sampleRate,g=v=>{const n=c.createGain();n.gain.value=v;return n;};
    // master chain
    const comp=c.createDynamicsCompressor(); comp.threshold.value=-16; comp.knee.value=8; comp.ratio.value=4.5; comp.attack.value=.004; comp.release.value=.22;
    const clip=c.createWaveShaper(),cv=new Float32Array(2048); for(let i=0;i<2048;i++){const x=i/1024-1;cv[i]=Math.tanh(x*1.6)/Math.tanh(1.6);} clip.curve=cv; clip.oversample='2x';
    this.master=g(.85); this.master.connect(comp); comp.connect(clip); clip.connect(c.destination);
    this.sfx=g(.9); this.sfx.connect(this.master);
    // ---------- synthesis kit ----------
    const N=t=>max(1,Math.round(t*sr)),buf=t=>new Float32Array(N(t)),rnd=rand;
    const noise=t=>{const x=buf(t);for(let i=0;i<x.length;i++)x[i]=random()*2-1;return x;};
    // RBJ biquad; f is Hz or a function of progress 0..1
    const bq=(x,type,f,q=.707)=>{let b0,b1,b2,a1,a2,x1=0,x2=0,y1=0,y2=0;const n=x.length,fn=typeof f==='function';
      const set=fr=>{const w=TAU*clamp(fr,20,sr*.45)/sr,cs=cos(w),al=sin(w)/(2*q),a0=1+al;
        if(type==='lp'){b0=(1-cs)/2/a0;b1=(1-cs)/a0;b2=b0;}else if(type==='hp'){b0=(1+cs)/2/a0;b1=-(1+cs)/a0;b2=b0;}else{b0=al/a0;b1=0;b2=-al/a0;}
        a1=-2*cs/a0;a2=(1-al)/a0;};
      set(fn?f(0):f);
      for(let i=0;i<n;i++){if(fn&&(i&31)===0)set(f(i/n));const v=x[i],y=b0*v+b1*x1+b2*x2-a1*y1-a2*y2;x2=x1;x1=v;y2=y1;y1=y;x[i]=y;}
      return x;};
    const dec=(x,a,d)=>{const na=N(a);for(let i=0;i<x.length;i++)x[i]*=i<na?i/na:exp(-(i-na)/sr/d);return x;};          // attack then exponential decay
    const shape=(x,f)=>{const n=x.length;for(let i=0;i<n;i++)x[i]*=f(i/n);return x;};                                    // arbitrary envelope
    const tone=(t,f0,f1,d,w='sine')=>{const x=buf(t);let ph=0;for(let i=0;i<x.length;i++){ph+=f0*pow(f1/f0,i/x.length)/sr;const p=ph%1;
      x[i]=(w==='sine'?sin(TAU*p):w==='saw'?2*p-1:w==='sq'?(p<.5?1:-1):1-4*abs(p-.5))*exp(-i/sr/d);}return x;};
    // struck metal: a set of decaying partials [Hz, decay s, level]
    const modal=(t,parts)=>{const x=buf(t);for(const [f,d,a] of parts){const w=TAU*f/sr,ph=random()*TAU;for(let i=0;i<x.length;i++)x[i]+=a*sin(w*i+ph)*exp(-i/sr/d);}
      const na=N(.0008);for(let i=0;i<na&&i<x.length;i++)x[i]*=i/na;return x;};
    const ring=(f,len,dk=1,br=1)=>modal(len,[[f,.11*dk,.5],[f*1.48,.09*dk,.36*br],[f*2.31,.07*dk,.3*br],[f*3.17,.05*dk,.2*br],[f*4.62,.035*dk,.14*br],[f*6.1,.02*dk,.08*br]]);
    const mix=(d,s,at=0,k=1)=>{const o=Math.round(at*sr);for(let i=0;i<s.length&&i+o<d.length;i++)d[o+i]+=s[i]*k;return d;};
    const drive=(x,k)=>{for(let i=0;i<x.length;i++)x[i]=Math.tanh(x[i]*k);return x;};
    const fin=(x,pk=.9)=>{let m=0;for(let i=0;i<x.length;i++)m=max(m,abs(x[i]));const k=m>0?pk/m:1,n=min(x.length,N(.012));for(let i=0;i<x.length;i++)x[i]*=k;for(let i=0;i<n;i++)x[x.length-1-i]*=i/n;return x;};
    const tick=(hp=2500,d=.004)=>dec(bq(noise(.03),'hp',hp),.0004,d);
    const crunch=(len,f0,f1,d)=>dec(bq(noise(len),'lp',k=>f0*pow(f1/f0,k),.8),.001,d);
    const loop=(x,xf=.5)=>{const n=N(xf),L=x.length-n,o=new Float32Array(L);for(let i=0;i<L;i++)o[i]=x[i];for(let i=0;i<n;i++){const k=i/n;o[i]=x[i]*k+x[L+i]*(1-k);}return o;};
    // ---------- recipes: name -> [variants, make()] ----------
    const R={
      boom:[1,()=>{const x=buf(1.9);mix(x,tone(1.7,72,22,.5));mix(x,dec(bq(noise(1.5),'lp',k=>1300*pow(.05,k),.5),.004,.4),0,.7);for(let k=0;k<5;k++)mix(x,ring(rnd(300,900),.3,1.5),rnd(.1,.7),.08);return fin(drive(x,1.5));}],
      whoosh:[5,()=>{const d=rnd(.26,.34),x=shape(bq(noise(d),'bp',k=>rnd(420,480)+2500*pow(sin(PI*k),1.5),1.3),k=>pow(sin(PI*k),1.2));
        mix(x,shape(bq(noise(d),'hp',5200),k=>pow(sin(PI*k),2)),0,.22);const f=rnd(2800,3600);mix(x,modal(d-.06,[[f,.1,.035],[f*1.51,.07,.025]]),.06);return fin(x,.8);}],
      hit:[5,()=>{const x=buf(.5);mix(x,tick());mix(x,ring(rnd(900,1500),.42),0,.5);mix(x,crunch(.12,4500,320,.035),0,.9);mix(x,tone(.14,170,45,.05),0,.9);return fin(drive(x,1.6));}],
      hitBig:[4,()=>{const x=buf(1.1);mix(x,tick(1800,.006));mix(x,ring(rnd(420,640),.9,3,.8),0,.5);mix(x,ring(rnd(1100,1700),.4),0,.3);mix(x,crunch(.3,3200,150,.08));mix(x,tone(.6,84,26,.2),0,1.1);
        for(let k=0;k<6;k++)mix(x,ring(rnd(1800,5200),.2,.8),rnd(.06,.45),.07);return fin(drive(x,2));}],
      hurt:[3,()=>{const x=buf(.5);mix(x,tone(.25,125,45,.08));mix(x,crunch(.2,2400,200,.06),0,.8);mix(x,ring(rnd(260,340),.4,2),0,.4);
        const z=shape(bq(noise(.2),'bp',k=>2200+2600*k,2.5),k=>(((k*13)%1)<.5?1:.15)*(1-k));mix(x,z,.02,.7);return fin(drive(x,1.8));}],
      telegraph:[2,()=>{const x=buf(.7),s=shape(bq(tone(.46,105,340,9,'saw'),'lp',k=>500+3000*k*k,2),k=>k*k*(1+.25*sin(k*70)));mix(x,s,0,.5);
        mix(x,shape(bq(noise(.46),'bp',k=>700+2600*k,5),k=>k*k),0,.9);mix(x,modal(.25,[[2100,.08,.4],[2520,.06,.3],[4200,.04,.15]]),.42);return fin(x,.75);}],
      death:[3,()=>{const x=buf(1.4);mix(x,bq(tone(1,rnd(420,560),36,.33,'saw'),'lp',k=>1900*pow(.1,k),1.5),0,.55);mix(x,tone(.7,110,30,.22),0,.9);
        for(let k=0;k<12;k++)mix(x,dec(bq(noise(.03),'hp',3000),.0005,rnd(.004,.012)),rnd(0,.7),rnd(.2,.5));
        for(const t of [.14,.34,.58])mix(x,ring(rnd(380,820),.5,1.6),t+rnd(-.03,.03),.3);mix(x,crunch(.5,5000,300,.2),0,.4);return fin(drive(x,1.7));}],
      dodge:[3,()=>{const x=buf(.3);mix(x,shape(bq(noise(.24),'bp',k=>1900*pow(.15,k),1.3),k=>pow(1-k,1.5)*min(1,k*30)));mix(x,dec(bq(noise(.15),'hp',5500),.002,.04),0,.2);mix(x,tone(.12,900,200,.04,'saw'),0,.12);return fin(x,.8);}],
      jump:[2,()=>{const x=buf(.2);mix(x,shape(bq(noise(.14),'bp',k=>500+1100*k,1.1),k=>sin(PI*k)));mix(x,tone(.1,180,420,.05),0,.2);return fin(x,.6);}],
      step:[6,()=>{const x=buf(.14);mix(x,dec(bq(noise(.08),'lp',rnd(420,640),.9),.001,.018));mix(x,tone(.06,95,55,.03),0,.6);mix(x,modal(.1,[[rnd(1500,2500),.03,.22],[rnd(3200,4400),.02,.12]]),0,.5);return fin(x,.7);}],
      land:[3,()=>{const x=buf(.6);mix(x,crunch(.22,750,120,.07));mix(x,tone(.32,105,34,.1),0,1);mix(x,modal(.5,[[rnd(280,340),.12,.3],[530,.1,.2],[1270,.06,.15],[2300,.04,.08]]),0,.6);return fin(drive(x,1.4));}],
      glint:[1,()=>fin(modal(.6,[[3200,.14,.5],[4810,.1,.35],[6400,.07,.2],[9100,.04,.1]]),.6)],
      bell:[1,()=>fin(modal(1.2,[[587,.5,.5],[1180,.36,.3],[1755,.2,.22],[2465,.12,.12],[3170,.08,.08]]),.7)],
      barrier:[1,()=>{const x=buf(1.6);mix(x,shape(bq(tone(1.1,55,190,9,'saw'),'lp',k=>300+2200*k,1.5),k=>k*(.6+.4*sin(k*210))),0,.6);mix(x,shape(bq(noise(1.1),'bp',k=>300+2300*k,3),k=>k*k),0,.8);
        mix(x,tone(1,58,27,.3),.5,1.1);mix(x,ring(240,.8,3),.52,.25);return fin(drive(x,1.6));}],
      warp:[1,()=>{const x=buf(1.1);mix(x,tone(1,1400,160,.4),0,.3);mix(x,shape(bq(noise(.9),'bp',k=>6000*pow(.05,k),2),k=>1-k),0,.5);return fin(x,.6);}],
      gun:[5,()=>{const x=buf(.55);mix(x,dec(bq(noise(.05),'hp',1800),.0003,.012));mix(x,crunch(.25,3400,260,.05),0,.9);mix(x,tone(.14,rnd(225,260),52,.04),0,.9);
        mix(x,modal(.06,[[1900,.012,.3],[3300,.01,.2]]),.032);mix(x,dec(bq(noise(.4),'bp',900,.6),.01,.12),.02,.14);return fin(drive(x,2.2));}],
      orb:[2,()=>{const x=buf(.5);mix(x,shape(tone(.42,300,900,9),k=>sin(PI*k)),0,.35);mix(x,shape(bq(noise(.4),'bp',k=>1200+1500*k,6),k=>sin(PI*k)),0,.7);mix(x,modal(.3,[[1800,.1,.1],[2700,.08,.07]]),.1);return fin(x,.5);}],
      deflect:[3,()=>{const x=buf(.8);mix(x,tick());const f=rnd(1300,1500);mix(x,modal(.75,[[f,.3,.4],[f*1.5,.25,.35],[f*2,.2,.3],[f*3.03,.12,.2],[f*4.4,.06,.1]]),0,.7);mix(x,crunch(.1,5000,500,.03),0,.6);mix(x,tone(.12,190,50,.04),0,.6);return fin(drive(x,1.5));}],
      thunder:[3,()=>{const x=buf(3.2);let a=1,t=0;const r=bq(noise(3.2),'lp',k=>900*pow(.08,k),.5);for(let i=0;i<r.length;i++){if((i&2047)===0)t=rnd(.35,1);a+=(t-a)*.0008;x[i]=r[i]*a*exp(-i/sr/1.1);}
        mix(x,dec(bq(noise(.15),'hp',2600),.0005,.03),0,.35);mix(x,tone(1.6,66,22,.6),0,.5);return fin(drive(x,1.6));}],
      roar:[2,()=>{const x=buf(1.7);for(const [f,k] of [[70,.5],[70.9,.4],[105.3,.3],[140.6,.25]])mix(x,tone(1.5,f,f*.58,9,'saw'),0,k);bq(x,'lp',k=>950*pow(.32,k),1.2);
        shape(x,k=>min(1,k*14)*pow(1-k,.7)*(.72+.28*sin(k*1.5*TAU*23)));mix(x,shape(bq(noise(1.4),'bp',k=>520*pow(.3,k),1.5),k=>min(1,k*14)*(1-k)),0,.6);mix(x,modal(1.4,[[190,.6,.2],[285,.5,.15],[523,.3,.1]]),.05);return fin(drive(x,2.4));}],
      shatter:[2,()=>{const x=buf(1.3);mix(x,ring(rnd(380,520),1,3.5,.9),0,.6);mix(x,crunch(.3,3000,160,.09));mix(x,tone(.7,80,26,.22),0,1.1);mix(x,dec(bq(noise(.6),'hp',k=>2500+4500*k),.002,.15),0,.4);
        for(let k=0;k<14;k++)mix(x,ring(rnd(1500,5200),.25,1),rnd(.03,.6),.08);return fin(drive(x,2));}],
      swap:[3,()=>{const x=buf(.16);mix(x,modal(.1,[[rnd(2200,2600),.015,.4],[3700,.012,.3],[1100,.02,.3]]));mix(x,shape(bq(noise(.09),'bp',k=>2400+2800*k,5),k=>1-k),0,.6);mix(x,tone(.08,700,1100,.05,'tri'),.01,.12);return fin(x,.6);}],
      kick:[1,()=>{const x=buf(.32);mix(x,tone(.3,165,40,.075));mix(x,tick(2500,.003),0,.4);return fin(drive(x,1.8));}],
      snare:[2,()=>{const x=buf(.3);mix(x,dec(bq(noise(.25),'bp',rnd(1800,2000),.7),.0005,.07));mix(x,tone(.1,230,150,.04),0,.5);mix(x,ring(rnd(700,900),.25,1.2),0,.18);return fin(drive(x,1.7));}],
      hat:[2,()=>fin(dec(bq(noise(.1),'hp',8200),.0004,.022),.7)],
      anvil:[2,()=>{const x=buf(.6);mix(x,tick(3000,.003));mix(x,modal(.6,[[rnd(780,860),.18,.5],[1890,.14,.4],[2740,.1,.3],[4100,.06,.2]]));return fin(x,.7);}],
    };
    const store=(name,chs)=>{const b=c.createBuffer(chs.length,chs[0].length,sr);chs.forEach((d,i)=>b.getChannelData(i).set(d));(this.bank[name]||(this.bank[name]=[])).push(b);return b;};
    // essential sounds now, the rest in slices so the first frames stay smooth
    const queue=[];for(const k in R)for(let v=0;v<R[k][0];v++)queue.push([k,v]);
    queue.sort((a,b)=>(a[1]-b[1])||0);
    this.synthMs=0;const run=budget=>{const t0=performance.now();while(queue.length&&performance.now()-t0<budget){const [k]=queue.shift();try{store(k,[R[k][1]()]);}catch(e){console.error('[audio] '+k,e);}}this.synthMs+=performance.now()-t0;if(queue.length)setTimeout(()=>run(7),10);else this.ready_=true;};
    store('boom',[R.boom[1]()]);queue.splice(queue.findIndex(q=>q[0]==='boom'),1);
    // ---------- spaces ----------
    const ir=(len,dk,taps)=>{const b=c.createBuffer(2,N(len),sr);for(let ch=0;ch<2;ch++){const x=bq(noise(len),'lp',k=>9000*pow(.12,k),.5);for(let i=0;i<x.length;i++)x[i]*=exp(-i/sr/dk)*(i<300?i/300:1);
      for(const [t,a] of taps)mix(x,dec(bq(noise(.02),'lp',4000),.0005,.006),t*(ch?1.07:1),a);b.getChannelData(ch).set(fin(x,.5));}return b;};
    this.sendG=g(.3); this.sfx.connect(this.sendG);
    const hall=c.createConvolver(),roof=c.createConvolver(); hall.buffer=ir(2.8,.55,[[.023,.5],[.041,.4],[.067,.3],[.11,.2]]); roof.buffer=ir(1.6,.28,[[.09,.5],[.17,.3],[.31,.2],[.52,.12]]);
    this.hallG=g(1); this.roofG=g(0); this.sendG.connect(hall); this.sendG.connect(roof); hall.connect(this.hallG); roof.connect(this.roofG); this.hallG.connect(this.master); this.roofG.connect(this.master);
    // live-synth helpers still used by a few callers and by the music
    const nb=this.nb=c.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0); for(let i=0;i<nd.length;i++)nd[i]=random()*2-1;
    this.mFilter=c.createBiquadFilter(); this.mFilter.type='lowpass'; this.mFilter.frequency.value=18000;
    this.duckG=g(1); this.mGain=g(.5); this.mFilter.connect(this.duckG); this.duckG.connect(this.mGain); this.mGain.connect(this.master);
    const mr=g(.2); this.mFilter.connect(mr); mr.connect(hall);
    // ambience beds: machine-hall hum and roof rain, looped; faded by where the player is
    const bed=(mk)=>{const b=c.createBuffer(2,1,sr),L=loop(mk()),Rr=loop(mk()),o=c.createBuffer(2,L.length,sr);o.getChannelData(0).set(fin(L,.5));o.getChannelData(1).set(fin(Rr,.5));
      const s=c.createBufferSource(),gn=g(0);s.buffer=o;s.loop=true;s.connect(gn);gn.connect(this.master);s.start();return gn;};
    this.bedHall=bed(()=>{const x=bq(noise(6.5),'lp',150,.7);let a=1,t=1;for(let i=0;i<x.length;i++){if((i&8191)===0)t=rnd(.5,1);a+=(t-a)*.0002;x[i]*=a*3;}
      for(const [f,k] of [[50,.5],[100.4,.25],[149,.12]])mix(x,tone(6.5,f,f,99),0,k*.4);mix(x,bq(noise(6.5),'bp',2200,.4),0,.012);return x;});
    this.bedRain=bed(()=>{const x=bq(noise(6.5),'bp',2600,.35);mix(x,bq(noise(6.5),'hp',6000),0,.25);const w=bq(noise(6.5),'lp',420,.6);let a=1,t=1;for(let i=0;i<w.length;i++){if((i&16383)===0)t=rnd(.2,1);a+=(t-a)*.0001;w[i]*=a*4;}mix(x,w);return x;});
    this.ok=true; this.where=-1; this.startMusic(); setTimeout(()=>run(7),30);
  }
  // play a banked sound: o.g gain, o.rate pitch, o.at absolute start time, o.jit random pitch spread, o.dest bus
  play(name,o={}){
    if(!this.ok)return; const set=this.bank[name]; if(!set||!set.length)return; const c=this.c,now=c.currentTime,T=o.at??now;
    if(o.at===undefined){if(now-(this.lastAt[name]||-1)<.022)return;this.lastAt[name]=now;}
    let v=floor(random()*set.length); if(set.length>1&&v===this.lastV[name])v=(v+1)%set.length; this.lastV[name]=v;
    const s=c.createBufferSource(),gn=c.createGain(); s.buffer=set[v]; s.playbackRate.value=(o.rate??1)*(1+rand(-1,1)*(o.jit??.04)); gn.gain.value=o.g??1;
    s.connect(gn); gn.connect(o.dest||this.sfx); s.start(T);
  }
  duck(depth=.45,hold=.15){if(!this.ok)return;const n=this.c.currentTime,p=this.duckG.gain;p.cancelScheduledValues(n);p.setTargetAtTime(depth,n,.012);p.setTargetAtTime(1,n+hold,.35);}
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
  // ---------- game events ----------
  whoosh(p=1,g=1){this.play('whoosh',{rate:.72+p*.4,g:.75*g,jit:.07});}
  hit(pw=.5){if(pw>.6){this.play('hitBig',{g:.85+pw*.2,jit:.06});this.duck(.5,.12);}else this.play('hit',{g:.7+pw*.5,jit:.07});}
  hurt(){this.play('hurt',{g:1});this.duck(.5,.2);}
  telegraph(big){this.play('telegraph',{rate:big?.7:1,g:big?.75:.5});}
  death(){this.play('death',{g:.85,jit:.08});}
  dodge(){this.play('dodge',{g:.8});}
  jump(){this.play('jump',{g:.6});}
  step(){this.play('step',{g:.42,jit:.08});}
  land(pw=.3){this.play('land',{g:.5+pw*.6,rate:1.1-pw*.25});}
  glint(){this.play('glint',{g:.5});}
  rankUp(i){const b=pow(2,(i*3)/12)*.5,n=this.ok?this.c.currentTime:0;[0,7,12,19].forEach((s,k)=>this.play('bell',{at:n+k*.045,rate:b*pow(2,s/12),g:.3,jit:0}));this.noise({type:'highpass',f0:6000,f1:9000,dur:.3,g:.08});}
  barrier(){this.play('barrier',{g:.8});}
  boom(){this.play('boom',{g:1});this.duck(.35,.3);}
  slow(on){if(!this.ok)return;const c=this.c;this.mFilter.frequency.cancelScheduledValues(c.currentTime);this.mFilter.frequency.setTargetAtTime(on?420:18000,c.currentTime,on?.05:.25);if(on)this.play('warp',{g:.7});}
  gun(){this.play('gun',{g:.62,jit:.05});}
  orb(){this.play('orb',{g:.5});}
  deflect(){this.play('deflect',{g:.9});}
  thunder(v=1){this.play('thunder',{g:.9*v,jit:.1});if(v>.8)this.duck(.5,.4);}
  roar(){this.play('roar',{g:1});this.duck(.4,.8);}
  armorBreak(){this.play('shatter',{g:1});this.duck(.4,.3);}
  ready(){const n=this.ok?this.c.currentTime:0;this.play('bell',{at:n,rate:1.5,g:.3,jit:0});this.play('bell',{at:n+.07,rate:2.25,g:.25,jit:0});}
  swap(){this.play('swap',{g:.6});}
  pickup(){const n=this.ok?this.c.currentTime:0;[0,4,7,12].forEach((s,k)=>this.play('bell',{at:n+k*.06,rate:.89*pow(2,s/12),g:.28,jit:0}));}
  // ---------- music ----------
  startMusic(){
    const c=this.c;
    this.amb=c.createGain(); this.amb.gain.value=0; this.amb.connect(this.mFilter);
    const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=420; lp.Q.value=2; lp.connect(this.amb);
    [73.42,73.42*1.004,110,174.61*.998,146.83*1.003].forEach((f,i)=>{const o=c.createOscillator();o.type=i<3?'sawtooth':'triangle';o.frequency.value=f;const g=c.createGain();g.gain.value=.13;o.connect(g);g.connect(lp);o.start();});
    const lfo=c.createOscillator(); lfo.frequency.value=.07; const lg=c.createGain(); lg.gain.value=190; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    this.amb.gain.linearRampToValueAtTime(.5,c.currentTime+3);
    this.cmb=c.createGain(); this.cmb.gain.value=0; this.cmb.connect(this.mFilter);
    this.drive=c.createWaveShaper(); const cv=new Float32Array(1024); for(let i=0;i<1024;i++){const x=i/512-1;cv[i]=Math.tanh(x*7);} this.drive.curve=cv; this.drive.oversample='2x';
    const cab=c.createBiquadFilter(); cab.type='lowpass'; cab.frequency.value=2300; cab.Q.value=.9;
    const hp=c.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=75;
    const gg=c.createGain(); gg.gain.value=.2; this.drive.connect(cab); cab.connect(hp); hp.connect(gg); gg.connect(this.cmb);
    // combat pad: a low fifth, slowly opening
    const pl=c.createBiquadFilter(); pl.type='lowpass'; pl.frequency.value=600; pl.Q.value=1; const pg=c.createGain(); pg.gain.value=.05; pl.connect(pg); pg.connect(this.cmb);
    [73.42*.5,73.42*.502,110*.5,146.83,147.4].forEach(f=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(pl);o.start();});
    const pf=c.createOscillator(); pf.frequency.value=.11; const pfg=c.createGain(); pfg.gain.value=320; pf.connect(pfg); pfg.connect(pl.frequency); pf.start();
    this.bpm=154; this.stepN=0; this.nextT=c.currentTime+.1; this.intensity=0; this.combat=false; this.idleT=9;
  }
  tick(combat,intensity,dt){
    if(!this.ok)return; const c=this.c,now=c.currentTime;
    // which space are we in? (0 hall, 1 roof)
    const w=typeof G!=='undefined'&&G.player&&G.player.pos.z>262?1:0;
    if(w!==this.where){this.where=w;this.hallG.gain.setTargetAtTime(w?.15:1,now,.5);this.roofG.gain.setTargetAtTime(w?1:0,now,.5);this.bedHall.gain.setTargetAtTime(w?0:.5,now,1);this.bedRain.gain.setTargetAtTime(w?.32:0,now,1);}
    if(combat!==this.combat){this.combat=combat;this.cmb.gain.setTargetAtTime(combat?.95:0,now,combat?.2:1.1);this.amb.gain.setTargetAtTime(combat?.2:.5,now,.8);}
    this.intensity=intensity; this.idleT=combat?0:this.idleT+dt; if(this.idleT>5){this.nextT=now+.1;return;}
    if(this.nextT<now-.2)this.nextT=now+.05;
    const spb=60/this.bpm/4;
    while(this.nextT<now+.14){this.sched(this.stepN++,this.nextT);this.nextT+=spb;}
  }
  sched(n,T){
    const s=n%16,bar=(n>>4)%4,spb=60/this.bpm/4,D=this.cmb,I=this.intensity;
    // drums: sampled kit, plus an anvil on the off-beats once the fight heats up
    if(s%4===0||(s===14&&bar===3)||(s===10&&bar%2===1)||(s===7&&I>=2))this.play('kick',{at:T,g:.95,dest:D,jit:0});
    if(s===4||s===12||(s===15&&bar===3))this.play('snare',{at:T,g:.6,dest:D,jit:.02});
    if(s%2===0||I>=1)this.play('hat',{at:T,g:s%4===2?.22:s%2?.08:.14,dest:D,jit:.03});
    if(I>=3&&(s===6||s===14))this.play('anvil',{at:T,g:.2,dest:D,jit:.01,rate:s===6?1:1.19});
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
