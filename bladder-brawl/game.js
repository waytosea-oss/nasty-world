/* Bladder Brawl — Nasty World. Gameplay, rendering, audio, UI. */
'use strict';
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
let rnd=Math.random;const rand=(a,b)=>a+rnd()*(b-a);
const Q=new URLSearchParams(location.search);
const SIMMODE=Q.has('sim');/* v6.1 difficulty (BALANCE.md v6.1): extra HP ramp (+HPA flat, +HPB at L18), speed ramp, boss HP, HPFIN = final-boss level (fewer coins reach L18 now); flush washes only bugs already below FLW of max HP (others take FLW·maxHp) */
/* v6.2 difficulty tiers (BALANCE.md v6.2). EASY = v6.1. Every field can be overridden with ?d_<key>= for sim tuning */
/* v7 (BALANCE.md v7): old IRON BLADDER ~ new REGULAR. New knobs: lives, drain (tank use/s mult), dryR (tank % before the stream comes back), sp (all bug speed), atk (spit/heal/boss attack rate), mx (max streak multiplier), gk (gunk seconds) */
const DIFFS={
 easy:  {hpa:.5, hpb:.65,spb:.08,fspb:.08,n:1.1, gap:.9, cap:.9, ref:.88,fl:0, flw:.5, dmg:.8 ,  boss:1.1,fin:.85,coin:1,  lives:4,drain:1,  dryR:.3, sp:1,   atk:.8, mx:4,gk:2.6},
 normal:{hpa:.5, hpb:.7, spb:.16,fspb:.08,n:1.25,gap:.8, cap:.85,ref:.75,fl:0, flw:.35,dmg:.77,boss:1.3,fin:.75,coin:.9, lives:4,drain:1.15,dryR:.4, sp:1.08,atk:1,  mx:5,gk:3.2},
 hard:  {hpa:.4, hpb:.75,spb:.2, fspb:.1, n:1.35,gap:.72,cap:.78,ref:.65,fl:-1,flw:.25,dmg:.82,boss:1.4,fin:.72, coin:.75,lives:3,drain:1.3, dryR:.5, sp:1.16,atk:1.3,mx:6,gk:3.8}};
const DIFFL={easy:['PEE-WEE','Easy'],normal:['REGULAR','Normal'],hard:['IRON BLADDER','Hard']};
let DIFF='normal',D=null;function setDiffVals(k){DIFF=DIFFS[k]?k:'normal';D=Object.assign({},DIFFS[DIFF]);for(const key in D){const v=Q.get('d_'+key);if(v!=null)D[key]=+v;}}
setDiffVals(Q.get('diff')||'normal');const DBG={dmg:0,fireT:0,ft:0};const V6=Q.get('frame')!=='v5';
let FX=null;/* v6 fluid module (fluid.js) once ready; null = v5g 2D stream fallback */
const W=400;let H=800,SC=1,DPR=1,QMAX=Math.min(2,+(new URLSearchParams(location.search).get('dpr'))||(()=>{try{return +localStorage.nwQ}catch(e){}})()||2);const L={};
const cv=$('cv'),cx=cv.getContext('2d',{willReadFrequently:new URLSearchParams(location.search).get('wrf')==='1'});
const FONT='"Lilita One","Fredoka",system-ui,sans-serif';
/* ---------------- save ---------------- */
const SKEY='bladderbrawl_v1';
const S=Object.assign({unl:1,stars:[],coins:0,up:{pres:0,wid:0,rng:0,cap:0,spr:0,flush:0},mus:1,sfx:1,vib:1,tip:0,aim:'relative'},(()=>{try{return JSON.parse(localStorage.getItem(SKEY))||{}}catch(e){return {}}})());
S.up=Object.assign({pres:0,wid:0,rng:0,cap:0,spr:0,flush:0},S.up);S.seen=S.seen||{};
/* v6.2: stars + unlock progress kept per difficulty; coins/upgrades shared. Old saves (v6.1 balance) land in EASY */
if(!S.sd){S.sd={easy:S.stars||[],normal:[],hard:[]};S.ud={easy:S.unl||1,normal:1,hard:1};}
/* v7.1: coins + upgrades are per-run (per tier). Stars / best unlock stay permanent.
   Migration: wipe carried upgrades so restart cannot keep a 3-stream build at L1 (Tilo's bug). */
function blankUp(){return {pres:0,wid:0,rng:0,cap:0,spr:0,flush:0};}
function blankRun(){return {coins:0,up:blankUp(),prog:1,snap:{}};}
function stashRun(){if(!S.rd||!S.diff)return;S.rd[S.diff]={coins:S.coins|0,up:Object.assign(blankUp(),S.up),prog:S.prog||1,snap:S.snap||{}};}
function loadRun(k){if(!S.rd)S.rd={};if(!S.rd[k])S.rd[k]=blankRun();const R=S.rd[k];S.coins=R.coins|0;S.up=Object.assign(blankUp(),R.up);S.prog=R.prog||1;S.snap=R.snap||{};}
if(!S.runV||S.runV<71){S.coins=0;S.up=blankUp();S.rd={easy:blankRun(),normal:blankRun(),hard:blankRun()};S.prog=1;S.snap={};S.runV=71;}
function applyDiff(k){if(!DIFFS[k])k='normal';stashRun();if(S.sd[S.diff||'normal'])S.ud[S.diff||'normal']=S.unl;S.diff=k;S.stars=S.sd[k];S.unl=S.ud[k]||1;loadRun(k);setDiffVals(Q.get('diff')||k);}
if(!SIMMODE){S.diff=S.diff||'normal';applyDiff(S.diff);}
function save(){if(SIMMODE)return;S.ud[S.diff]=S.unl;S.sd[S.diff]=S.stars;stashRun();try{localStorage.setItem(SKEY,JSON.stringify(S))}catch(e){}}
function runActive(){return(S.prog|0)>1||(S.coins|0)>0||Object.values(S.up).some(v=>v>0);}
function doNewRun(){S.coins=0;S.up=blankUp();S.prog=1;S.snap={};save();refreshCoins();toast('New run — coins & upgrades reset.');}
let nrunFrom='title';function askNewRun(from){nrunFrom=from||'title';if(!runActive()){doNewRun();if(nrunFrom==='levels'){renderLevels();showScr('levels');}return;}showScr('nrun');}
function enterLevel(Lv){Lv=+Lv;if(Lv<1||Lv>NL)return;
  if(Lv>S.prog){SFX.deny();toast('Beat level '+S.prog+' first this run!');return;}
  if(Lv<S.prog){SFX.deny();toast('Mid-run: only level '+S.prog+'. Start a NEW RUN to replay.');return;}
  if(!S.snap[Lv]){S.snap[Lv]={coins:S.coins|0,up:Object.assign(blankUp(),S.up)};}
  else{S.coins=S.snap[Lv].coins|0;S.up=Object.assign(blankUp(),S.snap[Lv].up);}
  save();go(Lv);}
/* ---------------- content ---------------- */
const BT={
 mosq:{name:'Skeeter',r:13,hp:2.2,spd:44,pts:6,res:0},
 fly:{name:'Buzzkill Fly',r:16,hp:5,spd:50,pts:9,res:.1},
 ant:{name:'Maggot Mob',r:12,hp:4,spd:36,pts:6,res:.15},
 roach:{name:'Roach Rocket',r:18,hp:12,spd:72,pts:16,res:.35},
 snail:{name:'Slimy Steve',r:20,hp:30,spd:17,pts:24,res:.5},
 gecko:{name:'Gecko Dash',r:18,hp:20,spd:58,pts:22,res:.55},
 baby:{name:'Spiderling',r:12,hp:6,spd:44,pts:7,res:.1},
 gnat:{name:'Gnat Swarm',r:8,hp:1.1,spd:64,pts:3,res:0},
 dodger:{name:'Dodgy Roach',r:17,hp:9,spd:58,pts:18,res:.3},
 armor:{name:'Tin-Cap Beetle',r:19,hp:13,spd:32,pts:24,res:.6},
 blob:{name:'Blob Maggot',r:17,hp:9,spd:30,pts:14,res:.2},
 mini:{name:'Mini Maggot',r:9,hp:1.6,spd:70,pts:3,res:0},
 climber:{name:'Rim Runner',r:15,hp:6,spd:86,pts:20,res:.3},
 spitter:{name:'Gob Fly',r:16,hp:7,spd:40,pts:20,res:.15},
 healer:{name:'Nurse Snail',r:19,hp:16,spd:20,pts:28,res:.4},
 bfly:{name:'BARON BLOWFLY',r:44,hp:520,spd:12,pts:300,res:.85,boss:1},
 bsnail:{name:'GENERAL GOO',r:46,hp:1100,spd:9,pts:500,res:.9,boss:1},
 bspider:{name:'MAMA LEGS',r:52,hp:1700,spd:10,pts:800,res:.9,boss:1}
};
const CH=[
 {n:'Gas Station Restroom',s:'Cracked tiles. Mystery smells. Bugs.',wall:['#3fa7a3','#2a7d83'],grout:'rgba(10,40,50,.35)',deco:'gas'},
 {n:'Punk Club Toilet',s:'Sticky floors. Louder bugs.',wall:['#3a2a3a','#1a1020'],grout:'rgba(0,0,0,.4)',deco:'club'},
 {n:'Festival Porta-Loo',s:'Day three. Absolutely heaving.',wall:['#2b4fb0','#1a2a60'],grout:'rgba(10,20,60,.35)',deco:'porta'}
];
const NL=18;
/* v7: new bugs enter one at a time (CARDS intro the first time each shows up) */
const POOLS={1:['mosq'],2:['mosq','fly','gnat'],3:['mosq','ant','blob'],4:['fly','ant','roach','dodger'],5:['mosq','fly','ant','roach','dodger','climber'],6:['mosq','fly','gnat'],
 7:['snail','ant','fly','armor'],8:['gecko','mosq','armor','spitter'],9:['snail','gecko','roach','fly','dodger','gnat'],10:['ant','roach','snail','healer','blob','climber'],11:['mosq','fly','roach','gecko','spitter','dodger'],12:['ant','fly','blob'],
 13:['baby','roach','fly','armor','gnat'],14:['baby','gecko','climber','gnat','dodger'],15:['roach','gecko','baby','spitter','healer'],16:['snail','gecko','roach','baby','armor','blob','climber'],17:['mosq','fly','ant','roach','snail','gecko','baby','dodger','spitter','climber','healer','gnat'],18:['baby','fly','climber']};
/* wave modifiers / level twists */
const MODS={9:['dark'],11:['slip'],13:['butts'],14:['fast'],15:['dark'],16:['butts'],17:['fast','slip']};
const MODL={dark:'LIGHTS OUT',slip:'SOAP SPILL',butts:'BUTT BUNKERS',fast:'FAST FORWARD'};
const CARDS={gnat:['Gnat Swarm','Tiny, fast, a whole cloud of them. Sweep!'],blob:['Blob Maggot','Pops into 3 speedy minis. Keep the stream on.'],dodger:['Dodgy Roach','Skitters sideways when hit. Chase it!'],
 climber:['Rim Runner','Sprints straight for the rim. Stop it or it\u2019s out!'],armor:['Tin-Cap Beetle','Bottle-cap helmet. Hit its SIDES, or flush the cap off.'],spitter:['Gob Fly','Spits gunk on your screen. Kill it first.'],
 healer:['Nurse Snail','Heals every bug near it. Drown the nurse!'],dark:['Lights Out','The bulb is dying. Follow the glowing eyes.'],slip:['Soap Spill','Slippery bowl: bugs slide all over.'],
 butts:['Butt Bunkers','Bugs hide under cigarette butts. Blast them off.'],fast:['Fast Forward','This wave had a triple espresso.']};
const BOSS={6:'bfly',12:'bsnail',18:'bspider'};
const INTRO={1:'Hold and drag to aim. Hose those bugs back down!',2:'Flies stop and go. Gnats come in clouds.',3:'Maggots wriggle in lines. Blobs split!',4:'Roaches are fast. Dodgy ones skitter.',
 5:'Rim Runners sprint. Keep your streak!',6:'Boss! Baron Blowfly gets angrier as he weakens.',7:'Snails hide. Beetles wear helmets.',8:'Gob Flies spit on your screen.',9:'Lights out!',10:'Nurse Snails heal the mob.',11:'Soap spill. Everything slides.',12:'Boss! General Goo has three moods.',13:'Bugs hiding under butts.',14:'Fast forward!',15:'Dark again. Gross again.',16:'Butt bunkers, round two.',17:'Everything. Fast. Slippery.',18:'Final boss! Mama Legs and ALL her kids.'};
const DMT=[1,1,1.2,.9,.9,0.7,1.6,1.05,0.5,0.9,1.1,1,1.25,0.55,0.45,0.9,0.62,0.55];/* v7 per-level HP shape (flattens the new-bug walls) */
function levelDef(Lv){
  const ch=Math.ceil(Lv/6)-1,boss=BOSS[Lv],pool=POOLS[Lv];
  const T=window.TUNE||{n:1.8,hp:.17,sp:.045,gap:.13};
  const mods=MODS[Lv]||[],fast=mods.includes('fast');const n=Math.round((boss?6+Lv*T.n*.6:8+Lv*T.n)*D.n);
  const dm=(window.DM||DMT)[Lv-1];const hpM=(1+T.hp*(Lv-1))*dm*(boss?(Lv===18?D.fin:D.boss):1+D.hpa+D.hpb*(Lv-1)/17),spM=(1+T.sp*(Lv-1))*(1+(Lv===18?D.fspb:D.spb)*(Lv-1)/17)*D.sp*(fast?1.3:1);
  const q=[];let t=1.2;let r=(Lv*9301+49297)%233280;const R=()=>(r=(r*9301+49297)%233280)/233280;
  if(boss)q.push({t:3,type:boss});
  let left=n;while(left>0){const ty=pool[Math.floor(R()*pool.length)];const g=Math.min(left,ty==='gnat'?5+Math.floor(R()*4):ty==='ant'||ty==='baby'?3+Math.floor(R()*3):ty==='blob'||ty==='healer'||ty==='armor'?1+Math.floor(R()*2):1+Math.floor(R()*(Lv<3?2:3)));
    const gx=60+R()*280;for(let i=0;i<g;i++)q.push({t:t+i*(ty==='ant'?.45:ty==='gnat'?.12:.7),type:ty,gx:ty==='gnat'?gx+(R()-.5)*60:gx,line:ty==='ant'||ty==='gnat'});
    left-=ty==='gnat'?Math.ceil(g/3):g;t+=(fast?.75:1)*D.gap*Math.max(1.1,(Lv<3?4.2:3.6)-Lv*(window.TUNE||{gap:.13}).gap)+g*.45+(boss?2.2:0);}
  q.sort((a,b)=>a.t-b.t);return {ch,boss,q,hpM,spM,n:q.length,mods};
}
const UPG=[
 {k:'pres',name:'Water Pressure',d:'More damage & knockback',max:6,c:[60,130,240,400,620,900]},
 {k:'wid',name:'Fire-Hose Mode',d:'Wider, splashier stream',max:4,c:[80,180,330,540]},
 {k:'rng',name:'Long Range',d:'Reach the very top of the rim',max:3,c:[90,220,420]},
 {k:'cap',name:'Mega Bladder',d:'Bigger tank, faster refill',max:4,c:[70,160,300,500]},
 {k:'spr',name:'Split Stream',d:'Pee in 2, then 3 directions',max:2,c:[450,1000]},
 {k:'flush',name:'Extra Flush',d:'+1 emergency flush per level',max:2,c:[250,600]}
];
/* ---------------- audio (all synthesized) ---------------- */
const AU={ctx:null,m:null,sfx:null,mus:null,noise:null,str:null,lim:{}};
function auInit(){if(AU.ctx||SIMMODE)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;try{
  const a=AU.ctx=new AC();AU.m=a.createGain();AU.m.connect(a.destination);AU.sfx=a.createGain();AU.sfx.connect(AU.m);AU.mus=a.createGain();AU.mus.connect(AU.m);
  const b=a.createBuffer(1,a.sampleRate,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;AU.noise=b;
  const src=a.createBufferSource();src.buffer=b;src.loop=true;const bp=a.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2600;bp.Q.value=.8;const g=a.createGain();g.gain.value=0;src.connect(bp);bp.connect(g);g.connect(AU.sfx);src.start();AU.str={g,bp};
  applyAudio();}catch(e){}}
function applyAudio(){if(!AU.ctx)return;const t=AU.ctx.currentTime;AU.sfx.gain.setTargetAtTime(S.sfx?1:0,t,.03);AU.mus.gain.setTargetAtTime(S.mus?.22:0,t,.05);}
function okA(k,gap){if(!AU.ctx||AU.ctx.state!=='running')return false;const n=performance.now();if(k){if(AU.lim[k]&&n-AU.lim[k]<gap)return false;AU.lim[k]=n;}return true;}
function tone(type,f0,f1,dur,vol,dest){const a=AU.ctx,t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(dest||AU.sfx);o.start(t);o.stop(t+dur+.02);}
function nz(dur,vol,f0,f1,q){const a=AU.ctx,t=a.currentTime,s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=AU.noise;f.type='bandpass';f.Q.value=q||1;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(AU.sfx);s.start(t,Math.random()*.5);s.stop(t+dur+.02);}
const SFX={
 pop(p){if(okA('pop',45))tone('sine',600*p,180*p,.09,.25);},
 squish(p){if(okA('sq',30)){tone('triangle',380*p,90,.18,.3);nz(.12,.2,1800,500,2);}},
 splash(){if(okA('spl',90))nz(.3,.35,1400,300,.8);},
 boing(){if(okA('bo',140))tone('square',140,70,.25,.12);},
 coin(){if(okA('coin',50)){tone('square',988,988,.07,.08);setTimeout(()=>okA()&&tone('square',1318,1318,.12,.08),60);}},
 hurt(){if(okA('h',200)){tone('sawtooth',220,55,.45,.25);nz(.3,.2,600,200,1);}},
 flush(){if(okA('f',300)){nz(1.4,.5,300,2400,.6);tone('sine',120,40,1.2,.25);}},
 power(){if(okA('pw',200))[523,659,784,1046].forEach((f,i)=>setTimeout(()=>okA()&&tone('square',f,f,.12,.1),i*70));},
 click(){if(okA('c',40))tone('sine',900,500,.06,.2);},
 deny(){if(okA('d',150))tone('square',160,120,.15,.12);},
 win(){if(okA('w',500))[523,659,784,1046,1318].forEach((f,i)=>setTimeout(()=>okA()&&tone('triangle',f,f,.25,.25),i*110));},
 lose(){if(okA('l',500))[392,330,262,196].forEach((f,i)=>setTimeout(()=>okA()&&tone('triangle',f,f*.97,.35,.25),i*180));},
 sput(){if(okA('sp',120))nz(.08,.25,900,400,3);}
};
function streamSnd(on,p){if(!AU.str)return;const t=AU.ctx.currentTime;AU.str.g.gain.setTargetAtTime(on?.16:0,t,.05);AU.str.bp.frequency.setTargetAtTime(p||2600,t,.1);}
const BGM={on:false,step:0,next:0,timer:null};
const BASS=[36,36,43,36,41,41,43,38],MEL=[72,0,74,76,0,79,76,74,72,0,67,0,69,72,74,0];
function bgmStart(){if(!AU.ctx||BGM.on)return;BGM.on=true;BGM.next=AU.ctx.currentTime+.1;BGM.timer=setInterval(()=>{const a=AU.ctx;while(BGM.next<a.currentTime+.15){const s=BGM.step++,t=BGM.next,sd=60/128/2;
  const note=(m,ty,v,d)=>{const o=a.createOscillator(),g=a.createGain();o.type=ty;o.frequency.value=440*Math.pow(2,(m-69)/12);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(AU.mus);o.start(t);o.stop(t+d+.02);};
  if(s%2===0)note(BASS[(s>>2)%8],'square',.18,sd*1.6);if(MEL[s%16]&&(s>>4)%2)note(MEL[s%16],'triangle',.16,sd*.9);
  if(s%4===2){const n=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter();f.type='highpass';f.frequency.value=6000;n.buffer=AU.noise;g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+.05);n.connect(f);f.connect(g);g.connect(AU.mus);n.start(t);n.stop(t+.06);}
  if(s%8===0){const o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(40,t+.12);g.gain.setValueAtTime(.5,t);g.gain.exponentialRampToValueAtTime(.001,t+.15);o.connect(g);g.connect(AU.mus);o.start(t);o.stop(t+.16);}
  BGM.next+=sd;}},40);}
