/* Bladder Brawl — Nasty World. Gameplay, rendering, audio, UI. */
'use strict';
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
let rnd=Math.random;const rand=(a,b)=>a+rnd()*(b-a);
const Q=new URLSearchParams(location.search);
const SIMMODE=Q.has('sim');
const W=400;let H=800,SC=1,DPR=1;const L={};
const cv=$('cv'),cx=cv.getContext('2d');
const FONT='"Lilita One","Fredoka",system-ui,sans-serif';
/* ---------------- save ---------------- */
const SKEY='bladderbrawl_v1';
const S=Object.assign({unl:1,stars:[],coins:0,up:{pres:0,wid:0,rng:0,cap:0,spr:0,flush:0},mus:1,sfx:1,vib:1,tip:0},(()=>{try{return JSON.parse(localStorage.getItem(SKEY))||{}}catch(e){return {}}})());
S.up=Object.assign({pres:0,wid:0,rng:0,cap:0,spr:0,flush:0},S.up);
function save(){if(SIMMODE)return;try{localStorage.setItem(SKEY,JSON.stringify(S))}catch(e){}}
/* ---------------- content ---------------- */
const BT={
 mosq:{name:'Skeeter',r:13,hp:2.2,spd:44,pts:6,res:0},
 fly:{name:'Buzzkill Fly',r:16,hp:5,spd:50,pts:9,res:.1},
 ant:{name:'Maggot Mob',r:12,hp:4,spd:36,pts:6,res:.15},
 roach:{name:'Roach Rocket',r:18,hp:12,spd:72,pts:16,res:.35},
 snail:{name:'Slimy Steve',r:20,hp:30,spd:17,pts:24,res:.5},
 gecko:{name:'Gecko Dash',r:18,hp:20,spd:58,pts:22,res:.55},
 baby:{name:'Spiderling',r:12,hp:6,spd:44,pts:7,res:.1},
 bfly:{name:'BARON BLOWFLY',r:44,hp:520,spd:12,pts:300,res:.85,boss:1},
 bsnail:{name:'GENERAL GOO',r:46,hp:1100,spd:9,pts:500,res:.9,boss:1},
 bspider:{name:'MAMA LEGS',r:52,hp:1550,spd:10,pts:800,res:.9,boss:1}
};
const CH=[
 {n:'Gas Station Restroom',s:'Cracked tiles. Mystery smells. Bugs.',wall:['#3fa7a3','#2a7d83'],grout:'rgba(10,40,50,.35)',deco:'gas'},
 {n:'Punk Club Toilet',s:'Sticky floors. Louder bugs.',wall:['#3a2a3a','#1a1020'],grout:'rgba(0,0,0,.4)',deco:'club'},
 {n:'Festival Porta-Loo',s:'Day three. Absolutely heaving.',wall:['#2b4fb0','#1a2a60'],grout:'rgba(10,20,60,.35)',deco:'porta'}
];
const NL=18;
const POOLS={1:['mosq'],2:['mosq','fly'],3:['mosq','ant'],4:['fly','ant','roach'],5:['mosq','fly','ant','roach'],6:['mosq','fly'],
 7:['snail','ant','fly'],8:['gecko','mosq','ant'],9:['snail','gecko','roach','fly'],10:['ant','roach','snail','gecko'],11:['mosq','fly','roach','snail','gecko'],12:['ant','fly'],
 13:['baby','roach','fly'],14:['baby','gecko','snail','ant'],15:['roach','gecko','baby','mosq'],16:['snail','gecko','roach','baby','fly'],17:['mosq','fly','ant','roach','snail','gecko','baby'],18:['baby','fly']};
const BOSS={6:'bfly',12:'bsnail',18:'bspider'};
const INTRO={1:'Hold and drag to aim. Hose those bugs back down!',2:'Flies stop and go. Don\u2019t fall for it.',3:'Maggots wriggle in lines. Sweep them!',4:'Roaches are fast and shrug off pressure.',
 5:'Everything at once. Good luck.',6:'Boss! Baron Blowfly calls in backup.',7:'Snails hide in their shell when hit hard.',8:'Geckos zig-zag and drop their tail to sprint.',12:'Boss! General Goo is VERY slimy.',13:'Spiderlings come in swarms.',18:'Final boss! Mama Legs and ALL her kids.'};
const DMT=[1,1,1,1.05,1,0.7,1.1,1.1,0.8,0.85,0.85,0.75,1.1,1,0.65,1.05,1.05,0.55];
function levelDef(Lv){
  const ch=Math.ceil(Lv/6)-1,boss=BOSS[Lv],pool=POOLS[Lv];
  const T=window.TUNE||{n:1.8,hp:.17,sp:.045,gap:.13};
  const n=boss?Math.round(6+Lv*T.n*.6):Math.round(8+Lv*T.n);
  const dm=(window.DM||DMT)[Lv-1];const hpM=(1+T.hp*(Lv-1))*dm,spM=1+T.sp*(Lv-1);
  const q=[];let t=1.2;let r=(Lv*9301+49297)%233280;const R=()=>(r=(r*9301+49297)%233280)/233280;
  if(boss)q.push({t:3,type:boss});
  let left=n;while(left>0){const ty=pool[Math.floor(R()*pool.length)];const g=Math.min(left,ty==='ant'||ty==='baby'?3+Math.floor(R()*3):1+Math.floor(R()*(Lv<3?2:3)));
    const gx=60+R()*280;for(let i=0;i<g;i++)q.push({t:t+i*(ty==='ant'?.45:.7),type:ty,gx,line:ty==='ant'});
    left-=g;t+=Math.max(1.1,(Lv<3?4.2:3.6)-Lv*(window.TUNE||{gap:.13}).gap)+g*.45+(boss?2.2:0);}
  q.sort((a,b)=>a.t-b.t);return {ch,boss,q,hpM,spM,n:q.length};
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
function wallL(y){const t=clamp((y-L.rimY)/(L.bowlBot-L.rimY),0,1),u=Math.max(0,(t-.55)/.45);return L.U.x+L.U.w*(.125+.21*u*u*u);}
function wallR(y){return W-wallL(y);}
function layout(){
  const st=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat'))||0,sb=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sab'))||0;
  L.top=st/SC+60;L.base=H-sb/SC+8;L.gusS=.8;L.feet=Math.min(96,H*.11);
  // urinal (sprite 479x793): interior top 13.5%, U-bottom 86%, drain at 72.9%
  const AR=793/479,avail=L.base-L.feet-(L.top+34);const Uh=Math.min(W*.96*AR,avail),Uw=Uh/AR;
  L.U={x:(W-Uw)/2,y:L.base-L.feet-Uh,w:Uw,h:Uh};
  L.rimY=L.U.y+Uh*.08;L.spawnY=L.U.y+Uh*.83;L.bowlBot=L.U.y+Uh*.86;L.waterY=L.U.y+Uh*.729;L.drainX=L.U.x+Uw*.493;L.drainR=Uw*.048;
  L.oy=L.bowlBot+14;L.wallH=L.bowlBot-L.rimY;
}
function resize(){const vw=innerWidth,vh=innerHeight;const ww=Math.min(vw,vh*0.62,560);SC=ww/W;H=Math.round(vh/SC);DPR=Math.min(2,devicePixelRatio||1);
  cv.style.width=ww+'px';cv.style.height=vh+'px';cv.width=Math.round(ww*DPR);cv.height=Math.round(vh*DPR);$('app').style.width=ww+'px';layout();bgKey='';}
