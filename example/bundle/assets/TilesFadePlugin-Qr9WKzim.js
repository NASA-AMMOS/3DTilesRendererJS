import{i as B,n as y,a5 as O,_ as D,o as P,k as p,j as T,Q as I}from"./three.module-CvwULque.js";const{clamp:g}=B;class U{constructor(){this.duration=250,this.fadeCount=0,this._lastTick=-1,this._fadeState=new Map,this.onFadeComplete=null,this.onFadeStart=null,this.onFadeSetComplete=null,this.onFadeSetStart=null}deleteObject(e){e&&this.completeFade(e)}guaranteeState(e){const t=this._fadeState;if(t.has(e))return!1;const a={fadeInTarget:0,fadeOutTarget:0,fadeIn:0,fadeOut:0};return t.set(e,a),!0}completeFade(e){const t=this._fadeState;if(!t.has(e))return;const a=t.get(e).fadeOutTarget===0;t.delete(e),this.fadeCount--,this.onFadeComplete&&this.onFadeComplete(e,a),this.fadeCount===0&&this.onFadeSetComplete&&this.onFadeSetComplete()}completeAllFades(){this._fadeState.forEach((e,t)=>{this.completeFade(t)})}forEachObject(e){this._fadeState.forEach((t,a)=>{e(a,t)})}fadeIn(e){const t=this.guaranteeState(e),a=this._fadeState.get(e);a.fadeInTarget=1,a.fadeOutTarget=0,a.fadeOut=0,t&&(this.fadeCount++,this.fadeCount===1&&this.onFadeSetStart&&this.onFadeSetStart(),this.onFadeStart&&this.onFadeStart(e))}fadeOut(e){const t=this.guaranteeState(e),a=this._fadeState.get(e);a.fadeOutTarget=1,t&&(a.fadeInTarget=1,a.fadeIn=1,this.fadeCount++,this.fadeCount===1&&this.onFadeSetStart&&this.onFadeSetStart(),this.onFadeStart&&this.onFadeStart(e))}isFading(e){return this._fadeState.has(e)}isFadingOut(e){const t=this._fadeState.get(e);return t&&t.fadeOutTarget===1}update(){const e=window.performance.now();this._lastTick===-1&&(this._lastTick=e);const t=g((e-this._lastTick)/this.duration,0,1);this._lastTick=e,this._fadeState.forEach((s,i)=>{const{fadeOutTarget:n,fadeInTarget:o}=s;let{fadeOut:d,fadeIn:h}=s;const r=Math.sign(o-h);h=g(h+r*t,0,1);const l=Math.sign(n-d);d=g(d+l*t,0,1),s.fadeIn=h,s.fadeOut=d,((d===1||d===0)&&(h===1||h===0)||d>=h)&&this.completeFade(i)})}}function b(f,e){const t={fadeIn:{value:0},fadeOut:{value:0},fadeTexture:{value:null}};return f.defines={...f.defines||{},FEATURE_FADE:0},f.onBeforeCompile=a=>{e&&e(a),a.uniforms={...a.uniforms,...t},a.vertexShader=a.vertexShader.replace(/void\s+main\(\)\s+{/,s=>`
					#ifdef USE_BATCHING_FRAG

					varying float vBatchId;

					#endif

					${s}

						#ifdef USE_BATCHING_FRAG

						// add 0.5 to the value to avoid floating error that may cause flickering
						vBatchId = getIndirectIndex( gl_DrawID ) + 0.5;

						#endif
				`),a.fragmentShader=a.fragmentShader.replace(/void main\(/,s=>`
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

				// the USE_BATCHING define is not available in fragment shaders
				#ifdef USE_BATCHING_FRAG

				// functions for reading the fade state of a given batch id
				uniform sampler2D fadeTexture;
				varying float vBatchId;
				vec2 getFadeValues( const in float i ) {

					int size = textureSize( fadeTexture, 0 ).x;
					int j = int( i );
					int x = j % size;
					int y = j / size;
					return texelFetch( fadeTexture, ivec2( x, y ), 0 ).rg;

				}

				#else

				uniform float fadeIn;
				uniform float fadeOut;

				#endif

				#endif

				${s}
			`).replace(/#include <dithering_fragment>/,s=>`

				${s}

				#if FEATURE_FADE

				#ifdef USE_BATCHING_FRAG

				vec2 fadeValues = getFadeValues( vBatchId );
				float fadeIn = fadeValues.r;
				float fadeOut = fadeValues.g;

				#endif

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

			`)},t}class w{constructor(){this._fadeParams=new WeakMap,this.fading=0}setFade(e,t,a){if(!e)return;const s=this._fadeParams;e.traverse(i=>{const n=i.material;if(n){const o=s.get(n);o.fadeIn.value=t,o.fadeOut.value=a;const r=+(!(t===0||t===1)||!(a===0||a===1));n.defines.FEATURE_FADE!==r&&(this.fading+=r===1?1:-1,n.defines.FEATURE_FADE=r,n.needsUpdate=!0)}})}prepareScene(e){e.traverse(t=>{t.material&&this.prepareMaterial(t.material)})}deleteScene(e){if(!e)return;const t=this._fadeParams;e.traverse(a=>{const s=a.material;s&&(t.delete(s),s.onBeforeCompile=()=>{},s.needsUpdate=!0)})}prepareMaterial(e){const t=this._fadeParams;t.has(e)||t.set(e,b(e))}}class L{constructor(e,t=new y){this.other=e,this.material=t,this.visible=!0,this.parent=null,this._instanceInfo=[],this._visibilityChanged=!0;const a=new Proxy(this,{get(s,i){if(i in s)return s[i];{const n=e[i];return n instanceof Function?(...o)=>(s.syncInstances(),n.call(a,...o)):e[i]}},set(s,i,n){return i in s?s[i]=n:e[i]=n,!0},deleteProperty(s,i){return i in s?delete s[i]:delete e[i]}});return a}syncInstances(){const e=this._instanceInfo,t=this.other._instanceInfo;for(;t.length>e.length;){const a=e.length;e.push(new Proxy({visible:!1},{get(s,i){return i in s?s[i]:t[a][i]},set(s,i,n){return i in s?s[i]=n:t[a][i]=n,!0}}))}}}class V extends L{constructor(...e){super(...e);const t=this.material,a=b(t,t.onBeforeCompile);t.defines.FEATURE_FADE=1,t.defines.USE_BATCHING_FRAG=1,t.needsUpdate=!0,this.fadeTexture=null,this._fadeParams=a}setFadeAt(e,t,a){this._initFadeTexture(),this.fadeTexture.setValueAt(e,t*255,a*255)}_initFadeTexture(){let e=Math.sqrt(this._maxInstanceCount);e=Math.ceil(e);const t=e*e*2,a=this.fadeTexture;if(!a||a.image.data.length!==t){const s=new Uint8Array(t),i=new R(s,e,e,O,D);if(a){a.dispose();const n=a.image.data,o=this.fadeTexture.image.data,d=Math.min(n.length,o.length);o.set(new n.constructor(n.buffer,0,d))}this.fadeTexture=i,this._fadeParams.fadeTexture.value=i,i.needsUpdate=!0}}dispose(){this.fadeTexture&&this.fadeTexture.dispose()}}class R extends P{setValueAt(e,...t){const{data:a,width:s,height:i}=this.image,n=Math.floor(a.length/(s*i));let o=!1;for(let d=0;d<n;d++){const h=e*n+d,r=a[h],l=t[d]||0;r!==l&&(a[h]=l,o=!0)}o&&(this.needsUpdate=!0)}}const M=Symbol("HAS_POPPED_IN"),F=new p,E=new p,S=new I,C=new I,A=new p;function N(){const f=this._fadeManager,e=this.tiles;this._fadingBefore=f.fadeCount,this._displayActiveTiles=e.displayActiveTiles,e.displayActiveTiles=!0}function G(){const f=this._fadeManager,e=this._fadeMaterialManager,t=this._displayActiveTiles,a=this._fadingBefore,s=this._prevCameraTransforms,{tiles:i,maximumFadeOutTiles:n,batchedMesh:o}=this,{cameras:d}=i;i.displayActiveTiles=t,f.update();const h=f.fadeCount;if(a!==0&&h!==0&&(i.dispatchEvent({type:"fade-change"}),i.dispatchEvent({type:"force-rerender"})),t||i.visibleTiles.forEach(r=>{const l=r.cached.scene;l&&(l.visible=r.__inFrustum),this.forEachBatchIds(r,(c,u,m)=>{u.setVisibleAt(c,r.__inFrustum),m.batchedMesh.setVisibleAt(c,r.__inFrustum)})}),n<this._fadingOutCount){let r=!0;d.forEach(l=>{if(!s.has(l))return;const c=l.matrixWorld,u=s.get(l);c.decompose(E,C,A),u.decompose(F,S,A);const m=C.angleTo(S),_=E.distanceTo(F);r=r&&(m>.25||_>.1)}),r&&f.completeAllFades()}if(d.forEach(r=>{s.get(r).copy(r.matrixWorld)}),f.forEachObject((r,{fadeIn:l,fadeOut:c})=>{const u=r.cached.scene,m=f.isFadingOut(r);i.markTileUsed(r),u&&(e.setFade(u,l,c),m&&(u.visible=!0)),this.forEachBatchIds(r,(_,v,x)=>{v.setFadeAt(_,l,c),v.setVisibleAt(_,!0),x.batchedMesh.setVisibleAt(_,!1)})}),o){const r=i.getPluginByName("BATCHED_TILES_PLUGIN").batchedMesh.material;o.material.map=r.map}}class z{get fadeDuration(){return this._fadeManager.duration}set fadeDuration(e){this._fadeManager.duration=Number(e)}get fadingTiles(){return this._fadeManager.fadeCount}constructor(e){e={maximumFadeOutTiles:50,fadeRootTiles:!1,fadeDuration:250,...e},this.name="FADE_TILES_PLUGIN",this.priority=-2,this.tiles=null,this.batchedMesh=null,this._fadeManager=new U,this._fadeMaterialManager=new w,this._prevCameraTransforms=null,this._fadingOutCount=0,this.maximumFadeOutTiles=e.maximumFadeOutTiles,this.fadeRootTiles=e.fadeRootTiles,this.fadeDuration=e.fadeDuration}init(e){this._onLoadModel=({scene:s})=>{this._fadeMaterialManager.prepareScene(s)},this._onDisposeModel=({tile:s,scene:i})=>{this._fadeManager.deleteObject(s),this._fadeMaterialManager.deleteScene(i)},this._onAddCamera=({camera:s})=>{this._prevCameraTransforms.set(s,new T)},this._onDeleteCamera=({camera:s})=>{this._prevCameraTransforms.delete(s)},this._onTileVisibilityChange=({tile:s,visible:i})=>{const n=s.cached.scene;n&&(n.visible=!0),this.forEachBatchIds(s,(o,d,h)=>{d.setFadeAt(o,0,0),d.setVisibleAt(o,!1),h.batchedMesh.setVisibleAt(o,!1)})},this._onUpdateBefore=()=>{N.call(this)},this._onUpdateAfter=()=>{G.call(this)},e.addEventListener("load-model",this._onLoadModel),e.addEventListener("dispose-model",this._onDisposeModel),e.addEventListener("add-camera",this._onAddCamera),e.addEventListener("delete-camera",this._onDeleteCamera),e.addEventListener("update-before",this._onUpdateBefore),e.addEventListener("update-after",this._onUpdateAfter),e.addEventListener("tile-visibility-change",this._onTileVisibilityChange);const t=this._fadeManager;t.onFadeSetStart=()=>{e.dispatchEvent({type:"fade-start"}),e.dispatchEvent({type:"force-rerender"})},t.onFadeSetComplete=()=>{e.dispatchEvent({type:"fade-end"}),e.dispatchEvent({type:"force-rerender"})},t.onFadeComplete=(s,i)=>{this._fadeMaterialManager.setFade(s.cached.scene,0,0),this.forEachBatchIds(s,(n,o,d)=>{o.setFadeAt(n,0,0),o.setVisibleAt(n,!1),d.batchedMesh.setVisibleAt(n,i)}),i||(e.invokeOnePlugin(n=>n!==this&&n.setTileVisible&&n.setTileVisible(s,!1)),this._fadingOutCount--)};const a=new Map;e.cameras.forEach(s=>{a.set(s,new T)}),e.forEachLoadedModel((s,i)=>{this._onLoadModel({scene:s})}),this.tiles=e,this._fadeManager=t,this._prevCameraTransforms=a}initBatchedMesh(){var t;const e=(t=this.tiles.getPluginByName("BATCHED_TILES_PLUGIN"))==null?void 0:t.batchedMesh;if(e){if(this.batchedMesh===null){this._onBatchedMeshDispose=()=>{this.batchedMesh.dispose(),this.batchedMesh.removeFromParent(),this.batchedMesh=null,e.removeEventListener("dispose",this._onBatchedMeshDispose)};const a=e.material.clone();a.onBeforeCompile=e.material.onBeforeCompile,this.batchedMesh=new V(e,a),this.tiles.group.add(this.batchedMesh)}}else this.batchedMesh!==null&&(this._onBatchedMeshDispose(),this._onBatchedMeshDispose=null)}setTileVisible(e,t){const a=this._fadeManager,s=a.isFading(e);if(a.isFadingOut(e)&&this._fadingOutCount--,t?e.__depthFromRenderedParent===1?((e[M]||this.fadeRootTiles)&&this._fadeManager.fadeIn(e),e[M]=!0):this._fadeManager.fadeIn(e):(this._fadingOutCount++,a.fadeOut(e)),s)return!0;const i=this._fadeManager.isFading(e);return!!(!t&&i)}dispose(){const e=this.tiles;this._fadeManager.completeAllFades(),this.batchedMesh!==null&&this._onBatchedMeshDispose(),e.removeEventListener("load-model",this._onLoadModel),e.removeEventListener("dispose-model",this._onDisposeModel),e.removeEventListener("add-camera",this._onAddCamera),e.removeEventListener("delete-camera",this._onDeleteCamera),e.removeEventListener("update-before",this._onUpdateBefore),e.removeEventListener("update-after",this._onUpdateAfter),e.removeEventListener("tile-visibility-change",this._onTileVisibilityChange),e.forEachLoadedModel((t,a)=>{this._fadeManager.deleteObject(a),t&&(t.visible=!0)})}forEachBatchIds(e,t){if(this.initBatchedMesh(),this.batchedMesh){const a=this.tiles.getPluginByName("BATCHED_TILES_PLUGIN"),s=a.getTileBatchIds(e);s&&s.forEach(i=>{t(i,this.batchedMesh,a)})}}}export{z as T};