function bgmStop(){BGM.on=false;clearInterval(BGM.timer);}
function vib(p){if(S.vib&&navigator.vibrate&&!SIMMODE&&(!navigator.userActivation||navigator.userActivation.hasBeenActive))try{navigator.vibrate(p)}catch(e){}}
/* ---------------- layout ---------------- */
/* v5: the play screen is one painted plate (art/plate5, 720x1280) cover-fitted; all geometry is measured in plate pixels */
const PL={s:1,ox:0,oy:0};const px=x=>PL.ox+x*PL.s,py=y=>PL.oy+y*PL.s;
function wallL(y){const p=(y-PL.oy)/PL.s;let x;if(p<567){const q=Math.min(52,567-p);x=220-Math.sqrt(Math.max(0,2704-q*q));}else if(p<=860)x=168;else{const t=Math.min(1,(p-860)/235);x=363-195*Math.sqrt(1-t*t);}return px(x);}
/* outer bottom edge of the urinal (plate px), from the cut-out mask */
const LIPP=[[117,700],[130,959],[150,1045],[170,1084],[190,1111],[210,1134],[230,1152],[250,1168],[270,1179],[290,1188],[310,1195],[330,1200],[350,1203],[370,1203],[390,1202],[410,1198],[430,1194],[450,1186],[470,1176],[490,1162],[510,1147],[530,1128],[550,1103],[570,1071],[590,1022],[615,700]];
function lipAt(x){const p=(x-PL.ox)/PL.s;if(p<=117||p>=615)return -1e4;for(let i=1;i<LIPP.length;i++)if(p<=LIPP[i][0]){const a=LIPP[i-1],b=LIPP[i],u=(p-a[0])/(b[0]-a[0]);return py(a[1]+(b[1]-a[1])*u);}return -1e4;}
function wallR(y){return 2*L.cx-wallL(y);}
function bowlPath(c,pad){pad=pad||0;c.beginPath();const n=40;for(let i=0;i<=n;i++){const y=L.rimY+i/n*L.wallH;c.lineTo(wallL(y)-pad,y);}for(let i=n;i>=0;i--){const y=L.rimY+i/n*L.wallH;c.lineTo(wallR(y)+pad,y);}c.closePath();}
function layout(){
  const st=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat'))||0,sb=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sab'))||0;
  L.top=st/SC+60;L.base=H-sb/SC+8;L.gusS=.8;L.feet=Math.min(96,H*.11);
  /* v5c: the urinal is fitted, not the plate: flushometer just under the HUD, bottom lip at ~83% height so the sneakers stand on the floor below it */
  /* v6: bigger framing (fluid lab v4d): the bowl fills the screen. Top edge sits on the flushometer body (plate y~252, under the HUD bar),
     outer porcelain cropped at the sides (inner bowl + rim sliver stay visible), the lip sits just high enough for the toe caps below it */
  const top0=st/SC,toes=clamp(W*.23,76,104)*.42+6,UY0=(V6?240:236),UY1=1204;let s=V6?(H-sb/SC-top0-toes)/(UY1-UY0):(H*.9-top0-42)/(1204-236);
  s=Math.min(s,V6?W/452:W/520);s=Math.max(s,W/840);PL.s=s;PL.ox=W/2-363*s;PL.oy=V6?H-sb/SC-toes-UY1*s:top0+42-236*s;
  if(V6&&PL.oy>top0-UY0*s+40)PL.oy=top0-UY0*s+40;
  if(PL.oy+1700*s<H){PL.oy=H-1700*s;}
  L.U={x:px(117),y:py(367),w:485*s,h:805*s};L.cx=px(363);
  L.rimY=py(515);L.spawnY=py(1025);L.bowlBot=py(1095);L.waterY=py(969);L.drainX=px(356);L.drainR=40*s;
  L.oy=L.bowlBot+14;L.lipY=py(1204);L.wallH=L.bowlBot-L.rimY;L.K=L.wallH/496;
  // half rim contour (top centre -> top edge -> side wall -> bottom), normalised arc length, for the flush water
  const pts=[[L.cx,L.rimY]];for(let i=0;i<=60;i++){const y=L.rimY+i/60*L.wallH;pts.push([wallL(y),y]);}let acc=0;L.rim=pts.map((q,i)=>{if(i)acc+=Math.hypot(q[0]-pts[i-1][0],q[1]-pts[i-1][1]);return {x:q[0],y:q[1],s:acc};});L.rim.forEach(q=>q.s/=acc);L.rimTop=(L.cx-wallL(L.rimY))/acc;
}
function resize(){const vw=innerWidth,vh=innerHeight;const ww=Math.min(vw,vh*0.62,560);SC=ww/W;H=Math.round(vh/SC);DPR=Math.min(QMAX,devicePixelRatio||1);
  if(FX)DPR=Math.min(DPR,FX.bgScale());
  cv.style.width=ww+'px';cv.style.height=vh+'px';cv.width=Math.round(ww*DPR);cv.height=Math.round(vh*DPR);$('app').style.width=ww+'px';layout();bgKey='';if(typeof def!=='undefined'&&def&&!SIMMODE)buildBg(def.ch);
  if(FX){const td=Math.min(2,devicePixelRatio||1);for(const e of [FX.canvas,cvt]){e.style.width=ww+'px';e.style.height=vh+'px';}cvt.width=Math.round(ww*td);cvt.height=Math.round(vh*td);TDPR=td;
    FX.layout(ww,vh,{s:PL.s*SC,ox:(PL.ox-60*PL.s)*SC,oy:PL.oy*SC},cv);}}
/* ---------------- v6 fluid hookup ---------------- */
const cvt=document.createElement('canvas'),cvtx=cvt.getContext('2d');let TDPR=1;cvt.id='cvt';
const AIMM=['relative','offset','direct'],AIML={relative:'Pad',offset:'Offset',direct:'Direct'};
let aimMode=AIMM.includes(Q.get('aim'))?Q.get('aim'):(AIMM.includes(S.aim)?S.aim:'relative');
function fxInit(){if(FX||(SIMMODE&&!Q.has('fxsim'))||Q.get('fx')==='0')return;const F=window.FLUID;if(!F||!F.ok)return;FX=F;
  if(SIMMODE){FX.layout(400,844,{s:PL.s,ox:PL.ox-60*PL.s,oy:PL.oy},cv);return;}
  const app=$('app');FX.canvas.style.cssText='position:absolute;left:0;top:0;display:block;pointer-events:none;z-index:0';cvt.style.cssText='position:absolute;left:0;top:0;display:block;pointer-events:none;z-index:1';
  app.insertBefore(cvt,cv);app.insertBefore(FX.canvas,cvt);cv.style.opacity='0';cv.style.zIndex='2';cv.style.position='absolute';
  FX.onQuality(()=>{resize();});resize();}