/* ---------------- background ---------------- */
const bgC=document.createElement('canvas'),bgX=bgC.getContext('2d');let bgKey='';
function buildBg(ch){const k=ch+'|'+H+'|'+DPR;if(k===bgKey)return;bgKey=k;bgC.width=Math.round(W*SC*DPR);bgC.height=Math.round(H*SC*DPR);const c=bgX;c.setTransform(SC*DPR,0,0,SC*DPR,0,0);const C=CH[ch];
  c.fillStyle='#2a2230';c.fillRect(0,0,W,H);
  if(!SPR.cover(c,SPR.WALL[ch],W,H,0,0)){c.fillStyle=lin(c,0,0,0,H,[[0,C.wall[0]],[1,C.wall[1]]]);c.fillRect(0,0,W,H);}
  const U=L.U;
  // soft contact shadow under the urinal
  c.save();c.globalAlpha=.45;c.fillStyle='#000';c.filter='blur(10px)';c.beginPath();c.ellipse(W/2,U.y+U.h*.55,U.w*.52,U.h*.5,0,0,TAU);c.fill();c.restore();
  if(SPR.ok('urinal'))c.drawImage(SPR.I.urinal,U.x,U.y,U.w,U.h);
  else{c.beginPath();c.moveTo(wallL(L.rimY),L.rimY);for(let i=0;i<=24;i++){const y=L.rimY+i/24*L.wallH;c.lineTo(wallL(y),y);}for(let i=24;i>=0;i--){const y=L.rimY+i/24*L.wallH;c.lineTo(wallR(y),y);}c.closePath();c.fillStyle='#eee6d6';c.fill();}
}
/* ---------------- state ---------------- */
const G={state:'title',paused:false,t:0,bugs:[],drops:[],parts:[],pops:[],stains:[]};
let curL=1,def=null;
function stats(){const u=S.up;const o={dps:7*(1+.42*u.pres),rad:17+6*u.wid,kb:60*(1+.28*u.pres),range:L.wallH*(.78+.12*u.rng)+(L.oy-L.bowlBot),cap:100*(1+.35*u.cap),refill:16*(1+.3*u.cap),streams:1+u.spr,w:6+1.6*u.wid+.5*u.pres};
  if(G.super>0){o.dps*=1.8;o.rad*=1.3;o.kb*=1.4;o.w*=1.35;o.range*=1.15;}return o;}
function startLevel(Lv){curL=Lv;def=levelDef(Lv);
  Object.assign(G,{state:'play',paused:false,t:0,bugs:[],drops:[],parts:[],pops:[],stains:[],queue:def.q.slice(),wt:0,lives:5,lost:0,kills:0,earned:0,flushes:2+S.up.flush,flushFx:null,
   bladder:100,dry:false,super:0,combo:0,comboT:0,shake:0,hitstop:0,aim:{x:200,y:L.rimY+L.wallH*.5},f:{x:200,y:400,down:false,id:null,touch:false},firing:false,seq:0,emit:0,power:null,powerT:14,boss:null,clearT:-1,bounce:0,dangerT:0});
  G.bladder=stats().cap;buildBg(def.ch);if(!SIMMODE)SCN.reset();
  if(!SIMMODE){try{}catch(e){}hudInit();const b=INTRO[Lv];banner('Level '+Lv,b||CH[def.ch].n,def.boss?'boss':'');if(S.mus)bgmStart();}
}
function spawn(s){const T=BT[s.type];const boss=!!T.boss;let y=boss?L.bowlBot-70:L.spawnY-rand(0,14);let x=boss?200:(s.line?s.gx:rand(wallL(y)+T.r+6,wallR(y)-T.r-6));if(s.x!=null){x=s.x;y=s.y;}
  const hp=T.hp*(boss?1:def.hpM)*(boss?1+.15*Math.max(0,S.up.pres-2):1);
  const b={type:s.type,x,y,hp,maxHp:hp,t:rand(0,9),ph:rand(0,6),spawnT:0,kbV:0,dead:false,esc:null,rot:0,mv:1,mvT:rand(.3,.8),dir:rnd()<.5?-1:1,hide:0,hitAcc:0,sqT:9,hitT:0,cd:2.5,look:[0,-1],mood:0,blink:0,bl:rand(1,4),noTail:false,lastSnd:0};
  if(!SIMMODE&&s.type==='roach'&&rnd()<.05)b.gold=1;
  G.bugs.push(b);if(boss){G.boss=b;if(!SIMMODE){$('bossbar').classList.add('on');$('bossName').textContent=T.name;banner(T.name,'has entered the urinal!','boss');vib([60,40,120]);}G.shake=.8;}
  else if(!SIMMODE&&rnd()<.4)G.parts.push({k:'bub',x,y:L.waterY,vx:0,vy:-30,t:0,life:.5,r:5});return b;}
