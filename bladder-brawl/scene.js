/* Bladder Brawl v3 scene layer: first-person feet, flush pipe, props and side events.
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
    puddles:[],phone:{t:R(14,22),buzz:0,dead:0,shake:0},can:{st:0,hit:0,x:0,y:0,vx:0,vy:0,r:0},
    target:{t:R(9,15),on:0,hit:0},door:{t:R(24,38),fx:0},pipe:{shake:0,glug:0,lastQ:null,lever:0},cache:{}};}
  reset();
  const U=()=>L.U;
  // ---------- geometry ----------
  function footGeo(f){const hS=Math.min(170,L.feet*1.75),w=hS*.715;return {x:f.side<0?W*.27:W*.73,base:H+hS*.14,h:hS,w};}
  function pipeGeo(){const u=U(),h=u.h*.44,w=h*354/700;return {x:W/2,bot:u.y+u.h*.05,h,w,top:u.y+u.h*.05-h};}
  function phonePos(){const u=U();return {x:u.x+u.w*.2,y:u.y+u.h*.055,h:Math.max(30,u.h*.075)};}
  function canHome(){const u=U();return {x:u.x+u.w*.8,y:u.y+u.h*.055,h:Math.max(30,u.h*.075)};}
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
    const ph=phonePos();if(!S.phone.dead&&near(x,y,{x:ph.x,y:ph.y-ph.h*.45},ph.h*.6)){
      if(S.phone.buzz>0){S.phone.buzz=0;S.phone.dead=1;G.earned+=4;pop(ph.x,ph.y-40,'DECLINED! +4','#7dffb0',18,1);sfx('ding');}
      else{S.phone.shake=.2;}burst(x,y,3,'#ffe56b',120);return true;}
    // beer can on the rim
    const ch=canHome();if(S.can.st===0&&near(x,y,{x:ch.x,y:ch.y-ch.h*.45},ch.h*.6)){S.can.hit+=1;burst(x,y,2,'#ffe56b',100);
      if(S.can.hit>=6){S.can.st=1;S.can.x=ch.x;S.can.y=ch.y-ch.h*.45;S.can.vx=-40;S.can.vy=-160;S.can.r=0;sfx('clank');}return true;}
    // fly-target sticker (does not consume: the stream still hits bugs)
    const tg=S.target;if(tg.on>0&&near(x,y,tg,20)){tg.hit+=1;if(tg.hit>=10){tg.on=0;G.earned+=6;pop(tg.x,tg.y-30,'BULLSEYE! +6','#ffd23a',20,1.1);sfx('ding');burst(tg.x,tg.y,14,'#ffd23a',220);}}
    // sneakers
    for(const f of S.feet){const g=footGeo(f);if(Math.abs(x-g.x)<g.w*.42&&y>g.base-g.h*.98&&y<g.base-g.h*.25){kick(f,x,y);return true;}}
    // inside the urinal or on the rim: normal gameplay
    if(y<L.rimY-16&&y>u.y-6&&x>u.x+u.w*.08&&x<u.x+u.w*.92)return false;
    if(y>=L.rimY-16&&y<=L.bowlBot+8&&x>wallL(y)-6&&x<wallR(y)+6)return false;
    // a miss: wall or floor
    burst(x,y,3,'#ffe56b',110);if(S.puddles.length>40)S.puddles.shift();S.puddles.push({x:x+R(-4,4),y,r:R(5,11),a:.0,floor:y>u.y+u.h*.9});
    if(y>u.y+u.h*.9&&Math.abs(x-W/2)<W*.36&&S.hopCD<=0){S.hopCD=2.2;ev('hop');sfx('splat');pop(W/2,y-30,'SPLASHBACK!','#bff0ff',15,.8);}
    return true;}
  function kick(f,x,y){burst(x,y,4,'#ffe56b',140);if(S.kickCD>0)return;S.kickCD=1.3;S.kicks++;f.wet=Math.min(6,f.wet+1);f.jerk=0;
    const tier=Math.min(2,Math.floor((S.kicks-1)/2));S.bub={txt:pick(LINES[tier]),t:0,side:f.side,tier};
    const pen=Math.min(G.earned,2+tier*2);G.earned-=pen;pop(W/2,H-L.feet*1.9,'KICKS RUINED x'+S.kicks+(pen?'  -'+pen:''),'#ff8a5c',15,1.3);
    sfx('splat');sfx('bleep');if(typeof vib==='function')vib(30);}
  function onPipe(x,y){if(!S||G.state!=='play'||G.paused)return false;const p=pipeGeo();return Math.abs(x-p.x)<Math.max(34,p.w*.75)&&y>p.top+p.h*.2&&y<p.top+p.h*.78;}
  function aimJitter(dt){if(S&&S.phone.buzz>0&&G.firing){G.aim.x+=Math.sin(S.t*37)*2.2;G.aim.y+=Math.cos(S.t*29)*1.4;}}
  // ---------- update ----------
  function update(dt){if(!S)return;S.t+=dt;if(S.ev)S.ev.t+=dt;S.kickCD-=dt;S.hopCD-=dt;S.kickShow-=dt;
    for(const f of S.feet)f.jerk+=dt;if(S.bub){S.bub.t+=dt;if(S.bub.t>1.9)S.bub=null;}
    if(S.ev&&S.ev.k!=='win'&&S.ev.k!=='lose'&&S.ev.t>1)S.ev=null;
    for(const p of S.puddles)p.a=Math.min(.55,p.a+dt*2);
    const ph=S.phone;ph.shake-=dt;if(!ph.dead){ph.t-=dt;if(ph.t<=0&&ph.buzz<=0){ph.buzz=4;ph.t=R(22,34);pop(phonePos().x,phonePos().y-50,'BZZT BZZT','#9fe8ff',14,.9);}
      if(ph.buzz>0){ph.buzz-=dt;if(Math.floor((ph.buzz)*1.5)!==Math.floor((ph.buzz+dt)*1.5))sfx('buzz');}}else{ph.dead+=dt;if(ph.dead>14){ph.dead=0;ph.t=R(16,26);}}
    const c=S.can;if(c.st===1){c.vy+=700*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.r+=dt*9;
      for(const b of G.bugs)if(!b.dead&&!BT[b.type].boss&&b.esc==null&&(b.x-c.x)**2+(b.y-c.y)**2<26*26)damage(b,999,0,-1);
      if(c.y>L.waterY-4&&c.vy>0){c.st=2;c.t=0;G.earned+=8;pop(c.x,c.y-40,'CAN-NONBALL! +8','#ffd23a',20,1.2);burst(c.x,c.y,20,'#bff0ff',260);SFX.splash();G.shake=Math.max(G.shake,.25);}}
    else if(c.st===2){c.t+=dt;}
    const tg=S.target;if(tg.on>0){tg.on-=dt;}else{tg.t-=dt;if(tg.t<=0){tg.t=R(14,22);tg.on=7;tg.hit=0;const y=L.rimY+L.wallH*R(.45,.7);tg.y=y;tg.x=R(wallL(y)+30,wallR(y)-30);}}
    const dr=S.door;dr.fx-=dt;dr.t-=dt;if(dr.t<=0){dr.t=R(30,48);dr.fx=1.4;dr.txt=pick(DOOR);G.shake=Math.max(G.shake,.45);sfx('knock');if(!S.ev)ev('flinch');}
    // pipe gurgles right before a dense wave
    const P=S.pipe;P.shake-=dt;P.glug-=dt;P.lever-=dt;const q=G.queue;
    if(q&&q.length>=4&&q[0]!==P.lastQ){const lead=q[0].t-G.wt;if(lead>0&&lead<1.6&&q[3].t-q[0].t<1.8){P.lastQ=q[0];P.glug=1.6;P.shake=1.2;sfx('glug');const p=pipeGeo();pop(p.x+40,p.bot-p.h*.3,'gurgle...','#cfe9ff',13,1);}}
    if(P.glug>0&&Math.random()<dt*14)G.parts.push({k:'bub',x:L.drainX+R(-L.drainR,L.drainR),y:L.waterY,vx:R(-10,10),vy:R(-60,-25),t:0,life:.6,r:R(2,5),col:'rgba(220,240,255,.8)'});
  }
  // ---------- drawing ----------
  function drawBack(c){if(!S)return;
    for(const p of S.puddles){c.globalAlpha=p.a;c.beginPath();c.ellipse(p.x,p.y,p.r*(p.floor?1.6:1),p.r*(p.floor?.55:.9),0,0,6.283);c.fillStyle='#f2cf2c';c.fill();}c.globalAlpha=1;
    const tg=S.target;if(tg.on>0){const a=Math.min(1,tg.on,(7-tg.on)*3);c.save();c.globalAlpha=a*.95;c.translate(tg.x,tg.y);const s=1+Math.sin(S.t*6)*.06;c.scale(s,s);
      c.strokeStyle='#e8233f';c.lineWidth=3;for(const r of [18,11]){c.beginPath();c.arc(0,0,r,0,6.283);c.stroke();}c.fillStyle='#e8233f';c.beginPath();c.arc(0,0,4,0,6.283);c.fill();
      c.globalAlpha*=.85;SPR.img(c,'en-fly',0,0,22);c.restore();}
    const ph=phonePos();if(!S.phone.dead||S.phone.dead>0){c.save();const bz=S.phone.buzz>0,sh=bz?Math.sin(S.t*70)*2.2:(S.phone.shake>0?Math.sin(S.t*60)*1.5:0);c.translate(ph.x+sh,ph.y);c.rotate(-.06+sh*.02);
      if(bz){c.fillStyle='rgba(120,220,255,'+(.35+.25*Math.sin(S.t*20))+')';c.beginPath();c.ellipse(0,-ph.h*.5,ph.h*.55,ph.h*.7,0,0,6.283);c.fill();}
      SPR.img(c,'phone',0,0,ph.h,.5,1);
      if(bz){c.strokeStyle='#9fe8ff';c.lineWidth=2;for(const s of [-1,1]){c.beginPath();c.arc(0,-ph.h*.5,ph.h*.55+3*Math.sin(S.t*20),s<0?Math.PI*.8:-Math.PI*.2,s<0?Math.PI*1.2:Math.PI*.2);c.stroke();}}
      c.restore();}
    const cn=S.can,hm=canHome();if(cn.st===0){c.save();c.translate(hm.x,hm.y);c.rotate(.05+(cn.hit?Math.sin(S.t*50)*.04*cn.hit/6:0));SPR.img(c,'can',0,0,hm.h,.5,1);c.restore();}
    else if(cn.st===1){c.save();c.translate(cn.x,cn.y);c.rotate(cn.r);SPR.img(c,'can',0,0,hm.h);c.restore();}
    else if(cn.st===2&&cn.t<3){c.save();c.globalAlpha=Math.max(0,1-cn.t/3);c.translate(L.drainX+10,L.waterY-6);c.rotate(1.35);SPR.img(c,'can',0,0,hm.h*.9);c.restore();}
  }
  function shoeCanvas(f){const k=f.side+'|'+f.wet;if(S.cache[k])return S.cache[k];const im=SPR.I.shoe;if(!SPR.ok('shoe'))return null;
    const w=186,h=260,cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d');
    if(f.side<0){x.translate(w,0);x.scale(-1,1);}x.drawImage(im,0,0,w,h);x.setTransform(1,0,0,1,0,0);
    if(f.wet>0){x.globalCompositeOperation='source-atop';let s=7+f.side*3;const rr=()=>{s=(s*16807)%2147483647;return s/2147483647;};
      for(let i=0;i<f.wet*3;i++){x.globalAlpha=.12+.035*f.wet;x.fillStyle=i%3?'#9a7c18':'#5e4a0c';x.beginPath();x.ellipse(w*(.25+rr()*.5),h*(.08+rr()*.42),12+rr()*16+f.wet*3,8+rr()*10+f.wet*2,rr()*3,0,6.283);x.fill();}
      x.globalAlpha=.25;x.fillStyle='#fff8c0';for(let i=0;i<f.wet*2;i++){x.beginPath();x.arc(w*(.3+rr()*.4),h*(.1+rr()*.35),2+rr()*2,0,6.283);x.fill();}}
    S.cache[k]=cv;return cv;}
  function footPose(f){const t=S.t,sd=f.side;let dx=0,dy=0,rot=sd*.1,sc=1;const e=S.ev,cap=stats().cap,low=G.bladder<cap*.22;
    if(e&&e.k==='win'){dx=Math.sin(t*9+(sd>0?Math.PI:0))*7;dy=-Math.abs(Math.sin(t*9+(sd>0?Math.PI:0)))*10;rot+=Math.sin(t*9)*.08;}
    else if(e&&e.k==='lose'){const k=Math.min(1,e.t*3);dy=16*k;rot+=sd*.28*k;sc=1-.04*k;}
    else if(e&&e.k==='stomp'&&sd>0){const u=e.t;dy=u<.22?-26*(u/.22):u<.3?-26*(1-(u-.22)/.08):0;}
    else if(e&&e.k==='hop'){dy=14*Math.sin(Math.min(1,e.t/.45)*Math.PI);sc=1-.05*Math.sin(Math.min(1,e.t/.45)*Math.PI);}
    else if(e&&e.k==='flinch'&&e.t<.35){dy=-8*Math.sin(e.t/.35*Math.PI);}
    else if(low){dx=-sd*16;dy=Math.sin(t*8+(sd>0?Math.PI:0))*5;rot=-sd*.12+Math.sin(t*8)*.05;}
    else if(G.combo>=5&&G.comboT>0){dy=-Math.abs(Math.sin(t*10+(sd>0?Math.PI/2:0)))*13;rot+=Math.sin(t*10+sd)*.1;}
    else if(G.danger){dy=-Math.abs(Math.sin(t*17+(sd>0?1:0)))*5;rot+=Math.sin(t*23)*.045;}
    else if(sd>0){const b=(t*2.1)%1;dy=b<.18?-6*Math.sin(b/.18*Math.PI):0;rot+=dy*.006;}
    if(f.jerk>=0&&f.jerk<.9){const k=1-f.jerk/.9;dy-=30*Math.sin(Math.min(1,f.jerk/.25)*Math.PI*.5)*k;dx+=Math.sin(f.jerk*48)*6*k;rot+=Math.sin(f.jerk*40)*.12*k;}
    return {dx,dy,rot,sc};}
  function drawFeet(c){for(const f of S.feet){const g=footGeo(f),p=footPose(f),cv=shoeCanvas(f);c.save();c.translate(g.x+p.dx,g.base+p.dy);c.rotate(p.rot);c.scale(p.sc,p.sc);
      c.globalAlpha=.35;c.fillStyle='#000';c.beginPath();c.ellipse(0,-g.h*.1,g.w*.45,g.h*.12,0,0,6.283);c.fill();c.globalAlpha=1;
      if(cv)c.drawImage(cv,-g.w/2,-g.h,g.w,g.h);
      if(f.wet>0&&Math.random()<.02*f.wet)G.parts.push({k:'drop',x:g.x+p.dx+(Math.random()-.5)*g.w*.4,y:g.base-g.h*.55,vx:0,vy:40,t:0,life:.5,r:2,col:'#e8c94a'});
      c.restore();}}
  function bubble(c){const b=S.bub;if(!b)return;const g=footGeo(S.feet[b.side<0?0:1]);const s=b.t<.15?b.t/.15*1.1:b.t<.25?1.1-(b.t-.15):1;const x=g.x-b.side*W*.06,y=g.base-g.h*1.12;
    c.save();c.translate(x,y);c.scale(s,s);c.rotate(Math.sin(b.t*20)*.03*(b.tier+1));c.font=(16+b.tier*2)+'px '+FONT;const tw=c.measureText(b.txt).width+22,th=34+b.tier*2;
    c.fillStyle='#fff';c.strokeStyle='#111';c.lineWidth=3;c.beginPath();
    if(b.tier<2){const r=12;c.moveTo(-tw/2+r,-th/2);c.arcTo(tw/2,-th/2,tw/2,th/2,r);c.arcTo(tw/2,th/2,-tw/2,th/2,r);c.lineTo(b.side*10,th/2);c.lineTo(b.side*22,th/2+16);c.lineTo(-b.side*6,th/2);c.arcTo(-tw/2,th/2,-tw/2,-th/2,r);c.arcTo(-tw/2,-th/2,tw/2,-th/2,r);}
    else{const n=18;for(let i=0;i<=n;i++){const a=i/n*6.283,rr=i%2?1:1.18;c.lineTo(Math.cos(a)*tw*.58*rr,Math.sin(a)*th*.85*rr);}}
    c.closePath();c.fill();c.stroke();c.fillStyle=b.tier===2?'#e8233f':'#111';c.textAlign='center';c.textBaseline='middle';
    c.fillText(b.txt,0,1);c.restore();}
  function drawPipe(c){const p=pipeGeo(),P=S.pipe;if(!SPR.ok('pipe'))return;const sh=P.shake>0?Math.sin(S.t*55)*2.2*Math.min(1,P.shake):0;c.save();c.translate(p.x+sh,p.top);
    c.drawImage(SPR.I.pipe,-p.w/2,0,p.w,p.h);
    if(P.lever>0){c.globalCompositeOperation='lighter';c.globalAlpha=P.lever*.8;c.fillStyle='#bff0ff';c.beginPath();c.ellipse(p.w*.18,p.h*.45,p.w*.4,p.h*.08,0,0,6.283);c.fill();c.globalCompositeOperation='source-over';c.globalAlpha=1;}
    else if(G.flushes>0&&G.danger){c.globalAlpha=.5+.4*Math.sin(S.t*8);c.strokeStyle='#7dffb0';c.lineWidth=3;c.beginPath();c.ellipse(0,p.h*.46,p.w*.62,p.h*.12,0,0,6.283);c.stroke();c.globalAlpha=1;}
    c.restore();}
  function drawFront(c){if(!S)return;drawPipe(c);drawFeet(c);bubble(c);
    const dr=S.door;if(dr.fx>0){const a=Math.min(1,dr.fx*1.5);c.save();c.globalAlpha=a;c.font='26px '+FONT;c.textAlign='center';c.lineWidth=6;c.strokeStyle='#111';c.fillStyle='#ffd23a';const y=L.U.y-6+Math.sin(S.t*30)*2*a;c.translate(W/2,y);c.rotate(-.05);c.strokeText(dr.txt,0,0);c.fillText(dr.txt,0,0);c.restore();}}
  return {reset,update,impact,drawBack,drawFront,ev,onPipe,aimJitter,_pose:f=>footPose(f),_geo:f=>footGeo(f),get st(){return S;}};
})();