window.addEventListener('fluidready',fxInit);
/* if even the Low tier can't hold ~22 fps for 6 s, drop back to the v5g 2D stream for the rest of the session */
function fxDisable(){if(!FX)return;const F=FX;FX=null;F.flow(false);F.clear();F.canvas.style.display='none';cvt.style.display='none';cv.style.opacity='1';cv.style.zIndex='';G.flushFx&&(G.flushFx.fx=1);resize();console.info('fluid: too slow, 2D stream fallback');}
/* ---------------- background ---------------- */
let _lipC=null,_lipK='';function lipC(){if(!SPR.ok('lip5'))return null;const w=Math.ceil(720*PL.s*SC*DPR),h=Math.ceil(410*PL.s*SC*DPR),k=w+'x'+h;if(k!==_lipK){_lipK=k;_lipC=_lipC||document.createElement('canvas');_lipC.width=w;_lipC.height=h;_lipC.getContext('2d').drawImage(SPR.I.lip5,0,0,w,h);}return _lipC;}
let _stC=null;function stainC(){if(_stC)return _stC;const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(22,25,0,32,32,32);g.addColorStop(0,'rgba(255,250,215,.55)');g.addColorStop(.6,'rgba(235,200,80,.35)');g.addColorStop(1,'rgba(180,130,20,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return _stC=c;}
const bgC=document.createElement('canvas'),bgX=bgC.getContext('2d');let bgKey='';
/* WebKit drops big drawImage calls whose destination starts far off-canvas (v6 framing puts the plate top above the screen): clip the source rect by hand */
function drawClipped(c,img,dx,dy,dw,dh,cw,ch){const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,kx=iw/dw,ky=ih/dh;const x0=Math.max(dx,0),y0=Math.max(dy,0),x1=Math.min(dx+dw,cw),y1=Math.min(dy+dh,ch);if(x1<=x0||y1<=y0)return;c.drawImage(img,(x0-dx)*kx,(y0-dy)*ky,(x1-x0)*kx,(y1-y0)*ky,x0,y0,x1-x0,y1-y0);}
function buildBg(ch){const k=ch+'|'+H+'|'+DPR;if(k===bgKey)return;bgKey=k;bgC.width=Math.round(W*SC*DPR);bgC.height=Math.round(H*SC*DPR);const c=bgX;c.setTransform(SC*DPR,0,0,SC*DPR,0,0);const C=CH[ch];
  c.fillStyle='#2a2230';c.fillRect(0,0,W,H);
  if(SPR.ok('plate5c')){drawClipped(c,SPR.I.plate5c,PL.ox-60*PL.s,PL.oy,840*PL.s,1700*PL.s,W,H);
    // chapter mood: tint the wall (not the porcelain) a little per chapter
    if(ch>0){c.save();c.beginPath();c.rect(0,0,W,H);const S_=PL.s,rrp=(x,y,w,h,r)=>{c.moveTo(px(x+r),py(y));c.arcTo(px(x+w),py(y),px(x+w),py(y+h),r*S_);c.arcTo(px(x+w),py(y+h),px(x),py(y+h),r*S_);c.arcTo(px(x),py(y+h),px(x),py(y),r*S_);c.arcTo(px(x),py(y),px(x+w),py(y),r*S_);c.closePath();};rrp(104,352,512,836,130);rrp(170,120,380,231,30);c.clip('evenodd');c.globalCompositeOperation='color';c.globalAlpha=.26;c.fillStyle=ch===1?'#7a2a8a':'#2050c0';c.fillRect(0,0,W,H);c.restore();}}
  else{c.fillStyle=lin(c,0,0,0,H,[[0,C.wall[0]],[1,C.wall[1]]]);c.fillRect(0,0,W,H);bowlPath(c);c.fillStyle='#eee6d6';c.fill();}
}
/* ---------------- state ---------------- */
const G={state:'title',paused:false,t:0,bugs:[],drops:[],parts:[],pops:[],stains:[]};
let curL=1,def=null;
function stats(){const u=S.up;const o={dps:7*(1+.42*u.pres)*D.dmg,rad:17+6*u.wid,kb:60*(1+.28*u.pres),range:L.wallH*(.78+.12*u.rng)+(L.oy-L.bowlBot),cap:100*(1+.35*u.cap)*D.cap,refill:16*(1+.3*u.cap)*D.ref,streams:1+u.spr,w:6+1.6*u.wid+.5*u.pres};
  if(G.super>0){o.dps*=1.8;o.rad*=1.3;o.kb*=1.4;o.w*=1.35;o.range*=1.15;}
  if(G.pPres>0){o.dps*=1.6;o.kb*=1.4;}if(G.pWide>0){o.rad*=1.8;o.w*=1.5;}return o;}
function startLevel(Lv){curL=Lv;def=levelDef(Lv);
  Object.assign(G,{state:'play',paused:false,t:0,bugs:[],drops:[],parts:[],pops:[],stains:[],queue:def.q.slice(),wt:0,lives:5,lost:0,kills:0,earned:0,flushes:Math.max(1,2+S.up.flush+D.fl),flushFx:null,
   bladder:100,dry:false,super:0,combo:0,comboT:0,streak:0,mult:1,bestStreak:0,lastHitT:0,picks:[],pPres:0,pWide:0,gunk:[],web:0,dk:{f:0,n:3},mods:def.mods,maxLives:D.lives,cardQ:[],shake:0,hitstop:0,aim:{x:200,y:L.rimY+L.wallH*.5},f:{x:200,y:400,down:false,id:null,touch:false},firing:false,seq:0,emit:0,power:null,powerT:14,boss:null,clearT:-1,bounce:0,dangerT:0,fans:[],ashT:0,canFx:null,callable:false,calls:0});
  G.lives=D.lives;G.bladder=stats().cap;G.aimInit=false;buildBg(def.ch);if(!SIMMODE)SCN.reset();if(FX)FX.clear();
  if(!SIMMODE){try{}catch(e){}hudInit();const b=INTRO[Lv];banner('Level '+Lv,b||CH[def.ch].n,def.boss?'boss':'');if(S.mus)bgmStart();for(const m of def.mods)maybeCard(m);}
}
function spawn(s){const T=BT[s.type];const boss=!!T.boss;let y=boss?L.bowlBot-70*L.K:L.spawnY-rand(0,14)*L.K;let x=boss?200:(s.line?s.gx:rand(wallL(y)+T.r+6,wallR(y)-T.r-6));if(s.x!=null){x=s.x;y=s.y;}
  const hp=T.hp*(boss?1:def.hpM)*(boss?1+.15*Math.max(0,S.up.pres-2):1);
  const b={type:s.type,x,y,hp,maxHp:hp,t:rand(0,9),ph:rand(0,6),spawnT:0,kbV:0,dead:false,esc:null,rot:0,mv:1,mvT:rand(.3,.8),dir:rnd()<.5?-1:1,hide:0,hitAcc:0,sqT:9,hitT:0,cd:2.5,look:[0,-1],mood:0,blink:0,bl:rand(1,4),noTail:false,lastSnd:0,sl:0,dash:0,dcd:0,wind:0,lunge:0,phase:1,acd:rand(2.5,4.5)/D.atk};
  if(!SIMMODE&&s.type==='roach'&&rnd()<.05)b.gold=1;if(G.ashT>0&&!boss)b.ash=1;
  if(s.type==='armor')b.cap=1;if(!boss&&G.mods.includes('butts')&&s.type!=='gnat'&&s.type!=='mini'&&rnd()<.45)b.butt=Math.max(4,hp*.8);
  if(!SIMMODE&&CARDS[s.type])maybeCard(s.type);
  G.bugs.push(b);if(boss){G.boss=b;if(!SIMMODE){$('bossbar').classList.add('on');$('bossName').textContent=T.name;banner(T.name,'has entered the urinal!','boss');vib([60,40,120]);}G.shake=.8;}
  else if(!SIMMODE&&rnd()<.4)G.parts.push({k:'bub',x,y:L.waterY,vx:0,vy:-30,t:0,life:.5,r:5});return b;}
function pop(x,y,s,col,size,dur){if(SIMMODE)return;G.pops.push({x,y,s,col:col||'#fff',size:size||18,t:0,dur:dur||.9});}
function burst(x,y,n,col,spd){if(SIMMODE)return;for(let i=0;i<n;i++){const a=rand(0,TAU),v=rand(60,spd||200);G.parts.push({k:'drop',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-60,t:0,life:rand(.35,.6),r:rand(2,4.5),col:col||'#ffe56b'});}}
function damage(b,d,kb,src){if(b.dead||b.esc!=null)return;const T=BT[b.type];if(src!=='flush')G.lastHitT=G.t;
  if(b.butt>0){b.butt-=d;b.hitT=.15;if(b.butt<=0){b.butt=0;pop(b.x,b.y-26,'BUTT OFF!','#e8d8b0',15,.8);if(!SIMMODE)G.parts.push({k:'drop',x:b.x,y:b.y,vx:rand(-120,120),vy:-200,t:0,life:.6,r:5,col:'#e9dcc0'});}return;}
  if(b.cap&&src!=='flush'){const hx=G.hx==null?b.x:G.hx;if(Math.abs(hx-b.x)<T.r*.5){d*=.15;kb*=.3;if(G.t-(b.tink||0)>.6){b.tink=G.t;pop(b.x,b.y-30,'TINK!','#d8e4ee',14,.5);if(!SIMMODE&&okA('tk',120))tone('square',1800,1500,.05,.06);}}}
  if(b.type==='dodger'&&b.dcd<=0&&b.spawnT>.3){b.dash=.32;b.dcd=1.1/D.atk*.9;b.dir=(G.hx==null?rnd()<.5:G.hx>b.x)?-1:1;}
  if(G.mods.includes('slip')&&!T.boss)b.sl+=rand(-30,30);
  DBG.dmg+=Math.min(d,b.hp);
  if(b.type==='snail'||b.type==='bsnail'){if(b.hide>0){d*=.3;kb*=.15;}else{b.hitAcc+=d;if(b.hitAcc>b.maxHp*(b.type==='bsnail'?.08:.3)){b.hide=b.type==='bsnail'?1.2:1.5;b.hitAcc=0;pop(b.x,b.y-30,'SHELL!','#ff9ccb',16,.7);}}}
  b.hp-=d;b.kbV=Math.min((T.boss?90:240)*L.K,b.kbV+kb*(1-T.res)*L.K);if(b.hitT<=0)b.sqT=0;b.hitT=.15;b.mood=1;
  if(G.t-b.lastSnd>.25&&!SIMMODE){b.lastSnd=G.t;SFX.pop(T.boss?.5:rand(.9,1.3));burst(b.x,b.y-T.r*.4,2,'#fff3a0',140);}
  if(b.type==='gecko'&&!b.noTail&&b.hp<b.maxHp*.5){b.noTail=true;pop(b.x,b.y-24,'Tail drop!','#b8f58a',15,.7);}
  if(b.hp<=0)kill(b,false);}
function kill(b,flushed){if(b.dead)return;const T=BT[b.type];b.dead=true;b.vx=rand(-90,90);b.vy=flushed?rand(80,200):rand(-240,-150);b.spinV=rand(6,12)*(rnd()<.5?-1:1);b.spin=0;b.mood=3;
  G.combo=G.comboT>0?G.combo+1:1;G.comboT=1.2;G.streak++;G.bestStreak=Math.max(G.bestStreak,G.streak);const nm=Math.min(D.mx,1+Math.floor(G.streak/4));if(nm>G.mult&&!SIMMODE){pop(200,L.rimY-40,'STREAK x'+nm+'!','#ffae1f',24,1.1);SFX.coin();}G.mult=nm;const c=Math.round(T.pts*(b.gold?6:1)*G.mult);
  if(b.type==='blob'&&!flushed){for(let i=0;i<3;i++){const m=spawn({type:'mini',x:clamp(b.x+(i-1)*20*L.K,wallL(b.y)+12,wallR(b.y)-12),y:b.y+rand(-4,4)});m.spawnT=.3;m.kbV=60*L.K;}pop(b.x,b.y-30,'SPLIT!','#b8ff6a',16,.7);}
  if(!T.boss&&!flushed&&rnd()<.065&&G.picks.length<2)G.picks.push({k:rnd()<.5?'can':'beer',x:b.x,y:b.y,t:0,got:0});if(b.gold&&!SIMMODE){pop(b.x,b.y-60,'GOLDEN ROACH!','#ffd23a',26,1.4);SFX.power();}G.earned+=c;G.kills++;
  pop(b.x,b.y-10,'+'+c,G.mult>1?'#ffae1f':'#ffe066',T.boss?34:18);
  burst(b.x,b.y,T.boss?26:8,'#ffe56b',T.boss?340:220);if(FX&&!flushed)FX.burst(b.x*SC,b.y*SC,T.boss?30:16);if(!SIMMODE){SFX.squish(T.boss?.5:rand(.85,1.2));if(G.combo%5===0)SFX.coin();}
  if(T.boss){G.shake=1.3;G.hitstop=.18;G.boss=null;vib([80,50,160]);if(!SIMMODE){$('bossbar').classList.remove('on');pop(200,L.rimY+80,'BOSS FLUSHED!','#ffe066',32,1.6);}}}
function breakStreak(why){if(G.streak>=4&&!SIMMODE)pop(200,L.rimY-40,why||'STREAK LOST','#ff7a9a',18,.9);G.streak=0;G.mult=1;}
function hurt(b){const T=BT[b.type];if(!SIMMODE)SCN.ev('stomp');const n=T.boss?3:1;breakStreak('STREAK BROKEN');DBG.esc=DBG.esc||{};DBG.esc[b.type]=(DBG.esc[b.type]||0)+1;G.lives=Math.max(0,G.lives-n);G.lost+=n;G.shake=Math.max(G.shake,.6);
  if(!SIMMODE){SFX.hurt();vib([70,40,90]);pop(b.x,L.rimY-24,['GOT OUT!','ESCAPED!','EWW, NO!','IT\u2019S LOOSE!'][Math.floor(rand(0,4))],'#ff7a9a',18,1.1);hudHearts(true);$('app').classList.remove('hurt');void $('app').offsetWidth;$('app').classList.add('hurt');}
  if(G.lives<=0){G.endT=.8;}}
function doFlush(){if(G.state!=='play'||G.paused)return;if(G.flushes<=0||G.flushFx){if(!SIMMODE){SFX.deny();pop(200,L.rimY+40,G.flushes<=0?'No flushes left!':'Already flushing\u2026','#fff',15,.8);}return;}
  G.flushes--;G.flushFx={t:0,id:rnd(),front:null};if(!SIMMODE)SCN.ev('flush');G.shake=1;if(!SIMMODE){SFX.flush();vib(120);hudFlush();}}
/* ---------------- bot (for difficulty measurement) ----------------
   v7 human-like bot: perceives the bowl every 0.12-0.47 s (stale positions in between), needs a reaction delay to switch targets,
   moves its finger at a finite speed, and its aim wanders (smooth random drift) instead of being re-rolled. Darkness, gunk and webs make it worse. */
const BOT={on:Q.has('bot'),skill:.6,lag:0,tx:200,ty:400,ax:200,ay:500,tgt:null,react:0,nx:0,ny:0,px:0,py:0,side:0};
function botVis(x,y){let v=1;if(G.mods.includes('dark'))v*=G.dk.f>0?2.6:1.5;for(const g of G.gunk)if(g.t>.3&&Math.hypot(g.x-x,g.y-y)<g.r)v*=2.2;return v;}
function botStep(dt,st){const sk=BOT.skill;BOT.lag-=dt;BOT.react-=dt;
  const t0=BOT.tgt;if(t0&&(t0.dead||t0.esc!=null||(t0.got)))BOT.tgt=null,BOT.lag=Math.min(BOT.lag,.05);
  if(BOT.lag<=0){BOT.lag=.12+(1-sk)*.35;let tgt=null,best=1e9;
    for(const b of G.bugs){if(b.dead||b.esc!=null||b.spawnT<.25)continue;const ty=b.type;let sc=b.y-(BT[ty].boss?120:0)+rand(0,(1-sk)*170)*botVis(b.x,b.y);
      if(ty==='healer'||ty==='spitter')sc-=90*sk;if(ty==='climber')sc-=50*sk;if(b===BOT.tgt)sc-=30;if(sc<best){best=sc;tgt=b;}}
    const pk=G.picks.find(p=>!p.got);if(pk&&rnd()<sk*.35)tgt=pk;else if(G.power&&!G.power.got&&rnd()<sk*.4)tgt=G.power;
    if(tgt!==BOT.tgt){BOT.tgt=tgt;BOT.react=(.2+(1-sk)*.35)*(tgt?botVis(tgt.x,tgt.y):1);BOT.side=tgt&&tgt.cap&&rnd()<sk*1.1?(rnd()<.5?-1:1):0;}
    if(tgt){BOT.px=tgt.x;BOT.py=tgt.y-(tgt.type&&BT[tgt.type].boss?10:0);}
    if(G.callable&&!window.NOCALL&&rnd()<sk*.5)callWave();
    if(G.flushes>0&&!G.flushFx){let n=0,cap=0;for(const b of G.bugs)if(!b.dead&&b.esc==null){if(b.y<L.rimY+L.wallH*.25)n++;if(b.cap||b.butt)cap++;}if(n>=(sk>.7?3:4)||(G.boss&&G.boss.y<L.rimY+L.wallH*.3)||(cap>=4&&sk>.5))doFlush();}}
  const vis=botVis(BOT.ax,BOT.ay),amp=(8+(1-sk)*36)*vis;
  for(const k of ['nx','ny']){BOT[k]+=-BOT[k]*2.2*dt+rand(-1,1)*amp*3.2*Math.sqrt(dt);}
  const tg=BOT.tgt;if(tg&&BOT.react<=0){const r=tg.type?BT[tg.type].r:15;BOT.tx=BOT.px+BOT.side*r*.75+BOT.nx;BOT.ty=BOT.py+BOT.ny*.7;}
  const dx=BOT.tx-BOT.ax,dy=BOT.ty-BOT.ay,d=Math.hypot(dx,dy),v=(350+600*sk)*(G.web>0?.45:1)*dt;if(d>v){BOT.ax+=dx/d*v;BOT.ay+=dy/d*v;}else{BOT.ax=BOT.tx;BOT.ay=BOT.ty;}
  let fire=!!tg&&!G.dry;if(fire&&sk>.5&&G.bladder<st.cap*.12&&!G.boss&&tg.y>L.rimY+L.wallH*.55)fire=false;/* tank management */
  BOT.fire=fire;G.f.down=fire;G.f.x=BOT.ax;G.f.y=BOT.ay;G.f.touch=false;}
/* ---------------- update ---------------- */
function update(dt){
  if(G.state!=='play')return;G.t+=dt;
  if(G.hitstop>0){G.hitstop-=dt;return;}
  const st=stats();
  G.shake=Math.max(0,G.shake-dt*1.8);G.bounce=Math.max(0,G.bounce-dt*3);if(G.comboT>0)G.comboT-=dt;if(G.super>0)G.super=Math.max(0,G.super-dt);
  if(BOT.on)botStep(dt,st);
  const fo=0;const tx=clamp(G.f.x,4,W-4),ty=clamp(G.f.y-fo,L.U.y-30,H-24);const k=1-Math.exp(-dt*(G.web>0?3.5:18));G.aim.x+=(tx-G.aim.x)*k;G.aim.y+=(ty-G.aim.y)*k;
  const want=G.f.down;
  if(G.bladder<=.5&&!G.dry){G.dry=true;pop(200,L.oy-150,'Running on empty\u2026','#ffe066',18,1.2);if(!SIMMODE)SFX.sput();}
  if(G.dry&&G.bladder>=st.cap*D.dryR)G.dry=false;
  G.firing=want&&!G.dry&&!(FX&&G.flushFx);if(G.dry&&want)DBG.dryT=(DBG.dryT||0)+dt;if(G.firing){DBG.fireT+=dt;if(G.bugs.some(b=>!b.dead&&b.esc==null))DBG.ft+=dt;}/* v6: the stream pauses while the flush sheet runs */
  if(G.firing){if(G.super<=0)G.bladder=Math.max(0,G.bladder-dt*11*D.drain*(G.pPres>0?1.25:1));}else G.bladder=Math.min(st.cap,G.bladder+dt*st.refill*(want?.5:1));
  const ox=L.cx+clamp((G.aim.x-L.cx)*.06,-10,10),oy=L.bowlBot+14;/* virtual launch point (keeps v2 reach/lag) */G.ox=L.cx+(G.aim.x-L.cx)*.28+Math.sin(G.t*1.1)*7+Math.sin(G.t*2.7)*2;G.oy=-36+Math.sin(G.t*1.7)*3;if(!SIMMODE)SCN.aimJitter(dt);
  v7tick(dt);
  if(FX)fxUpdate(dt,st);
  else if(G.firing){G.emit+=dt*(SIMMODE?36:72);const per=SIMMODE?2:1;const dx=G.aim.x-ox,dy=G.aim.y-oy;const d=Math.min(Math.hypot(dx,dy),st.range),a0=Math.atan2(dy,dx);
    const offs=st.streams===1?[0]:st.streams===2?[-.1,.1]:[-.17,0,.17];
    while(G.emit>=1){G.emit-=1;G.seq++;offs.forEach((off,si)=>{const a=a0+off+Math.sin(G.t*13+si)*.012,dd=d*(off?.97:1)*(1+.012*Math.sin(G.t*9+si));const tx2=ox+Math.cos(a)*dd,ty2=oy+Math.sin(a)*dd;const tf=.15+Math.hypot(tx2-ox,ty2-oy)/1500;
      G.drops.push({x:G.ox,y:G.oy,ox:G.ox+(si-(st.streams-1)/2)*10,oy:G.oy,tx:tx2,ty:ty2,u:0,age:0,tf,sid:si,seq:G.seq,dmg:st.dps/72*per*(off?.62:1),kb:st.kb/72*per*(off?.7:1)*6,rad:st.rad*(off?.85:1)*L.K});});}
    if(!SIMMODE&&G.drops.length>6&&rnd()<dt*22){const d=G.drops[Math.floor(rnd()*G.drops.length)];if(!d.dribble&&d.u>.2&&d.u<.9)G.parts.push({k:'drop',x:d.x+rand(-3,3),y:d.y,vx:rand(-30,30),vy:rand(80,200),t:0,life:rand(.15,.3),r:rand(1,2.4)*(1.4-d.u),col:'#ffe27a'});}
    if(!SIMMODE)streamSnd(1,2300+S.up.pres*300+(G.super>0?700:0));
  }
  if(!G.firing){G.emit=0;if(!SIMMODE){streamSnd(0);if(want&&G.dry&&rnd()<dt*5){SFX.sput();G.drops.push({x:G.ox+rand(-6,6),y:-6,vx:rand(-20,20),vy:rand(260,340),age:0,tf:.5,sid:9,seq:-99,dmg:0,kb:0,rad:0,dribble:1});}}}
  for(let i=G.drops.length-1;i>=0;i--){const d=G.drops[i];d.age+=dt;if(d.dribble){d.vy+=900*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;}else streamPos(d);if(d.age>=d.tf){G.drops.splice(i,1);if(!d.dribble)impact(d);}}
  for(let i=G.parts.length-1;i>=0;i--){const p=G.parts[i];p.t+=dt;if(p.t>=p.life){G.parts.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.k==='drop')p.vy+=800*dt;}
  for(let i=G.pops.length-1;i>=0;i--){const p=G.pops[i];p.t+=dt;if(p.t>=p.dur)G.pops.splice(i,1);}
  for(let i=G.stains.length-1;i>=0;i--){const s=G.stains[i];s.a-=dt*(G.flushFx?.8:.03);if(s.a<=0)G.stains.splice(i,1);}
  // power-up: energy drink can floats down
  if(!G.power){G.powerT-=dt;if(G.powerT<=0&&G.queue.length+G.bugs.length>0){G.power={x:rand(wallL(L.rimY+40)+24,wallR(L.rimY+40)-24),y:L.rimY+14,t:0,got:false};G.powerT=rand(16,22);}}
  else{const p=G.power;p.t+=dt;if(!p.got){p.y+=dt*30*L.K;p.x+=Math.sin(p.t*1.6)*dt*30*L.K;if(p.y>L.waterY-10)G.power=null;}else if(p.t>.8)G.power=null;}
  if(G.flushFx){const f=G.flushFx;f.t+=dt;if(FX&&!f.fx&&f.t>=FL.w0-.06){f.fx=1;FX.flush();}f.front=f.t>FL.w0?flushFront(L.cx,f.t):null;
    if(f.t>FL.w0&&f.t<FW.tt1){const fy=flFront(f.t),ty=flTop(f.t);for(const b of G.bugs){if(b.dead||b.esc!=null)continue;const T=BT[b.type];
      if(b.y<fy+T.r*.6&&b.y>ty-T.r&&b.fl!==f.id&&(b.cap||b.butt)){if(b.cap)pop(b.x,b.y-30,'CAP OFF!','#d8e4ee',15,.7);b.cap=0;b.butt=0;}
      if(b.y<fy+T.r*.6&&b.y>ty-T.r){if(T.boss){if(b.fl!==f.id){b.fl=f.id;damage(b,b.maxHp*.12,0,'flush');b.kbV=300*L.K;}}else if(b.fl!==f.id){b.fl=f.id;if(b.hp<=b.maxHp*D.flw){kill(b,true);b.vx=(L.drainX-b.x)*1.6;b.vy=Math.max(160,(L.waterY-b.y)*1.8);}else{damage(b,b.maxHp*D.flw,0,'flush');b.kbV=260*L.K;}}}}
      for(const st of G.stains)if(st.y<fy)st.a=Math.min(st.a,.15);if(G.wet)for(const w of G.wet)if(w.y<fy)w.a*=.85;}
    if(f.t>FW.end)G.flushFx=null;}
  updFans(dt);updCall(dt);
  G.wt+=dt;while(G.queue.length&&G.queue[0].t<=G.wt)spawn(G.queue.shift());
  let danger=false;for(let i=G.bugs.length-1;i>=0;i--){const b=G.bugs[i];if(updBug(b,dt)){G.bugs.splice(i,1);continue;}if(!b.dead&&b.esc==null&&b.y<L.rimY+L.wallH*.22)danger=true;}
  G.danger=danger;if(!SIMMODE)SCN.update(dt);
  if(G.endT!=null){G.endT-=dt;if(G.endT<=0){G.endT=null;endLevel(false);return;}}
  if(G.lives>0&&!G.queue.length&&!G.bugs.length){if(G.clearT<0)G.clearT=0;G.clearT+=dt;if(G.clearT>1){G.clearT=-1;endLevel(true);}}
  if(!SIMMODE&&!BOT.on){/* tutorial nudge */}
}
/* v6 fluid: the 3D jet replaces the drops; damage comes from particle hits on the bugs (direct jet 1, splash .35, second bounce .12) */
const FXK=+(Q.get('fxk')||1.4),FXB=+(Q.get('fxb')||1),FXS=+(Q.get('fxs')||4.4),FXKB=+(Q.get('fxkb')||1.5);/* calibrated: fluid DPS on a held target ~= v5g direct+wash (see BALANCE.md v6) */
function fxPoints(st){const o={x:L.cx+clamp((G.aim.x-L.cx)*.06,-10,10),y:L.bowlBot+14};const dx=G.aim.x-o.x,dy=G.aim.y-o.y,d=Math.min(Math.hypot(dx,dy),st.range),a0=Math.atan2(dy,dx);
  const offs=st.streams===1?[0]:st.streams===2?[-.1,.1]:[0,-.17,.17];return offs.map(off=>{const dd=d*(off?.97:1);return {x:o.x+Math.cos(a0+off)*dd,y:o.y+Math.sin(a0+off)*dd,w:off?.62:1};});}
function fxUpdate(dt,st){const pts=fxPoints(st);G.fxAim=pts[0];G.hx=pts[0].x;
  FX.aim(pts.map(p=>({x:p.x*SC,y:p.y*SC,w:p.w})));FX.flow(G.firing,G.super>0||G.pPres>0?1.3:1,G.super>0,Math.min(4,S.up.wid+(G.pWide>0?2:0)));
  if(G.firing&&!SIMMODE){streamSnd(1,2300+S.up.pres*300+(G.super>0?700:0));G.emit+=dt*72;while(G.emit>=1){G.emit-=1;for(const p of pts){const d={x:p.x,y:p.y,tx:p.x,ty:p.y,ox:L.cx,oy:-40,sid:0,dmg:0,kb:0,rad:0};if(SCN.impact(d))continue;/* v6.1: ambient wall trickles + spray specks restored (v5g impact()) */if(p.y>=L.rimY-16)SCN.splash(p.x,p.y,1);else if(rnd()<.3)G.parts.push({k:'drop',x:p.x,y:p.y,vx:rand(-60,60),vy:rand(-60,30),t:0,life:.5,r:2,col:'#ffe56b'});if(rnd()<.06){G.stains.push({x:p.x+rand(-8,8),y:p.y+rand(-6,6),r:rand(6,14),a:.25});if(G.stains.length>60)G.stains.shift();}}}}
  const tl=[],tb=[];for(const b of G.bugs){if(b.dead||b.esc!=null||b.spawnT<.1)continue;tl.push({x:b.x*SC,y:b.y*SC,r:(BT[b.type].r+st.rad*L.K*.5)*SC});tb.push(b);}
  if(G.power&&!G.power.got){tl.push({x:G.power.x*SC,y:G.power.y*SC,r:18*SC});tb.push(G.power);}
  for(const p of G.picks)if(!p.got){tl.push({x:p.x*SC,y:p.y*SC,r:20*SC});tb.push(p);}
  FX.targets(tl);FX.step(dt);const h=FX.hits();const k=st.dps*FXK/(h.rate*1.3*.6),kbk=6*st.kb/st.dps*FXKB;
  for(let i=0;i<h.n;i++){const u=h.u[i];if(u<=0)continue;const b=tb[i];
    if(b.k){if(h.j[i]+h.s[i]>=2)grabPick(b);continue;}
    if(b===G.power){if(h.j[i]+h.s[i]>=2){const p=G.power;p.got=true;p.t=0;G.bladder=stats().cap;G.super=6;pop(p.x,p.y-20,'MEGA STREAM!','#9fffd0',26,1.3);burst(p.x,p.y,14,'#9fffd0',260);G.bounce=1;if(!SIMMODE){SFX.power();vib(40);}}continue;}
    const dm=u*k*(BT[b.type].boss?FXB*(b.type==='bspider'?FXS:b.type==='bsnail'?1.5:1):1);b._fxd=(b._fxd||0)+dm;damage(b,dm,dm*kbk);b.wet=.3;}}
/* ---------------- v7: streak, pickups, gunk, web, darkness ---------------- */
function v7tick(dt){if(G.pPres>0)G.pPres-=dt;if(G.pWide>0)G.pWide-=dt;if(G.web>0)G.web-=dt;
  if(G.firing&&G.streak>0&&G.t-G.lastHitT>.9&&G.bugs.some(b=>!b.dead&&b.esc==null))breakStreak('MISSED! Streak lost');
  if(!G.firing)G.lastHitT=Math.max(G.lastHitT,G.t-.5);
  for(let i=G.picks.length-1;i>=0;i--){const p=G.picks[i];p.t+=dt;if(p.got){if(p.t>.7)G.picks.splice(i,1);continue;}p.y+=dt*22*L.K;p.x+=(L.drainX-p.x)*dt*.15;if(p.t>7||p.y>L.waterY)G.picks.splice(i,1);}
  for(let i=G.gunk.length-1;i>=0;i--){const g=G.gunk[i];g.t+=dt;if(g.t>g.life)G.gunk.splice(i,1);}
  if(G.mods.includes('dark')){const k=G.dk;k.n-=dt;if(k.f>0)k.f-=dt;if(k.n<=0){k.f=rand(.35,.9);k.n=rand(2.2,4.5)/D.atk;if(!SIMMODE&&okA('bz',300))nz(.2,.08,120,90,8);}}}
function grabPick(p){p.got=1;p.t=0;if(p.k==='can'){G.pPres=7;pop(p.x,p.y-24,'PRESSURE UP!','#ff6b6b',22,1.1);}else{G.pWide=8;pop(p.x,p.y-24,'BEER HOSE!','#ffd23a',22,1.1);}burst(p.x,p.y,12,'#ffe56b',240);G.bounce=1;if(!SIMMODE){SFX.power();vib(30);}}
function spitAt(b,big){if(G.gunk.length>=(big?4:3))return;const a=G.aim;const g={x:clamp(a.x+rand(-70,70),40,W-40),y:clamp(a.y+rand(-90,40),L.top+30,H-80),r:rand(38,54)*(big?1.3:1),t:0,life:D.gk,fx:b.x,fy:b.y,seed:rnd()*9,web:b.type==='bspider'};G.gunk.push(g);
  if(g.web)G.web=2.2;if(!SIMMODE){pop(b.x,b.y-30,g.web?'THWIP!':'HOCK-PTOO!','#c8ff5a',16,.7);if(okA('gob',150)){nz(.25,.25,500,150,2);tone('sawtooth',300,80,.2,.08);}}}
function maybeCard(k){if(SIMMODE||BOT.on||!CARDS[k])return;const force=Q.has('cards');if((S.seen[k]&&!force)||G.cardQ.includes(k)||(force&&G['cs_'+k]))return;G['cs_'+k]=1;G.cardQ.push(k);if(G.cardQ.length===1)setTimeout(showCard,G.t<.1?700:0);}
function showCard(){const k=G.cardQ[0];if(!k||G.state!=='play')return;G.paused=true;G.f.down=false;G.f.id=null;streamSnd(0);const C=CARDS[k];$('cName').textContent=C[0];$('cDesc').textContent=C[1];$('cRib').textContent=MODL[k]?'LEVEL TWIST!':'NEW BUG!';
  const cv2=$('cArt'),c=cv2.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv2.width,cv2.height);c.setTransform(2,0,0,2,0,0);cardArt(c,k,cv2.width/4,cv2.height/4);showScr('icard');SFX.power();}
function cardOk(){const k=G.cardQ.shift();if(k){S.seen[k]=1;save();}SFX.click();if(G.cardQ.length){showCard();return;}showScr('none');G.paused=false;}
function cardArt(c,k,x,y){c.save();c.translate(x,y);
  if(BT[k]){const n=k==='gnat'?5:1;for(let i=0;i<n;i++){const b={type:k,x:0,y:0,t:0,ph:i,hp:1,maxHp:1,mood:0,look:[0,-1],blink:0,hitT:0,sqT:9,cap:k==='armor'?1:0,hide:0,wind:0};c.save();if(n>1)c.translate((i-2)*20,Math.sin(i*2)*14);const r=(n>1?13:32)/BT[k].r;c.scale(r,r);if(!SPR.bug(c,b,i))(BUGART[BASEART[k]]||BUGART.mosq)(c,b,0);c.restore();}}
  else{const s=1.6;c.scale(s,s);if(k==='dark'){c.fillStyle='#1a1424';c.fillRect(-60,-30,120,60);const g=c.createRadialGradient(0,-8,2,0,-8,34);g.addColorStop(0,'rgba(255,240,170,.9)');g.addColorStop(1,'rgba(255,240,170,0)');c.fillStyle=g;c.fillRect(-60,-40,120,80);circ(c,0,-10,9);fillS(c,'#fff6c8',2.5);rr(c,-5,-2,10,7,2);fillS(c,'#999',2);for(const e of[-30,24])for(const s2 of[-1,1]){circ(c,e+s2*4,14,2.4);c.fillStyle='#fff8a0';c.fill();}}
    else if(k==='slip'){for(let i=0;i<9;i++){circ(c,Math.sin(i*2.3)*40,Math.cos(i*1.7)*18,5+i%3*3);c.fillStyle='rgba(220,245,255,.85)';c.fill();c.strokeStyle='rgba(80,140,200,.8)';c.lineWidth=1.5;c.stroke();}rr(c,-22,-8,44,18,6);fillS(c,'#7fd7ff',3);c.fillStyle=OL;c.font='12px '+FONT;c.textAlign='center';c.fillText('SOAP',0,6);}
    else if(k==='butts'){drawButt(c,-14,0,.4,1.1);drawButt(c,16,6,-.6,1);}
    else if(k==='fast'){c.fillStyle='#ffd23a';c.strokeStyle=OL;c.lineWidth=3;for(const o of[-16,10]){c.beginPath();c.moveTo(o-14,-18);c.lineTo(o+14,0);c.lineTo(o-14,18);c.closePath();c.fill();c.stroke();}}}
  c.restore();}
function drawButt(c,x,y,rot,s){c.save();c.translate(x,y);c.rotate(rot);c.scale(s,s);rr(c,-6,-15,12,13,3);fillS(c,lin(c,-6,0,6,0,[[0,'#b86a2a'],[.5,'#f0a860'],[1,'#a05a20']]),2);
  rr(c,-6,-3,12,17,2);fillS(c,lin(c,-6,0,6,0,[[0,'#d8d0c0'],[.5,'#fffaf0'],[1,'#c8c0b0']]),2);ell(c,0,14,6,3);fillS(c,'#3a3030',1.5);ell(c,0,14,3.5,1.6);c.fillStyle='#ff7a30';c.globalAlpha=.6;c.fill();c.globalAlpha=1;
  c.fillStyle='rgba(120,80,30,.5)';for(let i=0;i<4;i++){circ(c,Math.sin(i*2.7)*3,-12+i*2.5,.9);c.fill();}c.restore();}
/* v7 props drawn over a bug sprite (local coords, facing up, h = sprite height) */
function drawAcc(c,b,t,h){const T=BT[b.type],r=T.r;
  if(b.cap){c.save();c.translate(0,-r*.35);ell(c,0,0,r*.95,r*.8);fillS(c,lin(c,-r,0,r,0,[[0,'#6c7884'],[.35,'#e8eef4'],[.6,'#a8b4c0'],[1,'#4c5864']]),2.5);
    c.strokeStyle='rgba(40,50,60,.7)';c.lineWidth=1.4;for(let i=0;i<14;i++){const a=i/14*TAU;c.beginPath();c.moveTo(Math.cos(a)*r*.72,Math.sin(a)*r*.6);c.lineTo(Math.cos(a)*r*.95,Math.sin(a)*r*.8);c.stroke();}
    ell(c,0,0,r*.55,r*.45);c.fillStyle='#c8202a';c.fill();c.fillStyle='#fff';c.font='bold '+Math.round(r*.42)+'px '+FONT;c.textAlign='center';c.textBaseline='middle';c.fillText('COLA',0,1);gloss(c,-r*.4,-r*.35,r*.25,r*.12,.7);c.restore();}
  if(b.type==='healer'){c.save();c.translate(0,-r*.95);rr(c,-r*.55,-r*.32,r*1.1,r*.6,r*.15);fillS(c,'#fff',2);c.fillStyle='#e8203a';c.fillRect(-r*.08,-r*.25,r*.16,r*.46);c.fillRect(-r*.23,-r*.1,r*.46,r*.16);c.restore();
    if(b.heal>0){c.save();c.globalAlpha=b.heal;c.strokeStyle='#7dff8a';c.lineWidth=3;circ(c,0,0,r*(1.2+(1-b.heal)*2.5));c.stroke();c.restore();}}
  if(b.type==='spitter'){c.save();c.translate(0,-r*.85);const q=b.wind>0?1+b.wind*.8:1;ell(c,0,r*.1,r*.22*q,r*.3*q);fillS(c,'#b8ff3a',1.5);ell(c,0,r*.45,r*.08,r*.25*(1+Math.sin(t*5)*.3));c.fillStyle='#b8ff3a';c.fill();c.restore();}
  if(b.type==='climber'){c.save();c.translate(0,-r*.95);rr(c,-r*.5,-r*.12,r,r*.24,r*.1);fillS(c,'#ff2a4a',1.5);c.restore();if(!b.dead){c.save();c.globalAlpha=.55;c.strokeStyle='#fff';c.lineWidth=2;for(const o of[-.4,0,.4]){c.beginPath();c.moveTo(o*r,r*1.2);c.lineTo(o*r,r*1.2+10+Math.sin(t*20+o*9)*4);c.stroke();}c.restore();}}
  if(b.type==='dodger'&&b.dash>0){c.save();c.globalAlpha=.35;c.strokeStyle='#8fd0ff';c.lineWidth=3;for(const o of[1,2])for(const s2 of[-1,1]){c.beginPath();c.moveTo(-b.dir*o*9-r*.4*s2*.3,-r*.6*s2);c.lineTo(-b.dir*(o*9+12),-r*.6*s2);c.stroke();}c.restore();}
  if(b.type==='blob'){c.save();c.globalAlpha=.75;for(let i=0;i<3;i++){const a=t*2+i*2.1;circ(c,Math.cos(a)*r*.6,r*.3+Math.sin(a)*r*.4,2.5+i);c.fillStyle='#c8ff7a';c.fill();}c.restore();}
  if(b.butt>0){c.save();c.rotate(-b.rot+.3+Math.sin(b.ph)*.6);drawButt(c,0,0,0,r/9);c.restore();}
  if(T.boss&&b.wind>0){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.25+.25*Math.sin(t*40);circ(c,0,0,r*1.1);c.fillStyle='#ff4040';c.fill();c.restore();}}
window.drawAcc=drawAcc;
const BASEART={gnat:'mosq',dodger:'roach',armor:'roach',blob:'ant',mini:'ant',climber:'gecko',spitter:'fly',healer:'snail'};
/* overlays on the top layer: darkness, gunk, web */
function drawOver(c){if(G.mods.includes('dark')){const a=(FX&&G.fxAim)||G.aim,bo=G.dk.f>0,fl=bo?.96:.8+.05*Math.sin(G.t*23)*Math.sin(G.t*7),R=bo?50:110;
    const g=c.createRadialGradient(a.x,a.y,R*.2,a.x,a.y,R);g.addColorStop(0,'rgba(6,4,14,'+(bo?.55:.05)+')');g.addColorStop(1,'rgba(6,4,14,'+fl+')');c.fillStyle=g;c.fillRect(0,0,W,H);
    if(!bo){const b2=c.createRadialGradient(L.cx,L.rimY-30,5,L.cx,L.rimY-30,160);b2.addColorStop(0,'rgba(255,230,150,.18)');b2.addColorStop(1,'rgba(255,230,150,0)');c.fillStyle=b2;c.fillRect(0,0,W,H);}
    for(const b of G.bugs){if(b.dead||b.esc!=null)continue;const r=BT[b.type].r,bl=b.blink?.2:1;c.globalAlpha=bl*(bo?.8:.95);c.fillStyle=b.cap?'#9fe0ff':'#fff7a0';for(const s2 of[-1,1]){circ(c,b.x+s2*r*.28,b.y-r*.55,Math.max(1.6,r*.12));c.fill();}}c.globalAlpha=1;}
  for(const g of G.gunk){const k=g.t<.3?g.t/.3:1,fa=Math.min(1,(g.life-g.t)/.8);if(k<1){c.save();c.globalAlpha=.9;circ(c,g.fx+(g.x-g.fx)*k,g.fy+(g.y-g.fy)*k-Math.sin(k*Math.PI)*60,6+k*6);c.fillStyle=g.web?'#f4f4f4':'#a8d83a';c.fill();c.restore();continue;}
    c.save();c.globalAlpha=fa*.93;c.translate(g.x,g.y+(g.t-.3)*4);let s=Math.floor(g.seed*1000)+7;const r=()=>(s=(s*16807)%2147483647)/2147483647;
    if(g.web){c.strokeStyle='rgba(250,250,250,.9)';c.lineWidth=1.6;for(let i=0;i<10;i++){const a=i/10*TAU;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*g.r,Math.sin(a)*g.r);c.stroke();}for(let q=1;q<=4;q++){c.beginPath();for(let i=0;i<=10;i++){const a=i/10*TAU,rr2=g.r*q/4*(.92+.1*Math.sin(i*3));c.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2);}c.stroke();}}
    else{c.beginPath();for(let i=0;i<=18;i++){const a=i/18*TAU,rr2=g.r*(.75+.35*r());c.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2);}c.closePath();const gr=c.createRadialGradient(-g.r*.3,-g.r*.3,2,0,0,g.r*1.1);gr.addColorStop(0,'#e8ff9a');gr.addColorStop(.5,'#9ccc2a');gr.addColorStop(1,'#5a7a10');c.fillStyle=gr;c.fill();c.strokeStyle='rgba(42,26,46,.6)';c.lineWidth=2;c.stroke();
      for(let i=0;i<4;i++){const x=(r()-.5)*g.r*1.2,len=8+r()*20+(g.t)*6;rr(c,x-3,g.r*.4,6,len,3);c.fillStyle='#8cbc20';c.fill();}for(let i=0;i<3;i++){circ(c,(r()-.5)*g.r,(r()-.5)*g.r,3+r()*5);c.fillStyle='rgba(240,255,190,.7)';c.fill();}}
    c.restore();}
  if(G.web>0){c.save();c.globalAlpha=Math.min(1,G.web)*.5;c.strokeStyle='#fff';c.lineWidth=1.2;const a=(FX&&G.fxAim)||G.aim;for(let i=0;i<6;i++){const q=i/6*TAU;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(a.x+Math.cos(q)*30,a.y+Math.sin(q)*30);c.stroke();}c.restore();}}