function pop(x,y,s,col,size,dur){if(SIMMODE)return;G.pops.push({x,y,s,col:col||'#fff',size:size||18,t:0,dur:dur||.9});}
function burst(x,y,n,col,spd){if(SIMMODE)return;for(let i=0;i<n;i++){const a=rand(0,TAU),v=rand(60,spd||200);G.parts.push({k:'drop',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-60,t:0,life:rand(.35,.6),r:rand(2,4.5),col:col||'#ffe56b'});}}
function damage(b,d,kb){if(b.dead||b.esc!=null)return;const T=BT[b.type];
  if(b.type==='snail'||b.type==='bsnail'){if(b.hide>0){d*=.3;kb*=.15;}else{b.hitAcc+=d;if(b.hitAcc>b.maxHp*(b.type==='bsnail'?.08:.3)){b.hide=b.type==='bsnail'?1.2:1.5;b.hitAcc=0;pop(b.x,b.y-30,'SHELL!','#ff9ccb',16,.7);}}}
  b.hp-=d;b.kbV=Math.min(T.boss?90:240,b.kbV+kb*(1-T.res));if(b.hitT<=0)b.sqT=0;b.hitT=.15;b.mood=1;
  if(G.t-b.lastSnd>.25&&!SIMMODE){b.lastSnd=G.t;SFX.pop(T.boss?.5:rand(.9,1.3));burst(b.x,b.y-T.r*.4,2,'#fff3a0',140);}
  if(b.type==='gecko'&&!b.noTail&&b.hp<b.maxHp*.5){b.noTail=true;pop(b.x,b.y-24,'Tail drop!','#b8f58a',15,.7);}
  if(b.hp<=0)kill(b,false);}
function kill(b,flushed){if(b.dead)return;const T=BT[b.type];b.dead=true;b.vx=rand(-90,90);b.vy=flushed?rand(80,200):rand(-240,-150);b.spinV=rand(6,12)*(rnd()<.5?-1:1);b.spin=0;b.mood=3;
  G.combo=G.comboT>0?G.combo+1:1;G.comboT=1.2;const bonus=G.combo>=3?Math.min(G.combo,10):0;const c=T.pts*(b.gold?6:1)+bonus;if(b.gold&&!SIMMODE){pop(b.x,b.y-60,'GOLDEN ROACH!','#ffd23a',26,1.4);SFX.power();}G.earned+=c;G.kills++;
  pop(b.x,b.y-10,'+'+c,'#ffe066',T.boss?34:18);if(G.combo>=3&&!flushed){G.pops=G.pops.filter(p=>!p.combo);pop(b.x,b.y-38,'COMBO x'+G.combo,'#ff8fd0',18,1);if(G.pops.length)G.pops[G.pops.length-1].combo=1;}
  burst(b.x,b.y,T.boss?26:8,'#ffe56b',T.boss?340:220);if(!SIMMODE){SFX.squish(T.boss?.5:rand(.85,1.2));if(G.combo%5===0)SFX.coin();}
  if(T.boss){G.shake=1.3;G.hitstop=.18;G.boss=null;vib([80,50,160]);if(!SIMMODE){$('bossbar').classList.remove('on');pop(200,L.rimY+80,'BOSS FLUSHED!','#ffe066',32,1.6);}}}
function hurt(b){const T=BT[b.type];if(!SIMMODE)SCN.ev('stomp');const n=T.boss?3:1;G.lives=Math.max(0,G.lives-n);G.lost+=n;G.shake=Math.max(G.shake,.6);
  if(!SIMMODE){SFX.hurt();vib([70,40,90]);pop(b.x,L.rimY-24,['GOT OUT!','ESCAPED!','EWW, NO!','IT\u2019S LOOSE!'][Math.floor(rand(0,4))],'#ff7a9a',18,1.1);hudHearts(true);$('app').classList.remove('hurt');void $('app').offsetWidth;$('app').classList.add('hurt');}
  if(G.lives<=0){G.endT=.8;}}
function doFlush(){if(G.state!=='play'||G.paused)return;if(G.flushes<=0||G.flushFx){if(!SIMMODE){SFX.deny();pop(200,L.rimY+40,G.flushes<=0?'No flushes left!':'Already flushing\u2026','#fff',15,.8);}return;}
  G.flushes--;G.flushFx={t:0,id:rnd()};if(!SIMMODE)SCN.ev('flush');G.shake=1;if(!SIMMODE){SFX.flush();vib(120);pop(200,L.rimY+60,'FLUUUSH!','#9fe6ff',34,1.3);hudFlush();}}
/* ---------------- bot (for difficulty measurement) ---------------- */
const BOT={on:Q.has('bot'),skill:.6,lag:0,tx:200,ty:400};
function botStep(dt,st){const sk=BOT.skill;BOT.lag-=dt;
  if(BOT.lag<=0){BOT.lag=.15+(1-sk)*.6;let tgt=null,best=1e9;for(const b of G.bugs){if(b.dead||b.esc!=null||b.spawnT<.25)continue;const sc=b.y-(BT[b.type].boss?120:0)+rand(0,(1-sk)*160);if(sc<best){best=sc;tgt=b;}}
    if(G.power&&!G.power.got&&rnd()<sk*.6)tgt=G.power;
    if(tgt){const e=(1-sk)*90;BOT.tx=tgt.x+rand(-e,e);BOT.ty=tgt.y+rand(-e,e)*.6-(tgt.type&&BT[tgt.type].boss?10:0);BOT.fire=!G.dry;}else BOT.fire=false;
    if(G.flushes>0&&!G.flushFx){let n=0;for(const b of G.bugs)if(!b.dead&&b.esc==null&&b.y<L.rimY+L.wallH*.25)n++;if(n>=(sk>.7?3:4)||(G.boss&&G.boss.y<L.rimY+L.wallH*.3))doFlush();}}
  G.f.down=BOT.fire;G.f.x=BOT.tx;G.f.y=BOT.ty;G.f.touch=false;}
