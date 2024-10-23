import{n as I,k as _,G as b,p as y,Q as D}from"./three.module-DktTKwaz.js";const{clamp:p}=I;class L{constructor(){this.duration=250,this.fadeCount=0,this._lastTick=-1,this._fadeState=new Map,this._fadeParams=new WeakMap,this.onFadeComplete=null,this.onFadeStart=null,this.onFadeSetComplete=null,this.onFadeSetStart=null}prepareObject(e){e.traverse(a=>{a.material&&this.prepareMaterial(a.material)})}deleteObject(e){if(!e)return;this.completeFade(e);const a=this._fadeParams;e.traverse(i=>{const t=i.material;t&&(a.delete(t),t.onBeforeCompile=()=>{},t.needsUpdate=!0)})}prepareMaterial(e){const a=this._fadeParams;if(a.has(e))return;const i={fadeIn:{value:0},fadeOut:{value:0}};e.defines={FEATURE_FADE:0},e.onBeforeCompile=t=>{t.uniforms={...t.uniforms,...i},t.fragmentShader=t.fragmentShader.replace(/void main\(/,r=>`
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

				`)},a.set(e,i)}guaranteeState(e){const a=this._fadeState;if(a.has(e))return!1;const i={fadeInTarget:0,fadeOutTarget:0,fadeIn:0,fadeOut:0};a.set(e,i);const t=this._fadeParams;return e.traverse(r=>{const d=r.material;if(d&&t.has(d)){const f=t.get(d);f.fadeIn.value=0,f.fadeOut.value=0}}),!0}completeFade(e){const a=this._fadeState;a.has(e)&&(a.delete(e),e.traverse(i=>{const t=i.material;t&&t.defines.FEATURE_FADE!==0&&(t.defines.FEATURE_FADE=0,t.needsUpdate=!0)}),this.fadeCount--,this.onFadeComplete&&this.onFadeComplete(e),this.fadeCount===0&&this.onFadeSetComplete&&this.onFadeSetComplete())}completeAllFades(){this._fadeState.forEach((e,a)=>{this.completeFade(a)})}forEachObject(e){this._fadeState.forEach((a,i)=>e(i))}fadeIn(e){const a=this.guaranteeState(e),i=this._fadeState.get(e);i.fadeInTarget=1,i.fadeOutTarget=0,i.fadeOut=0,a&&(this.fadeCount++,this.fadeCount===1&&this.onFadeSetStart&&this.onFadeSetStart(),this.onFadeStart&&this.onFadeStart(e))}fadeOut(e){const a=this.guaranteeState(e),i=this._fadeState.get(e);i.fadeOutTarget=1,a&&(i.fadeInTarget=1,i.fadeIn=1,this.fadeCount++,this.fadeCount===1&&this.onFadeSetStart&&this.onFadeSetStart(),this.onFadeStart&&this.onFadeStart(e))}update(){const e=window.performance.now();this._lastTick===-1&&(this._lastTick=e);const a=p((e-this._lastTick)/this.duration,0,1);this._lastTick=e;const i=this._fadeState,t=this._fadeParams;i.forEach((r,d)=>{const{fadeOutTarget:f,fadeInTarget:h}=r;let{fadeOut:o,fadeIn:n}=r;const u=Math.sign(h-n);n=p(n+u*a,0,1);const m=Math.sign(f-o);o=p(o+m*a,0,1),r.fadeIn=n,r.fadeOut=o;const c=+(o!==f||n!==h);d.traverse(P=>{const l=P.material;if(l&&t.has(l)){const T=t.get(l);T.fadeIn.value=n,T.fadeOut.value=o,c!==l.defines.FEATURE_FADE&&(l.defines.FEATURE_FADE=c,l.needsUpdate=!0)}}),((o===1||o===0)&&(n===1||n===0)||o>=n)&&this.completeFade(d)})}}const E=Symbol("HAS_POPPED_IN"),F=new _,M=new _,C=new D,S=new D,A=new _;function U(s,e,a){s.visible=!0,a?e.__depthFromRenderedParent===1?((e[E]||this.fadeRootTiles)&&this._fadeManager.fadeIn(s),e[E]=!0):this._fadeManager.fadeIn(s):(this._fadeGroup.add(s),this._fadeManager.fadeOut(s))}function O(s,e){this._fadeManager.prepareObject(s),this._tileMap.set(s,e)}function w(s){this._fadeManager.deleteObject(s),this._tileMap.delete(s)}function x(s){s.parent===this._fadeGroup&&this._fadeGroup.remove(s)}function R(s){this._prevCameraTransforms.set(s,new y)}function G(s){this._prevCameraTransforms.delete(s)}function B(){const s=this._fadeManager,e=this.tiles;this._fadingBefore=s.fadeCount,this._displayActiveTiles=e.displayActiveTiles,e.displayActiveTiles=!0}function k(){const s=this._fadeManager,e=this._fadeGroup,a=this._displayActiveTiles,i=this._fadingBefore,t=this.tiles,r=this._prevCameraTransforms,d=this._tileMap,f=t.lruCache,h=t.cameras;t.displayActiveTiles=a,s.update();const o=s.fadeCount;if(i!==0&&o!==0&&t.dispatchEvent({type:"fade-change"}),a||t.visibleTiles.forEach(n=>{n.cached.scene.visible=n.__inFrustum}),this.maximumFadeOutTiles<e.children.length){let n=!0;h.forEach(u=>{if(!r.has(u))return;const m=u.matrixWorld,c=r.get(u);m.decompose(M,S,A),c.decompose(F,C,A);const v=S.angleTo(C),g=M.distanceTo(F);n=n&&(v>.25||g>.1)}),n&&s.completeAllFades()}h.forEach(n=>{r.get(n).copy(n.matrixWorld)}),s.forEachObject(n=>{f.markUsed(d.get(n))})}class N{get fadeDuration(){return this._fadeManager.duration}set fadeDuration(e){this._fadeManager.duration=Number(e)}get fadingTiles(){return this._fadeManager.fadeCount}constructor(e){e={maximumFadeOutTiles:50,fadeRootTiles:!1,fadeDuration:250,...e},this.name="FADE_TILES_PLUGIN",this.tiles=null,this._fadeManager=new L,this._prevCameraTransforms=null,this._fadeGroup=null,this._tileMap=null,this.maximumFadeOutTiles=e.maximumFadeOutTiles,this.fadeRootTiles=e.fadeRootTiles,this.fadeDuration=e.fadeDuration}init(e){const a=new b;a.name="TilesFadeGroup",e.group.add(a);const i=this._fadeManager;i.onFadeSetStart=()=>e.dispatchEvent({type:"fade-start"}),i.onFadeSetComplete=()=>e.dispatchEvent({type:"fade-end"}),i.onFadeComplete=x.bind(this),this.tiles=e,this._fadeManager=i,this._fadeGroup=a,this._tileMap=new Map,this._prevCameraTransforms=new Map,e.cameras.forEach(t=>{this._prevCameraTransforms.set(t,new y)}),e.forEachLoadedModel((t,r)=>{O.call(this,t,r)}),this._onLoadModel=t=>O.call(this,t.scene,t.tile),this._onDisposeModel=t=>w.call(this,t.scene),this._onTileVisibilityChange=t=>U.call(this,t.scene,t.tile,t.visible),this._onAddCamera=t=>R.call(this,t.camera),this._onDeleteCamera=t=>G.call(this,t.camera),this._onUpdateBefore=()=>B.call(this),this._onUpdateAfter=()=>k.call(this),e.addEventListener("load-model",this._onLoadModel),e.addEventListener("dispose-model",this._onDisposeModel),e.addEventListener("tile-visibility-change",this._onTileVisibilityChange),e.addEventListener("add-camera",this._onAddCamera),e.addEventListener("delete-camera",this._onDeleteCamera),e.addEventListener("update-before",this._onUpdateBefore),e.addEventListener("update-after",this._onUpdateAfter)}dispose(){const e=this.tiles;e.removeEventListener("load-model",this._onLoadModel),e.removeEventListener("dispose-model",this._onDisposeModel),e.removeEventListener("tile-visibility-change",this._onTileVisibilityChange),e.removeEventListener("add-camera",this._onAddCamera),e.removeEventListener("delete-camera",this._onDeleteCamera),e.removeEventListener("update-before",this._onUpdateBefore),e.removeEventListener("update-after",this._onUpdateAfter),e.forEachLoadedModel(a=>{this._fadeManager.deleteObject(a),this._tileMap.delete(a),a.visible=!0}),this._fadeGroup.removeFromParent()}}export{N as T};
