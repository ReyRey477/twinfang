// ===================== AUDIO =====================
// Two kinds of sound live here.
// The band is made of real recordings (public-domain samples, see src/samples/CREDITS.md, embedded by build.py): an
// acoustic drum kit, an electric guitar that was recorded direct and is played here through a modelled amplifier and
// speaker cabinet, twice (left and right, like a double-tracked record), and a bass. The song is sequenced live so it
// can follow the fight: verse riff and chorus in D minor, with fills, lead guitar and double kick added as the style
// rank climbs. Out of combat a pad and a clean guitar take over.
// Effects are still synthesised at start-up (band-limited noise, saturated crunch, low thumps, electric grit and short
// dense "clank"; nothing holds a pure tone above ~250 Hz, so nothing rings like a bell), and the weapon and impact
// sounds get a layer of recorded steel and air on top. Playback runs through two generated reverbs (machine hall /
// open roof), a bus compressor and a soft clipper.
// Guitar parts are [step, length, kind, semitones above D]: 'c' power chord, 'm' palm-muted note; sixteen steps to a bar.
const MUS={bpm:152,
  VERSE:[
    [[0,2,'c',0],[2,1,'m',0],[3,1,'m',0],[4,2,'m',0],[6,1,'m',0],[7,1,'m',0],[8,2,'c',3],[10,1,'m',0],[11,1,'m',0],[12,2,'c',5],[14,2,'c',3]],
    [[0,2,'c',0],[2,1,'m',0],[3,1,'m',0],[4,2,'m',0],[6,1,'m',0],[7,1,'m',0],[8,2,'c',3],[10,1,'m',0],[11,1,'m',0],[12,2,'c',6],[14,2,'c',5]],
    [[0,2,'c',0],[2,1,'m',0],[3,1,'m',0],[4,2,'m',0],[6,1,'m',0],[7,1,'m',0],[8,2,'c',3],[10,1,'m',0],[11,1,'m',0],[12,2,'c',5],[14,2,'c',3]],
    [[0,2,'c',0],[2,1,'m',0],[3,1,'m',0],[4,2,'m',0],[6,1,'m',0],[7,1,'m',0],[8,2,'c',8],[10,2,'c',8],[12,2,'c',10],[14,2,'c',10]]],
  CHORD:[0,8,10,7,0,3,5,7],                                 // chorus roots, semitones above D: D Bb C A | D F G A
  STRUM:[[0,3],[3,3],[6,2],[8,3],[11,3],[14,2]],            // where the chorus chords land, and how long they ring
  LEAD:[[[0,6,69],[6,2,74],[8,8,77]],[[0,4,77],[4,4,74],[8,8,70]],[[0,6,79],[6,2,76],[8,8,72]],[[0,4,76],[4,4,73],[8,8,69]],
        [[0,6,74],[6,2,77],[8,8,81]],[[0,4,84],[4,4,81],[8,8,77]],[[0,6,82],[6,2,79],[8,8,74]],[[0,4,76],[4,4,81],[8,8,85]]],   // [step, length, MIDI note]
  CALM:[[50,57,65],[46,53,62],[48,55,64],[45,52,61]]};      // exploration chords as MIDI notes: Dm Bb C A
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
        mix(x,shape(grit(bq(noise(1.4),'bp',k=>1900*pow(.45,k),6),55,.8),k=>min(1,k*10)*pow(1-k,1.5)),0,.25);return fin(drive(x,2.4));}]
    };
    const store=(name,chs)=>{const b=c.createBuffer(chs.length,chs[0].length,sr);chs.forEach((d,i)=>b.getChannelData(i).set(d));(this.bank[name]||(this.bank[name]=[])).push(b);
      const w=this.wait;if(w&&w.name===name){this.wait=null;if(performance.now()-w.t<700)this.play(name,w.o);}return b;};
    // ---------- spaces ----------
    const irCh=(len,dk,taps,ch)=>{const x=bq(noise(len),'lp',k=>9000*pow(.12,k),.5),r=exp(-1/(sr*dk));let e=1;for(let i=0;i<x.length;i++){x[i]*=e*(i<300?i/300:1);e*=r;}
      for(const [t,a] of taps)mix(x,dec(bq(noise(.02),'lp',4000),.0005,.006),t*(ch?1.07:1),a);return fin(x,.5);};
    this.sendG=g(.24); this.sfx.connect(this.sendG);
    const hall=c.createConvolver(),roof=c.createConvolver();
    this.hallG=g(1); this.roofG=g(0); this.sendG.connect(hall); this.sendG.connect(roof); hall.connect(this.hallG); roof.connect(this.roofG); this.hallG.connect(this.master); this.roofG.connect(this.master);
    this.mFilter=filt('lowpass',18000,.7); this.duckG=g(1); this.mGain=g(.21); this.mFilter.connect(this.duckG); this.duckG.connect(this.mGain); this.mGain.connect(this.master);
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
    // the recordings: decoded a few at a time in the same queue; grouped by name ("kick_3" -> kick), tuned ones also by MIDI note
    this.smp={}; this.tuned={g:{},bs:{},bt:{}}; this.smpReady=false; this.hallCv=hall;
    const SM=typeof SMP!=='undefined'?SMP:null,names=SM?Object.keys(SM.d):[]; let left=names.length,loaded; this.loaded=new Promise(r=>{loaded=r;}); if(!left)loaded();
    const got=(k,b)=>{if(b){const d=b.getChannelData(0);let o=0,pk=0;for(let i=0;i<d.length;i++)pk=max(pk,abs(d[i]));while(o<d.length&&abs(d[o])<pk*.02)o++;   // skip the decoder's lead-in so hits land on time
        const e={b,o:max(0,o/b.sampleRate-.001),f:SM.f[k]||0},grp=k.slice(0,k.lastIndexOf('_'));(this.smp[grp]||(this.smp[grp]=[])).push(e);
        const m=/^(g|bs|bt)(\d+)$/.exec(grp);if(m)(this.tuned[m[1]][+m[2]]||(this.tuned[m[1]][+m[2]]=[])).push(e);}
      if(--left===0){this.smpReady=true;loaded();}};
    for(let i=0;i<names.length;i+=6)tasks.unshift(()=>{for(const k of names.slice(i,i+6)){const bin=atob(SM.d[k]),u=new Uint8Array(bin.length);for(let j=0;j<bin.length;j++)u[j]=bin.charCodeAt(j);
      c.decodeAudioData(u.buffer).then(b=>got(k,b),()=>got(k,null));}});
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
  whoosh(p=1,g=1){if(p<.62){this.play('swoosh',{rate:.7+p*.6,g:.8*g,jit:.06});this.smpPlay('swh',{rate:.55+p*.5,g:.5*g,jit:.08});}else{this.play('whoosh',{rate:.72+p*.4,g:.6*g,jit:.07});this.smpPlay(g>1.2?'swh':'swl',{rate:.7+p*.3,g:.55*g,jit:.08});}
  }
  hit(pw=.5){if(pw>.6){this.play('hitBig',{g:.8+pw*.2,jit:.06});this.smpPlay('mbig',{rate:.85,g:.5,jit:.1});this.smpPlay('mhit',{rate:.8,g:.35,jit:.1});this.duck(.5,.12);}else{this.play('hit',{g:.6+pw*.5,jit:.07});this.smpPlay('mhit',{rate:1.05,g:.42+pw*.3,jit:.12});}}
  hurt(){this.play('hurt',{g:1});this.smpPlay('mhit',{rate:.66,g:.45,jit:.06});this.duck(.5,.2);}
  telegraph(big){this.play('telegraph',{rate:big?.7:1,g:big?.9:.7});}
  death(){this.play('death',{g:.82,jit:.08});this.smpPlay('mbig',{rate:.75,g:.3,jit:.12});}
  dodge(){this.play('dodge',{g:.8});}
  jump(){this.play('jump',{g:.6});}
  step(){this.play('step',{g:.34,jit:.08});}
  land(pw=.3){this.play('land',{g:.22+pw*.75,rate:1.1-pw*.25});if(pw>.6)this.smpPlay('mbig',{rate:.62,g:.3*pw,jit:.08});}
  glint(){this.play('glint',{g:.7});}
  rankUp(i){this.play('rank',{rate:.8*pow(2,i/6),g:.7,jit:0});}
  barrier(){this.play('barrier',{g:.8});}
  boom(){this.play('boom',{g:1,late:1});this.duck(.35,.3);}
  slow(on){if(!this.ok)return;const c=this.c;this.mFilter.frequency.cancelScheduledValues(c.currentTime);this.mFilter.frequency.setTargetAtTime(on?420:18000,c.currentTime,on?.05:.25);if(on)this.play('warp',{g:.7});}
  gun(){this.play('gun',{g:.5,jit:.05});}
  orb(){this.play('orb',{g:.5});}
  deflect(){this.play('deflect',{g:.85});this.smpPlay('mhit',{rate:1.45,g:.5,jit:.08});this.smpPlay('shing',{rate:1.2,g:.3,jit:.05});}
  thunder(v=1){this.play('thunder',{g:.9*v,jit:.1});if(v>.8)this.duck(.5,.4);}
  roar(){this.play('roar',{g:1});this.smpPlay('growl',{rate:.52,g:.7,jit:.05});this.smpPlay('growl',{rate:.4,g:.5,jit:.05});this.duck(.4,.8);}
  armorBreak(){this.play('shatter',{g:1});this.smpPlay('mbig',{rate:.7,g:.6,jit:.06});this.duck(.4,.3);}
  ready(){this.play('ready',{g:.7,jit:0});}
  swap(){this.play('swap',{g:.7});this.smpPlay('shing',{rate:1.1,g:.22,jit:.08});}
  pickup(){this.play('pickup',{g:.6,jit:0});}
  spawn(){this.play('spawn',{g:.45,jit:.08});}
  charge(){this.play('charge',{g:.6});}
  coreCharge(){this.play('core',{g:.7,jit:0});}
  // ---------- samples ----------
  // play one recording from a group (round robin): o.g gain, o.rate pitch, o.jit pitch spread, o.at start time, o.dest bus
  smpPlay(group,o={}){
    const set=this.ok&&this.smp[group]; if(!set||!set.length)return null; const c=this.c,T=o.at??c.currentTime;
    let v=floor(random()*set.length); if(set.length>1&&v===this.lastV[group])v=(v+1)%set.length; this.lastV[group]=v;
    const e=set[v],s=c.createBufferSource(),gn=c.createGain(); s.buffer=e.b; s.playbackRate.value=(o.rate??1)*(1+rand(-1,1)*(o.jit??.04)); gn.gain.value=o.g??1;
    s.connect(gn); gn.connect(o.dest||this.sfx); s.start(T,e.o); return s;
  }
  // a tuned recording (guitar 'g', bass 'bs' / 'bt') nearest to a MIDI note, with the playback rate that puts it exactly in tune
  note(kind,midi,rr=0){
    const M=this.tuned[kind]; if(!M)return null; let best=null,bd=99; for(const m in M){const d=abs(m-midi);if(d<bd){bd=d;best=m;}} if(best===null)return null;
    const set=M[best],e=set[rr%set.length]; return {b:e.b,o:e.o,rate:440*pow(2,(midi-69)/12)/e.f};
  }
  // ---------- music ----------
  // A guitar amplifier in filters and wave shapers: tighten the lows, push the mids, two clipping stages, then a
  // speaker cabinet (low cut, chest thump, scooped low mids, presence peak, a notch, a steep roll-off above 5 kHz).
  amp(drive,pan,level,lead){
    const c=this.c,g=this.g_,f=this.filt_,pk=(fr,db,q)=>{const b=f('peaking',fr,q);b.gain.value=db;return b;};
    const sh=(k,bias)=>{const w=c.createWaveShaper(),n=2048,cv=new Float32Array(n),o=Math.tanh(k*bias);for(let i=0;i<n;i++)cv[i]=(Math.tanh(k*(i/(n/2)-1+bias))-o)/Math.tanh(k);w.curve=cv;w.oversample='4x';return w;};
    const chain=[g(1),f('highpass',lead?260:125,.7),pk(lead?1100:780,lead?8:6,.8),g(drive),sh(3.2,.07),f('lowpass',6800,.6),f('highpass',170,.7),g(2.1),sh(2.5,-.04),
      f('highpass',88,.8),pk(128,lead?1:4,1.1),pk(250,lead?-2:-4,1),pk(380,lead?-3:-6,.9),pk(1100,lead?0:-4,.8),pk(3200,4.5,1.1),pk(4300,-6,5),f('lowpass',5300,.9),f('lowpass',6600,.7),g(level)];
    for(let i=1;i<chain.length;i++)chain[i-1].connect(chain[i]);
    const pn=c.createStereoPanner();pn.pan.value=pan;chain[chain.length-1].connect(pn);pn.connect(this.gtrBus);this.ampOut=pn;return chain[0];
  }
  startMusic(){
    const c=this.c,g=this.g_,filt=this.filt_,lfo=(hz,depth,param)=>{const o=c.createOscillator(),d=g(depth);o.frequency.value=hz;o.connect(d);d.connect(param);o.start();return d;};
    this.cmb=g(0); this.cmb.connect(this.mFilter);                 // the band: only in combat
    // drums: every piece has its place in the stereo picture; the kit shares a compressor and a little of the hall
    this.drumBus=g(1); const dc=c.createDynamicsCompressor(); dc.threshold.value=-16; dc.knee.value=6; dc.ratio.value=3.5; dc.attack.value=.006; dc.release.value=.14;
    const dOut=g(.95); this.drumBus.connect(dc); dc.connect(dOut); dOut.connect(this.cmb); const dRoom=g(.16); this.drumBus.connect(dRoom); dRoom.connect(this.hallCv);
    this.dPan={}; for(const [k,p] of Object.entries({kick:0,kickb:0,sn:0,snc:0,sng:0,hh:.3,hhs:.3,hht:.3,hho:.3,t1:-.4,t2:-.15,t3:.2,t4:.45,crash:-.45,china:.55})){const pn=c.createStereoPanner();pn.pan.value=p;pn.connect(this.drumBus);this.dPan[k]=pn;}
    // guitars: the same part played twice, left and right, each through its own amplifier; a third amplifier for the lead
    this.gtrBus=g(1); this.gtrBus.connect(this.cmb);
    this.ampL=this.amp(4.2,-.82,.2); this.ampR=this.amp(4.8,.82,.2); this.ampLead=this.amp(8,.08,.15,true);
    const dl=c.createDelay(1),fb=g(.3),wet=g(.3); dl.delayTime.value=60/MUS.bpm*.75; this.ampOut.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(this.cmb);   // the lead gets a dotted-eighth echo
    // bass: a little grit, then straight down the middle; it dips a touch under every kick
    this.pump=g(1); this.pump.connect(this.cmb);
    this.bassIn=g(1.1); const bd=this.shaper_(1.7),bl=filt('lowpass',850,.7),bh=filt('highpass',36,.7),bs=filt('lowshelf',130,.7),bm=filt('peaking',520,.9),bo=g(.5); bs.gain.value=6; bm.gain.value=-6;
    this.bassIn.connect(bd); bd.connect(bl); bl.connect(bh); bh.connect(bs); bs.connect(bm); bm.connect(bo); bo.connect(this.pump);
    // out of combat: a dark pad and a clean guitar picking through the chord, with a long echo
    this.padLP=filt('lowpass',480,.8); this.padG=g(0); this.padLP.connect(this.padG); this.padG.connect(this.mFilter); lfo(.06,140,this.padLP.frequency);
    this.padG.gain.linearRampToValueAtTime(.5,c.currentTime+3); this.padVs=[];
    this.cleanIn=g(1); const cl=filt('lowpass',3600,.7),ch=filt('highpass',140,.7),cd=c.createDelay(1),cf=g(.42),cw=g(.5); this.cleanG=g(0); cd.delayTime.value=60/MUS.bpm*1.5;
    this.cleanIn.connect(ch); ch.connect(cl); cl.connect(this.cleanG); cl.connect(cd); cd.connect(cf); cf.connect(cd); cd.connect(cw); cw.connect(this.cleanG); this.cleanG.connect(this.mFilter);
    const cs=g(.5); this.cleanG.connect(cs); cs.connect(this.hallCv); this.cleanG.gain.linearRampToValueAtTime(1,c.currentTime+2);
    this.spb=60/MUS.bpm/4; this.stepN=0; this.nextT=c.currentTime+.1; this.intensity=0; this.combat=false;
  }
  tick(combat,intensity,dt){
    if(!this.ok)return; const c=this.c,now=c.currentTime;
    // which space are we in? (0 hall, 1 roof)
    const w=typeof G!=='undefined'&&G.player&&G.player.pos.z>262?1:0;
    if(w!==this.where){this.where=w;this.hallG.gain.setTargetAtTime(w?.15:1,now,.5);this.roofG.gain.setTargetAtTime(w?1:0,now,.5);this.bedHall.gain.setTargetAtTime(w?0:.1,now,1);this.bedRain.gain.setTargetAtTime(w?.15:0,now,1);}
    if(combat!==this.combat){   // the band comes in on the downbeat with a crash; out of combat it rings out and the pad and clean guitar return
      this.combat=combat;this.stepN=0;this.nextT=now+.06;this.cmb.gain.setTargetAtTime(combat?1:0,now,combat?.02:.5);this.padG.gain.setTargetAtTime(combat?.16:.5,now,.6);this.cleanG.gain.setTargetAtTime(combat?0:1,now,combat?.05:1.2);
      for(const v of this.padVs){if(v.gain.cancelAndHoldAtTime)v.gain.cancelAndHoldAtTime(now);else v.gain.cancelScheduledValues(now);v.gain.setTargetAtTime(0,now,.15);}}
    this.intensity=intensity;
    const pf=combat?700+intensity*160:520;if(pf!==this.padF){this.padF=pf;this.padLP.frequency.setTargetAtTime(pf,now,.7);}
    if(this.nextT<now-.2)this.nextT=now+.05;
    while(this.nextT<now+.14){this.sched(this.stepN++,this.nextT);this.nextT+=this.spb;}
  }
  // ----- players -----
  drum(name,T,gain=1,rate=1){const set=this.smp[name];if(!set)return;const e=set[floor(random()*set.length)],c=this.c,s=c.createBufferSource(),gn=c.createGain();s.buffer=e.b;s.playbackRate.value=rate*(1+rand(-.012,.012));gn.gain.value=gain*rand(.88,1);
    s.connect(gn);gn.connect(this.dPan[name]||this.drumBus);s.start(T,e.o);
    if(name==='kick'){const p=this.pump.gain;p.setTargetAtTime(.6,T-.004,.003);p.setTargetAtTime(1,T+.02,.07);}}
  // one guitar event on one side: kind 'm' is a palm-muted note (damped highs, dies in a tenth of a second), 'c' a power chord
  // (root, fifth, octave summed BEFORE the amplifier, which is where the growl of a real power chord comes from)
  gtr(dest,rr,T,kind,root,dur){
    const c=this.c,notes=kind==='c'?[[0,1],[7,.82],[12,.6]]:[[0,1.25]];T+=rand(0,.007);
    for(const [iv,lv] of notes){const n=this.note('g',root+iv,rr+(iv?1:0));if(!n)return;const s=c.createBufferSource(),gn=c.createGain();s.buffer=n.b;s.playbackRate.value=n.rate*(1+rand(-.0018,.0018));
      if(kind==='m'){const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1500;lp.Q.value=.7;gn.gain.setValueAtTime(lv,T);gn.gain.setTargetAtTime(0,T+.016,.017);s.connect(lp);lp.connect(gn);s.start(T,n.o);s.stop(T+.16);}
      else{gn.gain.setValueAtTime(lv,T);gn.gain.setValueAtTime(lv,T+dur-.02);gn.gain.linearRampToValueAtTime(0,T+dur+.012);s.connect(gn);s.start(T,n.o);s.stop(T+dur+.03);}
      gn.connect(dest);}
    if(kind==='m'&&this.smp.gm){const e=this.smp.gm[(rr+floor(random()*3))%this.smp.gm.length],s=c.createBufferSource(),gn=c.createGain();s.buffer=e.b;gn.gain.value=.45;s.connect(gn);gn.connect(dest);s.start(T,e.o);}
  }
  bass(T,midi,dur,stac){const n=this.note(stac?'bt':'bs',midi,floor(random()*2));if(!n)return;const c=this.c,s=c.createBufferSource(),gn=c.createGain();s.buffer=n.b;s.playbackRate.value=n.rate;
    gn.gain.setValueAtTime(stac?.9:1,T);gn.gain.setValueAtTime(stac?.9:1,T+dur-.02);gn.gain.linearRampToValueAtTime(0,T+dur+.03);s.connect(gn);gn.connect(this.bassIn);s.start(T,n.o);s.stop(T+dur+.05);}
  lead(T,midi,dur,lv=1){const n=this.note('g',midi,0);if(!n)return;const c=this.c,s=c.createBufferSource(),gn=c.createGain(),vo=c.createOscillator(),vd=c.createGain();s.buffer=n.b;s.playbackRate.value=n.rate;
    vo.frequency.value=5.6;vd.gain.setValueAtTime(0,T);vd.gain.setValueAtTime(0,T+min(.18,dur*.4));vd.gain.linearRampToValueAtTime(28,T+min(.5,dur));vo.connect(vd);vd.connect(s.detune);vo.start(T);vo.stop(T+dur+.1);
    gn.gain.setValueAtTime(lv,T);gn.gain.setValueAtTime(lv,T+dur-.03);gn.gain.linearRampToValueAtTime(0,T+dur+.04);s.connect(gn);gn.connect(this.ampLead);s.start(T,n.o);s.stop(T+dur+.06);}
  pluck(T,midi,lv){const n=this.note('g',midi,0);if(!n)return;const c=this.c,s=c.createBufferSource(),gn=c.createGain();s.buffer=n.b;s.playbackRate.value=n.rate;gn.gain.setValueAtTime(lv,T);gn.gain.setTargetAtTime(0,T+.5,.5);s.connect(gn);gn.connect(this.cleanIn);s.start(T,n.o);s.stop(T+2.2);}
  pad(T,roots,dur){
    const c=this.c,vg=c.createGain(),e=T+dur;vg.gain.setValueAtTime(0,T);vg.gain.linearRampToValueAtTime(.1,T+min(.7,dur*.3));vg.gain.setValueAtTime(.1,e);vg.gain.linearRampToValueAtTime(0,e+.9);vg.connect(this.padLP);
    for(const dt of [-7,7]){const pn=c.createStereoPanner();pn.pan.value=dt/14;pn.connect(vg);for(const m of roots){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=440*pow(2,(m-69)/12);o.detune.value=dt;o.connect(pn);o.start(T);o.stop(e+1);}}
    this.padVs.push(vg);if(this.padVs.length>3)this.padVs.shift();
  }
  // one sixteenth-note step of the song: sixteen bars, eight of verse riff then eight of chorus
  sched(n,T){
    const M=MUS,s=n%16,spb=this.spb,I=this.intensity;
    if(!this.combat){   // exploration: a pad chord every two bars and a clean guitar walking up through it
      const bar=(n>>4)%8,ch=M.CALM[bar>>1];if(n%32===0)this.pad(T,[ch[0]-12,ch[0],ch[1],ch[2]],spb*32);
      if(this.smpReady&&s%4===0){const k=((n%32)>>2);const m=[ch[0],ch[1],ch[2],ch[1]+12,ch[2],ch[1],ch[0]+12,-1][k];if(m>0)this.pluck(T,m+12,.5);}
      return;}
    if(!this.smpReady)return;
    const bar=(n>>4)%16,chorus=bar>=8,cb=bar-8,phraseEnd=bar%4===3,last=bar===7||bar===15;
    let ev;   // this bar's guitar part
    if(!chorus)ev=M.VERSE[bar%4];
    else{const r=M.CHORD[cb];ev=(cb%4===3?M.STRUM.slice(0,3).map(([st,ln])=>[st,ln,'c',r]).concat([8,9,10,11,12,13,14,15].map(st=>[st,1,'m',r])):M.STRUM.map(([st,ln])=>[st,ln,'c',r]));}
    if(s===0)this.pad(T,chorus?[38+M.CHORD[cb]+12,38+M.CHORD[cb]+19,38+M.CHORD[cb]+24]:[50,57,62],spb*16);
    let kick=false,chug=false;
    for(const [st,ln,kind,semi] of ev)if(st===s){const dur=ln*spb;
      this.gtr(this.ampL,0,T,kind,38+semi,dur);this.gtr(this.ampR,1,T,kind,38+semi,dur);
      this.bass(T,26+semi,kind==='m'?spb*.9:dur,kind==='m');kick=true;chug=kind==='m';}
    // drums: the kick locks to the guitar, snare on two and four, cymbals by section and intensity
    const fill=last&&s>=8&&I>=1,dbl=chorus&&I>=4;
    if(fill){if(s<12)this.drum(s%2?'snc':'sn',T,.6+(s-8)*.08);else this.drum(['t1','t2','t3','t4'][s-12],T,.95);if(s===8||s===12)this.drum('kick',T,.9);}
    else{
      if(kick&&!(chug&&(s%4===3||s===4)&&!dbl))this.drum('kick',T,1);else if(dbl)this.drum('kickb',T,.8);
      if(s===4||s===12)this.drum('sn',T,.95);else if(!chorus&&I>=1&&(s===7||s===9)&&bar%2)this.drum('sng',T,.7);
      if(chorus){if(I>=4&&s%4===0)this.drum('china',T,.42);else if(s%2===0)this.drum(I>=2?'hho':'hh',T,I>=2?(s%4?.2:.3):(s%4?.3:.45),1);}
      else if(s%2===0)this.drum(s%4?'hhs':'hh',T,s%4?.6:.42);else if(I>=3)this.drum('hht',T,.16);
    }
    if(s===0&&(bar%4===0)&&(chorus||I>=1||bar===0))this.drum('crash',T,chorus?.5:.4,bar%8?1:.94);
    // lead guitar over the chorus once the fight is going well
    if(chorus&&I>=3)for(const [st,ln,m] of M.LEAD[cb])if(st===s){this.lead(T,m,ln*spb,1);if(I>=4)this.lead(T+.012,m-12,ln*spb,.7);}
  }
}
const sfx=new Sfx();