/* ---------------- update ---------------- */
function update(dt){
  if(G.state!=='play')return;G.t+=dt;
  if(G.hitstop>0){G.hitstop-=dt;return;}
  const st=stats();
  G.shake=Math.max(0,G.shake-dt*1.8);G.bounce=Math.max(0,G.bounce-dt*3);if(G.comboT>0)G.comboT-=dt;if(G.super>0)G.super=Math.max(0,G.super-dt);
  if(BOT.on)botStep(dt,st);
  const fo=G.f.touch?56:0;const tx=clamp(G.f.x,4,W-4),ty=clamp(G.f.y-fo,L.U.y-30,H-24);const k=1-Math.exp(-dt*18);G.aim.x+=(tx-G.aim.x)*k;G.aim.y+=(ty-G.aim.y)*k;
  const want=G.f.down;
  if(G.bladder<=.5&&!G.dry){G.dry=true;pop(200,L.oy-150,'Running on empty\u2026','#ffe066',18,1.2);if(!SIMMODE)SFX.sput();}
  if(G.dry&&G.bladder>=st.cap*.3)G.dry=false;
  G.firing=want&&!G.dry;
  if(G.firing){if(G.super<=0)G.bladder=Math.max(0,G.bladder-dt*11);}else G.bladder=Math.min(st.cap,G.bladder+dt*st.refill*(want?.5:1));
  const ox=200+clamp((G.aim.x-200)*.06,-10,10),oy=L.bowlBot+14;/* virtual launch point (keeps v2 reach/lag) */G.ox=200+(G.aim.x-200)*.28+Math.sin(G.t*1.1)*7+Math.sin(G.t*2.7)*2;G.oy=-36+Math.sin(G.t*1.7)*3;if(!SIMMODE)SCN.aimJitter(dt);
  if(G.firing){G.emit+=dt*(SIMMODE?36:72);const per=SIMMODE?2:1;const dx=G.aim.x-ox,dy=G.aim.y-oy;const d=Math.min(Math.hypot(dx,dy),st.range),a0=Math.atan2(dy,dx);
    const offs=st.streams===1?[0]:st.streams===2?[-.1,.1]:[-.17,0,.17];
    while(G.emit>=1){G.emit-=1;G.seq++;offs.forEach((off,si)=>{const a=a0+off+Math.sin(G.t*13+si)*.012,dd=d*(off?.97:1)*(1+.012*Math.sin(G.t*9+si));const tx2=ox+Math.cos(a)*dd,ty2=oy+Math.sin(a)*dd;const tf=.15+Math.hypot(tx2-ox,ty2-oy)/1500;
      G.drops.push({x:G.ox,y:G.oy,ox:G.ox+(si-(st.streams-1)/2)*5,oy:G.oy,tx:tx2,ty:ty2,u:0,age:0,tf,sid:si,seq:G.seq,dmg:st.dps/72*per*(off?.62:1),kb:st.kb/72*per*(off?.7:1)*6,rad:st.rad*(off?.85:1)});});}
    if(!SIMMODE&&G.drops.length>6&&rnd()<dt*22){const d=G.drops[Math.floor(rnd()*G.drops.length)];if(!d.dribble&&d.u>.2&&d.u<.9)G.parts.push({k:'drop',x:d.x+rand(-3,3),y:d.y,vx:rand(-30,30),vy:rand(80,200),t:0,life:rand(.15,.3),r:rand(1,2.4)*(1.4-d.u),col:'#ffe27a'});}
    if(!SIMMODE)streamSnd(1,2300+S.up.pres*300+(G.super>0?700:0));
  }else{G.emit=0;if(!SIMMODE){streamSnd(0);if(want&&G.dry&&rnd()<dt*5){SFX.sput();G.drops.push({x:G.ox+rand(-6,6),y:-6,vx:rand(-20,20),vy:rand(260,340),age:0,tf:.5,sid:9,seq:-99,dmg:0,kb:0,rad:0,dribble:1});}}}
  for(let i=G.drops.length-1;i>=0;i--){const d=G.drops[i];d.age+=dt;if(d.dribble){d.vy+=900*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;}else streamPos(d);if(d.age>=d.tf){G.drops.splice(i,1);if(!d.dribble)impact(d);}}
  for(let i=G.parts.length-1;i>=0;i--){const p=G.parts[i];p.t+=dt;if(p.t>=p.life){G.parts.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.k==='drop')p.vy+=800*dt;}
  for(let i=G.pops.length-1;i>=0;i--){const p=G.pops[i];p.t+=dt;if(p.t>=p.dur)G.pops.splice(i,1);}
  for(let i=G.stains.length-1;i>=0;i--){const s=G.stains[i];s.a-=dt*(G.flushFx?.8:.03);if(s.a<=0)G.stains.splice(i,1);}
  // power-up: energy drink can floats down
  if(!G.power){G.powerT-=dt;if(G.powerT<=0&&G.queue.length+G.bugs.length>0){G.power={x:rand(90,310),y:L.rimY+10,t:0,got:false};G.powerT=rand(16,22);}}
  else{const p=G.power;p.t+=dt;if(!p.got){p.y+=dt*30;p.x+=Math.sin(p.t*1.6)*dt*30;if(p.y>L.waterY-10)G.power=null;}else if(p.t>.8)G.power=null;}
  if(G.flushFx){const f=G.flushFx;f.t+=dt;const front=L.rimY-30+(L.bowlBot+60-L.rimY)*Math.min(1,(f.t/.8)**2);f.front=front;
    if(f.t<1.3)for(const b of G.bugs){if(b.dead||b.esc!=null||b.y>front)continue;if(BT[b.type].boss){if(b.fl!==f.id){b.fl=f.id;damage(b,b.maxHp*.12,0);b.kbV=300;}}else kill(b,true);}
    if(f.t>2.2)G.flushFx=null;}
  G.wt+=dt;while(G.queue.length&&G.queue[0].t<=G.wt)spawn(G.queue.shift());
  let danger=false;for(let i=G.bugs.length-1;i>=0;i--){const b=G.bugs[i];if(updBug(b,dt)){G.bugs.splice(i,1);continue;}if(!b.dead&&b.esc==null&&b.y<L.rimY+L.wallH*.22)danger=true;}
  G.danger=danger;if(!SIMMODE)SCN.update(dt);
  if(G.endT!=null){G.endT-=dt;if(G.endT<=0){G.endT=null;endLevel(false);return;}}
  if(G.lives>0&&!G.queue.length&&!G.bugs.length){if(G.clearT<0)G.clearT=0;G.clearT+=dt;if(G.clearT>1){G.clearT=-1;endLevel(true);}}
  if(!SIMMODE&&!BOT.on){/* tutorial nudge */}
}
/* stream falls from the player above the camera: quadratic arc O->T, accelerating (gravity), perspective handled in drawStream */
function streamPos(d){const u=Math.min(1,d.age/d.tf),e=u*(.55+.45*u),cx=d.ox+(d.tx-d.ox)*.62+(d.tx>d.ox?-1:1)*Math.min(40,Math.abs(d.tx-d.ox)*.3),cy=d.oy+(d.ty-d.oy)*.22,m=1-e;d.u=e;
  d.x=m*m*d.ox+2*m*e*cx+e*e*d.tx+Math.sin(d.seq*.9+d.age*30)*1.6*m;d.y=m*m*d.oy+2*m*e*cy+e*e*d.ty;d.x=e>=1?d.tx:d.x;d.y=e>=1?d.ty:d.y;}
