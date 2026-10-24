'use strict';
(()=>{
const W=400,H=760,FOOT_TOP=228,STEP=6,CM=12;
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const $=id=>document.getElementById(id);
let scale=1,offX=0,offY=0,dpr=1;
function resize(){dpr=Math.min(window.devicePixelRatio||1,2.5);const w=innerWidth,h=innerHeight;cv.width=w*dpr;cv.height=h*dpr;scale=Math.min(w/W,h/H);offX=(w-W*scale)/2;offY=(h-H*scale)/2;placeHud();}
function placeHud(){const pb=$('pauseBtn'),sb=$('soakBtn');pb.style.left=(offX+W*scale-54)+'px';pb.style.top=(offY+8)+'px';sb.style.left=(offX+10)+'px';sb.style.top=(offY+(FOOT_TOP+8)*scale)+'px';}
addEventListener('resize',resize);
// ---------- rng ----------
let seed=1;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};const rr=(a,b)=>a+(b-a)*rnd();
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
// ---------- save ----------
const SAVE_KEY='nw_heelarious_v1';
let save={stars:{},best:{}};try{Object.assign(save,JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'))}catch(e){}
const persist=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(e){}};
const totalStars=()=>Object.values(save.stars).reduce((a,b)=>a+b,0);
// tools unlocked by stars
const TOOLS=[
 {id:'clip1',name:'Nail Clippers',need:2,icon:'✂️',desc:'Wider PERFECT SNIP window at the end of a strip.'},
 {id:'soak',name:'Soak Bucket',need:3,icon:'🛁',desc:'+1 soak per scene: skin goes soft & stretchy for 7 s.'},
 {id:'mag',name:'Magnifier',need:5,icon:'🔍',desc:'Shows the pink “too deep” edge of every strip.'},
 {id:'pum',name:'Pro Pumice',need:7,icon:'🪨',desc:'Scrub calluses twice as fast.'},
 {id:'clip2',name:'Surgical Clippers',need:10,icon:'✂️',desc:'Even wider PERFECT SNIP window.'},
 {id:'soak2',name:'Foot Spa Tub',need:13,icon:'🫧',desc:'Another +1 soak per scene.'}];
const has=id=>totalStars()>=TOOLS.find(t=>t.id===id).need;
// ---------- levels (measured curve, see DIFFICULTY.md) ----------
const LEVELS=[
 {name:'Sunday Novel',scene:'book',foot:'heel',time:60,target:.80,flakes:13,len:[18,34],wid:[13,19],limit:330,deep:1.8,sticky:0,tickle:0,callus:0,items:.35,distract:0,
  skin:'#f2b48f',dry:'#f6ecd2',fresh:'#ffb3a3',
  blurb:'Lazy Sunday. Big novel. Even bigger heel crust. He is not even looking.'},
 {name:'Deadline Laptop',scene:'laptop',foot:'toes',time:70,target:.80,flakes:16,len:[14,28],wid:[10,15],limit:280,deep:1.3,sticky:.1,tickle:2,callus:0,items:.35,distract:1,
  skin:'#e9a07a',dry:'#f3e6c6',fresh:'#ff9f94',
  blurb:'Spreadsheet due at 9. Toes are ticklish: lingering there makes him jerk.'},
 {name:'Beach Aftermath',scene:'tv',foot:'shin',time:65,target:.80,flakes:10,len:[26,48],wid:[20,28],limit:200,sticky:.08,tickle:0,callus:0,items:.3,distract:1,sheet:true,
  skin:'#ff8a6a',dry:'#ffe3cf',fresh:'#ffc0ae',
  blurb:'Forgot sunscreen in Mallorca. Sunburn peels in huge fragile SHEETS. Go slow.'},
 {name:'The Throne Scroll',scene:'toilet',foot:'sole',time:85,target:.78,flakes:16,len:[14,28],wid:[10,15],limit:250,sticky:.35,tickle:2,callus:2,items:.4,distract:2,crumbly:true,
  skin:'#e8a684',dry:'#e9e2b0',fresh:'#ffad9e',
  blurb:'Phone on the toilet. Gym-sock athlete\'s foot: crumbly, sticky, plus two calluses to scrub.'},
 {name:'Nature Doc Dream',scene:'dream',foot:'elephant',time:85,target:.78,flakes:14,len:[12,24],wid:[16,22],limit:210,sticky:.25,tickle:0,callus:4,items:.4,distract:2,deep:.7,
  skin:'#9aa0ab',dry:'#d9d2bf',fresh:'#c9b2c2',
  blurb:'Dozed off to a nature doc. Now HE is the elephant. Thick plates, touchy edges.'},
 {name:'Midnight Monster',scene:'monster',foot:'monster',time:90,target:.80,flakes:18,len:[16,36],wid:[12,18],limit:230,sticky:.3,tickle:1,callus:2,items:.45,distract:3,regrow:10,boss:true,
  skin:'#7cc47a',dry:'#e5f0b8',fresh:'#c9f2a8',
  blurb:'BOSS. Too much cheese before bed: the Monster Foot. Its skin REGROWS. Be quick.'}];
// ---------- audio ----------
let ac=null,master=null,noiseBuf=null,humOsc=null,humGain=null;
function audio(){if(ac)return;try{ac=new (window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=.7;master.connect(ac.destination);
 noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 humOsc=ac.createOscillator();humOsc.type='triangle';humOsc.frequency.value=150;humGain=ac.createGain();humGain.gain.value=0;const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=600;humOsc.connect(lp);lp.connect(humGain);humGain.connect(master);humOsc.start();}catch(e){ac=null}}
function noise(t0,dur,freq,q,vol,type='bandpass'){if(!ac)return;const s=ac.createBufferSource();s.buffer=noiseBuf;s.playbackRate.value=rr(.8,1.2);const f=ac.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=ac.createGain();g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.001,t0+dur);s.connect(f);f.connect(g);g.connect(master);s.start(t0,rnd()*.5,dur+.05);}
function tone(t0,f0,f1,dur,vol,type='sine'){if(!ac)return;const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(f1,t0+dur);const g=ac.createGain();g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.001,t0+dur);o.connect(g);g.connect(master);o.start(t0);o.stop(t0+dur+.05);}
const now=()=>ac?ac.currentTime:0;
const SFX={
 crunch(i){const t=now();noise(t,.03+.03*rnd(),rr(1800,4200),rr(2,6),.15+.25*i);if(rnd()<.4)noise(t+.015,.02,rr(5000,7000),3,.1*i);},
 squish(){const t=now();noise(t,.12,rr(300,600),1.5,.25,'lowpass');tone(t,rr(180,240),90,.12,.08);},
 grab(){const t=now();noise(t,.05,2500,4,.2);tone(t,500,900,.06,.06,'triangle');},
 tear(){const t=now();noise(t,.08,3200,1,.5);noise(t+.03,.15,900,1,.3);tone(t,700,180,.12,.08,'square');},
 pop(){const t=now();tone(t,300,1200,.09,.18);noise(t,.04,4000,2,.15);},
 perfect(){const t=now();[660,880,1320].forEach((f,i)=>tone(t+i*.06,f,f*1.01,.18,.12,'triangle'));},
 ouch(){const t=now();tone(t,900,160,.35,.25,'sawtooth');tone(t+.05,500,120,.3,.15,'square');noise(t,.1,600,1,.3);},
 boing(){const t=now();tone(t,200,600,.12,.2);tone(t+.12,600,180,.25,.15);},
 giggle(){const t=now();for(let i=0;i<4;i++)tone(t+i*.09,520+i*30,420,.07,.1,'triangle');},
 item(){const t=now();tone(t,988,988,.08,.12,'square');tone(t+.08,1319,1319,.2,.12,'square');},
 cheer(){const t=now();for(let i=0;i<26;i++)noise(t+rnd()*1.2,.05,rr(1500,3000),4,.18);noise(t,1.3,1200,.6,.12);tone(t,523,523,.15,.1,'triangle');tone(t+.15,659,659,.15,.1,'triangle');tone(t+.3,784,784,.4,.12,'triangle');},
 buzz(){const t=now();for(let i=0;i<3;i++)tone(t+i*.14,140,140,.1,.18,'square');},
 meow(){const t=now();tone(t,500,900,.15,.12,'sawtooth');tone(t+.15,900,420,.3,.12,'sawtooth');},
 voice(){const t=now();tone(t,330,520,.18,.14,'square');tone(t+.2,520,280,.3,.14,'square');},
 scrub(){const t=now();noise(t,.06,rr(700,1500),1.2,.12);},
 win(){const t=now();[523,659,784,1047,1319].forEach((f,i)=>tone(t+i*.09,f,f,.25,.12,'triangle'));},
 lose(){const t=now();[392,330,262,196].forEach((f,i)=>tone(t+i*.16,f,f*.97,.25,.12,'triangle'));}};
function buzz(ms,shake){try{if(navigator.vibrate&&navigator.vibrate(ms))return}catch(e){}G&&(G.shake=Math.max(G.shake,shake||ms/10));}
// ---------- foot shapes ----------
function footPath(type){const p=new Path2D(),cx=200;
 if(type==='heel'){p.ellipse(cx,520,150,215,0,0,7);}
 else if(type==='toes'){p.moveTo(40,760);p.bezierCurveTo(40,520,70,430,200,430);p.bezierCurveTo(330,430,360,520,360,760);p.closePath();
  [[85,420,40],[150,370,50],[222,360,58],[292,385,48],[345,440,36]].forEach(([x,y,r])=>{p.moveTo(x+r,y);p.ellipse(x,y,r,r*1.15,0,0,7)});}
 else if(type==='shin'){p.moveTo(110,760);p.bezierCurveTo(95,600,90,430,120,300);p.bezierCurveTo(150,235,250,235,280,300);p.bezierCurveTo(310,430,305,600,290,760);p.closePath();}
 else if(type==='sole'){p.moveTo(200,745);p.bezierCurveTo(100,745,95,640,115,560);p.bezierCurveTo(135,480,95,430,105,360);p.bezierCurveTo(115,300,170,290,230,295);p.bezierCurveTo(300,300,320,350,310,420);p.bezierCurveTo(300,520,300,600,295,650);p.bezierCurveTo(290,720,260,745,200,745);
  [[130,275,26],[178,252,24],[222,250,22],[262,262,19],[296,288,16]].forEach(([x,y,r])=>{p.moveTo(x+r,y);p.ellipse(x,y,r,r*1.2,0,0,7)});}
 else if(type==='elephant'){p.ellipse(cx,510,175,205,0,0,7);}
 else {p.moveTo(200,750);p.bezierCurveTo(70,750,55,600,80,470);p.bezierCurveTo(95,380,110,320,200,315);p.bezierCurveTo(290,320,310,380,320,470);p.bezierCurveTo(345,600,330,750,200,750);
  [[105,320,40],[200,285,48],[295,320,40]].forEach(([x,y,r])=>{p.moveTo(x+r,y);p.ellipse(x,y,r,r*1.2,0,0,7)});}
 return p;}
const mctx=document.createElement('canvas').getContext('2d');
// ---------- game state ----------
let G=null,state='title',lvlIdx=0;
function newGame(i){lvlIdx=i;const L=LEVELS[i];seed=1000+i*7919;
 const path=footPath(L.foot);
 G={L,path,t:0,timeLeft:L.time,flakes:[],loose:[],parts:[],pops:[],dots:[],calluses:[],grab:null,finger:null,footOff:{x:0,y:0,vx:0,vy:0},
  score:0,combo:0,maxCombo:0,longest:0,longestPts:null,ouch:0,perfects:0,items:{sand:0,lint:0,coin:0,mega:0},removedW:0,totalW:0,
  soaks:(has('soak')?1:0)+(has('soak2')?1:0),soakT:0,slow:0,banner:null,shake:0,mood:'idle',moodT:0,face:{blink:0,look:0},
  tickle:0,tickZones:[],distract:null,nextDistract:rr(14,22),regrowT:L.regrow||0,done:false,revealT:0,rateS:0,cheerTxt:null};
 const occ=new Set(),key=(x,y)=>((x/9)|0)+','+((y/9)|0);
 const inMask=(x,y)=>mctx.isPointInPath(path,x,y)&&y>FOOT_TOP+14&&y<H-8;
 // calluses first
 for(let c=0;c<L.callus;c++){for(let tries=0;tries<200;tries++){const x=rr(90,310),y=rr(330,700),r=rr(34,44);
   let ok=true;for(let a=0;a<12;a++){const px=x+Math.cos(a/12*6.28)*r,py=y+Math.sin(a/12*6.28)*r;if(!inMask(px,py)){ok=false;break}}
   if(ok&&G.calluses.every(o=>dist(o.x,o.y,x,y)>o.r+r+10)){G.calluses.push({x,y,r,prog:0,done:false,scrubT:0});
    for(let gx=x-r-6;gx<=x+r+6;gx+=4)for(let gy=y-r-6;gy<=y+r+6;gy+=4)if(dist(gx,gy,x,y)<r+6)occ.add(key(gx,gy));break;}}}
 let made=0,tries=0;
 while(made<L.flakes&&tries<4000){tries++;const f=genFlake(L,inMask,occ,key,made===0&&L.items>0&&i>=2?'mega':null);if(f){G.flakes.push(f);made++;}}
 G.totalW=G.flakes.reduce((a,f)=>a+f.wsum,0);
 G.calluses.forEach(c=>{G.totalW+=c.r*1.6*STEP*8/STEP;});
 // tips: reveal ~half, rest revealed by chaining
 G.flakes.forEach((f,k)=>f.tip=k%2===0||k<2);
 // tickle zones
 if(L.tickle){const zs={toes:[[150,370],[292,385]],sole:[[205,470],[150,620]],monster:[[200,300]]}[L.foot]||[];zs.slice(0,L.tickle).forEach(([x,y])=>G.tickZones.push({x,y,r:44}));}
 return G;}
function genFlake(L,inMask,occ,key,kind){
 const mega=kind==='mega';const wid=mega?[L.wid[1]*1.4,L.wid[1]*1.7]:L.wid;
 const x0=rr(60,340),y0=rr(FOOT_TOP+40,740);if(!inMask(x0,y0))return null;
 let ang=rr(0,6.28),curv=rr(-.05,.05);const n=Math.round(rr(L.len[0],L.len[1])*(mega?1.3:1));const hw=rr(wid[0],wid[1])*(L.sheet?.8:.7);
 const pts=[];let x=x0,y=y0;const cells=[];
 for(let i=0;i<n;i++){const t=i/(n-1);const taper=Math.min(1,.35+t*4,(1-t)*5+.25);const w=hw*taper*(L.sheet?1:1);
  const nx=-Math.sin(ang),ny=Math.cos(ang);
  // check
  for(let s=-1;s<=1;s+=.5){const px=x+nx*w*s,py=y+ny*w*s;if(!inMask(px,py))return pts.length>=L.len[0]*.7?finish():null;const k=key(px,py);if(occ.has(k)&&!cells.includes(k))return pts.length>=L.len[0]*.7?finish():null;}
  pts.push({x,y,nx,ny,wl:w*rr(.8,1.15),wr:w*rr(.8,1.15),sticky:false,crack:rnd()});
  for(let s=-1;s<=1;s+=.34){cells.push(key(x+nx*(w+4)*s,y+ny*(w+4)*s));}
  ang+=curv+rr(-.06,.06);x+=Math.cos(ang)*STEP;y+=Math.sin(ang)*STEP;}
 return finish();
 function finish(){if(pts.length<8)return null;cells.forEach(c=>occ.add(c));
  if(L.sticky){let i=3;while(i<pts.length-3){if(rnd()<L.sticky*.25){const len=Math.round(rr(3,6));for(let j=i;j<Math.min(pts.length-2,i+len);j++)pts[j].sticky=true;i+=len+4}else i++;}}
  // taper ends hard
  const f={pts,s:0,p:0,removed:new Array(pts.length).fill(false),tip:false,mega,item:null,wsum:0,deepZone:Math.max(3,Math.round(pts.length*.12)),grow:1};
  f.wsum=pts.reduce((a,q)=>a+q.wl+q.wr,0);
  if(!mega&&rnd()<L.items){const r=rnd();f.item={i:Math.round(rr(.3,.8)*pts.length),type:r<.45?'sand':r<.8?'lint':'coin',got:false};}
  return f;}}
// ---------- input ----------
function toV(e){const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left-offX)/scale,y:(e.clientY-r.top-offY)/scale};}
let pointerId=null;
cv.addEventListener('pointerdown',e=>{audio();if(ac&&ac.state==='suspended')ac.resume();if(state!=='play'||!G||G.done)return;if(pointerId!==null)return;pointerId=e.pointerId;try{cv.setPointerCapture(e.pointerId)}catch(_){}
 const v=toV(e);G.finger={x:v.x,y:v.y,px:v.x,py:v.y,vx:0,vy:0};tryGrab();e.preventDefault();});