function drawPicks(c){for(const p of G.picks){c.save();c.translate(p.x,p.y);const s=p.got?1+p.t*2:1;c.scale(s,s);c.globalAlpha=p.got?Math.max(0,1-p.t/.7):Math.min(1,p.t*3)*(p.t>5.5?.5+.5*Math.sin(p.t*20):1);c.rotate(Math.sin(p.t*3)*.3);
  const g=c.createRadialGradient(0,0,2,0,0,30);g.addColorStop(0,p.k==='can'?'rgba(255,90,90,.6)':'rgba(255,210,60,.6)');g.addColorStop(1,'rgba(255,200,60,0)');c.fillStyle=g;circ(c,0,0,30);c.fill();
  if(p.k==='can'){rr(c,-9,-15,18,30,5);fillS(c,lin(c,-9,0,9,0,[[0,'#8a0f1a'],[.45,'#ff5a5a'],[1,'#7a0a14']]),2.5);rr(c,-8,-17,16,4,2);fillS(c,'#ccd',1.5);c.fillStyle='#fff';c.font='9px '+FONT;c.textAlign='center';c.fillText('PSI',0,3);}
  else{rr(c,-7,-6,14,22,4);fillS(c,lin(c,-7,0,7,0,[[0,'#5a2a08'],[.45,'#c87a20'],[1,'#4a2006']]),2.5);rr(c,-3,-17,6,12,2);fillS(c,'#6a3a10',2);rr(c,-6,0,12,9,2);c.fillStyle='#f4e0a0';c.fill();ell(c,0,-18,5,3);c.fillStyle='#fff';c.fill();}
  c.restore();}}