function impact(d){const x=d.x,y=d.y;if(!SIMMODE&&SCN.impact(d))return;if(y<L.rimY-16){if(!SIMMODE&&rnd()<.3)G.parts.push({k:'drop',x,y,vx:rand(-60,60),vy:rand(-60,30),t:0,life:.5,r:2,col:'#ffe56b'});return;}
  const r2=d.rad;for(const b of G.bugs){if(b.dead||b.esc!=null)continue;const R=BT[b.type].r+r2,dx=b.x-x,dy=b.y-y;if(dx*dx+dy*dy<R*R)damage(b,d.dmg,d.kb);}
  if(G.power&&!G.power.got&&Math.hypot(G.power.x-x,G.power.y-y)<r2+20){const p=G.power;p.got=true;p.t=0;G.bladder=stats().cap;G.super=6;pop(p.x,p.y-20,'MEGA STREAM!','#9fffd0',26,1.3);burst(p.x,p.y,14,'#9fffd0',260);G.bounce=1;if(!SIMMODE){SFX.power();vib(40);}}
  if(SIMMODE)return;
  const dk=.55+.75*clamp((y-L.rimY)/L.wallH,0,1);SCN.splash(x,y,dk);
  if(rnd()<.6)G.parts.push({k:'drop',x:x+rand(-r2,r2)*.4,y,vx:rand(-130,130)*dk,vy:rand(-200,-60)*dk,t:0,life:rand(.25,.45),r:rand(1.4,3.2)*dk,col:'#ffe56b'});
  if(rnd()<.1){G.stains.push({x:x+rand(-8,8),y:y+rand(-6,6),r:rand(6,14),a:.3});if(G.stains.length>60)G.stains.shift();}}
function updBug(b,dt){const T=BT[b.type];b.t+=dt;b.spawnT+=dt;b.sqT+=dt;if(b.hitT>0){b.hitT-=dt;if(b.hitT<=0&&!b.dead)b.mood=b.type==='bspider'?2:0;}
  b.bl-=dt;if(b.bl<=0){b.bl=rand(2,5);}b.blink=b.bl<.12?1:0;
  if(b.dead){if(b.gulp!=null){b.gulp+=dt;b.x+=(200-b.x)*Math.min(1,dt*8);b.y+=(L.waterY-b.y)*Math.min(1,dt*8);b.spin+=dt*14;if(b.gulp>.3){if(!SIMMODE){SFX.splash();for(let i=0;i<6;i++)G.parts.push({k:'drop',x:b.x+rand(-10,10),y:L.waterY,vx:rand(-90,90),vy:rand(-260,-140),t:0,life:.6,r:rand(2,4),col:'#bff0ff'});}return true;}return false;}
    b.vy+=1100*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.spin+=b.spinV*dt;b.x=clamp(b.x,wallL(b.y)+5,wallR(b.y)-5);if(b.vy>0&&b.y>=L.waterY-6)b.gulp=0;return false;}
  if(b.esc!=null){b.esc+=dt;b.y-=dt*70;if(b.esc>.5){hurt(b);if(b===G.boss){G.boss=null;if(!SIMMODE)$('bossbar').classList.remove('on');}return true;}return false;}
  let up=T.spd*def.spM,vx=0;
  switch(b.type){
   case 'mosq':vx=Math.sin(b.t*3.2+b.ph)*65;up*=.9+.25*Math.sin(b.t*5+b.ph);break;
   case 'ant':vx=Math.sin(b.t*2.4+b.ph)*14;break;
   case 'baby':vx=Math.sin(b.t*3+b.ph)*36;break;
   case 'fly':case 'roach':b.mvT-=dt;if(b.mvT<=0){b.mv=b.mv?0:1;b.mvT=b.mv?rand(.5,.9):rand(.3,b.type==='fly'?.7:.35);b.dir=rand(-1,1);}if(b.mv){up*=b.type==='fly'?1.75:1.3;vx=b.dir*(b.type==='fly'?70:55);}else up=0;break;
   case 'snail':case 'bsnail':if(b.hide>0){b.hide-=dt;up=0;}if(b.type==='bsnail'){vx=Math.sin(b.t*.6)*30;b.cd-=dt;if(b.cd<=0){b.cd=4.2;for(const s of[-1,1])spawn({type:'ant',x:clamp(b.x+s*50,70,330),y:b.y+10}).spawnT=0;}}break;
   case 'gecko':if(b.noTail)up*=1.35;b.mvT-=dt;if(b.mvT<=0){b.dir=-b.dir;b.mvT=rand(.4,.75);}vx=b.dir*up*1.1;up*=.8;break;
   case 'bfly':vx=Math.sin(b.t*.8)*50;b.cd-=dt;if(b.cd<=0){b.cd=3.4;for(const s of[-1,1])spawn({type:rnd()<.5?'fly':'mosq',x:clamp(b.x+s*50,70,330),y:b.y+10}).spawnT=0;}break;
   case 'bspider':vx=Math.sin(b.t*.7)*40;b.cd-=dt;if(b.cd<=0){b.cd=3.3;for(const s of[-1,0,1])spawn({type:'baby',x:clamp(b.x+s*55,wallL(b.y+16)+14,wallR(b.y+16)-14),y:b.y+16}).spawnT=0;}break;
  }
  if(b.spawnT<.35){up*=.2;vx*=.2;}if(G.flushFx&&!T.boss&&G.flushFx.t<1.3)up=0;
  const vy=-up+b.kbV;b.kbV*=Math.exp(-dt*5);b.x+=vx*dt;b.y+=vy*dt;
  const lw=wallL(b.y)+T.r*.8,rw=wallR(b.y)-T.r*.8;if(b.x<lw){b.x=lw;b.dir=1;}if(b.x>rw){b.x=rw;b.dir=-1;}if(b.y>L.spawnY+6)b.y=L.spawnY+6;
  const ta=clamp(Math.atan2(vx,Math.max(30,-vy+40))*.9,-.7,.7);b.rot+=(ta-b.rot)*Math.min(1,dt*6);
  b.look=[clamp((G.aim.x-b.x)/120,-1,1),clamp((G.aim.y-b.y)/120,-1,1)];
  if(b.y<L.rimY+(T.boss?30:4))b.esc=0;return false;}
