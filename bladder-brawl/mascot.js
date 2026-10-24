/* Title-screen mascot: Gus the green giant, code-drawn, 4-second seamless loop.
   (Placeholder for a future generated-video mascot: swap #mascot canvas for a <video>.) */
'use strict';
function drawMascotScene(c,w,h,t,opt){opt=opt||{};const P=t/4*TAU;
  c.clearRect(0,0,w,h);const s=Math.min(w/440,h/560);
  // glow
  const g=c.createRadialGradient(w/2,h*.55,10,w/2,h*.55,h*.55);g.addColorStop(0,'rgba(190,255,120,.45)');g.addColorStop(1,'rgba(190,255,120,0)');c.fillStyle=g;c.fillRect(0,0,w,h);
  // rotating rays
  c.save();c.translate(w/2,h*.55);c.rotate(P/6);c.globalAlpha=.12;c.fillStyle='#fff';for(let i=0;i<12;i++){c.rotate(TAU/12);c.beginPath();c.moveTo(0,0);c.lineTo(-30*s,-h);c.lineTo(30*s,-h);c.fill();}c.restore();
  // stink lines behind
  stink(c,w/2-150*s,h*.5,s*1.4,t);stink(c,w/2+150*s,h*.46,s*1.2,t+.5);
  // flies orbiting (behind half)
  const fl=[];for(let i=0;i<3;i++){const a=P+i*TAU/3;fl.push({x:w/2+Math.cos(a)*175*s,y:h*.34+Math.sin(a)*48*s,z:Math.sin(a),i});}
  fl.filter(f=>f.z<0).forEach(f=>drawMiniFly(c,f.x,f.y,s*.8*(1+f.z*.15),t*4+f.i,1));
  drawGusFront(c,w/2,h*.97,s*1.1,t);
  fl.filter(f=>f.z>=0).forEach(f=>drawMiniFly(c,f.x,f.y,s*.95*(1+f.z*.15),t*4+f.i,1));
  // sparkles
  for(let i=0;i<6;i++){const ph=((t/4)+i/6)%1;const x=w/2+Math.sin(i*2.3)*170*s,y=h*.7-ph*h*.5;c.globalAlpha=Math.sin(ph*Math.PI);c.fillStyle='#fff6a0';c.beginPath();for(let k=0;k<8;k++){const r=k%2?3*s:10*s,a=k*Math.PI/4;c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.fill();}
  c.globalAlpha=1;}
(function(){const cv=document.getElementById('mascot');if(!cv)return;const c=cv.getContext('2d');let t0=performance.now();
  function fit(){const r=cv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);cv.width=Math.max(1,r.width*d);cv.height=Math.max(1,r.height*d);}
  addEventListener('resize',fit);fit();
  (function loop(n){requestAnimationFrame(loop);const scr=document.getElementById('title');if(scr&&!scr.classList.contains('on'))return;if(!cv.width||cv.width<4)fit();drawMascotScene(c,cv.width,cv.height,((n-t0)/1000)%4);})(t0);})();
