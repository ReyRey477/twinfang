// ===================== COMBAT DATA =====================
// The hero: white lacquered shell over a dark mechanical core, slate-blue secondary plates, teal power.
// Foes: dark iron lit amber (or violet for stalkers).
const heroMats={
  shell:pbr('shell',{color:0xdde0e7,envMapIntensity:.9}),
  shell2:pbr('shell',{color:0x4d5e80,envMapIntensity:.9}),
  frame:pbr('plate',{color:0x9aa0ac,envMapIntensity:.6}),
  steel:pbr('steel',{color:0x8d95a2,envMapIntensity:1}),
  visor:pbr('steel',{color:0x161a20,roughness:.6,envMapIntensity:1.4}),
  brass:pbr('steel',{color:0xc9964a,envMapIntensity:1}),
  rubber:pbr('rubber',{envMapIntensity:.3}),
  blade:pbr('steel',{color:0xdcefff,roughness:.5,envMapIntensity:1.8}),
  glow:new THREE.MeshBasicMaterial({color:hdr(0x45d4ff,2.6)})};
const enemyMats=k=>{const B=k==='brute',S=k==='stalker';return {
  armor:pbr('armor',{color:B?0x66754a:S?0x3a3654:0x9a927f,emissive:S?0xa050ff:0xff6a2a,emissiveIntensity:0,envMapIntensity:.9}),
  frame:pbr('plate',{color:0x9098a4,envMapIntensity:.6}),
  trim:pbr('steel',{color:B?0x8a8672:S?0x6c648c:0x767c88,envMapIntensity:.9}),
  rubber:pbr('rubber',{envMapIntensity:.3}),
  blade:pbr('steel',{color:0xb8bcc6,roughness:.6,envMapIntensity:1.4}),
  glow:new THREE.MeshBasicMaterial({color:hdr(S?0xa040ff:0xff4d14,3.4)})};};
const wardenMats=()=>({
  armor:pbr('armor',{color:0x6e645a,emissive:0xff6a2a,emissiveIntensity:0,envMapIntensity:1.1}),
  dark:pbr('plate',{color:0x8a8a90,emissive:0xff4a14,emissiveIntensity:0,envMapIntensity:.6}),
  trim:pbr('steel',{color:0xb8843c,envMapIntensity:1.1}),
  cloth:pbr('armor',{color:0x6a1c20,envMapIntensity:.7}),
  rubber:pbr('rubber',{envMapIntensity:.3}),
  blade:pbr('steel',{color:0x8a8e98,roughness:.6,envMapIntensity:1.5}),
  glow:new THREE.MeshBasicMaterial({color:hdr(0xff5a14,3.6)})});

// Each weapon set maps the attack buttons to moves. `heavy:null` means the pistol.
const WEAPONS=[
  {name:'TWIN FANGS',light:'L1',heavy:'LAUNCH',airHeavy:'SLAM',rush:'RUSH',trail:[[.5,1.28],[.5,1.28]],col:0x45d4ff},
  {name:'BLADE & PISTOL',light:'S1',heavy:null,airHeavy:null,rush:'SLAUNCH',trail:[null,[.55,1.62]],col:0x45d4ff},
  {name:'GREAT MAUL',light:'M1',heavy:'MCH',airHeavy:'MPOUND',rush:'RUSH',trail:[null,[.72,1.22]],col:0xffb060}];