/* stream falls from the player above the camera: quadratic arc O->T, accelerating (gravity), perspective handled in drawStream */
function streamPos(d){const u=Math.min(1,d.age/d.tf),e=u*(.55+.45*u),cx=d.ox+(d.tx-d.ox)*.62+(d.tx>d.ox?-1:1)*Math.min(40,Math.abs(d.tx-d.ox)*.3),cy=d.oy+(d.ty-d.oy)*.22,m=1-e;d.u=e;
  d.x=m*m*d.ox+2*m*e*cx+e*e*d.tx+Math.sin(d.seq*.9+d.age*30)*1.6*m;d.y=m*m*d.oy+2*m*e*cy+e*e*d.ty;d.x=e>=1?d.tx:d.x;d.y=e>=1?d.ty:d.y;}
/* v5 wash: the stream sheets over porcelain/bug bodies as an irregular fan opening down the wall slope (skewed by aim + wall curvature, bending to the drain low down) */
function washDir(x,y,d){const hw=Math.max(20,(wallR(y)-wallL(y))/2);let a=Math.PI/2-.6*clamp(((d.tx||x)-(d.ox||x))/160,-1,1)+.55*clamp((x-L.cx)/hw,-1,1);
  const lo=clamp((y-(L.rimY+L.wallH*.5))/(L.wallH*.5),0,1);if(lo>0){let ad=Math.atan2(L.waterY-y,L.drainX-x);if(ad-a>Math.PI)ad-=TAU;if(ad-a<-Math.PI)ad+=TAU;a+=(ad-a)*lo*.75;}return a;}
function washAt(d,x,y){const sid=d.sid||0;let f=G.fans[sid];const a=washDir(x,y,d);
  if(!f||f.a<.05){f=G.fans[sid]={x,y,dir:a,len:5,a:1,seed:rnd()*9,last:G.t,hw:.5,tl:10};}
  else{f.x+=(x-f.x)*.35;f.y+=(y-f.y)*.35;const dd=Math.atan2(Math.sin(a-f.dir),Math.cos(a-f.dir));f.dir+=dd*.25;f.last=G.t;}
  f.tl=(178+16*S.up.wid)*L.K*(G.super>0?1.3:1)*(.85+.35*clamp((y-L.rimY)/L.wallH,0,1));f.hw=.86+.05*S.up.wid;return f;}
const WASH=.12;/* fan damage multiplier at the apex, linear falloff to 0 at the fan edge */
function washHit(f,d){for(const b of G.bugs){if(b.dead||b.esc!=null||b._dh===d)continue;const T=BT[b.type],dx=b.x-f.x,dy=b.y-f.y,r=Math.hypot(dx,dy);if(r>f.len+T.r*.6)continue;
    const an=Math.atan2(Math.sin(Math.atan2(dy,dx)-f.dir),Math.cos(Math.atan2(dy,dx)-f.dir));if(Math.abs(an)>f.hw+Math.atan2(T.r*.6,Math.max(1,r)))continue;
    const fall=clamp(1-r/(f.len+T.r*.6),0,1);damage(b,d.dmg*(window.WASHM!=null?window.WASHM:WASH)*fall,d.kb*.3*fall);b.wet=.3;}}
function updFans(dt){for(let i=0;i<G.fans.length;i++){const f=G.fans[i];if(!f)continue;f.ph=(f.ph||0)+dt;
    if(G.t-f.last<.08){f.a=Math.min(1,f.a+dt*8);f.len+=(f.tl-f.len)*Math.min(1,dt*9);}
    else{f.a-=dt*2.2;f.x+=Math.cos(f.dir)*dt*46*L.K;f.y+=Math.sin(f.dir)*dt*46*L.K;f.len*=1+dt*.5;if(f.a<=0){if(!SIMMODE){(G.wet=G.wet||[]).push({x:f.x,y:f.y,dir:f.dir,len:f.len,hw:f.hw,seed:f.seed,v:Math.floor(f.seed)%4,a:.55});if(G.wet.length>8)G.wet.shift();}G.fans[i]=null;}}}
  if(G.wet)for(let i=G.wet.length-1;i>=0;i--){G.wet[i].a-=dt*.32;if(G.wet[i].a<=0)G.wet.splice(i,1);}}
function impact(d){const x=d.x,y=d.y;if(!SIMMODE&&SCN.impact(d))return;if(y<L.rimY-16){if(!SIMMODE&&rnd()<.3)G.parts.push({k:'drop',x,y,vx:rand(-60,60),vy:rand(-60,30),t:0,life:.5,r:2,col:'#ffe56b'});return;}
  const r2=d.rad;G.hx=x;for(const b of G.bugs){if(b.dead||b.esc!=null)continue;const R=BT[b.type].r+r2,dx=b.x-x,dy=b.y-y;if(dx*dx+dy*dy<R*R){b._dh=d;damage(b,d.dmg,d.kb);}}
  for(const p of G.picks)if(!p.got&&Math.hypot(p.x-x,p.y-y)<r2+20)grabPick(p);
  washHit(washAt(d,x,y),d);
  if(G.power&&!G.power.got&&Math.hypot(G.power.x-x,G.power.y-y)<r2+20){const p=G.power;p.got=true;p.t=0;G.bladder=stats().cap;G.super=6;pop(p.x,p.y-20,'MEGA STREAM!','#9fffd0',26,1.3);burst(p.x,p.y,14,'#9fffd0',260);G.bounce=1;if(!SIMMODE){SFX.power();vib(40);}}
  if(SIMMODE)return;
  SCN.splash(x,y,1);
  if(rnd()<.06){G.stains.push({x:x+rand(-8,8),y:y+rand(-6,6),r:rand(6,14),a:.25});if(G.stains.length>60)G.stains.shift();}}
/* v5 flush: a tattooed hand presses the lever, water leaves the inlet, races round the inner rim contour, then sheets down the walls */
const FL={press:.3,w0:.34,rim:.5,v:1.05};
function flushFront(x,t){const tr=FL.w0+FL.rim*L.rimTop*Math.min(1,Math.abs(x-L.cx)/Math.max(1,L.cx-wallL(L.rimY)));const k=Math.max(0,t-tr)/FL.v;return t<tr?-1e3:L.rimY-4+L.wallH*1.08*Math.min(1.2,k*(.55+.45*k));}
/* v5 early call: wave cleared with a gap before the next group -> tap the can; a hand shakes its ash/butts into the bowl (bugs slowed), bonus coins */
const CANT={grab:.35,lift:.6,tilt:.95,pour:1.0,shakeEnd:1.9,back:2.45,end:2.75};
function updCall(dt){const alive=G.bugs.some(b=>!b.dead&&b.esc==null),gap=G.queue.length?G.queue[0].t-G.wt:0;
  G.callable=!alive&&G.queue.length>0&&gap>1.4&&!G.canFx&&G.t>3&&G.endT==null;G.callGap=gap;if(G.ashT>0)G.ashT-=dt;
  const c=G.canFx;if(c){const t0=c.t;c.t+=dt;if(t0<CANT.pour&&c.t>=CANT.pour){G.ashT=7;for(const b of G.bugs)if(!b.dead&&!BT[b.type].boss)b.ash=1;if(!SIMMODE)pop(L.cx,L.rimY+60,'ASHED! Bugs slowed','#e4e4e4',20,1.3);}if(c.t>CANT.end)G.canFx=null;}}
function callBonus(){return Math.max(2,Math.round(Math.max(0,(G.callGap||0)-.9)*3));}
function callWave(){if(!G.callable)return false;const gap=G.queue[0].t-G.wt,sh=Math.max(0,gap-.9);const bonus=callBonus();for(const q of G.queue)q.t-=sh;G.earned+=bonus;G.calls++;G.canFx={t:0};G.callable=false;
  if(!SIMMODE){pop(L.cx,L.rimY-34,'EARLY CALL! +'+bonus,'#ffd23a',22,1.3);SFX.coin();}return true;}
/* boss attack patterns, unlocked by phase: lunge (wind-up flash, then a dash for the rim), spit (gunk / web on the screen), heal (calls a Nurse Snail) */
function bossAtk(b,dt,a1,a2){const at=[a1,a2].filter(Boolean);if(!at.length||b.wind>0||b.lunge>0)return;b.acd-=dt;if(b.acd>0)return;const a=at[Math.floor(rnd()*at.length)];b.acd=(a==='lunge'?4.5:a==='heal'?8:3.6)/D.atk;
  if(a==='lunge'){b.wind=.7;if(!SIMMODE)pop(b.x,b.y-60,'INCOMING!','#ff5a5a',22,.8);}
  else if(a==='spit')spitAt(b,1);
  else if(a==='heal'&&!G.bugs.some(o=>o.type==='healer'&&!o.dead))spawn({type:'healer',x:clamp(b.x+(rnd()<.5?-60:60)*L.K,wallL(b.y)+20,wallR(b.y)-20),y:b.y+10}).spawnT=.2;}
function updBug(b,dt){const T=BT[b.type];b.t+=dt;b.spawnT+=dt;b.sqT+=dt;if(b.hitT>0){b.hitT-=dt;if(b.hitT<=0&&!b.dead)b.mood=b.type==='bspider'?2:0;}
  b.bl-=dt;if(b.bl<=0){b.bl=rand(2,5);}b.blink=b.bl<.12?1:0;
  if(b.dead){if(b.gulp!=null){b.gulp+=dt;b.x+=(L.drainX-b.x)*Math.min(1,dt*8);b.y+=(L.waterY-b.y)*Math.min(1,dt*8);b.spin+=dt*14;if(b.gulp>.3){if(!SIMMODE){SFX.splash();for(let i=0;i<6;i++)G.parts.push({k:'drop',x:b.x+rand(-10,10),y:L.waterY,vx:rand(-90,90),vy:rand(-260,-140),t:0,life:.6,r:rand(2,4),col:'#bff0ff'});}return true;}return false;}
    b.vy+=1100*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.spin+=b.spinV*dt;b.x=clamp(b.x,wallL(b.y)+5,wallR(b.y)-5);if(b.vy>0&&b.y>=L.waterY-6)b.gulp=0;return false;}
  if(b.esc!=null){b.esc+=dt;b.y-=dt*70;if(b.esc>.5){hurt(b);if(b===G.boss){G.boss=null;if(!SIMMODE)$('bossbar').classList.remove('on');}return true;}return false;}
  let up=T.spd*def.spM,vx=0;
  switch(b.type){
   case 'mosq':vx=Math.sin(b.t*3.2+b.ph)*65;up*=.9+.25*Math.sin(b.t*5+b.ph);break;
   case 'ant':vx=Math.sin(b.t*2.4+b.ph)*14;break;
   case 'baby':vx=Math.sin(b.t*3+b.ph)*36;break;
   case 'fly':case 'roach':b.mvT-=dt;if(b.mvT<=0){b.mv=b.mv?0:1;b.mvT=b.mv?rand(.5,.9):rand(.3,b.type==='fly'?.7:.35);b.dir=rand(-1,1);}if(b.mv){up*=b.type==='fly'?1.75:1.3;vx=b.dir*(b.type==='fly'?70:55);}else up=0;break;
   case 'snail':case 'bsnail':if(b.hide>0){b.hide-=dt;up=0;}if(b.type==='bsnail'){vx=Math.sin(b.t*.6)*30;b.cd-=dt;if(b.cd<=0){b.cd=4.2;for(const s of[-1,1])spawn({type:'ant',x:clamp(b.x+s*50*L.K,wallL(b.y+10)+14,wallR(b.y+10)-14),y:b.y+10}).spawnT=0;}}break;
   case 'gecko':if(b.noTail)up*=1.35;b.mvT-=dt;if(b.mvT<=0){b.dir=-b.dir;b.mvT=rand(.4,.75);}vx=b.dir*up*1.1;up*=.8;break;
   case 'bfly':vx=Math.sin(b.t*(b.phase>1?1.3:.8))*(b.phase>1?80:50);b.cd-=dt;if(b.cd<=0){b.cd=(b.phase>2?2.6:3.4)/D.atk;for(const s of[-1,1])spawn({type:b.phase>1&&rnd()<.4?'gnat':rnd()<.5?'fly':'mosq',x:clamp(b.x+s*50*L.K,wallL(b.y+10)+14,wallR(b.y+10)-14),y:b.y+10}).spawnT=0;}
     bossAtk(b,dt,b.phase>1?'lunge':null,b.phase>2?'spit':null);break;
   case 'bspider':vx=Math.sin(b.t*(b.phase>1?1.1:.7))*(b.phase>1?60:40);b.cd-=dt;if(b.cd<=0){b.cd=(b.phase>2?2.4:3.3)/D.atk;for(const s of[-1,0,1])spawn({type:b.phase>2&&s===0?'climber':'baby',x:clamp(b.x+s*55*L.K,wallL(b.y+16)+14,wallR(b.y+16)-14),y:b.y+16}).spawnT=0;}
     bossAtk(b,dt,b.phase>1?'spit':null,b.phase>2?'lunge':null);break;
   case 'gnat':vx=Math.sin(b.t*6+b.ph)*55+Math.sin(b.t*13+b.ph*3)*25;break;
   case 'mini':vx=Math.sin(b.t*5+b.ph)*30;break;
   case 'blob':vx=Math.sin(b.t*1.6+b.ph)*12;break;
   case 'dodger':b.dcd-=dt;if(b.dash>0){b.dash-=dt;vx=b.dir*290;up*=.3;}else{b.mvT-=dt;if(b.mvT<=0){b.mv=b.mv?0:1;b.mvT=b.mv?rand(.5,.9):rand(.2,.4);b.dir=rand(-1,1);}if(b.mv){up*=1.25;vx=b.dir*50;}else up=0;}break;
   case 'armor':vx=Math.sin(b.t*1.1+b.ph)*18;break;
   case 'climber':b.mvT-=dt;if(b.mvT<=0){b.mv=b.mv?0:1;b.mvT=b.mv?rand(.9,1.6):rand(.15,.35);}if(!b.mv)up*=.15;if(b.y<L.rimY+L.wallH*.4)up*=1.35;vx=Math.sin(b.t*2+b.ph)*10;break;
   case 'spitter':if(b.wind>0){b.wind-=dt;up=0;if(b.wind<=0)spitAt(b);}else{b.acd-=dt;if(b.acd<=0&&b.y<L.spawnY-40*L.K){b.acd=rand(3.5,5.5)/D.atk;b.wind=.6;}b.mvT-=dt;if(b.mvT<=0){b.mv=b.mv?0:1;b.mvT=b.mv?rand(.6,1):rand(.3,.6);b.dir=rand(-1,1);}if(b.mv){up*=1.4;vx=b.dir*55;}else up=0;}break;
   case 'healer':vx=Math.sin(b.t*.7+b.ph)*14;if(b.heal>0)b.heal-=dt*1.5;b.acd-=dt;if(b.acd<=0){b.acd=2.4/D.atk;let n=0;for(const o of G.bugs){if(o===b||o.dead||o.esc!=null||BT[o.type].boss||o.hp>=o.maxHp)continue;if(Math.hypot(o.x-b.x,o.y-b.y)<120*L.K){o.hp=Math.min(o.maxHp,o.hp+o.maxHp*.3);n++;if(!SIMMODE)pop(o.x,o.y-24,'+HP','#7dff8a',13,.6);}}if(n||b.hp<b.maxHp){b.hp=Math.min(b.maxHp,b.hp+b.maxHp*.1);b.heal=1;}}break;
  }
  if(b.type==='bsnail')bossAtk(b,dt,b.phase>1?'heal':null,b.phase>2?'spit':null);
  if(T.boss){const f=b.hp/b.maxHp,ph=f>.6?1:f>.3?2:3;if(ph>b.phase){b.phase=ph;G.shake=1.1;b.acd=1.2;if(!SIMMODE){banner('PHASE '+ph+'!',['','',T.name+' is ANGRY!',T.name+' has lost it!'][ph],'boss');vib([40,30,80]);SFX.hurt();}}
    if(b.wind>0){b.wind-=dt;up=0;vx*=.2;if(b.wind<=0)b.lunge=.75;}if(b.lunge>0){b.lunge-=dt;up=T.spd*def.spM*11;}}
  if(b.butt>0){up*=.7;vx*=.7;}
  if(G.mods.includes('slip')&&!T.boss){b.sl+=rand(-1,1)*420*dt;b.sl*=Math.exp(-dt*.8);b.sl=clamp(b.sl,-110,110);vx+=b.sl;}
  {const k=L.K*(b.ash&&!T.boss&&G.ashT>0?.68:1);up*=k;vx*=k;}
  if(b.spawnT<.35){up*=.2;vx*=.2;}if(G.flushFx&&!T.boss&&G.flushFx.t<1.8)up=0;
  const vy=-up+b.kbV;b.kbV*=Math.exp(-dt*5);b.x+=vx*dt;b.y+=vy*dt;
  const lw=wallL(b.y)+T.r*.8,rw=wallR(b.y)-T.r*.8;if(b.x<lw){b.x=lw;b.dir=1;b.sl=Math.abs(b.sl);}if(b.x>rw){b.x=rw;b.dir=-1;b.sl=-Math.abs(b.sl);}if(b.y>L.spawnY+6)b.y=L.spawnY+6;
  const ta=clamp(Math.atan2(vx,Math.max(30,-vy+40))*.9,-.7,.7);b.rot+=(ta-b.rot)*Math.min(1,dt*6);
  b.look=[clamp((G.aim.x-b.x)/120,-1,1),clamp((G.aim.y-b.y)/120,-1,1)];
  if(b.y<L.rimY+(T.boss?30:4))b.esc=0;return false;}
