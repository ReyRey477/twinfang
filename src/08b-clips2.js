// ===================== CLIPS 2: new weapon sets and bosses =====================
const tK=(keys,f)=>keys.map(k=>[k[0]*f,k[1],k[2]]);
const mirClip=c=>({dur:c.dur,noAir:c.noAir,fn(t,o,r){c.fn(t,o,r);o.set(mir(o));}});
{
  // backhand: right arm travels from the left side back to the right
  const gl=AL([.6,-.5,-.2],.44,[.5,-.3,-.8]);
  const S2K=[
    [0,  P({hy:-.12,hip:[.08,.4,0],ch:[.05,.6,0],hd:[-.08,-.85,0],...AR([.75,-.1,.6],.55,[.95,0,.3]),...gl,fl:[.2,0,.3],fr:[-.22,0,-.3]},ATK)],
    [.07,P({hy:-.14,hip:[.08,.45,0],ch:[.05,.7,0],hd:[-.08,-.95,0],...AR([.8,-.05,.5],.55,[1,.05,.15]),...gl,fl:[.2,0,.3],fr:[-.22,0,-.3]},ATK)],
    [.12,P({hy:-.2,hip:[.14,.05,0],ch:[.1,-.05,0],hd:[-.12,0,0],...AR([-.2,.05,1],.6,[-.15,.05,1]),...AL([.5,-.55,.1],.44,[.4,-.1,.9]),fl:[.2,0,.45],fr:[-.22,0,-.38]},ATK),'in'],
    [.18,P({hy:-.2,hip:[.14,-.3,0],ch:[.1,-.6,0],hd:[-.12,.8,0],...AR([-1,.15,-.25],.57,[-.9,.2,-.4]),...AL([.4,-.5,.5],.44,[.2,.2,.9]),fl:[.2,0,.45],fr:[-.22,0,-.38]},ATK),'lin'],
    [.44,P({hy:-.16,hip:[.1,-.35,0],ch:[.08,-.65,0],hd:[-.1,.9,0],...AR([-1,-.1,-.3],.52,[-.9,-.1,-.45]),...AL([.4,-.5,.5],.44,[.2,.2,.9]),fl:[.2,0,.42],fr:[-.22,0,-.36]},ATK),'out']];
  CL.S2=K(S2K);
  // maul: the same arcs, slower; the left hand follows the shaft automatically
  CL.M1=K(tK(L1K,2.1)); CL.M2=K(tK(S2K,2.1));
  const md=P({hy:-.36,hip:[.45,0,0],ch:[.5,0,0],hd:[-.6,0,0],...AR([-.08,-.7,.7],.58,[-.03,-.6,.8]),fl:[.22,0,.5],fr:[-.22,0,-.4]},ATK);
  const mm=P({hy:-.2,ch:[.1,0,0],...AR([-.1,.3,1],.6,[-.05,.5,.9])},ATK);
  CL.M3=K([
    [0,  P({hy:-.1,hip:[-.05,0,0],ch:[-.25,0,0],hd:[.1,0,0],...AR([-.15,1,-.2],.58,[-.1,.85,-.5])},ATK)],
    [.3, P({hy:-.06,hip:[-.1,0,0],ch:[-.38,0,0],hd:[.15,0,0],...AR([-.15,1,-.4],.58,[-.1,.7,-.7])},ATK)],
    [.37,mm,'in'],[.43,md,'lin'],[.8,md]]);
  const mc=P({hy:-.28,hip:[.1,-.3,0],ch:[-.2,-.3,0],hd:[.05,.6,0],...AR([-.35,.9,-.45],.56,[-.25,.55,-.8]),fl:[.24,0,.4],fr:[-.24,0,-.42]},ATK);
  CL.mCharge={dur:9,fn(t,o){const k=smooth(sat(t/.3));for(let j=0;j<PN;j++)o[j]=ATK[j]+(mc[j]-ATK[j])*k;const s=min(1,t);o[I.hr]+=sin(t*47)*.006*s;o[I.hr+1]+=sin(t*53)*.005*s;o[I.hy]+=sin(t*31)*.004*s;}};
  CL.mSmash=K([[0,mc],[.07,mm,'in'],[.13,md,'lin'],[.6,md]]);
  // bosses
  CL.eWindM=mirClip(CL.eWind); CL.eStrikeM=mirClip(CL.eStrike);
  const KN=P({hy:-.52,hip:[.45,0,0],ch:[.5,0,0],hd:[.45,0,0],...AL([.3,-.9,.35],.52,[.1,-.9,.3]),...AR([-.3,-.9,.35],.52,[-.2,-.35,.9]),fl:[.24,0,.4],fr:[-.24,0,-.5]},E_IDLE);
  CL.kneel={fn(t,o,r){o.set(KN);const w=sin(t*3+r.seed);o[I.ch]+=w*.04;o[I.hd]+=w*.05;o[I.hip+2]=sin(t*1.7)*.05;}};
  const WD=P({rot:[1.45,0,0],by:-.82,hy:-.1,hip:[0,0,0],ch:[.1,0,0],hd:[.2,.5,0],...AL([.9,.3,.4],.55),...AR([-.9,.2,.5],.55),fl:[.22,0,0],fr:[-.22,0,0]},E_IDLE);
  CL.wDead=K([[0,KN],[.9,WD,'in'],[4,WD]],{noAir:true});
  const RO=P({hy:-.1,hip:[-.2,0,0],ch:[-.45,0,0],hd:[-.4,0,0],...AL([.8,.5,-.2],.58),...AR([-.8,.5,-.2],.58,[-.6,.7,-.3]),fl:[.3,0,.1],fr:[-.3,0,-.1]},E_IDLE);
  CL.roar={fn(t,o){o.set(RO);const w=sin(t*38);o[I.ch]+=w*.02;o[I.hl]+=w*.01;o[I.hr]-=w*.01;}};
}
// How the hero holds each weapon set while standing, running or airborne. Positions are where the grip is, in chest space
// (+X the hero's left, +Z forward); directions are where the blade, barrel or hammer head points. null = leave the clip's own.
const HOLD=(hl,sl,hr,sr)=>{const o={};if(hl){o.hl=hl;o.sl=nrm(sl);}if(hr){o.hr=hr;o.sr=nrm(sr);}return o;};
const STANCE=[
  // twin fangs: lead blade up in a guard, rear blade low and trailing; both swept back on the run
  {idle:HOLD([.25,.1,.32],[.12,.5,.85],[-.3,-.12,-.05],[-.25,-.45,-.86]),
   run:HOLD([.34,.02,-.2],[.35,.14,-.93],[-.34,.02,-.2],[-.35,.14,-.93])},
  // blade & pistol: gun forward at the low ready, sword low behind
  {idle:HOLD([.2,.12,.36],[-.1,-.3,.95],[-.3,-.12,-.05],[-.25,-.45,-.86]),
   run:HOLD([.28,-.02,.12],[.1,-.8,.6],[-.34,.02,-.2],[-.35,.14,-.93]),
   air:HOLD([.3,.1,.2],[.1,-.5,.85],[-.5,.1,-.1],[-.6,.3,-.75])},
  // great maul (the left hand follows the shaft): carried across the body with the head high at the right shoulder, trailed low on the run
  {idle:HOLD(null,null,[-.2,.3,.2],[-.55,.75,-.35]),
   run:HOLD(null,null,[-.3,0,-.05],[-.2,-.25,-.95]),
   air:HOLD(null,null,[-.3,.25,.1],[-.3,.8,-.5])}];
function stance(o,kind,set,r){
  const st=STANCE[set][kind];if(st)wr(o,st);
  if(kind==='idle'){const b=sin(r.t*2.2);o[I.hl+1]+=b*.012;o[I.hr+1]+=b*.01;}
  else if(kind==='run'){const ph=r.phase,sn=sin(ph);o[I.hl+2]+=sn*.07;o[I.hr+2]-=sn*.07;o[I.hl+1]+=sin(ph*2)*.02;o[I.hr+1]+=sin(ph*2+1)*.02;}
}