cv.addEventListener('pointermove',e=>{if(e.pointerId!==pointerId||!G||!G.finger)return;const v=toV(e);G.finger.x=v.x;G.finger.y=v.y;e.preventDefault();});
const up=e=>{if(e.pointerId!==pointerId)return;pointerId=null;if(G){release(true);G.finger=null;}};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
function fo(){return G.footOff}
function P(f,i){const a=f.pts[Math.min(f.pts.length-1,Math.floor(i))],b=f.pts[Math.min(f.pts.length-1,Math.ceil(i))],t=i-Math.floor(i);return {x:lerp(a.x,b.x,t)+fo().x,y:lerp(a.y,b.y,t)+fo().y};}
function tryGrab(){const F=G.finger;let best=null,bd=30;
 G.flakes.forEach(f=>{if(!f.tip||f.s>=f.pts.length-1)return;const q=P(f,f.s);const d=dist(q.x,q.y,F.x,F.y);if(d<bd){bd=d;best=f}});
 if(best){if(G.distract&&G.distract.phase==='freeze'){caught();return}
  const f=best,q=P(f,f.s);G.grab={f,nodes:[{x:F.x,y:F.y,ox:F.x,oy:F.y,i:f.s}],snipT:-1,stress:0};f.p=f.s;G.rateS=0;SFX.grab();buzz(8,1);}}
function release(byUser){const g=G.grab;if(!g)return;G.grab=null;const f=g.f;
 if(g.snipT>=0&&byUser){detach(f,'perfect');return}
 if(f.p-f.s>=1)detach(f,'partial');else f.p=f.s;}
// detach the peeled part [s..p] as a loose strip
function detach(f,how){const a=f.s,b=Math.min(f.pts.length-1,Math.floor(f.p));if(b<=a){return}
 const nodes=[];for(let i=a;i<=b;i++){const q=P(f,i);nodes.push({x:q.x,y:q.y,ox:q.x,oy:q.y,i});}
 // use grabbed chain positions if available
 const g=G.grab&&G.grab.f===f?G.grab:null;
 let w=0;for(let i=a;i<=b;i++){if(!f.removed[i]){f.removed[i]=true;w+=f.pts[i].wl+f.pts[i].wr;}}
 G.removedW+=w;const lenCm=(b-a)*STEP/CM;
 G.loose.push({f,nodes:(lastChain&&lastChain.f===f?lastChain.nodes.map(n=>({...n})):nodes).map((n,k)=>({...n,i:a+k})),a,b,life:2.4,vy:0});lastChain=null;
 // items
 if(f.item&&!f.item.got&&f.item.i>=a&&f.item.i<=b){f.item.got=true;G.items[f.item.type]++;const q=P(f,f.item.i);G.pops.push({x:q.x,y:q.y,type:f.item.type,t:0});G.score+=f.item.type==='coin'?150:f.item.type==='lint'?60:40;SFX.item();}
 let pts=Math.round(lenCm*10*(1+G.combo*.25)*(f.mega?3:1));
 if(how==='perfect'){pts=Math.round(pts*1.5);G.perfects++;G.combo++;SFX.perfect();buzz(15,2);floatTxt('PERFECT SNIP!','#7dffb0');}
 else if(how==='clean'){G.combo++;SFX.pop();buzz(10,1);floatTxt('Clean!','#fff');}
 else if(how==='tear'){G.combo=0;SFX.tear();buzz(25,4);floatTxt('Rrrip!','#ffd36b');crumbs(f,b,14);}
 else if(how==='deep'){G.combo=0;}
 else {SFX.squish();}
 if(f.mega&&b>=f.pts.length-1){G.items.mega++;floatTxt('MEGA SHEET JACKPOT ×3','#ffd36b');}
 G.maxCombo=Math.max(G.maxCombo,G.combo);G.score+=pts;
 if(lenCm>G.longest){G.longest=lenCm;G.longestPts={f,a,b};}
 if(lenCm>=20&&how!=='deep'){G.slow=1.3;G.banner={txt:'MEGA PEEL! '+Math.round(lenCm)+' cm',t:0};SFX.cheer();buzz(40,3);}
 f.s=b;f.p=b;
 if(b>=f.pts.length-1){f.s=f.pts.length-1;chainNext(f);}else f.tip=true;
 if(G.grab&&G.grab.f===f)G.grab=null;}
