import{h as Z,aQ as ee,M as w,O as te,C as J,b as ne,V as X,aI as ie,n as G,o as P,aH as H,B as K,ap as ae,an as se,aF as re,N as oe}from"./three.module-BRzIKhn7.js";import{P as le,g as he,a as $}from"./TilesRenderer-JSWrQuNP.js";import{G as ce,C as ue}from"./GeometryClipper-CL6vEbWl.js";import{X as j,P as fe,T as de}from"./TMSImageSource-0vpFd7Vc.js";import{T as me}from"./TiledImageSource-DQOUXiqO.js";import{W as pe}from"./I3DMLoader-D7nZYJeq.js";const ge=new te,ye=new J;class _e{constructor(e){this.renderer=e,this.renderTarget=null,this.range=[0,0,1,1],this.quad=new Z(new ee,new Ie)}setRenderTarget(e,n){this.renderTarget=e,this.range=[...n]}draw(e,n){const{range:t,renderer:i,quad:r,renderTarget:a}=this,s=r.material;s.map=e,s.minRange.x=w.mapLinear(n[0],t[0],t[2],-1,1),s.minRange.y=w.mapLinear(n[1],t[1],t[3],-1,1),s.maxRange.x=w.mapLinear(n[2],t[0],t[2],-1,1),s.maxRange.y=w.mapLinear(n[3],t[1],t[3],-1,1);const o=i.getRenderTarget(),h=i.autoClear;i.autoClear=!1,i.setRenderTarget(a),i.render(r,ge),i.setRenderTarget(o),i.autoClear=h,s.map=null}clear(e,n=1){const{renderer:t,renderTarget:i}=this,r=t.getRenderTarget(),a=t.getClearColor(ye),s=t.getClearAlpha();t.setClearColor(e,n),t.setRenderTarget(i),t.clear(),t.setRenderTarget(r),t.setClearColor(a,s)}dispose(){this.quad.material.dispose(),this.quad.geometry.dispose()}}class Ie extends ne{get minRange(){return this.uniforms.minRange.value}get maxRange(){return this.uniforms.maxRange.value}get map(){return this.uniforms.map.value}set map(e){this.uniforms.map.value=e}constructor(){super({depthWrite:!1,depthTest:!1,transparent:!1,side:ie,premultipliedAlpha:!0,uniforms:{map:{value:null},minRange:{value:new X},maxRange:{value:new X}},vertexShader:`

				uniform vec2 minRange;
				uniform vec2 maxRange;
				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = vec4( mix( minRange, maxRange, uv ), 0, 1 );

				}

			`,fragmentShader:`

				uniform sampler2D map;
				uniform vec2 minRange;
				uniform vec2 maxRange;
				varying vec2 vUv;

				void main() {

					// sample the texture
					gl_FragColor = texture( map, vUv );
					#include <premultiplied_alpha_fragment>

				}

			`})}}class ve extends j{constructor(e={}){const{subdomains:n=["t0"],...t}=e;super(t),this.subdomains=n,this.subDomainIndex=0}getUrl(e,n,t){return this.url.replace(/{\s*subdomain\s*}/gi,this._getSubdomain()).replace(/{\s*quadkey\s*}/gi,this._tileToQuadKey(e,n,t))}_tileToQuadKey(e,n,t){let i="";for(let r=t;r>0;r--){let a=0;const s=1<<r-1;(e&s)!==0&&(a+=1),(n&s)!==0&&(a+=2),i+=a.toString()}return i}_getSubdomain(){return this.subDomainIndex=(this.subDomainIndex+1)%this.subdomains.length,this.subdomains[this.subDomainIndex]}}function N(g,e,n,t,i){let[r,a,s,o]=g;a+=1e-8,r+=1e-8,o-=1e-8,s-=1e-8;const h=Math.max(Math.min(e,n.maxLevel),n.minLevel),[c,l,f,d]=n.getTilesInRange(r,a,s,o,h,t);for(let u=c;u<=f;u++)for(let m=l;m<=d;m++)i(u,m,h)}function Le(g,e,n){const t=new P,i={},r=[],a=g.getAttribute("position");g.computeBoundingBox(),g.boundingBox.getCenter(t).applyMatrix4(e),n.getPositionToCartographic(t,i);const s=i.lat,o=i.lon;let h=1/0,c=1/0,l=1/0,f=-1/0,d=-1/0,u=-1/0;for(let p=0;p<a.count;p++)t.fromBufferAttribute(a,p).applyMatrix4(e),n.getPositionToCartographic(t,i),Math.abs(Math.abs(i.lat)-Math.PI/2)<1e-5&&(i.lon=o),Math.abs(o-i.lon)>Math.PI&&(i.lon+=Math.sign(o-i.lon)*Math.PI*2),Math.abs(s-i.lat)>Math.PI&&(i.lat+=Math.sign(s-i.lat)*Math.PI*2),r.push(i.lon,i.lat,i.height),h=Math.min(h,i.lat),f=Math.max(f,i.lat),c=Math.min(c,i.lon),d=Math.max(d,i.lon),l=Math.min(l,i.height),u=Math.max(u,i.height);const m=[c,h,d,f],_=[...m,l,u];return{uv:r,range:m,region:_}}function Q(g,e,n=null,t=null){let i=1/0,r=1/0,a=1/0,s=-1/0,o=-1/0,h=-1/0;const c=[],l=new G;g.forEach(d=>{l.copy(d.matrixWorld),n&&l.premultiply(n);const{uv:u,region:m}=Le(d.geometry,l,e);c.push(u),i=Math.min(i,m[1]),s=Math.max(s,m[3]),r=Math.min(r,m[0]),o=Math.max(o,m[2]),a=Math.min(a,m[4]),h=Math.max(h,m[5])});let f=[r,i,o,s];if(t!==null){f=t.clampToProjectionBounds([r,i,o,s]);const[d,u,m,_]=t.toNormalizedRange(f);c.forEach(p=>{for(let I=0,M=p.length;I<M;I+=3){const x=p[I+0],R=p[I+1],v=p[I+2],[L,y]=t.toNormalizedPoint(x,R);p[I+0]=w.mapLinear(L,d,m,0,1),p[I+1]=w.mapLinear(y,u,_,0,1),p[I+2]=w.mapLinear(v,a,h,0,1)}})}return{uvs:c,range:f,region:[r,i,o,s,a,h]}}function xe(g,e,n){const t=new P,i=[],r=g.getAttribute("position");let a=1/0,s=1/0,o=1/0,h=-1/0,c=-1/0,l=-1/0;for(let d=0;d<r.count;d++)t.fromBufferAttribute(r,d).applyMatrix4(e),t.x/=n,i.push(t.x,t.y,t.z),a=Math.min(a,t.x),h=Math.max(h,t.x),s=Math.min(s,t.y),c=Math.max(c,t.y),o=Math.min(o,t.z),l=Math.max(l,t.z);return{uv:i,range:[a,s,h,c],heightRange:[o,l]}}function Re(g,e,n){let t=1/0,i=1/0,r=1/0,a=-1/0,s=-1/0,o=-1/0;const h=[],c=new G;return g.forEach(l=>{c.copy(l.matrixWorld),e&&c.premultiply(e);const{uv:f,range:d,heightRange:u}=xe(l.geometry,c,n.aspectRatio);h.push(f),t=Math.min(t,d[0]),a=Math.max(a,d[2]),i=Math.min(i,d[1]),s=Math.max(s,d[3]),r=Math.min(r,u[0]),o=Math.max(o,u[1])}),h.forEach(l=>{for(let f=0,d=l.length;f<d;f+=3){const u=l[f+0],m=l[f+1];l[f+0]=w.mapLinear(u,t,a,0,1),l[f+1]=w.mapLinear(m,i,s,0,1)}}),{uvs:h,range:[t,i,a,s],heightRange:[r,o]}}const V=Symbol("OVERLAY_PARAMS");function Me(g,e){if(g[V])return g[V];const n={layerMaps:{value:[]},layerInfo:{value:[]}};return g[V]=n,g.defines={...g.defines||{},LAYER_COUNT:0},g.onBeforeCompile=t=>{e&&e(t),t.uniforms={...t.uniforms,...n},t.vertexShader=t.vertexShader.replace(/void main\(\s*\)\s*{/,i=>`

				#pragma unroll_loop_start
					for ( int i = 0; i < 10; i ++ ) {

						#if UNROLLED_LOOP_INDEX < LAYER_COUNT

							attribute vec3 layer_uv_UNROLLED_LOOP_INDEX;
							varying vec3 v_layer_uv_UNROLLED_LOOP_INDEX;

						#endif


					}
				#pragma unroll_loop_end

				${i}

				#pragma unroll_loop_start
					for ( int i = 0; i < 10; i ++ ) {

						#if UNROLLED_LOOP_INDEX < LAYER_COUNT

							v_layer_uv_UNROLLED_LOOP_INDEX = layer_uv_UNROLLED_LOOP_INDEX;

						#endif

					}
				#pragma unroll_loop_end

			`),t.fragmentShader=t.fragmentShader.replace(/void main\(/,i=>`

				#if LAYER_COUNT != 0
					struct LayerInfo {
						vec3 color;
						float opacity;

						int alphaMask;
						int alphaInvert;
					};

					uniform sampler2D layerMaps[ LAYER_COUNT ];
					uniform LayerInfo layerInfo[ LAYER_COUNT ];
				#endif

				#pragma unroll_loop_start
					for ( int i = 0; i < 10; i ++ ) {

						#if UNROLLED_LOOP_INDEX < LAYER_COUNT

							varying vec3 v_layer_uv_UNROLLED_LOOP_INDEX;

						#endif

					}
				#pragma unroll_loop_end

				${i}

			`).replace(/#include <color_fragment>/,i=>`

				${i}

				#if LAYER_COUNT != 0
				{
					vec4 tint;
					vec3 layerUV;
					float layerOpacity;
					float wOpacity;
					float wDelta;
					#pragma unroll_loop_start
						for ( int i = 0; i < 10; i ++ ) {

							#if UNROLLED_LOOP_INDEX < LAYER_COUNT

								layerUV = v_layer_uv_UNROLLED_LOOP_INDEX;
								tint = texture( layerMaps[ i ], layerUV.xy );

								// discard texture outside 0, 1 on w - offset the stepped value by an epsilon to avoid cases
								// where wDelta is near 0 (eg a flat surface) at the w boundary, resulting in artifacts on some
								// hardware.
								wDelta = max( fwidth( layerUV.z ), 1e-7 );
								wOpacity =
									smoothstep( - wDelta, 0.0, layerUV.z ) *
									smoothstep( 1.0 + wDelta, 1.0, layerUV.z );

								// apply tint & opacity
								tint.rgb *= layerInfo[ i ].color;
								tint.rgba *= layerInfo[ i ].opacity * wOpacity;

								// invert the alpha
								if ( layerInfo[ i ].alphaInvert > 0 ) {

									tint.a = 1.0 - tint.a;

								}

								// apply the alpha across all existing layers if alpha mask is true
								if ( layerInfo[ i ].alphaMask > 0 ) {

									diffuseColor.a *= tint.a;

								} else {

									// premultiplied alpha equation
									diffuseColor = tint + diffuseColor * ( 1.0 - tint.a );

								}

							#endif

						}
					#pragma unroll_loop_end
				}
				#endif
			`)},n}const F=new P,D=new P;function Te(g,e,n){g.getCartographicToPosition(e,n,0,F),g.getCartographicToPosition(e+.01,n,0,D);const i=F.distanceTo(D);return g.getCartographicToPosition(e,n+.01,0,D),F.distanceTo(D)/i}class we extends me{constructor({geojson:e=null,url:n=null,tileDimension:t=256,levels:i=20,pointRadius:r=6,strokeStyle:a="white",strokeWidth:s=2,fillStyle:o="rgba( 255, 255, 255, 0.5 )",...h}={}){super(h),this.geojson=e,this.url=n,this.tileDimension=t,this.levels=i,this.pointRadius=r,this.strokeStyle=a,this.strokeWidth=s,this.fillStyle=o}async init(){const{tiling:e,levels:n,tileDimension:t,geojson:i,url:r}=this,a=new fe;if(e.setProjection(a),e.setContentBounds(...a.getBounds()),e.generateLevels(n,a.tileCountX,a.tileCountY,{tilePixelWidth:t,tilePixelHeight:t}),!i&&r){const o=await this.fetchData(r);this.geojson=await o.json()}const s=this._geoJSONBounds(50).map(o=>o*w.DEG2RAD);this.tiling.setContentBounds(...s)}async fetchItem(e,n){return this.drawCanvasImage(e)}drawCanvasImage(e){const{tiling:n,tileDimension:t,geojson:i}=this,[r,a,s]=e,o=n.getTileBounds(r,a,s,!1,!1).map(d=>w.RAD2DEG*d),h=document.createElement("canvas");h.width=t,h.height=t;const c=h.getContext("2d"),l=this._featuresFromGeoJSON(i);for(let d=0;d<l.length;d++){const u=l[d];this._featureIntersectsTile(u,o)&&this._drawFeatureOnCanvas(c,u,o,h.width,h.height)}const f=new H(h);return f.needsUpdate=!0,f}_featureIntersectsTile(e,n){const t=this._getFeatureBounds(e);if(!t)return!1;const[i,r,a,s]=t,[o,h,c,l]=n;return!(a<o||i>c||s<h||r>l)}_getFeatureBounds(e){const{geometry:n}=e;if(!n)return null;const{type:t,coordinates:i}=n;let r=1/0,a=1/0,s=-1/0,o=-1/0;const h=(c,l)=>{r=Math.min(r,c),s=Math.max(s,c),a=Math.min(a,l),o=Math.max(o,l)};return t==="Point"?h(i[0],i[1]):t==="MultiPoint"||t==="LineString"?i.forEach(c=>h(c[0],c[1])):t==="MultiLineString"||t==="Polygon"?i.forEach(c=>c.forEach(l=>h(l[0],l[1]))):t==="MultiPolygon"&&i.forEach(c=>c.forEach(l=>l.forEach(f=>h(f[0],f[1])))),[r,a,s,o]}_featuresFromGeoJSON(e){const n=e.type,t=new Set(["Point","MultiPoint","LineString","MultiLineString","Polygon","MultiPolygon"]);return n==="FeatureCollection"?e.features:n==="Feature"?[e]:n==="GeometryCollection"?e.geometries.map(i=>({type:"Feature",geometry:i,properties:{}})):t.has(n)?[{type:"Feature",geometry:e,properties:{}}]:[]}_drawFeatureOnCanvas(e,n,t,i,r){const{geometry:a=null,properties:s={}}=n;if(!a)return;const[o,h,c,l]=t,f=s.strokeStyle||this.strokeStyle,d=s.fillStyle||this.fillStyle,u=s.pointRadius||this.pointRadius,m=s.strokeWidth||this.strokeWidth;e.save(),e.strokeStyle=f,e.fillStyle=d,e.lineWidth=m;const _=new Array(2),p=(x,R,v=_)=>{const L=w.mapLinear(x,o,c,0,i),y=r-w.mapLinear(R,h,l,0,r);return v[0]=Math.round(L),v[1]=Math.round(y),v},I=(x,R)=>{const v=R*w.DEG2RAD,L=x*w.DEG2RAD,y=(l-h)/r;return(c-o)/i/y*Te(pe,v,L)},M=a.type;if(M==="Point"){const[x,R]=a.coordinates,[v,L]=p(x,R),y=I(x,R);e.beginPath(),e.ellipse(v,L,u/y,u,0,0,Math.PI*2),e.fill(),e.stroke()}else M==="MultiPoint"?a.coordinates.forEach(([x,R])=>{const[v,L]=p(x,R),y=I(x,R);e.beginPath(),e.ellipse(v,L,u/y,u,0,0,Math.PI*2),e.fill(),e.stroke()}):M==="LineString"?(e.beginPath(),a.coordinates.forEach(([x,R],v)=>{const[L,y]=p(x,R);v===0?e.moveTo(L,y):e.lineTo(L,y)}),e.stroke()):M==="MultiLineString"?(e.beginPath(),a.coordinates.forEach(x=>{x.forEach(([R,v],L)=>{const[y,T]=p(R,v);L===0?e.moveTo(y,T):e.lineTo(y,T)})}),e.stroke()):M==="Polygon"?(e.beginPath(),a.coordinates.forEach((x,R)=>{x.forEach(([v,L],y)=>{const[T,S]=p(v,L);y===0?e.moveTo(T,S):e.lineTo(T,S)}),e.closePath()}),e.fill("evenodd"),e.stroke()):M==="MultiPolygon"&&a.coordinates.forEach(x=>{e.beginPath(),x.forEach((R,v)=>{R.forEach(([L,y],T)=>{const[S,b]=p(L,y);T===0?e.moveTo(S,b):e.lineTo(S,b)}),e.closePath()}),e.fill("evenodd"),e.stroke()});e.restore()}_geoJSONBounds(){const e=this._featuresFromGeoJSON(this.geojson);let n=1/0,t=1/0,i=-1/0,r=-1/0;return e.forEach(a=>{const[s,o,h,c]=this._getFeatureBounds(a);n=Math.min(n,s),t=Math.min(t,o),i=Math.max(i,h),r=Math.max(r,c)}),[n,t,i,r]}}const A=new G,U=new P,Y=new P,W=new P,E=new P,Se=new K,q=Symbol("SPLIT_TILE_DATA"),k=Symbol("SPLIT_HASH");function C(g,e,n,t){if(Array.isArray(n)){const r=n.map(a=>C(g,e,a,t)).filter(a=>a!==null);return r.length===0?null:Promise.all(r)}if(n.isReady)return i();return n.whenReady().then(i);function i(){const r=[],{imageSource:a,tiling:s}=n;N(g,e,s,n.isPlanarProjection,(h,c,l)=>{t?a.release(h,c,l):r.push(a.lock(h,c,l))});const o=r.filter(h=>h instanceof Promise);return o.length!==0?Promise.all(o):null}}function be(g,e,n){let t=0;return N(g,e,n.tiling,n.isPlanarProjection,(i,r,a)=>{t++}),t}class Ue{get enableTileSplitting(){return this._enableTileSplitting}set enableTileSplitting(e){this._enableTileSplitting!==e&&(this._enableTileSplitting=e,this._markNeedsUpdate())}constructor(e={}){const{overlays:n=[],resolution:t=256,renderer:i=null,enableTileSplitting:r=!0}=e;this.name="IMAGE_OVERLAY_PLUGIN",this.priority=-15,this.renderer=i,this.resolution=t,this._enableTileSplitting=r,this.overlays=[],this.needsUpdate=!1,this.tiles=null,this.tileComposer=null,this.tileControllers=new Map,this.overlayInfo=new Map,this.usedTextures=new Set,this.meshParams=new WeakMap,this.pendingTiles=new Map,this.processedTiles=new Set,this.processQueue=null,this._onUpdateAfter=null,this._onTileDownloadStart=null,this._cleanupScheduled=!1,this._virtualChildResetId=0,this._bytesUsed=new WeakMap,n.forEach(a=>{this.addOverlay(a)})}init(e){if(!this.renderer)throw new Error('ImageOverlayPlugin: "renderer" instance must be provided.');const n=new _e(this.renderer),t=new le;t.maxJobs=10,t.priorityCallback=(i,r)=>{const a=i.tile,s=r.tile,o=e.visibleTiles.has(a),h=e.visibleTiles.has(s);return o!==h?o?1:-1:e.downloadQueue.priorityCallback(a,s)},this.tiles=e,this.tileComposer=n,this.processQueue=t,e.forEachLoadedModel((i,r)=>{this._processTileModel(i,r,!0)}),this._onUpdateAfter=async()=>{let i=!1;if(this.overlayInfo.forEach((r,a)=>{if(!!a.frame!=!!r.frame||a.frame&&r.frame&&!r.frame.equals(a.frame)){const s=r.order;this.deleteOverlay(a),this.addOverlay(a,s),i=!0}}),i){const r=t.maxJobs;let a=0;t.items.forEach(s=>{e.visibleTiles.has(s.tile)&&a++}),t.maxJobs=a+t.currJobs,t.tryRunJobs(),t.maxJobs=r,this.needsUpdate=!0}if(this.needsUpdate){this.needsUpdate=!1;const{overlays:r,overlayInfo:a}=this;r.sort((s,o)=>a.get(s).order-a.get(o).order),e.forEachLoadedModel((s,o)=>{this._updateLayers(o)}),this.resetVirtualChildren(!this.enableTileSplitting),e.recalculateBytesUsed(),e.dispatchEvent({type:"needs-rerender"})}},this._onTileDownloadStart=({tile:i,url:r})=>{/\.json$/.test(r)||this._initTileOverlayInfo(i)},e.addEventListener("update-after",this._onUpdateAfter),e.addEventListener("tile-download-start",this._onTileDownloadStart),this.overlays.forEach(i=>{this._initOverlay(i)})}disposeTile(e){const{overlayInfo:n,tileControllers:t,processQueue:i,pendingTiles:r,processedTiles:a}=this;a.delete(e),t.has(e)&&(t.get(e).abort(),t.delete(e),r.delete(e)),n.forEach((({tileInfo:s},o)=>{if(s.has(e)){const{meshInfo:h,range:c,meshRange:l,level:f,target:d,meshRangeMarked:u,rangeMarked:m}=s.get(e);l!==null&&u&&C(l,f,o,!0),c!==null&&m&&C(c,f,o,!0),d!==null&&d.dispose(),s.delete(e),h.clear()}})),i.removeByFilter(s=>s.tile===e)}calculateBytesUsed(e){const{overlayInfo:n}=this,t=this._bytesUsed;let i=null;return n.forEach(({tileInfo:r},a)=>{if(r.has(e)){const{target:s}=r.get(e);i=i||0,i+=he(s==null?void 0:s.texture)}}),i!==null?(t.set(e,i),i):t.has(e)?t.get(e):0}processTileModel(e,n){return this._processTileModel(e,n)}async _processTileModel(e,n,t=!1){const{tileControllers:i,processedTiles:r,pendingTiles:a}=this;i.set(n,new AbortController),t||a.set(n,e),r.add(n),this._wrapMaterials(e),this._initTileOverlayInfo(n),await this._initTileSceneOverlayInfo(e,n),this.expandVirtualChildren(e,n),this._updateLayers(n),a.delete(n)}dispose(){const{tileComposer:e,tiles:n}=this;e.dispose(),[...this.overlays].forEach(i=>{this.deleteOverlay(i)}),n.forEachLoadedModel((i,r)=>{this._updateLayers(r),this.disposeTile(r),delete r[k]}),n.removeEventListener("update-after",this._onUpdateAfter),this.resetVirtualChildren(!0)}getAttributions(e){this.overlays.forEach(n=>{n.opacity>0&&n.getAttributions(e)})}parseToMesh(e,n,t,i){if(t==="image_overlay_tile_split")return n[q]}async resetVirtualChildren(e=!1){this._virtualChildResetId++;const n=this._virtualChildResetId;if(await Promise.all(this.overlays.map(a=>a.whenReady())),n!==this._virtualChildResetId)return;const{tiles:t}=this,i=new Set;t.forEachLoadedModel((a,s)=>{k in s&&i.add(s)}),i.forEach(a=>{if(a.parent===null)return;const s=a.cached.scene.clone();s.updateMatrixWorld();const{hash:o}=this._getSplitVectors(s,a);if(a[k]!==o||e){const h=r(a);h.sort((c,l)=>(l.__depth||0)-(c.__depth||0)),h.forEach(c=>{t.processNodeQueue.remove(c),t.lruCache.remove(c),c.parent=null}),a.children.length=0,a.__childrenProcessed=0}}),e||t.forEachLoadedModel((a,s)=>{this.expandVirtualChildren(a,s)});function r(a,s=[]){return a.children.forEach(o=>{s.push(o),r(o,s)}),s}}_getSplitVectors(e,n,t=Y){const{tiles:i,overlayInfo:r}=this,a=new K;a.setFromObject(e),a.getCenter(t);const s=[],o=[];r.forEach(({tileInfo:c},l)=>{const f=c.get(n);if(f&&f.target&&l.tiling.maxLevel>f.level){l.frame?E.set(0,0,1).transformDirection(l.frame):(i.ellipsoid.getPositionToNormal(t,E),E.length()<1e-6&&E.set(1,0,0));const d=`${E.x.toFixed(3)},${E.y.toFixed(3)},${E.z.toFixed(3)}_`;o.includes(d)||o.push(d);const u=U.set(0,0,1);Math.abs(E.dot(u))>1-1e-4&&u.set(1,0,0);const m=new P().crossVectors(E,u).normalize(),_=new P().crossVectors(E,m).normalize();s.push(m,_)}});const h=[];for(;s.length!==0;){const c=s.pop().clone(),l=c.clone();for(let f=0;f<s.length;f++){const d=s[f],u=c.dot(d);Math.abs(u)>Math.cos(Math.PI/8)&&(l.addScaledVector(d,Math.sign(u)),c.copy(l).normalize(),s.splice(f,1),f--)}h.push(l.normalize())}return{directions:h,hash:o.join("")}}async expandVirtualChildren(e,n){if(n.children.length!==0||this.enableTileSplitting===!1)return;const t=e.clone();t.updateMatrixWorld();const{directions:i,hash:r}=this._getSplitVectors(t,n,Y);if(n[k]=r,i.length===0)return;const a=new ce;a.attributeList=o=>!/^layer_uv_\d+/.test(o),i.map(o=>{a.addSplitOperation((h,c,l,f,d,u)=>(ae.getInterpolatedAttribute(h.attributes.position,c,l,f,d,U),U.applyMatrix4(u).sub(Y).dot(o)))});const s=[];a.forEachSplitPermutation(()=>{const o=a.clipObject(t);o.matrix.premultiply(n.cached.transformInverse).decompose(o.position,o.quaternion,o.scale);const h=[];if(o.traverse(l=>{if(l.isMesh){const f=l.material.clone();l.material=f;for(const d in f){const u=f[d];if(u&&u.isTexture&&u.source.data instanceof ImageBitmap){const m=document.createElement("canvas");m.width=u.image.width,m.height=u.image.height;const _=m.getContext("2d");_.scale(1,-1),_.drawImage(u.source.data,0,0,m.width,-m.height);const p=new H(m);p.mapping=u.mapping,p.wrapS=u.wrapS,p.wrapT=u.wrapT,p.minFilter=u.minFilter,p.magFilter=u.magFilter,p.format=u.format,p.type=u.type,p.anisotropy=u.anisotropy,p.colorSpace=u.colorSpace,p.generateMipmaps=u.generateMipmaps,f[d]=p}}h.push(l)}}),h.length===0)return;const c={};if(n.boundingVolume.region&&(c.region=Q(h,this.tiles.ellipsoid).region),n.boundingVolume.box||n.boundingVolume.sphere){Se.setFromObject(o,!0).getCenter(W);let l=0;o.traverse(f=>{const d=f.geometry;if(d){const u=d.attributes.position;for(let m=0,_=u.count;m<_;m++){const p=U.fromBufferAttribute(u,m).applyMatrix4(f.matrixWorld).distanceToSquared(W);l=Math.max(l,p)}}}),c.sphere=[...W,Math.sqrt(l)]}s.push({refine:"REPLACE",geometricError:n.geometricError*.5,boundingVolume:c,content:{uri:"./child.image_overlay_tile_split"},children:[],[q]:o})}),n.refine="REPLACE",n.children.push(...s)}fetchData(e,n){if(/image_overlay_tile_split/.test(e))return new ArrayBuffer}addOverlay(e,n=null){const{tiles:t,overlays:i,overlayInfo:r}=this;n===null&&(n=i.reduce((s,o)=>Math.max(s,o.order+1),0));const a=new AbortController;i.push(e),r.set(e,{order:n,uniforms:{},tileInfo:new Map,controller:a,frame:e.frame?e.frame.clone():null}),t!==null&&this._initOverlay(e)}setOverlayOrder(e,n){this.overlays.indexOf(e)!==-1&&(this.overlayInfo.get(e).order=n,this._markNeedsUpdate())}deleteOverlay(e){const{overlays:n,overlayInfo:t,processQueue:i,processedTiles:r}=this,a=n.indexOf(e);if(a!==-1){const{tileInfo:s,controller:o}=t.get(e);r.forEach(h=>{const{meshInfo:c,range:l,meshRange:f,level:d,target:u,meshRangeMarked:m,rangeMarked:_}=s.get(h);f!==null&&m&&C(f,d,e,!0),l!==null&&_&&C(l,d,e,!0),u!==null&&u.dispose(),s.delete(h),c.clear()}),s.clear(),t.delete(e),o.abort(),i.removeByFilter(h=>h.overlay===e),n.splice(a,1),this._markNeedsUpdate()}}_calculateLevelFromOverlay(e,n,t,i=!1){if(e.isPlanarProjection){const{resolution:r}=this,{tiling:a}=e,s=i?n:a.toNormalizedRange(n),[o,h,c,l]=s,f=c-o,d=l-h;let u=0;const{maxLevel:m}=a;for(;u<m;u++){const _=r/f,p=r/d,{pixelWidth:I,pixelHeight:M}=a.getLevel(u);if(I>=_||M>=p)break}return u}else return t.__depthFromRenderedParent-1}_initOverlay(e){const{tiles:n}=this;e.isInitialized||(e.init(),e.whenReady().then(()=>{e.imageSource.fetchData=(...r)=>n.downloadQueue.add({priority:-performance.now()},()=>e.fetch(...r))}));const t=[],i=async(r,a)=>{this._initTileOverlayInfo(a,e);const s=this._initTileSceneOverlayInfo(r,a,e);t.push(s),await s,this._updateLayers(a)};n.forEachLoadedModel(i),this.pendingTiles.forEach((r,a)=>{i(r,a)}),Promise.all(t).then(()=>{this._markNeedsUpdate()})}_wrapMaterials(e){e.traverse(n=>{if(n.material){const t=Me(n.material,n.material.onBeforeCompile);this.meshParams.set(n,t)}})}_initTileOverlayInfo(e,n=this.overlays){if(Array.isArray(n)){n.forEach(a=>this._initTileOverlayInfo(e,a));return}const{overlayInfo:t,processQueue:i}=this;if(t.get(n).tileInfo.has(e))return;const r={range:null,meshRange:null,level:null,target:null,meshInfo:new Map,rangeMarked:!1,meshRangeMarked:!1};if(t.get(n).tileInfo.set(e,r),!n.isPlanarProjection){if(e.boundingVolume.region){const[a,s,o,h]=e.boundingVolume.region,c=[a,s,o,h];r.range=c,r.level=this._calculateLevelFromOverlay(n,c,e),i.add({tile:e,overlay:n},()=>(r.rangeMarked=!0,C(c,r.level,n,!1))).catch(l=>{if(!(l instanceof $))throw l})}}}async _initTileSceneOverlayInfo(e,n,t=this.overlays){if(Array.isArray(t))return Promise.all(t.map(y=>this._initTileSceneOverlayInfo(e,n,y)));const{tiles:i,overlayInfo:r,resolution:a,tileComposer:s,tileControllers:o,usedTextures:h,processQueue:c}=this,{ellipsoid:l}=i,{controller:f,tileInfo:d}=r.get(t),u=o.get(n);if(t.isReady||await t.whenReady(),f.signal.aborted||u.signal.aborted)return;const m=[];e.updateMatrixWorld(),e.traverse(y=>{y.isMesh&&m.push(y)});const{tiling:_,imageSource:p}=t,I=d.get(n);let M,x,R;if(t.isPlanarProjection){A.copy(t.frame),e.parent!==null&&A.multiply(i.group.matrixWorldInverse);let y;({range:M,uvs:x,heightRange:y}=Re(m,A,_)),R=!(y[0]>1||y[1]<0)}else A.identity(),e.parent!==null&&A.copy(i.group.matrixWorldInverse),{range:M,uvs:x}=Q(m,l,A,_),R=!0;let v;t.isPlanarProjection?v=M:v=_.toNormalizedRange(M),I.level===null&&(I.level=this._calculateLevelFromOverlay(t,v,n,!0));let L=null;R&&be(M,I.level,t)!==0&&(L=new re(a,a,{depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,colorSpace:oe})),I.meshRange=M,I.target=L,m.forEach((y,T)=>{const S=new Float32Array(x[T]),b=new se(S,3);I.meshInfo.set(y,{attribute:b})}),L!==null&&await c.add({tile:n,overlay:t},async()=>{I.meshRangeMarked=!0;const y=C(M,I.level,t,!1);if(y){s.setRenderTarget(L,v),s.clear(16777215,0),N(M,I.level-1,_,t.isPlanarProjection,(T,S,b)=>{const B=_.getTileBounds(T,S,b,!0,!1),O=p.get(T,S,b);O&&!(O instanceof Promise)&&(s.draw(O,B),h.add(O),this._scheduleCleanup())});try{await y}catch{return}}f.signal.aborted||u.signal.aborted||(s.setRenderTarget(L,v),s.clear(16777215,0),N(M,I.level,_,t.isPlanarProjection,(T,S,b)=>{const B=_.getTileBounds(T,S,b,!0,!1),O=p.get(T,S,b);s.draw(O,B),h.add(O),this._scheduleCleanup()}))}).catch(y=>{if(!(y instanceof $))throw y})}_updateLayers(e){const{overlayInfo:n,overlays:t,tileControllers:i}=this,r=i.get(e);this.tiles.recalculateBytesUsed(e),!(!r||r.signal.aborted)&&t.forEach((a,s)=>{const{tileInfo:o}=n.get(a),{meshInfo:h,target:c}=o.get(e);h.forEach(({attribute:l},f)=>{const{geometry:d,material:u}=f,m=this.meshParams.get(f),_=`layer_uv_${s}`;d.getAttribute(_)!==l&&(d.setAttribute(_,l),d.dispose()),m.layerMaps.length=t.length,m.layerInfo.length=t.length,m.layerMaps.value[s]=c!==null?c.texture:null,m.layerInfo.value[s]=a,u.defines[`LAYER_${s}_EXISTS`]=+(c!==null),u.defines[`LAYER_${s}_ALPHA_INVERT`]=Number(a.alphaInvert),u.defines[`LAYER_${s}_ALPHA_MASK`]=Number(a.alphaMask),u.defines.LAYER_COUNT=t.length,u.needsUpdate=!0})})}_scheduleCleanup(){this._cleanupScheduled||(this._cleanupScheduled=!0,requestAnimationFrame(()=>{const{usedTextures:e}=this;e.forEach(n=>{n.dispose()}),e.clear(),this._cleanupScheduled=!1}))}_markNeedsUpdate(){this.needsUpdate===!1&&(this.needsUpdate=!0,this.tiles!==null&&this.tiles.dispatchEvent({type:"needs-update"}))}}class z{get tiling(){return this.imageSource.tiling}get projection(){return this.tiling.projection}get isPlanarProjection(){return!!this.frame}get aspectRatio(){return this.tiling&&this.isReady?this.tiling.aspectRatio:1}get fetchOptions(){return this.imageSource.fetchOptions}set fetchOptions(e){this.imageSource.fetchOptions=e}constructor(e={}){const{opacity:n=1,color:t=16777215,frame:i=null,preprocessURL:r=null,alphaMask:a=!1,alphaInvert:s=!1}=e;this.imageSource=null,this.preprocessURL=r,this.opacity=n,this.color=new J(t),this.frame=i!==null?i.clone():null,this.alphaMask=a,this.alphaInvert=s,this.isReady=!1,this.isInitialized=!1}init(){this.isInitialized=!0,this.whenReady().then(()=>{this.isReady=!0})}fetch(e,n={}){return this.preprocessURL&&(e=this.preprocessURL(e)),fetch(e,n)}whenReady(){}getAttributions(e){}dispose(){this.imageSource.dispose()}}class ke extends z{constructor(e={}){super(e),this.imageSource=new j(e),this.imageSource.fetchData=(...n)=>this.fetch(...n)}init(){this._whenReady=this.imageSource.init(),super.init()}whenReady(){return this._whenReady}}class Ne extends z{constructor(e={}){super(e),this.imageSource=new we(e),this.imageSource.fetchData=(...n)=>this.fetch(...n)}init(){this._whenReady=this.imageSource.init(),super.init()}whenReady(){return this._whenReady}}class Be extends z{constructor(e={}){super(e);const{apiToken:n,autoRefreshToken:t,assetId:i}=e;this.options=e,this.assetId=i,this.auth=new ue({apiToken:n,autoRefreshToken:t}),this.auth.authURL=`https://api.cesium.com/v1/assets/${i}/endpoint`,this._attributions=[],this.externalType=!1}init(){this._whenReady=this.auth.refreshToken().then(async e=>{if(this._attributions=e.attributions.map(n=>({value:n.html,type:"html",collapsible:n.collapsible})),e.type!=="IMAGERY")throw new Error("CesiumIonOverlay: Only IMAGERY is supported as overlay type.");switch(this.externalType=!!e.externalType,e.externalType){case"GOOGLE_2D_MAPS":{const{url:n,session:t,key:i,tileWidth:r}=e.options,a=`${n}/v1/2dtiles/{z}/{x}/{y}?session=${t}&key=${i}`;this.imageSource=new j({...this.options,url:a,tileDimension:r,levels:22});break}case"BING":{const{url:n,mapStyle:t,key:i}=e.options,r=`${n}/REST/v1/Imagery/Metadata/${t}?incl=ImageryProviders&key=${i}&uriScheme=https`,s=(await fetch(r).then(o=>o.json())).resourceSets[0].resources[0];this.imageSource=new ve({...this.options,url:s.imageUrl,subdomains:s.imageUrlSubdomains,tileDimension:s.tileWidth,levels:s.zoomMax});break}default:this.imageSource=new de({...this.options,url:e.url})}return this.imageSource.fetchData=(...n)=>this.fetch(...n),this.imageSource.init()}),super.init()}fetch(...e){return this.externalType?super.fetch(...e):this.auth.fetch(...e)}whenReady(){return this._whenReady}getAttributions(e){e.push(...this._attributions)}}export{Be as C,Ne as G,Ue as I,ke as X};
//# sourceMappingURL=ImageOverlayPlugin-CfwoiJqN.js.map
