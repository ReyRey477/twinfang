// ===================== TEXTURES =====================
function canvasTex(w,h,draw,rep,srgb){
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const g=cv.getContext('2d'); draw(g,w,h);
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; if(rep)t.repeat.set(rep[0],rep[1]); t.anisotropy=8;
  if(srgb)t.colorSpace=THREE.SRGBColorSpace; return t;
}
const drawFloor=(g,w,h)=>{
  g.fillStyle='#0b0c0f'; g.fillRect(0,0,w,h); const n=4,s=w/n;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const v=30+random()*20|0;g.fillStyle=`rgb(${v},${v+3},${v+8})`;g.fillRect(i*s+4,j*s+4,s-8,s-8);
    const gr=g.createLinearGradient(i*s,j*s,i*s+s,j*s+s);gr.addColorStop(0,'rgba(255,255,255,.05)');gr.addColorStop(1,'rgba(0,0,0,.18)');g.fillStyle=gr;g.fillRect(i*s+4,j*s+4,s-8,s-8);}
  for(let k=0;k<12000;k++){const a=random()*.07;g.fillStyle=random()<.5?`rgba(255,255,255,${a})`:`rgba(0,0,0,${a*2.4})`;g.fillRect(random()*w,random()*h,1+random()*2,1+random()*2);}
  g.strokeStyle='rgba(0,0,0,.55)'; g.lineWidth=1.3;
  for(let k=0;k<30;k++){let x=random()*w,y=random()*h;g.beginPath();g.moveTo(x,y);for(let q=0;q<7;q++){x+=rand(-45,45);y+=rand(-45,45);g.lineTo(x,y);}g.stroke();}
};
const floorCol=canvasTex(1024,1024,drawFloor,[3.75,24],true);
const floorBump=canvasTex(512,512,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);const n=4,s=w/n;g.fillStyle='#bbb';for(let i=0;i<n;i++)for(let j=0;j<n;j++)g.fillRect(i*s+4,j*s+4,s-8,s-8);
  for(let k=0;k<5000;k++){g.fillStyle=`rgba(${random()<.5?255:0},${random()<.5?255:0},${random()<.5?255:0},.08)`;g.fillRect(random()*w,random()*h,2,2);}},[3.75,24]);
const blotch=canvasTex(512,512,(g,w,h)=>{g.fillStyle='#909090';g.fillRect(0,0,w,h);
  for(let k=0;k<70;k++){const x=random()*w,y=random()*h,r=rand(30,130),dk=random()<.6;
    for(const ox of [-w,0,w])for(const oy of [-h,0,h]){const gr=g.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,r);gr.addColorStop(0,dk?'rgba(20,20,20,.55)':'rgba(230,230,230,.4)');gr.addColorStop(1,'rgba(128,128,128,0)');g.fillStyle=gr;g.fillRect(x+ox-r,y+oy-r,r*2,r*2);}}},[1.6,10]);
const wallCol=canvasTex(512,1024,(g,w,h)=>{g.fillStyle='#24272d';g.fillRect(0,0,w,h);
  for(let j=0;j<4;j++){const y=j*h/4,v=34+random()*12|0;g.fillStyle=`rgb(${v},${v+2},${v+7})`;g.fillRect(6,y+6,w-12,h/4-12);g.fillStyle='rgba(0,0,0,.4)';g.fillRect(6,y+h/4-26,w-12,14);}
  for(let k=0;k<70;k++){const x=random()*w;const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(rand(.2,.8),`rgba(0,0,0,${rand(.1,.35)})`);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x,0,rand(2,14),h);}
  for(let k=0;k<7000;k++){const a=random()*.08;g.fillStyle=random()<.5?`rgba(255,255,255,${a})`:`rgba(0,0,0,${a*2})`;g.fillRect(random()*w,random()*h,2,2);}
  g.fillStyle='rgba(255,255,255,.12)';for(let j=0;j<4;j++)for(const x of [22,w-26]){g.beginPath();g.arc(x,j*h/4+24,4,0,TAU);g.fill();}},[1,1],true);
const bannerTex=canvasTex(256,640,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#104652');gr.addColorStop(1,'#07191e');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.strokeStyle='#b8974e';g.lineWidth=6;g.strokeRect(14,14,w-28,h-28);g.fillStyle='#d2b062';
  for(const s of [-1,1]){g.beginPath();g.moveTo(w/2+s*14,200);g.quadraticCurveTo(w/2+s*86,270,w/2+s*20,440);g.quadraticCurveTo(w/2+s*44,310,w/2+s*14,200);g.fill();}
  g.beginPath();g.arc(w/2,170,16,0,TAU);g.fill();
  g.globalCompositeOperation='destination-out';g.beginPath();g.moveTo(0,h);for(let x=0;x<=w;x+=32){g.lineTo(x,h-rand(10,95));g.lineTo(x+16,h);}g.lineTo(w,h);g.fill();},null,true);
const glowTex=canvasTex(128,128,(g,w)=>{const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.5)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,w,w);});
const streakTex=canvasTex(256,64,(g,w,h)=>{g.translate(w/2,h/2);g.scale(1,.11);const r=g.createRadialGradient(0,0,0,0,0,w/2);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.6)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.beginPath();g.arc(0,0,w/2,0,TAU);g.fill();});
const rayTex=canvasTex(64,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.globalCompositeOperation='destination-in';const g2=g.createLinearGradient(0,0,w,0);g2.addColorStop(0,'rgba(0,0,0,0)');g2.addColorStop(.5,'rgba(0,0,0,1)');g2.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=g2;g.fillRect(0,0,w,h);});