/* ---------------- render ---------------- */
function render(){let c=cx;SCN.phFront=!!FX;c.setTransform(DPR*SC,0,0,DPR*SC,0,0);
  if(G.state==='title'||!def){c.fillStyle='#1d1530';c.fillRect(0,0,W,H);return;}
  c.save();if(G.shake>0&&!FX){const s=G.shake*G.shake*9;c.translate(rand(-s,s),rand(-s,s));}
  c.drawImage(bgC,0,0,W,H);
  // floor -> sneakers/jeans -> urinal lip (with contact shadow) -> bugs/effects -> HUD
  SCN.drawFeet(c);{const lc=lipC();if(lc)c.drawImage(lc,px(0),py(880),720*PL.s,410*PL.s);}
  // tinted water as you pee
  c.save();c.globalAlpha=clamp(G.t/90,0,.35);ell(c,L.drainX,L.waterY,L.drainR*2.2,L.drainR*1.1);c.fillStyle='#ffe14d';c.fill();c.restore();
  {const sc=stainC();for(const s of G.stains){c.globalAlpha=s.a*.8;c.drawImage(sc,s.x-s.r,s.y-s.r*.6,s.r*2,s.r*1.2);}}c.globalAlpha=1;
  if(G.danger){c.save();c.globalAlpha=.25+.15*Math.sin(G.t*12);c.fillStyle='#ff3b5c';c.fillRect(wallL(L.rimY+12),L.rimY-6,wallR(L.rimY+12)-wallL(L.rimY+12),20);c.restore();}
  if(G.ashT>0)drawAsh(c);
  if(!FX){drawFans(c,1);drawStream(c,'top');}SCN.drawBack(c);
  // power (urinal cake)
  if(G.power&&SPR.ok('cake')){const p=G.power;c.save();c.translate(p.x,p.y);const s=p.got?1+p.t*2:1;c.scale(s,s);c.globalAlpha=p.got?1-p.t/.8:1;c.rotate(Math.sin(p.t*3)*.2);const g=c.createRadialGradient(0,0,2,0,0,36);g.addColorStop(0,'rgba(255,120,220,.7)');g.addColorStop(1,'rgba(255,120,220,0)');c.fillStyle=g;circ(c,0,0,36);c.fill();SPR.img(c,'cake',0,0,30);c.restore();}
  else if(G.power){const p=G.power;c.save();c.translate(p.x,p.y);const s=p.got?1+p.t*2:1;c.scale(s,s);c.globalAlpha=p.got?1-p.t/.8:1;c.rotate(Math.sin(p.t*3)*.25);
    const g=c.createRadialGradient(0,0,2,0,0,34);g.addColorStop(0,'rgba(160,255,200,.7)');g.addColorStop(1,'rgba(160,255,200,0)');c.fillStyle=g;circ(c,0,0,34);c.fill();
    rr(c,-11,-18,22,36,6);fillS(c,lin(c,-11,0,11,0,[[0,'#2fd6a0'],[.5,'#b8ffe0'],[1,'#139b74']]),3);c.fillStyle=OL;c.font='11px '+FONT;c.textAlign='center';c.fillText('ZAP',0,4);rr(c,-9,-21,18,5,2);fillS(c,'#ccd',2);c.restore();}
  if(G.mods.includes('slip')){c.save();bowlPath(c);c.clip();c.globalAlpha=.5;for(let i=0;i<14;i++){const y=L.rimY+L.wallH*((i*.137+G.t*.01)%1),x=wallL(y)+(wallR(y)-wallL(y))*((i*.618)%1);circ(c,x,y,3+i%4*2);c.fillStyle='rgba(225,248,255,.8)';c.fill();c.strokeStyle='rgba(90,160,220,.7)';c.lineWidth=1;c.stroke();}
    c.globalAlpha=.16;c.fillStyle='#9fe4ff';c.fillRect(0,L.rimY,W,L.wallH);c.restore();}
  drawPicks(c);
  // bugs
  const list=G.bugs.slice().sort((a,b)=>a.y-b.y);
  for(const b of list){const T=BT[b.type];c.save();c.globalAlpha=.18;ell(c,b.x+4,b.y+T.r*.7,T.r*.9,T.r*.35);c.fillStyle='#24304a';c.fill();c.restore();}
  for(const b of list){const T=BT[b.type];c.save();c.translate(b.x,b.y);
    if(b.dead)c.rotate(b.spin);else c.rotate(b.rot);
    const sq=b.sqT<.25?Math.sin(b.sqT/.25*Math.PI)*.22:0;const sp=b.spawnT<.35?b.spawnT/.35:1;c.scale((1+sq)*sp,(1-sq)*sp);
    if(b.esc!=null)c.globalAlpha=1-b.esc*1.6;if(b.dead&&b.gulp!=null)c.scale(1-b.gulp*3,1-b.gulp*3);
    if(b.hitT>0)c.translate(rand(-1.5,1.5),0);
    if(!SPR.bug(c,b,G.t+b.ph)){const bs=BT[b.type].r/BT[BASEART[b.type]||b.type].r;if(bs!==1)c.scale(bs,bs);(BUGART[b.type]||BUGART[BASEART[b.type]])(c,b,G.t+b.ph);if(bs!==1)c.scale(1/bs,1/bs);drawAcc(c,b,G.t+b.ph,T.r*2.6);}c.restore();
    if(!b.dead&&b.esc==null&&b.hp<b.maxHp&&!T.boss){const w=T.r*2;rr(c,b.x-w/2,b.y-T.r-14,w,6,3);fillS(c,'rgba(0,0,0,.45)');rr(c,b.x-w/2+1,b.y-T.r-13,(w-2)*clamp(b.hp/b.maxHp,0,1),4,2);c.fillStyle='#ffde4a';c.fill();}}
  if(!FX){drawFans(c,.5);drawFlush(c);drawStream(c,'bot');}
  for(const p of G.parts){if(p.k==='butt')continue;const a=1-p.t/p.life;c.globalAlpha=a;if(p.k==='drop'){const r=p.r*1.1;c.globalAlpha=a*.6;circ(c,p.x,p.y,r);c.fillStyle=p.col||'#bff0ff';c.fill();c.globalAlpha=a*.5;c.strokeStyle='rgba(120,80,0,.5)';c.lineWidth=.8;c.stroke();c.globalAlpha=a*.95;c.fillStyle='#fff';circ(c,p.x-r*.35,p.y-r*.35,Math.max(.6,r*.32));c.fill();continue;}circ(c,p.x,p.y,p.r*(p.k==='bub'?1+p.t:1));c.fillStyle=p.col||'#bff0ff';c.fill();}c.globalAlpha=1;
  if(FX){c.restore();c=cvtx;c.setTransform(TDPR*SC,0,0,TDPR*SC,0,0);c.clearRect(0,0,W,H);c.save();}
  // hero
  SCN.drawFront(c);drawOver(c);
  // aim reticle (v6: crosshair at the real, range-clamped aim point; faint while not peeing in Pad mode)
  if(FX||aimMode!=='direct'){const a=(FX&&G.fxAim)||G.aim,on=G.f.down;if(on||(aimMode==='relative'&&G.aimInit)){c.save();c.globalAlpha=on?.95:.45;c.strokeStyle='#fff';c.lineWidth=2;circ(c,a.x,a.y,11);c.stroke();c.beginPath();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){c.moveTo(a.x+dx*6,a.y+dy*6);c.lineTo(a.x+dx*17,a.y+dy*17);}c.stroke();c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=1;circ(c,a.x,a.y,13);c.stroke();c.restore();}}
  else if(G.f.down){c.save();c.globalAlpha=.7;c.strokeStyle='#fff';c.lineWidth=2.5;c.setLineDash([5,5]);circ(c,G.aim.x,G.aim.y,14+Math.sin(G.t*10)*2);c.stroke();c.restore();}
  for(const p of G.pops){const k=p.t/p.dur,s=k<.15?k/.15*1.2:k<.25?1.2-(k-.15)*2:1;c.save();c.globalAlpha=k>.7?1-(k-.7)/.3:1;c.translate(p.x,p.y-k*30);c.scale(s,s);c.font=p.size+'px '+FONT;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=5;c.strokeStyle=OL;c.strokeText(p.s,0,0);c.fillStyle=p.col;c.fillText(p.s,0,0);c.restore();}
  c.restore();
  if(G.super>0){c.save();c.globalAlpha=.25+.1*Math.sin(G.t*10);c.strokeStyle='#9fffd0';c.lineWidth=10;c.strokeRect(0,0,W,H);c.restore();}
  hudTick();
}
/* v5 stream: flat, constant-width golden line from the top of the screen (no taper, no blur) */
/* v5d stream: translucent liquid, flat (no taper): dark refractive edges, pale body, travelling necking ripples, specular core; breaks into beads low down when long */
/* v5e stream: painted liquid texture (art/stream5) scrolled down a near-vertical ribbon from the top edge to the impact point; additive glints; textured droplets at breakup */
let _sBufs={},_frameNo=0,_wPat=null,_sPat=null,_sTx=null,_sBuf=null;
function wPat(c){if(_wPat)return _wPat;if(!SPR.ok('stream5'))return null;const im=SPR.I.stream5,cv=document.createElement('canvas');cv.width=96;cv.height=410;const x=cv.getContext('2d');x.drawImage(im,0,0);
  try{const d=x.getImageData(0,0,96,410),a=d.data;for(let i=0;i<a.length;i+=4){const l=(a[i]+a[i+1]+a[i+2])/3;a[i]=l*.85;a[i+1]=l*.95;a[i+2]=Math.min(255,l*1.08+20);}x.putImageData(d,0,0);}catch(e){}
  return _wPat=c.createPattern(cv,'repeat');}
function sTex(){if(_sTx)return _sTx;if(!SPR.ok('stream5'))return null;const im=SPR.I.stream5,cv=document.createElement('canvas');cv.width=96;cv.height=820;const x=cv.getContext('2d');x.drawImage(im,0,0,96,410);x.drawImage(im,0,410,96,410);return _sTx=cv;}
function sPat(c){if(_sPat)return _sPat;if(!SPR.ok('stream5'))return null;return _sPat=c.createPattern(SPR.I.stream5,'repeat');}
function drawStream(c,part){if(!G.drops.length)return;if(part){c.save();c.beginPath();if(part==='top')c.rect(-50,-50,W+100,L.rimY+50);else c.rect(-50,L.rimY,W+100,H*2);c.clip();drawStream(c);c.restore();return;}const by={};for(const d of G.drops){if(d.dribble){circ(c,d.x,d.y,2.4);c.fillStyle='rgba(255,226,110,.7)';c.fill();continue;}(by[d.sid]=by[d.sid]||[]).push(d);}
  const st=stats(),sup=G.super>0,T=G.t,pat=sPat(c);
  for(const k in by){const a=by[k].sort((p,q)=>q.seq-p.seq);let n=1;while(n<a.length&&a[n-1].seq-a[n].seq<=2)n++;const s=a.slice(0,n);
    const z=s[s.length-1],ex=z.u>.5?z.tx:z.x,ey=z.u>.5?z.ty:z.y;if(ey<4)continue;
    const w=st.w*(k>0?.8:1)*3.2,sx=ex+(G.ox+(k-(st.streams-1)/2)*8-ex)*.1,sy=-12,mx=(sx+ex)/2+(sx-ex)*.25,my=(sy+ey)/2;
    const N=28,len=ey-sy,brk=1.01,L_=[],R_=[];
    const tx=sTex(),Lh=Math.ceil(Math.max(4,ey-sy)),sw=Math.ceil(w*1.9);
    /* v5g perf: build each stream's buffer once per frame (it is drawn twice: behind props, then in front) */
    _sBufs[k]=_sBufs[k]||{c:document.createElement('canvas'),f:-1};const SB=_sBufs[k],B=SB.c;
    if(SB.f!==_frameNo){SB.f=_frameNo;if(B.width<sw)B.width=sw;if(B.height<Lh)B.height=Lh;const bx=B.getContext('2d');bx.setTransform(1,0,0,1,0,0);bx.clearRect(0,0,B.width,B.height);

    const cx0=sw/2,hwf=y=>{const u=y/Lh;return w*.5*(1+.09*Math.sin(T*19-y*.045)+.045*Math.sin(T*43-y*.12))*(1-.14*u)*(u>.96?1-(u-.96)*7:1);};
    const tw=y=>.12*Math.sin(T*14-y*.035);
    bx.beginPath();for(let y=0;y<=Lh;y+=5)bx.lineTo(cx0-hwf(y),y);for(let y=Lh;y>=0;y-=5)bx.lineTo(cx0+hwf(y),y);bx.closePath();
    const g=bx.createLinearGradient(cx0-w*.55,0,cx0+w*.55,0);
    if(sup){g.addColorStop(0,'rgba(30,140,100,.55)');g.addColorStop(.14,'rgba(230,255,245,.8)');g.addColorStop(.3,'rgba(150,255,210,.3)');g.addColorStop(.5,'rgba(210,255,235,.5)');g.addColorStop(.72,'rgba(150,255,210,.28)');g.addColorStop(.88,'rgba(230,255,245,.6)');g.addColorStop(1,'rgba(30,140,100,.5)');}
    else{g.addColorStop(0,'rgba(140,92,8,.6)');g.addColorStop(.13,'rgba(255,250,228,.82)');g.addColorStop(.28,'rgba(255,222,112,.30)');g.addColorStop(.5,'rgba(255,242,178,.52)');g.addColorStop(.72,'rgba(255,220,105,.28)');g.addColorStop(.88,'rgba(255,252,236,.62)');g.addColorStop(1,'rgba(140,92,8,.55)');}
    bx.fillStyle=g;bx.fill();
    if(tx){bx.save();bx.clip();bx.globalCompositeOperation='source-atop';bx.globalAlpha=.32;const scl=sw/96,tH=410*scl;const o=(T*1300)%tH;for(let y=o-tH;y<Lh;y+=tH)bx.drawImage(tx,0,0,96,410,0,y,sw,tH);bx.restore();}
    // twisting refraction highlights hugging both edges + soft brighter core
    bx.lineCap='round';for(const [sd,al,lw] of [[-1,.75,1.5],[1,.45,1.1]]){bx.strokeStyle='rgba(255,255,255,'+al+')';bx.lineWidth=Math.max(.8,w*.09*lw);bx.beginPath();
      for(let y=0;y<=Lh;y+=4){const h=hwf(y),x=cx0+sd*h*(.66+tw(y)*sd)+(sd<0?0:0);y?bx.lineTo(x,y):bx.moveTo(x,y);}bx.stroke();}
    bx.strokeStyle='rgba(255,255,240,.22)';bx.lineWidth=w*.22;bx.beginPath();for(let y=0;y<=Lh;y+=4){const x=cx0+hwf(y)*tw(y)*1.6;y?bx.lineTo(x,y):bx.moveTo(x,y);}bx.stroke();
    }
    c.save();c.transform(1,0,(ex-sx)/(ey-sy),1,sx,sy);c.globalAlpha=1;c.drawImage(B,0,0,sw,Lh,-sw/2,0,sw,Lh);c.restore();
    const pt=u=>[sx+(ex-sx)*u,sy+(ey-sy)*u];
    // droplets at breakup, textured with the same liquid
    if(brk<1){for(let j=0;j<9;j++){const u=brk+(1-brk)*((j+((T*9)%1))/9);if(u>1)continue;const [x,y]=pt(u),r=w*(.32+.12*Math.sin(j*2.3+T*17));
      c.beginPath();c.ellipse(x+Math.sin(j*3.1)*w*.15,y,r*.8,r*1.15,0,0,TAU);c.globalAlpha=.85;c.fillStyle=pat||'rgba(255,226,120,.8)';c.fill();c.globalCompositeOperation='lighter';c.globalAlpha=.3;c.fill();c.globalCompositeOperation='source-over';
      c.globalAlpha=.9;c.fillStyle='rgba(255,255,255,.85)';circ(c,x-r*.3,y-r*.4,Math.max(.8,r*.25));c.fill();}}
    c.restore();}c.globalAlpha=1;}
