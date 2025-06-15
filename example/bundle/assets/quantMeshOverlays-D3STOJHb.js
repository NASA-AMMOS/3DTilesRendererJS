import{g as H,at as Q,i as I,O as K,C as Z,b as ee,V as W,au as te,k as ae,l as ne,ak as re,av as ie,y as oe,W as se,S as le,a as ce,A as de,D as ue}from"./three.module-D7KO9fW1.js";/* empty css               */import{g as me}from"./lil-gui.module.min-Vka56b52.js";import{S as he}from"./stats.module--VATS4Kh.js";import{a as pe,T as fe}from"./EPSGTilesPlugin-BLbCEnRQ.js";import{a as ge,C as ye}from"./CesiumIonAuthPlugin-CAlfrdFj.js";import{G as _e}from"./GlobeControls-BtrJAIFV.js";import{T as ve}from"./TilesRenderer-BtlQzkDd.js";import{T as Le}from"./TilesFadePlugin-B4jUXJFT.js";import"./TiledImageSource-ERPSo-Ic.js";import"./readMagicBytes-B3HEinov.js";import"./Ellipsoid-CsJ1QeYU.js";import"./EnvironmentControls-BoG6cGNa.js";import"./I3DMLoader-BqzkgmWd.js";import"./GLTFLoader-CtPRlX4X.js";import"./B3DMLoader-DI0Nnorf.js";import"./PNTSLoader-37LQDqUT.js";import"./CMPTLoader-CjPO0L4d.js";import"./EllipsoidRegion-b1k67aVx.js";const Ce=new K,Ie=new Z;class Te{constructor(e){this.renderer=e,this.renderTarget=null,this.range=[0,0,1,1],this.quad=new H(new Q,new Oe)}setRenderTarget(e,a){this.renderTarget=e,this.range=[...a]}draw(e,a){const{range:t,renderer:n,quad:r,renderTarget:o}=this,i=r.material;i.map=e,i.minRange.x=I.mapLinear(a[0],t[0],t[2],-1,1),i.minRange.y=I.mapLinear(a[1],t[1],t[3],-1,1),i.maxRange.x=I.mapLinear(a[2],t[0],t[2],-1,1),i.maxRange.y=I.mapLinear(a[3],t[1],t[3],-1,1);const s=n.getRenderTarget(),c=n.autoClear;n.autoClear=!1,n.setRenderTarget(o),n.render(r,Ce),n.setRenderTarget(s),n.autoClear=c,i.map=null}clear(e,a=1){const{renderer:t,renderTarget:n}=this,r=t.getRenderTarget(),o=t.getClearColor(Ie),i=t.getClearAlpha();t.setClearColor(e,a),t.setRenderTarget(n),t.clear(),t.setRenderTarget(r),t.setClearColor(o,i)}dispose(){this.quad.material.dispose(),this.quad.geometry.dispose()}}class Oe extends ee{get minRange(){return this.uniforms.minRange.value}get maxRange(){return this.uniforms.maxRange.value}get map(){return this.uniforms.map.value}set map(e){this.uniforms.map.value=e}constructor(){super({depthWrite:!1,depthTest:!1,transparent:!1,side:te,premultipliedAlpha:!0,uniforms:{map:{value:null},minRange:{value:new W},maxRange:{value:new W}},vertexShader:`

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

			`})}}function z(l,e,a,t){let[n,r,o,i]=l;r+=1e-7,n+=1e-7,i-=1e-7,o-=1e-7;const s=Math.max(Math.min(e,a.maxLevel),a.minLevel),[c,m,_,f]=a.getTilesInRange(n,r,o,i,s);for(let h=c;h<=_;h++)for(let u=m;u<=f;u++)a.getTileExists(h,u,s)&&t(h,u,s)}function Re(l,e,a){const t=new ne,n={},r=[],o=l.getAttribute("position");l.computeBoundingBox(),l.boundingBox.getCenter(t).applyMatrix4(e),a.getPositionToCartographic(t,n);const i=n.lat,s=n.lon;let c=1/0,m=1/0,_=-1/0,f=-1/0;for(let u=0;u<o.count;u++)t.fromBufferAttribute(o,u).applyMatrix4(e),a.getPositionToCartographic(t,n),Math.abs(Math.abs(n.lat)-Math.PI/2)<1e-5&&(n.lon=s),Math.abs(s-n.lon)>Math.PI&&(n.lon+=Math.sign(s-n.lon)*Math.PI*2),Math.abs(i-n.lat)>Math.PI&&(n.lat+=Math.sign(i-n.lat)*Math.PI*2),r.push(n.lon,n.lat),c=Math.min(c,n.lat),_=Math.max(_,n.lat),m=Math.min(m,n.lon),f=Math.max(f,n.lon);return{uv:r,range:[m,c,f,_]}}function we(l,e,a,t){let n=1/0,r=1/0,o=-1/0,i=-1/0;const s=[],c=new ae;l.forEach(u=>{c.copy(u.matrixWorld),a&&c.premultiply(a);const{uv:p,range:g}=Re(u.geometry,c,e);s.push(p),n=Math.min(n,g[1]),o=Math.max(o,g[3]),r=Math.min(r,g[0]),i=Math.max(i,g[2])});const m=t.convertLongitudeToProjection(r),_=t.convertLongitudeToProjection(i);let f=t.convertLatitudeToProjection(n),h=t.convertLatitudeToProjection(o);return f=I.clamp(f,0,1),h=I.clamp(h,0,1),s.forEach(u=>{for(let p=0,g=u.length;p<g;p+=2){const D=u[p+0],B=u[p+1],T=t.convertLongitudeToProjection(D);let w=t.convertLatitudeToProjection(B);w=I.clamp(w,0,1),u[p+0]=I.mapLinear(T,m,_,0,1),u[p+1]=I.mapLinear(w,f,h,0,1)}}),{uvs:s,range:[r,n,i,o]}}function Me(l,e){const a={layerMaps:{value:[]},layerColor:{value:[]}};return l.defines={...l.defines||{},LAYER_COUNT:0},l.onBeforeCompile=t=>{e&&e(t),t.uniforms={...t.uniforms,...a},t.vertexShader=t.vertexShader.replace(/void main\(\s*\)\s*{/,n=>`

				#pragma unroll_loop_start
					for ( int i = 0; i < 10; i ++ ) {

						#if UNROLLED_LOOP_INDEX < LAYER_COUNT

							attribute vec2 layer_uv_UNROLLED_LOOP_INDEX;
							varying vec2 v_layer_uv_UNROLLED_LOOP_INDEX;

						#endif


					}
				#pragma unroll_loop_end

				${n}

				#pragma unroll_loop_start
					for ( int i = 0; i < 10; i ++ ) {

						#if UNROLLED_LOOP_INDEX < LAYER_COUNT

							v_layer_uv_UNROLLED_LOOP_INDEX = layer_uv_UNROLLED_LOOP_INDEX;

						#endif

					}
				#pragma unroll_loop_end

			`),t.fragmentShader=t.fragmentShader.replace(/void main\(/,n=>`

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

				${n}

			`).replace(/#include <color_fragment>/,n=>`

				${n}

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
			`)},a}async function x(l,e,a,t){if(Array.isArray(a)){await Promise.all(a.map(i=>x(l,e,i,t)));return}await a.whenReady();const n=[],{imageSource:r,tiling:o}=a;z(l,e,o,(i,s,c)=>{t?r.release(i,s,c):n.push(r.lock(i,s,c))}),await Promise.all(n)}function xe(l,e,a){let t=0;return z(l,e,a.tiling,()=>{t++}),t}class Ee{constructor(e={}){const{overlays:a=[],resolution:t=256,renderer:n=null}=e;this.name="IMAGE_OVERLAY_PLUGIN",this.priority=100,this.renderer=n,this.resolution=t,this.overlays=[],this.needsUpdate=!1,this.tiles=null,this.tileComposer=null,this.tileControllers=new Map,this.overlayInfo=new Map,this.usedTextures=new Set,this.meshParams=new WeakMap,this._scheduled=!1,a.forEach(r=>{this.addOverlay(r)})}init(e){const a=new Te(this.renderer);this.tiles=e,this.tileComposer=a,e.forEachLoadedModel((n,r)=>{this.processTileModel(n,r)});let t=0;this._onUpdateAfter=async()=>{if(this.needsUpdate){this.needsUpdate=!1;const{overlays:n,overlayInfo:r}=this;n.sort((s,c)=>r.get(s).order-r.get(c).order),t++;const o=t,i=n.map(s=>s.whenReady());await Promise.all(i),o===t&&e.forEachLoadedModel((s,c)=>{this._updateLayers(c)})}},this._onTileDownloadStart=({tile:n})=>{this._initTileOverlayInfo(n)},e.addEventListener("update-after",this._onUpdateAfter),e.addEventListener("tile-download-start",this._onTileDownloadStart),this.overlays.forEach(n=>{this._initOverlay(n)})}disposeTile(e){const{overlayInfo:a,tileControllers:t}=this;t.has(e)&&(t.get(e).abort(),t.delete(e)),a.forEach(({tileInfo:n},r)=>{if(n.has(e)){const{meshInfo:o,range:i,meshRange:s,level:c,target:m}=n.get(e);s!==null&&x(s,c,r,!0),i!==null&&x(i,c,r,!0),m!==null&&m.dispose(),n.delete(e),o.clear()}})}async processTileModel(e,a){this.tileControllers.set(a,new AbortController),this._wrapMaterials(e),this._initTileOverlayInfo(a),await this._initTileSceneOverlayInfo(e,a),this._updateLayers(a)}dispose(){const{tileComposer:e,tiles:a}=this;e.dispose(),[...this.overlays].forEach(n=>{this.deleteOverlay(n)}),a.forEachLoadedModel((n,r)=>{this._updateLayers(r),this.disposeTile(r)}),a.removeEventListener("update-after",this._onUpdateAfter)}getAttributions(e){this.overlays.forEach(a=>{a.opacity>0&&a.getAttributions(e)})}addOverlay(e,a=null){const{tiles:t,overlays:n,overlayInfo:r}=this;a===null&&(a=n.reduce((i,s)=>Math.max(i,s.order+1),0));const o=new AbortController;n.push(e),r.set(e,{order:a,uniforms:{},tileInfo:new Map,controller:o}),t!==null&&this._initOverlay(e)}setOverlayOrder(e,a){this.overlays.indexOf(e)!==-1&&(this.overlayInfo.get(e).order=a,this.needsUpdate=!0)}deleteOverlay(e){const{overlays:a,overlayInfo:t}=this,n=a.indexOf(e);if(n!==-1){const{tileInfo:r,controller:o}=t.get(e);r.forEach(({meshInfo:i,target:s})=>{s!==null&&s.dispose(),i.clear()}),r.clear(),t.delete(e),o.abort(),e.dispose(),a.splice(n,1),this.needsUpdate=!0}}_initOverlay(e){const{tiles:a}=this;e.imageSource.fetchOptions=a.fetchOptions,e.init();const t=[];a.forEachLoadedModel(async(n,r)=>{this._initTileOverlayInfo(r,e);const o=this._initTileSceneOverlayInfo(n,r,e);t.push(o),await o,this.needsUpdate=!0}),Promise.all(t).then(()=>{this.needsUpdate=!0})}_wrapMaterials(e){e.traverse(a=>{if(a.material){const t=Me(a.material,a.material.onBeforeCompile);this.meshParams.set(a,t)}})}_initTileOverlayInfo(e,a=this.overlays){if(Array.isArray(a)){a.forEach(o=>this._initTileOverlayInfo(e,o));return}const{overlayInfo:t}=this;if(t.get(a).tileInfo.has(e))return;const n=e.__depthFromRenderedParent-1,r={range:null,meshRange:null,level:n,target:null,meshInfo:new Map};if(t.get(a).tileInfo.set(e,r),e.boundingVolume.region){const[o,i,s,c]=e.boundingVolume.region,m=[o,i,s,c];r.range=m,x(m,n,a,!1)}}async _initTileSceneOverlayInfo(e,a,t=this.overlays){if(Array.isArray(t))return Promise.all(t.map(C=>this._initTileSceneOverlayInfo(e,a,C)));const{tiles:n,overlayInfo:r,resolution:o,tileComposer:i,tileControllers:s,usedTextures:c}=this,{ellipsoid:m}=n,{controller:_,tileInfo:f}=r.get(t),h=s.get(a),u=[];if(e.updateMatrixWorld(),e.traverse(C=>{C.isMesh&&u.push(C)}),await t.whenReady(),_.signal.aborted||h.signal.aborted)return;const p=e.parent!==null?n.group.matrixWorldInverse:null,{tiling:g,projection:D,imageSource:B}=t,{range:T,uvs:w}=we(u,m,p,D),O=f.get(a);let E=null;if(xe(T,O.level,t)!==0&&(E=new ie(o,o,{depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,colorSpace:oe})),O.meshRange=T,O.target=E,u.forEach((C,Y)=>{const b=new Float32Array(w[Y]),N=new re(b,2);O.meshInfo.set(C,{attribute:N})}),await x(T,O.level,t,!1),!(_.signal.aborted||h.signal.aborted)&&E!==null){const C=g.clampToBounds(T),Y=g.toNormalizedRange(C);i.setRenderTarget(E,Y),i.clear(16777215,0),z(C,O.level,g,(b,N,J)=>{const q=g.getTileBounds(b,N,J,!0),G=B.get(b,N,J);i.draw(G,q),c.add(G),this._scheduleCleanup()})}}_updateLayers(e){const{overlayInfo:a,overlays:t,tileControllers:n}=this;n.get(e).signal.aborted||t.forEach((o,i)=>{const{tileInfo:s}=a.get(o),{meshInfo:c,target:m}=s.get(e);c.forEach(({attribute:_},f)=>{const{geometry:h,material:u}=f,p=this.meshParams.get(f),g=`layer_uv_${i}`;h.getAttribute(g)!==_&&(h.setAttribute(g,_),h.dispose()),p.layerMaps.length=t.length,p.layerColor.length=t.length,p.layerMaps.value[i]=m!==null?m.texture:null,p.layerColor.value[i]=o,u.defines.LAYER_COUNT=t.length,u.needsUpdate=!0})})}_scheduleCleanup(){this._scheduled||(this._scheduled=!0,requestAnimationFrame(()=>{const{usedTextures:e}=this;e.forEach(a=>{a.dispose()}),e.clear(),this._scheduled=!1}))}}class k{get tiling(){return this.imageSource.tiling}get projection(){return this.tiling.projection}constructor(e={}){const{opacity:a=1,color:t=16777215}=e;this.imageSource=null,this.opacity=a,this.color=new Z(t)}whenReady(){}getAttributions(e){}dispose(){this.imageSource.dispose()}}class be extends k{constructor(e={}){super(e),this.imageSource=new pe(e),this.url=e.url}init(){this._whenReady=this.imageSource.init(this.url)}whenReady(){return this._whenReady}}class V extends k{constructor(e={}){super(e);const{apiToken:a,authRefreshToken:t,assetId:n}=e;this.assetId=n,this.auth=new ge({apiToken:a,authRefreshToken:t}),this.imageSource=new fe(e),this.auth.authURL=`https://api.cesium.com/v1/assets/${n}/endpoint`,this.imageSource.fetchData=(...r)=>this.auth.fetch(...r),this._attributions=[]}init(){this._whenReady=this.auth.refreshToken().then(e=>(this._attributions=e.attributions.map(a=>({value:a.html,type:"html",collapsible:a.collapsible})),this.imageSource.init(e.url)))}whenReady(){return this._whenReady}getAttributions(e){e.push(...this._attributions)}}let A,R,v,d,y,S,M,U,P;const L={enableCacheDisplay:!1,enableRendererStats:!1,mapBase:!1,errorTarget:2,opacity:1,color:"#ffffff",reload:F};Ne();j();function F(){d&&(R.remove(d.group),d.dispose(),d=null),S=new V({opacity:L.layerOpacity,assetId:"3827",apiToken:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MGNiODVmZS1hNzliLTQ5NWYtOTdhOS02ZmIzMmZlYWRlMzAiLCJpZCI6MjY3NzgzLCJpYXQiOjE3MzY0Mjg0MTJ9.o7EtbJyQ6yNAgfHFal1RS1BKKM-RmZNusqBCeiowNZo"}),d=new ve,d.registerPlugin(new ye({apiToken:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MGNiODVmZS1hNzliLTQ5NWYtOTdhOS02ZmIzMmZlYWRlMzAiLCJpZCI6MjY3NzgzLCJpYXQiOjE3MzY0Mjg0MTJ9.o7EtbJyQ6yNAgfHFal1RS1BKKM-RmZNusqBCeiowNZo",assetId:"1",autoRefreshToken:!0})),d.registerPlugin(new Le),d.registerPlugin(new Ee({renderer:v,overlays:[S]})),$(),d.group.rotation.x=-Math.PI/2,R.add(d.group),d.setResolutionFromRenderer(y,v),d.setCamera(y),A.setTilesRenderer(d)}function Ne(){v=new se({antialias:!0}),v.setClearColor(1383455),document.body.appendChild(v.domElement),R=new le,y=new ce(60,window.innerWidth/window.innerHeight,1,16e7),y.position.set(115e4,392e4,498e4),y.rotation.set(.381,.202,-.09);const l=new de(16777215,.25),e=new ue(16777215,3);e.position.set(1,1,1),y.add(l,e,e.target),R.add(y),A=new _e(R,y,v.domElement,null),A.enableDamping=!0,F(),X(),window.addEventListener("resize",X,!1);const a=new me;a.width=300,a.add(L,"enableCacheDisplay"),a.add(L,"enableRendererStats"),a.add(L,"mapBase").onChange($),a.add(L,"errorTarget",1,30,1);const t=a.addFolder("Washington DC Layer");t.add(L,"opacity",0,1).onChange(n=>{S.opacity=n}),t.addColor(L,"color").onChange(n=>{S.color.set(n)}),a.add(L,"reload"),U=document.createElement("div"),document.getElementById("info").appendChild(U),P=new he,P.showPanel(0),document.body.appendChild(P.dom)}function $(){const l=d.getPluginByName("IMAGE_OVERLAY_PLUGIN");M&&l.deleteOverlay(M),L.mapBase?M=new be({url:"https://tile.openstreetmap.org/{z}/{x}/{y}.png"}):M=new V({assetId:"3954",apiToken:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MGNiODVmZS1hNzliLTQ5NWYtOTdhOS02ZmIzMmZlYWRlMzAiLCJpZCI6MjY3NzgzLCJpYXQiOjE3MzY0Mjg0MTJ9.o7EtbJyQ6yNAgfHFal1RS1BKKM-RmZNusqBCeiowNZo"}),l.addOverlay(M,-1)}function X(){const l=window.innerWidth/window.innerHeight;y.aspect=l,y.updateProjectionMatrix(),v.setSize(window.innerWidth,window.innerHeight),v.setPixelRatio(window.devicePixelRatio)}function j(){requestAnimationFrame(j),d&&(A.update(),d.setResolutionFromRenderer(y,v),d.setCamera(y),y.updateMatrixWorld(),d.errorTarget=L.errorTarget,d.update(),v.render(R,y),P.update(),Pe())}function Pe(){var e,a;let l="";if(L.enableCacheDisplay){const t=d.lruCache,n=t.cachedBytes/t.maxBytesSize;l+=`Downloading: ${d.stats.downloading} Parsing: ${d.stats.parsing} Visible: ${d.visibleTiles.size}<br/>`,l+=`Cache: ${(100*n).toFixed(2)}% ~${(t.cachedBytes/1e3/1e3).toFixed(2)}mb<br/>`}if(L.enableRendererStats){const t=v.info.memory,n=v.info.render,r=v.info.programs.length;l+=`Geometries: ${t.geometries} Textures: ${t.textures} Programs: ${r} Draw Calls: ${n.calls}`;const o=d.getPluginByName("BATCHED_TILES_PLUGIN"),i=d.getPluginByName("FADE_TILES_PLUGIN");if(o){let s=0;(e=o.batchedMesh)==null||e._instanceInfo.forEach(c=>{c.visible&&c.active&&s++}),(a=i.batchedMesh)==null||a._instanceInfo.forEach(c=>{c.visible&&c.active&&s++}),l+=", Batched: "+s}}U.innerHTML!==l&&(U.innerHTML=l)}
