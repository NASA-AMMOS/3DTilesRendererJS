import{aG as z,k as S,l as g,b2 as D,V as N,R as V,ad as G,i as U}from"./three.module-Cdr6prlM.js";import{r as c,u as w,d as I,h as B,a as L,i as Z,j as a,c as Y,C as K,T as X,b as M,G as H}from"./extends-B-sZwz99.js";import{D as $}from"./DRACOLoader-9yoF831m.js";import{u as ee,T as te}from"./leva.esm-BsAL7dUb.js";import{C as se,T as ne}from"./TilesLoadingBar-Cq42Ke7-.js";import{C as ie}from"./CameraViewTransition-DX5lSSX7.js";import{C as re}from"./CesiumIonAuthPlugin-B_lbKHA1.js";import{G as oe}from"./GLTFExtensionsPlugin-Be6LgQeY.js";import{T as ae}from"./TileCompressionPlugin-CalyNaQM.js";import{U as le}from"./UpdateOnChangePlugin-DB_YtfJ2.js";import{T as ue}from"./TilesFadePlugin-DalKiB7P.js";import{E as ce,O as W}from"./Ellipsoid-CuSwTtSS.js";import{E as de}from"./Environment-BM9B4QvH.js";import"./EnvironmentControls-BR_SO77a.js";import"./GlobeControls-CkeMsZ4k.js";import"./TilesRenderer-LLyazNeZ.js";import"./I3DMLoader-D6XwtbpC.js";import"./readMagicBytes-BdIY7bqJ.js";import"./GLTFLoader-MuDEHmgM.js";import"./B3DMLoader-B8RO-3BP.js";import"./PNTSLoader-_M34sMxq.js";import"./CMPTLoader-CG2uZI-r.js";import"./EllipsoidRegion-DVo7AClK.js";import"./CameraTransitionManager-DEZ_Jh2g.js";import"./EPSGTilesPlugin-CqcTLREx.js";import"./ImageFormatPlugin-DAoPbesU.js";function J(...h){return c.useCallback(e=>{h.forEach(t=>{t&&(typeof t=="function"?t(e):t.current=e)})},h)}function F(h,e){e(h)||h.children.forEach(t=>{F(t,e)})}class pe extends z{constructor(){super(),this.objects=new Set,this.observed=new Set,this._addedCallback=({child:e})=>{F(e,t=>this.observed.has(t)?!0:(this.objects.add(t),t.addEventListener("childadded",this._addedCallback),t.addEventListener("childremoved",this._removedCallback),this.dispatchEvent({type:"childadded",child:e}),!1))},this._removedCallback=({child:e})=>{F(e,t=>this.observed.has(t)?!0:(this.objects.delete(t),t.removeEventListener("childadded",this._addedCallback),t.removeEventListener("childremoved",this._removedCallback),this.dispatchEvent({type:"childremoved",child:e}),!1))}}observe(e){const{observed:t}=this;this._addedCallback({child:e}),t.add(e)}unobserve(e){const{observed:t}=this;t.delete(e),this._removedCallback({child:e})}dispose(){this.observed.forEach(e=>{this.unobserve(e)})}}const T=new V,j=new D,C=new D,P=new N,E=new g,k=new S;class me extends z{constructor(){super(),this.autoRun=!0,this.queryMap=new Map,this.index=0,this.queued=[],this.scheduled=!1,this.duration=1,this.objects=[],this.observer=new pe,this.ellipsoid=new ce,this.frame=new S,this.cameras=new Set;const e=(()=>{let t=!1;return()=>{t||(t=!0,queueMicrotask(()=>{this.queryMap.forEach(i=>this._enqueue(i)),t=!1}))}})();this.observer.addEventListener("childadded",e),this.observer.addEventListener("childremoved",e)}_enqueue(e){e.queued||(this.queued.push(e),e.queued=!0,this._scheduleRun())}_runJobs(){const{queued:e,cameras:t,duration:i}=this,s=performance.now();for(t.forEach((n,l)=>{k.copy(n.matrixWorldInverse).premultiply(n.projectionMatrix),E.set(0,0,-1).transformDirection(n.matrixWorld),j.start.setFromMatrixPosition(n.matrixWorld),j.end.addVectors(E,j.start);for(let d=0,r=e.length;d<r;d++){const o=e[d],{ray:p}=o;let y,u;if(o.point===null)C.start.copy(p.origin),p.at(1,C.end),he(j,C,P),o.distance=P.x*(1-Math.abs(E.dot(p.direction))),o.inFrustum=!0;else{const m=C.start;m.copy(o.point).applyMatrix4(k),m.x>-1&&m.x<1&&m.y>-1&&m.y<1&&m.z>-1&&m.z<1?(o.distance=m.subVectors(o.point,j.start).dot(E),o.inFrustum=!0):(o.distance=0,o.inFrustum=!1)}l===0?(o.distance=y,o.inFrustum=u):(o.inFrustum=o.inFrustum||u,o.distance=Math.min(o.distance,y))}}),t.length!==0&&e.sort((n,l)=>n.point===null!=(l.point===null)?n.point===null?1:-1:n.inFrustum!==l.inFrustum?n.inFrustum?1:-1:n.distance<0!=l.distance<0?n.distance<0?-1:1:l.distance-n.distance);e.length!==0&&performance.now()-s<i;){const n=e.pop();n.queued=!1,this._updateQuery(n)}e.length!==0&&this._scheduleRun()}_scheduleRun(){this.autoRun&&!this.scheduled&&(this.scheduled=!0,requestAnimationFrame(()=>{this.scheduled=!1,this._runJobs()}))}_updateQuery(e){T.ray.copy(e.ray),T.far="lat"in e?1e4+Math.max(...this.ellipsoid.radius):1/0;const t=T.intersectObjects(this.objects)[0]||null;t!==null&&(e.point===null?e.point=t.point.clone():e.point.copy(t.point)),e.callback(t)}addCamera(e){const{queryMap:t,cameras:i}=this;i.add(e),t.forEach(s=>this._enqueue(s))}deleteCamera(e){const{cameras:t}=this;t.delete(e)}runIfNeeded(e){const{queryMap:t,queued:i}=this,s=t.get(e);s.queued&&(this._updateQuery(s),s.queued=!1,i.splice(i.indexOf(s),1))}setScene(...e){const{observer:t}=this;t.dispose(),e.forEach(i=>t.observe(i)),this.objects=e,this._scheduleRun()}setEllipsoidFromTilesRenderer(e){const{queryMap:t,ellipsoid:i,frame:s}=this;(!i.radius.equals(e.ellipsoid.radius)||!s.equals(e.group.matrixWorld))&&(i.copy(e.ellipsoid),s.copy(e.group.matrixWorld),t.forEach(n=>{if("lat"in n){const{lat:l,lon:d,ray:r}=n;i.getCartographicToPosition(l,d,1e4,r.origin).applyMatrix4(s),i.getCartographicToNormal(l,d,r.direction).transformDirection(s).multiplyScalar(-1)}this._enqueue(n)}))}registerRayQuery(e,t){const i=this.index++,s={ray:e.clone(),callback:t,queued:!1,distance:-1,point:null};return this.queryMap.set(i,s),this._enqueue(s),i}registerLatLonQuery(e,t,i){const{ellipsoid:s,frame:n}=this,l=this.index++,d=new G;s.getCartographicToPosition(e,t,1e4,d.origin).applyMatrix4(n),s.getCartographicToNormal(e,t,d.direction).transformDirection(n).multiplyScalar(-1);const r={ray:d.clone(),lat:e,lon:t,callback:i,queued:!1,distance:-1,point:null};return this.queryMap.set(l,r),this._enqueue(r),l}unregisterQuery(e){const{queued:t,queryMap:i}=this,s=i.get(e);i.delete(e),s&&s.queued&&(s.queued=!1,t.splice(t.indexOf(s),1))}dispose(){this.queryMap.clear(),this.queued.length=0,this.objects.length=0,this.observer.dispose()}}const he=function(){const h=new g,e=new g,t=new g;return function(s,n,l){const d=s.start,r=h,o=n.start,p=e;t.subVectors(d,o),h.subVectors(s.end,s.start),e.subVectors(n.end,n.start);const y=t.dot(p),u=p.dot(r),m=p.dot(p),x=t.dot(r),f=r.dot(r)*m-u*u;let b,q;f!==0?b=(y*u-x*m)/f:b=0,q=(y+b*u)/m,l.x=b,l.y=q}}(),O=c.createContext(null),R=new S,_=new G,fe=c.forwardRef(function(e,t){const{interpolationFactor:i=.025,onQueryUpdate:s=null,...n}=e,l=c.useContext(I),d=c.useContext(O),r=w(({invalidate:x})=>x),o=c.useMemo(()=>new g,[]),p=c.useMemo(()=>({value:!1}),[]),y=c.useMemo(()=>({value:!1}),[]),u=c.useRef(null),m=c.useCallback(x=>{if(l===null||x===null||u.current===null)return;const{lat:v,lon:f,rayorigin:b,raydirection:q}=n;v!==null&&f!==null?(o.copy(x.point),y.value=!0,d.ellipsoid.getRotationMatrixFromAzElRoll(v,f,0,0,0,R,W).premultiply(l.group.matrixWorld),u.current.quaternion.setFromRotationMatrix(R),r()):b!==null&&q!==null&&(o.copy(x.point),y.value=!0,u.current.quaternion.identity(),r()),s&&s(x)},[r,y,d.ellipsoid,n,o,l,s]);return L((x,v)=>{if(u.current&&(u.current.visible=p.value),u.current&&y.value)if(p.value===!1)p.value=!0,u.current.position.copy(o);else{const f=1-2**(-v/i);u.current.position.distanceToSquared(o)>1e-6?(u.current.position.lerp(o,i===0?1:f),r()):u.current.position.copy(o)}}),a.jsx(ye,{ref:J(u,t),onQueryUpdate:m,...n})}),ye=c.forwardRef(function(e,t){const{component:i=a.jsx("group",{}),lat:s=null,lon:n=null,rayorigin:l=null,raydirection:d=null,onQueryUpdate:r=null,...o}=e,p=c.useRef(null),y=c.useContext(I),u=c.useContext(O),m=w(({invalidate:v})=>v),x=c.useMemo(()=>new g,[]);return c.useEffect(()=>{const v=f=>{r?r(f):y&&f!==null&&p.current!==null&&(s!==null&&n!==null?(p.current.position.copy(f.point),u.ellipsoid.getRotationMatrixFromAzElRoll(s,n,0,0,0,R,W).premultiply(y.group.matrixWorld),p.current.quaternion.setFromRotationMatrix(R),m()):l!==null&&d!==null&&(p.current.position.copy(f.point),p.current.quaternion.identity(),m()))};if(s!==null&&n!==null){const f=u.registerLatLonQuery(s,n,v);return()=>u.unregisterQuery(f)}else if(l!==null&&d!==null){_.origin.copy(l),_.direction.copy(d);const f=u.registerRayQuery(_,v);return()=>u.unregisterQuery(f)}},[s,n,l,d,u,y,m,x,r]),c.cloneElement(i,{...o,ref:J(p,t),raycast:()=>!1})}),xe=c.forwardRef(function(e,t){const i=w(({scene:p})=>p),{scene:s=i,children:n,...l}=e,d=c.useContext(I),r=c.useMemo(()=>new me,[]),o=w(({camera:p})=>p);return B(r,l),c.useEffect(()=>()=>r.dispose(),[r]),c.useEffect(()=>{r.setScene(...Array.isArray(s)?s:[s])},[r,s]),c.useEffect(()=>{r.addCamera(o)},[r,o]),L(()=>{d&&r.setEllipsoidFromTilesRenderer(d)}),Z(r,t),a.jsx(O.Provider,{value:r,children:a.jsx("group",{matrixAutoUpdate:!1,matrixWorldAutoUpdate:!1,children:n})})}),ve=new $().setDecoderPath("https://www.gstatic.com/draco/v1/decoders/"),A=new g,Q=new g;function ge(h){const e=c.useRef();return L(({camera:t})=>{const i=e.current;let s;t.isPerspectiveCamera?(A.setFromMatrixPosition(t.matrixWorld),Q.setFromMatrixPosition(i.matrixWorld),s=.05*A.distanceTo(Q)*Math.atan(t.fov*U.DEG2RAD)):s=(t.top-t.bottom)*.05/t.zoom,s=Math.min(Math.max(s,100),2e5),i.scale.setScalar(s*.5)}),a.jsxs(fe,{ref:e,...h,children:[a.jsxs("mesh",{"position-y":1.25,scale:.5,children:[a.jsx("sphereGeometry",{}),a.jsx("meshStandardMaterial",{color:16007990,emissive:16007990,emissiveIntensity:.25})]}),a.jsxs("mesh",{"position-y":.5,scale:[.1,1,.1],children:[a.jsx("cylinderGeometry",{}),a.jsx("meshStandardMaterial",{color:16007990,emissive:16007990,emissiveIntensity:.25})]})]})}function be(){const h={ortho:!1},e=new Array(500).fill().map((i,s)=>{const n=-Math.PI/2+Math.PI*s/500,l=s;return a.jsx(ge,{lat:n,lon:l,scale:.1},s)}),{ortho:t}=ee(h);return a.jsxs(K,{frameloop:"demand",camera:{position:[0,.5*1e7,1.5*1e7]},style:{width:"100%",height:"100%",position:"absolute",margin:0,left:0,top:0},flat:!0,children:[a.jsx("color",{attach:"background",args:[1118481]}),a.jsxs(X,{group:{rotation:[-Math.PI/2,0,0]},children:[a.jsx(M,{plugin:re,args:{apiToken:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MGNiODVmZS1hNzliLTQ5NWYtOTdhOS02ZmIzMmZlYWRlMzAiLCJpZCI6MjY3NzgzLCJpYXQiOjE3MzY0Mjg0MTJ9.o7EtbJyQ6yNAgfHFal1RS1BKKM-RmZNusqBCeiowNZo",assetId:"2275207",autoRefreshToken:!0}}),a.jsx(M,{plugin:oe,dracoLoader:ve}),a.jsx(M,{plugin:ae}),a.jsx(M,{plugin:le}),a.jsx(M,{plugin:ue}),a.jsx(H,{enableDamping:!0}),a.jsx(ie,{mode:t?"orthographic":"perspective"}),a.jsx(te,{}),a.jsx(se,{}),a.jsx(ne,{}),a.jsx(xe,{children:e})]}),a.jsx(de,{preset:"sunset",backgroundBlurriness:.9,environmentIntensity:1})]})}Y.createRoot(document.getElementById("root")).render(a.jsx(c.StrictMode,{children:a.jsx(be,{})}));