let lastChain=null;
function chainNext(f){const e=f.pts[f.pts.length-1];let best=null,bd=1e9;G.flakes.forEach(o=>{if(o!==f&&!o.tip&&o.s<o.pts.length-1){const d=dist(o.pts[o.s].x,o.pts[o.s].y,e.x,e.y);if(d<bd){bd=d;best=o}}});
 if(best){best.tip=true;best.reveal=1;}}
function floatTxt(t,c){G.parts.push({kind:'txt',t,c,x:G.finger?G.finger.x:200,y:(G.finger?G.finger.y:450)-30,life:1});}
function crumbs(f,i,n){const q=P(f,i);for(let k=0;k<n;k++)G.parts.push({kind:'crumb',x:q.x,y:q.y,vx:rr(-90,90),vy:rr(-120,20),life:rr(.6,1.1),r:rr(1.5,3.5)});}
function ouch(f){G.ouch++;G.combo=0;const q=P(f,f.pts.length-1);G.dots.push({x:q.x-fo().x,y:q.y-fo().y,t:0});G.mood='ouch';G.moodT=1.1;SFX.ouch();buzz([30,40,60],8);G.shake=10;
 G.parts.push({kind:'ouch',x:q.x,y:q.y-20,life:1.1});}
function caught(){G.combo=0;floatTxt('BUSTED! combo lost','#ff8a7a');SFX.boing();if(G.grab){lastChain=null;const f=G.grab.f;G.grab=null;if(f.p-f.s>=1)detach(f,'partial')}}
// ---------- update ----------
function update(rdt){if(!G)return;let dt=Math.min(rdt,.033);if(G.slow>0){G.slow-=rdt;dt*=.3}
 G.t+=dt;G.face.blink-=rdt;if(G.face.blink<-.12)G.face.blink=rr(2,4.5);
 if(G.done){G.revealT+=rdt;updLoose(dt);updParts(dt);if(G.revealT>2.3&&state==='play')endLevel(G.won);return;}
 G.timeLeft-=dt;if(G.soakT>0)G.soakT-=dt;
 // foot spring
 const o=G.footOff;o.vx+=(-o.x*120-o.vx*9)*dt;o.vy+=(-o.y*120-o.vy*9)*dt;o.x+=o.vx*dt;o.y+=o.vy*dt;
 G.shake=Math.max(0,G.shake-dt*30);G.moodT-=dt;
 const F=G.finger;
 if(F){F.vx=(F.x-F.px)/dt;F.vy=(F.y-F.py)/dt;F.px=F.x;F.py=F.y;}
 // callus scrubbing
 if(F&&!G.grab){G.calluses.forEach(c=>{if(c.done)return;if(dist(F.x,F.y,c.x+o.x,c.y+o.y)<c.r+8){const sp=Math.hypot(F.vx,F.vy);if(sp>60){c.prog+=sp*dt*(has('pum')?.0022:.0011)*(G.soakT>0?2:1);c.scrubT-=dt;if(c.scrubT<0){SFX.scrub();c.scrubT=.07;G.parts.push({kind:'crumb',x:F.x,y:F.y,vx:rr(-60,60),vy:rr(-60,0),life:.5,r:rr(1,2.5)})}
   if(c.prog>=1){c.done=true;callusToFlake(c);SFX.pop();floatTxt('Softened! Peel it','#bff3e6')}}}});}
 // tickle
 if(F&&G.grab){let inZ=false;G.tickZones.forEach(z=>{if(dist(F.x,F.y,z.x+o.x,z.y+o.y)<z.r||(()=>{const q=P(G.grab.f,G.grab.f.p);return dist(q.x,q.y,z.x+o.x,z.y+o.y)<z.r})())inZ=true});
  G.tickle=inZ?G.tickle+dt:Math.max(0,G.tickle-dt*.5);
  if(G.tickle>.9){G.tickle=0;const a=rr(0,6.28);o.vx+=Math.cos(a)*700;o.vy+=Math.sin(a)*700-300;G.mood='giggle';G.moodT=1;SFX.giggle();buzz(20,5);floatTxt('hehe! *twitch*','#ffd0f0');}}
 // peeling
 const g=G.grab;
 if(g&&F){const f=g.f,L=G.L;const anchor=P(f,f.p);const Lr=(f.p-f.s)*STEP;let d=dist(F.x,F.y,anchor.x,anchor.y);
  // inextensible folded flap: advance front until |finger-anchor| <= peeled length
  let adv=0;if(d>Lr){const n=f.pts.length-1;let pp=f.p;while(pp<n){pp=Math.min(n,pp+.25);const A=P(f,pp);if(dist(F.x,F.y,A.x,A.y)<=(pp-f.s)*STEP)break;}adv=pp-f.p;f.p=pp;}
  const rate=adv*STEP/dt;G.rateS=lerp(G.rateS,rate,.3);
  const pi=f.pts[Math.min(f.pts.length-1,Math.floor(f.p))];
  let lim=L.limit*(pi&&pi.sticky?.55:1)*(G.soakT>0?1.6:1)*(L.sheet?1:1);
  g.tension=G.rateS/lim;
  if(f.p>=f.pts.length-1.01)G.rateS=0;
  if(adv>0){if(rnd()<clamp(adv*1.4,0,1))SFX.crunch(clamp(g.tension,.2,1));if(L.crumbly&&rnd()<.25)crumbs(f,f.p,1);}
  if(G.rateS>lim){g.stress+=dt*(G.rateS/lim)}else g.stress=Math.max(0,g.stress-dt);
  // chain sim
  simChain(g,F);
  if(g.stress>.07&&f.p<f.pts.length-1){lastChain={f,nodes:g.nodes};G.grab=null;detach(f,'tear');}
  else if(f.p>=f.pts.length-1.01){ // end reached: snip window
   const A2=P(f,f.p);d=dist(F.x,F.y,A2.x,A2.y);if(g.snipT<0){g.snipT=0;g.snipStartD=d;}
   g.snipT+=rdt;const win=.3+(has('clip1')?.14:0)+(has('clip2')?.14:0);
   const pulled=d-(f.p-f.s)*STEP;
   const wn=win*(L.deep||1);if(pulled>90){lastChain={f,nodes:g.nodes};G.grab=null;ouch(f);detach(f,'deep');}
   else if(g.snipT>wn){lastChain={f,nodes:g.nodes};G.grab=null;if(G.rateS>20||Math.hypot(F.vx,F.vy)>60){ouch(f);detach(f,'deep')}else detach(f,'clean');}
  }
  // mood
  if(G.moodT<=0){const nearEnd=f.p>f.pts.length-1-f.deepZone;G.mood=(g.tension>.75||nearEnd)?'wince':(G.rateS>25?'content':'focus');}
 } else if(G.moodT<=0)G.mood='idle';
 if(humGain){humGain.gain.setTargetAtTime(G.mood==='content'?.05:0,now(),.08);humOsc.frequency.setTargetAtTime(140+Math.sin(G.t*5)*12,now(),.05);}
 // distractions
 if(G.L.distract){G.nextDistract-=dt;if(!G.distract&&G.nextDistract<=0){const kinds=['phone','cat','voice'];G.distract={kind:kinds[Math.floor(rnd()*Math.min(3,G.L.distract+1))],phase:'warn',t:0};}
  const D=G.distract;if(D){D.t+=dt;if(D.phase==='warn'&&D.t>1.1){D.phase='freeze';D.t=0;D.kind==='phone'?SFX.buzz():D.kind==='cat'?SFX.meow():SFX.voice();if(G.grab&&Math.hypot(F?F.vx:0,F?F.vy:0)>20)caught();}
   else if(D.phase==='freeze'){if(G.grab&&F&&Math.hypot(F.vx,F.vy)>70&&D.t>.15)caught();if(D.t>1.6){D.phase='off';D.t=0;floatTxt('phew…','#bff3e6');G.distract=null;G.nextDistract=rr(11,18)/Math.max(1,G.L.distract*.6);}}}}
 // regrow (boss)
 if(G.L.regrow){G.regrowT-=dt;if(G.regrowT<=0){G.regrowT=G.L.regrow;const done=G.flakes.filter(f=>f.s>=f.pts.length-1&&!(G.grab&&G.grab.f===f));if(done.length){const f=done[Math.floor(rnd()*done.length)];f.s=0;f.p=0;f.removed.fill(false);f.tip=true;f.grow=0;G.removedW-=f.wsum;floatTxt('IT REGROWS!','#c9f2a8');SFX.squish();}}}
 G.flakes.forEach(f=>{if(f.grow<1)f.grow=Math.min(1,f.grow+dt*1.5);if(f.reveal)f.reveal=Math.max(0,f.reveal-dt)});
 // ensure something grabbable
 if(!G.flakes.some(f=>f.tip&&f.s<f.pts.length-1)){const f=G.flakes.find(f=>f.s<f.pts.length-1);if(f){f.tip=true;f.reveal=1}}
 updLoose(dt);updParts(dt);
 if(G.banner){G.banner.t+=rdt;if(G.banner.t>2)G.banner=null;}
 // win/lose
 const clean=cleanPct();
 if(clean>=G.L.target){finish(true);}else if(G.ouch>=3){finish(false,'Ouch overload!');}else if(G.timeLeft<=0){finish(false,'Out of time!');}
}
function cleanPct(){return G.totalW?clamp(G.removedW/G.totalW,0,1):0}
function callusToFlake(c){const pts=[];const n=Math.round(c.r*2/STEP);for(let i=0;i<n;i++){const x=c.x-c.r+i*STEP*1.0,y=c.y+Math.sin(i/n*3.14)*-6;const t=i/(n-1);const w=c.r*.85*Math.sqrt(Math.max(.05,1-(2*t-1)**2));pts.push({x,y,nx:0,ny:1,wl:w,wr:w,sticky:false,crack:rnd()});}
 const f={pts,s:0,p:0,removed:new Array(n).fill(false),tip:true,reveal:1,mega:false,item:rnd()<.6?{i:Math.round(n/2),type:rnd()<.5?'sand':'coin',got:false}:null,wsum:0,deepZone:3,grow:1,callus:true};
 f.wsum=pts.reduce((a,q)=>a+q.wl+q.wr,0);G.totalW+=f.wsum-c.r*1.6*8;G.flakes.push(f);}
