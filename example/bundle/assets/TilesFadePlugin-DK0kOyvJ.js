import{i as P,k as _,j as A,Q as y}from"./three.module-CvwULque.js";const{clamp:p}=P;class I{constructor(){this.duration=250,this.fadeCount=0,this._lastTick=-1,this._fadeState=new Map,this._fadeParams=new WeakMap,this.onFadeComplete=null,this.onFadeStart=null,this.onFadeSetComplete=null,this.onFadeSetStart=null}prepareObject(e){e.traverse(a=>{a.material&&this.prepareMaterial(a.material)})}deleteObject(e){if(!e)return;this.completeFade(e);const a=this._fadeParams;e.traverse(t=>{const s=t.material;s&&(a.delete(s),s.onBeforeCompile=()=>{},s.needsUpdate=!0)})}prepareMaterial(e){const a=this._fadeParams;if(a.has(e))return;const t={fadeIn:{value:0},fadeOut:{value:0}};e.defines={FEATURE_FADE:0},e.onBeforeCompile=s=>{s.uniforms={...s.uniforms,...t},s.fragmentShader=s.fragmentShader.replace(/void main\(/,r=>`
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

				`)},a.set(e,t)}guaranteeState(e){const a=this._fadeState;if(a.has(e))return!1;const t={fadeInTarget:0,fadeOutTarget:0,fadeIn:0,fadeOut:0};a.set(e,t);const s=this._fadeParams;return e.traverse(r=>{const o=r.material;if(o&&s.has(o)){const f=s.get(o);f.fadeIn.value=0,f.fadeOut.value=0}}),!0}completeFade(e){const a=this._fadeState;if(!a.has(e))return;const t=a.get(e).fadeOutTarget===0;a.delete(e),e.traverse(s=>{const r=s.material;r&&r.defines.FEATURE_FADE!==0&&(r.defines.FEATURE_FADE=0,r.needsUpdate=!0)}),this.fadeCount--,this.onFadeComplete&&this.onFadeComplete(e,t),this.fadeCount===0&&this.onFadeSetComplete&&this.onFadeSetComplete()}completeAllFades(){this._fadeState.forEach((e,a)=>{this.completeFade(a)})}forEachObject(e){this._fadeState.forEach((a,t)=>e(t))}fadeIn(e){const a=this.guaranteeState(e),t=this._fadeState.get(e);t.fadeInTarget=1,t.fadeOutTarget=0,t.fadeOut=0,a&&(this.fadeCount++,this.fadeCount===1&&this.onFadeSetStart&&this.onFadeSetStart(),this.onFadeStart&&this.onFadeStart(e))}fadeOut(e){const a=this.guaranteeState(e),t=this._fadeState.get(e);t.fadeOutTarget=1,a&&(t.fadeInTarget=1,t.fadeIn=1,this.fadeCount++,this.fadeCount===1&&this.onFadeSetStart&&this.onFadeSetStart(),this.onFadeStart&&this.onFadeStart(e))}isFading(e){return this._fadeState.has(e)}isFadingOut(e){const a=this._fadeState.get(e);return a&&a.fadeOutTarget===1}update(){const e=window.performance.now();this._lastTick===-1&&(this._lastTick=e);const a=p((e-this._lastTick)/this.duration,0,1);this._lastTick=e;const t=this._fadeState,s=this._fadeParams;t.forEach((r,o)=>{const{fadeOutTarget:f,fadeInTarget:h}=r;let{fadeOut:n,fadeIn:d}=r;const u=Math.sign(h-d);d=p(d+u*a,0,1);const m=Math.sign(f-n);n=p(n+m*a,0,1),r.fadeIn=d,r.fadeOut=n;const c=+(n!==f||d!==h);o.traverse(D=>{const l=D.material;if(l&&s.has(l)){const v=s.get(l);v.fadeIn.value=d,v.fadeOut.value=n,c!==l.defines.FEATURE_FADE&&(l.defines.FEATURE_FADE=c,l.needsUpdate=!0)}}),((n===1||n===0)&&(d===1||d===0)||n>=d)&&this.completeFade(o)})}}const F=Symbol("HAS_POPPED_IN"),T=new _,E=new _,M=new y,C=new y,S=new _;function U(i,e,a){i.visible=!0;const t=this._fadeManager;t.isFadingOut(i)&&this._fadingOutCount--,a?e.__depthFromRenderedParent===1?((e[F]||this.fadeRootTiles)&&this._fadeManager.fadeIn(i),e[F]=!0):this._fadeManager.fadeIn(i):(this._fadingOutCount++,t.fadeOut(i))}function O(i,e){this._fadeManager.prepareObject(i),this._tileMap.set(i,e)}function b(i){this._fadeManager.deleteObject(i),this._tileMap.delete(i)}function w(i,e){if(!e){const a=this._tileMap.get(i);this.tiles.invokeOnePlugin(t=>t!==this&&t.setTileVisible&&t.setTileVisible(a,!1)),this._fadingOutCount--}}function L(i){this._prevCameraTransforms.set(i,new A)}function x(i){this._prevCameraTransforms.delete(i)}function R(){const i=this._fadeManager,e=this.tiles;this._fadingBefore=i.fadeCount,this._displayActiveTiles=e.displayActiveTiles,e.displayActiveTiles=!0}function B(){const i=this._fadeManager,e=this._displayActiveTiles,a=this._fadingBefore,t=this.tiles,s=this._prevCameraTransforms,r=this._tileMap,o=t.lruCache,f=t.cameras;t.displayActiveTiles=e,i.update();const h=i.fadeCount;if(a!==0&&h!==0&&(t.dispatchEvent({type:"fade-change"}),t.dispatchEvent({type:"force-rerender"})),e||t.visibleTiles.forEach(n=>{const d=n.cached.scene;i.isFadingOut(d)?d.visible=!0:d.visible=n.__inFrustum}),this.maximumFadeOutTiles<this._fadingOutCount){let n=!0;f.forEach(d=>{if(!s.has(d))return;const u=d.matrixWorld,m=s.get(d);u.decompose(E,C,S),m.decompose(T,M,S);const c=C.angleTo(M),g=E.distanceTo(T);n=n&&(c>.25||g>.1)}),n&&i.completeAllFades()}f.forEach(n=>{s.get(n).copy(n.matrixWorld)}),i.forEachObject(n=>{o.markUsed(r.get(n))})}class N{get fadeDuration(){return this._fadeManager.duration}set fadeDuration(e){this._fadeManager.duration=Number(e)}get fadingTiles(){return this._fadeManager.fadeCount}constructor(e){e={maximumFadeOutTiles:50,fadeRootTiles:!1,fadeDuration:250,...e},this.name="FADE_TILES_PLUGIN",this.priority=-1,this.tiles=null,this._fadeManager=new I,this._prevCameraTransforms=null,this._tileMap=null,this._fadingOutCount=0,this.maximumFadeOutTiles=e.maximumFadeOutTiles,this.fadeRootTiles=e.fadeRootTiles,this.fadeDuration=e.fadeDuration}init(e){const a=this._fadeManager;a.onFadeSetStart=()=>{e.dispatchEvent({type:"fade-start"}),e.dispatchEvent({type:"force-rerender"})},a.onFadeSetComplete=()=>{e.dispatchEvent({type:"fade-end"}),e.dispatchEvent({type:"force-rerender"})},a.onFadeComplete=w.bind(this),this.tiles=e,this._fadeManager=a,this._tileMap=new Map,this._prevCameraTransforms=new Map,e.cameras.forEach(t=>{this._prevCameraTransforms.set(t,new A)}),e.forEachLoadedModel((t,s)=>{O.call(this,t,s)}),this._onLoadModel=t=>O.call(this,t.scene,t.tile),this._onDisposeModel=t=>b.call(this,t.scene),this._onAddCamera=t=>L.call(this,t.camera),this._onDeleteCamera=t=>x.call(this,t.camera),this._onUpdateBefore=()=>R.call(this),this._onUpdateAfter=()=>B.call(this),e.addEventListener("load-model",this._onLoadModel),e.addEventListener("dispose-model",this._onDisposeModel),e.addEventListener("add-camera",this._onAddCamera),e.addEventListener("delete-camera",this._onDeleteCamera),e.addEventListener("update-before",this._onUpdateBefore),e.addEventListener("update-after",this._onUpdateAfter)}setTileVisible(e,a){const t=e.cached.scene,s=this._fadeManager.isFading(t);if(U.call(this,t,e,a),s)return!0;const r=this._fadeManager.isFading(t);return!!(!a&&r)}dispose(){const e=this.tiles;this._fadeManager.completeAllFades(),e.removeEventListener("load-model",this._onLoadModel),e.removeEventListener("dispose-model",this._onDisposeModel),e.removeEventListener("add-camera",this._onAddCamera),e.removeEventListener("delete-camera",this._onDeleteCamera),e.removeEventListener("update-before",this._onUpdateBefore),e.removeEventListener("update-after",this._onUpdateAfter),e.forEachLoadedModel(a=>{this._fadeManager.deleteObject(a),this._tileMap.delete(a),a.visible=!0})}}export{N as T};
