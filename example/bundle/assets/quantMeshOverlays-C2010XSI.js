import{g as k,at as ee,i as x,O as Y,C as U,b as V,V as O,au as W,aj as te,ak as P,l as re,av as F,y as G,k as ae,W as ie,S as se,a as ne,A as oe,D as le}from"./three.module-D7KO9fW1.js";/* empty css               */import{g as ce}from"./lil-gui.module.min-Vka56b52.js";import{S as ue}from"./stats.module--VATS4Kh.js";import{P as me,T as he}from"./TilesRenderer-BtlQzkDd.js";import{a as de,T as pe}from"./EPSGTilesPlugin-BgyJeQMn.js";import{a as ge,C as fe}from"./CesiumIonAuthPlugin-C7yiOUq4.js";import{G as ve}from"./GlobeControls-BR8_Faj7.js";import{T as ye}from"./TilesFadePlugin-Ds3aen5r.js";import"./I3DMLoader-BqzkgmWd.js";import"./readMagicBytes-B3HEinov.js";import"./GLTFLoader-CtPRlX4X.js";import"./Ellipsoid-CsJ1QeYU.js";import"./B3DMLoader-DI0Nnorf.js";import"./PNTSLoader-37LQDqUT.js";import"./CMPTLoader-CjPO0L4d.js";import"./EllipsoidRegion-b1k67aVx.js";import"./TiledImageSource-D6gNwUjU.js";import"./EnvironmentControls-BoG6cGNa.js";const we=new Y,Te=new U;class Ce{constructor(e){this.renderer=e,this.renderTarget=null,this.range=[0,0,1,1],this.quad=new k(new ee,new Me)}setRenderTarget(e,t){this.renderTarget=e,this.range=[...t]}draw(e,t,r=null,a=16777215,i=1){const{range:s,renderer:n,quad:u,renderTarget:l}=this,c=u.material;c.map=e,c.opacity=i,c.color.set(a),r!==null?(c.minCart.set(t[0],t[1]),c.maxCart.set(t[2],t[3]),c.isMercator=r.isMercator):(c.minCart.set(0,0),c.maxCart.set(1,1),c.isMercator=!1),c.minRange.x=x.mapLinear(t[0],s[0],s[2],-1,1),c.minRange.y=x.mapLinear(t[1],s[1],s[3],-1,1),c.maxRange.x=x.mapLinear(t[2],s[0],s[2],-1,1),c.maxRange.y=x.mapLinear(t[3],s[1],s[3],-1,1);const m=n.getRenderTarget(),p=n.autoClear;n.autoClear=!1,n.setRenderTarget(l),n.render(u,we),n.setRenderTarget(m),n.autoClear=p,c.map=null}clear(e,t=1){const{renderer:r,renderTarget:a}=this,i=r.getRenderTarget(),s=r.getClearColor(Te),n=r.getClearAlpha();r.setClearColor(e,t),r.setRenderTarget(a),r.clear(),r.setRenderTarget(i),r.setClearColor(s,n)}dispose(){this.quad.material.dispose(),this.quad.geometry.dispose()}}class Me extends V{get color(){return this.uniforms.color.value}get opacity(){var e;return(e=this.uniforms)==null?void 0:e.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get minRange(){return this.uniforms.minRange.value}get maxRange(){return this.uniforms.maxRange.value}set isMercator(e){this.uniforms.isMercator.value=e?1:0}get isMercator(){return this.uniforms.isMercator.value===1}get minCart(){return this.uniforms.minCart.value}get maxCart(){return this.uniforms.maxCart.value}get map(){return this.uniforms.map.value}set map(e){this.uniforms.map.value=e}constructor(){super({depthWrite:!1,depthTest:!1,transparent:!0,side:W,uniforms:{color:{value:new U},map:{value:null},minRange:{value:new O},maxRange:{value:new O},minCart:{value:new O},maxCart:{value:new O},isMercator:{value:0},opacity:{value:1}},vertexShader:`

				uniform vec2 minRange;
				uniform vec2 maxRange;
				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = vec4( mix( minRange, maxRange, uv ), 0, 1 );

				}

			`,fragmentShader:`

				uniform vec3 color;
				uniform float opacity;
				uniform sampler2D map;
				varying vec2 vUv;

				uniform int isMercator;
				uniform vec2 minRange;
				uniform vec2 maxRange;

				uniform vec2 minCart;
				uniform vec2 maxCart;

				#define PI ${Math.PI.toFixed(10)}

				// convert the cartographic value to the [ 0, 1 ] range using mercator
				vec2 cartToProjMercator( vec2 cart ) {

					float mercatorN = log( tan( ( PI / 4.0 ) + ( cart.y / 2.0 ) ) );
					vec2 result;
					result.x = ( cart.x + PI ) / ( 2.0 * PI );
					result.y = ( 1.0 / 2.0 ) + ( 1.0 * mercatorN / ( 2.0 * PI ) );
					return result;

				}

				void main() {

					vec2 uv = vUv;
					if ( isMercator == 1 ) {

						// take the point on the image and find the mercator point to sample
						vec2 minProj = cartToProjMercator( minCart );
						vec2 maxProj = cartToProjMercator( maxCart );
						vec2 proj = cartToProjMercator( mix( minCart, maxCart, uv ) );

						float range = maxProj.y - minProj.y;
						float offset = proj.y - minProj.y;
						uv.y = offset / range;

					}

					// sample the texture
					gl_FragColor = texture( map, uv );
					gl_FragColor.rgb *= color;
					gl_FragColor.a *= opacity;

				}

			`})}}const Re=new Y;class Ie{constructor(e){this.renderer=e,this.renderTarget=null,this.quad=new k(new te,new xe)}setRenderTarget(e){this.renderTarget=e}setUVs(e,t,r){const{geometry:a}=this.quad;this.quad.frustumCulled=!1,a.dispose(),a.setAttribute("fromUv",J(e)),a.setAttribute("toUv",J(t)),a.setIndex(r)}draw(e){const{renderer:t,quad:r,renderTarget:a}=this,i=r.material;i.map=e;const s=t.getRenderTarget(),n=t.autoClear;t.autoClear=!1,t.setRenderTarget(a),t.render(r,Re),t.setRenderTarget(s),t.autoClear=n,i.map=null}dispose(){this.quad.material.dispose(),this.quad.geometry.dispose()}}class xe extends V{get map(){return this.uniforms.map.value}set map(e){this.uniforms.map.value=e}constructor(){super({depthWrite:!1,depthTest:!1,transparent:!0,side:W,uniforms:{map:{value:null}},vertexShader:`

				attribute vec2 fromUv;
				attribute vec2 toUv;
				varying vec2 vUv;

				void main() {

					vUv = fromUv;
					gl_Position = vec4( mix( vec2( - 1 ), vec2( 1 ), toUv ), 0, 1 );

				}

			`,fragmentShader:`

				uniform sampler2D map;
				varying vec2 vUv;
				void main() {

					gl_FragColor = texture( map, vUv );

				}

			`})}}function J(o){return o instanceof P?o.clone():o instanceof Float32Array?new P(o,2,!1):Array.isArray(o)?new P(new Float32Array(o),2,!1):new P(o,2,!0)}function Z(o,e,t,r){let[a,i,s,n]=o;i+=1e-7,a+=1e-7,n-=1e-7,s-=1e-7;const u=Math.max(Math.min(e,t.maxLevel),t.minLevel),[l,c,m,p]=t.getTilesInRange(a,i,s,n,u);for(let g=l;g<=m;g++)for(let d=c;d<=p;d++)t.getTileExists(g,d,u)&&r(g,d,u)}function Oe(o,e,t){const r=new re,a={};o.computeBoundingBox(),o.boundingBox.getCenter(r).applyMatrix4(e),t.getPositionToCartographic(r,a);const i=a.lat,s=a.lon;let n=1/0,u=1/0,l=-1/0,c=-1/0;const m=[],p=o.getAttribute("position");for(let f=0;f<p.count;f++)r.fromBufferAttribute(p,f).applyMatrix4(e),t.getPositionToCartographic(r,a),Math.abs(Math.abs(a.lat)-Math.PI/2)<1e-5&&(a.lon=s),Math.abs(s-a.lon)>Math.PI&&(a.lon+=Math.sign(s-a.lon)*Math.PI*2),Math.abs(i-a.lat)>Math.PI&&(a.lat+=Math.sign(i-a.lat)*Math.PI*2),m.push(a.lon,a.lat),n=Math.min(n,a.lat),l=Math.max(l,a.lat),u=Math.min(u,a.lon),c=Math.max(c,a.lon);const g=c-u,d=l-n;for(let f=0;f<m.length;f+=2)m[f+0]-=u,m[f+0]/=g,m[f+1]-=n,m[f+1]/=d;return{uv:new Float32Array(m),range:[u,n,c,l]}}const S=new ae;async function R(o,e,t,r){if(Array.isArray(t)){await Promise.all(t.map(n=>R(o,e,n,r)));return}await t.whenReady();const a=[],{imageSource:i,tiling:s}=t;Z(o,e,s,(n,u,l)=>{r?i.release(n,u,l):a.push(i.lock(n,u,l))}),await Promise.all(a)}class Pe{constructor(e={}){const{overlays:t=[],resolution:r=256,renderer:a=null}=e;this.name="IMAGE_OVERLAY_PLUGIN",this.priority=100,this.renderer=a,this.resolution=r,this.overlays=t,this.overlayOrder=new WeakMap,this.needsUpdate=!1,this.processQueue=null,this.tiles=null,this.tileComposer=null,this.uvRemapper=null,this.scratchTarget=null,this.tileMeshInfo=new Map,window.PLUGIN=this}init(e){const t=new me;t.priorityCallback=(...l)=>e.downloadQueue.priorityCallback(...l);const r=new Ce(this.renderer),a=new Ie(this.renderer),i=new F(this.resolution,this.resolution,{depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,colorSpace:G});this.tiles=e,this.processQueue=t,this.tileComposer=r,this.uvRemapper=a,this.scratchTarget=i;const{overlays:s,overlayOrder:n}=this;this.overlays=[],s.forEach((l,c)=>{n.has(l)&&(c=n.overlay),this.addOverlay(l,c)}),e.forEachLoadedModel((l,c)=>{t.add(c,async m=>{await this._initTileState(l,m),await this._initOverlays(l,m,!0),this._redrawTileTextures(m)})});let u=0;this._onUpdateAfter=async()=>{if(this.needsUpdate){const{overlays:l,overlayOrder:c}=this;l.sort((g,d)=>c.get(g)-c.get(d)),this.needsUpdate=!1,u++;const m=u,p=l.map(g=>g.whenReady());await Promise.all(p),m===u&&e.forEachLoadedModel((g,d)=>{this._redrawTileTextures(d)})}},this._onTileDownloadStart=({tile:l})=>{this._initOverlaysFromTileRegion(l)},e.addEventListener("update-after",this._onUpdateAfter),e.addEventListener("tile-download-start",this._onTileDownloadStart)}disposeTile(e){const{processQueue:t,overlays:r,tileMeshInfo:a}=this;if(this._resetTileOverlay(e),t.remove(e),a.has(e)){const i=a.get(e);a.delete(e),i.forEach(({range:s,level:n,target:u})=>{u.dispose(),R(s,n,r,!0)})}if(e.boundingVolume.region){const i=e.__depthFromRenderedParent-1,s=e.boundingVolume.region;R(s,i,r,!0)}}processTileModel(e,t){return this.processQueue.add(t,async r=>{await this._initTileState(e,r),await this._initOverlays(e,r,!1),this._redrawTileTextures(r)})}getAttributions(e){this.overlays.forEach(t=>{t.opacity>0&&t.getAttributions(e)})}dispose(){this.tileComposer.dispose(),this.uvRemapper.dispose(),this.scratchTarget.dispose(),[...this.overlays].forEach(t=>{this.deleteOverlay(t)}),this.tiles.forEachLoadedModel((t,r)=>{this._resetTileOverlay(r),this.disposeTile(r)}),this.tiles.removeEventListener("update-after",this._onUpdateAfter)}addOverlay(e,t=null){const{tiles:r,overlays:a,overlayOrder:i}=this;e.imageSource.fetchOptions=r.fetchOptions,e.init(),t===null&&(t=a.length),i.set(e,t),a.push(e);const s=[];r.forEachLoadedModel((n,u)=>{s.push(this._initOverlays(n,u,!0,e))}),this.needsUpdate=!1,Promise.all(s).then(()=>{this.needsUpdate=!0})}setOverlayOrder(e,t){this.overlays.indexOf(e)!==-1&&(this.overlayOrder.set(e,t),this.needsUpdate=!0)}deleteOverlay(e){const t=this.overlays.indexOf(e);t!==-1&&(e.dispose(),this.overlayOrder.delete(e),this.overlays.splice(t,1),this.needsUpdate=!0)}async _initTileState(e,t){const{tiles:r,tileMeshInfo:a,resolution:i}=this,{ellipsoid:s,group:n}=r,u=[];e.updateMatrixWorld(),e.traverse(m=>{m.isMesh&&u.push(m)});const l=t.__depthFromRenderedParent-1,c=new Map;await Promise.all(u.map(async m=>{const{material:p,geometry:g}=m,{map:d}=p;S.copy(m.matrixWorld),e.parent&&S.premultiply(n.matrixWorldInverse);const{range:f,uv:I}=Oe(g,S,s);c.set(m,{range:f,level:l,uv:I,map:d,target:new F(i,i,{depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,colorSpace:G})})})),a.set(t,c)}async _initOverlays(e,t,r,a=this.overlays){if(Array.isArray(a)){await Promise.all(a.map(s=>this._initOverlays(e,t,r,s)));return}const i=[];i.push(this._initOverlayFromScene(a,e,t)),r&&i.push(this._initOverlaysFromTileRegion(t)),await Promise.all(i)}async _initOverlaysFromTileRegion(e){if(e.boundingVolume.region){const t=e.__depthFromRenderedParent-1,r=e.boundingVolume.region;await R(r,t,this.overlays,!1)}}async _initOverlayFromScene(e,t,r){const{tileMeshInfo:a}=this,i=a.get(r),s=[];t.traverse(n=>{if(i.has(n)){const{range:u,level:l}=i.get(n);s.push(R(u,l,e,!1))}}),await Promise.all(s)}_resetTileOverlay(e){const{tileMeshInfo:t}=this;t.has(e)&&t.get(e).forEach(({map:a},i)=>{i.material.map=a})}_redrawTileTextures(e){const{tileComposer:t,tileMeshInfo:r,scratchTarget:a,uvRemapper:i,overlays:s}=this;if(!r.has(e)||(this._resetTileOverlay(e),s.length===0))return;r.get(e).forEach((u,l)=>{const{map:c,level:m,range:p,uv:g,target:d}=u,{material:f,geometry:I}=l;t.setRenderTarget(a,p),t.clear(16777215,0);let E=0;s.forEach(T=>{Z(p,m,T.tiling,(N,B,z)=>{const X=T.tiling.getTileBounds(N,B,z),K=T.imageSource.get(N,B,z);E++,t.draw(K,X,T.projection,T.color,T.opacity)})}),E!==0?(t.setRenderTarget(d,p),c?(t.draw(c,p),c.dispose()):t.clear(16777215),i.setRenderTarget(d),i.setUVs(g,I.getAttribute("uv"),I.index),i.draw(a.texture),f.map=d.texture):d.dispose()})}}class D{get tiling(){return this.imageSource.tiling}get projection(){return this.tiling.projection}constructor(e={}){const{opacity:t=1,color:r=16777215}=e;this.imageSource=null,this.opacity=t,this.color=new U(r)}whenReady(){}getAttributions(e){}dispose(){this.imageSource.dispose()}}class _e extends D{constructor(e={}){super(e),this.imageSource=new de(e),this.url=e.url}init(){this._whenReady=this.imageSource.init(this.url)}whenReady(){return this._whenReady}}class q extends D{constructor(e={}){super(e);const{apiToken:t,authRefreshToken:r,assetId:a}=e;this.assetId=a,this.auth=new ge({apiToken:t,authRefreshToken:r}),this.imageSource=new pe(e),this.auth.authURL=`https://api.cesium.com/v1/assets/${a}/endpoint`,this.imageSource.fetchData=(...i)=>this.auth.fetch(...i),this._attributions=[]}init(){this._whenReady=this.auth.refreshToken().then(e=>(this._attributions=e.attributions.map(t=>({value:t.html,type:"html",collapsible:t.collapsible})),this.imageSource.init(e.url)))}whenReady(){return this._whenReady}getAttributions(e){e.push(...this._attributions)}}let b,C,y,h,v,A,M,L,_;const w={enableCacheDisplay:!1,enableRendererStats:!1,mapBase:!1,errorTarget:2,layerOpacity:1,reload:Q};be();H();function Q(){h&&(C.remove(h.group),h.dispose(),h=null),A=new q({opacity:w.layerOpacity,assetId:"3827",apiToken:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MGNiODVmZS1hNzliLTQ5NWYtOTdhOS02ZmIzMmZlYWRlMzAiLCJpZCI6MjY3NzgzLCJpYXQiOjE3MzY0Mjg0MTJ9.o7EtbJyQ6yNAgfHFal1RS1BKKM-RmZNusqBCeiowNZo"}),h=new he,h.registerPlugin(new fe({apiToken:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MGNiODVmZS1hNzliLTQ5NWYtOTdhOS02ZmIzMmZlYWRlMzAiLCJpZCI6MjY3NzgzLCJpYXQiOjE3MzY0Mjg0MTJ9.o7EtbJyQ6yNAgfHFal1RS1BKKM-RmZNusqBCeiowNZo",assetId:"1",autoRefreshToken:!0})),h.registerPlugin(new ye),h.registerPlugin(new Pe({renderer:y,overlays:[A]})),$(),h.group.rotation.x=-Math.PI/2,C.add(h.group),h.setResolutionFromRenderer(v,y),h.setCamera(v),b.setTilesRenderer(h)}function be(){y=new ie({antialias:!0}),y.setClearColor(1383455),document.body.appendChild(y.domElement),C=new se,v=new ne(60,window.innerWidth/window.innerHeight,1,16e7),v.position.set(48e5,257e4,1472e4),v.lookAt(0,0,0);const o=new oe(16777215,.25),e=new le(16777215,3);e.position.set(1,1,1),v.add(o,e,e.target),C.add(v),b=new ve(C,v,y.domElement,null),b.enableDamping=!0,Q(),j(),window.addEventListener("resize",j,!1);const t=new ce;t.width=300,t.add(w,"enableCacheDisplay"),t.add(w,"enableRendererStats"),t.add(w,"mapBase").onChange($),t.add(w,"errorTarget",1,30,1),t.add(w,"layerOpacity",0,1).onChange(r=>{A.opacity=r,h.getPluginByName("IMAGE_OVERLAY_PLUGIN").needsUpdate=!0}),t.add(w,"reload"),L=document.createElement("div"),document.getElementById("info").appendChild(L),_=new ue,_.showPanel(0),document.body.appendChild(_.dom)}function $(){const o=h.getPluginByName("IMAGE_OVERLAY_PLUGIN");M&&o.deleteOverlay(M),w.mapBase?M=new _e({url:"https://tile.openstreetmap.org/{z}/{x}/{y}.png"}):M=new q({assetId:"3954",apiToken:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MGNiODVmZS1hNzliLTQ5NWYtOTdhOS02ZmIzMmZlYWRlMzAiLCJpZCI6MjY3NzgzLCJpYXQiOjE3MzY0Mjg0MTJ9.o7EtbJyQ6yNAgfHFal1RS1BKKM-RmZNusqBCeiowNZo"}),o.addOverlay(M,-1)}function j(){const o=window.innerWidth/window.innerHeight;v.aspect=o,v.updateProjectionMatrix(),y.setSize(window.innerWidth,window.innerHeight),y.setPixelRatio(window.devicePixelRatio)}function H(){requestAnimationFrame(H),h&&(b.update(),h.setResolutionFromRenderer(v,y),h.setCamera(v),v.updateMatrixWorld(),h.errorTarget=w.errorTarget,h.update(),y.render(C,v),_.update(),Le())}function Le(){var e,t;let o="";if(w.enableCacheDisplay){const r=h.lruCache,a=r.cachedBytes/r.maxBytesSize;o+=`Downloading: ${h.stats.downloading} Parsing: ${h.stats.parsing} Visible: ${h.visibleTiles.size}<br/>`,o+=`Cache: ${(100*a).toFixed(2)}% ~${(r.cachedBytes/1e3/1e3).toFixed(2)}mb<br/>`}if(w.enableRendererStats){const r=y.info.memory,a=y.info.render,i=y.info.programs.length;o+=`Geometries: ${r.geometries} Textures: ${r.textures} Programs: ${i} Draw Calls: ${a.calls}`;const s=h.getPluginByName("BATCHED_TILES_PLUGIN"),n=h.getPluginByName("FADE_TILES_PLUGIN");if(s){let u=0;(e=s.batchedMesh)==null||e._instanceInfo.forEach(l=>{l.visible&&l.active&&u++}),(t=n.batchedMesh)==null||t._instanceInfo.forEach(l=>{l.visible&&l.active&&u++}),o+=", Batched: "+u}}L.innerHTML!==o&&(L.innerHTML=o)}