function fanPts(f){const n=40,P=[[f.x,f.y]],sd=f.seed,t=f.ph||0,L0=f.len;
  for(let i=0;i<=n;i++){const u=i/n,th=f.dir-f.hw+2*f.hw*u;const r=L0*(.62+.38*Math.pow(Math.sin(Math.PI*u),.45));P.push([f.x+Math.cos(th)*r,f.y+Math.sin(th)*r]);}return P;}
/* v5e impact: painted fan sprite sheet (art/fan5, 4 variants, apex at bottom-centre), rotated to the wash direction, flickering variants + scale pulse; wet-sheen decal afterwards */
function fanSpr(c,x,y,dir,len,hw,v,A,add){if(!SPR.ok('fan5'))return false;const im=SPR.I.fan5,sy=len*.72/290,sx=sy*Math.max(.55,hw/.5);
  c.save();c.translate(x,y);c.rotate(dir+Math.PI/2);c.scale(sx,sy);c.globalAlpha=A;c.drawImage(im,(v%4)*320,0,320,320,-160,-316,320,320);
  if(add){c.globalCompositeOperation='lighter';c.globalAlpha=A*add;c.drawImage(im,(v%4)*320,0,320,320,-160,-316,320,320);}c.restore();return true;}
/* v5f impact: layered wash. Crown at the apex (painted fan5 sprite), a translucent sheet hugging the porcelain that runs down the slope (scrolling liquid texture), rivulets trickling toward the drain, wet-darkening decal afterwards */
function sheetPath(c,f,ph,L0){const d=f.dir,cs=Math.cos(d),sn=Math.sin(d),px_=-sn,py_=cs,n=14,Lf=[],Rt=[];
  for(let i=0;i<=n;i++){const t=i/n,dd=t*L0*1.15,hw=L0*(.05+.3*Math.sqrt(t))*(1+.13*Math.sin(t*9+ph*6+f.seed)+.07*Math.sin(t*23-ph*9))*(1-.25*t*t),bx=f.x+cs*dd,by=f.y+sn*dd;Lf.push([bx+px_*hw,by+py_*hw]);Rt.push([bx-px_*hw*(1+.08*Math.sin(t*7-ph*5)),by-py_*hw]);}
  c.beginPath();c.moveTo(f.x,f.y);Lf.forEach(q=>c.lineTo(q[0],q[1]));const e=f.x+cs*L0*1.3,ey=f.y+sn*L0*1.3;c.quadraticCurveTo(e,ey,Rt[n][0],Rt[n][1]);for(let i=n;i>=0;i--)c.lineTo(Rt[i][0],Rt[i][1]);c.closePath();return [Lf,Rt];}
function drawFans(c,al){let any=!!(G.wet&&G.wet.length&&al>.9);for(const f of G.fans)if(f&&f.a>0)any=true;if(!any)return;c.save();bowlPath(c,2);c.clip();const pat=sPat(c),sup=G.super>0;
  if(al>.9&&G.wet)for(const w of G.wet){sheetPath(c,w,0,w.len);c.globalCompositeOperation='multiply';c.globalAlpha=w.a*.5;c.fillStyle='rgba(150,128,90,.55)';c.fill();c.globalCompositeOperation='source-over';c.globalAlpha=w.a*.25;c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=1;c.stroke();}
  for(const f of G.fans){if(!f||f.a<=0||f.len<3)continue;const A=f.a*al,ph=f.ph||0,L0=f.len*.85,cs=Math.cos(f.dir),sn=Math.sin(f.dir);
    // rivulets trickling on toward the drain
    const rl=Math.min(1,ph*.7);c.lineCap='round';for(let j=0;j<3;j++){const off=(j-1)*L0*.35,sx=f.x+cs*L0*1.2-sn*off,sy=f.y+sn*L0*1.2+cs*off,tx=sx+(L.drainX-sx)*.7*rl,ty=sy+(L.waterY-sy)*.7*rl;
      c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo((sx+tx)/2+Math.sin(j*2+f.seed)*12,(sy+ty)/2,tx,ty);c.globalAlpha=A*.45;c.strokeStyle=sup?'rgba(150,255,210,.6)':'rgba(240,205,90,.55)';c.lineWidth=2.6*L.K;c.stroke();c.globalAlpha=A*.6;c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=.8*L.K;c.stroke();}
    // the sheet
    const [Lf,Rt]=sheetPath(c,f,ph,L0);const g=c.createLinearGradient(f.x,f.y,f.x+cs*L0*1.6,f.y+sn*L0*1.6);
    if(sup){g.addColorStop(0,'rgba(230,255,245,.7)');g.addColorStop(.45,'rgba(150,255,210,.3)');g.addColorStop(1,'rgba(120,230,190,.05)');}else{g.addColorStop(0,'rgba(255,250,220,.5)');g.addColorStop(.3,'rgba(255,228,130,.2)');g.addColorStop(.75,'rgba(240,200,80,.1)');g.addColorStop(1,'rgba(230,190,70,0)');}
    c.globalAlpha=A;c.fillStyle=g;c.fill();
    if(pat&&pat.setTransform){c.save();c.clip();const sc=L0/160;pat.setTransform(new DOMMatrix().translateSelf(f.x,f.y).rotateSelf((f.dir-Math.PI/2)*180/Math.PI).translateSelf(-48*sc,(ph*260)%(410*sc)).scaleSelf(sc,sc));c.globalAlpha=A*.2;c.fillStyle=pat;c.fillRect(f.x-L0*2,f.y-L0*2,L0*4,L0*4);c.restore();}
    // bright edges where the sheet thins
    c.globalAlpha=A*.7;c.strokeStyle='rgba(255,255,245,.75)';c.lineWidth=1.1;for(const E of [Lf,Rt]){c.beginPath();c.moveTo(f.x,f.y);E.forEach(q=>c.lineTo(q[0],q[1]));c.stroke();}
    // crown splash at the apex, kicking up off the wall
    fanSpr(c,f.x,f.y,f.dir+Math.PI,f.len*.5*(1+.08*Math.sin(ph*31)),.7,Math.floor(ph*13+f.seed)%4,A*.75,.2);}
  c.restore();c.globalAlpha=1;}
function drawAsh(c){const a=Math.min(1,G.ashT/1.5)*Math.min(1,(7-G.ashT)*3);c.save();bowlPath(c);c.clip();c.globalAlpha=.3*a;c.fillStyle='#6f6a66';let s=11;const r=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let i=0;i<70;i++){const y=L.rimY+L.wallH*(.35+.6*r());const x=wallL(y)+(wallR(y)-wallL(y))*r();c.beginPath();c.ellipse(x,y,1.5+r()*4,1+r()*2.5,r()*3,0,TAU);c.fill();}c.restore();c.globalAlpha=1;}
/* v5b flush sheets: thin clear water from the inlet, running both ways round the inner rim contour and down each wall, converging on the drain */
function flHead(t){return t<FL.w0?0:Math.min(1,Math.pow((t-FL.w0)/1.05,.8));}
function flTail(t){return t<1.55?0:Math.min(1.01,(t-1.55)/.9);}
function flW(s){return PL.s*(s<L.rimTop?9+6*s/L.rimTop:15+30*Math.min(1,(s-L.rimTop)/(.7-L.rimTop)));}
function flNear(x,y){const xm=x>L.cx?2*L.cx-x:x;let best=null,bd=1e9;for(const q of L.rim){const d=Math.hypot(q.x-xm,q.y-y);if(d<bd){bd=d;best=q;}}if(!best||y<L.rimY-6)return null;return {s:best.s,d:bd};}
function flPts(sd,s0,s1,t){const R=L.rim,o=[],n=[];for(let i=1;i<R.length;i++){const q=R[i];if(q.s<s0||q.s>s1)continue;const p=R[i-1],tx=q.x-p.x,ty=q.y-p.y,l=Math.hypot(tx,ty)||1;
    let nx=ty/l,ny=-tx/l,w=flW(q.s)*(1+.16*Math.sin(q.s*46-t*13+sd)+.08*Math.sin(q.s*97+t*7));let ix=q.x+nx*w,iy=q.y+ny*w;
    const cv=clamp((q.s-.78)/.22,0,1);if(cv>0){const dx=(sd<0?L.drainX:2*L.cx-L.drainX)-ix,dy=L.waterY-iy;ix+=dx*cv*.55;iy+=dy*cv*.35;}
    const X=x=>sd<0?x:2*L.cx-x;o.push([X(q.x+nx*1.5),q.y+ny*1.5]);n.push([X(ix),iy]);}return {o,n};}
/* v5g flush: a thick sheet of water bursts from the rim and sweeps the WHOLE inner bowl, foam front, then drains with a swirl and leaves the porcelain wet */
const FW={t1:1.25,tt0:1.3,tt1:2.05,end:3.2};
function flFront(t){const k=clamp((t-FL.w0)/(FW.t1-FL.w0),0,1);return L.rimY-8+(L.wallH+16)*(1-Math.pow(1-k,1.6));}
function flTop(t){const k=clamp((t-FW.tt0)/(FW.tt1-FW.tt0),0,1);return L.rimY-8+(L.waterY-L.rimY+8)*k*k;}
function flWave(x,t,a){return a*(Math.sin(x*.045+t*11)*.6+Math.sin(x*.11-t*17)*.3+Math.sin(x*.023+t*5)*.5);}
let _fwP=null,_fwC=null;
function flWarm(c){for(const n of['flushW5','flushF5','flushS5'])if(SPR.ok(n)){c.save();c.globalAlpha=.001;c.drawImage(SPR.I[n],0,0,2,2);c.restore();}}
function drawFlush(c){const f=G.flushFx;if(!f||f.t<FL.w0-.12)return;const t=f.t,K=PL.s/.66;
  if(t<1.5){const ix=px(355),iy=py(414),a=Math.min(1,(t-FL.w0+.12)*6)*Math.min(1,(1.5-t)*3);c.save();c.globalAlpha=.7*a;c.lineCap='round';
    c.strokeStyle='rgba(205,238,255,.85)';c.lineWidth=9*K;c.beginPath();c.moveTo(ix,iy);c.quadraticCurveTo(ix+2,(iy+L.rimY)/2,L.cx,L.rimY+2);c.stroke();
    c.strokeStyle='#fff';c.lineWidth=2*K;c.beginPath();c.moveTo(ix-2*K,iy);c.quadraticCurveTo(ix,(iy+L.rimY)/2,L.cx-2*K,L.rimY+2);c.stroke();c.restore();}
  const WI=SPR.ok('flushW5')&&SPR.I.flushW5,F=SPR.ok('flushF5')&&SPR.I.flushF5,S=SPR.ok('flushS5')&&SPR.I.flushS5;
  if(WI&&_fwC!==c){_fwP=c.createPattern(WI,'repeat');_fwC=c;}
  const fy=flFront(t),ty=flTop(t),x0=L.cx-(L.wallH*1.2)*.62,x1=L.cx+(L.wallH*1.2)*.62,n=22,dx=(x1-x0)/n;
  c.save();bowlPath(c,1);c.clip();
  // wet shiny porcelain left behind
  if(t>FW.tt0&&ty>L.rimY){const a=clamp((t-FW.tt0)*3,0,1)*clamp((FW.end-t)/1.2,0,1);c.globalAlpha=.32*a;c.fillStyle='rgba(225,240,250,.5)';c.fillRect(x0,L.rimY,x1-x0,ty-L.rimY);
    c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=1.4*K;c.globalAlpha=.5*a;c.beginPath();for(const fr of[.18,.5,.82]){const y0=L.rimY+(ty-L.rimY)*.05;c.moveTo(wallL(y0)+(wallR(y0)-wallL(y0))*fr,y0);c.lineTo(wallL(ty)+(wallR(ty)-wallL(ty))*(.5+(fr-.5)*.8),ty);}c.stroke();c.globalAlpha=1;}
  if(fy>ty+2&&t<FW.tt1+.1){
    c.beginPath();for(let i=0;i<=n;i++){const x=x0+i*dx;c.lineTo(x,ty+(ty>L.rimY?flWave(x,t,3*K):0));}for(let i=n;i>=0;i--){const x=x0+i*dx;c.lineTo(x,fy+flWave(x,t,5*K)-Math.pow((x-L.cx)/(x1-L.cx),2)*14*K);}c.closePath();
    c.fillStyle='rgba(140,195,225,.16)';c.fill();
    if(_fwP){const sc=.62*K;if(_fwP.setTransform)_fwP.setTransform(new DOMMatrix([sc,0,0,sc*1.15,Math.sin(t*3)*6,(t*620*K)%(298*sc*1.15)]));c.globalAlpha=.3;c.fillStyle=_fwP;c.fill();if(_fwP.setTransform)_fwP.setTransform(new DOMMatrix([-sc*1.37,0,0,sc*1.6,97-Math.sin(t*2)*9,(t*820*K)%(298*sc*1.6)]));c.globalAlpha=.24;c.fill();c.globalAlpha=1;}
    // thick foam front, two overlapping layers of the painted foam band
    if(F&&fy<L.waterY+20){const fh=46*K,fw=fh*512/190;for(let L2=0;L2<2;L2++){c.globalAlpha=L2?.65:.95;const off=((t*(L2?-90:140)*K)%fw+fw)%fw;
      for(let x=x0-off;x<x1;x+=fw*.92){const y=fy+flWave(x+fw/2,t,5*K)-Math.pow((x+fw/2-L.cx)/(x1-L.cx),2)*14*K-fh*.55+L2*fh*.12;c.drawImage(F,x,y,fw,fh*(L2?.8:1));}}c.globalAlpha=1;}
    if(ty>L.rimY+4&&F){const fh=20*K,fw=fh*512/190;c.globalAlpha=.6;for(let x=x0;x<x1;x+=fw*.9)c.drawImage(F,x,ty-fh*.5,fw,fh);c.globalAlpha=1;}
    if(rnd()<.6&&fy<L.waterY){const x=rand(wallL(fy),wallR(fy));G.parts.push({k:'drop',x,y:fy-4,vx:rand(-60,60),vy:rand(-120,-30),t:0,life:.4,r:rand(1.2,2.6),col:'#eef9ff'});}}
  c.restore();
  // converging swirl into the drain
  if(S&&t>.95&&t<2.6){const a=clamp((t-.95)*3,0,1)*clamp((2.6-t)*2.2,0,1),r=(L.wallH*.22+20*K)*(1.1-.35*clamp((t-1.3)/1.2,0,1));
    c.save();c.translate(L.drainX,L.waterY);c.scale(1,.42);c.rotate(t*7);c.globalAlpha=.7*a;c.drawImage(S,-r,-r,2*r,2*r);c.rotate(-t*3);c.globalAlpha=.18*a;c.globalCompositeOperation='lighter';c.drawImage(S,-r*.7,-r*.7,1.4*r,1.4*r);c.restore();}
}

/* ---------------- HUD / UI ---------------- */
let hudLast={};
function hudInit(){$('hud').classList.add('on');$('bossbar').classList.remove('on');$('hLvl').textContent='Level '+curL+' \u00B7 '+DIFFL[DIFF][1]+(def.mods.length?' \u00B7 '+def.mods.map(m=>MODL[m]).join(' + '):'');hudLast={};hudHearts();hudFlush();}
function hudHearts(anim){const h=$('hHearts');let s='';for(let i=0;i<(G.maxLives||5);i++)s+=`<i class="${i<G.lives?'':'off'}${anim&&i===G.lives?' pop':''}">\u2665</i>`;h.innerHTML=s;}
function hudFlush(){$('fCnt').textContent=G.flushes;$('bFlush').classList.toggle('off',G.flushes<=0);}
function hudTick(){if(G.state!=='play')return;const st=stats();const tot=def.n,done=tot-G.queue.length-G.bugs.filter(b=>!b.dead).length;const pr=Math.round(clamp(done/tot,0,1)*100);
  if(hudLast.pr!==pr){hudLast.pr=pr;$('hProg').style.width=pr+'%';}
  const bl=Math.round(G.bladder/st.cap*100);if(hudLast.bl!==bl||hudLast.dry!==G.dry){hudLast.bl=bl;hudLast.dry=G.dry;$('tankF').style.height=bl+'%';$('tank').classList.toggle('dry',G.dry);}
  const sk=G.mult>1?'STREAK x'+G.mult:G.streak>0?'streak '+G.streak:'';if(hudLast.sk!==sk){hudLast.sk=sk;const e=$('hStreak');e.textContent=sk;e.className=G.mult>=4?'hot':G.mult>1?'on':'';}
  const pw=(G.pPres>0?'PRESSURE ':'')+(G.pWide>0?'BEER HOSE':'');if(hudLast.pw!==pw){hudLast.pw=pw;$('hPow').textContent=pw;}
  const co=S.coins+G.earned;if(hudLast.co!==co){hudLast.co=co;$('hCoins').textContent=co;}
  if(G.boss){$('bossHp').style.width=clamp(G.boss.hp/G.boss.maxHp*100,0,100)+'%';}}
