import{i as B,j as M,G,k as H,Q as U,S as V,W as N,O as Q,a as $,D as q,A as Z}from"./three.module-D__zfobH.js";import{T as J}from"./TilesRenderer-CXFY6_I3.js";import{g as K}from"./lil-gui.module.min-BZfzOr10.js";import{E as X}from"./EnvironmentControls-ChTcrc7D.js";import"./B3DMLoader-GhqTx3rt.js";import"./readMagicBytes-BpU7wwna.js";import"./LoaderBase-DXn50-K6.js";import"./GLTFLoader-tpP7d8rB.js";import"./PNTSLoader-C5XJGP_j.js";import"./I3DMLoader-DV8gfO_k.js";import"./CMPTLoader-BfbE6aHN.js";import"./GLTFExtensionLoader-DgjxHc9V.js";const{clamp:E}=B;class Y{constructor(){this.duration=250,this.fadeCount=0,this._lastTick=-1,this._fadeState=new Map,this._fadeParams=new WeakMap,this.onFadeComplete=null,this.onFadeStart=null,this.onFadeSetComplete=null,this.onFadeSetStart=null}prepareObject(e){e.traverse(t=>{t.material&&this.prepareMaterial(t.material)})}deleteObject(e){if(!e)return;this.completeFade(e);const t=this._fadeParams;e.traverse(a=>{const i=a.material;i&&(t.delete(i),i.onBeforeCompile=null,i.needsUpdate=!0)})}prepareMaterial(e){const t=this._fadeParams;if(t.has(e))return;const a={fadeIn:{value:0},fadeOut:{value:0}};e.defines={FEATURE_FADE:0},e.onBeforeCompile=i=>{i.uniforms={...i.uniforms,...a},i.fragmentShader=i.fragmentShader.replace(/void main\(/,l=>`
					#if FEATURE_FADE

					// adapted from https://www.shadertoy.com/view/Mlt3z8
					float bayerDither2x2( vec2 v ) {

						return mod( 3.0 * v.y + 2.0 * v.x, 4.0 );

					}

					float bayerDither4x4( vec2 v ) {

						vec2 P1 = mod( v, 2.0 );
						vec2 P2 = floor( 0.5 * mod( v, 4.0 ) );
						return 4.0 * bayerDither2x2( P1 ) + bayerDither2x2( P2 );

					}

					uniform float fadeIn;
					uniform float fadeOut;
					#endif

					${l}
				`).replace(/#include <dithering_fragment>/,l=>`

					${l}

					#if FEATURE_FADE

					float bayerValue = bayerDither4x4( floor( mod( gl_FragCoord.xy, 4.0 ) ) );
					float bayerBins = 16.0;
					float dither = ( 0.5 + bayerValue ) / bayerBins;
					if ( dither >= fadeIn ) {

						discard;

					}

					if ( dither < fadeOut ) {

						discard;

					}

					#endif

				`)},t.set(e,a)}guaranteeState(e){const t=this._fadeState;if(t.has(e))return!1;const a={fadeInTarget:0,fadeOutTarget:0,fadeIn:0,fadeOut:0};t.set(e,a);const i=this._fadeParams;return e.traverse(l=>{const p=l.material;if(p&&i.has(p)){const u=i.get(p);u.fadeIn.value=0,u.fadeOut.value=0}}),!0}completeFade(e){const t=this._fadeState;t.has(e)&&(t.delete(e),e.traverse(a=>{const i=a.material;i&&i.defines.FEATURE_FADE!==0&&(i.defines.FEATURE_FADE=0,i.needsUpdate=!0)}),this.fadeCount--,this.onFadeComplete&&this.onFadeComplete(e),this.fadeCount===0&&this.onFadeSetComplete&&this.onFadeSetComplete())}completeAllFades(){this._fadeState.forEach((e,t)=>{this.completeFade(t)})}forEachObject(e){this._fadeState.forEach((t,a)=>e(a))}fadeIn(e){const t=this.guaranteeState(e),a=this._fadeState.get(e);a.fadeInTarget=1,a.fadeOutTarget=0,a.fadeOut=0,t&&(this.fadeCount++,this.fadeCount===1&&this.onFadeSetStart&&this.onFadeSetStart(),this.onFadeStart&&this.onFadeStart(e))}fadeOut(e){const t=this.guaranteeState(e),a=this._fadeState.get(e);a.fadeOutTarget=1,t&&(a.fadeInTarget=1,a.fadeIn=1,this.fadeCount++,this.fadeCount===1&&this.onFadeSetStart&&this.onFadeSetStart(),this.onFadeStart&&this.onFadeStart(e))}update(){const e=window.performance.now();this._lastTick===-1&&(this._lastTick=e);const t=E((e-this._lastTick)/this.duration,0,1);this._lastTick=e;const a=this._fadeState,i=this._fadeParams;a.forEach((l,p)=>{const{fadeOutTarget:u,fadeInTarget:C}=l;let{fadeOut:m,fadeIn:s}=l;const w=Math.sign(C-s);s=E(s+w*t,0,1);const S=Math.sign(u-m);m=E(m+S*t,0,1),l.fadeIn=s,l.fadeOut=m;const v=+(m!==u||s!==C);p.traverse(z=>{const g=z.material;if(g&&i.has(g)){const O=i.get(g);O.fadeIn.value=s,O.fadeOut.value=m,v!==g.defines.FEATURE_FADE&&(g.defines.FEATURE_FADE=v,g.needsUpdate=!0)}}),((m===1||m===0)&&(s===1||s===0)||m>=s)&&this.completeFade(p)})}}const A=new M,x=new M,D=new U,P=new U,b=new M;function j(n,e,t){if(n.visible=!0,!t)this._fadeGroup.add(n),this._fadeManager.fadeOut(n);else{const a=e.__depthFromRenderedParent===0;a||(this.initialLayerRendered=!0),(!a||this.fadeRootTiles||this.initialLayerRendered)&&this._fadeManager.fadeIn(n)}}function ee(n,e){this._fadeManager.prepareObject(n),this._tileMap.set(n,e)}function te(n){this._fadeManager.deleteObject(n)}function ae(n){n.parent===this._fadeGroup&&this._fadeGroup.remove(n)}const ie=n=>class extends n{get fadeDuration(){return this._fadeManager.duration}set fadeDuration(e){this._fadeManager.duration=Number(e)}get fadingTiles(){return this._fadeManager.fadeCount}constructor(...e){super(...e),this.maximumFadeOutTiles=50,this.fadeRootTiles=!1;const t=new G,a=new Y;a.onFadeSetStart=()=>this.dispatchEvent({type:"fade-start"}),a.onFadeSetComplete=()=>this.dispatchEvent({type:"fade-end"}),this.group.add(t),a.onFadeComplete=ae.bind(this),this._fadeManager=a,this._fadeGroup=t,this._tileMap=new Map,this.addEventListener("load-model",i=>ee.call(this,i.scene,i.tile)),this.addEventListener("dispose-model",i=>te.call(this,i.scene)),this.addEventListener("tile-visibility-change",i=>j.call(this,i.scene,i.tile,i.visible)),this.initialLayerRendered=!1,this.prevCameraTransforms=new Map}update(...e){const t=this.displayActiveTiles,a=this._fadeManager;this.displayActiveTiles=!0;const i=a.fadeCount;super.update(...e),a.update();const l=a.fadeCount;i!==0&&l!==0&&this.dispatchEvent({type:"fade-change"}),this.displayActiveTiles=t,t||this.visibleTiles.forEach(s=>{s.cached.scene.visible=s.__inFrustum});const p=this.cameras,u=this.prevCameraTransforms;if(this.maximumFadeOutTiles<this._fadeGroup.children.length){let s=!0;p.forEach(w=>{if(!u.has(w))return;const S=w.matrixWorld,v=u.get(w);S.decompose(x,P,b),v.decompose(A,D,b);const y=P.angleTo(D),R=x.distanceTo(A);s=s&&(y>.25||R>.1)}),s&&this._fadeManager.completeAllFades()}p.forEach(s=>{u.has(s)||u.set(s,new H),u.get(s).copy(s.matrixWorld)});const C=this.lruCache,m=this._tileMap;a.forEachObject(s=>{C.markUsed(m.get(s))})}deleteCamera(e){super.deleteCamera(e),this.prevCameraTransforms.delete(e)}},I=ie(J);let f,d,_,T,h,o,c,F;const r={reinstantiateTiles:W,fadeRootTiles:!0,useFade:!0,errorTarget:12,fadeDuration:.5,renderScale:1,fadingGroundTiles:"0 tiles",camera:"perspective"};ne();k();function ne(){T=new V,h=new N({antialias:!0}),h.setPixelRatio(window.devicePixelRatio),h.setSize(window.innerWidth,window.innerHeight),h.setClearColor(14208704),document.body.appendChild(h.domElement),h.domElement.tabIndex=1,d=new Q(-1,1,1,-1,0,4e3),f=new $(60,window.innerWidth/window.innerHeight,.25,4e3),f.position.set(20,10,20),_=new X(T,f,h.domElement),_.minZoomDistance=2,_.cameraRadius=1;const n=new q(16777215);n.position.set(1,2,3),T.add(n);const e=new Z(16777215,.2);T.add(e),F=new G,F.rotation.set(Math.PI/2,0,0),T.add(F),W(),L(),window.addEventListener("resize",L,!1);const t=new K;t.add(r,"camera",["perspective","orthographic"]).onChange(i=>{i==="perspective"?(f.position.copy(d.position),f.rotation.copy(d.rotation),_.setCamera(f),o.deleteCamera(d),c.deleteCamera(d)):(d.position.copy(f.position),d.rotation.copy(f.rotation),_.setCamera(d),o.deleteCamera(f),c.deleteCamera(f))}),t.add(r,"useFade"),t.add(r,"fadeRootTiles"),t.add(r,"errorTarget",0,1e3),t.add(r,"fadeDuration",0,5),t.add(r,"renderScale",.1,1,.05).onChange(i=>h.setPixelRatio(i*window.devicePixelRatio));const a=t.add(r,"fadingGroundTiles").listen().disable();a.domElement.style.opacity=1,t.add(r,"reinstantiateTiles"),t.open()}function W(){o&&(o.dispose(),c.dispose()),o=new I("https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json"),o.fetchOptions.mode="cors",o.lruCache.minSize=900,o.lruCache.maxSize=1300,o.errorTarget=12,c=new I("https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_sky/0528_0260184_to_s64o256_sky_tileset.json"),c.fetchOptions.mode="cors",c.lruCache=o.lruCache,F.add(o.group,c.group)}function L(){const n=window.innerWidth/window.innerHeight;d.bottom=-40,d.top=40,d.left=-40*n,d.right=40*n,d.updateProjectionMatrix(),f.aspect=window.innerWidth/window.innerHeight,f.updateProjectionMatrix(),h.setSize(window.innerWidth,window.innerHeight)}function k(){requestAnimationFrame(k);const n=r.camera==="perspective"?f:d;_.update(),n.updateMatrixWorld(),o.errorTarget=r.errorTarget,o.fadeRootTiles=r.fadeRootTiles,o.setCamera(n),o.setResolutionFromRenderer(n,h),o.update(),c.fadeRootTiles=r.fadeRootTiles,c.setCamera(n),c.setResolutionFromRenderer(n,h),c.update(),o.fadeDuration=r.useFade?r.fadeDuration*1e3:0,c.fadeDuration=r.useFade?r.fadeDuration*1e3:0,h.render(T,n),r.fadingGroundTiles=o.fadingTiles+" tiles"}