const launchHit={t:.155,dmg:10,arc:2.5,kb:.6,launch:12.6,stop:.09,shake:.32,pts:16,big:true,h:3.6};
const MOVES={
  L1:{clip:CL.L1,dur:.44,cancel:.2,free:.3,lunge:[.02,.14,3.2],trail:[.04,.24,2],sw:[.07],next:'L2',airNext:'L2',
    hits:[{t:.115,dmg:9,kb:2.5,stop:.045,shake:.16,pts:11}]},
  L2:{clip:CL.L2,dur:.6,cancel:.2,free:.34,lunge:[.02,.14,2.6],trail:[.04,.24,1],sw:[.07],next:'L3',airNext:'SPIKE',pauseAt:.38,pauseNext:'FLURRY',
    hits:[{t:.115,dmg:9,kb:2.5,stop:.045,shake:.16,pts:11}]},
  L3:{clip:CL.L3,dur:.52,cancel:.25,free:.38,lunge:[.06,.18,2.4],trail:[.08,.3,3],sw:[.12,.17],next:'L4',
    hits:[{t:.15,dmg:7,kb:1,stop:.035,shake:.14,pts:9},{t:.2,dmg:8,kb:3,stop:.06,shake:.22,pts:11}]},
  L4:{clip:CL.L4,dur:.7,cancel:.47,free:.58,lunge:[.1,.34,2.6],trail:[.1,.47,3],sw:[.14,.27],big:true,track:.1,
    hits:[{t:.2,dmg:8,range:2.9,arc:7,kb:2,stop:.04,shake:.2,pts:10},{t:.33,dmg:16,range:3.1,arc:7,kb:10,down:true,stop:.12,shake:.5,pts:24,big:true}]},
  FLURRY:{clip:CL.flurry,dur:1,cancel:.82,free:.9,lunge:[0,.6,1.6],trail:[0,.86,3],sw:[.03,.15,.27,.39,.51,.68],track:.6,
    hits:[0,1,2,3,4].map(n=>({t:.06+n*.12,dmg:4,kb:.5,stop:.03,shake:.1,pts:6})).concat([{t:.72,dmg:15,range:2.8,kb:10,down:true,stop:.12,shake:.5,pts:24,big:true}])},
  LAUNCH:{clip:CL.launch,dur:.5,cancel:.3,free:.4,lunge:[.06,.16,2.2],trail:[.1,.3,2],sw:[.12],rise:'heavy',pitch:.8,big:true,hits:[launchHit]},
  RUSH:{clip:CL.rush,rush:true,dur:.62,cancel:.42,free:.52,trail:[.1,.44,2],sw:[.12],pitch:1.3,big:true,track:.14,
    hits:[{t:99,dmg:13,range:2.1,arc:1.6,kb:9,stop:.11,shake:.4,pts:16,big:true}]},
  SPIKE:{clip:CL.spike,dur:.46,cancel:.3,free:.4,lunge:[.06,.18,1.6],trail:[.08,.28,3],sw:[.13],pitch:.85,big:true,
    hits:[{t:.165,dmg:14,kb:2,spike:true,stop:.11,shake:.4,pts:18,big:true}]},
  SLAM:{clip:CL.slam,dive:true,land:'SLAMLAND',dur:9,cancel:99,free:99,trail:[0,9,3],sw:[.03],pitch:.7,big:true,track:.2,hits:[]},
  SLAMLAND:{clip:CL.slamLand,dur:.5,cancel:.3,free:.42,trail:[0,.08,3],track:0,
    hits:[{t:0,dmg:16,range:3.5,arc:7,kb:3,launch:7.5,stop:.13,shake:.65,pts:20,big:true,h:3}]},
  // blade & pistol
  S1:{clip:CL.L1,dur:.44,cancel:.2,free:.3,lunge:[.02,.14,3.4],trail:[.04,.24,2],sw:[.07],next:'S2',airNext:'S2',pitch:.9,
    hits:[{t:.115,dmg:11,range:3,kb:2.5,stop:.05,shake:.17,pts:11}]},
  S2:{clip:CL.S2,dur:.46,cancel:.2,free:.32,lunge:[.02,.14,2.6],trail:[.04,.24,2],sw:[.07],next:'S3',airNext:'SPIKE',pitch:.9,
    hits:[{t:.115,dmg:11,range:3,kb:2.5,stop:.05,shake:.17,pts:11}]},
  S3:{clip:CL.launch,dur:.5,cancel:.28,free:.4,lunge:[.06,.16,2.2],trail:[.1,.3,2],sw:[.12],pitch:.8,big:true,hits:[Object.assign({},launchHit,{dmg:12,range:3})]},
  SLAUNCH:{clip:CL.launch,dur:.5,cancel:.28,free:.4,lunge:[.06,.16,3],trail:[.1,.3,2],sw:[.12],rise:'rush',pitch:.8,big:true,hits:[Object.assign({},launchHit,{dmg:12,range:3})]},
  // great maul
  M1:{clip:CL.M1,dur:.9,cancel:.42,free:.62,lunge:[.1,.3,2.6],trail:[.12,.5,2],sw:[.2],next:'M2',pitch:.55,big:true,commit:true,track:.22,
    hits:[{t:.25,dmg:17,range:3.4,arc:3.4,kb:6.5,stop:.1,shake:.36,pts:15,big:true,maul:true}]},
  M2:{clip:CL.M2,dur:.9,cancel:.42,free:.62,lunge:[.1,.3,2.6],trail:[.12,.5,2],sw:[.2],next:'M3',pitch:.55,big:true,commit:true,track:.22,
    hits:[{t:.25,dmg:17,range:3.4,arc:3.4,kb:6.5,stop:.1,shake:.36,pts:15,big:true,maul:true}]},
  M3:{clip:CL.M3,dur:.95,cancel:.6,free:.75,lunge:[.3,.42,2.4],trail:[.3,.5,2],sw:[.36],pitch:.5,big:true,commit:true,track:.36,
    hits:[{t:.42,dmg:24,range:3.6,arc:2.6,kb:4,down:true,stop:.14,shake:.6,pts:22,big:true,maul:true,ring:true}]},
  MCH:{clip:CL.mCharge,charge:true,dur:9,cancel:99,free:99,trail:[9,9,0],hits:[],track:9},
  MSMASH:{clip:CL.mSmash,dur:.62,cancel:.38,free:.5,lunge:[.02,.12,2.2],trail:[0,.2,2],sw:[.04],pitch:.45,big:true,commit:true,track:.08,
    hits:[{t:.13,dmg:20,range:3.6,arc:2.6,kb:4,down:true,stop:.14,shake:.6,pts:20,big:true,maul:true,ring:true}]},
  MPOUND:{clip:CL.slam,dive:true,land:'MPOUNDLAND',dur:9,cancel:99,free:99,trail:[0,9,2],sw:[.03],pitch:.5,big:true,track:.2,hits:[]},
  MPOUNDLAND:{clip:CL.slamLand,dur:.55,cancel:.34,free:.45,trail:[0,.08,2],track:0,
    hits:[{t:0,dmg:20,range:4.3,arc:7,kb:2,launch:9.5,stop:.15,shake:.75,pts:22,big:true,h:3.4,maul:true}]}
};
for(const k in MOVES)MOVES[k].id=k;