function banner(a,b,cls){const e=$('banner');$('ban1').textContent=a;$('ban2').textContent=b||'';e.className='';void e.offsetWidth;e.className='on '+(cls||'');}
function showScr(id){if(id==='title')refreshCoins();document.querySelectorAll('.scr').forEach(s=>s.classList.toggle('on',s.id===id));}
function toast(s){const t=$('toast');t.textContent=s;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',1600);}
function refreshCoins(){document.querySelectorAll('.cval').forEach(e=>e.textContent=S.coins);}
const ICON={mus:'<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13" stroke="#fff" stroke-width="2.4" fill="none" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.8" fill="#fff"/><circle cx="17.5" cy="16" r="2.8" fill="#fff"/></svg>',
 sfx:'<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
 vib:'<svg viewBox="0 0 24 24"><rect x="8" y="3" width="8" height="18" rx="2" stroke="#fff" stroke-width="2.2" fill="none"/><path d="M4 8v8M20 8v8M1.5 10v4M22.5 10v4" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>'};
function togs(){for(const k of['mus','sfx','vib'])document.querySelectorAll('.t-'+k).forEach(b=>{b.innerHTML=ICON[k];b.classList.toggle('off',!S[k]);b.setAttribute('aria-label',{mus:'Music',sfx:'Sound effects',vib:'Vibration'}[k]);});}
function tog(k){S[k]=S[k]?0:1;save();applyAudio();togs();if(k==='mus'){if(S.mus&&G.state==='play'&&!G.paused)bgmStart();if(!S.mus)bgmStop();}if(k==='vib'&&S.vib)vib(30);SFX.click();}
let wPage=0;
function renderLevels(){const ch=wPage;$('wName').textContent='Chapter '+(ch+1)+': '+CH[ch].n;$('wSub').textContent=CH[ch].s;const g=$('wGrid');g.innerHTML='';
  if($('runTag'))$('runTag').textContent=S.prog>NL?'Run clear — NEW RUN to go again':'This run · next L'+S.prog;
  for(let i=1;i<=6;i++){const Lv=ch*6+i,st=S.stars[Lv]||0,ahead=Lv>S.prog,behind=Lv<S.prog,lock=ahead;const b=document.createElement('button');b.className='lv'+(lock||behind?' lock':'')+(BOSS[Lv]?' boss':'')+(Lv===S.prog?' cur':'');
    b.innerHTML=ahead?'<span class="lk">\uD83D\uDD12</span>':`${Lv}<span class="st">${'\u2605'.repeat(st)}<i>${'\u2605'.repeat(3-st)}</i></span>`+(BOSS[Lv]?'<span class="bt">BOSS</span>':'');
    b.onclick=()=>{if(ahead){SFX.deny();toast(S.prog>NL?'Run clear — start a NEW RUN!':'Beat level '+S.prog+' first this run!');return;}if(behind){SFX.deny();toast('Mid-run: only level '+S.prog+'. NEW RUN to replay.');return;}SFX.click();enterLevel(Lv);};g.appendChild(b);}
  $('wDots').innerHTML=[0,1,2].map(i=>`<i class="${i===ch?'on':''}"></i>`).join('');$('wPrev').style.visibility=ch>0?'visible':'hidden';$('wNext').style.visibility=ch<2?'visible':'hidden';refreshCoins();}
function renderShop(){const sh=$('shoph');if(sh)sh.innerHTML='Upgrades <small style="opacity:.7;font-size:.55em">· This run</small>';const box=$('ups');box.innerHTML='';for(const u of UPG){const l=S.up[u.k],mx=l>=u.max,c=mx?0:u.c[l];const d=document.createElement('div');d.className='up';
  d.innerHTML=`<div class="ic ic-${u.k}"></div><div class="tx"><div class="nm">${u.name} <small>Lv ${l}/${u.max}</small></div><div class="ds">${u.d}</div><div class="pips">${'<i class="on"></i>'.repeat(l)}${'<i></i>'.repeat(u.max-l)}</div></div>`;
  const b=document.createElement('button');b.className='btn orange buy'+(mx?' max':S.coins>=c?'':' no');b.innerHTML=mx?'MAX':`<span class="coin"></span>${c}`;
  b.onclick=()=>{if(mx)return;if(S.coins<c){SFX.deny();toast('Not enough coins. Go splash more bugs!');return;}S.coins-=c;S.up[u.k]++;save();SFX.coin();vib(20);renderShop();};d.appendChild(b);box.appendChild(d);}refreshCoins();}
let shopNext=0;
function go(Lv){showScr('none');auInit();startLevel(Lv);if(!S.tip&&Lv===1){G.paused=true;showScr('tip');}}
function pauseG(){if(G.state!=='play'||G.paused)return;G.paused=true;G.f.down=false;streamSnd(0);bgmStop();$('pSub').textContent='Level '+curL+' \u00B7 '+CH[def.ch].n+' \u00B7 '+DIFFL[DIFF][1];showScr('pause');}
function resumeG(){G.paused=false;showScr('none');if(S.mus)bgmStart();SFX.click();}
function endLevel(win){G.state='end';G.earned=Math.round(G.earned*D.coin);if(!SIMMODE)SCN.ev(win?'win':'lose');G.f.down=false;if(!SIMMODE){streamSnd(0);bgmStop();$('hud').classList.remove('on');}
  const stars=G.lost===0?3:G.lost<=1?2:1;G.result={win,stars,earned:G.earned,lost:G.lost};if(SIMMODE)return;
  if(win){const bonus=20+curL*8+stars*10;S.coins+=G.earned+bonus;S.stars[curL]=Math.max(S.stars[curL]||0,stars);if(curL>=S.unl&&curL<NL)S.unl=curL+1;if(curL>=(S.prog||1))S.prog=Math.min(NL+1,curL+1);save();SFX.win();vib([30,40,30]);
    if(curL===NL){$('endStars').textContent=S.stars.slice(1).reduce((a,b)=>a+(b||0),0)+' / '+NL*3;showScr('ending');return;}
    $('wSubT').textContent='Level '+curL+' cleared!';$('wEarn').textContent=G.earned+bonus;$('wRib').textContent=['','Messy win','Solid splash','Flawless flow'][stars];$('wSubT').textContent='Level '+curL+' cleared! Best streak: '+G.bestStreak;
    const sw=$('wStars');sw.innerHTML='';for(let i=0;i<3;i++){const s=document.createElement('span');s.className='star'+(i<stars?' got':'')+(i===1?' mid':'');s.textContent='\u2605';sw.appendChild(s);if(i<stars)setTimeout(()=>{s.classList.add('pop');SFX.pop(1+i*.3);},350+i*260);}
    showScr('win');}
  else{S.coins+=Math.floor(G.earned*.6);save();SFX.lose();vib([100,60,100]);$('lSub').textContent=['The bugs escaped the urinal. Gross.','They\u2019re loose in the building now.','You had one job.'][Math.floor(rand(0,3))];$('lEarn').textContent=Math.floor(G.earned*.6);showScr('lose');}}
function goHub(e){if(e)e.stopPropagation();save();SFX.click();location.href='../';}
/* ---------------- input ---------------- */
function toLocal(e){const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
/* v6 aim modes: Pad (relative trackpad, default; finger anywhere, gain 1.3), Offset (aim 90px above the finger), Direct (aim under the finger) */
const GAIN=1.3,OFFY=90;let lastPX=0,lastPY=0;
function aimB(){return [px(150),px(576),py(400),H-20];}
function setAimT(x,y){const b=aimB();G.f.x=clamp(x,b[0],b[1]);G.f.y=clamp(y,b[2],b[3]);}
cv.addEventListener('pointerdown',e=>{e.preventDefault();auInit();if(G.state!=='play'||G.paused||BOT.on)return;if(G.f.id!=null&&G.f.id!==e.pointerId&&!e.isPrimary)return;const p=toLocal(e);if(SCN.onPipe(p.x,p.y)){doFlush();return;}if(SCN.onCan(p.x,p.y)&&callWave())return;
  G.f.id=e.pointerId;G.f.down=true;G.f.touch=e.pointerType!=='mouse';lastPX=p.x;lastPY=p.y;
  if(aimMode==='relative'){if(!G.aimInit){setAimT(L.cx,L.rimY+L.wallH*.55);G.aim.x=G.f.x;G.aim.y=G.f.y;}else setAimT(G.f.x,G.f.y);}
  else if(aimMode==='offset')setAimT(p.x,p.y-OFFY/SC);else setAimT(p.x,p.y);G.aimInit=true;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{if(G.f.id!==e.pointerId)return;const p=toLocal(e);
  if(aimMode==='relative')setAimT(G.f.x+(p.x-lastPX)*GAIN,G.f.y+(p.y-lastPY)*GAIN);else if(aimMode==='offset')setAimT(p.x,p.y-OFFY/SC);else setAimT(p.x,p.y);lastPX=p.x;lastPY=p.y;});
const up=e=>{if(G.f.id!==e.pointerId)return;G.f.down=false;G.f.id=null;};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.addEventListener('lostpointercapture',up);
document.addEventListener('touchend',e=>{if(!e.touches.length&&G.f.id!=null){G.f.down=false;G.f.id=null;}});
function setDiff(k,restart){if(!DIFFS[k])return;applyDiff(k);save();document.querySelectorAll('.dsel button').forEach(b=>b.classList.toggle('on',b.dataset.diff===DIFF));if(restart&&G.state==='play'){enterLevel(Math.min(curL,S.prog||1));}}
function setAimMode(m){if(!AIMM.includes(m))return;aimMode=m;S.aim=m;save();document.querySelectorAll('.aimsel button').forEach(b=>b.classList.toggle('on',b.dataset.aim===m));}
document.addEventListener('touchmove',e=>{if(e.target.closest&&e.target.closest('.scroll'))return;e.preventDefault();},{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault());document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseG();if(AU.ctx)AU.ctx.suspend();}else if(AU.ctx)AU.ctx.resume();});
window.addEventListener('keydown',e=>{if(G.state!=='play')return;if(e.key===' '){e.preventDefault();doFlush();}if(e.key==='c')callWave();if(e.key==='Escape'||e.key==='p')G.paused?resumeG():pauseG();});
['pointerdown','touchend','keydown'].forEach(ev=>document.addEventListener(ev,auInit,true));
/* ---------------- wiring ---------------- */
function wire(){const on=(id,f)=>{const e=$(id);if(e)e.addEventListener('click',f);};
  on('bStart',()=>{SFX.click();auInit();if((S.prog||1)===1&&!runActive()&&!S.stars[1])enterLevel(1);else{wPage=Math.min(2,Math.floor(((S.prog||1)-1)/6));renderLevels();showScr('levels');}});
  on('bShop1',()=>{SFX.click();shopNext=0;shopFrom='title';renderShop();showScr('shop');});on('bShop2',()=>{SFX.click();shopNext=0;shopFrom='levels';renderShop();showScr('shop');});
  on('bBack1',()=>{SFX.click();showScr('title');});on('bBack2',()=>{SFX.click();if(shopNext){renderLevels();showScr('levels');}else{if(shopFrom==='levels')renderLevels();showScr(shopFrom);}});
  on('bShopGo',()=>{SFX.click();enterLevel(shopNext||S.prog||1);});
  on('bNewRun1',()=>{SFX.click();askNewRun('title');});on('bNewRun2',()=>{SFX.click();askNewRun('levels');});on('bNewRunE',()=>{SFX.click();askNewRun('ending');});
  on('bNrunYes',()=>{SFX.click();doNewRun();if(nrunFrom==='ending')showScr('title');else{renderLevels();showScr(nrunFrom==='title'?'levels':'levels');}});on('bNrunNo',()=>{SFX.click();showScr(nrunFrom==='ending'?'ending':nrunFrom);});
  on('wPrev',()=>{wPage=Math.max(0,wPage-1);SFX.click();renderLevels();});on('wNext',()=>{wPage=Math.min(2,wPage+1);SFX.click();renderLevels();});
  on('bTipOk',()=>{S.tip=1;save();SFX.click();showScr('none');G.paused=false;});
  on('bPause',e=>{e.stopPropagation();SFX.click();pauseG();});on('bFlush',e=>{e.stopPropagation();doFlush();});
  on('bResume',resumeG);on('bRestart',()=>{SFX.click();enterLevel(curL);});on('bQuit',()=>{SFX.click();G.state='menu';renderLevels();showScr('levels');$('hud').classList.remove('on');});
  on('bNext',()=>{SFX.click();enterLevel(Math.min(NL,curL+1));});on('bWinShop',()=>{SFX.click();shopNext=Math.min(NL,curL+1);renderShop();showScr('shop');});on('bWinMenu',()=>{SFX.click();renderLevels();showScr('levels');});
  on('bRetry',()=>{SFX.click();enterLevel(curL);});on('bLoseShop',()=>{SFX.click();shopNext=curL;renderShop();showScr('shop');});on('bLoseMenu',()=>{SFX.click();renderLevels();showScr('levels');});
  on('bCardOk',cardOk);
  on('bEndOk',()=>{SFX.click();renderLevels();showScr('levels');});
  ['bHub0','bHubP','bHubW','bHubL','bHubE'].forEach(id=>on(id,goHub));
  document.querySelectorAll('.t-mus').forEach(b=>b.addEventListener('click',()=>tog('mus')));document.querySelectorAll('.t-sfx').forEach(b=>b.addEventListener('click',()=>tog('sfx')));document.querySelectorAll('.t-vib').forEach(b=>b.addEventListener('click',()=>tog('vib')));
  document.querySelectorAll('.aimsel button').forEach(b=>b.addEventListener('click',()=>{SFX.click();setAimMode(b.dataset.aim);}));setAimMode(aimMode);document.querySelectorAll('.dsel button').forEach(b=>b.addEventListener('click',()=>{SFX.click();setDiff(b.dataset.diff,!!b.closest('#pause'));}));setDiff(DIFF);
  togs();}
let shopFrom='title';
/* ---------------- loop ---------------- */
let last=0,_qa=0,_qn=0,_qt=0;/* adaptive quality: drop backing-store DPR when frames are slow (2 -> 1.5 -> 1.25 -> 1) */
function qTick(ms){if(G.state!=='play'||G.paused||ms>200)return;_qa+=ms;_qn++;_qt+=ms;if(_qt<800)return;const av=_qa/_qn;_qa=_qn=_qt=0;if(av>21&&QMAX>1){QMAX=av>30?1:QMAX>1.5?1.5:QMAX>1.25?1.25:1;try{localStorage.nwQ=QMAX}catch(e){}resize();}}
function frame(now){requestAnimationFrame(frame);const _ms=now-last,dt=Math.min(.05,_ms/1000||0);last=now;if(!FX)qTick(_ms);_frameNo++;if(G.state==='play'&&!G.paused)update(dt*(+Q.get('speed')||1));const vis=G.state==='play'||G.state==='end';if(vis)render();
  if(FX&&FX.tooSlow)fxDisable();
  if(FX){const v=vis?'visible':'hidden';if(FX.canvas.style.visibility!==v){FX.canvas.style.visibility=v;cvt.style.visibility=v;cv.style.opacity=vis?'0':'1';}
    if(vis){const s=G.shake>0?G.shake*G.shake*9*SC:0,tr=s?`translate(${rand(-s,s).toFixed(1)}px,${rand(-s,s).toFixed(1)}px)`:'';FX.canvas.style.transform=tr;cvt.style.transform=tr;FX.render(G.paused?16:_ms);}}
  window.__fr=(window.__fr||0)+1;}
/* ---------------- simulation harness: SIM.run(level, upgrades, skill, seed) ---------------- */
window.SIM={run(Lv,upg,skill,seed){let s=seed||1;rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};const keep=S.up;S.up=Object.assign({pres:0,wid:0,rng:0,cap:0,spr:0,flush:0},upg||{});
  BOT.on=true;BOT.skill=skill;BOT.lag=0;startLevel(Lv);let t=0;while(G.state==='play'&&t<400){update(1/30);t+=1/30;}const r=Object.assign({t:Math.round(t),calls:G.calls},G.result||{win:false,stars:0,timeout:1});S.up=keep;rnd=Math.random;BOT.on=Q.has('bot');G.state='title';return r;},
 levelDef,UPG,BT,NL};
window.__g=()=>({DBG,G,L,PL,SC,W,H,FX:!!FX,aimMode,fx:FX&&FX.stats(),jet:FX&&FX.jet()});
if(SIMMODE){H=844;SC=1;layout();}
else{addEventListener('resize',resize);resize();wire();refreshCoins();requestAnimationFrame(frame);
  if(Q.get('lv')){go(+Q.get('lv'));}
  setTimeout(()=>{$('loading').classList.add('off');},250);}
fxInit();
SPR.ready(()=>{bgKey='';try{flWarm(cv.getContext('2d'))}catch(e){}if(typeof def!=='undefined'&&def)buildBg(def.ch);});
