import{k as u,i as R,as as W,j,d as K,an as Q,bm as tt}from"./three.module-CvwULque.js";const p=new W,I=new u,it={};function et(r){const{x:t,y:i,z:e}=r;r.x=e,r.y=t,r.z=i}function ot(r){return-(r-Math.PI/2)}function B(r){return-r+Math.PI/2}function st(r,t,i={}){return p.theta=t,p.phi=B(r),I.setFromSpherical(p),p.setFromVector3(I),i.lat=ot(p.phi),i.lon=p.theta,i}function X(r,t="E",i="W"){const e=r<0?i:t;r=Math.abs(r);const s=~~r,o=(r-s)*60,n=~~o,M=~~((o-n)*60);return`${s}° ${n}' ${M}" ${e}`}function ct(r,t,i=!1){const e=st(r,t,it);let s,o;return i?(s=`${(R.RAD2DEG*e.lat).toFixed(4)}°`,o=`${(R.RAD2DEG*e.lon).toFixed(4)}°`):(s=X(R.RAD2DEG*e.lat,"N","S"),o=X(R.RAD2DEG*e.lon,"E","W")),`${s} ${o}`}const Y=new W,m=new u,c=new u,A=new u,d=new j,l=new j,N=new K,a=new tt,Z=new u,G=new u,b=new u,D=new u,U=new Q,nt=1e-12,rt=.1,V=0,L=1,O=2;class lt{constructor(t=1,i=1,e=1){this.name="",this.radius=new u(t,i,e)}intersectRay(t,i){return d.makeScale(...this.radius).invert(),N.center.set(0,0,0),N.radius=1,U.copy(t).applyMatrix4(d),U.intersectSphere(N,i)?(d.makeScale(...this.radius),i.applyMatrix4(d),i):null}getEastNorthUpFrame(t,i,e){return this.getEastNorthUpAxes(t,i,Z,G,b,D),e.makeBasis(Z,G,b).setPosition(D)}getEastNorthUpAxes(t,i,e,s,o,n=D){this.getCartographicToPosition(t,i,0,n),this.getCartographicToNormal(t,i,o),e.set(-n.y,n.x,0).normalize(),s.crossVectors(o,e).normalize()}getAzElRollFromRotationMatrix(t,i,e,s,o=V){return o===L?(a.set(-Math.PI/2,0,0,"XYZ"),l.makeRotationFromEuler(a).premultiply(e)):o===O?(a.set(-Math.PI/2,0,Math.PI,"XYZ"),l.makeRotationFromEuler(a).premultiply(e)):l.copy(e),this.getEastNorthUpFrame(t,i,d).invert(),l.premultiply(d),a.setFromRotationMatrix(l,"ZXY"),s.azimuth=-a.z,s.elevation=a.x,s.roll=a.y,s}getRotationMatrixFromAzElRoll(t,i,e,s,o,n,h=V){return this.getEastNorthUpFrame(t,i,d),a.set(s,o,-e,"ZXY"),n.makeRotationFromEuler(a).premultiply(d).setPosition(0,0,0),h===L?(a.set(Math.PI/2,0,0,"XYZ"),l.makeRotationFromEuler(a),n.multiply(l)):h===O&&(a.set(-Math.PI/2,0,Math.PI,"XYZ"),l.makeRotationFromEuler(a),n.multiply(l)),n}getCartographicToPosition(t,i,e,s){this.getCartographicToNormal(t,i,m);const o=this.radius;c.copy(m),c.x*=o.x**2,c.y*=o.y**2,c.z*=o.z**2;const n=Math.sqrt(m.dot(c));return c.divideScalar(n),s.copy(c).addScaledVector(m,e)}getPositionToCartographic(t,i){this.getPositionToSurfacePoint(t,c),this.getPositionToNormal(t,m);const e=A.subVectors(t,c);return i.lon=Math.atan2(m.y,m.x),i.lat=Math.asin(m.z),i.height=Math.sign(e.dot(t))*e.length(),i}getCartographicToNormal(t,i,e){return Y.set(1,B(t),i),e.setFromSpherical(Y).normalize(),et(e),e}getPositionToNormal(t,i){const e=this.radius;return i.copy(t),i.x/=e.x**2,i.y/=e.y**2,i.z/=e.z**2,i.normalize(),i}getPositionToSurfacePoint(t,i){const e=this.radius,s=1/e.x**2,o=1/e.y**2,n=1/e.z**2,h=t.x*t.x*s,M=t.y*t.y*o,z=t.z*t.z*n,T=h+M+z,f=Math.sqrt(1/T),P=c.copy(t).multiplyScalar(f);if(T<rt)return isFinite(f)?i.copy(P):null;const H=A.set(P.x*s*2,P.y*o*2,P.z*n*2);let S=(1-f)*t.length()/(.5*H.length()),v=0,F,C,y,E,x,_,w,g,q,$,k;do{S-=v,y=1/(1+S*s),E=1/(1+S*o),x=1/(1+S*n),_=y*y,w=E*E,g=x*x,q=_*y,$=w*E,k=g*x,F=h*_+M*w+z*g-1,C=h*q*s+M*$*o+z*k*n;const J=-2*C;v=F/J}while(Math.abs(F)>nt);return i.set(t.x*y,t.y*E,t.z*x)}calculateHorizonDistance(t,i){const e=this.calculateEffectiveRadius(t);return Math.sqrt(2*e*i+i**2)}calculateEffectiveRadius(t){const i=this.radius.x,s=1-this.radius.z**2/i**2,o=t*R.DEG2RAD,n=Math.sin(o)**2;return i/Math.sqrt(1-s*n)}getPositionElevation(t){this.getPositionToSurfacePoint(t,c);const i=A.subVectors(t,c);return Math.sign(i.dot(t))*i.length()}copy(t){return this.radius.copy(t.radius),this}clone(){return new this.constructor().copy(this)}}export{L as C,lt as E,O,ct as t};