/* ---------------- render ---------------- */
function render(){const c=cx;c.setTransform(DPR*SC,0,0,DPR*SC,0,0);
  if(G.state==='title'||!def){c.fillStyle='#1d1530';c.fillRect(0,0,W,H);return;}
  c.save();if(G.shake>0){const s=G.shake*G.shake*9;c.translate(rand(-s,s),rand(-s,s));}
  c.drawImage(bgC,0,0,W,H);
  // tinted water as you pee
  c.save();c.globalAlpha=clamp(G.t/90,0,.35);ell(c,L.drainX,L.waterY,L.drainR*2.2,L.drainR*1.1);c.fillStyle='#ffe14d';c.fill();c.restore();
  for(const s of G.stains){c.globalAlpha=s.a;ell(c,s.x,s.y,s.r,s.r*.6);c.fillStyle='#f2cf2c';c.fill();}c.globalAlpha=1;
  if(G.danger){c.save();c.globalAlpha=.25+.15*Math.sin(G.t*12);c.fillStyle='#ff3b5c';c.fillRect(L.U.x+L.U.w*.08,L.rimY-8,L.U.w*.84,22);c.restore();}
  SCN.drawBack(c);
  // power (urinal cake)
  if(G.power&&SPR.ok('cake')){const p=G.power;c.save();c.translate(p.x,p.y);const s=p.got?1+p.t*2:1;c.scale(s,s);c.globalAlpha=p.got?1-p.t/.8:1;c.rotate(Math.sin(p.t*3)*.2);const g=c.createRadialGradient(0,0,2,0,0,36);g.addColorStop(0,'rgba(255,120,220,.7)');g.addColorStop(1,'rgba(255,120,220,0)');c.fillStyle=g;circ(c,0,0,36);c.fill();SPR.img(c,'cake',0,0,30);c.restore();}
  else if(G.power){const p=G.power;c.save();c.translate(p.x,p.y);const s=p.got?1+p.t*2:1;c.scale(s,s);c.globalAlpha=p.got?1-p.t/.8:1;c.rotate(Math.sin(p.t*3)*.25);
    const g=c.createRadialGradient(0,0,2,0,0,34);g.addColorStop(0,'rgba(160,255,200,.7)');g.addColorStop(1,'rgba(160,255,200,0)');c.fillStyle=g;circ(c,0,0,34);c.fill();
    rr(c,-11,-18,22,36,6);fillS(c,lin(c,-11,0,11,0,[[0,'#2fd6a0'],[.5,'#b8ffe0'],[1,'#139b74']]),3);c.fillStyle=OL;c.font='11px '+FONT;c.textAlign='center';c.fillText('ZAP',0,4);rr(c,-9,-21,18,5,2);fillS(c,'#ccd',2);c.restore();}
  // bugs
  const list=G.bugs.slice().sort((a,b)=>a.y-b.y);
  for(const b of list){const T=BT[b.type];c.save();c.globalAlpha=.18;ell(c,b.x+4,b.y+T.r*.7,T.r*.9,T.r*.35);c.fillStyle='#24304a';c.fill();c.restore();}
  for(const b of list){const T=BT[b.type];c.save();c.translate(b.x,b.y);
    if(b.dead)c.rotate(b.spin);else c.rotate(b.rot);
    const sq=b.sqT<.25?Math.sin(b.sqT/.25*Math.PI)*.22:0;const sp=b.spawnT<.35?b.spawnT/.35:1;c.scale((1+sq)*sp,(1-sq)*sp);
    if(b.esc!=null)c.globalAlpha=1-b.esc*1.6;if(b.dead&&b.gulp!=null)c.scale(1-b.gulp*3,1-b.gulp*3);
    if(b.hitT>0)c.translate(rand(-1.5,1.5),0);
    if(!SPR.bug(c,b,G.t+b.ph))BUGART[b.type](c,b,G.t+b.ph);c.restore();
    if(!b.dead&&b.esc==null&&b.hp<b.maxHp&&!T.boss){const w=T.r*2;rr(c,b.x-w/2,b.y-T.r-14,w,6,3);fillS(c,'rgba(0,0,0,.45)');rr(c,b.x-w/2+1,b.y-T.r-13,(w-2)*clamp(b.hp/b.maxHp,0,1),4,2);c.fillStyle='#ffde4a';c.fill();}}
  // flush water
  if(G.flushFx&&G.flushFx.front!=null){const f=G.flushFx;c.save();c.beginPath();c.moveTo(wallL(L.rimY),L.rimY);for(let i=0;i<=20;i++){const y=L.rimY+i/20*L.wallH;c.lineTo(wallL(y),y);}for(let i=20;i>=0;i--){const y=L.rimY+i/20*L.wallH;c.lineTo(wallR(y),y);}c.clip();
    c.globalAlpha=f.t>1.4?Math.max(0,1-(f.t-1.4)/.8):.85;const g=c.createLinearGradient(0,L.rimY,0,f.front);g.addColorStop(0,'rgba(120,220,255,.85)');g.addColorStop(1,'rgba(200,245,255,.95)');c.fillStyle=g;c.beginPath();c.moveTo(0,L.rimY-40);c.lineTo(W,L.rimY-40);
    for(let x=W;x>=0;x-=20)c.lineTo(x,f.front+Math.sin(x*.05+f.t*12)*8);c.fill();c.globalAlpha*=.6;c.strokeStyle='#fff';c.lineWidth=3;for(let k=0;k<6;k++){c.beginPath();const y=L.rimY+((f.t*300+k*60)%(f.front-L.rimY+1));c.arc(W/2,y,40+k*25,.2,Math.PI-.2);c.stroke();}c.restore();}
  drawStream(c);
  for(const p of G.parts){const a=1-p.t/p.life;c.globalAlpha=a;circ(c,p.x,p.y,p.r*(p.k==='bub'?1+p.t:1));c.fillStyle=p.col||'#bff0ff';c.fill();}c.globalAlpha=1;
  // hero
  SCN.drawFront(c);
  // aim reticle
  if(G.f.down){c.save();c.globalAlpha=.7;c.strokeStyle='#fff';c.lineWidth=2.5;c.setLineDash([5,5]);circ(c,G.aim.x,G.aim.y,14+Math.sin(G.t*10)*2);c.stroke();c.restore();}
  for(const p of G.pops){const k=p.t/p.dur,s=k<.15?k/.15*1.2:k<.25?1.2-(k-.15)*2:1;c.save();c.globalAlpha=k>.7?1-(k-.7)/.3:1;c.translate(p.x,p.y-k*30);c.scale(s,s);c.font=p.size+'px '+FONT;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=5;c.strokeStyle=OL;c.strokeText(p.s,0,0);c.fillStyle=p.col;c.fillText(p.s,0,0);c.restore();}
  c.restore();
  if(G.super>0){c.save();c.globalAlpha=.25+.1*Math.sin(G.t*10);c.strokeStyle='#9fffd0';c.lineWidth=10;c.strokeRect(0,0,W,H);c.restore();}
  hudTick();
}
function drawStream(c){if(!G.drops.length)return;const by={};for(const d of G.drops){if(d.dribble){circ(c,d.x,d.y,2.5);c.fillStyle='#ffe56b';c.fill();continue;}(by[d.sid]=by[d.sid]||[]).push(d);}
  const st=stats(),sup=G.super>0;c.lineCap='round';
  for(const k in by){const a=by[k].sort((p,q)=>q.seq-p.seq);const segs=[];let cur=[a[0]];for(let i=1;i<a.length;i++){if(a[i-1].seq-a[i].seq>2){segs.push(cur);cur=[];}cur.push(a[i]);}segs.push(cur);
    for(const s of segs){const z=s[s.length-1];if(z.u>.5)s.push({x:z.tx,y:z.ty,u:1,seq:z.seq-1});if(s.length<2)continue;const w0=st.w*(k>0?.8:1);
      // depth: near the camera (top, u~0) the stream is thick and soft; far end (impact) thin and crisp
      const W_=d=>w0*(3.6-2.7*d.u);
      const pass=(col,mul,alpha,from)=>{c.strokeStyle=col;for(let i=from||1;i<s.length;i++){const p=s[i-1],q=s[i];c.globalAlpha=typeof alpha==='function'?alpha(q):alpha;c.lineWidth=W_(q)*mul;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();}};
      pass(sup?'rgba(120,255,200,1)':'rgba(255,214,60,1)',1.9,d=>.16*(1-d.u));           // soft near-camera blur halo
      pass('rgba(110,70,0,1)',1.12,d=>.22+.2*d.u);                                       // contact edge, sharper when far
      pass(sup?'#7dffc4':'#ffc928',1,d=>.55+.3*d.u);                                      // translucent body
      pass(sup?'#f0fff8':'#fff3a8',.38,d=>.5+.4*d.u);                                     // highlight
      c.globalAlpha=1;
      const e=s[s.length-1];if(e.u>.98){c.globalAlpha=.75;circ(c,e.x,e.y,w0*.85);c.fillStyle='#fff6c0';c.fill();c.globalAlpha=1;}
      for(let i=3;i<s.length;i+=5){const d=s[i];c.fillStyle='rgba(255,255,255,.8)';circ(c,d.x+Math.sin(d.seq)*W_(d)*.25,d.y,.8+1.4*(1-d.u));c.fill();}}}}
