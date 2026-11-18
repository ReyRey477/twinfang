// ===================== AUDIO =====================
// Everything is synthesised when the game starts; there are no sound files. A recipe writes samples into a buffer by
// layering band-limited noise (air, scrape, hiss), saturated crunch, low sine thumps, gritty "electric" noise and
// "clank": dozens of inharmonic modes that all die within ~20 ms, so metal reads as struck plate and never rings like
// a bell. Nothing in the bank holds a pure tone above ~250 Hz. Several variants per sound keep repeats from sounding
// identical. Playback runs through two generated convolution reverbs (machine hall / open roof), a bus compressor and
// a soft clipper. The music is sequenced live in D minor: sampled drums, filtered bass, a pad, a driven chug and a lead,
// layered by combat intensity; out of combat only the pad and the ambience beds remain.
const MUS={bpm:138,
  ROOT:[0,0,-4,-2,0,0,5,7],                                                 // bar roots in semitones from D2: Dm Dm Bb C Dm Dm Gm Am
  PAD:[[0,7,15],[0,7,15],[-4,3,12],[-2,5,14],[0,7,15],[0,7,15],[-7,0,8],[-5,2,10]],   // pad voicings, semitones from D3
  BASS:[0,-1,0,0,-1,0,-1,12,0,-1,0,0,-1,7,12,-1],                            // 16th steps, semitones above the bar root, -1 = rest
  CHUG:[2,0,1,1,0,1,0,1,2,0,1,1,0,1,1,0],                                    // 2 = open accent, 1 = muted
  LEAD:[[[0,6,12],[6,10,15]],[[0,8,14],[8,8,12]],[[0,6,12],[6,6,15],[12,4,17]],[[0,12,14],[12,4,10]],
        [[0,6,19],[6,10,17]],[[0,8,15],[8,8,14]],[[0,6,12],[6,6,17],[12,4,20]],[[0,12,19],[12,4,14]]]};   // [step, length in steps, semitones from D4]
