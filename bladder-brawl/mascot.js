/* Title-screen hero loop: generated sprite (art/hero-front) animated in code, 4-second seamless loop. */
'use strict';
function drawMascotScene(c,w,h,t,opt){opt=opt||{};const P=t/4*TAU;
  c.clearRect(0,0,w,h);const s=Math.min(w/440,h/560);
  if(opt.bg){c.save();const px=Math.sin(P)*10*s;if(!SPR.cover(c,opt.bg,w*1.06,h*1.06,px-w*.03,-h*.03)){c.fillStyle='#1d1530';c.fillRect(0,0,w,h);}c.fillStyle='rgba(12,4,20,.35)';c.fillRect(0,0,w,h);c.restore();}
  // neon glow pulse (seamless, 4 s)
  const fl=.75+.25*Math.sin(P*2)*(Math.sin(P*7)>.95?.2:1);
  const g=c.createRadialGradient(w/2,h*.55,10,w/2,h*.55,h*.6);g.addColorStop(0,'rgba(255,60,190,'+(.32*fl)+')');g.addColorStop(.55,'rgba(140,255,60,'+(.12*fl)+')');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,w,h);
  // orbiting flies (behind)
  const F=[];for(let i=0;i<3;i++){const a=P+i*TAU/3;F.push({x:w/2+Math.cos(a)*170*s,y:h*.36+Math.sin(a)*46*s,z:Math.sin(a),i});}
  const fly=f=>{c.save();c.translate(f.x,f.y);c.rotate(Math.cos(P+f.i*TAU/3)>0?.5:-.5);c.scale(1+Math.sin(t*60+f.i)*.05,1);SPR.img(c,'en-fly',0,0,46*s*(1+f.z*.18));c.restore();};
  F.filter(f=>f.z<0).forEach(fly);
  // hero: idle bob + breathing squash
  const bob=Math.sin(P*2)*5*s,hh=Math.min(h*.96,560*s*1.02);
  c.save();c.translate(w/2,h*.995);c.globalAlpha=.45;c.fillStyle='#000';c.beginPath();c.ellipse(0,0,hh*.22,hh*.03,0,0,TAU);c.fill();c.globalAlpha=1;
  c.rotate(Math.sin(P)*.015);c.scale(1+Math.sin(P*2)*.008,1-Math.sin(P*2)*.008);
  if(!SPR.img(c,'hero-front',0,bob,hh,.5,1)&&typeof drawGusFront==='function')drawGusFront(c,0,0,s*1.1,t);c.restore();
  F.filter(f=>f.z>=0).forEach(fly);
  // grime drips / stink sparkles rising
  for(let i=0;i<8;i++){const ph=((t/4)+i/8)%1;const x=w/2+Math.sin(i*2.3)*175*s,y=h*.75-ph*h*.55;c.globalAlpha=Math.sin(ph*Math.PI)*.85;c.fillStyle=i%2?'#c7ff3a':'#ff4fc8';c.beginPath();c.arc(x+Math.sin(ph*TAU+i)*8*s,y,(2+i%3)*s,0,TAU);c.fill();}
  c.globalAlpha=1;}
(function(){const cv=document.getElementById('mascot');if(!cv)return;const c=cv.getContext('2d');let t0=performance.now();
  function fit(){const r=cv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);cv.width=Math.max(1,r.width*d);cv.height=Math.max(1,r.height*d);}
  addEventListener('resize',fit);fit();
  (function loop(n){requestAnimationFrame(loop);const scr=document.getElementById('title');if(scr&&!scr.classList.contains('on'))return;if(!cv.width||cv.width<4)fit();drawMascotScene(c,cv.width,cv.height,((n-t0)/1000)%4);})(t0);})();