/* ---------------- HUD / UI ---------------- */
let hudLast={};
function hudInit(){$('hud').classList.add('on');$('bossbar').classList.remove('on');$('hLvl').textContent='Level '+curL;hudLast={};hudHearts();hudFlush();}
function hudHearts(anim){const h=$('hHearts');let s='';for(let i=0;i<5;i++)s+=`<i class="${i<G.lives?'':'off'}${anim&&i===G.lives?' pop':''}">\u2665</i>`;h.innerHTML=s;}
function hudFlush(){$('fCnt').textContent=G.flushes;$('bFlush').classList.toggle('off',G.flushes<=0);}
function hudTick(){if(G.state!=='play')return;const st=stats();const tot=def.n,done=tot-G.queue.length-G.bugs.filter(b=>!b.dead).length;const pr=Math.round(clamp(done/tot,0,1)*100);
  if(hudLast.pr!==pr){hudLast.pr=pr;$('hProg').style.width=pr+'%';}
  const bl=Math.round(G.bladder/st.cap*100);if(hudLast.bl!==bl||hudLast.dry!==G.dry){hudLast.bl=bl;hudLast.dry=G.dry;$('tankF').style.height=bl+'%';$('tank').classList.toggle('dry',G.dry);}
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
  for(let i=1;i<=6;i++){const Lv=ch*6+i,lock=Lv>S.unl,st=S.stars[Lv]||0;const b=document.createElement('button');b.className='lv'+(lock?' lock':'')+(BOSS[Lv]?' boss':'');
    b.innerHTML=lock?'<span class="lk">\uD83D\uDD12</span>':`${Lv}<span class="st">${'\u2605'.repeat(st)}<i>${'\u2605'.repeat(3-st)}</i></span>`+(BOSS[Lv]?'<span class="bt">BOSS</span>':'');
    b.onclick=()=>{if(lock){SFX.deny();toast('Beat level '+(Lv-1)+' first!');return;}SFX.click();go(Lv);};g.appendChild(b);}
  $('wDots').innerHTML=[0,1,2].map(i=>`<i class="${i===ch?'on':''}"></i>`).join('');$('wPrev').style.visibility=ch>0?'visible':'hidden';$('wNext').style.visibility=ch<2?'visible':'hidden';refreshCoins();}
function renderShop(){const box=$('ups');box.innerHTML='';for(const u of UPG){const l=S.up[u.k],mx=l>=u.max,c=mx?0:u.c[l];const d=document.createElement('div');d.className='up';
  d.innerHTML=`<div class="ic ic-${u.k}"></div><div class="tx"><div class="nm">${u.name} <small>Lv ${l}/${u.max}</small></div><div class="ds">${u.d}</div><div class="pips">${'<i class="on"></i>'.repeat(l)}${'<i></i>'.repeat(u.max-l)}</div></div>`;
  const b=document.createElement('button');b.className='btn orange buy'+(mx?' max':S.coins>=c?'':' no');b.innerHTML=mx?'MAX':`<span class="coin"></span>${c}`;
  b.onclick=()=>{if(mx)return;if(S.coins<c){SFX.deny();toast('Not enough coins. Go splash more bugs!');return;}S.coins-=c;S.up[u.k]++;save();SFX.coin();vib(20);renderShop();};d.appendChild(b);box.appendChild(d);}refreshCoins();}
let shopNext=0;
function go(Lv){showScr('none');auInit();startLevel(Lv);if(!S.tip&&Lv===1){G.paused=true;showScr('tip');}}
function pauseG(){if(G.state!=='play'||G.paused)return;G.paused=true;G.f.down=false;streamSnd(0);bgmStop();$('pSub').textContent='Level '+curL+' \u00B7 '+CH[def.ch].n;showScr('pause');}
function resumeG(){G.paused=false;showScr('none');if(S.mus)bgmStart();SFX.click();}
function endLevel(win){G.state='end';if(!SIMMODE)SCN.ev(win?'win':'lose');G.f.down=false;if(!SIMMODE){streamSnd(0);bgmStop();$('hud').classList.remove('on');}
  const stars=G.lost===0?3:G.lost<=2?2:1;G.result={win,stars,earned:G.earned,lost:G.lost};if(SIMMODE)return;
  if(win){const bonus=20+curL*8+stars*10;S.coins+=G.earned+bonus;S.stars[curL]=Math.max(S.stars[curL]||0,stars);if(curL>=S.unl&&curL<NL)S.unl=curL+1;save();SFX.win();vib([30,40,30]);
    if(curL===NL){$('endStars').textContent=S.stars.slice(1).reduce((a,b)=>a+(b||0),0)+' / '+NL*3;showScr('ending');return;}
    $('wSubT').textContent='Level '+curL+' cleared!';$('wEarn').textContent=G.earned+bonus;$('wRib').textContent=['','Messy win','Solid splash','Flawless flow'][stars];
    const sw=$('wStars');sw.innerHTML='';for(let i=0;i<3;i++){const s=document.createElement('span');s.className='star'+(i<stars?' got':'')+(i===1?' mid':'');s.textContent='\u2605';sw.appendChild(s);if(i<stars)setTimeout(()=>{s.classList.add('pop');SFX.pop(1+i*.3);},350+i*260);}
    showScr('win');}
  else{S.coins+=Math.floor(G.earned*.6);save();SFX.lose();vib([100,60,100]);$('lSub').textContent=['The bugs escaped the urinal. Gross.','They\u2019re loose in the building now.','You had one job.'][Math.floor(rand(0,3))];$('lEarn').textContent=Math.floor(G.earned*.6);showScr('lose');}}