function simChain(g,F){const f=g.f,nodes=g.nodes;
 // ensure nodes cover s..floor(p)
 const tgt=Math.floor(f.p)-f.s+1;while(nodes.length<tgt+1){const q=P(f,f.s+nodes.length);nodes.push({x:q.x,y:q.y,ox:q.x,oy:q.y});}
 while(nodes.length>tgt+1)nodes.pop();
 nodes[0].x=F.x;nodes[0].y=F.y;
 for(let k=1;k<nodes.length-1;k++){const n=nodes[k];const vx=(n.x-n.ox)*.9,vy=(n.y-n.oy)*.9;n.ox=n.x;n.oy=n.y;n.x+=vx;n.y+=vy+.15;}
 const last=nodes[nodes.length-1],an=P(f,f.p);last.x=an.x;last.y=an.y;
 const N=nodes.length;for(let it=0;it<6;it++)for(let k=0;k<N-1;k++){const a=nodes[k],b=nodes[k+1];const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;if(d<=STEP)continue;const diff=(d-STEP)/d;
  const pa=k===0,pb=k+1===N-1;if(pa&&pb)continue;const wa=pa?0:pb?1:.5,wb=pb?0:pa?1:.5;a.x+=dx*diff*wa;a.y+=dy*diff*wa;b.x-=dx*diff*wb;b.y-=dy*diff*wb;}}
function updLoose(dt){G.loose.forEach(l=>{l.life-=dt;l.nodes.forEach((n,k)=>{const vx=(n.x-n.ox)*.97,vy=(n.y-n.oy)*.97;n.ox=n.x;n.oy=n.y;n.x+=vx;n.y+=vy+520*dt*dt;});
  for(let it=0;it<3;it++)for(let k=0;k<l.nodes.length-1;k++){const a=l.nodes[k],b=l.nodes[k+1];const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,diff=(d-STEP)/d*.5;a.x+=dx*diff;a.y+=dy*diff;b.x-=dx*diff;b.y-=dy*diff;}});
 G.loose=G.loose.filter(l=>l.life>0);}
function updParts(dt){G.parts.forEach(p=>{p.life-=dt;if(p.kind==='crumb'){p.vy+=400*dt;p.x+=p.vx*dt;p.y+=p.vy*dt}else if(p.kind==='txt'){p.y-=40*dt}else if(p.kind==='spark'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=60*dt}});G.parts=G.parts.filter(p=>p.life>0);
 G.pops.forEach(p=>p.t+=dt);G.pops=G.pops.filter(p=>p.t<1.4);G.dots.forEach(d=>d.t+=dt);}
function finish(won,why){G.done=true;G.won=won;G.why=why;G.grab=null;G.revealT=0;if(humGain)humGain.gain.value=0;
 if(won){G.mood='bliss';G.moodT=99;SFX.win();buzz([20,30,20,30,60],4);
  G.flakes.forEach(f=>{if(f.s<f.pts.length-1){f.p=f.pts.length-1;const save=G.combo;lastChain=null;detach(f,'auto');G.combo=save;}});
  for(let k=0;k<50;k++)G.parts.push({kind:'spark',x:rr(80,320),y:rr(300,720),vx:rr(-20,20),vy:rr(-60,-10),life:rr(1,2.2)});
 } else {G.mood='ouch';G.moodT=99;SFX.lose();}}
// ---------- drawing helpers ----------
function strip(f,a,b,col,stroke,alpha=1,lift=0){if(b-a<.01)return;const L=[],R=[];
 const idx=[a];for(let i=Math.floor(a)+1;i<b;i++)idx.push(i);idx.push(b);
 for(const i of idx){const q=P(f,i),k=f.pts[Math.min(f.pts.length-1,Math.round(i))];L.push([q.x+k.nx*k.wl*f.grow,q.y+k.ny*k.wl*f.grow]);R.push([q.x-k.nx*k.wr*f.grow,q.y-k.ny*k.wr*f.grow]);}
 ctx.globalAlpha=alpha;ctx.beginPath();L.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));for(let j=R.length-1;j>=0;j--)ctx.lineTo(R[j][0],R[j][1]);ctx.closePath();
 ctx.fillStyle=col;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.6;ctx.stroke();}ctx.globalAlpha=1;}
function ribbon(nodes,f,col,stroke){if(nodes.length<2)return;const L=[],R=[];
 for(let k=0;k<nodes.length;k++){const n=nodes[k],m=nodes[Math.min(nodes.length-1,k+1)],l=nodes[Math.max(0,k-1)];let dx=m.x-l.x,dy=m.y-l.y,d=Math.hypot(dx,dy)||1;const nx=-dy/d,ny=dx/d;const idx=clamp((f.s||0)+k,0,f.pts.length-1);const pt=f.pts[Math.round(clamp(n.i!=null?n.i:idx,0,f.pts.length-1))];const w=(pt.wl+pt.wr)/2*.92;L.push([n.x+nx*w,n.y+ny*w]);R.push([n.x-nx*w,n.y-ny*w]);}
 ctx.beginPath();L.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));for(let j=R.length-1;j>=0;j--)ctx.lineTo(R[j][0],R[j][1]);ctx.closePath();
 ctx.shadowColor='rgba(60,20,40,.35)';ctx.shadowBlur=8;ctx.shadowOffsetY=5;ctx.fillStyle=col;ctx.fill();ctx.shadowColor='transparent';ctx.strokeStyle=stroke;ctx.lineWidth=1.6;ctx.stroke();
 ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1.2;ctx.beginPath();nodes.forEach((n,j)=>j?ctx.lineTo(n.x,n.y-1):ctx.moveTo(n.x,n.y-1));ctx.stroke();}
