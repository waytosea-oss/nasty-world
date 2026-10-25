/* Bladder Brawl v5 scene layer: first-person sneakers on the floor, flushometer hand, crushed ash can, props and side events.
   Pure presentation + small bonuses; disabled in SIMMODE so balance sims stay deterministic. */
'use strict';
const SCN=(function(){
  const R=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
  const LINES=[["#@$%!","AW SH*T!","MY KICKS!!","NOT THE KICKS!"],
               ["BRAND NEW, BRO!","#@$%&!!","ARE YOU KIDDING ME?!","UGH. SOGGY."],
               ["$#!%@&*!!!","THESE WERE LIMITED!","*BLEEEEP*!!","I HATE EVERYTHING!"]];
  const DOOR=["HURRY UP!","YOU DIED IN THERE?!","OTHER PEOPLE GOTTA GO!","BRO. COME ON."];
  let S;
  function reset(){S={t:0,ev:null,feet:[{side:-1,wet:0,jerk:9},{side:1,wet:0,jerk:9}],kicks:0,kickCD:0,hopCD:0,bub:null,kickShow:0,
    puddles:[],rip:[],streaks:[],ripT:0,phone:{t:R(14,22),buzz:0,dead:0,shake:0},can:{st:0,hit:0,x:0,y:0,vx:0,vy:0,r:0},
    target:{t:R(9,15),on:0,hit:0},door:{t:R(24,38),fx:0},pipe:{shake:0,glug:0,lastQ:null,lever:0},cache:{}};}
  reset();
  const U=()=>L.U;
  // ---------- geometry ----------
  // sneakers stand on the floor in the bottom corners (toes toward the urinal, jeans hems running off-screen)
  function footGeo(f){const x=W/2+f.side*W*.19,lp=Math.max(lipAt(x),L.lipY-PL.s*60);const w=clamp(W*.23,76,104),im=SPR.I[f.side<0?'toeL5':'toeR5'],h=w*((im&&im.naturalWidth)?im.naturalHeight/im.naturalWidth:.6);
    // v5d: only the toe caps peek out, ~30% of the cap tucked under the urinal's front lip; the rest runs off the bottom edge
    return {x,base:lp+w*.42,h,w,lip:lp};}
  function pipeGeo(){const s=PL.s;return {x:px(400),bot:py(300),h:150*s,w:200*s,top:py(215),lx:px(461),ly:py(296)};}
  function phonePos(){return {x:px(214),y:py(436),h:Math.max(34,112*PL.s)};}
  function canHome(){return {x:px(520),y:py(448),h:Math.max(52,168*PL.s)};}
  function sfx(k){if(typeof AU==='undefined'||!AU.ctx||AU.ctx.state!=='running'||!S)return;try{
    if(k==='bleep')tone('sine',1050,1040,.38,.16);
    else if(k==='splat'){nz(.2,.3,900,250,1.2);}
    else if(k==='knock'){[0,140,260].forEach(d=>setTimeout(()=>{nz(.09,.55,260,110,1.5);tone('sine',90,60,.09,.3);},d));}
    else if(k==='buzz'){tone('square',140,130,.25,.05);setTimeout(()=>tone('square',140,130,.25,.05),330);}
    else if(k==='glug'){nz(.9,.28,320,70,4);tone('sine',110,55,.6,.12);}
    else if(k==='clank'){tone('triangle',900,500,.12,.2);nz(.15,.2,3000,1200,3);}
    else if(k==='ding'){tone('sine',880,1760,.18,.2);setTimeout(()=>tone('sine',1320,1760,.2,.18),90);}
    else if(k==='thump'){tone('sine',120,50,.16,.35);}
  }catch(e){}}
  function ev(k){if(!S)return;if(S.ev&&(S.ev.k==='win'||S.ev.k==='lose')&&k!=='win'&&k!=='lose')return;
    if(k==='flush'){S.pipe.shake=.5;S.pipe.lever=.6;return;}
    if(k==='stomp')sfx('thump');
    S.ev={k,t:0};}
  // ---------- impacts ----------
  function near(x,y,p,r){return (x-p.x)**2+(y-p.y)**2<r*r;}
  function impact(d){if(!S||G.state!=='play')return false;const x=d.x,y=d.y,u=U();
    // phone on top of the urinal
    const ph=phonePos();if(!S.phone.dead&&near(x,y,{x:ph.x,y:ph.y},ph.h*.55)){
      if(S.phone.buzz>0){S.phone.buzz=0;S.phone.dead=1;G.earned+=4;pop(ph.x,ph.y-40,'DECLINED! +4','#7dffb0',18,1);sfx('ding');}
      else{S.phone.shake=.2;}burst(x,y,3,'#ffe56b',120);return true;}
    // beer can on the rim
    const ch=canHome();if(!G.canFx&&Math.abs(x-ch.x)<ch.h*.3&&y<ch.y&&y>ch.y-ch.h){S.can.hit=.35;burst(x,y,2,'#ffe56b',100);if(Math.random()<.05)sfx('clank');return true;}
    // fly-target sticker (does not consume: the stream still hits bugs)
    const tg=S.target;if(tg.on>0&&near(x,y,tg,20)){tg.hit+=1;if(tg.hit>=10){tg.on=0;G.earned+=6;pop(tg.x,tg.y-30,'BULLSEYE! +6','#ffd23a',20,1.1);sfx('ding');burst(tg.x,tg.y,14,'#ffd23a',220);}}
    // sneakers
    for(const f of S.feet){const g=footGeo(f);if(Math.abs(x-g.x)<g.w*.62&&y>g.base-g.h*1.02&&y>lipAt(x)){const sx=g.x+(Math.random()-.5)*g.w*.4,sy=g.base-g.h*(.72+Math.random()*.22);
      for(let i=0;i<3;i++)G.parts.push({k:'drop',x,y,vx:(sx-x)/.35+(Math.random()-.5)*40,vy:(sy-y)/.35-140,t:0,life:.35,r:2.2,col:'#ffe56b'});burst(x,y,3,'#ffe56b',90);
      if(!S.pend)S.pend={f,t:.3,x:sx,y:sy};return true;}}
    // inside the urinal or on the rim: normal gameplay
    if(y<L.rimY-16&&y>u.y-6&&x>u.x+u.w*.08&&x<u.x+u.w*.92)return false;
    if(y>=L.rimY-16&&y<=L.bowlBot+8&&x>wallL(y)-8&&x<wallR(y)+8)return false;
    // a miss: wall or floor
    burst(x,y,3,'#ffe56b',110);if(S.puddles.length>40)S.puddles.shift();S.puddles.push({x:x+R(-4,4),y,r:R(5,11),a:.0,floor:y>u.y+u.h*.9});
    if(y>u.y+u.h*.97&&S.hopCD<=0){S.hopCD=2.2;ev('hop');sfx('splat');pop(W/2,y-30,'SPLASHBACK!','#bff0ff',15,.8);}
    return true;}
  function kick(f,x,y){burst(x,y,4,'#ffe56b',140);if(S.kickCD>0)return;S.kickCD=1.3;S.kicks++;f.wet=Math.min(6,f.wet+1);f.jerk=0;
    const tier=Math.min(2,Math.floor((S.kicks-1)/2));S.bub={txt:pick(LINES[tier]),t:0,side:f.side,tier};
    const pen=Math.min(G.earned,2+tier*2);G.earned-=pen;pop(W/2,H-L.feet*1.9,'KICKS RUINED x'+S.kicks+(pen?'  -'+pen:''),'#ff8a5c',15,1.3);
    sfx('splat');sfx('bleep');if(typeof vib==='function')vib(30);}
  function splash(x,y,k){if(!S)return;
    if(Math.random()<.03&&S.streaks.length<22&&y<L.waterY-70){const v=L.drainX-x,len=L.waterY-y;S.streaks.push({x,y,dx:v/Math.max(1,len),len:0,max:len*(.5+Math.random()*.45),v:60+Math.random()*60,t:0,w:(1.5+Math.random()*2)*k});}}
  function onPipe(x,y){if(!S||G.state!=='play'||G.paused)return false;return x>px(285)&&x<px(520)&&y>py(205)&&y<py(345);}
  function onCan(x,y){if(!S||G.state!=='play'||G.paused)return false;const h=canHome();return Math.abs(x-h.x)<Math.max(30,h.h*.42)&&y<h.y+12&&y>h.y-h.h-16;}
  function aimJitter(dt){if(S&&S.phone.buzz>0&&G.firing){G.aim.x+=Math.sin(S.t*37)*2.2;G.aim.y+=Math.cos(S.t*29)*1.4;}}
  // ---------- update ----------
  function update(dt){if(!S)return;S.t+=dt;if(S.pend){S.pend.t-=dt;if(S.pend.t<=0){kick(S.pend.f,S.pend.x,S.pend.y);S.pend=null;}}S.ripT-=dt;for(const r of S.rip)r.t+=dt;S.rip=S.rip.filter(r=>r.t<.5);for(const k of S.streaks){k.t+=dt;k.len=Math.min(k.max,k.len+dt*k.v);}S.streaks=S.streaks.filter(k=>k.t<3.2);if(S.ev)S.ev.t+=dt;S.kickCD-=dt;S.hopCD-=dt;S.kickShow-=dt;
    for(const f of S.feet)f.jerk+=dt;if(S.bub){S.bub.t+=dt;if(S.bub.t>1.9)S.bub=null;}
    if(S.ev&&S.ev.k!=='win'&&S.ev.k!=='lose'&&S.ev.t>1)S.ev=null;
    for(const p of S.puddles)p.a=Math.min(.55,p.a+dt*2);
    const ph=S.phone;ph.shake-=dt;if(!ph.dead){ph.t-=dt;if(ph.t<=0&&ph.buzz<=0){ph.buzz=4;ph.t=R(22,34);pop(phonePos().x,phonePos().y-50,'BZZT BZZT','#9fe8ff',14,.9);}
      if(ph.buzz>0){ph.buzz-=dt;if(Math.floor((ph.buzz)*1.5)!==Math.floor((ph.buzz+dt)*1.5))sfx('buzz');}}else{ph.dead+=dt;if(ph.dead>14){ph.dead=0;ph.t=R(16,26);}}
    S.can.hit-=dt;
    const tg=S.target;if(tg.on>0){tg.on-=dt;}else{tg.t-=dt;if(tg.t<=0){tg.t=R(14,22);tg.on=7;tg.hit=0;const y=L.rimY+L.wallH*R(.45,.7);tg.y=y;tg.x=R(wallL(y)+30,wallR(y)-30);}}
    const dr=S.door;dr.fx-=dt;dr.t-=dt;if(dr.t<=0){dr.t=R(30,48);dr.fx=1.4;dr.txt=pick(DOOR);G.shake=Math.max(G.shake,.45);sfx('knock');if(!S.ev)ev('flinch');}
    // pipe gurgles right before a dense wave
    const P=S.pipe;P.shake-=dt;P.glug-=dt;P.lever-=dt;const q=G.queue;
    if(q&&q.length>=4&&q[0]!==P.lastQ){const lead=q[0].t-G.wt;if(lead>0&&lead<1.6&&q[3].t-q[0].t<1.8){P.lastQ=q[0];P.glug=1.6;P.shake=1.2;sfx('glug');const p=pipeGeo();pop(p.x,p.top-6,'gurgle...','#cfe9ff',13,1);}}
    if(P.glug>0&&Math.random()<dt*14)G.parts.push({k:'bub',x:L.drainX+R(-L.drainR,L.drainR),y:L.waterY,vx:R(-10,10),vy:R(-60,-25),t:0,life:.6,r:R(2,5),col:'rgba(220,240,255,.8)'});
  }
  // ---------- drawing ----------
  function drawBack(c){if(!S)return;
    for(const k of S.streaks){const a=Math.min(1,k.t*3)*Math.max(0,1-(k.t-2.2));if(a<=0)continue;c.globalAlpha=a*.22;c.strokeStyle='#e0bf45';c.lineWidth=k.w;c.lineCap='round';c.beginPath();c.moveTo(k.x,k.y);c.quadraticCurveTo(k.x+k.dx*k.len*.3,k.y+k.len*.5,k.x+k.dx*k.len*.9,k.y+k.len);c.stroke();c.globalAlpha=a*.5;c.fillStyle='#e8c94a';c.beginPath();c.arc(k.x+k.dx*k.len*.9,k.y+k.len,k.w*.9,0,6.283);c.fill();}
    for(const p of S.puddles){c.globalAlpha=p.a;c.beginPath();c.ellipse(p.x,p.y,p.r*(p.floor?1.6:1),p.r*(p.floor?.55:.9),0,0,6.283);{const rx=p.r*(p.floor?1.6:1),g=c.createRadialGradient(p.x-rx*.3,p.y-rx*.15,0,p.x,p.y,rx);g.addColorStop(0,'rgba(255,250,215,.6)');g.addColorStop(.6,'rgba(235,200,80,.38)');g.addColorStop(1,'rgba(180,130,20,.12)');c.fillStyle=g;}c.fill();}c.globalAlpha=1;
    const tg=S.target;if(tg.on>0){const a=Math.min(1,tg.on,(7-tg.on)*3);c.save();c.globalAlpha=a*.95;c.translate(tg.x,tg.y);const s=1+Math.sin(S.t*6)*.06;c.scale(s,s);
      c.strokeStyle='#e8233f';c.lineWidth=3;for(const r of [18,11]){c.beginPath();c.arc(0,0,r,0,6.283);c.stroke();}c.fillStyle='#e8233f';c.beginPath();c.arc(0,0,4,0,6.283);c.fill();
      c.globalAlpha*=.85;SPR.img(c,'en-fly',0,0,22);c.restore();}
    const ph=phonePos();if(!S.phone.dead||S.phone.dead>0){c.save();const bz=S.phone.buzz>0,sh=bz?Math.sin(S.t*70)*2.2:(S.phone.shake>0?Math.sin(S.t*60)*1.5:0);c.translate(ph.x+sh,ph.y);c.rotate(.04+sh*.01);
      // lying flat on the urinal top: long axis left-right, foreshortened trapezoid (far edge narrower)
      const Lw=ph.h*1.05,Dp=ph.h*.3;c.globalAlpha=.45;c.fillStyle='#000';c.beginPath();c.ellipse(1,Dp*.1+2,Lw*.56,Dp*.62,0,0,6.283);c.fill();c.globalAlpha=1;
      if(bz){c.fillStyle='rgba(120,220,255,'+(.3+.25*Math.sin(S.t*20))+')';c.beginPath();c.ellipse(0,0,Lw*.66,Dp*1.1,0,0,6.283);c.fill();}
      const tz=phoneTrap();if(tz)c.drawImage(tz,-Lw/2,-Dp/2,Lw,Dp);
      c.fillStyle='rgba(20,20,24,.9)';c.beginPath();c.moveTo(-Lw*.5,Dp/2);c.lineTo(Lw*.5,Dp/2);c.lineTo(Lw*.5,Dp/2+2.2);c.lineTo(-Lw*.5,Dp/2+2.2);c.fill();
      if(bz){c.strokeStyle='#9fe8ff';c.lineWidth=2;for(const sd of [-1,1]){c.beginPath();c.ellipse(0,0,Lw*.62+3*Math.sin(S.t*20),Dp*1.2,0,sd<0?Math.PI*.85:-Math.PI*.15,sd<0?Math.PI*1.15:Math.PI*.15);c.stroke();}}
      c.restore();}
  }
  /* WebKit can report a decoded size before the pixels are ready: keep rebuilding the cached flat phone until it has real pixels */
  /* foreshortened trapezoid (far edge narrower) baked once into its own canvas; drawing 24 thin slices straight into the
     rotated scene canvas silently drew nothing in WebKit */
  let _tz=null;function phoneTrap(){if(_tz)return _tz;const pc=phoneFlat();if(!pc||!_pfOk)return null;const W2=pc.width,H2=Math.round(pc.width*.3),o=document.createElement('canvas');o.width=W2;o.height=H2;const x=o.getContext('2d'),n=24;
    for(let i=0;i<n;i++){const v=i/n,ww=W2*(.86+.14*v),sy0=pc.height*v,sh0=Math.min(pc.height/n+1,pc.height-sy0);x.drawImage(pc,0,sy0,pc.width,sh0,(W2-ww)/2,H2*v,ww,H2/n+.6);}return _tz=o;}
  let _pf=null,_pfOk=0;function phoneFlat(){if(_pf&&_pfOk)return _pf;if(!SPR.ok('phone'))return null;const im=SPR.I.phone,cv=_pf||document.createElement('canvas');cv.width=im.naturalHeight;cv.height=im.naturalWidth;const x=cv.getContext('2d');x.translate(cv.width,0);x.rotate(Math.PI/2);x.drawImage(im,0,0);x.setTransform(1,0,0,1,0,0);try{_pfOk=x.getImageData(cv.width>>1,cv.height>>1,1,1).data[3]>0?1:0;}catch(e){_pfOk=1;}return _pf=cv;}
  function shoeCanvas(f){const k=f.side+'|'+f.wet;if(S.cache[k])return S.cache[k];const nm=f.side<0?'toeL5':'toeR5',im=SPR.I[nm];if(!SPR.ok(nm))return null;
    const w=288,h=im.naturalHeight,cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d');
    x.drawImage(im,0,0,w,h);x.setTransform(1,0,0,1,0,0);
    if(f.wet>0){x.globalCompositeOperation='source-atop';let s=7+f.side*3;const rr=()=>{s=(s*16807)%2147483647;return s/2147483647;};
      for(let i=0;i<f.wet*3;i++){x.globalAlpha=.12+.035*f.wet;x.fillStyle=i%3?'#9a7c18':'#5e4a0c';x.beginPath();x.ellipse(w*(.25+rr()*.5),h*(.04+rr()*.36),12+rr()*16+f.wet*3,8+rr()*10+f.wet*2,rr()*3,0,6.283);x.fill();}
      x.globalAlpha=.25;x.fillStyle='#fff8c0';for(let i=0;i<f.wet*2;i++){x.beginPath();x.arc(w*(.3+rr()*.4),h*(.35+rr()*.45),2+rr()*2,0,6.283);x.fill();}}
    S.cache[k]=cv;return cv;}
  function footPose(f){const t=S.t,sd=f.side;let dx=0,dy=0,rot=-sd*.16,sc=1;const e=S.ev,cap=stats().cap,low=G.bladder<cap*.22;
    if(e&&e.k==='win'){dx=Math.sin(t*9+(sd>0?Math.PI:0))*7;dy=-Math.abs(Math.sin(t*9+(sd>0?Math.PI:0)))*10;rot+=Math.sin(t*9)*.08;}
    else if(e&&e.k==='lose'){const k=Math.min(1,e.t*3);dy=16*k;rot+=sd*.28*k;sc=1-.04*k;}
    else if(e&&e.k==='stomp'&&sd>0){const u=e.t;dy=u<.22?-26*(u/.22):u<.3?-26*(1-(u-.22)/.08):0;}
    else if(e&&e.k==='hop'){dy=14*Math.sin(Math.min(1,e.t/.45)*Math.PI);sc=1-.05*Math.sin(Math.min(1,e.t/.45)*Math.PI);}
    else if(e&&e.k==='flinch'&&e.t<.35){dy=-8*Math.sin(e.t/.35*Math.PI);}
    else if(low){dx=sd*10;dy=Math.sin(t*8+(sd>0?Math.PI:0))*5;rot=-sd*.24+Math.sin(t*8)*.05;}
    else if(G.combo>=5&&G.comboT>0){dy=-Math.abs(Math.sin(t*10+(sd>0?Math.PI/2:0)))*13;rot+=Math.sin(t*10+sd)*.1;}
    else if(G.danger){dy=-Math.abs(Math.sin(t*17+(sd>0?1:0)))*5;rot+=Math.sin(t*23)*.045;}
    else if(sd>0){const b=(t*2.1)%1;dy=b<.18?-6*Math.sin(b/.18*Math.PI):0;rot+=dy*.006;}
    if(f.jerk>=0&&f.jerk<.9){const k=1-f.jerk/.9;dy-=30*Math.sin(Math.min(1,f.jerk/.25)*Math.PI*.5)*k;dx+=Math.sin(f.jerk*48)*6*k;rot+=Math.sin(f.jerk*40)*.12*k;}
    return {dx,dy,rot,sc};}
  function drawFeet(c){for(const f of S.feet){const g=footGeo(f),p=footPose(f),cv=shoeCanvas(f);c.save();const k=g.w/300;c.translate(g.x+p.dx*k,g.base+p.dy*k);c.rotate(p.rot*.2);c.scale(p.sc,p.sc);
      c.globalAlpha=.4;c.fillStyle='#000';c.beginPath();c.ellipse(0,-2,g.w*.56,g.w*.09,0,0,6.283);c.fill();c.globalAlpha=1;
      if(cv)c.drawImage(cv,-g.w/2,-g.h,g.w,g.h);
      if(f.wet>0&&Math.random()<.02*f.wet)G.parts.push({k:'drop',x:g.x+p.dx+(Math.random()-.5)*g.w*.4,y:g.base-g.h*.8,vx:0,vy:40,t:0,life:.5,r:2,col:'#e8c94a'});
      c.restore();}}
  function bubble(c){const b=S.bub;if(!b)return;const g=footGeo(S.feet[b.side<0?0:1]);const s=b.t<.15?b.t/.15*1.1:b.t<.25?1.1-(b.t-.15):1;const x=clamp(g.x-b.side*W*.2,90,W-90),y=g.base-g.h*1.06;
    c.save();c.translate(x,y);c.scale(s,s);c.rotate(Math.sin(b.t*20)*.03*(b.tier+1));c.font=(16+b.tier*2)+'px '+FONT;const tw=c.measureText(b.txt).width+22,th=34+b.tier*2;
    c.fillStyle='#fff';c.strokeStyle='#111';c.lineWidth=3;c.beginPath();
    if(b.tier<2){const r=12;c.moveTo(-tw/2+r,-th/2);c.arcTo(tw/2,-th/2,tw/2,th/2,r);c.arcTo(tw/2,th/2,-tw/2,th/2,r);c.lineTo(b.side*10,th/2);c.lineTo(b.side*22,th/2+16);c.lineTo(-b.side*6,th/2);c.arcTo(-tw/2,th/2,-tw/2,-th/2,r);c.arcTo(-tw/2,-th/2,tw/2,-th/2,r);}
    else{const n=18;for(let i=0;i<=n;i++){const a=i/n*6.283,rr=i%2?1:1.18;c.lineTo(Math.cos(a)*tw*.58*rr,Math.sin(a)*th*.85*rr);}}
    c.closePath();c.fill();c.stroke();c.fillStyle=b.tier===2?'#e8233f':'#111';c.textAlign='center';c.textBaseline='middle';
    c.fillText(b.txt,0,1);c.restore();}
  // ---------- v5 hands + can ----------
  const ease=u=>u<0?0:u>1?1:u*u*(3-2*u);
  function drawCanAt(c,x,y,h,rot,ax,ay){c.save();c.translate(x,y);c.rotate(rot);SPR.img(c,'can5',0,0,h,ax==null?.5:ax,ay==null?1:ay);c.restore();}
  function drawCan(c){const hm=canHome(),F=G.canFx,T=CANT;
    if(!F){const wob=S.can.hit>0?Math.sin(S.t*55)*.05:0;c.save();c.globalAlpha=.3;c.fillStyle='#000';c.beginPath();c.ellipse(hm.x+4,hm.y-1,hm.h*.34,hm.h*.075,0,0,6.283);c.fill();c.globalAlpha=.55;c.beginPath();c.ellipse(hm.x+1,hm.y-2,hm.h*.22,hm.h*.04,0,0,6.283);c.fill();c.restore();
      drawCanAt(c,hm.x,hm.y,hm.h,.02+wob);
      if(G.callable){const a=.55+.45*Math.sin(S.t*7);c.save();c.globalAlpha=a;c.strokeStyle='#ffd23a';c.lineWidth=3;c.beginPath();c.ellipse(hm.x,hm.y-hm.h*.5,hm.h*.42,hm.h*.62,0,0,6.283);c.stroke();c.restore();
        c.save();c.font='15px '+FONT;c.textAlign='center';c.lineWidth=5;c.lineJoin='round';c.strokeStyle='#111';c.fillStyle='#ffd23a';const tx=Math.min(W-62,hm.x),ty=hm.y-hm.h-14+Math.sin(S.t*6)*2;
        c.strokeText('TAP CAN: NEXT WAVE +'+callBonus(),tx-10,ty);c.fillText('TAP CAN: NEXT WAVE +'+callBonus(),tx-10,ty);c.font='12px '+FONT;c.fillStyle='#e8e8e8';c.strokeText('ash slows bugs',tx-10,ty+15);c.fillText('ash slows bugs',tx-10,ty+15);c.restore();}
      return;}
    const t=F.t;let x=hm.x,y=hm.y,rot=.02,lift=0;const over={x:L.cx+40*PL.s,y:L.rimY+150*PL.s};
    if(t<T.grab){}else if(t<T.lift){lift=ease((t-T.grab)/(T.lift-T.grab))*hm.h*.35;}
    else if(t<T.shakeEnd){const k=ease((t-T.lift)/(T.tilt-T.lift));x=hm.x+(over.x-hm.x)*k;y=hm.y-hm.h*.35+(over.y-hm.y)*k;rot=-2.05*k;if(t>T.pour){rot+=Math.sin(t*34)*.16;x+=Math.sin(t*34)*4;}}
    else if(t<T.back){const k=ease((t-T.shakeEnd)/(T.back-T.shakeEnd));x=over.x+(hm.x-over.x)*k;y=over.y+(hm.y-hm.h*.35-over.y)*k;rot=-2.05*(1-k);lift=0;if(k>=1)y=hm.y;}
    else{y=hm.y-hm.h*.35*(1-ease((t-T.back)/(T.end-T.back)));}
    if(t<T.lift)y-=lift;
    // pour ash + butts from the mouth of the can
    const yc=y-hm.h*.5;
    if(t>T.pour&&t<T.shakeEnd){const mx=x+Math.sin(rot)*hm.h*.5,my=yc-Math.cos(rot)*hm.h*.5;
      for(let i=0;i<5;i++)G.parts.push({k:'ash',x:mx+R(-7,7),y:my+R(-4,4),vx:R(-45,45),vy:R(40,140),t:0,life:R(.7,1.3),r:R(1.6,4),col:Math.random()<.5?'#8a8580':'#c9c4bd'});
      if(Math.random()<.09)G.parts.push({k:'butt',x:mx,y:my,vx:R(-50,30),vy:R(40,90),t:0,life:1.4,r:3,rot:R(0,6),col:'#e8a64a'});}
    drawCanAt(c,x,yc,hm.h,rot,.5,.5);
    // grip hand (enters from the right, C-grip round the can)
    if(SPR.ok('hand-grip')){const hh=hm.h*1.45;let gx,gy;const inK=t<T.grab?ease(t/T.grab):t>T.back?1-ease((t-T.back)/(T.end-T.back)):1;
      gx=x+(1-inK)*W*.7;gy=yc;c.save();c.translate(gx,gy);c.rotate(rot*.3);SPR.img(c,'hand-grip',0,0,hh,.1,.42);c.restore();}}
  // v5b: the painted lever is cut into its own layer so it visibly dips under the tattooed thumb
  function levAng(){const F=G.flushFx;if(!F)return 0;const t=F.t;return t<FL.press-.08?0:t<FL.press+.08?.42*ease((t-FL.press+.08)/.16):t<1.45?.42:t<1.75?.42*(1-ease((t-1.45)/.3)):0;}
  function drawLever(c){const a=levAng();if(a<=0||!SPR.ok('lever5')||!SPR.ok('leverbg5'))return;const s=PL.s;
    SPR.img(c,'leverbg5',px(458),py(261),46*s,.5,.5);
    c.save();c.translate(px(458),py(300));c.rotate(a);SPR.img(c,'lever5',0,py(283)-py(300),44*s,.5,1);c.restore();}
  function drawHandPress(c){const F=G.flushFx;drawLever(c);if(!F||F.t>2.1||!SPR.ok('hand-press'))return;const p=pipeGeo(),t=F.t,hh=150*PL.s*1.5;
    const inK=t<FL.press?ease(t/FL.press):t<1.5?1:1-ease((t-1.5)/.55);const a=levAng(),L0=40*PL.s;
    // thumb rides the lever tip as it dips
    const dx=Math.sin(a)*L0,dy=L0-Math.cos(a)*L0;
    c.save();c.translate(p.lx+(1-inK)*W*.75+2+dx,p.ly-2+dy);c.rotate(-.12+a*.25);SPR.img(c,'hand-press',0,0,hh,.035,.17);c.restore();
    if(a>.3&&t<.8){c.save();c.globalAlpha=.6;c.strokeStyle='#fff';c.lineWidth=2;for(const q of[-.6,0,.6]){c.beginPath();c.moveTo(p.lx-6+Math.cos(q-1.57)*14,p.ly-10+Math.sin(q-1.57)*14);c.lineTo(p.lx-6+Math.cos(q-1.57)*22,p.ly-10+Math.sin(q-1.57)*22);c.stroke();}c.restore();}}
  function drawParts2(c){for(const p of G.parts){if(p.k!=='butt')continue;c.save();c.translate(p.x,p.y);c.rotate(p.rot+p.t*6);c.fillStyle='#f3efe6';c.fillRect(-5,-1.6,7,3.2);c.fillStyle=p.col;c.fillRect(2,-1.6,4,3.2);c.restore();}}
  function drawFront(c){if(!S)return;drawParts2(c);drawCan(c);drawHandPress(c);bubble(c);
    const dr=S.door;if(dr.fx>0){const a=Math.min(1,dr.fx*1.5);c.save();c.globalAlpha=a;c.font='26px '+FONT;c.textAlign='center';c.lineWidth=6;c.strokeStyle='#111';c.fillStyle='#ffd23a';const y=L.U.y-6+Math.sin(S.t*30)*2*a;c.translate(W/2,y);c.rotate(-.05);c.strokeText(dr.txt,0,0);c.fillText(dr.txt,0,0);c.restore();}}
  return {drawFeet:c=>{if(S)drawFeet(c);},splash,reset,update,impact,drawBack,drawFront,ev,onPipe,onCan,aimJitter,_pose:f=>footPose(f),_pf:()=>phoneFlat(),_geo:f=>footGeo(f),get st(){return S;}};
})();
