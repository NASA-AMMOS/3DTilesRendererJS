import{g as H,at as Q,i as I,O as K,C as Z,b as ee,V as W,au as te,k as ae,l as ne,ak as re,av as ie,y as oe,W as se,S as le,a as ce,A as de,D as ue}from"./three.module-D7KO9fW1.js";/* empty css               */import{g as he}from"./lil-gui.module.min-Vka56b52.js";import{S as me}from"./stats.module--VATS4Kh.js";import{a as pe,T as fe}from"./EPSGTilesPlugin-BLbCEnRQ.js";import{a as ge,C as ye}from"./CesiumIonAuthPlugin-BTmff_I6.js";import{G as _e}from"./GlobeControls-BtrJAIFV.js";import{T as ve}from"./TilesRenderer-BBgP2cW1.js";import{T as Le}from"./TilesFadePlugin-B4jUXJFT.js";import"./TiledImageSource-ERPSo-Ic.js";import"./readMagicBytes-B3HEinov.js";import"./Ellipsoid-CsJ1QeYU.js";import"./EnvironmentControls-BoG6cGNa.js";import"./I3DMLoader-BqzkgmWd.js";import"./GLTFLoader-CtPRlX4X.js";import"./B3DMLoader-DI0Nnorf.js";import"./PNTSLoader-37LQDqUT.js";import"./CMPTLoader-CjPO0L4d.js";import"./EllipsoidRegion-b1k67aVx.js";const Ce=new K,Ie=new Z;class Te{constructor(e){this.renderer=e,this.renderTarget=null,this.range=[0,0,1,1],this.quad=new H(new Q,new Oe)}setRenderTarget(e,t){this.renderTarget=e,this.range=[...t]}draw(e,t){const{range:a,renderer:n,quad:r,renderTarget:o}=this,i=r.material;i.map=e,i.minRange.x=I.mapLinear(t[0],a[0],a[2],-1,1),i.minRange.y=I.mapLinear(t[1],a[1],a[3],-1,1),i.maxRange.x=I.mapLinear(t[2],a[0],a[2],-1,1),i.maxRange.y=I.mapLinear(t[3],a[1],a[3],-1,1);const s=n.getRenderTarget(),c=n.autoClear;n.autoClear=!1,n.setRenderTarget(o),n.render(r,Ce),n.setRenderTarget(s),n.autoClear=c,i.map=null}clear(e,t=1){const{renderer:a,renderTarget:n}=this,r=a.getRenderTarget(),o=a.getClearColor(Ie),i=a.getClearAlpha();a.setClearColor(e,t),a.setRenderTarget(n),a.clear(),a.setRenderTarget(r),a.setClearColor(o,i)}dispose(){this.quad.material.dispose(),this.quad.geometry.dispose()}}class Oe extends ee{get minRange(){return this.uniforms.minRange.value}get maxRange(){return this.uniforms.maxRange.value}get map(){return this.uniforms.map.value}set map(e){this.uniforms.map.value=e}constructor(){super({depthWrite:!1,depthTest:!1,transparent:!1,side:te,premultipliedAlpha:!0,uniforms:{map:{value:null},minRange:{value:new W},maxRange:{value:new W}},vertexShader:`

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

			`})}}function z(l,e,t,a){let[n,r,o,i]=l;r+=1e-7,n+=1e-7,i-=1e-7,o-=1e-7;const s=Math.max(Math.min(e,t.maxLevel),t.minLevel),[c,h,v,g]=t.getTilesInRange(n,r,o,i,s);for(let p=c;p<=v;p++)for(let u=h;u<=g;u++)t.getTileExists(p,u,s)&&a(p,u,s)}function Re(l,e,t){const a=new ne,n={},r=[],o=l.getAttribute("position");l.computeBoundingBox(),l.boundingBox.getCenter(a).applyMatrix4(e),t.getPositionToCartographic(a,n);const i=n.lat,s=n.lon;let c=1/0,h=1/0,v=-1/0,g=-1/0;for(let u=0;u<o.count;u++)a.fromBufferAttribute(o,u).applyMatrix4(e),t.getPositionToCartographic(a,n),Math.abs(Math.abs(n.lat)-Math.PI/2)<1e-5&&(n.lon=s),Math.abs(s-n.lon)>Math.PI&&(n.lon+=Math.sign(s-n.lon)*Math.PI*2),Math.abs(i-n.lat)>Math.PI&&(n.lat+=Math.sign(i-n.lat)*Math.PI*2),r.push(n.lon,n.lat),c=Math.min(c,n.lat),v=Math.max(v,n.lat),h=Math.min(h,n.lon),g=Math.max(g,n.lon);return{uv:r,range:[h,c,g,v]}}function we(l,e,t,a){let n=1/0,r=1/0,o=-1/0,i=-1/0;const s=[],c=new ae;l.forEach(u=>{c.copy(u.matrixWorld),t&&c.premultiply(t);const{uv:f,range:y}=Re(u.geometry,c,e);s.push(f),n=Math.min(n,y[1]),o=Math.max(o,y[3]),r=Math.min(r,y[0]),i=Math.max(i,y[2])});const h=a.convertLongitudeToProjection(r),v=a.convertLongitudeToProjection(i);let g=a.convertLatitudeToProjection(n),p=a.convertLatitudeToProjection(o);return g=I.clamp(g,0,1),p=I.clamp(p,0,1),s.forEach(u=>{for(let f=0,y=u.length;f<y;f+=2){const D=u[f+0],B=u[f+1],O=a.convertLongitudeToProjection(D);let M=a.convertLatitudeToProjection(B);M=I.clamp(M,0,1),u[f+0]=I.mapLinear(O,h,v,0,1),u[f+1]=I.mapLinear(M,g,p,0,1)}}),{uvs:s,range:[r,n,i,o]}}function Me(l,e){const t={layerMaps:{value:[]},layerColor:{value:[]}};return l.defines={...l.defines||{},LAYER_COUNT:0},l.onBeforeCompile=a=>{e&&e(a),a.uniforms={...a.uniforms,...t},a.vertexShader=a.vertexShader.replace(/void main\(\s*\)\s*{/,n=>`

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

			`),a.fragmentShader=a.fragmentShader.replace(/void main\(/,n=>`

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
			`)},t}async function b(l,e,t,a){if(Array.isArray(t)){await Promise.all(t.map(i=>b(l,e,i,a)));return}await t.whenReady();const n=[],{imageSource:r,tiling:o}=t;z(l,e,o,(i,s,c)=>{a?r.release(i,s,c):n.push(r.lock(i,s,c))}),await Promise.all(n)}function be(l,e,t){let a=0;return z(l,e,t.tiling,()=>{a++}),a}class xe{constructor(e={}){const{overlays:t=[],resolution:a=256,renderer:n=null}=e;this.name="IMAGE_OVERLAY_PLUGIN",this.priority=100,this.renderer=n,this.resolution=a,this.overlays=[],this.needsUpdate=!1,this.tiles=null,this.tileComposer=null,this.tileControllers=new Map,this.overlayInfo=new Map,this.usedTextures=new Set,this.meshParams=new WeakMap,this.pendingTiles=new Map,this._scheduled=!1,t.forEach(r=>{this.addOverlay(r)})}init(e){const t=new Te(this.renderer);this.tiles=e,this.tileComposer=t,e.forEachLoadedModel((n,r)=>{this._processTileModel(n,r,!0)});let a=0;this._onUpdateAfter=async()=>{if(this.needsUpdate){this.needsUpdate=!1;const{overlays:n,overlayInfo:r}=this;n.sort((s,c)=>r.get(s).order-r.get(c).order),a++;const o=a,i=n.map(s=>s.whenReady());await Promise.all(i),o===a&&e.forEachLoadedModel((s,c)=>{this._updateLayers(c)})}},this._onTileDownloadStart=({tile:n})=>{this._initTileOverlayInfo(n)},e.addEventListener("update-after",this._onUpdateAfter),e.addEventListener("tile-download-start",this._onTileDownloadStart),this.overlays.forEach(n=>{this._initOverlay(n)})}disposeTile(e){const{overlayInfo:t,tileControllers:a}=this;a.has(e)&&(a.get(e).abort(),a.delete(e)),t.forEach(({tileInfo:n},r)=>{if(n.has(e)){const{meshInfo:o,range:i,meshRange:s,level:c,target:h}=n.get(e);s!==null&&b(s,c,r,!0),i!==null&&b(i,c,r,!0),h!==null&&h.dispose(),n.delete(e),o.clear()}})}processTileModel(e,t){return this._processTileModel(e,t)}async _processTileModel(e,t,a=!1){this.tileControllers.set(t,new AbortController),a||this.pendingTiles.set(t,e),this._wrapMaterials(e),this._initTileOverlayInfo(t),await this._initTileSceneOverlayInfo(e,t),this._updateLayers(t),this.pendingTiles.delete(t)}dispose(){const{tileComposer:e,tiles:t}=this;e.dispose(),[...this.overlays].forEach(n=>{this.deleteOverlay(n)}),t.forEachLoadedModel((n,r)=>{this._updateLayers(r),this.disposeTile(r)}),t.removeEventListener("update-after",this._onUpdateAfter)}getAttributions(e){this.overlays.forEach(t=>{t.opacity>0&&t.getAttributions(e)})}addOverlay(e,t=null){const{tiles:a,overlays:n,overlayInfo:r}=this;t===null&&(t=n.reduce((i,s)=>Math.max(i,s.order+1),0));const o=new AbortController;n.push(e),r.set(e,{order:t,uniforms:{},tileInfo:new Map,controller:o}),a!==null&&this._initOverlay(e)}setOverlayOrder(e,t){this.overlays.indexOf(e)!==-1&&(this.overlayInfo.get(e).order=t,this.needsUpdate=!0)}deleteOverlay(e){const{overlays:t,overlayInfo:a}=this,n=t.indexOf(e);if(n!==-1){const{tileInfo:r,controller:o}=a.get(e);r.forEach(({meshInfo:i,target:s})=>{s!==null&&s.dispose(),i.clear()}),r.clear(),a.delete(e),o.abort(),e.dispose(),t.splice(n,1),this.needsUpdate=!0}}_initOverlay(e){const{tiles:t}=this;e.imageSource.fetchOptions=t.fetchOptions,e.init();const a=[],n=async(r,o)=>{this._initTileOverlayInfo(o,e);const i=this._initTileSceneOverlayInfo(r,o,e);a.push(i),await i,this.needsUpdate=!0};t.forEachLoadedModel(n),this.pendingTiles.forEach((r,o)=>{n(r,o)}),Promise.all(a).then(()=>{this.needsUpdate=!0})}_wrapMaterials(e){e.traverse(t=>{if(t.material){const a=Me(t.material,t.material.onBeforeCompile);this.meshParams.set(t,a)}})}_initTileOverlayInfo(e,t=this.overlays){if(Array.isArray(t)){t.forEach(o=>this._initTileOverlayInfo(e,o));return}const{overlayInfo:a}=this;if(a.get(t).tileInfo.has(e))return;const n=e.__depthFromRenderedParent-1,r={range:null,meshRange:null,level:n,target:null,meshInfo:new Map};if(a.get(t).tileInfo.set(e,r),e.boundingVolume.region){const[o,i,s,c]=e.boundingVolume.region,h=[o,i,s,c];r.range=h,b(h,n,t,!1)}}async _initTileSceneOverlayInfo(e,t,a=this.overlays){if(Array.isArray(a))return Promise.all(a.map(C=>this._initTileSceneOverlayInfo(e,t,C)));const{tiles:n,overlayInfo:r,resolution:o,tileComposer:i,tileControllers:s,usedTextures:c}=this,{ellipsoid:h}=n,{controller:v,tileInfo:g}=r.get(a),p=s.get(t),u=[];if(e.updateMatrixWorld(),e.traverse(C=>{C.isMesh&&u.push(C)}),await a.whenReady(),v.signal.aborted||p.signal.aborted)return;const f=e.parent!==null?n.group.matrixWorldInverse:null,{tiling:y,projection:D,imageSource:B}=a,{range:O,uvs:M}=we(u,h,f,D),R=g.get(t);let x=null;if(be(O,R.level,a)!==0&&(x=new ie(o,o,{depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,colorSpace:oe})),R.meshRange=O,R.target=x,u.forEach((C,Y)=>{const E=new Float32Array(M[Y]),N=new re(E,2);R.meshInfo.set(C,{attribute:N})}),await b(O,R.level,a,!1),!(v.signal.aborted||p.signal.aborted)&&x!==null){const C=y.clampToBounds(O),Y=y.toNormalizedRange(C);i.setRenderTarget(x,Y),i.clear(16777215,0),z(C,R.level,y,(E,N,J)=>{const q=y.getTileBounds(E,N,J,!0),G=B.get(E,N,J);i.draw(G,q),c.add(G),this._scheduleCleanup()})}}_updateLayers(e){const{overlayInfo:t,overlays:a,tileControllers:n}=this;n.get(e).signal.aborted||a.forEach((o,i)=>{const{tileInfo:s}=t.get(o),{meshInfo:c,target:h}=s.get(e);c.forEach(({attribute:v},g)=>{const{geometry:p,material:u}=g,f=this.meshParams.get(g),y=`layer_uv_${i}`;p.getAttribute(y)!==v&&(p.setAttribute(y,v),p.dispose()),f.layerMaps.length=a.length,f.layerColor.length=a.length,f.layerMaps.value[i]=h!==null?h.texture:null,f.layerColor.value[i]=o,u.defines.LAYER_COUNT=a.length,u.needsUpdate=!0})})}_scheduleCleanup(){this._scheduled||(this._scheduled=!0,requestAnimationFrame(()=>{const{usedTextures:e}=this;e.forEach(t=>{t.dispose()}),e.clear(),this._scheduled=!1}))}}class k{get tiling(){return this.imageSource.tiling}get projection(){return this.tiling.projection}constructor(e={}){const{opacity:t=1,color:a=16777215}=e;this.imageSource=null,this.opacity=t,this.color=new Z(a)}whenReady(){}getAttributions(e){}dispose(){this.imageSource.dispose()}}class Ee extends k{constructor(e={}){super(e),this.imageSource=new pe(e),this.url=e.url}init(){this._whenReady=this.imageSource.init(this.url)}whenReady(){return this._whenReady}}class F extends k{constructor(e={}){super(e);const{apiToken:t,authRefreshToken:a,assetId:n}=e;this.assetId=n,this.auth=new ge({apiToken:t,authRefreshToken:a}),this.imageSource=new fe(e),this.auth.authURL=`https://api.cesium.com/v1/assets/${n}/endpoint`,this.imageSource.fetchData=(...r)=>this.auth.fetch(...r),this._attributions=[]}init(){this._whenReady=this.auth.refreshToken().then(e=>(this._attributions=e.attributions.map(t=>({value:t.html,type:"html",collapsible:t.collapsible})),this.imageSource.init(e.url)))}whenReady(){return this._whenReady}getAttributions(e){e.push(...this._attributions)}}let A,w,L,d,_,S,T,U,P;const m={enableCacheDisplay:!1,enableRendererStats:!1,mapBase:!1,errorTarget:2,opacity:1,color:"#ffffff",baseOpacity:1,baseColor:"#ffffff",reload:V};Ne();j();function V(){d&&(w.remove(d.group),d.dispose(),d=null),S=new F({opacity:m.layerOpacity,assetId:"3827",apiToken:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MGNiODVmZS1hNzliLTQ5NWYtOTdhOS02ZmIzMmZlYWRlMzAiLCJpZCI6MjY3NzgzLCJpYXQiOjE3MzY0Mjg0MTJ9.o7EtbJyQ6yNAgfHFal1RS1BKKM-RmZNusqBCeiowNZo"}),d=new ve,d.registerPlugin(new ye({apiToken:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MGNiODVmZS1hNzliLTQ5NWYtOTdhOS02ZmIzMmZlYWRlMzAiLCJpZCI6MjY3NzgzLCJpYXQiOjE3MzY0Mjg0MTJ9.o7EtbJyQ6yNAgfHFal1RS1BKKM-RmZNusqBCeiowNZo",assetId:"1",autoRefreshToken:!0})),d.registerPlugin(new Le),d.registerPlugin(new xe({renderer:L,overlays:[S]})),$(),d.group.rotation.x=-Math.PI/2,w.add(d.group),d.setResolutionFromRenderer(_,L),d.setCamera(_),A.setTilesRenderer(d)}function Ne(){L=new se({antialias:!0}),L.setClearColor(1383455),document.body.appendChild(L.domElement),w=new le,_=new ce(60,window.innerWidth/window.innerHeight,1,16e7),_.position.set(115e4,392e4,498e4),_.rotation.set(.381,.202,-.09);const l=new de(16777215,.25),e=new ue(16777215,3);e.position.set(1,1,1),_.add(l,e,e.target),w.add(_),A=new _e(w,_,L.domElement,null),A.enableDamping=!0,V(),X(),window.addEventListener("resize",X,!1);const t=new he;t.width=300,t.add(m,"enableCacheDisplay"),t.add(m,"enableRendererStats"),t.add(m,"mapBase").name("OpenStreetMap").onChange($),t.add(m,"errorTarget",1,30,1);const a=t.addFolder("Washington DC Layer");a.add(m,"opacity",0,1),a.addColor(m,"color");const n=t.addFolder("Base Layer");n.add(m,"baseOpacity",0,1).name("opacity"),n.addColor(m,"baseColor").name("color"),t.add(m,"reload"),U=document.createElement("div"),document.getElementById("info").appendChild(U),P=new me,P.showPanel(0),document.body.appendChild(P.dom)}function $(){const l=d.getPluginByName("IMAGE_OVERLAY_PLUGIN");T&&l.deleteOverlay(T),m.mapBase?T=new Ee({url:"https://tile.openstreetmap.org/{z}/{x}/{y}.png"}):T=new F({assetId:"3954",apiToken:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MGNiODVmZS1hNzliLTQ5NWYtOTdhOS02ZmIzMmZlYWRlMzAiLCJpZCI6MjY3NzgzLCJpYXQiOjE3MzY0Mjg0MTJ9.o7EtbJyQ6yNAgfHFal1RS1BKKM-RmZNusqBCeiowNZo"}),l.addOverlay(T,-1)}function X(){const l=window.innerWidth/window.innerHeight;_.aspect=l,_.updateProjectionMatrix(),L.setSize(window.innerWidth,window.innerHeight),L.setPixelRatio(window.devicePixelRatio)}function j(){requestAnimationFrame(j),d&&(S.color.set(m.color),S.opacity=m.opacity,T.color.set(m.baseColor),T.opacity=m.baseOpacity,A.update(),d.setResolutionFromRenderer(_,L),d.setCamera(_),_.updateMatrixWorld(),d.errorTarget=m.errorTarget,d.update(),L.render(w,_),P.update(),Pe())}function Pe(){var e,t;let l="";if(m.enableCacheDisplay){const a=d.lruCache,n=a.cachedBytes/a.maxBytesSize;l+=`Downloading: ${d.stats.downloading} Parsing: ${d.stats.parsing} Visible: ${d.visibleTiles.size}<br/>`,l+=`Cache: ${(100*n).toFixed(2)}% ~${(a.cachedBytes/1e3/1e3).toFixed(2)}mb<br/>`}if(m.enableRendererStats){const a=L.info.memory,n=L.info.render,r=L.info.programs.length;l+=`Geometries: ${a.geometries} Textures: ${a.textures} Programs: ${r} Draw Calls: ${n.calls}`;const o=d.getPluginByName("BATCHED_TILES_PLUGIN"),i=d.getPluginByName("FADE_TILES_PLUGIN");if(o){let s=0;(e=o.batchedMesh)==null||e._instanceInfo.forEach(c=>{c.visible&&c.active&&s++}),(t=i.batchedMesh)==null||t._instanceInfo.forEach(c=>{c.visible&&c.active&&s++}),l+=", Batched: "+s}}U.innerHTML!==l&&(U.innerHTML=l)}