function shade(hex,amt){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;r=clamp(r+amt,0,255);g=clamp(g+amt,0,255);b=clamp(b+amt,0,255);return `rgb(${r},${g},${b})`;}
function rrect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
// ---------- scene panel (his face) ----------
function drawScene(L,t,mood){const sc=L.scene;ctx.save();rrect(6,6,W-12,182,20);ctx.clip();
 const bg={book:['#ffd9a8','#e9a970'],laptop:['#3b4a6b','#28324a'],tv:['#5a4a8a','#2f2550'],toilet:['#cfeef0','#9fd2d6'],dream:['#b49be0','#6c55b0'],monster:['#2a2140','#120c22']}[sc];
 let gr=ctx.createLinearGradient(0,0,0,190);gr.addColorStop(0,bg[0]);gr.addColorStop(1,bg[1]);ctx.fillStyle=gr;ctx.fillRect(0,0,W,190);
 // room details
 if(sc==='book'){ctx.fillStyle='#fff3d6';rrect(28,24,70,80,6);ctx.fill();ctx.strokeStyle='#b07a4a';ctx.lineWidth=4;ctx.stroke();ctx.beginPath();ctx.moveTo(63,24);ctx.lineTo(63,104);ctx.moveTo(28,64);ctx.lineTo(98,64);ctx.stroke();
  ctx.fillStyle='#8a5a8a';rrect(300,90,80,100,20);ctx.fill();ctx.fillStyle='#ffe08a';ctx.beginPath();ctx.moveTo(330,20);ctx.lineTo(370,20);ctx.lineTo(382,60);ctx.lineTo(318,60);ctx.fill();ctx.fillStyle='#6b4a2a';ctx.fillRect(348,60,4,40);}
 if(sc==='laptop'){for(let i=0;i<6;i++){ctx.fillStyle=`rgba(255,255,255,${.05+.04*(i%2)})`;ctx.fillRect(20+i*60,20,40,40)}ctx.fillStyle='#ffcf5a';ctx.beginPath();ctx.arc(350,40,6,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.font='700 11px Fredoka';ctx.fillText('DUE 9:00',318,70);}
 if(sc==='tv'){ctx.fillStyle='rgba(120,200,255,.25)';ctx.beginPath();ctx.moveTo(0,190);ctx.lineTo(120,0);ctx.lineTo(280,0);ctx.lineTo(400,190);ctx.fill();ctx.fillStyle='#ffb86b';ctx.beginPath();ctx.arc(55,45,18,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.font='700 11px Fredoka';ctx.fillText('MALLORCA ♥',20,90);}
 if(sc==='toilet'){ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=2;for(let x=0;x<W;x+=34){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,190);ctx.stroke()}for(let y=0;y<190;y+=34){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(350,70,22,28,0,0,7);ctx.fill();ctx.fillStyle='#ddd';ctx.beginPath();ctx.ellipse(350,70,8,28,0,0,7);ctx.fill();}
 if(sc==='dream'){ctx.fillStyle='rgba(255,255,255,.5)';[[60,40,26],[95,35,30],[330,50,24],[300,40,20]].forEach(([x,y,r])=>{ctx.beginPath();ctx.arc(x,y+Math.sin(t+x)*3,r,0,7);ctx.fill()});ctx.fillStyle='#fff';ctx.font='700 22px Luckiest';ctx.fillText('z z Z',300,110+Math.sin(t*2)*4);}
 if(sc==='monster'){ctx.fillStyle='#fffbe0';ctx.beginPath();ctx.arc(340,45,22,0,7);ctx.fill();ctx.fillStyle='#120c22';ctx.beginPath();ctx.arc(350,40,20,0,7);ctx.fill();ctx.fillStyle='#ffd36b';ctx.font='700 12px Fredoka';ctx.fillText('3:12 AM',30,40);ctx.fillStyle='#ffe08a';rrect(28,120,46,30,6);ctx.fill();ctx.fillStyle='#e8a33a';ctx.beginPath();ctx.moveTo(30,122);ctx.lineTo(72,122);ctx.lineTo(51,100);ctx.fill();}
 // face
 const fx=200,fy=112,bob=Math.sin(t*1.6)*2+(mood==='giggle'?Math.sin(t*40)*3:0)+(mood==='ouch'?-6:0);
 ctx.save();ctx.translate(fx,fy+bob);
 const skin=sc==='tv'?'#f2a080':'#f0b994';
 if(sc==='monster'){ctx.fillStyle='#ffe9c8';}
 // body/shirt
 ctx.fillStyle={book:'#5c8ad8',laptop:'#d05a5a',tv:'#ffcf5a',toilet:'#7ccf9a',dream:'#efe6ff',monster:'#5f5a9a'}[sc];rrect(-70,58,140,60,30);ctx.fill();
 ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,0,56,62,0,0,7);ctx.fill();ctx.strokeStyle='#3a2340';ctx.lineWidth=3;ctx.stroke();
 // ears
 ctx.beginPath();ctx.ellipse(-56,4,10,14,0,0,7);ctx.ellipse(56,4,10,14,0,0,7);ctx.fill();ctx.stroke();
 // stubble
 ctx.fillStyle='rgba(80,50,60,.18)';ctx.beginPath();ctx.ellipse(0,32,40,24,0,0,3.14);ctx.fill();
 // hair
 ctx.fillStyle='#4a2f2a';ctx.beginPath();ctx.moveTo(-56,-12);ctx.quadraticCurveTo(-60,-70,0,-66);ctx.quadraticCurveTo(60,-70,56,-12);ctx.quadraticCurveTo(40,-40,10,-38);ctx.quadraticCurveTo(-20,-50,-56,-12);ctx.fill();
 if(sc==='dream'){ctx.fillStyle='#6c55b0';ctx.beginPath();ctx.moveTo(-40,-50);ctx.lineTo(10,-110);ctx.lineTo(45,-45);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(10,-110,8,0,7);ctx.fill();}
 if(sc==='tv'){ctx.fillStyle='#ff6b5a';ctx.beginPath();ctx.ellipse(0,10,9,7,0,0,7);ctx.fill();ctx.fillStyle='#222';rrect(-44,-44,36,14,6);ctx.fill();rrect(8,-44,36,14,6);ctx.fill();ctx.fillRect(-8,-40,16,3);}
 // eyes
 const look=sc==='book'?{x:0,y:8}:sc==='toilet'?{x:-4,y:10}:sc==='laptop'?{x:0,y:4}:{x:3,y:-2};
 const closed=G&&G.face.blink<0;
 ctx.strokeStyle='#3a2340';ctx.lineWidth=3.5;ctx.lineCap='round';
 const eye=(x)=>{if(mood==='bliss'||mood==='giggle'||(mood==='content'&&Math.sin(t*2)>.3)){ctx.beginPath();ctx.arc(x,-6,9,3.4,6.0);ctx.stroke();return}
  if(mood==='wince'){ctx.beginPath();ctx.moveTo(x-9,-12);ctx.lineTo(x+6,-6);ctx.lineTo(x-9,0);ctx.stroke();return}
  if(closed&&mood!=='ouch'){ctx.beginPath();ctx.moveTo(x-9,-6);ctx.lineTo(x+9,-6);ctx.stroke();return}
  const r=mood==='ouch'?14:11;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x,-6,r,r*1.05,0,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#3a2340';ctx.beginPath();ctx.arc(x+look.x*(mood==='ouch'?0:1)*.6,-6+look.y*.5,mood==='ouch'?3:5.5,0,7);ctx.fill();};
 eye(-22);eye(22);
 // brows
 ctx.lineWidth=4;ctx.beginPath();const bb=mood==='wince'?6:mood==='ouch'?-12:mood==='focus'?3:0;ctx.moveTo(-34,-26-bb*(mood==='ouch'?1:0));ctx.lineTo(-12,-24+(mood==='wince'?bb:0)-(mood==='ouch'?10:0));ctx.moveTo(34,-26);ctx.lineTo(12,-24+(mood==='wince'?bb:0)-(mood==='ouch'?10:0));ctx.stroke();
 // mouth
 ctx.lineWidth=3.5;ctx.fillStyle='#7a2a3a';
 if(mood==='ouch'){ctx.beginPath();ctx.ellipse(0,30,15,19,0,0,7);ctx.fill();ctx.stroke();}
 else if(mood==='wince'){ctx.fillStyle='#fff';rrect(-16,22,32,12,4);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-16,28);ctx.lineTo(16,28);ctx.stroke();}
 else if(mood==='content'||mood==='bliss'){ctx.beginPath();ctx.arc(0,22,14,.3,2.84);ctx.stroke();}
 else if(mood==='giggle'){ctx.beginPath();ctx.arc(0,24,13,0,3.14);ctx.closePath();ctx.fill();ctx.stroke();}
 else {ctx.beginPath();ctx.moveTo(-10,30);ctx.quadraticCurveTo(0,26+(mood==='focus'?2:0),10,30);ctx.stroke();}
 if(mood==='bliss'){ctx.fillStyle='rgba(255,120,140,.4)';ctx.beginPath();ctx.ellipse(-34,14,9,6,0,0,7);ctx.ellipse(34,14,9,6,0,0,7);ctx.fill();}
 ctx.restore();
 // prop in front
 if(sc==='book'){ctx.save();ctx.translate(200,176);ctx.rotate(-.04);ctx.fillStyle='#c0392b';rrect(-80,-38,160,60,6);ctx.fill();ctx.strokeStyle='#3a2340';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#ffe08a';ctx.font='15px Luckiest';ctx.textAlign='center';ctx.fillText('WAR & PIECE',0,-6);ctx.font='700 9px Fredoka';ctx.fillText('VOL. 3',0,8);ctx.restore();}
 if(sc==='laptop'){ctx.fillStyle='#c9ced8';rrect(110,130,180,70,8);ctx.fill();ctx.strokeStyle='#3a2340';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(200,160,8,0,7);ctx.fill();ctx.fillStyle='rgba(140,220,255,.18)';ctx.fillRect(130,40,140,90);}
 if(sc==='tv'){ctx.fillStyle='rgba(140,200,255,.15)';ctx.fillRect(0,0,W,190);ctx.fillStyle='#3a2340';rrect(150,150,100,40,12);ctx.fill();ctx.fillStyle='#bff3e6';ctx.fillRect(160,158,10,10);}
 if(sc==='toilet'){ctx.save();ctx.translate(200,170);ctx.rotate(.1);ctx.fillStyle='#222';rrect(-26,-40,52,82,10);ctx.fill();ctx.fillStyle='#7fd0ff';rrect(-21,-34,42,66,6);ctx.fill();ctx.fillStyle='#fff';for(let i=0;i<4;i++)ctx.fillRect(-16,-28+i*15-((t*30)%15),32,8);ctx.restore();ctx.fillStyle='#f0b994';ctx.beginPath();ctx.ellipse(185,190,18,14,0,0,7);ctx.fill();}
 if(sc==='monster'){ctx.fillStyle='rgba(255,240,180,.15)';ctx.beginPath();ctx.arc(200,110,90,0,7);ctx.fill();}
 ctx.restore();
 // thought/mood bubble
 if(mood==='content'){ctx.fillStyle='#fff';ctx.font='18px Fredoka';ctx.fillText('♪',270+Math.sin(t*3)*6,70-((t*30)%30));ctx.fillText('mmm…',262,96);}
 ctx.strokeStyle='#3a2340';ctx.lineWidth=3;rrect(6,6,W-12,182,20);ctx.stroke();}
// ---------- foot ----------
function drawFoot(){const L=G.L,o=G.footOff;ctx.save();ctx.translate(o.x,o.y);
 // floor/couch
 ctx.restore();
 ctx.save();ctx.beginPath();ctx.rect(0,FOOT_TOP-30,W,H);ctx.clip();
 const floor={book:'#8a5a8a',laptop:'#5a6a8a',tv:'#4b3a70',toilet:'#e8f4f2',dream:'#4a3a7a',monster:'#1c1430'}[L.scene];ctx.fillStyle=floor;ctx.fillRect(0,FOOT_TOP-30,W,H);
 ctx.fillStyle='rgba(255,255,255,.06)';for(let y=FOOT_TOP;y<H;y+=28)for(let x=(y/28%2)*14;x<W;x+=28)ctx.fillRect(x,y,14,14);
 ctx.translate(o.x,o.y);
 // shadow
 ctx.save();ctx.translate(8,12);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fill(G.path);ctx.restore();
 const gr=ctx.createRadialGradient(170,420,40,200,520,330);gr.addColorStop(0,shade(L.skin,25));gr.addColorStop(1,shade(L.skin,-25));ctx.fillStyle=gr;ctx.fill(G.path);ctx.strokeStyle='#3a2340';ctx.lineWidth=4;ctx.stroke(G.path);
 // toenails / foot details
 ctx.fillStyle='rgba(255,255,255,.35)';
 if(L.foot==='toes'){[[85,395,16],[150,335,20],[222,320,24],[292,352,19],[345,415,14]].forEach(([x,y,r])=>{ctx.beginPath();ctx.ellipse(x,y,r,r*.8,0,0,7);ctx.fillStyle='#ffe6e0';ctx.fill();ctx.strokeStyle='#3a2340';ctx.lineWidth=2;ctx.stroke();});}
 if(L.foot==='elephant'){[[80,640],[140,700],[260,700],[320,640]].forEach(([x,y])=>{ctx.beginPath();ctx.ellipse(x,y,26,18,0,0,7);ctx.fillStyle='#efe7d6';ctx.fill();ctx.strokeStyle='#3a2340';ctx.lineWidth=2.5;ctx.stroke();});ctx.strokeStyle='rgba(60,60,80,.25)';ctx.lineWidth=2;for(let k=0;k<14;k++){ctx.beginPath();const a=k/14*6.28;ctx.moveTo(200+Math.cos(a)*60,510+Math.sin(a)*60);ctx.lineTo(200+Math.cos(a)*165,510+Math.sin(a)*190);ctx.stroke();}}
 if(L.foot==='monster'){[[105,290],[200,248],[295,290]].forEach(([x,y])=>{ctx.fillStyle='#fff6d8';ctx.beginPath();ctx.moveTo(x-14,y+8);ctx.lineTo(x,y-28);ctx.lineTo(x+14,y+8);ctx.closePath();ctx.fill();ctx.strokeStyle='#3a2340';ctx.lineWidth=2.5;ctx.stroke();});ctx.fillStyle='rgba(40,90,40,.3)';for(let k=0;k<20;k++){ctx.beginPath();ctx.arc(90+(k*53)%230,360+(k*97)%360,4+(k%3)*3,0,7);ctx.fill();}}
 if(L.foot==='shin'){ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(110,700);ctx.lineTo(120,600);ctx.stroke();}
 // red dots (comic band-aids)
 G.dots.forEach(d=>{const s=Math.min(1,d.t*4);ctx.fillStyle='#e8344a';ctx.beginPath();ctx.arc(d.x,d.y,5*s,0,7);ctx.fill();if(d.t>1.2){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(.5);ctx.fillStyle='#f5c48f';rrect(-18,-7,36,14,6);ctx.fill();ctx.fillStyle='#e8b07a';ctx.fillRect(-6,-7,12,14);ctx.strokeStyle='#3a2340';ctx.lineWidth=1.5;rrect(-18,-7,36,14,6);ctx.stroke();ctx.restore();}});
 ctx.translate(-o.x,-o.y);
 // fresh patches & flakes
 G.flakes.forEach(f=>{strip(f,0,f.pts.length-1,L.fresh,null,.9);});
 G.flakes.forEach(f=>{const n=f.pts.length-1;const st=G.grab&&G.grab.f===f?f.p:f.s;if(st<n){
   strip(f,st,n,f.mega?'#ffe9a8':L.dry,'rgba(110,80,60,.55)',f.grow);
   // cracks & texture
   ctx.strokeStyle='rgba(140,110,80,.35)';ctx.lineWidth=1;for(let i=Math.ceil(st);i<n;i+=2){const q=P(f,i),k=f.pts[i];if(k.crack>.55){ctx.beginPath();ctx.moveTo(q.x+k.nx*k.wl*.7,q.y+k.ny*k.wl*.7);ctx.lineTo(q.x-k.nx*k.wr*.3*k.crack,q.y-k.ny*k.wr*.3*k.crack);ctx.stroke();}
    if(k.sticky){ctx.fillStyle='rgba(150,170,60,.35)';ctx.beginPath();ctx.arc(q.x,q.y,(k.wl+k.wr)*.35,0,7);ctx.fill();}}
   if(f.mega){ctx.strokeStyle=`rgba(255,200,40,${.5+.4*Math.sin(G.t*6)})`;ctx.lineWidth=2.5;strip(f,st,n,'rgba(0,0,0,0)',null);ctx.save();ctx.setLineDash([5,4]);const q=P(f,st);ctx.beginPath();ctx.arc(q.x,q.y,10,0,7);ctx.stroke();ctx.restore();}
   if(f.item&&!f.item.got&&f.item.i>st){const q=P(f,f.item.i);ctx.fillStyle='rgba(120,90,60,.25)';ctx.beginPath();ctx.ellipse(q.x,q.y,7,5,0,0,7);ctx.fill();}
   if(has('mag')||(G.grab&&G.grab.f===f&&f.p>n-f.deepZone-3)){const a=Math.max(st,n-f.deepZone);ctx.save();ctx.setLineDash([4,3]);strip(f,a,n,'rgba(255,90,110,.18)','rgba(230,60,90,.85)');ctx.restore();}
   // lifted tip
   if(f.tip&&!(G.grab&&G.grab.f===f)){const q=P(f,f.s),k=f.pts[Math.floor(f.s)];const pulse=1+.15*Math.sin(G.t*5+f.s);
    ctx.save();ctx.translate(q.x,q.y);ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=6;ctx.shadowOffsetY=3;ctx.fillStyle=shade(L.dry.startsWith('#')?L.dry:'#ffffff',18);const w=Math.max(6,(k.wl+k.wr)/2);ctx.beginPath();ctx.ellipse(0,-3,w*.9,w*.55,Math.atan2(k.ny,k.nx),0,7);ctx.fill();ctx.restore();
    ctx.strokeStyle=`rgba(255,255,255,${.55+.35*Math.sin(G.t*5)})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x,q.y,14*pulse+(f.reveal?f.reveal*14:0),0,7);ctx.stroke();}}});
 // calluses
 G.calluses.forEach(c=>{if(c.done)return;const x=c.x+G.footOff.x,y=c.y+G.footOff.y;const g=ctx.createRadialGradient(x-8,y-8,4,x,y,c.r);g.addColorStop(0,'#fff0b8');g.addColorStop(1,'#d8b46a');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,c.r,0,7);ctx.fill();ctx.strokeStyle='#8a6a3a';ctx.lineWidth=3;ctx.stroke();
  ctx.strokeStyle='rgba(120,80,40,.45)';ctx.lineWidth=1.5;for(let k=0;k<6;k++){const a=k*1.1;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*6,y+Math.sin(a)*6);ctx.lineTo(x+Math.cos(a+.3)*c.r*.85,y+Math.sin(a+.3)*c.r*.85);ctx.stroke();}
  ctx.strokeStyle='#7dffb0';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,c.r+6,-1.57,-1.57+6.283*c.prog);ctx.stroke();
  ctx.fillStyle='#3a2340';ctx.font='15px Luckiest';ctx.textAlign='center';ctx.fillText(has('pum')?'PUMICE!':'SCRUB!',x,y+5);ctx.textAlign='left';});
 // tickle zones hint
 G.tickZones.forEach(z=>{ctx.strokeStyle=`rgba(255,160,220,${.25+G.tickle*.6})`;ctx.lineWidth=2;ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(z.x+G.footOff.x,z.y+G.footOff.y,z.r,0,7);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(255,160,220,.7)';ctx.font='11px Fredoka';ctx.fillText('ticklish',z.x-18+G.footOff.x,z.y+4+G.footOff.y);});
 // soak glisten
 if(G.soakT>0){ctx.save();ctx.globalAlpha=.25*Math.min(1,G.soakT);ctx.fillStyle='#9fe8ff';ctx.translate(G.footOff.x,G.footOff.y);ctx.fill(G.path);ctx.restore();}
 // loose strips
 G.loose.forEach(l=>{ctx.globalAlpha=clamp(l.life,0,1);ribbon(l.nodes,l.f,shade(L.dry,14),'rgba(110,80,60,.7)');ctx.globalAlpha=1;});
 // grabbed strip
 if(G.grab){const g=G.grab;ribbon(g.nodes.map((n,k)=>({...n,i:g.f.s+k})),g.f,shade(L.dry,14),'rgba(110,80,60,.8)');}
 // items popping
 G.pops.forEach(p=>{const y=p.y-p.t*50,s=1+Math.sin(Math.min(1,p.t*3)*3.14)*.4;ctx.save();ctx.translate(p.x,y);ctx.scale(s,s);ctx.globalAlpha=clamp(1.4-p.t,0,1);drawItem(p.type);ctx.restore();});
 // particles
 G.parts.forEach(p=>{ctx.globalAlpha=clamp(p.life*1.5,0,1);if(p.kind==='crumb'){ctx.fillStyle=L.dry;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();}
  else if(p.kind==='txt'){ctx.font='20px Luckiest';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#3a2340';ctx.strokeText(p.t,clamp(p.x,90,310),p.y);ctx.fillStyle=p.c;ctx.fillText(p.t,clamp(p.x,90,310),p.y);ctx.textAlign='left';}
  else if(p.kind==='ouch'){const s=1+.3*Math.sin((1.1-p.life)*12);ctx.save();ctx.translate(clamp(p.x,90,310),p.y);ctx.scale(s,s);ctx.fillStyle='#fff';star(0,0,46,30,12);ctx.fill();ctx.strokeStyle='#3a2340';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#e8344a';ctx.font='26px Luckiest';ctx.textAlign='center';ctx.fillText('OUCH!',0,9);ctx.restore();ctx.textAlign='left';}
  else if(p.kind==='spark'){ctx.fillStyle='#fff';star(p.x,p.y,6,2,4);ctx.fill();}ctx.globalAlpha=1;});
 ctx.restore();}
function star(x,y,R,r,n){ctx.beginPath();for(let i=0;i<n*2;i++){const a=i/(n*2)*6.283-1.57,rad=i%2?r:R;ctx.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);}ctx.closePath();}
function drawItem(type){ctx.strokeStyle='#3a2340';ctx.lineWidth=2;
 if(type==='coin'){ctx.fillStyle='#ffd36b';ctx.beginPath();ctx.arc(0,0,12,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#c98a1a';ctx.font='14px Luckiest';ctx.textAlign='center';ctx.fillText('¢',0,6);}
 else if(type==='lint'){ctx.fillStyle='#8fb4ff';for(let k=0;k<7;k++){ctx.beginPath();ctx.arc(Math.cos(k)*7,Math.sin(k*2)*5,5,0,7);ctx.fill();}}
 else {ctx.fillStyle='#e0c080';for(let k=0;k<9;k++){ctx.beginPath();ctx.arc(Math.cos(k*2.4)*9,Math.sin(k*2.4)*6,2.2,0,7);ctx.fill();}}
 ctx.fillStyle='#fff';ctx.font='12px Luckiest';ctx.textAlign='center';ctx.lineWidth=3;const lbl={coin:'LOST COIN! +150',lint:'SOCK LINT +60',sand:'BEACH SAND +40'}[type];ctx.strokeText(lbl,0,-18);ctx.fillText(lbl,0,-18);ctx.textAlign='left';}
// ---------- HUD ----------
function drawHud(){const y=196;ctx.fillStyle='rgba(30,15,40,.75)';rrect(6,y-2,W-12,30,12);ctx.fill();
 const c=cleanPct();ctx.fillStyle='#ffffff22';rrect(14,y+6,150,14,7);ctx.fill();ctx.fillStyle=c>=G.L.target?'#7dffb0':'#ffb3a6';rrect(14,y+6,150*c,14,7);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(14+150*G.L.target,y+3,2,20);
 ctx.font='700 11px Fredoka';ctx.fillStyle='#fff';ctx.fillText('CLEAN '+Math.round(c*100)+'%',20,y+17);
 ctx.font='16px Luckiest';const tl=Math.max(0,Math.ceil(G.timeLeft));ctx.fillStyle=tl<=10?'#ff8a7a':'#fff';ctx.fillText('⏱'+tl,176,y+20);
 ctx.fillStyle='#ffd36b';ctx.fillText(G.score+'',230,y+20);
 if(G.combo>1){ctx.fillStyle='#7dffb0';ctx.fillText('x'+G.combo,300,y+20);}
 for(let i=0;i<3;i++){ctx.fillStyle=i<G.ouch?'#e8344a':'rgba(255,255,255,.25)';ctx.beginPath();ctx.arc(348+i*15,y+13,5.5,0,7);ctx.fill();}
 // tension ring
 if(G.grab&&G.finger){const t=clamp(G.grab.tension||0,0,1.2);ctx.strokeStyle=t<.55?'#7dffb0':t<.85?'#ffd36b':'#ff5a6a';ctx.lineWidth=5;ctx.beginPath();ctx.arc(G.finger.x,G.finger.y,24,-1.57,-1.57+6.283*clamp(t,0,1));ctx.stroke();
  if(G.grab.snipT>=0){ctx.font='18px Luckiest';ctx.textAlign='center';ctx.fillStyle='#7dffb0';ctx.strokeStyle='#3a2340';ctx.lineWidth=4;ctx.strokeText('LET GO = SNIP!',G.finger.x,G.finger.y-34);ctx.fillText('LET GO = SNIP!',G.finger.x,G.finger.y-34);ctx.textAlign='left';}}
 // distraction
 const D=G.distract;if(D){const warn=D.phase==='warn';ctx.save();ctx.translate(W-80,150);const s=warn?1+.1*Math.sin(G.t*20):1.1;ctx.scale(s,s);ctx.fillStyle=warn?'#fff6ea':'#ffcf5a';rrect(-70,-24,140,48,14);ctx.fill();ctx.strokeStyle='#3a2340';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#3a2340';ctx.font='700 12px Fredoka';ctx.textAlign='center';
  const txt={phone:['📳 bzzz… boss calling','FREEZE! act natural'],cat:['🐈 the cat is watching','FREEZE! cat judges'],voice:['“Are you picking your','feet AGAIN?!” FREEZE!']}[D.kind];
  ctx.fillText(warn?(D.kind==='voice'?'👂 footsteps…':txt[0]):txt[0],0,-4);ctx.fillText(warn?'get ready to freeze':txt[1],0,13);ctx.restore();ctx.textAlign='left';
  if(!warn){ctx.fillStyle='rgba(40,80,160,.12)';ctx.fillRect(0,FOOT_TOP,W,H);}}
 if(G.banner){const b=G.banner,s=Math.min(1,b.t*5);ctx.save();ctx.translate(200,330);ctx.scale(s,s);ctx.rotate(-.05);ctx.fillStyle='#ffcf5a';rrect(-150,-30,300,60,18);ctx.fill();ctx.strokeStyle='#3a2340';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#3a2340';ctx.font='28px Luckiest';ctx.textAlign='center';ctx.fillText(b.txt,0,10);ctx.restore();ctx.textAlign='left';}
 if(G.slow>0){ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(0,0,W,H);}
 if(G.done&&G.won){ctx.save();ctx.globalAlpha=Math.min(1,G.revealT*2);ctx.fillStyle='#fff';ctx.font='38px Luckiest';ctx.textAlign='center';ctx.lineWidth=7;ctx.strokeStyle='#3a2340';ctx.strokeText('SILKY SMOOTH!',200,470);ctx.fillStyle='#ffb3c8';ctx.fillText('SILKY SMOOTH!',200,470);ctx.restore();ctx.textAlign='left';}
 if(G.t<4&&lvlIdx===0&&!G.grab){ctx.fillStyle='rgba(30,15,40,.7)';rrect(70,250,260,46,14);ctx.fill();ctx.fillStyle='#fff';ctx.font='700 14px Fredoka';ctx.textAlign='center';ctx.fillText('Grab a glowing flake edge & drag.',200,270);ctx.fillText('Too fast = rip. Release at the end = SNIP!',200,288);ctx.textAlign='left';}}
// ---------- main loop ----------
let last=performance.now(),manual=false;
function frame(ts){const dt=(ts-last)/1000;last=ts;
 if(state==='play'&&G&&!manual)update(dt);
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#2b1d3a';ctx.fillRect(0,0,cv.width,cv.height);
 if(G&&(state==='play'||state==='paused'||state==='result')){const sh=G.shake;ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*(offX+(sh?rr(-sh,sh)*scale*.4:0)),dpr*(offY+(sh?rr(-sh,sh)*scale*.4:0)));
  drawFoot();drawScene(G.L,G.t,G.mood);drawHud();}
 requestAnimationFrame(frame);}
// ---------- mascot (title) ----------
const mc=$('mascot'),mx=mc.getContext('2d');
function drawMascot(t){const c=mx;c.clearRect(0,0,320,300);c.save();c.translate(160,170);const sq=1+Math.sin(t*3)*.03;c.scale(1/sq,sq);c.rotate(Math.sin(t*1.3)*.05);
 // foot body (side view, grumpy)
 c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(0,110,120,14,0,0,7);c.fill();
 const g=c.createLinearGradient(0,-120,0,100);g.addColorStop(0,'#ffcfb0');g.addColorStop(1,'#e8946e');c.fillStyle=g;c.strokeStyle='#3a2340';c.lineWidth=6;
 c.beginPath();c.moveTo(-60,-120);c.bezierCurveTo(-40,-130,0,-130,10,-110);c.lineTo(20,20);c.bezierCurveTo(60,30,130,40,135,75);c.bezierCurveTo(138,100,110,105,80,104);c.lineTo(-80,104);c.bezierCurveTo(-120,104,-125,60,-95,30);c.lineTo(-75,-110);c.closePath();c.fill();c.stroke();
 // toes
 [[128,66,14],[108,58,12],[90,52,11]].forEach(([x,y,r],i)=>{c.beginPath();c.arc(x,y+Math.sin(t*6+i)*2,r,0,7);c.fill();c.stroke();});
 // flaky patches on heel
 c.fillStyle='#fbf1d6';c.strokeStyle='rgba(120,80,60,.7)';c.lineWidth=2;
 [[-88,60,22],[-60,85,16],[-20,90,18]].forEach(([x,y,r],i)=>{c.beginPath();for(let k=0;k<9;k++){const a=k/9*6.28,rad=r*(.8+.3*((k*7+i)%3)/2);c.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad*.6);}c.closePath();c.fill();c.stroke();});
 // peeling strip curling off, wiggling
 c.save();c.translate(-20,90);c.rotate(-.6+Math.sin(t*4)*.25);c.fillStyle='#fff6e0';c.strokeStyle='#3a2340';c.lineWidth=2.5;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-20,-30,-6,-58);c.lineTo(6,-56);c.quadraticCurveTo(-6,-30,14,0);c.closePath();c.fill();c.stroke();c.restore();
 // face
 const bl=(t%3.2)<.12;c.strokeStyle='#3a2340';c.lineWidth=5;c.lineCap='round';
 [-42,-8].forEach(x=>{if(bl){c.beginPath();c.moveTo(x-10,-40);c.lineTo(x+10,-40);c.stroke();}else{c.fillStyle='#fff';c.beginPath();c.ellipse(x,-40,13,15,0,0,7);c.fill();c.lineWidth=4;c.stroke();c.fillStyle='#3a2340';c.beginPath();c.arc(x+3+Math.sin(t)*2,-36,5,0,7);c.fill();}});
 c.lineWidth=6;c.beginPath();c.moveTo(-58,-66);c.lineTo(-30,-56);c.moveTo(8,-66);c.lineTo(-20,-56);c.stroke();
 c.lineWidth=5;c.beginPath();c.moveTo(-42,-4);c.quadraticCurveTo(-25,-14+Math.sin(t*2)*3,-8,-4);c.stroke();
 // stink lines
 c.strokeStyle='rgba(180,230,120,.8)';c.lineWidth=4;for(let k=0;k<3;k++){const ph=(t*.8+k/3)%1;c.globalAlpha=1-ph;c.beginPath();const x=-60+k*35,y=-140-ph*60;c.moveTo(x,y+30);c.bezierCurveTo(x-12,y+20,x+12,y+10,x,y);c.stroke();}c.globalAlpha=1;
 c.restore();}
// ---------- UI ----------
const screens=['title','select','intro','shop','pause','result'];
function show(id){screens.forEach(s=>$(s).classList.toggle('hidden',s!==id));$('hud').classList.toggle('hidden',!(id==='play'||id==='pause'));}
function goTitle(){state='title';show('title');}
function starsFor(i){return save.stars[i]||0}
function buildSelect(){const el=$('custList');el.innerHTML='';LEVELS.forEach((L,i)=>{const unlocked=i===0||starsFor(i-1)>0;const d=document.createElement('div');d.className='cust'+(unlocked?'':' locked');
  d.innerHTML=`<div class="t"><b>${i+1}. ${L.name}${L.boss?' 👹':''}</b><br>${'★'.repeat(starsFor(i))}${'☆'.repeat(3-starsFor(i))} · best ${save.best[i]||0}<br><small>${unlocked?L.blurb:'Earn a star on the previous scene'}</small></div>`;
  const b=document.createElement('button');b.textContent=unlocked?'Play':'🔒';b.disabled=!unlocked;b.onclick=()=>startIntro(i);d.appendChild(b);el.appendChild(d);});
 document.querySelectorAll('.starN').forEach(e=>e.textContent=totalStars());}
function buildTools(){const el=$('shopList');el.innerHTML='';const ts=totalStars();TOOLS.forEach(t=>{const d=document.createElement('div');d.className='item';const ok=ts>=t.need;d.innerHTML=`<div style="font-size:26px">${ok?t.icon:'🔒'}</div><div class="t"><b>${t.name}</b><br>${t.desc}</div><div><b>${ok?'✔':'⭐'+t.need}</b></div>`;el.appendChild(d);});document.querySelectorAll('.starN').forEach(e=>e.textContent=ts);}
let toolsReturn='title';
function openTools(from){toolsReturn=from;buildTools();state='shop';show('shop');}
function startIntro(i){lvlIdx=i;const L=LEVELS[i];$('introTxt').innerHTML=`<h2>${L.name}</h2><p>${L.blurb}</p><p><b>Goal:</b> ${Math.round(L.target*100)}% clean in ${L.time}s · 3 OUCHes and he stops.</p>${L.distract?'<p>⚠️ Interruptions: when it says FREEZE, keep your hand still!</p>':''}`;state='intro';show('intro');}
function startLevel(i){audio();newGame(i);state='play';show('play');$('soakN').textContent=G.soaks;$('soakBtn').classList.toggle('hidden',G.soaks<=0);placeHud();}
function endLevel(won){state='result';const L=G.L,c=cleanPct();
 let stars=0;if(won){stars=1;if(G.ouch===0||c>=.95)stars=2;if(G.ouch===0&&G.timeLeft>L.time*.25)stars=3;}
 const before=totalStars();if(stars>starsFor(lvlIdx))save.stars[lvlIdx]=stars;if(G.score>(save.best[lvlIdx]||0))save.best[lvlIdx]=G.score;persist();
 const newTools=TOOLS.filter(t=>before<t.need&&totalStars()>=t.need);
 $('resTitle').textContent=won?'Scene cleared!':(G.why||'Nope');
 const it=G.items;$('resBody').innerHTML=`<div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div>Score <b>${G.score}</b> · Clean <b>${Math.round(c*100)}%</b><br>Longest strip <b>${G.longest.toFixed(1)} cm</b> · Best combo <b>x${G.maxCombo}</b><br>Perfect snips <b>${G.perfects}</b> · Ouches <b>${G.ouch}</b><br>Finds: ${it.coin}🪙 ${it.lint} lint ${it.sand} sand ${it.mega?'· MEGA SHEET!':''}${newTools.length?'<br><b>New tool unlocked: '+newTools.map(t=>t.icon+' '+t.name).join(', ')+'</b>':''}`;
 const nextOk=lvlIdx<LEVELS.length-1&&(starsFor(lvlIdx)>0);$('resNext').disabled=!nextOk;$('resNext').textContent=lvlIdx<LEVELS.length-1?'Next scene →':'All scenes done!';
 if(G.longestPts&&G.longest>=6){const url=shareCard();$('shareImg').src=url;$('shareDl').href=url;$('shareImg').classList.remove('hidden');$('shareDl').classList.remove('hidden');}else{$('shareImg').classList.add('hidden');$('shareDl').classList.add('hidden');}
 show('result');}
function shareCard(){const c=document.createElement('canvas');c.width=600;c.height=800;const x=c.getContext('2d');
 const g=x.createLinearGradient(0,0,0,800);g.addColorStop(0,'#5b3a78');g.addColorStop(1,'#2b1d3a');x.fillStyle=g;x.fillRect(0,0,600,800);
 x.fillStyle='rgba(255,255,255,.05)';for(let i=0;i<20;i++){x.beginPath();x.arc((i*137)%600,(i*251)%800,30+(i%4)*20,0,7);x.fill();}
 x.textAlign='center';x.font='64px Luckiest';x.lineWidth=10;x.strokeStyle='#3a2340';x.strokeText('I PEELED A',300,110);x.fillStyle='#ffd36b';x.fillText('I PEELED A',300,110);
 const cm=Math.round(G.longest)+' cm FLAKE!';x.font='72px Luckiest';x.strokeText(cm,300,195);x.fillStyle='#ff8a7a';x.fillText(cm,300,195);
 // tweezers + hanging strip
 const {f,a,b}=G.longestPts;const n=b-a;const segs=[];let px=300,py=260;for(let i=0;i<=n;i++){segs.push([px+Math.sin(i*.25)*18,py]);py+=Math.min(STEP*1.25,420/Math.max(1,n));}
 x.fillStyle='#c9ced8';x.strokeStyle='#3a2340';x.lineWidth=4;x.beginPath();x.moveTo(280,215);x.lineTo(296,268);x.lineTo(304,268);x.lineTo(320,215);x.closePath();x.fill();x.stroke();
 x.beginPath();segs.forEach(([sx,sy],i)=>{const p=f.pts[a+i];const w=(p.wl+p.wr)*.9;x.lineTo(sx-w,sy)});for(let i=segs.length-1;i>=0;i--){const p=f.pts[a+i];const w=(p.wl+p.wr)*.9;x.lineTo(segs[i][0]+w,segs[i][1])}x.closePath();x.fillStyle=G.L.dry;x.fill();x.lineWidth=3;x.strokeStyle='rgba(110,80,60,.9)';x.stroke();
 x.font='34px Luckiest';x.fillStyle='#bff3e6';x.strokeStyle='#3a2340';x.lineWidth=6;x.strokeText(G.L.name.toUpperCase(),300,730);x.fillText(G.L.name.toUpperCase(),300,730);
 x.font='700 22px Fredoka';x.fillStyle='#fff';x.fillText('HEELARIOUS · Nasty World · 18+',300,770);
 return c.toDataURL('image/png');}
$('playBtn').onclick=()=>{audio();buildSelect();state='select';show('select');};
$('shopBtn1').onclick=()=>openTools('title');$('shopBtn2').onclick=()=>openTools('select');
$('shopDone').onclick=()=>{if(toolsReturn==='select'){buildSelect();state='select';show('select')}else goTitle();};
$('selBack').onclick=goTitle;$('introGo').onclick=()=>startLevel(lvlIdx);
$('pauseBtn').onclick=()=>{if(state!=='play'||G.done)return;state='paused';if(humGain)humGain.gain.value=0;show('pause');$('hud').classList.remove('hidden');};
$('resume').onclick=()=>{state='play';show('play');last=performance.now();};
$('restart').onclick=()=>startLevel(lvlIdx);$('quit').onclick=()=>{buildSelect();state='select';show('select');};
$('resRetry').onclick=()=>startLevel(lvlIdx);$('resNext').onclick=()=>startIntro(Math.min(LEVELS.length-1,lvlIdx+1));
$('soakBtn').onclick=()=>{if(state!=='play'||!G||G.soaks<=0)return;G.soaks--;G.soakT=7;SFX.squish();floatTxt('Soaked! Soft & stretchy','#9fe8ff');$('soakN').textContent=G.soaks;if(G.soaks<=0)$('soakBtn').classList.add('hidden');};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')$('pauseBtn').onclick();});
(function titleLoop(){const t=performance.now()/1000;if(state==='title')drawMascot(t);requestAnimationFrame(titleLoop);})();
resize();requestAnimationFrame(frame);
if(document.fonts&&document.fonts.load){document.fonts.load('20px Luckiest');document.fonts.load('700 12px Fredoka');}
// test hook (no analytics; used only by automated tests)
window.__peel={resetSave(){save={stars:{},best:{}};persist()},count(){return G.flakes.length},get G(){return G},get state(){return state},LEVELS,startLevel,tips(){if(!G)return[];return G.flakes.filter(f=>f.tip&&f.s<f.pts.length-1).map(f=>{const path=[];for(let i=f.s;i<f.pts.length;i++){const q=P(f,i);path.push([offX+q.x*scale,offY+q.y*scale]);}return path;});},
 bot(speedU,react=0,caution=1){if(!G||G.done||G.grab)return 'busy';const c=G.calluses.find(c=>!c.done);const tips=G.flakes.filter(f=>f.tip&&f.s<f.pts.length-1);if(c&&!tips.length){c.prog=1;c.done=true;callusToFlake(c);return 'callus'}if(c){c.prog+=.35;if(c.prog>=1){c.done=true;callusToFlake(c)}}const f=tips[0];if(!f)return 'none';const q=P(f,f.s),q2=P(f,Math.min(f.pts.length-1,f.s+3));let dx=q.x-q2.x,dy=q.y-q2.y,d=Math.hypot(dx,dy)||1;dx/=d;dy/=d;G.finger={x:q.x,y:q.y,px:q.x,py:q.y,vx:0,vy:0};tryGrab();if(!G.grab)return 'miss';const g=G.grab;return {go(dt){if(G.grab!==g)return false;if(g.snipT>=0){if(this.rt==null)this.rt=react;this.rt-=dt;if(this.rt<=0){release(true);G.finger=null;return false}}const n=f.pts.length-1;const ti=f.s+2*(f.p-f.s)+3+(g.snipT>=0?40:0);const T=P(f,Math.min(n,ti));if(ti>n){const B=P(f,n-2);const ux=T.x-B.x,uy=T.y-B.y,ul=Math.hypot(ux,uy)||1;T.x+=ux/ul*(ti-n)*STEP;T.y+=uy/ul*(ti-n)*STEP;}let ex=T.x-G.finger.x,ey=T.y-G.finger.y,el=Math.hypot(ex,ey)||1;const slow=g.snipT>=0?(caution<.4?0:caution):(f.p>n-f.deepZone?caution:1);const st=Math.min(el,speedU*slow*dt);G.finger.x+=ex/el*st;G.finger.y+=ey/el*st;return true}}},
 manual(v){manual=v},step(dt){update(dt)},
 calluses(){return G?G.calluses.filter(c=>!c.done).map(c=>[offX+c.x*scale,offY+c.y*scale,c.r*scale]):[]},clean:()=>G?cleanPct():0,toScreen:(x,y)=>[offX+x*scale,offY+y*scale],scale:()=>scale};
})();
