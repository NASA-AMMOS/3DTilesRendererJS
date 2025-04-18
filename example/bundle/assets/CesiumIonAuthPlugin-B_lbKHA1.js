import{t as dt,P as pt}from"./TilesRenderer-LLyazNeZ.js";import{T as mt}from"./EPSGTilesPlugin-CqcTLREx.js";import{ba as ft,aj as gt,M as Lt,g as bt,l as tt,ak as K,p as Rt,J as yt,T as kt,bb as _t,w as vt,i as Y,an as xt}from"./three.module-Cdr6prlM.js";import{L as At}from"./readMagicBytes-BdIY7bqJ.js";import{E as Tt}from"./Ellipsoid-CuSwTtSS.js";class Ut{constructor(){this.creditsCount={}}_adjustAttributions(t,s){const e=this.creditsCount,n=t.split(/;/g);for(let h=0,d=n.length;h<d;h++){const p=n[h];p in e||(e[p]=0),e[p]+=s?1:-1,e[p]<=0&&delete e[p]}}addAttributions(t){this._adjustAttributions(t,!0)}removeAttributions(t){this._adjustAttributions(t,!1)}toString(){return Object.entries(this.creditsCount).sort((s,e)=>{const n=s[1];return e[1]-n}).map(s=>s[0]).join("; ")}}function it(P){let t=null;return dt(P,s=>{if(s.content&&s.content.uri){const[,e]=s.content.uri.split("?");return t=new URLSearchParams(e).get("session"),!0}return!1}),t}class wt{constructor({apiToken:t,autoRefreshToken:s=!1,logoUrl:e=null,useRecommendedSettings:n=!0}){this.name="GOOGLE_CLOUD_AUTH_PLUGIN",this.priority=-1/0,this.apiToken=t,this.autoRefreshToken=s,this.useRecommendedSettings=n,this.logoUrl=e,this.sessionToken=null,this.tiles=null,this._onLoadCallback=null,this._visibilityChangeCallback=null,this._tokenRefreshPromise=null,this._attributionsManager=new Ut,this._logoAttribution={value:"",type:"image",collapsible:!1},this._attribution={value:"",type:"string",collapsible:!0}}init(t){t!=null&&(t.resetFailedTiles(),t.rootURL==null&&(t.rootURL="https://tile.googleapis.com/v1/3dtiles/root.json"),this.useRecommendedSettings&&(t.parseQueue.maxJobs=10,t.downloadQueue.maxJobs=30,t.errorTarget=40),this.tiles=t,this._onLoadCallback=({tileSet:s})=>{this.sessionToken=it(s.root),t.removeEventListener("load-tile-set",this._onLoadCallback)},this._visibilityChangeCallback=({tile:s,visible:e})=>{const n=s.cached.metadata.asset.copyright||"";e?this._attributionsManager.addAttributions(n):this._attributionsManager.removeAttributions(n)},t.addEventListener("load-tile-set",this._onLoadCallback),t.addEventListener("tile-visibility-change",this._visibilityChangeCallback))}getAttributions(t){this.tiles.visibleTiles.size>0&&(this.logoUrl&&(this._logoAttribution.value=this.logoUrl,t.push(this._logoAttribution)),this._attribution.value=this._attributionsManager.toString(),t.push(this._attribution))}preprocessURL(t){return t=new URL(t),/^http/.test(t.protocol)&&(t.searchParams.append("key",this.apiToken),this.sessionToken!==null&&t.searchParams.append("session",this.sessionToken)),t.toString()}dispose(){const{tiles:t}=this;t.removeEventListener("load-tile-set",this._onLoadCallback),t.removeEventListener("tile-visibility-change",this._visibilityChangeCallback)}async fetchData(t,s){this._tokenRefreshPromise!==null&&(await this._tokenRefreshPromise,t=this.preprocessURL(t));const e=await fetch(t,s);return e.status>=400&&e.status<=499&&this.autoRefreshToken?(await this._refreshToken(s),fetch(this.preprocessURL(t),s)):e}_refreshToken(t){if(this._tokenRefreshPromise===null){const s=new URL(this.tiles.rootURL);s.searchParams.append("key",this.apiToken),this._tokenRefreshPromise=fetch(s,t).then(e=>e.json()).then(e=>{this.sessionToken=it(e.root),this._tokenRefreshPromise=null}),this._tokenRefreshPromise.catch(e=>{this.tiles.dispatchEvent({type:"load-error",tile:null,error:e,rootURL:s})})}return this._tokenRefreshPromise}}function st(P){return P>>1^-(P&1)}class Pt extends At{constructor(...t){super(...t),this.fetchOptions.header={Accept:"application/vnd.quantized-mesh,application/octet-stream;q=0.9"}}loadAsync(...t){const{fetchOptions:s}=this;return s.header=s.header||{},s.header.Accept="application/vnd.quantized-mesh,application/octet-stream;q=0.9",s.header.Accept+=";extensions=octvertexnormals-watermask-metadata",super.loadAsync(...t)}parse(t){let s=0;const e=new DataView(t),n=()=>{const o=e.getFloat64(s,!0);return s+=8,o},h=()=>{const o=e.getFloat32(s,!0);return s+=4,o},d=()=>{const o=e.getUint32(s,!0);return s+=4,o},p=()=>{const o=e.getUint8(s);return s+=1,o},a=(o,v)=>{const I=new v(t,s,o);return s+=o*v.BYTES_PER_ELEMENT,I},x={center:[n(),n(),n()],minHeight:h(),maxHeight:h(),sphereCenter:[n(),n(),n()],sphereRadius:n(),horizonOcclusionPoint:[n(),n(),n()]},l=d(),_=a(l,Uint16Array),u=a(l,Uint16Array),S=a(l,Uint16Array),k=new Float32Array(l),L=new Float32Array(l),M=new Float32Array(l);let z=0,D=0,$=0;const b=32767;for(let o=0;o<l;++o)z+=st(_[o]),D+=st(u[o]),$+=st(S[o]),k[o]=z/b,L[o]=D/b,M[o]=$/b;const O=l>65536,E=O?Uint32Array:Uint16Array;O?s=Math.ceil(s/4)*4:s=Math.ceil(s/2)*2;const V=d(),X=a(V*3,E);let J=0;for(var G=0;G<X.length;++G){const o=X[G];X[G]=J-o,o===0&&++J}const Q=(o,v)=>L[v]-L[o],i=(o,v)=>-Q(o,v),r=(o,v)=>k[o]-k[v],R=(o,v)=>-r(o,v),A=d(),m=a(A,E);m.sort(Q);const U=d(),w=a(U,E);w.sort(r);const y=d(),f=a(y,E);f.sort(i);const c=d(),T=a(c,E);T.sort(R);const B={westIndices:m,southIndices:w,eastIndices:f,northIndices:T},H={};for(;s<e.byteLength;){const o=p(),v=d();if(o===1){const I=a(l*2,Uint8Array),N=new Float32Array(l*3);for(let C=0;C<l;C++){let j=I[2*C+0]/255*2-1,q=I[2*C+1]/255*2-1;const Z=1-(Math.abs(j)+Math.abs(q));if(Z<0){const ot=j;j=(1-Math.abs(q))*rt(ot),q=(1-Math.abs(ot))*rt(q)}const et=Math.sqrt(j*j+q*q+Z*Z);N[3*C+0]=j/et,N[3*C+1]=q/et,N[3*C+2]=Z/et}H.octvertexnormals={extensionId:o,normals:N}}else if(o===2){const I=v===1?1:256,N=a(I*I,Uint8Array);H.watermask={extensionId:o,mask:N,size:I}}else if(o===4){const I=d(),N=a(I,Uint8Array),C=new TextDecoder().decode(N);H.metadata={extensionId:o,json:JSON.parse(C)}}}return{header:x,indices:X,vertexData:{u:k,v:L,height:M},edgeIndices:B,extensions:H}}}function rt(P){return P<0?-1:1}const at=new tt,W=new xt,g=new tt,F=new tt;class St extends Pt{constructor(t=ft){super(),this.manager=t,this.ellipsoid=new Tt,this.skirtLength=1e3,this.smoothSkirtNormals=!0,this.solid=!1,this.minLat=-Math.PI/2,this.maxLat=Math.PI/2,this.minLon=-Math.PI,this.maxLon=Math.PI}parse(t){const{ellipsoid:s,solid:e,skirtLength:n,smoothSkirtNormals:h,minLat:d,maxLat:p,minLon:a,maxLon:x}=this,{header:l,indices:_,vertexData:u,edgeIndices:S,extensions:k}=super.parse(t),L=new gt,M=new Lt,z=new bt(L,M);z.position.set(...l.center);const D="octvertexnormals"in k,$=u.u.length,b=[],O=[],E=[],V=[];for(let i=0;i<$;i++)J(i,g),G(g.x,g.y,g.z,F),O.push(g.x,g.y),b.push(...F);for(let i=0,r=_.length;i<r;i++)E.push(_[i]);if(D){const i=k.octvertexnormals.normals;for(let r=0,R=i.length;r<R;r++)V.push(i[r])}if(e){const i=b.length/3;for(let r=0;r<$;r++)J(r,g),G(g.x,g.y,g.z,F,-n),O.push(g.x,g.y),b.push(...F);for(let r=_.length-1;r>=0;r--)E.push(_[r]+i);if(D){const r=k.octvertexnormals.normals;for(let R=0,A=r.length;R<A;R++)V.push(-r[R])}}if(n>0){const{westIndices:i,eastIndices:r,southIndices:R,northIndices:A}=S;let m;const U=Q(i);m=b.length/3,O.push(...U.uv),b.push(...U.positions);for(let c=0,T=U.indices.length;c<T;c++)E.push(U.indices[c]+m);const w=Q(r);m=b.length/3,O.push(...w.uv),b.push(...w.positions);for(let c=0,T=w.indices.length;c<T;c++)E.push(w.indices[c]+m);const y=Q(R);m=b.length/3,O.push(...y.uv),b.push(...y.positions);for(let c=0,T=y.indices.length;c<T;c++)E.push(y.indices[c]+m);const f=Q(A);m=b.length/3,O.push(...f.uv),b.push(...f.positions);for(let c=0,T=f.indices.length;c<T;c++)E.push(f.indices[c]+m);D&&(V.push(...U.normals),V.push(...w.normals),V.push(...y.normals),V.push(...f.normals))}for(let i=0,r=b.length;i<r;i+=3)b[i+0]-=l.center[0],b[i+1]-=l.center[1],b[i+2]-=l.center[2];const X=b.length/3>65535?new Uint32Array(E):new Uint16Array(E);if(L.setIndex(new K(X,1,!1)),L.setAttribute("position",new K(new Float32Array(b),3,!1)),L.setAttribute("uv",new K(new Float32Array(O),2,!1)),D&&L.setAttribute("normal",new K(new Float32Array(V),3,!1)),"watermask"in k){const{mask:i,size:r}=k.watermask,R=new Uint8Array(2*r*r);for(let m=0,U=i.length;m<U;m++){const w=i[m]===255?0:255;R[2*m+0]=w,R[2*m+1]=w}const A=new Rt(R,r,r,yt,kt);A.flipY=!0,A.minFilter=_t,A.magFilter=vt,A.needsUpdate=!0,M.roughnessMap=A}return z.userData.minHeight=l.minHeight,z.userData.maxHeight=l.maxHeight,"metadata"in k&&(z.userData.metadata=k.metadata.json),z;function J(i,r){return r.x=u.u[i],r.y=u.v[i],r.z=u.height[i],r}function G(i,r,R,A,m=0){const U=Y.lerp(l.minHeight,l.maxHeight,R),w=Y.lerp(a,x,i),y=Y.lerp(d,p,r);return s.getCartographicToPosition(y,w,U+m,A),A}function Q(i){const r=[],R=[],A=[],m=[],U=[];for(let f=0,c=i.length;f<c;f++)J(i[f],g),r.push(g.x,g.y),A.push(g.x,g.y),G(g.x,g.y,g.z,F),R.push(...F),G(g.x,g.y,g.z,F,-n),m.push(...F);const w=i.length-1;for(let f=0;f<w;f++){const c=f,T=f+1,B=f+i.length,H=f+i.length+1;U.push(c,B,T),U.push(T,B,H)}let y=null;if(D){const f=(R.length+m.length)/3;if(h){y=new Array(f*3);const c=k.octvertexnormals.normals,T=y.length/2;for(let B=0,H=f/2;B<H;B++){const o=i[B],v=3*B,I=c[3*o+0],N=c[3*o+1],C=c[3*o+2];y[v+0]=I,y[v+1]=N,y[v+2]=C,y[T+v+0]=I,y[T+v+1]=N,y[T+v+2]=C}}else{y=[],W.a.fromArray(R,0),W.b.fromArray(m,0),W.c.fromArray(R,3),W.getNormal(at);for(let c=0;c<f;c++)y.push(...at)}}return{uv:[...r,...A],positions:[...R,...m],indices:U,normals:y}}}}const lt=Symbol("TILE_X"),ht=Symbol("TILE_Y"),nt=Symbol("TILE_LEVEL"),ct=1e5,ut=new tt;function Et(P,t,s,e){const{minzoom:n,maxzoom:h,available:d}=P;if(t>=n&&t<=h&&t<d.length){const p=d[t];for(let a=0,x=p.length;a<x;a++){const{startX:l,startY:_,endX:u,endY:S}=p[a];if(s>=l&&s<=u&&e>=_&&e<=S)return!0}}return!1}class It{get maxLevel(){return this.layer.available.length}constructor({useRecommendedSettings:t=!0,skirtLength:s=1e3,smoothSkirtNormals:e=!0,solid:n=!1}){this.name="QUANTIZED_MESH_PLUGIN",this.tiles=null,this.layer=null,this.processQueue=null,this.useRecommendedSettings=t,this.skirtLength=s,this.smoothSkirtNormals=e,this.solid=n,this.needsUpdate=!0}init(t){const s=new pt;s.priorityCallback=t.downloadQueue.priorityCallback,s.maxJobs=20,t.fetchOptions.header=t.fetchOptions.header||{},t.fetchOptions.header.Accept="application/vnd.quantized-mesh,application/octet-stream;q=0.9",this.useRecommendedSettings&&(t.errorTarget=2),this.tiles=t,this.processQueue=s,this.processCallback=e=>{const n=e[nt],h=e[lt],d=e[ht],[p,a,x,l,_,u]=e.boundingVolume.region,S=(x-p)/2,k=(l-a)/2;for(let L=0;L<2;L++)for(let M=0;M<2;M++){const z=[p+S*L,a+k*M,p+S*L+S,a+k*M+k,_,u],D=this.expand(n+1,2*h+L,2*d+M,z);D&&e.children.push(D)}}}preprocessNode(t,s,e){const{maxLevel:n}=this;t[nt]<n&&(this.processQueue.add(t,this.processCallback),this.needsUpdate=!0)}loadRootTileSet(){const{tiles:t}=this;let s=new URL("layer.json",t.rootURL);return t.invokeAllPlugins(e=>s=e.preprocessURL?e.preprocessURL(s,null):s),t.invokeOnePlugin(e=>e.fetchData&&e.fetchData(s,this.tiles.fetchOptions)).then(e=>e.json()).then(e=>{this.layer=e,e.extensions.length>0&&(t.fetchOptions.header.Accept+=`;extensions=${e.extensions.join("-")}`);const{bounds:n}=e,h=Y.DEG2RAD*n[0],d=Y.DEG2RAD*n[1],p=Y.DEG2RAD*n[2],a=Y.DEG2RAD*n[3],x={asset:{version:"1.1"},geometricError:1/0,root:{refine:"REPLACE",geometricError:1/0,boundingVolume:{region:[h,d,p,a,-1e5,ct]},children:[]}},l=e.projection==="EPSG:4326"?2:1;for(let u=0;u<l;u++){const S=(p-h)/l,k=[h+S*u,d,h+S*u+S,a,-1e5,ct],L=this.expand(0,u,0,k);L&&x.root.children.push(L)}let _=t.rootURL;return t.invokeAllPlugins(u=>_=u.preprocessURL?u.preprocessURL(_,null):_),this.tiles.preprocessTileSet(x,_),x})}expand(t,s,e,n){if(!Et(this.layer,t,s,e))return null;const h=this.layer.tiles[0].replace(/{\s*z\s*}/g,t).replace(/{\s*x\s*}/g,s).replace(/{\s*y\s*}/g,e).replace(/{\s*version\s*}/g,1),{tiles:d}=this,p=d.ellipsoid,[,a,,x,,l]=n,_=a>0!=x>0?0:Math.min(Math.abs(a),Math.abs(x));p.getCartographicToPosition(_,0,l,ut),ut.z=0;const u=this.layer.projection==="EPSG:4326"?2:1,L=Math.max(...p.radius)*2*Math.PI*.25/(65*u)/2**t;return{[nt]:t,[lt]:s,[ht]:e,refine:"REPLACE",geometricError:L,boundingVolume:{region:n},content:{uri:h},children:[]}}doTilesNeedUpdate(){return this.needsUpdate?(this.needsUpdate=!1,!0):null}parseToMesh(t,s){const e=this.tiles.ellipsoid,[n,h,d,p]=s.boundingVolume.region,a=new St(this.tiles.manager);a.minLat=h,a.maxLat=p,a.minLon=n,a.maxLon=d,a.ellipsoid.copy(e),a.solid=this.solid,a.smoothSkirtNormals=this.smoothSkirtNormals,a.skirtLength=this.skirtLength;const x=a.parse(t),{minHeight:l,maxHeight:_,metadata:u}=x.userData;return s.boundingVolume.region[4]=l,s.boundingVolume.region[5]=_,s.cached.boundingVolume.setRegionData(e,...s.boundingVolume.region),u&&"geometricerror"in u&&(s.geometricError=u.geometricerror),x}}class Ot{constructor({apiToken:t,assetId:s=null,autoRefreshToken:e=!1,useRecommendedSettings:n=!0}){this.name="CESIUM_ION_AUTH_PLUGIN",this.priority=-1/0,this.apiToken=t,this.assetId=s,this.autoRefreshToken=e,this.useRecommendedSettings=n,this.tiles=null,this.endpointURL=null,this._bearerToken=null,this._tileSetVersion=-1,this._tokenRefreshPromise=null,this._attributions=[],this._disposed=!1}init(t){this.assetId!==null&&(t.rootURL=`https://api.cesium.com/v1/assets/${this.assetId}/endpoint`),this.tiles=t,this.endpointURL=t.rootURL,t.resetFailedTiles()}loadRootTileSet(){return this._refreshToken().then(()=>this.tiles.invokeOnePlugin(t=>t!==this&&t.loadRootTileSet&&t.loadRootTileSet()))}preprocessURL(t){return t=new URL(t),/^http/.test(t.protocol)&&this._tileSetVersion!=-1&&t.searchParams.append("v",this._tileSetVersion),t.toString()}fetchData(t,s){return this.tiles.getPluginByName("GOOGLE_CLOUD_AUTH_PLUGIN")!==null?null:Promise.resolve().then(async()=>{this._tokenRefreshPromise!==null&&(await this._tokenRefreshPromise,t=this.preprocessURL(t));const n=await fetch(t,s);return n.status>=400&&n.status<=499&&this.autoRefreshToken?(await this._refreshToken(s),fetch(this.preprocessURL(t),s)):n})}getAttributions(t){this.tiles.visibleTiles.size>0&&t.push(...this._attributions)}_refreshToken(t){if(this._tokenRefreshPromise===null){const s=new URL(this.endpointURL);s.searchParams.append("access_token",this.apiToken),this._tokenRefreshPromise=fetch(s,t).then(e=>{if(this._disposed)return null;if(!e.ok)throw new Error(`CesiumIonAuthPlugin: Failed to load data with error code ${e.status}`);return e.json()}).then(e=>{if(this._disposed)return null;const n=this.tiles;if("externalType"in e){const h=new URL(e.options.url);n.rootURL=e.options.url,n.registerPlugin(new wt({apiToken:h.searchParams.get("key"),autoRefreshToken:this.autoRefreshToken,useRecommendedSettings:this.useRecommendedSettings}))}else{if(e.type==="TERRAIN"?n.registerPlugin(new It({useRecommendedSettings:this.useRecommendedSettings})):e.type==="IMAGERY"&&n.registerPlugin(new mt({useRecommendedSettings:this.useRecommendedSettings,shape:"ellipsoid"})),n.rootURL=e.url,n.fetchOptions.headers=n.fetchOptions.headers||{},n.fetchOptions.headers.Authorization=`Bearer ${e.accessToken}`,s.searchParams.has("v")&&this._tileSetVersion===-1){const h=new URL(e.url);this._tileSetVersion=h.searchParams.get("v")}this._bearerToken=e.accessToken,e.attributions&&(this._attributions=e.attributions.map(h=>({value:h.html,type:"html",collapsible:h.collapsible})))}return this._tokenRefreshPromise=null,e}),this._tokenRefreshPromise.catch(e=>{this.tiles.dispatchEvent({type:"load-error",tile:null,error:e,url:s})})}return this._tokenRefreshPromise}dispose(){this._disposed=!0}}export{Ot as C};