// ---------- encounters ----------
const inset=(a,m)=>({x0:a.x0+m,x1:a.x1-m,z0:a.z0+m,z1:a.z1-m});
const inRect=(p,r)=>p.x>=r.x0&&p.x<=r.x1&&p.z>=r.z0&&p.z<=r.z1;
const corEnc=(id,z0,z1,trig,tokens,waves)=>{
  box(HW*2-2,.02,.12,amberGlow,0,.013,z0,false); box(HW*2-2,.02,.12,amberGlow,0,.013,z1,false);
  return {id,ar:{x0:-PLAY_X,x1:PLAY_X,z0:z0+.7,z1:z1-.7},gy:0,ceil:H,trig:p=>p.z>trig,bars:[makeBarrier(0,0,z0,HW*2,H),makeBarrier(0,0,z1,HW*2,H)],tokens,waves};
};
const roomEnc=(id,tokens,waves)=>{const a=AREA[id],t=inset(a,3);return {id,ar:inset(a,.8),gy:a.y,ceil:a.ceil,trig:p=>inRect(p,t),bars:areaBarriers(id),tokens,waves};};
const ENCS=[
  corEnc('c1',15,37,19,2,[
    [['husk',-3,29],['husk',0,30],['husk',3,29],['husk',-2,33],['husk',2,33],['husk',0,35]],
    [['husk',-3.5,20],['husk',3.5,20],['husk',-3,33],['husk',3,33],['stalker',-2,26],['stalker',2,27]]]),
  corEnc('c2',46,72,51,3,[
    [['husk',-3.5,60],['husk',3.5,60],['husk',-1.5,63],['husk',1.5,63],['brute',-2,67],['brute',2,67]],
    [['husk',-3.5,50],['husk',3.5,50],['husk',-3.5,68],['husk',3.5,68],['stalker',-1.5,58],['stalker',1.5,60]],
    [['husk',-3.5,52],['husk',3.5,66],['stalker',-2,57],['stalker',2,61],['stalker',0,64],['brute',0,59]]]),
  {id:'warden',boss:'warden',ar:inset(AREA.hall,1),gy:0,ceil:16,trig:p=>p.z>97,bars:[openingBarrier(AREA.hall,AREA.hall.openings.find(o=>o.o.id==='gate'))],tokens:1,waves:[]},
  roomEnc('A',2,[
    [['husk',14,198],['husk',30,198],['husk',18,202],['husk',26,202],['lantern',22,200]],
    [['husk',12,188],['husk',32,188],['husk',22,203],['stalker',16,196],['stalker',28,196],['lantern',22,190]]]),
  roomEnc('B',3,[
    [['brute',-28,198],['brute',-16,198],['husk',-30,186],['husk',-14,186],['lantern',-22,200]],
    [['stalker',-28,190],['stalker',-16,190],['stalker',-22,198],['husk',-32,202],['husk',-12,202],['lantern',-22,186]]]),
  roomEnc('C',3,[
    [['husk',-10,246],['husk',10,246],['husk',-5,250],['husk',5,250],['lantern',-8,240],['lantern',8,240]],
    [['brute',-8,248],['brute',8,248],['stalker',-6,238],['stalker',6,238],['lantern',0,250]],
    [['husk',-12,234],['husk',12,234],['husk',0,250],['stalker',-8,244],['stalker',8,244],['lantern',-6,250],['lantern',6,250]]]),
  {id:'storm',boss:'storm',ar:inset(AREA.roof,1.2),gy:19,ceil:99,trig:p=>p.z>288,bars:[openingBarrier(AREA.roof,AREA.roof.openings.find(o=>o.o.id==='r4'))],tokens:1,waves:[]}
];
const CHECKPOINTS=[{x:21.5,y:14,z:167.5},{x:0,y:14,z:258}];
