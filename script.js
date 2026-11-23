(function(){
"use strict";
var $=function(s){return document.querySelector(s)},qa=function(s){return [].slice.call(document.querySelectorAll(s))};
var reduce=matchMedia("(prefers-reduced-motion:reduce)").matches,narrow=function(){return innerWidth<=700},DPR=Math.min(window.devicePixelRatio||1,2);

/* ================= LANGIT: bintang kelap-kelip, bintang jatuh, satelit ================= */
var sky=$("#sky"),sx=sky.getContext("2d"),SW=0,SH=0,stars=[],shoots=[],sats=[],nextShoot=2,nextSat=4;
function sizeSky(){
  SW=innerWidth;SH=innerHeight;sky.width=SW*DPR;sky.height=SH*DPR;sx.setTransform(DPR,0,0,DPR,0,0);stars=[];
  for(var i=0,n=Math.round(SW*SH/5000);i<n;i++)stars.push({x:Math.random()SW,y:Math.random()*SH,r:Math.random()*1.2+.25,ph:Math.random()*6.28,sp:.8+Math.random()*2.4,z:.2+Math.random().8,w:Math.random()<.2});
}
function drawSky(t,dt,sy){
  sx.clearRect(0,0,SW,SH);
  stars.forEach(function(s){
    var a=.2+.8*(.5+.5*Math.sin(t*s.sp+s.ph)),y=((s.y-sy*.05*s.z)%SH+SH)%SH;
    sx.fillStyle=s.w?"rgba(255,214,180,"+a+")":"rgba(220,230,255,"+a+")";
    sx.beginPath();sx.arc(s.x,y,s.r,0,6.283);sx.fill();
  });
  if(reduce)return;
  if(t>nextShoot){nextShoot=t+4+Math.random()6;shoots.push({x:SW(.4+Math.random().6),y:Math.random()*SH.4,life:0})}
  shoots=shoots.filter(function(m){
    m.life+=dt;m.x-=900*dt;m.y+=450*dt;var k=1-m.life/.9;if(k<=0)return false;
    var g=sx.createLinearGradient(m.x,m.y,m.x+120,m.y-60);g.addColorStop(0,"rgba(255,255,255,"+k+")");g.addColorStop(1,"rgba(255,255,255,0)");
    sx.strokeStyle=g;sx.lineWidth=1.6;sx.beginPath();sx.moveTo(m.x,m.y);sx.lineTo(m.x+120,m.y-60);sx.stroke();return true;
  });
  if(t>nextSat){nextSat=t+14+Math.random()10;sats.push({x:-20,y:SH(.15+Math.random()*.5),vy:(Math.random()-.5)*8,ph:Math.random()*6})}
  sats=sats.filter(function(s){
    s.x+=45*dt;s.y+=s.vy*dt;if(s.x>SW+20)return false;
    sx.fillStyle="rgba(235,240,255,.9)";sx.fillRect(s.x-1.5,s.y-1,3,2);sx.fillRect(s.x-6,s.y-.5,4,1);sx.fillRect(s.x+2,s.y-.5,4,1);
    if(Math.sin(t*5+s.ph)>.5){
      sx.fillStyle="rgba(255,70,60,.95)";sx.beginPath();sx.arc(s.x,s.y-2.2,1.4,0,6.283);sx.fill();
      sx.fillStyle="rgba(255,70,60,.18)";sx.beginPath();sx.arc(s.x,s.y-2.2,6,0,6.283);sx.fill();
    }
    return true;
  });
}

/* ================= PLANET: shader WebGL prosedural ================= */
var VS="attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
var FS=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;uniform float uRot,uTime,uTilt;uniform vec3 uSun,uRim;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm4(vec3 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.02+vec3(5.2,1.3,8.1);a*=.5;}return v;}
float fbm3(vec3 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*noise(p);p=p*2.02+vec3(5.2,1.3,8.1);a*=.5;}return v;}
float H(vec3 p){
  float c=fbm4(p*1.6),d=fbm3(p*5.+c*2.),n=noise(p*14.),k=(n-.78)*16.;
  return c*.55+d*.45+exp(-k*k).028-smoothstep(.78,.92,n).03;
}
vec3 rx(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x,c*v.y-s*v.z,s*v.y+c*v.z);}
vec3 ry(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}
vec3 T(vec3 v){return ry(rx(v,uTilt),uRot);} // kemiringan sumbu + rotasi
void main(){
  vec2 p=(gl_FragCoord.xy-.5*uRes)/(.5*uRes.y);
  float R=.74,r=length(p)/R;
  vec3 sun=normalize(uSun);
  vec3 inCol=vec3(0.);float aIn=0.;
  if(r<1.){
    vec3 n=vec3(p/R,sqrt(1.-r*r));
    vec3 q=T(n),s=T(sun);
    float c=fbm4(q*1.6),d=fbm3(q*5.+c*2.),n0=noise(q*14.),k0=(n0-.78)*16.;
    float e=.012,h=c*.55+d*.45+exp(-k0*k0).028-smoothstep(.78,.92,n0).03;
    vec3 g=vec3(H(q+vec3(e,0,0))-h,H(q+vec3(0,e,0))-h,H(q+vec3(0,0,e))-h)/e;
    g-=dot(g,q)*q;
    vec3 N=normalize(q-g*.2);
    float dif=max(dot(N,s),0.)*smoothstep(-.08,.35,dot(q,s));
    vec3 alb=mix(vec3(.60,.25,.12),vec3(.80,.47,.26),smoothstep(.3,.7,d));
    alb=mix(alb,vec3(.90,.66,.45),smoothstep(.55,.8,c)*.7);
    alb=mix(alb,vec3(.17,.10,.09),(1.-smoothstep(.38,.52,c))*.85);
    float lat=abs(q.y)+(fbm3(q*6.)-.5)*.12;
    alb=mix(alb,vec3(.93,.95,.98),smoothstep(.86,.9,lat));
    float cl=noise(q*vec3(3.,10.,3.)+vec3(uTime*.03,0.,0.))noise(q*vec3(7.,18.,7.)-vec3(uTime.02,0.,0.));
    alb=mix(alb,vec3(1.),smoothstep(.25,.5,cl).22(.4+lat));
    inCol=alb*(dif*vec3(1.,.93,.85)*1.3+vec3(.014,.009,.012));
    float fr=pow(1.-n.z,3.),lit=clamp(dot(n,sun)*.7+.3,0.,1.);
    inCol+=vec3(1.,.55,.30)fr*lit.55;
    float back=pow(max(dot(normalize(n.xy+1e-5),-normalize(sun.xy)),0.),2.);
    inCol+=uRim*fr*back*.9;
    aIn=1.-smoothstep(.985,1.,r);
  }
  float gA=exp(-max(r-1.,0.)7.)*clamp(dot(normalize(p+1e-5),sun.xy).8+.35,0.,1.)*.5;
  float gB=exp(-max(r-1.,0.)8.)*clamp(dot(normalize(p+1e-5),-sun.xy).8+.3,0.,1.)*.4;
  gl_FragColor=vec4(inCol*aIn+(vec3(1.,.5,.28)gA+uRim*gB)(1.-aIn),aIn+(gA+gB)*(1.-aIn));
}`;

var cv=$("#cv"),pw=$("#pw"),gl=null,U={},W=0,qmul=1,ema=.016,nf=0,buf=new Uint8Array(4);
function mk(type,src){var o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.error(gl.getShaderInfoLog(o));return null}return o}
try{gl=cv.getContext("webgl",{alpha:true,premultipliedAlpha:true,antialias:false})}catch(e){}
if(gl){var pf=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);if(!pf||!pf.precision)gl=null}
if(gl){
  var vs=mk(gl.VERTEX_SHADER,VS),fs=mk(gl.FRAGMENT_SHADER,FS),pr=null;
  if(vs&&fs){pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr)}
  if(pr&&gl.getProgramParameter(pr,gl.LINK_STATUS)){
    gl.useProgram(pr);
    var bf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    var loc=gl.getAttribLocation(pr,"a");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    ["uRes","uRot","uTime","uTilt","uSun","uRim"].forEach(function(n){U[n]=gl.getUniformLocation(pr,n)});
  }else gl=null;
}
function fallback(){gl=null;pw.classList.add("nogl")}
if(!gl)fallback();
else cv.addEventListener("webglcontextlost",function(e){e.preventDefault();fallback()});

/* bulan yang mengorbit */
var moons=[{el:$("#m1"),a:.56,b:.15,sp:.6,size:.05,ph:0,tl:-.32},{el:$("#m2"),a:.74,b:.22,sp:.3,size:.034,ph:2.4,tl:-.18}];
function layout(){
  W=pw.offsetWidth;var k=Math.min(DPR,narrow()?1:1.4)*qmul;
  cv.width=cv.height=Math.max(2,Math.round(W*k));
  moons.forEach(function(m){m.px=m.size*W;m.el.style.width=m.el.style.height=m.px+"px"});
}

/* ================= SECTION, ANGKA, POSISI PLANET ================= */
var secs=qa("section"),done=[],cur=secs[0];
var rim=[1,.42,.17],rimT=[1,.42,.17],tilt=.44,tiltT=.44;
function hex(h){return [parseInt(h.substr(1,2),16)/255,parseInt(h.substr(3,2),16)/255,parseInt(h.substr(5,2),16)/255]}
function place(sec){
  cur=sec;var x=+sec.dataset.x,s=sec.dataset.s||1;
  if(sec.dataset.c){rimT=hex(sec.dataset.c);document.documentElement.style.setProperty("--acc",sec.dataset.c)}
  tiltT=+(sec.dataset.t||.44);
  pw.style.setProperty("--x",narrow()?"0px":(x*24)+"vw");pw.style.setProperty("--s",s);
}
function count(sec){
  qa(".c").forEach(function(el){
    if(!sec.contains(el))return;
    var to=+el.dataset.to,t0=null;
    (function f(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/1700),e=1-Math.pow(1-k,3);var v=Math.round(to*e+(k<1?(Math.random()-.5)Math.abs(to).3*(1-k):0));el.textContent=String(v).replace("-","−");if(k<1)requestAnimationFrame(f)})(performance.now());
  });
}
var io=new IntersectionObserver(function(es){
  es.forEach(function(e){if(e.isIntersecting){var s=e.target;s.classList.add("in");place(s);if(done.indexOf(s)<0){done.push(s);count(s)}}});
},{threshold:.55});
secs.forEach(function(s){io.observe(s)});

/* ================= LOOP UTAMA ================= */
var tmx=0,tmy=0,mx=0,my=0,sy=window.scrollY,rot=0,last=0,ghosts=qa(".ghost");
addEventListener("pointermove",function(e){tmx=e.clientX/innerWidth-.5;tmy=e.clientY/innerHeight-.5},{passive:true});
addEventListener("resize",function(){sizeSky();layout();place(cur)});
function frame(ms){
  var t=ms/1000,dt=Math.min(.05,t-last);last=t;
  var diff=window.scrollY-sy;sy+=diff*.08;mx+=(tmx-mx).04;my+=(tmy-my).04;
  rot+=reduce?0:dt*(.06+Math.min(Math.abs(diff),240)*.0014);   // makin cepat saat scroll
  for(var q=0;q<3;q++)rim[q]+=(rimT[q]-rim[q]).05;tilt+=(tiltT-tilt).04;
  drawSky(t,dt,sy);
  if(gl){
    gl.viewport(0,0,cv.width,cv.height);
    gl.uniform2f(U.uRes,cv.width,cv.height);gl.uniform1f(U.uRot,rot);gl.uniform1f(U.uTime,t);gl.uniform1f(U.uTilt,tilt);gl.uniform3f(U.uRim,rim[0],rim[1],rim[2]);
    gl.uniform3f(U.uSun,-.75+mx*.5,.35-my*.4,.55);
    gl.drawArrays(gl.TRIANGLES,0,3);
    nf++;
    if(nf===8){gl.readPixels(cv.width>>1,cv.height>>1,1,1,gl.RGBA,gl.UNSIGNED_BYTE,buf);if(buf[3]<30)fallback()}  // jaga-jaga kalau GPU gagal gambar
    ema=ema*.95+Math.min(.1,dt)*.05;
    if(nf%45===0&&ema>.034&&qmul>.55){qmul*=.8;layout()}                       // turunkan resolusi kalau berat
  }
  var f=narrow()?.78:1;
  moons.forEach(function(m){
    var ang=(reduce?0:t)*m.sp+m.ph,x=Math.cos(ang)*m.a*W*f,y=Math.sin(ang)*m.b*W*f,c=Math.cos(m.tl),s=Math.sin(m.tl);
    var xr=x*c-y*s,yr=x*s+y*c,sc=1+.28*Math.sin(ang);
    m.el.style.zIndex=Math.sin(ang)>0?3:1;
    m.el.style.transform="translate("+(W/2+xr-m.px/2).toFixed(1)+"px,"+(W/2+yr-m.px/2).toFixed(1)+"px) scale("+sc.toFixed(3)+")";
  });
  ghosts.forEach(function(g){
    var s=g.parentNode,mid=s.offsetTop+s.offsetHeight/2;
    g.style.transform="translate(calc(-50% + "+((mid-sy-SH/2)*-.12).toFixed(1)+"px),-50%)";
  });
  requestAnimationFrame(frame);
}
sizeSky();layout();place(secs[0]);requestAnimationFrame(frame);
})();
