import{n as D,k as _,G as L,p as A,Q as y}from"./three.module-BB2USAyE.js";const{clamp:p}=D;class U{constructor(){this.duration=250,this.fadeCount=0,this._lastTick=-1,this._fadeState=new Map,this._fadeParams=new WeakMap,this.onFadeComplete=null,this.onFadeStart=null,this.onFadeSetComplete=null,this.onFadeSetStart=null}prepareObject(e){e.traverse(a=>{a.material&&this.prepareMaterial(a.material)})}deleteObject(e){if(!e)return;this.completeFade(e);const a=this._fadeParams;e.traverse(i=>{const t=i.material;t&&(a.delete(t),t.onBeforeCompile=null,t.needsUpdate=!0)})}prepareMaterial(e){const a=this._fadeParams;if(a.has(e))return;const i={fadeIn:{value:0},fadeOut:{value:0}};e.defines={FEATURE_FADE:0},e.onBeforeCompile=t=>{t.uniforms={...t.uniforms,...i},t.fragmentShader=t.fragmentShader.replace(/void main\(/,r=>`
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

					${r}
				`).replace(/#include <dithering_fragment>/,r=>`

					${r}

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

				`)},a.set(e,i)}guaranteeState(e){const a=this._fadeState;if(a.has(e))return!1;const i={fadeInTarget:0,fadeOutTarget:0,fadeIn:0,fadeOut:0};a.set(e,i);const t=this._fadeParams;return e.traverse(r=>{const o=r.material;if(o&&t.has(o)){const f=t.get(o);f.fadeIn.value=0,f.fadeOut.value=0}}),!0}completeFade(e){const a=this._fadeState;a.has(e)&&(a.delete(e),e.traverse(i=>{const t=i.material;t&&t.defines.FEATURE_FADE!==0&&(t.defines.FEATURE_FADE=0,t.needsUpdate=!0)}),this.fadeCount--,this.onFadeComplete&&this.onFadeComplete(e),this.fadeCount===0&&this.onFadeSetComplete&&this.onFadeSetComplete())}completeAllFades(){this._fadeState.forEach((e,a)=>{this.completeFade(a)})}forEachObject(e){this._fadeState.forEach((a,i)=>e(i))}fadeIn(e){const a=this.guaranteeState(e),i=this._fadeState.get(e);i.fadeInTarget=1,i.fadeOutTarget=0,i.fadeOut=0,a&&(this.fadeCount++,this.fadeCount===1&&this.onFadeSetStart&&this.onFadeSetStart(),this.onFadeStart&&this.onFadeStart(e))}fadeOut(e){const a=this.guaranteeState(e),i=this._fadeState.get(e);i.fadeOutTarget=1,a&&(i.fadeInTarget=1,i.fadeIn=1,this.fadeCount++,this.fadeCount===1&&this.onFadeSetStart&&this.onFadeSetStart(),this.onFadeStart&&this.onFadeStart(e))}update(){const e=window.performance.now();this._lastTick===-1&&(this._lastTick=e);const a=p((e-this._lastTick)/this.duration,0,1);this._lastTick=e;const i=this._fadeState,t=this._fadeParams;i.forEach((r,o)=>{const{fadeOutTarget:f,fadeInTarget:h}=r;let{fadeOut:d,fadeIn:n}=r;const u=Math.sign(h-n);n=p(n+u*a,0,1);const m=Math.sign(f-d);d=p(d+m*a,0,1),r.fadeIn=n,r.fadeOut=d;const c=+(d!==f||n!==h);o.traverse(O=>{const l=O.material;if(l&&t.has(l)){const T=t.get(l);T.fadeIn.value=n,T.fadeOut.value=d,c!==l.defines.FEATURE_FADE&&(l.defines.FEATURE_FADE=c,l.needsUpdate=!0)}}),((d===1||d===0)&&(n===1||n===0)||d>=n)&&this.completeFade(o)})}}const F=new _,E=new _,C=new y,M=new y,S=new _;function w(s,e,a){if(s.visible=!0,!a)this._fadeGroup.add(s),this._fadeManager.fadeOut(s);else{const i=e.__depthFromRenderedParent===1;i||(this._initialLayerRendered=!0),(!i||this.fadeRootTiles||this._initialLayerRendered)&&this._fadeManager.fadeIn(s)}}function I(s,e){this._fadeManager.prepareObject(s),this._tileMap.set(s,e)}function P(s){this._fadeManager.deleteObject(s)}function b(s){s.parent===this._fadeGroup&&this._fadeGroup.remove(s)}function x(s){this._prevCameraTransforms.set(s,new A)}function R(s){this._prevCameraTransforms.delete(s)}function G(){const s=this._fadeManager,e=this.tiles;this._fadingBefore=s.fadeCount,this._displayActiveTiles=this.displayActiveTiles,e.displayActiveTiles=!0}function B(){const s=this._fadeManager,e=this._fadeGroup,a=this._displayActiveTiles,i=this._fadingBefore,t=this.tiles,r=this._prevCameraTransforms,o=this._tileMap,f=t.lruCache,h=t.cameras;t.displayActiveTiles=a,s.update();const d=s.fadeCount;if(i!==0&&d!==0&&t.dispatchEvent({type:"fade-change"}),a||t.visibleTiles.forEach(n=>{n.cached.scene.visible=n.__inFrustum}),this.maximumFadeOutTiles<e.children.length){let n=!0;h.forEach(u=>{if(!r.has(u))return;const m=u.matrixWorld,c=r.get(u);m.decompose(E,M,S),c.decompose(F,C,S);const v=M.angleTo(C),g=E.distanceTo(F);n=n&&(v>.25||g>.1)}),n&&s.completeAllFades()}h.forEach(n=>{r.get(n).copy(n.matrixWorld)}),s.forEachObject(n=>{f.markUsed(o.get(n))})}class V{get fadeDuration(){return this._fadeManager.duration}set fadeDuration(e){this._fadeManager.duration=Number(e)}get fadingTiles(){return this._fadeManager.fadeCount}constructor(e){e={maximumFadeOutTiles:50,fadeRootTiles:!1,fadeDuration:250,...e},this.name="FADE_TILES_PLUGIN",this.tiles=null,this._fadeManager=new U,this._initialLayerRendered=!1,this._prevCameraTransforms=null,this._fadeGroup=null,this._tileMap=null,this.maximumFadeOutTiles=e.maximumFadeOutTiles,this.fadeRootTiles=e.fadeRootTiles,this.fadeDuration=e.fadeDuration}init(e){const a=new L;a.name="TilesFadeGroup",e.group.add(a);const i=this._fadeManager;i.onFadeSetStart=()=>e.dispatchEvent({type:"fade-start"}),i.onFadeSetComplete=()=>e.dispatchEvent({type:"fade-end"}),i.onFadeComplete=b.bind(this),this.tiles=e,this._fadeManager=i,this._fadeGroup=a,this._tileMap=new Map,this._prevCameraTransforms=new Map,e.cameras.forEach(t=>{this._prevCameraTransforms.set(t,new A)}),this._onLoadModel=t=>I.call(this,t.scene,t.tile),this._onDisposeModel=t=>P.call(this,t.scene),this._onTileVisibilityChange=t=>w.call(this,t.scene,t.tile,t.visible),this._onAddCamera=t=>x.call(this,t.camera),this._onDeleteCamera=t=>R.call(this,t.camera),this._onUpdateBefore=()=>G.call(this),this._onUpdateAfter=()=>B.call(this),e.addEventListener("load-model",this._onLoadModel),e.addEventListener("dispose-model",this._onDisposeModel),e.addEventListener("tile-visibility-change",this._onTileVisibilityChange),e.addEventListener("add-camera",this._onAddCamera),e.addEventListener("delete-camera",this._onDeleteCamera),e.addEventListener("update-before",this._onUpdateBefore),e.addEventListener("update-after",this._onUpdateAfter)}dispose(){const e=this.tiles;e.removeEventListener("load-model",this._onLoadModel),e.removeEventListener("dispose-model",this._onDisposeModel),e.removeEventListener("tile-visibility-change",this._onTileVisibilityChange),e.removeEventListener("add-camera",this._onAddCamera),e.removeEventListener("delete-camera",this._onDeleteCamera),e.removeEventListener("update-before",this._onUpdateBefore),e.removeEventListener("update-after",this._onUpdateAfter)}}export{V as T};