function goHub(e){if(e)e.stopPropagation();save();SFX.click();location.href='../';}
/* ---------------- input ---------------- */
function toLocal(e){const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
cv.addEventListener('pointerdown',e=>{e.preventDefault();auInit();if(G.state!=='play'||G.paused||BOT.on)return;if(G.f.id!=null&&G.f.id!==e.pointerId)return;const p=toLocal(e);if(SCN.onPipe(p.x,p.y)){doFlush();return;}G.f.id=e.pointerId;G.f.down=true;G.f.touch=e.pointerType!=='mouse';G.f.x=p.x;G.f.y=p.y;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{if(G.f.id!==e.pointerId)return;const p=toLocal(e);G.f.x=p.x;G.f.y=p.y;});
const up=e=>{if(G.f.id!==e.pointerId)return;G.f.down=false;G.f.id=null;};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.addEventListener('lostpointercapture',up);
document.addEventListener('touchmove',e=>{if(e.target.closest&&e.target.closest('.scroll'))return;e.preventDefault();},{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault());document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseG();if(AU.ctx)AU.ctx.suspend();}else if(AU.ctx)AU.ctx.resume();});
window.addEventListener('keydown',e=>{if(G.state!=='play')return;if(e.key===' '){e.preventDefault();doFlush();}if(e.key==='Escape'||e.key==='p')G.paused?resumeG():pauseG();});
['pointerdown','touchend','keydown'].forEach(ev=>document.addEventListener(ev,auInit,true));
/* ---------------- wiring ---------------- */
function wire(){const on=(id,f)=>{const e=$(id);if(e)e.addEventListener('click',f);};
  on('bStart',()=>{SFX.click();auInit();if(S.unl===1&&!S.stars[1])go(1);else{wPage=Math.min(2,Math.floor((S.unl-1)/6));renderLevels();showScr('levels');}});
  on('bShop1',()=>{SFX.click();shopNext=0;shopFrom='title';renderShop();showScr('shop');});on('bShop2',()=>{SFX.click();shopNext=0;shopFrom='levels';renderShop();showScr('shop');});
  on('bBack1',()=>{SFX.click();showScr('title');});on('bBack2',()=>{SFX.click();if(shopNext){renderLevels();showScr('levels');}else{if(shopFrom==='levels')renderLevels();showScr(shopFrom);}});
  on('bShopGo',()=>{SFX.click();go(shopNext||Math.min(S.unl,NL));});
  on('wPrev',()=>{wPage=Math.max(0,wPage-1);SFX.click();renderLevels();});on('wNext',()=>{wPage=Math.min(2,wPage+1);SFX.click();renderLevels();});
  on('bTipOk',()=>{S.tip=1;save();SFX.click();showScr('none');G.paused=false;});
  on('bPause',e=>{e.stopPropagation();SFX.click();pauseG();});on('bFlush',e=>{e.stopPropagation();doFlush();});
  on('bResume',resumeG);on('bRestart',()=>{SFX.click();go(curL);});on('bQuit',()=>{SFX.click();G.state='menu';renderLevels();showScr('levels');$('hud').classList.remove('on');});
  on('bNext',()=>{SFX.click();go(Math.min(NL,curL+1));});on('bWinShop',()=>{SFX.click();shopNext=Math.min(NL,curL+1);renderShop();showScr('shop');});on('bWinMenu',()=>{SFX.click();renderLevels();showScr('levels');});
  on('bRetry',()=>{SFX.click();go(curL);});on('bLoseShop',()=>{SFX.click();shopNext=curL;renderShop();showScr('shop');});on('bLoseMenu',()=>{SFX.click();renderLevels();showScr('levels');});
  on('bEndOk',()=>{SFX.click();renderLevels();showScr('levels');});
  ['bHub0','bHubP','bHubW','bHubL','bHubE'].forEach(id=>on(id,goHub));
  document.querySelectorAll('.t-mus').forEach(b=>b.addEventListener('click',()=>tog('mus')));document.querySelectorAll('.t-sfx').forEach(b=>b.addEventListener('click',()=>tog('sfx')));document.querySelectorAll('.t-vib').forEach(b=>b.addEventListener('click',()=>tog('vib')));
  togs();}
let shopFrom='title';
/* ---------------- loop ---------------- */
let last=0;function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000||0);last=now;if(G.state==='play'&&!G.paused)update(dt*(+Q.get('speed')||1));if(G.state==='play'||G.state==='end')render();}
/* ---------------- simulation harness: SIM.run(level, upgrades, skill, seed) ---------------- */
window.SIM={run(Lv,upg,skill,seed){let s=seed||1;rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};const keep=S.up;S.up=Object.assign({pres:0,wid:0,rng:0,cap:0,spr:0,flush:0},upg||{});
  BOT.on=true;BOT.skill=skill;BOT.lag=0;startLevel(Lv);let t=0;while(G.state==='play'&&t<400){update(1/30);t+=1/30;}const r=Object.assign({t:Math.round(t)},G.result||{win:false,stars:0,timeout:1});S.up=keep;rnd=Math.random;BOT.on=Q.has('bot');G.state='title';return r;},
 levelDef,UPG,BT,NL};
if(SIMMODE){H=844;SC=1;layout();}
else{addEventListener('resize',resize);resize();wire();refreshCoins();requestAnimationFrame(frame);
  if(Q.get('lv')){go(+Q.get('lv'));}
  setTimeout(()=>{$('loading').classList.add('off');},250);}
SPR.ready(()=>{bgKey='';if(typeof def!=='undefined'&&def)buildBg(def.ch);});
