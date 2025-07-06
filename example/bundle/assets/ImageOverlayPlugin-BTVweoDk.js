import{g as Y,b8 as X,i as x,O as V,C as D,b as j,V as S,aM as z,k as N,l as k,ak as F,aC as Q,y as W}from"./three.module-CzWreCHW.js";import{X as q,T as G}from"./TMSImageSource-B9ZUSnk7.js";import{C as J}from"./CesiumIonAuth-Bynk6iB2.js";import{P as $}from"./TilesRenderer-Bj3jFqhy.js";const Z=new V,H=new D;class K{constructor(e){this.renderer=e,this.renderTarget=null,this.range=[0,0,1,1],this.quad=new Y(new X,new ee)}setRenderTarget(e,n){this.renderTarget=e,this.range=[...n]}draw(e,n){const{range:t,renderer:a,quad:r,renderTarget:i}=this,s=r.material;s.map=e,s.minRange.x=x.mapLinear(n[0],t[0],t[2],-1,1),s.minRange.y=x.mapLinear(n[1],t[1],t[3],-1,1),s.maxRange.x=x.mapLinear(n[2],t[0],t[2],-1,1),s.maxRange.y=x.mapLinear(n[3],t[1],t[3],-1,1);const l=a.getRenderTarget(),o=a.autoClear;a.autoClear=!1,a.setRenderTarget(i),a.render(r,Z),a.setRenderTarget(l),a.autoClear=o,s.map=null}clear(e,n=1){const{renderer:t,renderTarget:a}=this,r=t.getRenderTarget(),i=t.getClearColor(H),s=t.getClearAlpha();t.setClearColor(e,n),t.setRenderTarget(a),t.clear(),t.setRenderTarget(r),t.setClearColor(i,s)}dispose(){this.quad.material.dispose(),this.quad.geometry.dispose()}}class ee extends j{get minRange(){return this.uniforms.minRange.value}get maxRange(){return this.uniforms.maxRange.value}get map(){return this.uniforms.map.value}set map(e){this.uniforms.map.value=e}constructor(){super({depthWrite:!1,depthTest:!1,transparent:!1,side:z,premultipliedAlpha:!0,uniforms:{map:{value:null},minRange:{value:new S},maxRange:{value:new S}},vertexShader:`

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

			`})}}function b(h,e,n,t,a){let[r,i,s,l]=h;i+=1e-7,r+=1e-7,l-=1e-7,s-=1e-7;const o=Math.max(Math.min(e,n.maxLevel),n.minLevel),[u,c,p,g]=n.getTilesInRange(r,i,s,l,o,t);for(let m=u;m<=p;m++)for(let f=c;f<=g;f++)n.getTileExists(m,f,o)&&a(m,f,o)}function te(h,e,n){const t=new k,a={},r=[],i=h.getAttribute("position");h.computeBoundingBox(),h.boundingBox.getCenter(t).applyMatrix4(e),n.getPositionToCartographic(t,a);const s=a.lat,l=a.lon;let o=1/0,u=1/0,c=-1/0,p=-1/0;for(let m=0;m<i.count;m++)t.fromBufferAttribute(i,m).applyMatrix4(e),n.getPositionToCartographic(t,a),Math.abs(Math.abs(a.lat)-Math.PI/2)<1e-5&&(a.lon=l),Math.abs(l-a.lon)>Math.PI&&(a.lon+=Math.sign(l-a.lon)*Math.PI*2),Math.abs(s-a.lat)>Math.PI&&(a.lat+=Math.sign(s-a.lat)*Math.PI*2),r.push(a.lon,a.lat),o=Math.min(o,a.lat),c=Math.max(c,a.lat),u=Math.min(u,a.lon),p=Math.max(p,a.lon);return{uv:r,range:[u,o,p,c]}}function ne(h,e,n,t){let a=1/0,r=1/0,i=-1/0,s=-1/0;const l=[],o=new N;h.forEach(f=>{o.copy(f.matrixWorld),n&&o.premultiply(n);const{uv:d,range:v}=te(f.geometry,o,e);l.push(d),a=Math.min(a,v[1]),i=Math.max(i,v[3]),r=Math.min(r,v[0]),s=Math.max(s,v[2])});const u=t.clampToBounds([r,a,s,i]),[c,p,g,m]=t.toNormalizedRange(u);return l.forEach(f=>{for(let d=0,v=f.length;d<v;d+=2){const _=f[d+0],y=f[d+1],[E,R]=t.toNormalizedPoint(_,y);f[d+0]=x.mapLinear(E,c,g,0,1),f[d+1]=x.mapLinear(R,p,m,0,1)}}),{uvs:l,range:u}}function ae(h,e,n){const t=new k,a=[],r=h.getAttribute("position");let i=1/0,s=1/0,l=-1/0,o=-1/0;for(let c=0;c<r.count;c++)t.fromBufferAttribute(r,c).applyMatrix4(e),t.x/=n,a.push(t.x,t.y),i=Math.min(i,t.x),l=Math.max(l,t.x),s=Math.min(s,t.y),o=Math.max(o,t.y);return{uv:a,range:[i,s,l,o]}}function re(h,e,n){let t=1/0,a=1/0,r=-1/0,i=-1/0;const s=[],l=new N;return h.forEach(o=>{l.copy(o.matrixWorld),e&&l.premultiply(e);const{uv:u,range:c}=ae(o.geometry,l,n.aspect);s.push(u),t=Math.min(t,c[0]),r=Math.max(r,c[2]),a=Math.min(a,c[1]),i=Math.max(i,c[3])}),s.forEach(o=>{for(let u=0,c=o.length;u<c;u+=2){const p=o[u+0],g=o[u+1];o[u+0]=x.mapLinear(p,t,r,0,1),o[u+1]=x.mapLinear(g,a,i,0,1)}}),{uvs:s,range:[t,a,r,i]}}const U=Symbol("OVERLAY_PARAMS");function ie(h,e){if(h[U])return h[U];const n={layerMaps:{value:[]},layerColor:{value:[]}};return h[U]=n,h.defines={...h.defines||{},LAYER_COUNT:0},h.onBeforeCompile=t=>{e&&e(t),t.uniforms={...t.uniforms,...n},t.vertexShader=t.vertexShader.replace(/void main\(\s*\)\s*{/,a=>`

				#pragma unroll_loop_start
					for ( int i = 0; i < 10; i ++ ) {

						#if UNROLLED_LOOP_INDEX < LAYER_COUNT

							attribute vec2 layer_uv_UNROLLED_LOOP_INDEX;
							varying vec2 v_layer_uv_UNROLLED_LOOP_INDEX;

						#endif


					}
				#pragma unroll_loop_end

				${a}

				#pragma unroll_loop_start
					for ( int i = 0; i < 10; i ++ ) {

						#if UNROLLED_LOOP_INDEX < LAYER_COUNT

							v_layer_uv_UNROLLED_LOOP_INDEX = layer_uv_UNROLLED_LOOP_INDEX;

						#endif

					}
				#pragma unroll_loop_end

			`),t.fragmentShader=t.fragmentShader.replace(/void main\(/,a=>`

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

							varying vec2 v_layer_uv_UNROLLED_LOOP_INDEX;

						#endif

					}
				#pragma unroll_loop_end

				${a}

			`).replace(/#include <color_fragment>/,a=>`

				${a}

				#if LAYER_COUNT != 0
				{
					vec4 tint;
					vec2 layerUV;
					float layerOpacity;
					#pragma unroll_loop_start
						for ( int i = 0; i < 10; i ++ ) {

							#if UNROLLED_LOOP_INDEX < LAYER_COUNT

								layerUV = v_layer_uv_UNROLLED_LOOP_INDEX;
								tint = texture( layerMaps[ i ], layerUV );

								// apply tint & opacity
								tint.rgb *= layerColor[ i ].color;
								tint.rgba *= layerColor[ i ].opacity;

								// premultiplied alpha equation
								diffuseColor = tint + diffuseColor * ( 1.0 - tint.a );

							#endif

						}
					#pragma unroll_loop_end
				}
				#endif
			`)},n}const C=new N;function w(h,e,n,t){if(Array.isArray(n)){const r=n.map(i=>w(h,e,i,t)).filter(i=>i!==null);return r.length===0?null:Promise.all(r)}if(n.isReady)return a();return n.whenReady().then(a);function a(){const r=[],{imageSource:i,tiling:s}=n;b(h,e,s,n.isPlanarProjection,(o,u,c)=>{t?i.release(o,u,c):r.push(i.lock(o,u,c))});const l=r.filter(o=>o instanceof Promise);return l.length!==0?Promise.all(l):null}}function se(h,e,n){let t=0;return b(h,e,n.tiling,n.isPlanarProjection,(a,r,i)=>{t++}),t}class he{constructor(e={}){const{overlays:n=[],resolution:t=256,renderer:a=null}=e;this.name="IMAGE_OVERLAY_PLUGIN",this.priority=100,this.renderer=a,this.resolution=t,this.overlays=[],this.needsUpdate=!1,this.tiles=null,this.tileComposer=null,this.tileControllers=new Map,this.overlayInfo=new Map,this.usedTextures=new Set,this.meshParams=new WeakMap,this.pendingTiles=new Map,this.processQueue=null,this._onUpdateAfter=null,this._onTileDownloadStart=null,this._cleanupScheduled=!1,n.forEach(r=>{this.addOverlay(r)})}init(e){const n=new K(this.renderer),t=new $;t.priorityCallback=(a,r)=>{const i=a.tile,s=r.tile,l=e.visibleTiles.has(i),o=e.visibleTiles.has(s);return l!==o?l?1:-1:e.downloadQueue.priorityCallback(i,s)},this.tiles=e,this.tileComposer=n,this.processQueue=t,e.forEachLoadedModel((a,r)=>{this._processTileModel(a,r,!0)}),this._onUpdateAfter=async()=>{let a=!1;if(this.overlayInfo.forEach((r,i)=>{if(!!i.frame!=!!r.frame||i.frame&&r.frame&&!r.frame.equals(i.frame)){const s=r.order;this.deleteOverlay(i,!1),this.addOverlay(i,s),a=!0}}),a){const r=t.maxJobs;let i=0;t.items.forEach(s=>{e.visibleTiles.has(s.tile)&&i++}),t.maxJobs=i+t.currJobs,t.tryRunJobs(),t.maxJobs=r,this.needsUpdate=!0}if(this.needsUpdate){this.needsUpdate=!1;const{overlays:r,overlayInfo:i}=this;r.sort((s,l)=>i.get(s).order-i.get(l).order),e.forEachLoadedModel((s,l)=>{this._updateLayers(l)}),e.dispatchEvent({type:"needs-rerender"})}},this._onTileDownloadStart=({tile:a})=>{this._initTileOverlayInfo(a)},e.addEventListener("update-after",this._onUpdateAfter),e.addEventListener("tile-download-start",this._onTileDownloadStart),this.overlays.forEach(a=>{this._initOverlay(a)})}disposeTile(e){const{overlayInfo:n,tileControllers:t,processQueue:a}=this;t.has(e)&&(t.get(e).abort(),t.delete(e)),n.forEach(({tileInfo:r},i)=>{if(r.has(e)){const{meshInfo:s,range:l,meshRange:o,level:u,target:c,meshRangeMarked:p,rangeMarked:g}=r.get(e);o!==null&&p&&w(o,u,i,!0),l!==null&&g&&w(l,u,i,!0),c!==null&&c.dispose(),r.delete(e),s.clear()}}),a.removeByFilter(r=>r.tile===e)}processTileModel(e,n){return this._processTileModel(e,n)}async _processTileModel(e,n,t=!1){this.tileControllers.set(n,new AbortController),t||this.pendingTiles.set(n,e),this._wrapMaterials(e),this._initTileOverlayInfo(n),await this._initTileSceneOverlayInfo(e,n),this._updateLayers(n),this.pendingTiles.delete(n)}dispose(){const{tileComposer:e,tiles:n}=this;e.dispose(),[...this.overlays].forEach(a=>{this.deleteOverlay(a)}),n.forEachLoadedModel((a,r)=>{this._updateLayers(r),this.disposeTile(r)}),n.removeEventListener("update-after",this._onUpdateAfter)}getAttributions(e){this.overlays.forEach(n=>{n.opacity>0&&n.getAttributions(e)})}addOverlay(e,n=null){const{tiles:t,overlays:a,overlayInfo:r}=this;n===null&&(n=a.reduce((s,l)=>Math.max(s,l.order+1),0));const i=new AbortController;a.push(e),r.set(e,{order:n,uniforms:{},tileInfo:new Map,controller:i,frame:e.frame?e.frame.clone():null}),t!==null&&this._initOverlay(e)}setOverlayOrder(e,n){this.overlays.indexOf(e)!==-1&&(this.overlayInfo.get(e).order=n,this._markNeedsUpdate())}deleteOverlay(e,n=!0){const{overlays:t,overlayInfo:a,processQueue:r}=this,i=t.indexOf(e);if(i!==-1){const{tileInfo:s,controller:l}=a.get(e);s.forEach(({meshInfo:o,target:u})=>{u!==null&&u.dispose(),o.clear()}),s.clear(),a.delete(e),l.abort(),r.removeByFilter(o=>o.overlay===e),t.splice(i,1),n&&e.dispose(),this._markNeedsUpdate()}}_calculateLevelFromOverlay(e,n,t,a=!1){if(e.isPlanarProjection){const{resolution:r}=this,{tiling:i}=e,s=a?n:i.toNormalizedRange(n),[l,o,u,c]=s,p=u-l,g=c-o;let m=0;const{maxLevel:f}=i;for(;m<f;m++){const d=r/p,v=r/g,{pixelWidth:_,pixelHeight:y}=i.getLevel(m);if(_>=d||y>=v)break}return m}else return t.__depthFromRenderedParent-1}_initOverlay(e){const{tiles:n}=this;e.imageSource.fetchOptions=n.fetchOptions,e.isInitialized||e.init();const t=[],a=async(r,i)=>{this._initTileOverlayInfo(i,e);const s=this._initTileSceneOverlayInfo(r,i,e);t.push(s),await s,this._markNeedsUpdate()};n.forEachLoadedModel(a),this.pendingTiles.forEach((r,i)=>{a(r,i)}),Promise.all(t).then(()=>{this._markNeedsUpdate()})}_wrapMaterials(e){e.traverse(n=>{if(n.material){const t=ie(n.material,n.material.onBeforeCompile);this.meshParams.set(n,t)}})}_initTileOverlayInfo(e,n=this.overlays){if(Array.isArray(n)){n.forEach(s=>this._initTileOverlayInfo(e,s));return}const{overlayInfo:t,processQueue:a}=this;if(t.get(n).tileInfo.has(e))return;const r=e.__depthFromRenderedParent-1,i={range:null,meshRange:null,level:null,target:null,meshInfo:new Map,rangeMarked:!1,meshRangeMarked:!1};if(t.get(n).tileInfo.set(e,i),!n.isPlanarProjection){if(e.boundingVolume.region){const[s,l,o,u]=e.boundingVolume.region,c=[s,l,o,u];i.range=c,i.level=this._calculateLevelFromOverlay(n,c,e),a.add({tile:e,overlay:n},()=>(i.rangeMarked=!0,w(c,r,n,!1))).catch(()=>{})}}}async _initTileSceneOverlayInfo(e,n,t=this.overlays){if(Array.isArray(t))return Promise.all(t.map(L=>this._initTileSceneOverlayInfo(e,n,L)));const{tiles:a,overlayInfo:r,resolution:i,tileComposer:s,tileControllers:l,usedTextures:o,processQueue:u}=this,{ellipsoid:c}=a,{controller:p,tileInfo:g}=r.get(t),m=l.get(n);if(t.isReady||await t.whenReady(),p.signal.aborted||m.signal.aborted)return;const f=[];e.updateMatrixWorld(),e.traverse(L=>{L.isMesh&&f.push(L)});const{tiling:d,imageSource:v}=t,_=g.get(n);let y,E;t.isPlanarProjection?(C.copy(t.frame).invert(),e.parent!==null&&C.multiply(a.group.matrixWorldInverse),{range:y,uvs:E}=re(f,C,d)):(C.identity(),e.parent!==null&&C.copy(a.group.matrixWorldInverse),{range:y,uvs:E}=ne(f,c,C,d));let R;t.isPlanarProjection?R=y:R=d.toNormalizedRange(y),_.level===null&&(_.level=this._calculateLevelFromOverlay(t,R,n,!0));let P=null;se(y,_.level,t)!==0&&(P=new Q(i,i,{depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,colorSpace:W})),_.meshRange=y,_.target=P,f.forEach((L,I)=>{const O=new Float32Array(E[I]),M=new F(O,2);_.meshInfo.set(L,{attribute:M})}),P!==null&&await u.add({tile:n,overlay:t},async()=>{_.meshRangeMarked=!0;const L=w(y,_.level,t,!1);L&&(s.setRenderTarget(P,R),s.clear(16777215,0),b(y,_.level-1,d,t.isPlanarProjection,(I,O,M)=>{const A=d.getTileBounds(I,O,M,!0),T=v.get(I,O,M);T&&!(T instanceof Promise)&&(s.draw(T,A),o.add(T),this._scheduleCleanup())}),await L),!(p.signal.aborted||m.signal.aborted)&&(s.setRenderTarget(P,R),s.clear(16777215,0),b(y,_.level,d,t.isPlanarProjection,(I,O,M)=>{const A=d.getTileBounds(I,O,M,!0),T=v.get(I,O,M);s.draw(T,A),o.add(T),this._scheduleCleanup()}))}).catch(()=>{})}_updateLayers(e){const{overlayInfo:n,overlays:t,tileControllers:a}=this,r=a.get(e);!r||r.signal.aborted||t.forEach((i,s)=>{const{tileInfo:l}=n.get(i),{meshInfo:o,target:u}=l.get(e);o.forEach(({attribute:c},p)=>{const{geometry:g,material:m}=p,f=this.meshParams.get(p),d=`layer_uv_${s}`;g.getAttribute(d)!==c&&(g.setAttribute(d,c),g.dispose()),f.layerMaps.length=t.length,f.layerColor.length=t.length,f.layerMaps.value[s]=u!==null?u.texture:null,f.layerColor.value[s]=i,m.defines.LAYER_COUNT=t.length,m.needsUpdate=!0})})}_scheduleCleanup(){this._cleanupScheduled||(this._cleanupScheduled=!0,requestAnimationFrame(()=>{const{usedTextures:e}=this;e.forEach(n=>{n.dispose()}),e.clear(),this._cleanupScheduled=!1}))}_markNeedsUpdate(){this.needsUpdate===!1&&(this.needsUpdate=!0,this.tiles!==null&&this.tiles.dispatchEvent({type:"needs-update"}))}}class B{get tiling(){return this.imageSource.tiling}get projection(){return this.tiling.projection}get isPlanarProjection(){return!!this.frame}constructor(e={}){const{opacity:n=1,color:t=16777215,frame:a=null}=e;this.imageSource=null,this.opacity=n,this.color=new D(t),this.frame=a!==null?a.clone():null,this.isReady=!1,this.isInitialized=!1}init(){this.isInitialized=!0,this.whenReady().then(()=>{this.isReady=!0})}whenReady(){}getAttributions(e){}dispose(){this.imageSource.dispose()}}class fe extends B{constructor(e={}){super(e),this.imageSource=new q(e),this.url=e.url}init(){this._whenReady=this.imageSource.init(this.url),super.init()}whenReady(){return this._whenReady}}class me extends B{constructor(e={}){super(e);const{apiToken:n,autoRefreshToken:t,assetId:a}=e;this.assetId=a,this.auth=new J({apiToken:n,autoRefreshToken:t}),this.imageSource=new G(e),this.auth.authURL=`https://api.cesium.com/v1/assets/${a}/endpoint`,this.imageSource.fetchData=(...r)=>this.auth.fetch(...r),this._attributions=[]}init(){this._whenReady=this.auth.refreshToken().then(e=>(this._attributions=e.attributions.map(n=>({value:n.html,type:"html",collapsible:n.collapsible})),this.imageSource.init(e.url))),super.init()}whenReady(){return this._whenReady}getAttributions(e){e.push(...this._attributions)}}export{me as C,he as I,fe as X};