class Sfx{
  constructor(){this.ok=false;this.bank={};this.lastAt={};this.lastV={};}
  // The game calls init() with no arguments on the first click. tools/audio_lab.mjs passes an OfflineAudioContext and
  // sync=true to render the real graph to a file.
  init(ctx,sync){
    if(this.ok)return; const C=window.AudioContext||window.webkitAudioContext; if(!ctx&&!C)return;
    const c=this.c=ctx||new C(),sr=c.sampleRate,g=v=>{const n=c.createGain();n.gain.value=v;return n;};
    const curve=(k,n=1024)=>{const cv=new Float32Array(n);for(let i=0;i<n;i++)cv[i]=Math.tanh((i/(n/2)-1)*k)/Math.tanh(k);return cv;};
    const shaper=k=>{const w=c.createWaveShaper();w.curve=curve(k);w.oversample='2x';return w;};
    const filt=(type,f,q=.7)=>{const b=c.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q;return b;};
    this.g_=g;this.shaper_=shaper;this.filt_=filt;
    // master chain
    const comp=c.createDynamicsCompressor(); comp.threshold.value=-15; comp.knee.value=9; comp.ratio.value=4; comp.attack.value=.004; comp.release.value=.2;
    const clip=shaper(1.5);
    this.master=g(.85); const sub=filt('highpass',32,.7); this.master.connect(sub); sub.connect(comp); comp.connect(clip); clip.connect(c.destination);
    this.sfx=g(.8); this.sfx.connect(this.master);
    // ---------- synthesis kit (plain arrays of samples) ----------
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
    const dec=(x,a,d)=>{const na=N(a),r=exp(-1/(sr*d));let e=1;for(let i=0;i<x.length;i++){if(i<na)x[i]*=i/na;else{x[i]*=e;e*=r;}}return x;};          // attack, then exponential decay
    const shape=(x,f)=>{const n=x.length;for(let i=0;i<n;i++)x[i]*=f(i/n);return x;};                                    // arbitrary envelope over progress 0..1
    const mix=(d,s,at=0,k=1)=>{const o=Math.round(at*sr),n=s.length,f=min(n,N(.002));for(let i=0;i<f;i++)s[n-1-i]*=i/f;for(let i=0;i<n&&i+o<d.length;i++)d[o+i]+=s[i]*k;return d;};   // fades the layer's last 2 ms so a cut-off never clicks
    const drive=(x,k)=>{for(let i=0;i<x.length;i++){const v=x[i]*k,w=v*v;x[i]=v>3?1:v<-3?-1:v*(27+w)/(27+9*w);}return x;};                       // soft saturation (rational tanh)
    // normalise to a peak, block DC, fade the last 12 ms
    const fin=(x,pk=.9)=>{let m=0,p=0,y=0;for(let i=0;i<x.length;i++){const v=x[i];y=v-p+.9985*y;p=v;x[i]=y;m=max(m,abs(y));}const k=m>0?pk/m:1,n=min(x.length,N(.012));for(let i=0;i<x.length;i++)x[i]*=k;for(let i=0;i<n;i++)x[x.length-1-i]*=i/n;return x;};
    // low sine thump: pitch falls from f0 to f1 with time constant tp. Only ever used below ~250 Hz.
    const thump=(t,f0,f1,d,tp=.035)=>{const x=buf(t),ra=exp(-1/(sr*d)),rp=exp(-1/(sr*tp));let ph=0,e=1,df=f0-f1;const n=x.length,nf=n*.2;for(let i=0;i<n;i++){ph+=(f1+df)/sr;x[i]=sin(TAU*ph)*e*(n-i<nf?(n-i)/nf:1);e*=ra;df*=rp;}return x;};
    // raw saw / square with an exponential glide and optional vibrato: servos, whines, engine notes. Always filtered afterwards.
    const osc=(t,f0,f1,w='saw',vd=0,vr=30)=>{const x=buf(t),n=x.length,r=pow(f1/f0,1/n),vw=TAU*vr/sr;let ph=random(),f=f0/sr;for(let i=0;i<n;i++){ph+=vd?f*(1+vd*sin(vw*i)):f;f*=r;const p=ph%1;x[i]=w==='saw'?2*p-1:(p<.5?1:-1);}return x;};
    // struck plate: n inharmonic modes between lo and hi Hz, each a two-pole resonator ringing for at most `tau` seconds (less
    // the higher it is). Dense and short is what separates a clank from a bell.
    const clank=(len,lo,hi,n=30,tau=.014)=>{const x=buf(len);for(let m=0;m<n;m++){const f=min(sr*.45,lo*pow(hi/lo,(m+random())/n)),w=TAU*f/sr,d=tau*rnd(.45,1)*pow(lo/f,.35),r=exp(-1/(sr*d)),k1=2*r*cos(w),k2=r*r,a=rnd(.4,1)/sqrt(n),ph=random()*TAU;
      let y2=a*sin(ph-w)/r,y1=a*sin(ph);const L=min(x.length,N(d*8));for(let i=0;i<L;i++){x[i]+=y1;const y=k1*y1-k2*y2;y2=y1;y1=y;}}return x;};
    // random amplitude steps at about hz: turns noise into arcing, tearing or rumble
    const grit=(x,hz,depth=1)=>{let a=1,nx=0;const per=sr/hz;for(let i=0;i<x.length;i++){if(i>=nx){a=1-depth*random();nx=i+per*rnd(.5,1.5);}x[i]*=a;}return x;};
    // scattered bright ticks: sparks and falling bits. curve>1 crowds them toward the start.
    const ticks=(len,n,hp,d0,d1,curve=1)=>{const x=buf(len);for(let k=0;k<n;k++){const t=pow(random(),curve)*max(.001,len-.03);mix(x,dec(bq(noise(.03),'hp',rnd(hp,hp*2.5)),.0003,rnd(d0,d1)),t,rnd(.3,1)*(1-t/len));}return x;};
    const crunch=(len,f0,f1,d)=>dec(bq(noise(len),'lp',k=>f0*pow(f1/f0,k),.8),.001,d);                                   // falling low-passed burst: the body of an impact
    const arc=(len,hz,hp=1600,d=.03)=>dec(drive(grit(bq(noise(len),'hp',hp),hz,1),3),.0004,d);                           // electrical snap / crackle
    const hump=p=>k=>pow(sin(PI*k),p),rise=p=>k=>pow(k,p)*min(1,(1-k)*33);                                               // swell and fade / build to a quick release
    const hum=(x,f,a)=>{const w=TAU*f/sr,k1=2*cos(w);let y1=0,y2=-a*sin(w);for(let i=0;i<x.length;i++){const y=k1*y1-y2;x[i]+=y;y2=y1;y1=y;}return x;};   // steady mains hum, below 250 Hz only
    const loop=(x,xf=.5)=>{const n=N(xf),L=x.length-n,o=new Float32Array(L);for(let i=0;i<L;i++)o[i]=x[i];for(let i=0;i<n;i++){const k=i/n;o[i]=x[i]*k+x[L+i]*(1-k);}return o;};
    // ---------- recipes: name -> [variants, make()] ----------
    const R={
      // -- weapons and bodies --
      whoosh:[5,()=>{const d=rnd(.24,.32),f=rnd(380,460),p=rnd(2400,3000),x=shape(bq(noise(d),'bp',k=>f+p*pow(sin(PI*k),1.5),1.2),hump(1.3));
        mix(x,shape(bq(noise(d),'hp',5000),hump(2.4)),0,.2);mix(x,shape(bq(noise(d*.6),'bp',rnd(6200,7800),7),hump(3)),d*.25,.16);return fin(x,.8);}],
      swoosh:[3,()=>{const d=rnd(.4,.5),p=rnd(1000,1300),x=shape(bq(noise(d),'bp',k=>140+p*pow(sin(PI*k),1.6),.9),hump(1.2));
        mix(x,shape(bq(noise(d),'lp',230,.8),hump(1.5)),0,1.6);mix(x,shape(bq(noise(d),'hp',4200),hump(3)),0,.1);return fin(x,.85);}],
      hit:[5,()=>{const x=buf(.3);mix(x,dec(bq(noise(.04),'hp',rnd(2500,4000)),.0003,.007),0,.9);mix(x,drive(crunch(.12,rnd(4200,5200),320,.03),2),0,.9);
        mix(x,clank(.09,rnd(650,900),rnd(4500,6500),30,.012),.001,.8);mix(x,dec(bq(noise(.12),'bp',rnd(5000,7000),4),.001,.025),0,.35);mix(x,thump(.12,165,52,.045,.02),0,.6);mix(x,ticks(.2,5,3500,.003,.008,1.5),.03,.25);return fin(drive(x,1.5));}],
      hitBig:[4,()=>{const x=buf(.8),tr=rnd(90,140);mix(x,dec(bq(noise(.05),'hp',1800),.0004,.009),0,.8);mix(x,drive(crunch(.32,3400,140,.075),2.5));
        mix(x,shape(grit(bq(noise(.24),'bp',k=>2600*pow(.3,k),1.5),tr,.9),k=>pow(1-k,1.5)),.01,.5);mix(x,clank(.12,rnd(280,380),3800,34,.017),0,.85);mix(x,clank(.07,500,3000,18,.01),rnd(.05,.09),.25);
        mix(x,thump(.5,105,40,.15,.05),0,.9);mix(x,ticks(.6,12,2500,.003,.012,1.3),.05,.3);return fin(drive(x,1.9));}],
      hurt:[3,()=>{const x=buf(.5),f=rnd(300,340),az=rnd(110,150);mix(x,thump(.25,130,44,.08,.03));mix(x,drive(crunch(.2,2200,180,.06),2),0,.8);mix(x,clank(.1,220,2400,26,.016),0,.5);
        mix(x,shape(drive(grit(bq(noise(.22),'hp',1300),az,1),3),k=>pow(1-k,1.2)),.03,.45);
        mix(x,shape(bq(osc(.3,f,80,'saw'),'lp',k=>1600*pow(.2,k),1.2),k=>min(1,k*20)*pow(1-k,1.3)),.02,.35);return fin(drive(x,1.7));}],
      death:[3,()=>{const x=buf(1.4),st=rnd(18,30),az=rnd(60,110);mix(x,drive(crunch(.4,4200,200,.11),2.5),0,.9);mix(x,thump(.6,115,38,.19,.06));
        mix(x,shape(grit(bq(osc(.9,rnd(380,520),38,'saw'),'lp',k=>2200*pow(.08,k),1.4),st,.6),k=>min(1,k*40)*pow(1-k,1.2)),.02,.5);
        for(let k=0;k<5;k++)mix(x,clank(.08,rnd(400,900),rnd(3000,6000),22,.011),rnd(.08,.75),rnd(.15,.4));
        mix(x,ticks(1.2,16,3000,.003,.012,1.2),.02,.35);mix(x,shape(drive(grit(bq(noise(.5),'hp',1500),az,1),3),k=>pow(1-k,2)),.1,.25);return fin(drive(x,1.6));}],
      shatter:[2,()=>{const x=buf(1.25),tr=rnd(70,110);mix(x,drive(crunch(.35,3200,150,.09),2.5));mix(x,thump(.7,90,36,.19,.06),0,1.1);mix(x,clank(.13,rnd(300,420),4200,40,.018),0,.7);
        mix(x,shape(grit(bq(noise(.3),'bp',k=>3200*pow(.25,k),1.4),tr,.9),k=>pow(1-k,1.4)),.01,.5);
        for(let k=0;k<9;k++){const t=.04+pow(random(),1.6)*.7;mix(x,clank(.07,rnd(700,1800),rnd(4000,7000),18,.009),t,.35*(1-t));}
        mix(x,ticks(1.1,24,2500,.003,.014,1.4),.03,.4);return fin(drive(x,1.9));}],
      deflect:[3,()=>{const x=buf(.45);mix(x,dec(bq(noise(.04),'hp',3000),.0002,.006));mix(x,clank(.1,rnd(1300,1700),8000,40,.013),0,.8);
        mix(x,dec(bq(noise(.3),'bp',rnd(4200,5200),5),.001,.06),.004,.6);mix(x,dec(bq(noise(.3),'bp',rnd(6800,7600),7),.001,.045),.004,.4);
        mix(x,arc(.12,220,2000,.03),.01,.35);mix(x,thump(.12,185,55,.04,.015),0,.6);return fin(drive(x,1.4));}],
      gun:[5,()=>{const x=buf(.36);mix(x,dec(bq(noise(.05),'hp',1900),.0003,.009));mix(x,drive(crunch(.2,rnd(3200,3800),240,.04),2.5),0,.9);mix(x,thump(.12,rnd(210,240),55,.04,.012),0,.9);
        mix(x,shape(bq(osc(.07,1700,280,'saw'),'lp',2600),k=>pow(1-k,2)),0,.2);mix(x,clank(.03,1400,4200,10,.004),rnd(.045,.055),.14);mix(x,dec(bq(noise(.25),'bp',850,.6),.008,.07),.015,.12);return fin(drive(x,2));}],
      // -- movement --
      dodge:[3,()=>{const x=buf(.34);mix(x,shape(bq(noise(.3),'bp',k=>2600*pow(.14,k),1.1),k=>min(1,k*40)*pow(1-k,1.6)));mix(x,dec(bq(noise(.16),'hp',5200),.002,.04),0,.3);
        mix(x,shape(bq(noise(.3),'lp',300),k=>min(1,k*40)*pow(1-k,2)),0,1.2);mix(x,thump(.12,150,60,.04,.02),0,.5);return fin(x,.8);}],
      jump:[2,()=>{const x=buf(.2);mix(x,shape(bq(noise(.15),'bp',k=>450+1300*k,1.1),hump(1)));mix(x,thump(.1,130,75,.035,.02),0,.6);mix(x,shape(bq(osc(.09,260,520,'saw'),'lp',1500),hump(1)),0,.15);return fin(x,.6);}],
      step:[6,()=>{const x=buf(.12);mix(x,dec(bq(noise(.07),'lp',rnd(380,620),.9),.001,.016));mix(x,thump(.07,95,52,.028,.012),0,.7);
        mix(x,clank(.04,rnd(1100,1700),rnd(3500,5000),12,.005),0,.16);mix(x,dec(bq(noise(.02),'hp',4000),.0003,.003),0,.12);return fin(x,.7);}],
      land:[3,()=>{const x=buf(.55);mix(x,drive(crunch(.24,800,110,.07),1.6));mix(x,thump(.35,110,42,.11,.04),0,1.1);mix(x,clank(.11,rnd(180,260),1900,26,.018),0,.5);
        mix(x,clank(.06,600,3200,16,.009),rnd(.06,.1),.15);mix(x,ticks(.3,5,2000,.004,.01,1.5),.04,.12);return fin(drive(x,1.4));}],
      // -- warnings and feedback --
      telegraph:[2,()=>{const x=buf(.62),d=.46,w=osc(d,rnd(135,150),rnd(540,600),'saw',.012,37);mix(w,osc(d,202,860,'sq'),0,.35);
        mix(x,shape(bq(w,'bp',k=>420*pow(4,k),1.6),k=>k*k*(.7+.3*sin(k*k*90))),0,.6);mix(x,shape(bq(noise(d),'bp',k=>800*pow(5,k),4),rise(3)),0,.8);
        mix(x,arc(.14,190,1800,.035),d-.005,.9);mix(x,thump(.1,200,90,.03,.015),d,.4);return fin(x,.78);}],
      glint:[1,()=>{const x=buf(.32);mix(x,dec(bq(noise(.3),'bp',5600,4.5),.0015,.07));mix(x,dec(bq(noise(.3),'bp',8400,5.5),.001,.05),0,.8);mix(x,dec(bq(noise(.2),'hp',10500),.0005,.03),0,.4);mix(x,arc(.05,260,2500,.012),0,.5);return fin(x,.8);}],
      rank:[1,()=>{const x=buf(.42);mix(x,shape(bq(osc(.24,170,520,'saw',.01,31),'lp',k=>700+2200*k,2),k=>pow(k,1.5)*(k>.93?(1-k)/.07:1)),0,.5);mix(x,shape(bq(noise(.24),'bp',k=>900*pow(6,k),2.5),rise(2)),0,.6);
        mix(x,thump(.14,150,62,.05,.02),.235,.9);mix(x,dec(bq(noise(.1),'hp',3000),.0005,.03),.235,.4);return fin(x,.7);}],
      ready:[1,()=>{const x=buf(.26);mix(x,arc(.08,240,1800,.02),0,.7);mix(x,shape(bq(osc(.09,280,760,'saw'),'lp',2400,1.5),hump(1)),0,.4);mix(x,thump(.12,170,70,.045,.02),.085,.9);mix(x,clank(.04,900,4000,14,.006),.085,.3);return fin(x,.7);}],
      swap:[3,()=>{const x=buf(.17);mix(x,shape(bq(osc(.06,rnd(480,560),rnd(1050,1250),'saw'),'bp',1800,1.2),hump(1)),0,.25);mix(x,clank(.04,rnd(1300,1800),5200,14,.006),.05,.7);
        mix(x,dec(bq(noise(.03),'hp',3500),.0003,.004),.05,.5);mix(x,thump(.07,150,70,.025,.012),.052,.6);mix(x,clank(.03,2000,6000,10,.004),.095,.3);return fin(x,.6);}],
      pickup:[1,()=>{const x=buf(.5);mix(x,shape(bq(noise(.4),'bp',k=>600*pow(5,k),3),hump(1)));mix(x,shape(bq(osc(.4,150,300,'saw',.008,6),'lp',k=>500+900*k,1.2),hump(1)),0,.5);mix(x,thump(.14,120,60,.05,.02),.37,.7);return fin(x,.6);}],
      // -- world, energy and bosses --
      boom:[1,()=>{const x=buf(2);mix(x,thump(1.9,84,31,.5,.12));mix(x,dec(bq(noise(1.6),'lp',k=>1500*pow(.04,k),.6),.003,.38),0,.8);mix(x,dec(bq(noise(.05),'hp',2400),.0004,.012),0,.5);
        mix(x,shape(grit(bq(noise(1.8),'bp',110,.7),14,.7),k=>pow(1-k,1.6)),.05,.9);return fin(drive(x,1.7));}],
      barrier:[1,()=>{const x=buf(1.5);mix(x,shape(bq(osc(.55,48,112,'saw',.02,24),'lp',k=>260+1500*k,1.4),k=>k*(.6+.4*sin(k*150))),0,.6);mix(x,shape(bq(noise(.55),'bp',k=>300*pow(8,k),2.5),rise(2)),0,.7);
        mix(x,thump(.8,72,34,.26,.08),.54,1.2);mix(x,drive(crunch(.3,1800,120,.08),2),.54,.8);mix(x,clank(.12,150,1600,30,.018),.54,.5);
        mix(x,shape(drive(grit(bq(noise(.7),'hp',1400),70,1),3),k=>pow(1-k,2.2)),.58,.22);return fin(drive(x,1.6));}],
      warp:[1,()=>{const x=buf(1.1);mix(x,shape(bq(noise(1),'bp',k=>6500*pow(.04,k),2.2),k=>min(1,k*25)*pow(1-k,1.3)));
        mix(x,shape(bq(osc(.9,620,70,'saw'),'lp',k=>1800*pow(.1,k),1),k=>min(1,k*25)*pow(1-k,1.5)),0,.3);mix(x,thump(.6,110,38,.25,.15),0,.5);return fin(x,.6);}],
      orb:[2,()=>{const d=.46,x=buf(.5),f=rnd(100,115);mix(x,shape(bq(noise(d),'bp',k=>500+1100*sin(PI*k),5),k=>sin(PI*k)*(.65+.35*sin(k*d*TAU*38))));
        mix(x,shape(bq(osc(d,f,f*1.9,'saw',.03,19),'lp',520,1),hump(1)),0,.45);mix(x,shape(bq(noise(d),'hp',4500),hump(3)),0,.1);return fin(x,.55);}],
      spawn:[2,()=>{const x=buf(.95);mix(x,shape(bq(noise(.8),'bp',k=>200*pow(6.5,k),2),rise(2)));mix(x,shape(bq(osc(.8,45,95,'saw'),'lp',k=>200+700*k,1.2),k=>k*k*(.7+.3*sin(k*110))),0,.6);
        mix(x,thump(.14,140,50,.05,.02),.79,.8);mix(x,arc(.12,130,1500,.04),.79,.4);return fin(x,.7);}],
      charge:[1,()=>{const d=.62,x=buf(.7),w=osc(d,210,640,'saw',.015,44);mix(w,osc(d,316,960,'sq'),0,.3);
        mix(x,shape(bq(w,'bp',k=>600*pow(3.2,k),2),k=>k*(.6+.4*sin(k*k*120))),0,.5);mix(x,shape(bq(noise(d),'bp',k=>1000*pow(3.5,k),5),rise(2)),0,.7);return fin(x,.6);}],
      core:[1,()=>{const d=2.1,x=buf(2.3);for(const [f,k] of [[52,.5],[52.6,.4],[78.4,.3],[104.7,.25]])mix(x,osc(d,f,f*3.2,'saw'),0,k);bq(x,'lp',k=>250+2400*k*k,1.6);
        shape(x,k=>{const u=min(1,k*1.095);return pow(u,1.5)*(.6+.4*sin(TAU*(6*u+9*u*u)*d))*(k>.93?(1-k)/.07:1);});
        mix(x,shape(bq(noise(d),'bp',k=>300*pow(9,k),3),rise(2)),0,.7);mix(x,shape(drive(grit(bq(noise(d),'hp',2000),40,1),3),rise(3)),0,.2);return fin(drive(x,1.3),.8);}],
      thunder:[3,()=>{const x=buf(3.2),r=bq(noise(3.2),'lp',k=>1000*pow(.07,k),.5);let a=1,t=1,e=1;const er=exp(-1/(sr*1.1));for(let i=0;i<r.length;i++){if((i&2047)===0)t=rnd(.3,1);a+=(t-a)*.0008;x[i]=r[i]*a*e;e*=er;}
        for(let k=0;k<4;k++)mix(x,dec(bq(noise(.12),'hp',rnd(1800,3200)),.0005,rnd(.01,.035)),k?rnd(.02,.3):0,k?rnd(.15,.3):.4);mix(x,thump(1.6,62,29,.55,.2),0,.5);return fin(drive(x,1.6));}],
      roar:[2,()=>{const d=1.6,x=buf(1.75),gr=rnd(21,26);for(const [f,k] of [[68,.5],[68.8,.4],[102.5,.3],[137,.25]])mix(x,osc(d,f,f*.56,'saw'),0,k);bq(x,'lp',k=>1000*pow(.3,k),1.3);
        shape(x,k=>min(1,k*14)*pow(max(0,1-k*1.09),.7)*(.7+.3*sin(k*1.75*TAU*gr)));mix(x,shape(bq(noise(1.5),'bp',k=>560*pow(.35,k),1.5),k=>min(1,k*14)*(1-k)),0,.6);
        mix(x,shape(grit(bq(noise(1.4),'bp',k=>1900*pow(.45,k),6),55,.8),k=>min(1,k*10)*pow(1-k,1.5)),0,.25);return fin(drive(x,2.4));}],
      // -- drum kit --
      kick:[1,()=>{const x=buf(.3);mix(x,thump(.29,175,53,.07,.02));mix(x,dec(bq(noise(.02),'hp',2200),.0002,.003),0,.35);mix(x,dec(bq(noise(.05),'lp',900),.0005,.012),0,.3);return fin(drive(x,2));}],
      snare:[2,()=>{const x=buf(.26);mix(x,dec(bq(noise(.24),'bp',rnd(1700,2000),.8),.0004,.055));mix(x,dec(bq(noise(.2),'hp',5000),.0004,.045),0,.5);mix(x,thump(.1,215,150,.035,.02),0,.7);return fin(drive(x,1.8));}],
      hat:[2,()=>fin(dec(bq(noise(.08),'hp',8200),.0004,.018),.7)],
      ohat:[1,()=>fin(dec(bq(bq(noise(.32),'hp',7000),'lp',13000),.001,.09),.7)],
      tom:[1,()=>{const x=buf(.3);mix(x,thump(.3,150,82,.09,.04));mix(x,dec(bq(noise(.03),'lp',1500),.0004,.008),0,.3);return fin(drive(x,1.5));}],
      crash:[1,()=>{const x=dec(bq(noise(1.6),'hp',3800),.002,.42);mix(x,dec(bq(noise(1.6),'bp',2600,1),.002,.25),0,.5);return fin(x,.7);}],
    };
    const store=(name,chs)=>{const b=c.createBuffer(chs.length,chs[0].length,sr);chs.forEach((d,i)=>b.getChannelData(i).set(d));(this.bank[name]||(this.bank[name]=[])).push(b);
      const w=this.wait;if(w&&w.name===name){this.wait=null;if(performance.now()-w.t<700)this.play(name,w.o);}return b;};
    // ---------- spaces ----------
    const irCh=(len,dk,taps,ch)=>{const x=bq(noise(len),'lp',k=>9000*pow(.12,k),.5),r=exp(-1/(sr*dk));let e=1;for(let i=0;i<x.length;i++){x[i]*=e*(i<300?i/300:1);e*=r;}
      for(const [t,a] of taps)mix(x,dec(bq(noise(.02),'lp',4000),.0005,.006),t*(ch?1.07:1),a);return fin(x,.5);};
    this.sendG=g(.24); this.sfx.connect(this.sendG);
    const hall=c.createConvolver(),roof=c.createConvolver();
    this.hallG=g(1); this.roofG=g(0); this.sendG.connect(hall); this.sendG.connect(roof); hall.connect(this.hallG); roof.connect(this.roofG); this.hallG.connect(this.master); this.roofG.connect(this.master);
    this.mFilter=filt('lowpass',18000,.7); this.duckG=g(1); this.mGain=g(.15); this.mFilter.connect(this.duckG); this.duckG.connect(this.mGain); this.mGain.connect(this.master);
    this.mSend=g(.14); this.mFilter.connect(this.mSend); this.mSend.connect(hall);
    // live noise source for noise(); ambience beds are faded by where the player is
    const nb=this.nb=c.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0); for(let i=0;i<nd.length;i++)nd[i]=random()*2-1;
    this.bedHall=g(0); this.bedRain=g(0); this.bedHall.connect(this.master); this.bedRain.connect(this.master);
    // each bed is built in stages (one task each) so no single slice of work is long enough to drop a frame
    const wander=(x,per,k,amp)=>{let a=1,t=1;for(let i=0;i<x.length;i++){if((i&per)===0)t=rnd(.3,1);a+=(t-a)*k;x[i]*=a*amp;}return x;};
    const BED={
      bedHall:[x=>mix(x,wander(bq(noise(6.5),'bp',115,.6),8191,.0002,1.6)),                                                    // the room's own rumble
        x=>{hum(x,50,.03);hum(x,100.4,.05);hum(x,149,.03);mix(x,bq(noise(6.5),'bp',700,.5),0,.035);mix(x,bq(noise(6.5),'bp',2400,.4),0,.022);},     // transformer hum, air in the ducts
        x=>{for(let k=0;k<4;k++){const t=.4+k*1.5+rnd(-.1,.1);mix(x,thump(.6,rnd(70,84),48,.16,.1),t,.16);mix(x,crunch(.5,320,110,.12),t,.45);}}],   // a heavy mechanism working somewhere below
      bedRain:[x=>mix(x,bq(noise(6.5),'bp',2600,.35)),x=>{mix(x,bq(noise(6.5),'hp',6000),0,.25);mix(x,ticks(6.4,110,2500,.002,.006,1),0,.3);},
        x=>mix(x,wander(bq(bq(noise(6.5),'lp',420,.6),'hp',90),16383,.0001,2.2))]};                                           // gusts
    const bed=(name,gn)=>{const b=store(name,[0,1].map(ch=>fin(loop(part[name+ch]),.5))),s=c.createBufferSource();s.buffer=b;s.loop=true;s.connect(gn);s.start();};
    // ---------- synthesis schedule: short slices between frames; what the first seconds of play need comes first ----------
    const tasks=[],part={},order=['boom','step','whoosh','hit','jump','land','dodge','swap',...Object.keys(R)].filter((k,i,l)=>l.indexOf(k)===i);let vmax=0;for(const k in R)vmax=max(vmax,R[k][0]);
    for(let v=0;v<vmax;v++){for(const k of order)if(v<R[k][0])tasks.push(()=>store(k,[R[k][1]()]));
      if(v===0){for(const [nm,cv,a] of [['hall',hall,[1.8,.27,[[.023,.5],[.041,.4],[.067,.3],[.11,.2]]]],['roof',roof,[1.1,.15,[[.09,.5],[.17,.3],[.31,.2],[.52,.12]]]]]){
          tasks.push(()=>{part[nm]=irCh(...a,0);});tasks.push(()=>{const b=c.createBuffer(2,part[nm].length,sr);b.getChannelData(0).set(part[nm]);b.getChannelData(1).set(irCh(...a,1));cv.buffer=b;});}
        for(const [nm,gn] of [['bedHall',this.bedHall],['bedRain',this.bedRain]]){for(const ch of [0,1])for(const f of BED[nm])tasks.push(()=>f(part[nm+ch]||(part[nm+ch]=buf(6.5))));tasks.push(()=>bed(nm,gn));}}}
    this.synthMs=0;this.maxSlice=0;
    const run=budget=>{const t0=performance.now();while(tasks.length&&performance.now()-t0<budget){try{tasks.shift()();}catch(e){console.error('[audio]',e);}}
      const ms=performance.now()-t0;this.synthMs+=ms;this.maxSlice=max(this.maxSlice,ms);if(tasks.length)setTimeout(()=>run(6),8);else this.ready_=true;};
    this.ok=true; this.where=-1; this.startMusic();
    if(sync)run(1e9);else setTimeout(()=>run(6),30);
  }
  // play a banked sound: o.g gain, o.rate pitch, o.at absolute start time, o.jit random pitch spread, o.dest bus, o.late (see below)
  play(name,o={}){
    if(!this.ok)return; const set=this.bank[name];
    if(!set||!set.length){if(o.late&&!this.ready_)this.wait={name,o,t:performance.now()};return;}   // o.late: asked for before it was synthesised (the opening boom), so play it the moment it exists
    const c=this.c,now=c.currentTime,T=o.at??now;
    if(o.at===undefined){if(now-(this.lastAt[name]||-1)<.022)return;this.lastAt[name]=now;}
    let v=floor(random()*set.length); if(set.length>1&&v===this.lastV[name])v=(v+1)%set.length; this.lastV[name]=v;
    const s=c.createBufferSource(),gn=c.createGain(); s.buffer=set[v]; s.playbackRate.value=(o.rate??1)*(1+rand(-1,1)*(o.jit??.04)); gn.gain.value=o.g??1;
    s.connect(gn); gn.connect(o.dest||this.sfx); s.start(T);
  }
  duck(depth=.45,hold=.15){if(!this.ok)return;const n=this.c.currentTime,p=this.duckG.gain;p.cancelScheduledValues(n);p.setTargetAtTime(depth,n,.012);p.setTargetAtTime(1,n+hold,.35);}
  env(g,T,a,d,pk){g.gain.setValueAtTime(.0001,T);g.gain.linearRampToValueAtTime(pk,T+a);g.gain.exponentialRampToValueAtTime(.0001,T+a+d);}
  // live one-shots for callers that want a custom sweep
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
  whoosh(p=1,g=1){if(p<.62)this.play('swoosh',{rate:.7+p*.6,g:.8*g,jit:.06});else this.play('whoosh',{rate:.72+p*.4,g:.75*g,jit:.07});}
  hit(pw=.5){if(pw>.6){this.play('hitBig',{g:.85+pw*.2,jit:.06});this.duck(.5,.12);}else this.play('hit',{g:.7+pw*.5,jit:.07});}
  hurt(){this.play('hurt',{g:1});this.duck(.5,.2);}
  telegraph(big){this.play('telegraph',{rate:big?.7:1,g:big?.9:.7});}
  death(){this.play('death',{g:.85,jit:.08});}
  dodge(){this.play('dodge',{g:.8});}
  jump(){this.play('jump',{g:.6});}
  step(){this.play('step',{g:.34,jit:.08});}
  land(pw=.3){this.play('land',{g:.22+pw*.75,rate:1.1-pw*.25});}
  glint(){this.play('glint',{g:.7});}
  rankUp(i){this.play('rank',{rate:.8*pow(2,i/6),g:.7,jit:0});}
  barrier(){this.play('barrier',{g:.8});}
  boom(){this.play('boom',{g:1,late:1});this.duck(.35,.3);}
  slow(on){if(!this.ok)return;const c=this.c;this.mFilter.frequency.cancelScheduledValues(c.currentTime);this.mFilter.frequency.setTargetAtTime(on?420:18000,c.currentTime,on?.05:.25);if(on)this.play('warp',{g:.7});}
  gun(){this.play('gun',{g:.5,jit:.05});}
  orb(){this.play('orb',{g:.5});}
  deflect(){this.play('deflect',{g:.9});}
  thunder(v=1){this.play('thunder',{g:.9*v,jit:.1});if(v>.8)this.duck(.5,.4);}
  roar(){this.play('roar',{g:1});this.duck(.4,.8);}
  armorBreak(){this.play('shatter',{g:1});this.duck(.4,.3);}
  ready(){this.play('ready',{g:.7,jit:0});}
  swap(){this.play('swap',{g:.8});}
  pickup(){this.play('pickup',{g:.6,jit:0});}
  spawn(){this.play('spawn',{g:.45,jit:.08});}
  charge(){this.play('charge',{g:.6});}
  coreCharge(){this.play('core',{g:.7,jit:0});}
  // ---------- music ----------
  startMusic(){
    const c=this.c,g=this.g_,filt=this.filt_,lfo=(hz,depth,param)=>{const o=c.createOscillator(),d=g(depth);o.frequency.value=hz;o.connect(d);d.connect(param);o.start();return d;};
    this.cmb=g(0); this.cmb.connect(this.mFilter);                 // everything that only plays in combat
    this.pump=g(1); this.pump.connect(this.cmb);                   // bass, chug and pad breathe with the kick
    this.padLP=filt('lowpass',480,.8); this.padG=g(0); this.padLP.connect(this.padG); this.padG.connect(this.mFilter); lfo(.06,140,this.padLP.frequency);
    this.padG.gain.linearRampToValueAtTime(.85,c.currentTime+3); this.padVs=[];
    this.bassIn=g(1); const bd=this.shaper_(2.2),bl=filt('lowpass',1700,.7),bo=g(.27); this.bassIn.connect(bd); bd.connect(bl); bl.connect(bo); bo.connect(this.pump);
    this.gtrIn=g(.55); const gd=this.shaper_(5),gh=filt('highpass',95,.7),g1=filt('lowpass',3100,.9),g2=filt('lowpass',3600,.6),go=g(.46);
    this.gtrIn.connect(gd); gd.connect(gh); gh.connect(g1); g1.connect(g2); g2.connect(go); go.connect(this.pump);
    this.leadG=g(.5); this.leadG.connect(this.cmb); const vo=c.createOscillator(); vo.frequency.value=5.3; vo.start(); this.vibG=g(9); vo.connect(this.vibG);
    this.spb=60/MUS.bpm/4; this.stepN=0; this.nextT=c.currentTime+.1; this.intensity=0; this.combat=false;
  }
  tick(combat,intensity,dt){
    if(!this.ok)return; const c=this.c,now=c.currentTime;
    // which space are we in? (0 hall, 1 roof)
    const w=typeof G!=='undefined'&&G.player&&G.player.pos.z>262?1:0;
    if(w!==this.where){this.where=w;this.hallG.gain.setTargetAtTime(w?.15:1,now,.5);this.roofG.gain.setTargetAtTime(w?1:0,now,.5);this.bedHall.gain.setTargetAtTime(w?0:.1,now,1);this.bedRain.gain.setTargetAtTime(w?.15:0,now,1);}
    if(combat!==this.combat){   // restart the pattern on the downbeat, and let go of whatever pad chord was sounding
      this.combat=combat;this.stepN=0;this.nextT=now+.06;this.cmb.gain.setTargetAtTime(combat?1:0,now,combat?.03:.8);this.padG.gain.setTargetAtTime(combat?.5:.85,now,.6);
      for(const v of this.padVs){if(v.gain.cancelAndHoldAtTime)v.gain.cancelAndHoldAtTime(now);else v.gain.cancelScheduledValues(now);v.gain.setTargetAtTime(0,now,.15);}
      if(combat)this.play('crash',{at:this.nextT,g:.45,dest:this.cmb,jit:0});}
    this.intensity=intensity;
    const pf=combat?900+intensity*260:520;if(pf!==this.padF){this.padF=pf;this.padLP.frequency.setTargetAtTime(pf,now,.7);}
    if(this.nextT<now-.2)this.nextT=now+.05;
    while(this.nextT<now+.14){this.sched(this.stepN++,this.nextT);this.nextT+=this.spb;}
  }
  // one sixteenth-note step of the sequencer
  sched(n,T){
    const M=MUS,s=n%16,spb=this.spb,I=this.intensity,D=this.cmb;
    if(!this.combat){if(n%32===0)this.pad(T,(n>>5)%8,spb*32);return;}      // exploration: the pad alone, one chord every two bars
    const bar=(n>>4)%8,root=M.ROOT[bar],last=bar%4===3;
    if(s===0)this.pad(T,bar,spb*16);
    // drums
    if(s===0||s===8||(s===10&&bar%2===1)||(s===7&&I>=2)||(s===3&&I>=4)||(s===14&&last&&I<3)){this.play('kick',{at:T,g:.72,dest:D,jit:0});const p=this.pump.gain;p.setTargetAtTime(.45,T-.005,.002);p.setTargetAtTime(1,T+.012,.08);}
    if(s===4||s===12)this.play('snare',{at:T,g:.62,dest:D,jit:.02});
    if(last&&I>=3&&s>=13)this.play('tom',{at:T,g:.55,dest:D,jit:0,rate:1.25-(s-13)*.2});
    if(s===14&&I>=2)this.play('ohat',{at:T,g:.2,dest:D,jit:.02});
    else if(s%2===0||I>=1)this.play('hat',{at:T,g:s%4===2?.24:s%2?.08:.15,dest:D,jit:.03});
    // bass, chug, lead
    const b=M.BASS[s];if(b>=0)this.bass(T,73.42*pow(2,(b+root)/12),spb*(s%8===0?1.9:1.1),s%8===0);
    const ch=M.CHUG[s];if(I>=2&&ch)this.chug(T,73.42*pow(2,root/12),ch===2?spb*2.6:spb*.85,ch===2);
    if(I>=3)for(const [st,len,semi] of M.LEAD[bar])if(st===s){this.lead(T,293.66*pow(2,semi/12),len*spb,.1);if(I>=4)this.lead(T,587.33*pow(2,semi/12),len*spb,.04);}
  }
  pad(T,ch,dur){
    const c=this.c,vg=c.createGain(),e=T+dur;vg.gain.setValueAtTime(0,T);vg.gain.linearRampToValueAtTime(.1,T+min(.7,dur*.3));vg.gain.setValueAtTime(.1,e);vg.gain.linearRampToValueAtTime(0,e+.9);vg.connect(this.padLP);
    const fs=MUS.PAD[ch].map(s=>146.83*pow(2,s/12));fs.push(73.42*pow(2,MUS.ROOT[ch]/12));
    for(const dt of [-7,7]){const pn=c.createStereoPanner();pn.pan.value=dt/14;pn.connect(vg);for(const f of fs){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=dt;o.connect(pn);o.start(T);o.stop(e+1);}}
    this.padVs.push(vg);if(this.padVs.length>3)this.padVs.shift();
  }
  bass(T,f,dur,acc){
    const c=this.c,fl=c.createBiquadFilter(),gn=c.createGain();fl.type='lowpass';fl.Q.value=4;fl.frequency.setValueAtTime(acc?2000:1200,T);fl.frequency.exponentialRampToValueAtTime(240,T+dur);
    this.env(gn,T,.004,dur,acc?.5:.4);
    for(const [ty,m] of [['sawtooth',1],['square',1.004]]){const o=c.createOscillator();o.type=ty;o.frequency.value=f*m;o.connect(fl);o.start(T);o.stop(T+dur+.05);}
    fl.connect(gn);gn.connect(this.bassIn);
  }
  chug(T,f,dur,acc){
    const c=this.c,gn=c.createGain();this.env(gn,T,.003,dur,acc?.5:.36);
    for(const m of [1,1.498,2]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f*m*(1+rand(-.0015,.0015));o.connect(gn);o.start(T);o.stop(T+dur+.05);}
    gn.connect(this.gtrIn);
  }
  lead(T,f,dur,pk){
    const c=this.c,fl=c.createBiquadFilter(),gn=c.createGain();fl.type='lowpass';fl.Q.value=2;fl.frequency.setValueAtTime(900,T);fl.frequency.linearRampToValueAtTime(2300,T+.08);fl.frequency.setTargetAtTime(1300,T+.08,.3);
    gn.gain.setValueAtTime(0,T);gn.gain.linearRampToValueAtTime(pk,T+.045);gn.gain.setValueAtTime(pk,T+dur*.85);gn.gain.linearRampToValueAtTime(0,T+dur+.12);
    for(const [ty,dt] of [['sawtooth',-5],['square',6]]){const o=c.createOscillator();o.type=ty;o.frequency.value=f;o.detune.value=dt;this.vibG.connect(o.detune);o.connect(fl);o.start(T);o.stop(T+dur+.2);}
    fl.connect(gn);gn.connect(this.leadG);
  }
}
const sfx=new Sfx();
