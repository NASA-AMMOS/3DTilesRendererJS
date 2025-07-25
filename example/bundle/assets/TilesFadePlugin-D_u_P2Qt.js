import{M as y,q as D,J as O,X as P,p as w,k as F,l as T,Q as b}from"./three.module-CQU0seT4.js";const{clamp:g}=y;class U{constructor(){this.duration=250,this.fadeCount=0,this._lastTick=-1,this._fadeState=new Map,this.onFadeComplete=null,this.onFadeStart=null,this.onFadeSetComplete=null,this.onFadeSetStart=null}deleteObject(e){e&&this.completeFade(e)}guaranteeState(e){const t=this._fadeState;if(t.has(e))return!1;const s={fadeInTarget:0,fadeOutTarget:0,fadeIn:0,fadeOut:0};return t.set(e,s),!0}completeFade(e){const t=this._fadeState;if(!t.has(e))return;const s=t.get(e).fadeOutTarget===0;t.delete(e),this.fadeCount--,this.onFadeComplete&&this.onFadeComplete(e,s),this.fadeCount===0&&this.onFadeSetComplete&&this.onFadeSetComplete()}completeAllFades(){this._fadeState.forEach((e,t)=>{this.completeFade(t)})}forEachObject(e){this._fadeState.forEach((t,s)=>{e(s,t)})}fadeIn(e){const t=this.guaranteeState(e),s=this._fadeState.get(e);s.fadeInTarget=1,s.fadeOutTarget=0,s.fadeOut=0,t&&(this.fadeCount++,this.fadeCount===1&&this.onFadeSetStart&&this.onFadeSetStart(),this.onFadeStart&&this.onFadeStart(e))}fadeOut(e){const t=this.guaranteeState(e),s=this._fadeState.get(e);s.fadeOutTarget=1,t&&(s.fadeInTarget=1,s.fadeIn=1,this.fadeCount++,this.fadeCount===1&&this.onFadeSetStart&&this.onFadeSetStart(),this.onFadeStart&&this.onFadeStart(e))}isFading(e){return this._fadeState.has(e)}isFadingOut(e){const t=this._fadeState.get(e);return t&&t.fadeOutTarget===1}update(){const e=window.performance.now();this._lastTick===-1&&(this._lastTick=e);const t=g((e-this._lastTick)/this.duration,0,1);this._lastTick=e,this._fadeState.forEach((a,i)=>{const{fadeOutTarget:n,fadeInTarget:o}=a;let{fadeOut:d,fadeIn:h}=a;const r=Math.sign(o-h);h=g(h+r*t,0,1);const l=Math.sign(n-d);d=g(d+l*t,0,1),a.fadeIn=h,a.fadeOut=d,((d===1||d===0)&&(h===1||h===0)||d>=h)&&this.completeFade(i)})}}const p=Symbol("FADE_PARAMS");function x(f,e){if(f[p])return f[p];const t={fadeIn:{value:0},fadeOut:{value:0},fadeTexture:{value:null}};return f[p]=t,f.defines={...f.defines||{},FEATURE_FADE:0},f.onBeforeCompile=s=>{e&&e(s),s.uniforms={...s.uniforms,...t},s.vertexShader=s.vertexShader.replace(/void\s+main\(\)\s+{/,a=>`
					#ifdef USE_BATCHING_FRAG

					varying float vBatchId;

					#endif

					${a}

						#ifdef USE_BATCHING_FRAG

						// add 0.5 to the value to avoid floating error that may cause flickering
						vBatchId = getIndirectIndex( gl_DrawID ) + 0.5;

						#endif
				`),s.fragmentShader=s.fragmentShader.replace(/void main\(/,a=>`
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

				${a}
			`).replace(/#include <dithering_fragment>/,a=>`

				${a}

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

			`)},t}class L{constructor(){this._fadeParams=new WeakMap,this.fading=0}setFade(e,t,s){if(!e)return;const a=this._fadeParams;e.traverse(i=>{const n=i.material;if(n&&a.has(n)){const o=a.get(n);o.fadeIn.value=t,o.fadeOut.value=s;const r=+(!(t===0||t===1)||!(s===0||s===1));n.defines.FEATURE_FADE!==r&&(this.fading+=r===1?1:-1,n.defines.FEATURE_FADE=r,n.needsUpdate=!0)}})}prepareScene(e){e.traverse(t=>{t.material&&this.prepareMaterial(t.material)})}deleteScene(e){if(!e)return;this.setFade(e,1,0);const t=this._fadeParams;e.traverse(s=>{const a=s.material;a&&t.delete(a)})}prepareMaterial(e){const t=this._fadeParams;t.has(e)||t.set(e,x(e,e.onBeforeCompile))}}class V{constructor(e,t=new D){this.other=e,this.material=t,this.visible=!0,this.parent=null,this._instanceInfo=[],this._visibilityChanged=!0;const s=new Proxy(this,{get(a,i){if(i in a)return a[i];{const n=e[i];return n instanceof Function?(...o)=>(a.syncInstances(),n.call(s,...o)):e[i]}},set(a,i,n){return i in a?a[i]=n:e[i]=n,!0},deleteProperty(a,i){return i in a?delete a[i]:delete e[i]}});return s}syncInstances(){const e=this._instanceInfo,t=this.other._instanceInfo;for(;t.length>e.length;){const s=e.length;e.push(new Proxy({visible:!1},{get(a,i){return i in a?a[i]:t[s][i]},set(a,i,n){return i in a?a[i]=n:t[s][i]=n,!0}}))}}}class R extends V{constructor(...e){super(...e);const t=this.material,s=x(t,t.onBeforeCompile);t.defines.FEATURE_FADE=1,t.defines.USE_BATCHING_FRAG=1,t.needsUpdate=!0,this.fadeTexture=null,this._fadeParams=s}setFadeAt(e,t,s){this._initFadeTexture(),this.fadeTexture.setValueAt(e,t*255,s*255)}_initFadeTexture(){let e=Math.sqrt(this._maxInstanceCount);e=Math.ceil(e);const t=e*e*2,s=this.fadeTexture;if(!s||s.image.data.length!==t){const a=new Uint8Array(t),i=new N(a,e,e,O,P);if(s){s.dispose();const n=s.image.data,o=this.fadeTexture.image.data,d=Math.min(n.length,o.length);o.set(new n.constructor(n.buffer,0,d))}this.fadeTexture=i,this._fadeParams.fadeTexture.value=i,i.needsUpdate=!0}}dispose(){this.fadeTexture&&this.fadeTexture.dispose()}}class N extends w{setValueAt(e,...t){const{data:s,width:a,height:i}=this.image,n=Math.floor(s.length/(a*i));let o=!1;for(let d=0;d<n;d++){const h=e*n+d,r=s[h],l=t[d]||0;r!==l&&(s[h]=l,o=!0)}o&&(this.needsUpdate=!0)}}const M=Symbol("HAS_POPPED_IN"),E=new T,S=new T,A=new b,C=new b,I=new T;function G(){const f=this._fadeManager,e=this.tiles;this._fadingBefore=f.fadeCount,this._displayActiveTiles=e.displayActiveTiles,e.displayActiveTiles=!0}function H(){const f=this._fadeManager,e=this._fadeMaterialManager,t=this._displayActiveTiles,s=this._fadingBefore,a=this._prevCameraTransforms,{tiles:i,maximumFadeOutTiles:n,batchedMesh:o}=this,{cameras:d}=i;i.displayActiveTiles=t,f.update();const h=f.fadeCount;if(s!==0&&h!==0&&(i.dispatchEvent({type:"fade-change"}),i.dispatchEvent({type:"needs-render"})),t||i.visibleTiles.forEach(r=>{const l=r.cached.scene;l&&(l.visible=r.__inFrustum),this.forEachBatchIds(r,(c,u,m)=>{u.setVisibleAt(c,r.__inFrustum),m.batchedMesh.setVisibleAt(c,r.__inFrustum)})}),n<this._fadingOutCount){let r=!0;d.forEach(l=>{if(!a.has(l))return;const c=l.matrixWorld,u=a.get(l);c.decompose(S,C,I),u.decompose(E,A,I);const m=C.angleTo(A),_=S.distanceTo(E);r=r&&(m>.25||_>.1)}),r&&f.completeAllFades()}if(d.forEach(r=>{a.get(r).copy(r.matrixWorld)}),f.forEachObject((r,{fadeIn:l,fadeOut:c})=>{const u=r.cached.scene,m=f.isFadingOut(r);i.markTileUsed(r),u&&(e.setFade(u,l,c),m&&(u.visible=!0)),this.forEachBatchIds(r,(_,v,B)=>{v.setFadeAt(_,l,c),v.setVisibleAt(_,!0),B.batchedMesh.setVisibleAt(_,!1)})}),o){const r=i.getPluginByName("BATCHED_TILES_PLUGIN").batchedMesh.material;o.material.map=r.map}}class q{get fadeDuration(){return this._fadeManager.duration}set fadeDuration(e){this._fadeManager.duration=Number(e)}get fadingTiles(){return this._fadeManager.fadeCount}constructor(e){e={maximumFadeOutTiles:50,fadeRootTiles:!1,fadeDuration:250,...e},this.name="FADE_TILES_PLUGIN",this.priority=-2,this.tiles=null,this.batchedMesh=null,this._quickFadeTiles=new Set,this._fadeManager=new U,this._fadeMaterialManager=new L,this._prevCameraTransforms=null,this._fadingOutCount=0,this.maximumFadeOutTiles=e.maximumFadeOutTiles,this.fadeRootTiles=e.fadeRootTiles,this.fadeDuration=e.fadeDuration}init(e){this._onLoadModel=({scene:a})=>{this._fadeMaterialManager.prepareScene(a)},this._onDisposeModel=({tile:a,scene:i})=>{this.tiles.visibleTiles.has(a)&&this._quickFadeTiles.add(a.parent),this._fadeManager.deleteObject(a),this._fadeMaterialManager.deleteScene(i)},this._onAddCamera=({camera:a})=>{this._prevCameraTransforms.set(a,new F)},this._onDeleteCamera=({camera:a})=>{this._prevCameraTransforms.delete(a)},this._onTileVisibilityChange=({tile:a,visible:i})=>{const n=a.cached.scene;n&&(n.visible=!0),this.forEachBatchIds(a,(o,d,h)=>{d.setFadeAt(o,0,0),d.setVisibleAt(o,!1),h.batchedMesh.setVisibleAt(o,!1)})},this._onUpdateBefore=()=>{G.call(this)},this._onUpdateAfter=()=>{H.call(this)},e.addEventListener("load-model",this._onLoadModel),e.addEventListener("dispose-model",this._onDisposeModel),e.addEventListener("add-camera",this._onAddCamera),e.addEventListener("delete-camera",this._onDeleteCamera),e.addEventListener("update-before",this._onUpdateBefore),e.addEventListener("update-after",this._onUpdateAfter),e.addEventListener("tile-visibility-change",this._onTileVisibilityChange);const t=this._fadeManager;t.onFadeSetStart=()=>{e.dispatchEvent({type:"fade-start"}),e.dispatchEvent({type:"needs-render"})},t.onFadeSetComplete=()=>{e.dispatchEvent({type:"fade-end"}),e.dispatchEvent({type:"needs-render"})},t.onFadeComplete=(a,i)=>{this._fadeMaterialManager.setFade(a.cached.scene,0,0),this.forEachBatchIds(a,(n,o,d)=>{o.setFadeAt(n,0,0),o.setVisibleAt(n,!1),d.batchedMesh.setVisibleAt(n,i)}),i||(e.invokeOnePlugin(n=>n!==this&&n.setTileVisible&&n.setTileVisible(a,!1)),this._fadingOutCount--)};const s=new Map;e.cameras.forEach(a=>{s.set(a,new F)}),e.forEachLoadedModel((a,i)=>{this._onLoadModel({scene:a})}),this.tiles=e,this._fadeManager=t,this._prevCameraTransforms=s}initBatchedMesh(){var t;const e=(t=this.tiles.getPluginByName("BATCHED_TILES_PLUGIN"))==null?void 0:t.batchedMesh;if(e){if(this.batchedMesh===null){this._onBatchedMeshDispose=()=>{this.batchedMesh.dispose(),this.batchedMesh.removeFromParent(),this.batchedMesh=null,e.removeEventListener("dispose",this._onBatchedMeshDispose)};const s=e.material.clone();s.onBeforeCompile=e.material.onBeforeCompile,this.batchedMesh=new R(e,s),this.tiles.group.add(this.batchedMesh)}}else this.batchedMesh!==null&&(this._onBatchedMeshDispose(),this._onBatchedMeshDispose=null)}setTileVisible(e,t){const s=this._fadeManager,a=s.isFading(e);if(s.isFadingOut(e)&&this._fadingOutCount--,t?e.__depthFromRenderedParent===1?((e[M]||this.fadeRootTiles)&&this._fadeManager.fadeIn(e),e[M]=!0):this._fadeManager.fadeIn(e):(this._fadingOutCount++,s.fadeOut(e)),this._quickFadeTiles.has(e)&&(this._fadeManager.completeFade(e),this._quickFadeTiles.delete(e)),a)return!0;const i=this._fadeManager.isFading(e);return!!(!t&&i)}dispose(){const e=this.tiles;this._fadeManager.completeAllFades(),this.batchedMesh!==null&&this._onBatchedMeshDispose(),e.removeEventListener("load-model",this._onLoadModel),e.removeEventListener("dispose-model",this._onDisposeModel),e.removeEventListener("add-camera",this._onAddCamera),e.removeEventListener("delete-camera",this._onDeleteCamera),e.removeEventListener("update-before",this._onUpdateBefore),e.removeEventListener("update-after",this._onUpdateAfter),e.removeEventListener("tile-visibility-change",this._onTileVisibilityChange),e.forEachLoadedModel((t,s)=>{this._fadeManager.deleteObject(s),t&&(t.visible=!0)})}forEachBatchIds(e,t){if(this.initBatchedMesh(),this.batchedMesh){const s=this.tiles.getPluginByName("BATCHED_TILES_PLUGIN"),a=s.getTileBatchIds(e);a&&a.forEach(i=>{t(i,this.batchedMesh,s)})}}}export{q as T};
//# sourceMappingURL=TilesFadePlugin-D_u_P2Qt.js.map
