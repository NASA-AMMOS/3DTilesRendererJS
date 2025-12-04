import{i as $,aP as Z,M as w,O as K,C as H,b as ee,V as G,aH as te,l as W,m as b,aG as q,B as Q,ao as ne,al as ie,aE as ae,I as re}from"./three.module-DBfedTbk.js";import{P as se,g as oe}from"./TilesRenderer-urYYbZ2A.js";import{G as le,C as he}from"./GeometryClipper-OrdjW0tI.js";import{P as ce,X as ue,T as fe}from"./TMSImageSource-D41Rs33p.js";import{T as me}from"./TiledImageSource-smoHuTDQ.js";import{W as de}from"./I3DMLoader-Co8j1K3i.js";const pe=new K,ge=new H;class ye{constructor(e){this.renderer=e,this.renderTarget=null,this.range=[0,0,1,1],this.quad=new $(new Z,new _e)}setRenderTarget(e,n){this.renderTarget=e,this.range=[...n]}draw(e,n){const{range:t,renderer:i,quad:s,renderTarget:a}=this,r=s.material;r.map=e,r.minRange.x=w.mapLinear(n[0],t[0],t[2],-1,1),r.minRange.y=w.mapLinear(n[1],t[1],t[3],-1,1),r.maxRange.x=w.mapLinear(n[2],t[0],t[2],-1,1),r.maxRange.y=w.mapLinear(n[3],t[1],t[3],-1,1);const o=i.getRenderTarget(),l=i.autoClear;i.autoClear=!1,i.setRenderTarget(a),i.render(s,pe),i.setRenderTarget(o),i.autoClear=l,r.map=null}clear(e,n=1){const{renderer:t,renderTarget:i}=this,s=t.getRenderTarget(),a=t.getClearColor(ge),r=t.getClearAlpha();t.setClearColor(e,n),t.setRenderTarget(i),t.clear(),t.setRenderTarget(s),t.setClearColor(a,r)}dispose(){this.quad.material.dispose(),this.quad.geometry.dispose()}}class _e extends ee{get minRange(){return this.uniforms.minRange.value}get maxRange(){return this.uniforms.maxRange.value}get map(){return this.uniforms.map.value}set map(e){this.uniforms.map.value=e}constructor(){super({depthWrite:!1,depthTest:!1,transparent:!1,side:te,premultipliedAlpha:!0,uniforms:{map:{value:null},minRange:{value:new G},maxRange:{value:new G}},vertexShader:`

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

			`})}}function k(g,e,n,t,i){let[s,a,r,o]=g;a+=1e-8,s+=1e-8,o-=1e-8,r-=1e-8;const l=Math.max(Math.min(e,n.maxLevel),n.minLevel),[c,h,f,m]=n.getTilesInRange(s,a,r,o,l,t);for(let u=c;u<=f;u++)for(let d=h;d<=m;d++)i(u,d,l)}function Le(g,e,n){const t=new b,i={},s=[],a=g.getAttribute("position");g.computeBoundingBox(),g.boundingBox.getCenter(t).applyMatrix4(e),n.getPositionToCartographic(t,i);const r=i.lat,o=i.lon;let l=1/0,c=1/0,h=1/0,f=-1/0,m=-1/0,u=-1/0;for(let p=0;p<a.count;p++)t.fromBufferAttribute(a,p).applyMatrix4(e),n.getPositionToCartographic(t,i),Math.abs(Math.abs(i.lat)-Math.PI/2)<1e-5&&(i.lon=o),Math.abs(o-i.lon)>Math.PI&&(i.lon+=Math.sign(o-i.lon)*Math.PI*2),Math.abs(r-i.lat)>Math.PI&&(i.lat+=Math.sign(r-i.lat)*Math.PI*2),s.push(i.lon,i.lat,i.height),l=Math.min(l,i.lat),f=Math.max(f,i.lat),c=Math.min(c,i.lon),m=Math.max(m,i.lon),h=Math.min(h,i.height),u=Math.max(u,i.height);const d=[c,l,m,f],_=[...d,h,u];return{uv:s,range:d,region:_}}function z(g,e,n=null,t=null){let i=1/0,s=1/0,a=1/0,r=-1/0,o=-1/0,l=-1/0;const c=[],h=new W;g.forEach(m=>{h.copy(m.matrixWorld),n&&h.premultiply(n);const{uv:u,region:d}=Le(m.geometry,h,e);c.push(u),i=Math.min(i,d[1]),r=Math.max(r,d[3]),s=Math.min(s,d[0]),o=Math.max(o,d[2]),a=Math.min(a,d[4]),l=Math.max(l,d[5])});let f=[s,i,o,r];if(t!==null){f=t.clampToProjectionBounds([s,i,o,r]);const[m,u,d,_]=t.toNormalizedRange(f);c.forEach(p=>{for(let L=0,M=p.length;L<M;L+=3){const x=p[L+0],R=p[L+1],v=p[L+2],[I,y]=t.toNormalizedPoint(x,R);p[L+0]=w.mapLinear(I,m,d,0,1),p[L+1]=w.mapLinear(y,u,_,0,1),p[L+2]=w.mapLinear(v,a,l,0,1)}})}return{uvs:c,range:f,region:[s,i,o,r,a,l]}}function ve(g,e,n){const t=new b,i=[],s=g.getAttribute("position");let a=1/0,r=1/0,o=1/0,l=-1/0,c=-1/0,h=-1/0;for(let m=0;m<s.count;m++)t.fromBufferAttribute(s,m).applyMatrix4(e),t.x/=n,i.push(t.x,t.y,t.z),a=Math.min(a,t.x),l=Math.max(l,t.x),r=Math.min(r,t.y),c=Math.max(c,t.y),o=Math.min(o,t.z),h=Math.max(h,t.z);return{uv:i,range:[a,r,l,c],heightRange:[o,h]}}function Ie(g,e,n){let t=1/0,i=1/0,s=1/0,a=-1/0,r=-1/0,o=-1/0;const l=[],c=new W;return g.forEach(h=>{c.copy(h.matrixWorld),e&&c.premultiply(e);const{uv:f,range:m,heightRange:u}=ve(h.geometry,c,n.aspectRatio);l.push(f),t=Math.min(t,m[0]),a=Math.max(a,m[2]),i=Math.min(i,m[1]),r=Math.max(r,m[3]),s=Math.min(s,u[0]),o=Math.max(o,u[1])}),l.forEach(h=>{for(let f=0,m=h.length;f<m;f+=3){const u=h[f+0],d=h[f+1];h[f+0]=w.mapLinear(u,t,a,0,1),h[f+1]=w.mapLinear(d,i,r,0,1)}}),{uvs:l,range:[t,i,a,r],heightRange:[s,o]}}const V=Symbol("OVERLAY_PARAMS");function xe(g,e){if(g[V])return g[V];const n={layerMaps:{value:[]},layerInfo:{value:[]}};return g[V]=n,g.defines={...g.defines||{},LAYER_COUNT:0},g.onBeforeCompile=t=>{e&&e(t),t.uniforms={...t.uniforms,...n},t.vertexShader=t.vertexShader.replace(/void main\(\s*\)\s*{/,i=>`

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
			`)},n}const F=new b,U=new b;function Re(g,e,n){g.getCartographicToPosition(e,n,0,F),g.getCartographicToPosition(e+.01,n,0,U);const i=F.distanceTo(U);return g.getCartographicToPosition(e,n+.01,0,U),F.distanceTo(U)/i}class Me extends me{constructor({geojson:e=null,url:n=null,tileDimension:t=256,levels:i=20,pointRadius:s=6,strokeStyle:a="white",strokeWidth:r=2,fillStyle:o="rgba( 255, 255, 255, 0.5 )",...l}={}){super(l),this.geojson=e,this.url=n,this.tileDimension=t,this.levels=i,this.pointRadius=s,this.strokeStyle=a,this.strokeWidth=r,this.fillStyle=o}async init(){const{tiling:e,levels:n,tileDimension:t,geojson:i,url:s}=this,a=new ce;if(e.setProjection(a),e.setContentBounds(...a.getBounds()),e.generateLevels(n,a.tileCountX,a.tileCountY,{tilePixelWidth:t,tilePixelHeight:t}),!i&&s){const o=await this.fetchData(s);this.geojson=await o.json()}const r=this._geoJSONBounds(50).map(o=>o*w.DEG2RAD);this.tiling.setContentBounds(...r)}async fetchItem(e,n){return this.drawCanvasImage(e)}drawCanvasImage(e){const{tiling:n,tileDimension:t,geojson:i}=this,[s,a,r]=e,o=n.getTileBounds(s,a,r,!1,!1).map(m=>w.RAD2DEG*m),l=document.createElement("canvas");l.width=t,l.height=t;const c=l.getContext("2d"),h=this._featuresFromGeoJSON(i);for(let m=0;m<h.length;m++){const u=h[m];this._featureIntersectsTile(u,o)&&this._drawFeatureOnCanvas(c,u,o,l.width,l.height)}const f=new q(l);return f.needsUpdate=!0,f}_featureIntersectsTile(e,n){const t=this._getFeatureBounds(e);if(!t)return!1;const[i,s,a,r]=t,[o,l,c,h]=n;return!(a<o||i>c||r<l||s>h)}_getFeatureBounds(e){const{geometry:n}=e;if(!n)return null;const{type:t,coordinates:i}=n;let s=1/0,a=1/0,r=-1/0,o=-1/0;const l=(c,h)=>{s=Math.min(s,c),r=Math.max(r,c),a=Math.min(a,h),o=Math.max(o,h)};return t==="Point"?l(i[0],i[1]):t==="MultiPoint"||t==="LineString"?i.forEach(c=>l(c[0],c[1])):t==="MultiLineString"||t==="Polygon"?i.forEach(c=>c.forEach(h=>l(h[0],h[1]))):t==="MultiPolygon"&&i.forEach(c=>c.forEach(h=>h.forEach(f=>l(f[0],f[1])))),[s,a,r,o]}_featuresFromGeoJSON(e){const n=e.type,t=new Set(["Point","MultiPoint","LineString","MultiLineString","Polygon","MultiPolygon"]);return n==="FeatureCollection"?e.features:n==="Feature"?[e]:n==="GeometryCollection"?e.geometries.map(i=>({type:"Feature",geometry:i,properties:{}})):t.has(n)?[{type:"Feature",geometry:e,properties:{}}]:[]}_drawFeatureOnCanvas(e,n,t,i,s){const{geometry:a=null,properties:r={}}=n;if(!a)return;const[o,l,c,h]=t,f=r.strokeStyle||this.strokeStyle,m=r.fillStyle||this.fillStyle,u=r.pointRadius||this.pointRadius,d=r.strokeWidth||this.strokeWidth;e.save(),e.strokeStyle=f,e.fillStyle=m,e.lineWidth=d;const _=new Array(2),p=(x,R,v=_)=>{const I=w.mapLinear(x,o,c,0,i),y=s-w.mapLinear(R,l,h,0,s);return v[0]=Math.round(I),v[1]=Math.round(y),v},L=(x,R)=>{const v=R*w.DEG2RAD,I=x*w.DEG2RAD,y=(h-l)/s;return(c-o)/i/y*Re(de,v,I)},M=a.type;if(M==="Point"){const[x,R]=a.coordinates,[v,I]=p(x,R),y=L(x,R);e.beginPath(),e.ellipse(v,I,u/y,u,0,0,Math.PI*2),e.fill(),e.stroke()}else M==="MultiPoint"?a.coordinates.forEach(([x,R])=>{const[v,I]=p(x,R),y=L(x,R);e.beginPath(),e.ellipse(v,I,u/y,u,0,0,Math.PI*2),e.fill(),e.stroke()}):M==="LineString"?(e.beginPath(),a.coordinates.forEach(([x,R],v)=>{const[I,y]=p(x,R);v===0?e.moveTo(I,y):e.lineTo(I,y)}),e.stroke()):M==="MultiLineString"?(e.beginPath(),a.coordinates.forEach(x=>{x.forEach(([R,v],I)=>{const[y,T]=p(R,v);I===0?e.moveTo(y,T):e.lineTo(y,T)})}),e.stroke()):M==="Polygon"?(e.beginPath(),a.coordinates.forEach((x,R)=>{x.forEach(([v,I],y)=>{const[T,P]=p(v,I);y===0?e.moveTo(T,P):e.lineTo(T,P)}),e.closePath()}),e.fill("evenodd"),e.stroke()):M==="MultiPolygon"&&a.coordinates.forEach(x=>{e.beginPath(),x.forEach((R,v)=>{R.forEach(([I,y],T)=>{const[P,S]=p(I,y);T===0?e.moveTo(P,S):e.lineTo(P,S)}),e.closePath()}),e.fill("evenodd"),e.stroke()});e.restore()}_geoJSONBounds(){const e=this._featuresFromGeoJSON(this.geojson);let n=1/0,t=1/0,i=-1/0,s=-1/0;return e.forEach(a=>{const[r,o,l,c]=this._getFeatureBounds(a);n=Math.min(n,r),t=Math.min(t,o),i=Math.max(i,l),s=Math.max(s,c)}),[n,t,i,s]}}const O=new W,D=new b,j=new b,Y=new b,E=new b,Te=new Q,J=Symbol("SPLIT_TILE_DATA"),N=Symbol("SPLIT_HASH");function A(g,e,n,t){if(Array.isArray(n)){const s=n.map(a=>A(g,e,a,t)).filter(a=>a!==null);return s.length===0?null:Promise.all(s)}if(n.isReady)return i();return n.whenReady().then(i);function i(){const s=[],{imageSource:a,tiling:r}=n;k(g,e,r,n.isPlanarProjection,(l,c,h)=>{t?a.release(l,c,h):s.push(a.lock(l,c,h))});const o=s.filter(l=>l instanceof Promise);return o.length!==0?Promise.all(o):null}}function we(g,e,n){let t=0;return k(g,e,n.tiling,n.isPlanarProjection,(i,s,a)=>{t++}),t}class Ae{get enableTileSplitting(){return this._enableTileSplitting}set enableTileSplitting(e){this._enableTileSplitting!==e&&(this._enableTileSplitting=e,this._markNeedsUpdate())}constructor(e={}){const{overlays:n=[],resolution:t=256,renderer:i=null,enableTileSplitting:s=!0}=e;this.name="IMAGE_OVERLAY_PLUGIN",this.priority=-15,this.renderer=i,this.resolution=t,this._enableTileSplitting=s,this.overlays=[],this.needsUpdate=!1,this.tiles=null,this.tileComposer=null,this.tileControllers=new Map,this.overlayInfo=new Map,this.usedTextures=new Set,this.meshParams=new WeakMap,this.pendingTiles=new Map,this.processQueue=null,this._onUpdateAfter=null,this._onTileDownloadStart=null,this._cleanupScheduled=!1,this._virtualChildResetId=0,this._bytesUsed=new WeakMap,n.forEach(a=>{this.addOverlay(a)})}init(e){const n=new ye(this.renderer),t=new se;t.maxJobs=10,t.priorityCallback=(i,s)=>{const a=i.tile,r=s.tile,o=e.visibleTiles.has(a),l=e.visibleTiles.has(r);return o!==l?o?1:-1:e.downloadQueue.priorityCallback(a,r)},this.tiles=e,this.tileComposer=n,this.processQueue=t,e.forEachLoadedModel((i,s)=>{this._processTileModel(i,s,!0)}),this._onUpdateAfter=async()=>{let i=!1;if(this.overlayInfo.forEach((s,a)=>{if(!!a.frame!=!!s.frame||a.frame&&s.frame&&!s.frame.equals(a.frame)){const r=s.order;this.deleteOverlay(a,!1),this.addOverlay(a,r),i=!0}}),i){const s=t.maxJobs;let a=0;t.items.forEach(r=>{e.visibleTiles.has(r.tile)&&a++}),t.maxJobs=a+t.currJobs,t.tryRunJobs(),t.maxJobs=s,this.needsUpdate=!0}if(this.needsUpdate){this.needsUpdate=!1;const{overlays:s,overlayInfo:a}=this;s.sort((r,o)=>a.get(r).order-a.get(o).order),e.forEachLoadedModel((r,o)=>{this._updateLayers(o)}),this.resetVirtualChildren(!this.enableTileSplitting),e.recalculateBytesUsed(),e.dispatchEvent({type:"needs-rerender"})}},this._onTileDownloadStart=({tile:i})=>{this._initTileOverlayInfo(i)},e.addEventListener("update-after",this._onUpdateAfter),e.addEventListener("tile-download-start",this._onTileDownloadStart),this.overlays.forEach(i=>{this._initOverlay(i)})}disposeTile(e){const{overlayInfo:n,tileControllers:t,processQueue:i,pendingTiles:s}=this;t.has(e)&&(t.get(e).abort(),t.delete(e),s.delete(e)),n.forEach((({tileInfo:a},r)=>{if(a.has(e)){const{meshInfo:o,range:l,meshRange:c,level:h,target:f,meshRangeMarked:m,rangeMarked:u}=a.get(e);c!==null&&m&&A(c,h,r,!0),l!==null&&u&&A(l,h,r,!0),f!==null&&f.dispose(),a.delete(e),o.clear()}})),i.removeByFilter(a=>a.tile===e)}calculateBytesUsed(e){const{overlayInfo:n}=this,t=this._bytesUsed;let i=null;return n.forEach(({tileInfo:s},a)=>{if(s.has(e)){const{target:r}=s.get(e);i=i||0,i+=oe(r==null?void 0:r.texture)}}),i!==null?(t.set(e,i),i):t.has(e)?t.get(e):0}processTileModel(e,n){return this._processTileModel(e,n)}async _processTileModel(e,n,t=!1){this.tileControllers.set(n,new AbortController),t||this.pendingTiles.set(n,e),this._wrapMaterials(e),this._initTileOverlayInfo(n),await this._initTileSceneOverlayInfo(e,n),this.expandVirtualChildren(e,n),this._updateLayers(n),this.pendingTiles.delete(n)}dispose(){const{tileComposer:e,tiles:n}=this;e.dispose(),[...this.overlays].forEach(i=>{this.deleteOverlay(i)}),n.forEachLoadedModel((i,s)=>{this._updateLayers(s),this.disposeTile(s),delete s[N]}),n.removeEventListener("update-after",this._onUpdateAfter),this.resetVirtualChildren(!0)}getAttributions(e){this.overlays.forEach(n=>{n.opacity>0&&n.getAttributions(e)})}parseToMesh(e,n,t,i){if(t==="image_overlay_tile_split")return n[J]}async resetVirtualChildren(e=!1){this._virtualChildResetId++;const n=this._virtualChildResetId;if(await Promise.all(this.overlays.map(a=>a.whenReady())),n!==this._virtualChildResetId)return;const{tiles:t}=this,i=new Set;t.forEachLoadedModel((a,r)=>{N in r&&i.add(r)}),i.forEach(a=>{if(a.parent===null)return;const r=a.cached.scene.clone();r.updateMatrixWorld();const{hash:o}=this._getSplitVectors(r,a);if(a[N]!==o||e){const l=s(a);l.sort((c,h)=>(h.__depth||0)-(c.__depth||0)),l.forEach(c=>{t.processNodeQueue.remove(c),t.lruCache.remove(c),c.parent=null}),a.children.length=0,a.__childrenProcessed=0}}),e||t.forEachLoadedModel((a,r)=>{this.expandVirtualChildren(a,r)});function s(a,r=[]){return a.children.forEach(o=>{r.push(o),s(o,r)}),r}}_getSplitVectors(e,n,t=j){const{tiles:i,overlayInfo:s}=this,a=new Q;a.setFromObject(e),a.getCenter(t);const r=[],o=[];s.forEach(({tileInfo:c},h)=>{const f=c.get(n);if(f&&f.target&&h.tiling.maxLevel>f.level){h.frame?E.set(0,0,1).transformDirection(h.frame):(i.ellipsoid.getPositionToNormal(t,E),E.length()<1e-6&&E.set(1,0,0));const m=`${E.x.toFixed(3)},${E.y.toFixed(3)},${E.z.toFixed(3)}_`;o.includes(m)||o.push(m);const u=D.set(0,0,1);Math.abs(E.dot(u))>1-1e-4&&u.set(1,0,0);const d=new b().crossVectors(E,u).normalize(),_=new b().crossVectors(E,d).normalize();r.push(d,_)}});const l=[];for(;r.length!==0;){const c=r.pop().clone(),h=c.clone();for(let f=0;f<r.length;f++){const m=r[f],u=c.dot(m);Math.abs(u)>Math.cos(Math.PI/8)&&(h.addScaledVector(m,Math.sign(u)),c.copy(h).normalize(),r.splice(f,1),f--)}l.push(h.normalize())}return{directions:l,hash:o.join("")}}async expandVirtualChildren(e,n){if(n.children.length!==0||this.enableTileSplitting===!1)return;const t=e.clone();t.updateMatrixWorld();const{directions:i,hash:s}=this._getSplitVectors(t,n,j);if(n[N]=s,i.length===0)return;const a=new le;a.attributeList=o=>!/^layer_uv_\d+/.test(o),i.map(o=>{a.addSplitOperation((l,c,h,f,m,u)=>(ne.getInterpolatedAttribute(l.attributes.position,c,h,f,m,D),D.applyMatrix4(u).sub(j).dot(o)))});const r=[];a.forEachSplitPermutation(()=>{const o=a.clipObject(t);o.matrix.premultiply(n.cached.transformInverse).decompose(o.position,o.quaternion,o.scale);const l=[];if(o.traverse(h=>{if(h.isMesh){const f=h.material.clone();h.material=f;for(const m in f){const u=f[m];if(u&&u.isTexture&&u.source.data instanceof ImageBitmap){const d=document.createElement("canvas");d.width=u.image.width,d.height=u.image.height;const _=d.getContext("2d");_.scale(1,-1),_.drawImage(u.source.data,0,0,d.width,-d.height);const p=new q(d);p.mapping=u.mapping,p.wrapS=u.wrapS,p.wrapT=u.wrapT,p.minFilter=u.minFilter,p.magFilter=u.magFilter,p.format=u.format,p.type=u.type,p.anisotropy=u.anisotropy,p.colorSpace=u.colorSpace,p.generateMipmaps=u.generateMipmaps,f[m]=p}}l.push(h)}}),l.length===0)return;const c={};if(n.boundingVolume.region&&(c.region=z(l,this.tiles.ellipsoid).region),n.boundingVolume.box||n.boundingVolume.sphere){Te.setFromObject(o,!0).getCenter(Y);let h=0;o.traverse(f=>{const m=f.geometry;if(m){const u=m.attributes.position;for(let d=0,_=u.count;d<_;d++){const p=D.fromBufferAttribute(u,d).applyMatrix4(f.matrixWorld).distanceToSquared(Y);h=Math.max(h,p)}}}),c.sphere=[...Y,Math.sqrt(h)]}r.push({refine:"REPLACE",geometricError:n.geometricError*.5,boundingVolume:c,content:{uri:"./child.image_overlay_tile_split"},children:[],[J]:o})}),n.refine="REPLACE",n.children.push(...r)}fetchData(e,n){if(/image_overlay_tile_split/.test(e))return new ArrayBuffer}addOverlay(e,n=null){const{tiles:t,overlays:i,overlayInfo:s}=this;n===null&&(n=i.reduce((r,o)=>Math.max(r,o.order+1),0));const a=new AbortController;i.push(e),s.set(e,{order:n,uniforms:{},tileInfo:new Map,controller:a,frame:e.frame?e.frame.clone():null}),t!==null&&this._initOverlay(e)}setOverlayOrder(e,n){this.overlays.indexOf(e)!==-1&&(this.overlayInfo.get(e).order=n,this._markNeedsUpdate())}deleteOverlay(e,n=!0){const{overlays:t,overlayInfo:i,processQueue:s}=this,a=t.indexOf(e);if(a!==-1){const{tileInfo:r,controller:o}=i.get(e);r.forEach(({meshInfo:l,target:c})=>{c!==null&&c.dispose(),l.clear()}),r.clear(),i.delete(e),o.abort(),s.removeByFilter(l=>l.overlay===e),t.splice(a,1),n&&e.dispose(),this._markNeedsUpdate()}}_calculateLevelFromOverlay(e,n,t,i=!1){if(e.isPlanarProjection){const{resolution:s}=this,{tiling:a}=e,r=i?n:a.toNormalizedRange(n),[o,l,c,h]=r,f=c-o,m=h-l;let u=0;const{maxLevel:d}=a;for(;u<d;u++){const _=s/f,p=s/m,{pixelWidth:L,pixelHeight:M}=a.getLevel(u);if(L>=_||M>=p)break}return u}else return t.__depthFromRenderedParent-1}_initOverlay(e){const{tiles:n}=this;e.isInitialized||(e.imageSource.fetchData=(...s)=>n.downloadQueue.add({priority:-performance.now()},()=>e.fetch(...s)),e.init());const t=[],i=async(s,a)=>{this._initTileOverlayInfo(a,e);const r=this._initTileSceneOverlayInfo(s,a,e);t.push(r),await r,this._updateLayers(a)};n.forEachLoadedModel(i),this.pendingTiles.forEach((s,a)=>{i(s,a)}),Promise.all(t).then(()=>{this._markNeedsUpdate()})}_wrapMaterials(e){e.traverse(n=>{if(n.material){const t=xe(n.material,n.material.onBeforeCompile);this.meshParams.set(n,t)}})}_initTileOverlayInfo(e,n=this.overlays){if(Array.isArray(n)){n.forEach(r=>this._initTileOverlayInfo(e,r));return}const{overlayInfo:t,processQueue:i}=this;if(t.get(n).tileInfo.has(e))return;const s=e.__depthFromRenderedParent-1,a={range:null,meshRange:null,level:null,target:null,meshInfo:new Map,rangeMarked:!1,meshRangeMarked:!1};if(t.get(n).tileInfo.set(e,a),!n.isPlanarProjection){if(e.boundingVolume.region){const[r,o,l,c]=e.boundingVolume.region,h=[r,o,l,c];a.range=h,a.level=this._calculateLevelFromOverlay(n,h,e),i.add({tile:e,overlay:n},()=>(a.rangeMarked=!0,A(h,s,n,!1))).catch(()=>{})}}}async _initTileSceneOverlayInfo(e,n,t=this.overlays){if(Array.isArray(t))return Promise.all(t.map(y=>this._initTileSceneOverlayInfo(e,n,y)));const{tiles:i,overlayInfo:s,resolution:a,tileComposer:r,tileControllers:o,usedTextures:l,processQueue:c}=this,{ellipsoid:h}=i,{controller:f,tileInfo:m}=s.get(t),u=o.get(n);if(t.isReady||await t.whenReady(),f.signal.aborted||u.signal.aborted)return;const d=[];e.updateMatrixWorld(),e.traverse(y=>{y.isMesh&&d.push(y)});const{tiling:_,imageSource:p}=t,L=m.get(n);let M,x,R;if(t.isPlanarProjection){O.copy(t.frame),e.parent!==null&&O.multiply(i.group.matrixWorldInverse);let y;({range:M,uvs:x,heightRange:y}=Ie(d,O,_)),R=!(y[0]>1||y[1]<0)}else O.identity(),e.parent!==null&&O.copy(i.group.matrixWorldInverse),{range:M,uvs:x}=z(d,h,O,_),R=!0;let v;t.isPlanarProjection?v=M:v=_.toNormalizedRange(M),L.level===null&&(L.level=this._calculateLevelFromOverlay(t,v,n,!0));let I=null;R&&we(M,L.level,t)!==0&&(I=new ae(a,a,{depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,colorSpace:re})),L.meshRange=M,L.target=I,d.forEach((y,T)=>{const P=new Float32Array(x[T]),S=new ie(P,3);L.meshInfo.set(y,{attribute:S})}),I!==null&&await c.add({tile:n,overlay:t},async()=>{L.meshRangeMarked=!0;const y=A(M,L.level,t,!1);if(y){r.setRenderTarget(I,v),r.clear(16777215,0),k(M,L.level-1,_,t.isPlanarProjection,(T,P,S)=>{const B=_.getTileBounds(T,P,S,!0,!1),C=p.get(T,P,S);C&&!(C instanceof Promise)&&(r.draw(C,B),l.add(C),this._scheduleCleanup())});try{await y}catch{return}}f.signal.aborted||u.signal.aborted||(r.setRenderTarget(I,v),r.clear(16777215,0),k(M,L.level,_,t.isPlanarProjection,(T,P,S)=>{const B=_.getTileBounds(T,P,S,!0,!1),C=p.get(T,P,S);r.draw(C,B),l.add(C),this._scheduleCleanup()}))}).catch(()=>{})}_updateLayers(e){const{overlayInfo:n,overlays:t,tileControllers:i}=this,s=i.get(e);this.tiles.recalculateBytesUsed(e),!(!s||s.signal.aborted)&&t.forEach((a,r)=>{const{tileInfo:o}=n.get(a),{meshInfo:l,target:c}=o.get(e);l.forEach(({attribute:h},f)=>{const{geometry:m,material:u}=f,d=this.meshParams.get(f),_=`layer_uv_${r}`;m.getAttribute(_)!==h&&(m.setAttribute(_,h),m.dispose()),d.layerMaps.length=t.length,d.layerInfo.length=t.length,d.layerMaps.value[r]=c!==null?c.texture:null,d.layerInfo.value[r]=a,u.defines[`LAYER_${r}_EXISTS`]=+(c!==null),u.defines[`LAYER_${r}_ALPHA_INVERT`]=Number(a.alphaInvert),u.defines[`LAYER_${r}_ALPHA_MASK`]=Number(a.alphaMask),u.defines.LAYER_COUNT=t.length,u.needsUpdate=!0})})}_scheduleCleanup(){this._cleanupScheduled||(this._cleanupScheduled=!0,requestAnimationFrame(()=>{const{usedTextures:e}=this;e.forEach(n=>{n.dispose()}),e.clear(),this._cleanupScheduled=!1}))}_markNeedsUpdate(){this.needsUpdate===!1&&(this.needsUpdate=!0,this.tiles!==null&&this.tiles.dispatchEvent({type:"needs-update"}))}}class X{get tiling(){return this.imageSource.tiling}get projection(){return this.tiling.projection}get isPlanarProjection(){return!!this.frame}get aspectRatio(){return this.tiling&&this.isReady?this.tiling.aspectRatio:1}get fetchOptions(){return this.imageSource.fetchOptions}set fetchOptions(e){this.imageSource.fetchOptions=e}constructor(e={}){const{opacity:n=1,color:t=16777215,frame:i=null,preprocessURL:s=null,alphaMask:a=!1,alphaInvert:r=!1}=e;this.imageSource=null,this.preprocessURL=s,this.opacity=n,this.color=new H(t),this.frame=i!==null?i.clone():null,this.alphaMask=a,this.alphaInvert=r,this.isReady=!1,this.isInitialized=!1}init(){this.isInitialized=!0,this.whenReady().then(()=>{this.isReady=!0})}fetch(e,n={}){return this.preprocessURL&&(e=this.preprocessURL(e)),fetch(e,n)}whenReady(){}getAttributions(e){}dispose(){this.imageSource.dispose()}}class Ue extends X{constructor(e={}){super(e),this.imageSource=new ue(e),this.imageSource.fetchData=(...n)=>this.fetch(...n)}init(){this._whenReady=this.imageSource.init(),super.init()}whenReady(){return this._whenReady}}class De extends X{constructor(e={}){super(e),this.imageSource=new Me(e),this.imageSource.fetchData=(...n)=>this.fetch(...n)}init(){this._whenReady=this.imageSource.init(),super.init()}whenReady(){return this._whenReady}}class Ne extends X{constructor(e={}){super(e);const{apiToken:n,autoRefreshToken:t,assetId:i}=e;this.assetId=i,this.auth=new he({apiToken:n,autoRefreshToken:t}),this.imageSource=new fe(e),this.auth.authURL=`https://api.cesium.com/v1/assets/${i}/endpoint`,this.imageSource.fetchData=(...s)=>this.fetch(...s),this._attributions=[]}init(){this._whenReady=this.auth.refreshToken().then(e=>(this._attributions=e.attributions.map(n=>({value:n.html,type:"html",collapsible:n.collapsible})),this.imageSource.url=e.url,this.imageSource.init())),super.init()}fetch(...e){return this.auth.fetch(...e)}whenReady(){return this._whenReady}getAttributions(e){e.push(...this._attributions)}}export{Ne as C,De as G,Ae as I,Ue as X};
//# sourceMappingURL=ImageOverlayPlugin-D1zbLZJK.js.map
