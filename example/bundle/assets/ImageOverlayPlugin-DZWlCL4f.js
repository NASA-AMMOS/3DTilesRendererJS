import{h as G,b9 as H,M as R,O as $,C as W,b as J,V as F,aN as Z,k as Y,l as M,B as q,ao as K,b2 as ee,al as te,aD as ne,y as ie}from"./three.module-CQU0seT4.js";import{X as ae,T as re}from"./TMSImageSource-BwMpBOyS.js";import{C as se,G as oe}from"./GeometryClipper-DDKqlNfA.js";import{P as le,s as ce}from"./TilesRenderer-Dt06WWnf.js";const he=new $,ue=new W;class de{constructor(e){this.renderer=e,this.renderTarget=null,this.range=[0,0,1,1],this.quad=new G(new H,new me)}setRenderTarget(e,n){this.renderTarget=e,this.range=[...n]}draw(e,n){const{range:t,renderer:i,quad:s,renderTarget:a}=this,r=s.material;r.map=e,r.minRange.x=R.mapLinear(n[0],t[0],t[2],-1,1),r.minRange.y=R.mapLinear(n[1],t[1],t[3],-1,1),r.maxRange.x=R.mapLinear(n[2],t[0],t[2],-1,1),r.maxRange.y=R.mapLinear(n[3],t[1],t[3],-1,1);const o=i.getRenderTarget(),h=i.autoClear;i.autoClear=!1,i.setRenderTarget(a),i.render(s,he),i.setRenderTarget(o),i.autoClear=h,r.map=null}clear(e,n=1){const{renderer:t,renderTarget:i}=this,s=t.getRenderTarget(),a=t.getClearColor(ue),r=t.getClearAlpha();t.setClearColor(e,n),t.setRenderTarget(i),t.clear(),t.setRenderTarget(s),t.setClearColor(a,r)}dispose(){this.quad.material.dispose(),this.quad.geometry.dispose()}}class me extends J{get minRange(){return this.uniforms.minRange.value}get maxRange(){return this.uniforms.maxRange.value}get map(){return this.uniforms.map.value}set map(e){this.uniforms.map.value=e}constructor(){super({depthWrite:!1,depthTest:!1,transparent:!1,side:Z,premultipliedAlpha:!0,uniforms:{map:{value:null},minRange:{value:new F},maxRange:{value:new F}},vertexShader:`

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

			`})}}function D(g,e,n,t,i){let[s,a,r,o]=g;a+=1e-8,s+=1e-8,o-=1e-8,r-=1e-8;const h=Math.max(Math.min(e,n.maxLevel),n.minLevel),[u,l,d,m]=n.getTilesInRange(s,a,r,o,h,t);for(let c=u;c<=d;c++)for(let f=l;f<=m;f++)i(c,f,h)}function fe(g,e,n){const t=new M,i={},s=[],a=g.getAttribute("position");g.computeBoundingBox(),g.boundingBox.getCenter(t).applyMatrix4(e),n.getPositionToCartographic(t,i);const r=i.lat,o=i.lon;let h=1/0,u=1/0,l=1/0,d=-1/0,m=-1/0,c=-1/0;for(let p=0;p<a.count;p++)t.fromBufferAttribute(a,p).applyMatrix4(e),n.getPositionToCartographic(t,i),Math.abs(Math.abs(i.lat)-Math.PI/2)<1e-5&&(i.lon=o),Math.abs(o-i.lon)>Math.PI&&(i.lon+=Math.sign(o-i.lon)*Math.PI*2),Math.abs(r-i.lat)>Math.PI&&(i.lat+=Math.sign(r-i.lat)*Math.PI*2),s.push(i.lon,i.lat,i.height),h=Math.min(h,i.lat),d=Math.max(d,i.lat),u=Math.min(u,i.lon),m=Math.max(m,i.lon),l=Math.min(l,i.height),c=Math.max(c,i.height);const f=[u,h,m,d],_=[...f,l,c];return{uv:s,range:f,region:_}}function X(g,e,n=null,t=null){let i=1/0,s=1/0,a=1/0,r=-1/0,o=-1/0,h=-1/0;const u=[],l=new Y;g.forEach(m=>{l.copy(m.matrixWorld),n&&l.premultiply(n);const{uv:c,region:f}=fe(m.geometry,l,e);u.push(c),i=Math.min(i,f[1]),r=Math.max(r,f[3]),s=Math.min(s,f[0]),o=Math.max(o,f[2]),a=Math.min(a,f[4]),h=Math.max(h,f[5])});let d=[s,i,o,r];if(t!==null){d=t.clampToProjectionBounds([s,i,o,r]);const[m,c,f,_]=t.toNormalizedRange(d);u.forEach(p=>{for(let y=0,v=p.length;y<v;y+=3){const S=p[y+0],P=p[y+1],T=p[y+2],[b,x]=t.toNormalizedPoint(S,P);p[y+0]=R.mapLinear(b,m,f,0,1),p[y+1]=R.mapLinear(x,c,_,0,1),p[y+2]=R.mapLinear(T,a,h,0,1)}})}return{uvs:u,range:d,region:[s,i,o,r,a,h]}}function pe(g,e,n){const t=new M,i=[],s=g.getAttribute("position");let a=1/0,r=1/0,o=1/0,h=-1/0,u=-1/0,l=-1/0;for(let m=0;m<s.count;m++)t.fromBufferAttribute(s,m).applyMatrix4(e),t.x/=n,i.push(t.x,t.y,t.z),a=Math.min(a,t.x),h=Math.max(h,t.x),r=Math.min(r,t.y),u=Math.max(u,t.y),o=Math.min(o,t.z),l=Math.max(l,t.z);return{uv:i,range:[a,r,h,u],heightRange:[o,l]}}function ge(g,e,n){let t=1/0,i=1/0,s=1/0,a=-1/0,r=-1/0,o=-1/0;const h=[],u=new Y;return g.forEach(l=>{u.copy(l.matrixWorld),e&&u.premultiply(e);const{uv:d,range:m,heightRange:c}=pe(l.geometry,u,n.aspectRatio);h.push(d),t=Math.min(t,m[0]),a=Math.max(a,m[2]),i=Math.min(i,m[1]),r=Math.max(r,m[3]),s=Math.min(s,c[0]),o=Math.max(o,c[1])}),h.forEach(l=>{for(let d=0,m=l.length;d<m;d+=3){const c=l[d+0],f=l[d+1];l[d+0]=R.mapLinear(c,t,a,0,1),l[d+1]=R.mapLinear(f,i,r,0,1)}}),{uvs:h,range:[t,i,a,r],heightRange:[s,o]}}const B=Symbol("OVERLAY_PARAMS");function _e(g,e){if(g[B])return g[B];const n={layerMaps:{value:[]},layerColor:{value:[]}};return g[B]=n,g.defines={...g.defines||{},LAYER_COUNT:0},g.onBeforeCompile=t=>{e&&e(t),t.uniforms={...t.uniforms,...n},t.vertexShader=t.vertexShader.replace(/void main\(\s*\)\s*{/,i=>`

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
					struct LayerTint {
						vec3 color;
						float opacity;
					};

					uniform sampler2D layerMaps[ LAYER_COUNT ];
					uniform LayerTint layerColor[ LAYER_COUNT ];
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

								// discard texture outside 0, 1 on w
								wDelta = fwidth( layerUV.z );
								wOpacity = smoothstep( - wDelta, 0.0, layerUV.z ) * smoothstep( 1.0 + wDelta, 1.0, layerUV.z );

								// apply tint & opacity
								tint.rgb *= layerColor[ i ].color;
								tint.rgba *= layerColor[ i ].opacity * wOpacity;

								// premultiplied alpha equation
								diffuseColor = tint + diffuseColor * ( 1.0 - tint.a );

							#endif

						}
					#pragma unroll_loop_end
				}
				#endif
			`)},n}const E=new Y,U=new M,k=new M,z=new M,L=new M,ye=new q,j=Symbol("SPLIT_TILE_DATA"),N=Symbol("SPLIT_HASH");function A(g,e,n,t){if(Array.isArray(n)){const s=n.map(a=>A(g,e,a,t)).filter(a=>a!==null);return s.length===0?null:Promise.all(s)}if(n.isReady)return i();return n.whenReady().then(i);function i(){const s=[],{imageSource:a,tiling:r}=n;D(g,e,r,n.isPlanarProjection,(h,u,l)=>{t?a.release(h,u,l):s.push(a.lock(h,u,l))});const o=s.filter(h=>h instanceof Promise);return o.length!==0?Promise.all(o):null}}function xe(g,e,n){let t=0;return D(g,e,n.tiling,n.isPlanarProjection,(i,s,a)=>{t++}),t}class Me{get enableTileSplitting(){return this._enableTileSplitting}set enableTileSplitting(e){this._enableTileSplitting!==e&&(this._enableTileSplitting=e,this._markNeedsUpdate())}constructor(e={}){const{overlays:n=[],resolution:t=256,renderer:i=null,enableTileSplitting:s=!0}=e;this.name="IMAGE_OVERLAY_PLUGIN",this.priority=-15,this.renderer=i,this.resolution=t,this._enableTileSplitting=s,this.overlays=[],this.needsUpdate=!1,this.tiles=null,this.tileComposer=null,this.tileControllers=new Map,this.overlayInfo=new Map,this.usedTextures=new Set,this.meshParams=new WeakMap,this.pendingTiles=new Map,this.processQueue=null,this._onUpdateAfter=null,this._onTileDownloadStart=null,this._cleanupScheduled=!1,this._virtualChildResetId=0,this._bytesUsed=new WeakMap,n.forEach(a=>{this.addOverlay(a)})}init(e){const n=new de(this.renderer),t=new le;t.maxJobs=10,t.priorityCallback=(i,s)=>{const a=i.tile,r=s.tile,o=e.visibleTiles.has(a),h=e.visibleTiles.has(r);return o!==h?o?1:-1:e.downloadQueue.priorityCallback(a,r)},this.tiles=e,this.tileComposer=n,this.processQueue=t,e.forEachLoadedModel((i,s)=>{this._processTileModel(i,s,!0)}),this._onUpdateAfter=async()=>{let i=!1;if(this.overlayInfo.forEach((s,a)=>{if(!!a.frame!=!!s.frame||a.frame&&s.frame&&!s.frame.equals(a.frame)){const r=s.order;this.deleteOverlay(a,!1),this.addOverlay(a,r),i=!0}}),i){const s=t.maxJobs;let a=0;t.items.forEach(r=>{e.visibleTiles.has(r.tile)&&a++}),t.maxJobs=a+t.currJobs,t.tryRunJobs(),t.maxJobs=s,this.needsUpdate=!0}if(this.needsUpdate){this.needsUpdate=!1;const{overlays:s,overlayInfo:a}=this;s.sort((r,o)=>a.get(r).order-a.get(o).order),e.forEachLoadedModel((r,o)=>{this._updateLayers(o)}),this.resetVirtualChildren(!this.enableTileSplitting),e.recalculateBytesUsed(),e.dispatchEvent({type:"needs-rerender"})}},this._onTileDownloadStart=({tile:i})=>{this._initTileOverlayInfo(i)},e.addEventListener("update-after",this._onUpdateAfter),e.addEventListener("tile-download-start",this._onTileDownloadStart),this.overlays.forEach(i=>{this._initOverlay(i)})}disposeTile(e){const{overlayInfo:n,tileControllers:t,processQueue:i,pendingTiles:s}=this;t.has(e)&&(t.get(e).abort(),t.delete(e),s.delete(e)),n.forEach(({tileInfo:a},r)=>{if(a.has(e)){const{meshInfo:o,range:h,meshRange:u,level:l,target:d,meshRangeMarked:m,rangeMarked:c}=a.get(e);u!==null&&m&&A(u,l,r,!0),h!==null&&c&&A(h,l,r,!0),d!==null&&d.dispose(),a.delete(e),o.clear()}}),i.removeByFilter(a=>a.tile===e)}calculateBytesUsed(e){const{overlayInfo:n}=this,t=this._bytesUsed;let i=null;return n.forEach(({tileInfo:s},a)=>{if(s.has(e)){const{target:r}=s.get(e);i=i||0,i+=ce(r==null?void 0:r.texture)}}),i!==null?(t.set(e,i),i):t.has(e)?t.get(e):0}processTileModel(e,n){return this._processTileModel(e,n)}async _processTileModel(e,n,t=!1){this.tileControllers.set(n,new AbortController),t||this.pendingTiles.set(n,e),this._wrapMaterials(e),this._initTileOverlayInfo(n),await this._initTileSceneOverlayInfo(e,n),this.expandVirtualChildren(e,n),this._updateLayers(n),this.pendingTiles.delete(n)}dispose(){const{tileComposer:e,tiles:n}=this;e.dispose(),[...this.overlays].forEach(i=>{this.deleteOverlay(i)}),n.forEachLoadedModel((i,s)=>{this._updateLayers(s),this.disposeTile(s),delete s[N]}),n.removeEventListener("update-after",this._onUpdateAfter),this.resetVirtualChildren(!0)}getAttributions(e){this.overlays.forEach(n=>{n.opacity>0&&n.getAttributions(e)})}parseToMesh(e,n,t,i){if(t==="image_overlay_tile_split")return n[j]}async resetVirtualChildren(e=!1){this._virtualChildResetId++;const n=this._virtualChildResetId;if(await Promise.all(this.overlays.map(a=>a.whenReady())),n!==this._virtualChildResetId)return;const{tiles:t}=this,i=new Set;t.forEachLoadedModel((a,r)=>{N in r&&i.add(r)}),i.forEach(a=>{if(a.parent===null)return;const r=a.cached.scene.clone();r.updateMatrixWorld();const{hash:o}=this._getSplitVectors(r,a);if(a[N]!==o||e){const h=s(a);h.sort((u,l)=>(l.__depth||0)-(u.__depth||0)),h.forEach(u=>{t.processNodeQueue.remove(u),t.lruCache.remove(u),u.parent=null}),a.children.length=0,a.__childrenProcessed=0}}),e||t.forEachLoadedModel((a,r)=>{this.expandVirtualChildren(a,r)});function s(a,r=[]){return a.children.forEach(o=>{r.push(o),s(o,r)}),r}}_getSplitVectors(e,n,t=k){const{tiles:i,overlayInfo:s}=this,a=new q;a.setFromObject(e),a.getCenter(t);const r=[],o=[];s.forEach(({tileInfo:u},l)=>{const d=u.get(n);if(d&&d.target&&l.tiling.maxLevel>d.level){l.frame?L.set(0,0,1).transformDirection(l.frame):(i.ellipsoid.getPositionToNormal(t,L),L.length()<1e-6&&L.set(1,0,0));const m=`${L.x.toFixed(3)},${L.y.toFixed(3)},${L.z.toFixed(3)}_`;o.includes(m)||o.push(m);const c=U.set(0,0,1);Math.abs(L.dot(c))>1-1e-4&&c.set(1,0,0);const f=new M().crossVectors(L,c).normalize(),_=new M().crossVectors(L,f).normalize();r.push(f,_)}});const h=[];for(;r.length!==0;){const u=r.pop().clone(),l=u.clone();for(let d=0;d<r.length;d++){const m=r[d],c=u.dot(m);Math.abs(c)>Math.cos(Math.PI/8)&&(l.addScaledVector(m,Math.sign(c)),u.copy(l).normalize(),r.splice(d,1),d--)}h.push(l.normalize())}return{directions:h,hash:o.join("")}}async expandVirtualChildren(e,n){if(n.children.length!==0||this.enableTileSplitting===!1)return;const t=e.clone();t.updateMatrixWorld();const{directions:i,hash:s}=this._getSplitVectors(t,n,k);if(n[N]=s,i.length===0)return;const a=new oe;a.attributeList=o=>!/^layer_uv_\d+/.test(o),i.map(o=>{a.addSplitOperation((h,u,l,d,m,c)=>(K.getInterpolatedAttribute(h.attributes.position,u,l,d,m,U),U.applyMatrix4(c).sub(k).dot(o)))});const r=[];a.forEachSplitPermutation(()=>{const o=a.clipObject(t);o.matrix.premultiply(n.cached.transformInverse).decompose(o.position,o.quaternion,o.scale);const h=[];if(o.traverse(l=>{if(l.isMesh){const d=l.material.clone();l.material=d;for(const m in d){const c=d[m];if(c&&c.isTexture&&c.source.data instanceof ImageBitmap){const f=document.createElement("canvas");f.width=c.image.width,f.height=c.image.height;const _=f.getContext("2d");_.scale(1,-1),_.drawImage(c.source.data,0,0,f.width,-f.height);const p=new ee(f);p.mapping=c.mapping,p.wrapS=c.wrapS,p.wrapT=c.wrapT,p.minFilter=c.minFilter,p.magFilter=c.magFilter,p.format=c.format,p.type=c.type,p.anisotropy=c.anisotropy,p.colorSpace=c.colorSpace,p.generateMipmaps=c.generateMipmaps,d[m]=p}}h.push(l)}}),h.length===0)return;const u={};if(n.boundingVolume.region&&(u.region=X(h,this.tiles.ellipsoid).region),n.boundingVolume.box||n.boundingVolume.sphere){ye.setFromObject(o,!0).getCenter(z);let l=0;o.traverse(d=>{const m=d.geometry;if(m){const c=m.attributes.position;for(let f=0,_=c.count;f<_;f++){const p=U.fromBufferAttribute(c,f).applyMatrix4(d.matrixWorld).distanceToSquared(z);l=Math.max(l,p)}}}),u.sphere=[...z,Math.sqrt(l)]}r.push({refine:"REPLACE",geometricError:n.geometricError*.5,boundingVolume:u,content:{uri:"./child.image_overlay_tile_split"},children:[],[j]:o})}),n.children.push(...r)}fetchData(e,n){if(/image_overlay_tile_split/.test(e))return new ArrayBuffer}addOverlay(e,n=null){const{tiles:t,overlays:i,overlayInfo:s}=this;n===null&&(n=i.reduce((r,o)=>Math.max(r,o.order+1),0));const a=new AbortController;i.push(e),s.set(e,{order:n,uniforms:{},tileInfo:new Map,controller:a,frame:e.frame?e.frame.clone():null}),t!==null&&this._initOverlay(e)}setOverlayOrder(e,n){this.overlays.indexOf(e)!==-1&&(this.overlayInfo.get(e).order=n,this._markNeedsUpdate())}deleteOverlay(e,n=!0){const{overlays:t,overlayInfo:i,processQueue:s}=this,a=t.indexOf(e);if(a!==-1){const{tileInfo:r,controller:o}=i.get(e);r.forEach(({meshInfo:h,target:u})=>{u!==null&&u.dispose(),h.clear()}),r.clear(),i.delete(e),o.abort(),s.removeByFilter(h=>h.overlay===e),t.splice(a,1),n&&e.dispose(),this._markNeedsUpdate()}}_calculateLevelFromOverlay(e,n,t,i=!1){if(e.isPlanarProjection){const{resolution:s}=this,{tiling:a}=e,r=i?n:a.toNormalizedRange(n),[o,h,u,l]=r,d=u-o,m=l-h;let c=0;const{maxLevel:f}=a;for(;c<f;c++){const _=s/d,p=s/m,{pixelWidth:y,pixelHeight:v}=a.getLevel(c);if(y>=_||v>=p)break}return c}else return t.__depthFromRenderedParent-1}_initOverlay(e){const{tiles:n}=this;e.imageSource.fetchOptions=n.fetchOptions,e.isInitialized||(e.imageSource.fetchData=(...s)=>n.downloadQueue.add({priority:-performance.now()},()=>e.fetch(...s)),e.init());const t=[],i=async(s,a)=>{this._initTileOverlayInfo(a,e);const r=this._initTileSceneOverlayInfo(s,a,e);t.push(r),await r,this._updateLayers(a)};n.forEachLoadedModel(i),this.pendingTiles.forEach((s,a)=>{i(s,a)}),Promise.all(t).then(()=>{this._markNeedsUpdate()})}_wrapMaterials(e){e.traverse(n=>{if(n.material){const t=_e(n.material,n.material.onBeforeCompile);this.meshParams.set(n,t)}})}_initTileOverlayInfo(e,n=this.overlays){if(Array.isArray(n)){n.forEach(r=>this._initTileOverlayInfo(e,r));return}const{overlayInfo:t,processQueue:i}=this;if(t.get(n).tileInfo.has(e))return;const s=e.__depthFromRenderedParent-1,a={range:null,meshRange:null,level:null,target:null,meshInfo:new Map,rangeMarked:!1,meshRangeMarked:!1};if(t.get(n).tileInfo.set(e,a),!n.isPlanarProjection){if(e.boundingVolume.region){const[r,o,h,u]=e.boundingVolume.region,l=[r,o,h,u];a.range=l,a.level=this._calculateLevelFromOverlay(n,l,e),i.add({tile:e,overlay:n},()=>(a.rangeMarked=!0,A(l,s,n,!1))).catch(()=>{})}}}async _initTileSceneOverlayInfo(e,n,t=this.overlays){if(Array.isArray(t))return Promise.all(t.map(x=>this._initTileSceneOverlayInfo(e,n,x)));const{tiles:i,overlayInfo:s,resolution:a,tileComposer:r,tileControllers:o,usedTextures:h,processQueue:u}=this,{ellipsoid:l}=i,{controller:d,tileInfo:m}=s.get(t),c=o.get(n);if(t.isReady||await t.whenReady(),d.signal.aborted||c.signal.aborted)return;const f=[];e.updateMatrixWorld(),e.traverse(x=>{x.isMesh&&f.push(x)});const{tiling:_,imageSource:p}=t,y=m.get(n);let v,S,P;if(t.isPlanarProjection){E.copy(t.frame).invert(),e.parent!==null&&E.multiply(i.group.matrixWorldInverse);let x;({range:v,uvs:S,heightRange:x}=ge(f,E,_)),P=!(x[0]>1||x[1]<0)}else E.identity(),e.parent!==null&&E.copy(i.group.matrixWorldInverse),{range:v,uvs:S}=X(f,l,E,_),P=!0;let T;t.isPlanarProjection?T=v:T=_.toNormalizedRange(v),y.level===null&&(y.level=this._calculateLevelFromOverlay(t,T,n,!0));let b=null;P&&xe(v,y.level,t)!==0&&(b=new ne(a,a,{depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,colorSpace:ie})),y.meshRange=v,y.target=b,f.forEach((x,I)=>{const w=new Float32Array(S[I]),C=new te(w,3);y.meshInfo.set(x,{attribute:C})}),b!==null&&await u.add({tile:n,overlay:t},async()=>{y.meshRangeMarked=!0;const x=A(v,y.level,t,!1);if(x){r.setRenderTarget(b,T),r.clear(16777215,0),D(v,y.level-1,_,t.isPlanarProjection,(I,w,C)=>{const V=_.getTileBounds(I,w,C,!0,!1),O=p.get(I,w,C);O&&!(O instanceof Promise)&&(r.draw(O,V),h.add(O),this._scheduleCleanup())});try{await x}catch{return}}d.signal.aborted||c.signal.aborted||(r.setRenderTarget(b,T),r.clear(16777215,0),D(v,y.level,_,t.isPlanarProjection,(I,w,C)=>{const V=_.getTileBounds(I,w,C,!0,!1),O=p.get(I,w,C);r.draw(O,V),h.add(O),this._scheduleCleanup()}))}).catch(()=>{})}_updateLayers(e){const{overlayInfo:n,overlays:t,tileControllers:i}=this,s=i.get(e);this.tiles.recalculateBytesUsed(e),!(!s||s.signal.aborted)&&t.forEach((a,r)=>{const{tileInfo:o}=n.get(a),{meshInfo:h,target:u}=o.get(e);h.forEach(({attribute:l},d)=>{const{geometry:m,material:c}=d,f=this.meshParams.get(d),_=`layer_uv_${r}`;m.getAttribute(_)!==l&&(m.setAttribute(_,l),m.dispose()),f.layerMaps.length=t.length,f.layerColor.length=t.length,f.layerMaps.value[r]=u!==null?u.texture:null,f.layerColor.value[r]=a,c.defines.LAYER_COUNT=t.length,c.needsUpdate=!0})})}_scheduleCleanup(){this._cleanupScheduled||(this._cleanupScheduled=!0,requestAnimationFrame(()=>{const{usedTextures:e}=this;e.forEach(n=>{n.dispose()}),e.clear(),this._cleanupScheduled=!1}))}_markNeedsUpdate(){this.needsUpdate===!1&&(this.needsUpdate=!0,this.tiles!==null&&this.tiles.dispatchEvent({type:"needs-update"}))}}class Q{get tiling(){return this.imageSource.tiling}get projection(){return this.tiling.projection}get isPlanarProjection(){return!!this.frame}get aspectRatio(){return this.tiling&&this.isReady?this.tiling.aspectRatio:1}constructor(e={}){const{opacity:n=1,color:t=16777215,frame:i=null}=e;this.imageSource=null,this.opacity=n,this.color=new W(t),this.frame=i!==null?i.clone():null,this.isReady=!1,this.isInitialized=!1}init(){this.isInitialized=!0,this.whenReady().then(()=>{this.isReady=!0})}fetch(...e){return fetch(...e)}whenReady(){}getAttributions(e){}dispose(){this.imageSource.dispose()}}class Te extends Q{constructor(e={}){super(e),this.imageSource=new ae(e),this.imageSource.fetchData=(...n)=>this.fetch(...n)}init(){this._whenReady=this.imageSource.init(),super.init()}whenReady(){return this._whenReady}}class be extends Q{constructor(e={}){super(e);const{apiToken:n,autoRefreshToken:t,assetId:i}=e;this.assetId=i,this.auth=new se({apiToken:n,autoRefreshToken:t}),this.imageSource=new re(e),this.auth.authURL=`https://api.cesium.com/v1/assets/${i}/endpoint`,this.imageSource.fetchData=(...s)=>this.fetch(...s),this._attributions=[]}init(){this._whenReady=this.auth.refreshToken().then(e=>(this._attributions=e.attributions.map(n=>({value:n.html,type:"html",collapsible:n.collapsible})),this.imageSource.url=e.url,this.imageSource.init())),super.init()}fetch(...e){return this.auth.fetch(...e)}whenReady(){return this._whenReady}getAttributions(e){e.push(...this._attributions)}}export{be as C,Me as I,Te as X};
//# sourceMappingURL=ImageOverlayPlugin-DZWlCL4f.js.map
