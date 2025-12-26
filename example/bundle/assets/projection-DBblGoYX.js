import{o as f,aF as Qe,V as Ye,a as on,O as rn,aJ as sn,ay as qe,aK as _e,aL as re,aM as an,B as me,d as Ke,b as cn,U as Xe,aN as Pe,h as ln,t as ie,aO as un,n as B,M as St,C as Ln,Q as bt,au as dn,ah as fn,c as Ve,aP as On,k as An,j as Un}from"./three.module-CC2m_lxK.js";import{r,g as pe,c as pn,u as et,j as G,a as xt,b as Rn,d as Dn,C as Bn,T as Tn,E as Wn}from"./CameraControls-Cx4or68B.js";import{T as In}from"./TilesFadePlugin-CG59hEb8.js";import{I as jn,G as Fn}from"./ImageOverlayPlugin-Ch13ITIN.js";import{_ as Ze}from"./extends-CF3RwP-h.js";import{v as mn}from"./constants-DKSGfOkC.js";import"./GlobeControls-B3Xs1cXU.js";import"./EnvironmentControls-B1SE85z4.js";import"./Ellipsoid-DD6-yspj.js";import"./I3DMLoader-CFS0lO7t.js";import"./BatchTable-CRr3zuRk.js";import"./GLTFLoader-C74iPfw8.js";import"./TilesRenderer-DrbTYuR7.js";import"./B3DMLoader-hIYsixHW.js";import"./PNTSLoader-BvJeMH8j.js";import"./CMPTLoader-CzvwwRQk.js";import"./EllipsoidRegion-BQSo-b86.js";import"./GeometryClipper-CuIK_FvM.js";import"./TMSImageSource-DpDPJzTR.js";import"./TiledImageSource-BhToCTCT.js";class Hn{constructor(){this.name="ENFORCE_NONZERO_ERROR",this.priority=-1/0,this.originalError=new Map}preprocessNode(e){if(e.geometricError===0){let t=e.parent,n=1;for(;t!==null;){if(t.geometricError!==0){e.geometricError=t.geometricError*2**-n;break}t=t.parent,n++}}}}const Ae=new f,Et=new f,kn=new f,zt=new Ye;function Nn(i,e,t){const n=Ae.setFromMatrixPosition(i.matrixWorld);n.project(e);const o=t.width/2,s=t.height/2;return[n.x*o+o,-(n.y*s)+s]}function $n(i,e){const t=Ae.setFromMatrixPosition(i.matrixWorld),n=Et.setFromMatrixPosition(e.matrixWorld),o=t.sub(n),s=e.getWorldDirection(kn);return o.angleTo(s)>Math.PI/2}function Gn(i,e,t,n){const o=Ae.setFromMatrixPosition(i.matrixWorld),s=o.clone();s.project(e),zt.set(s.x,s.y),t.setFromCamera(zt,e);const c=t.intersectObjects(n,!0);if(c.length){const a=c[0].distance;return o.distanceTo(t.ray.origin)<a}return!0}function Vn(i,e){if(e instanceof rn)return e.zoom;if(e instanceof on){const t=Ae.setFromMatrixPosition(i.matrixWorld),n=Et.setFromMatrixPosition(e.matrixWorld),o=e.fov*Math.PI/180,s=t.distanceTo(n);return 1/(2*Math.tan(o/2)*s)}else return 1}function qn(i,e,t){if(e instanceof on||e instanceof rn){const n=Ae.setFromMatrixPosition(i.matrixWorld),o=Et.setFromMatrixPosition(e.matrixWorld),s=n.distanceTo(o),c=(t[1]-t[0])/(e.far-e.near),a=t[1]-c*e.far;return Math.round(c*s+a)}}const wt=i=>Math.abs(i)<1e-10?0:i;function hn(i,e,t=""){let n="matrix3d(";for(let o=0;o!==16;o++)n+=wt(e[o]*i.elements[o])+(o!==15?",":")");return t+n}const Xn=(i=>e=>hn(e,i))([1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1]),Zn=(i=>(e,t)=>hn(e,i(t),"translate(-50%,-50%)"))(i=>[1/i,1/i,1/i,1,-1/i,-1/i,-1/i,-1,1/i,1/i,1/i,1,1,1,1,1]);function Jn(i){return i&&typeof i=="object"&&"current"in i}const tt=r.forwardRef(({children:i,eps:e=.001,style:t,className:n,prepend:o,center:s,fullscreen:c,portal:a,distanceFactor:d,sprite:h=!1,transform:p=!1,occlude:l,onOcclude:b,castShadow:F,receiveShadow:L,material:O,geometry:U,zIndexRange:R=[16777271,0],calculatePosition:S=Nn,as:m="div",wrapperClass:g,pointerEvents:T="auto",...E},W)=>{const{gl:H,camera:z,scene:Y,size:A,raycaster:oe,events:K,viewport:ee}=pe(),[_]=r.useState(()=>document.createElement(m)),I=r.useRef(null),y=r.useRef(null),v=r.useRef(0),u=r.useRef([0,0]),w=r.useRef(null),C=r.useRef(null),P=(a==null?void 0:a.current)||K.connected||H.domElement.parentNode,M=r.useRef(null),k=r.useRef(!1),N=r.useMemo(()=>l&&l!=="blending"||Array.isArray(l)&&l.length&&Jn(l[0]),[l]);r.useLayoutEffect(()=>{const j=H.domElement;l&&l==="blending"?(j.style.zIndex=`${Math.floor(R[0]/2)}`,j.style.position="absolute",j.style.pointerEvents="none"):(j.style.zIndex=null,j.style.position=null,j.style.pointerEvents=null)},[l]),r.useLayoutEffect(()=>{if(y.current){const j=I.current=pn.createRoot(_);if(Y.updateMatrixWorld(),p)_.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{const D=S(y.current,z,A);_.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${D[0]}px,${D[1]}px,0);transform-origin:0 0;`}return P&&(o?P.prepend(_):P.appendChild(_)),()=>{P&&P.removeChild(_),j.unmount()}}},[P,p]),r.useLayoutEffect(()=>{g&&(_.className=g)},[g]);const x=r.useMemo(()=>p?{position:"absolute",top:0,left:0,width:A.width,height:A.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:s?"translate3d(-50%,-50%,0)":"none",...c&&{top:-A.height/2,left:-A.width/2,width:A.width,height:A.height},...t},[t,s,c,A,p]),te=r.useMemo(()=>({position:"absolute",pointerEvents:T}),[T]);r.useLayoutEffect(()=>{if(k.current=!1,p){var j;(j=I.current)==null||j.render(r.createElement("div",{ref:w,style:x},r.createElement("div",{ref:C,style:te},r.createElement("div",{ref:W,className:n,style:t,children:i}))))}else{var D;(D=I.current)==null||D.render(r.createElement("div",{ref:W,style:x,className:n,children:i}))}});const $=r.useRef(!0);et(j=>{if(y.current){z.updateMatrixWorld(),y.current.updateWorldMatrix(!0,!1);const D=p?u.current:S(y.current,z,A);if(p||Math.abs(v.current-z.zoom)>e||Math.abs(u.current[0]-D[0])>e||Math.abs(u.current[1]-D[1])>e){const he=$n(y.current,z);let fe=!1;N&&(Array.isArray(l)?fe=l.map(ge=>ge.current):l!=="blending"&&(fe=[Y]));const Ce=$.current;if(fe){const ge=Gn(y.current,z,oe,fe);$.current=ge&&!he}else $.current=!he;Ce!==$.current&&(b?b(!$.current):_.style.display=$.current?"block":"none");const Re=Math.floor(R[0]/2),bn=l?N?[R[0],Re]:[Re-1,0]:R;if(_.style.zIndex=`${qn(y.current,z,bn)}`,p){const[ge,_t]=[A.width/2,A.height/2],nt=z.projectionMatrix.elements[5]*_t,{isOrthographicCamera:Ct,top:En,left:Mn,bottom:Pn,right:_n}=z,Cn=Xn(z.matrixWorldInverse),zn=Ct?`scale(${nt})translate(${wt(-(_n+Mn)/2)}px,${wt((En+Pn)/2)}px)`:`translateZ(${nt}px)`;let ye=y.current.matrixWorld;h&&(ye=z.matrixWorldInverse.clone().transpose().copyPosition(ye).scale(y.current.scale),ye.elements[3]=ye.elements[7]=ye.elements[11]=0,ye.elements[15]=1),_.style.width=A.width+"px",_.style.height=A.height+"px",_.style.perspective=Ct?"":`${nt}px`,w.current&&C.current&&(w.current.style.transform=`${zn}${Cn}translate(${ge}px,${_t}px)`,C.current.style.transform=Zn(ye,1/((d||10)/400)))}else{const ge=d===void 0?1:Vn(y.current,z)*d;_.style.transform=`translate3d(${D[0]}px,${D[1]}px,0) scale(${ge})`}u.current=D,v.current=z.zoom}}if(!N&&M.current&&!k.current)if(p){if(w.current){const D=w.current.children[0];if(D!=null&&D.clientWidth&&D!=null&&D.clientHeight){const{isOrthographicCamera:he}=z;if(he||U)E.scale&&(Array.isArray(E.scale)?E.scale instanceof f?M.current.scale.copy(E.scale.clone().divideScalar(1)):M.current.scale.set(1/E.scale[0],1/E.scale[1],1/E.scale[2]):M.current.scale.setScalar(1/E.scale));else{const fe=(d||10)/400,Ce=D.clientWidth*fe,Re=D.clientHeight*fe;M.current.scale.set(Ce,Re,1)}k.current=!0}}}else{const D=_.children[0];if(D!=null&&D.clientWidth&&D!=null&&D.clientHeight){const he=1/ee.factor,fe=D.clientWidth*he,Ce=D.clientHeight*he;M.current.scale.set(fe,Ce,1),k.current=!0}M.current.lookAt(j.camera.position)}});const ne=r.useMemo(()=>({vertexShader:p?void 0:`
          /*
            This shader is from the THREE's SpriteMaterial.
            We need to turn the backing plane into a Sprite
            (make it always face the camera) if "transfrom"
            is false.
          */
          #include <common>

          void main() {
            vec2 center = vec2(0., 1.);
            float rotation = 0.0;

            // This is somewhat arbitrary, but it seems to work well
            // Need to figure out how to derive this dynamically if it even matters
            float size = 0.03;

            vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
            vec2 scale;
            scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
            scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );

            bool isPerspective = isPerspectiveMatrix( projectionMatrix );
            if ( isPerspective ) scale *= - mvPosition.z;

            vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale * size;
            vec2 rotatedPosition;
            rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
            rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
            mvPosition.xy += rotatedPosition;

            gl_Position = projectionMatrix * mvPosition;
          }
      `,fragmentShader:`
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
      `}),[p]);return r.createElement("group",Ze({},E,{ref:y}),l&&!N&&r.createElement("mesh",{castShadow:F,receiveShadow:L,ref:M},U||r.createElement("planeGeometry",null),O||r.createElement("shaderMaterial",{side:Qe,vertexShader:ne.vertexShader,fragmentShader:ne.fragmentShader})))}),gn=mn>=125?"uv1":"uv2",Lt=new me,De=new f;let Mt=class extends sn{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new qe(e,3)),this.setAttribute("uv",new qe(t,2))}applyMatrix4(e){const t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const n=new _e(t,6,1);return this.setAttribute("instanceStart",new re(n,3,0)),this.setAttribute("instanceEnd",new re(n,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let n;e instanceof Float32Array?n=e:Array.isArray(e)&&(n=new Float32Array(e));const o=new _e(n,t*2,1);return this.setAttribute("instanceColorStart",new re(o,t,0)),this.setAttribute("instanceColorEnd",new re(o,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new an(e.geometry)),this}fromLineSegments(e){const t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new me);const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),Lt.setFromBufferAttribute(t),this.boundingBox.union(Lt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ke),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){const n=this.boundingSphere.center;this.boundingBox.getCenter(n);let o=0;for(let s=0,c=e.count;s<c;s++)De.fromBufferAttribute(e,s),o=Math.max(o,n.distanceToSquared(De)),De.fromBufferAttribute(t,s),o=Math.max(o,n.distanceToSquared(De));this.boundingSphere.radius=Math.sqrt(o),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}};class yn extends Mt{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){const t=e.length-3,n=new Float32Array(2*t);for(let o=0;o<t;o+=3)n[2*o]=e[o],n[2*o+1]=e[o+1],n[2*o+2]=e[o+2],n[2*o+3]=e[o+3],n[2*o+4]=e[o+4],n[2*o+5]=e[o+5];return super.setPositions(n),this}setColors(e,t=3){const n=e.length-t,o=new Float32Array(2*n);if(t===3)for(let s=0;s<n;s+=t)o[2*s]=e[s],o[2*s+1]=e[s+1],o[2*s+2]=e[s+2],o[2*s+3]=e[s+3],o[2*s+4]=e[s+4],o[2*s+5]=e[s+5];else for(let s=0;s<n;s+=t)o[2*s]=e[s],o[2*s+1]=e[s+1],o[2*s+2]=e[s+2],o[2*s+3]=e[s+3],o[2*s+4]=e[s+4],o[2*s+5]=e[s+5],o[2*s+6]=e[s+6],o[2*s+7]=e[s+7];return super.setColors(o,t),this}fromLine(e){const t=e.geometry;return this.setPositions(t.attributes.position.array),this}}let Pt=class extends cn{constructor(e){super({type:"LineMaterial",uniforms:Xe.clone(Xe.merge([Pe.common,Pe.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new Ye(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${mn>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(t){this.uniforms.diffuse.value=t}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(t){t===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(t){this.uniforms.linewidth.value=t}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(t){!!t!="USE_DASH"in this.defines&&(this.needsUpdate=!0),t===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(t){this.uniforms.dashScale.value=t}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(t){this.uniforms.dashSize.value=t}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(t){this.uniforms.dashOffset.value=t}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(t){this.uniforms.gapSize.value=t}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(t){this.uniforms.opacity.value=t}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(t){this.uniforms.resolution.value.copy(t)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(t){!!t!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),t===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}};const ot=new ie,Ot=new f,At=new f,V=new ie,q=new ie,se=new ie,rt=new f,it=new B,J=new un,Ut=new f,Be=new me,Te=new Ke,ae=new ie;let ue,ve;function Rt(i,e,t){return ae.set(0,0,-e,1).applyMatrix4(i.projectionMatrix),ae.multiplyScalar(1/ae.w),ae.x=ve/t.width,ae.y=ve/t.height,ae.applyMatrix4(i.projectionMatrixInverse),ae.multiplyScalar(1/ae.w),Math.abs(Math.max(ae.x,ae.y))}function Qn(i,e){const t=i.matrixWorld,n=i.geometry,o=n.attributes.instanceStart,s=n.attributes.instanceEnd,c=Math.min(n.instanceCount,o.count);for(let a=0,d=c;a<d;a++){J.start.fromBufferAttribute(o,a),J.end.fromBufferAttribute(s,a),J.applyMatrix4(t);const h=new f,p=new f;ue.distanceSqToSegment(J.start,J.end,p,h),p.distanceTo(h)<ve*.5&&e.push({point:p,pointOnLine:h,distance:ue.origin.distanceTo(p),object:i,face:null,faceIndex:a,uv:null,[gn]:null})}}function Yn(i,e,t){const n=e.projectionMatrix,s=i.material.resolution,c=i.matrixWorld,a=i.geometry,d=a.attributes.instanceStart,h=a.attributes.instanceEnd,p=Math.min(a.instanceCount,d.count),l=-e.near;ue.at(1,se),se.w=1,se.applyMatrix4(e.matrixWorldInverse),se.applyMatrix4(n),se.multiplyScalar(1/se.w),se.x*=s.x/2,se.y*=s.y/2,se.z=0,rt.copy(se),it.multiplyMatrices(e.matrixWorldInverse,c);for(let b=0,F=p;b<F;b++){if(V.fromBufferAttribute(d,b),q.fromBufferAttribute(h,b),V.w=1,q.w=1,V.applyMatrix4(it),q.applyMatrix4(it),V.z>l&&q.z>l)continue;if(V.z>l){const m=V.z-q.z,g=(V.z-l)/m;V.lerp(q,g)}else if(q.z>l){const m=q.z-V.z,g=(q.z-l)/m;q.lerp(V,g)}V.applyMatrix4(n),q.applyMatrix4(n),V.multiplyScalar(1/V.w),q.multiplyScalar(1/q.w),V.x*=s.x/2,V.y*=s.y/2,q.x*=s.x/2,q.y*=s.y/2,J.start.copy(V),J.start.z=0,J.end.copy(q),J.end.z=0;const O=J.closestPointToPointParameter(rt,!0);J.at(O,Ut);const U=St.lerp(V.z,q.z,O),R=U>=-1&&U<=1,S=rt.distanceTo(Ut)<ve*.5;if(R&&S){J.start.fromBufferAttribute(d,b),J.end.fromBufferAttribute(h,b),J.start.applyMatrix4(c),J.end.applyMatrix4(c);const m=new f,g=new f;ue.distanceSqToSegment(J.start,J.end,g,m),t.push({point:g,pointOnLine:m,distance:ue.origin.distanceTo(g),object:i,face:null,faceIndex:b,uv:null,[gn]:null})}}}let vn=class extends ln{constructor(e=new Mt,t=new Pt({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,o=new Float32Array(2*t.count);for(let c=0,a=0,d=t.count;c<d;c++,a+=2)Ot.fromBufferAttribute(t,c),At.fromBufferAttribute(n,c),o[a]=a===0?0:o[a-1],o[a+1]=o[a]+Ot.distanceTo(At);const s=new _e(o,2,1);return e.setAttribute("instanceDistanceStart",new re(s,1,0)),e.setAttribute("instanceDistanceEnd",new re(s,1,1)),this}raycast(e,t){const n=this.material.worldUnits,o=e.camera;o===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const s=e.params.Line2!==void 0&&e.params.Line2.threshold||0;ue=e.ray;const c=this.matrixWorld,a=this.geometry,d=this.material;ve=d.linewidth+s,a.boundingSphere===null&&a.computeBoundingSphere(),Te.copy(a.boundingSphere).applyMatrix4(c);let h;if(n)h=ve*.5;else{const l=Math.max(o.near,Te.distanceToPoint(ue.origin));h=Rt(o,l,d.resolution)}if(Te.radius+=h,ue.intersectsSphere(Te)===!1)return;a.boundingBox===null&&a.computeBoundingBox(),Be.copy(a.boundingBox).applyMatrix4(c);let p;if(n)p=ve*.5;else{const l=Math.max(o.near,Be.distanceToPoint(ue.origin));p=Rt(o,l,d.resolution)}Be.expandByScalar(p),ue.intersectsBox(Be)!==!1&&(n?Qn(this,t):Yn(this,o,t))}onBeforeRender(e){const t=this.material.uniforms;t&&t.resolution&&(e.getViewport(ot),this.material.uniforms.resolution.value.set(ot.z,ot.w))}};class Kn extends vn{constructor(e=new yn,t=new Pt({color:Math.random()*16777215})){super(e,t),this.isLine2=!0,this.type="Line2"}}const eo=new f,to=new f,no=new f,oo=(i,e,t)=>{const n=t.width/2,o=t.height/2;e.updateMatrixWorld(!1);const s=i.project(e);return s.x=s.x*n+n,s.y=-(s.y*o)+o,s},ro=(i,e,t,n=1)=>{const o=eo.set(i.x/t.width*2-1,-(i.y/t.height)*2+1,n);return o.unproject(e),o},xn=(i,e,t,n)=>{const o=oo(no.copy(i),t,n);let s=0;for(let c=0;c<2;++c){const a=to.copy(o).setComponent(c,o.getComponent(c)+e),d=ro(a,t,n,a.z);s=Math.max(s,i.distanceTo(d))}return s},Je=r.forwardRef(function({points:e,color:t=16777215,vertexColors:n,linewidth:o,lineWidth:s,segments:c,dashed:a,...d},h){var p,l;const b=pe(R=>R.size),F=r.useMemo(()=>c?new vn:new Kn,[c]),[L]=r.useState(()=>new Pt),O=(n==null||(p=n[0])==null?void 0:p.length)===4?4:3,U=r.useMemo(()=>{const R=c?new Mt:new yn,S=e.map(m=>{const g=Array.isArray(m);return m instanceof f||m instanceof ie?[m.x,m.y,m.z]:m instanceof Ye?[m.x,m.y,0]:g&&m.length===3?[m[0],m[1],m[2]]:g&&m.length===2?[m[0],m[1],0]:m});if(R.setPositions(S.flat()),n){t=16777215;const m=n.map(g=>g instanceof Ln?g.toArray():g);R.setColors(m.flat(),O)}return R},[e,c,n,O]);return r.useLayoutEffect(()=>{F.computeLineDistances()},[e,F]),r.useLayoutEffect(()=>{a?L.defines.USE_DASH="":delete L.defines.USE_DASH,L.needsUpdate=!0},[a,L]),r.useEffect(()=>()=>{U.dispose(),L.dispose()},[U]),r.createElement("primitive",Ze({object:F,ref:h},d),r.createElement("primitive",{object:U,attach:"geometry"}),r.createElement("primitive",Ze({object:L,attach:"material",color:t,vertexColors:!!n,resolution:[b.width,b.height],linewidth:(l=o??s)!==null&&l!==void 0?l:1,dashed:a,transparent:O===4},d)))}),Ue=r.createContext(null),We=new f,Dt=new f,io=(i,e,t,n)=>{const o=e.dot(e),s=e.dot(i)-e.dot(t),c=e.dot(n);return c===0?-s/o:(We.copy(n).multiplyScalar(o/c).sub(e),Dt.copy(n).multiplyScalar(s/c).add(t).sub(i),-We.dot(Dt)/We.dot(We))},so=new f(0,1,0),Bt=new B,st=({direction:i,axis:e})=>{const{translation:t,translationLimits:n,annotations:o,annotationsClass:s,depthTest:c,scale:a,lineWidth:d,fixed:h,axisColors:p,hoveredColor:l,opacity:b,renderOrder:F,onDragStart:L,onDrag:O,onDragEnd:U,userData:R}=r.useContext(Ue),S=pe(v=>v.controls),m=r.useRef(null),g=r.useRef(null),T=r.useRef(null),E=r.useRef(0),[W,H]=r.useState(!1),z=r.useCallback(v=>{o&&(m.current.innerText=`${t.current[e].toFixed(2)}`,m.current.style.display="block"),v.stopPropagation();const u=new B().extractRotation(g.current.matrixWorld),w=v.point.clone(),C=new f().setFromMatrixPosition(g.current.matrixWorld),P=i.clone().applyMatrix4(u).normalize();T.current={clickPoint:w,dir:P},E.current=t.current[e],L({component:"Arrow",axis:e,origin:C,directions:[P]}),S&&(S.enabled=!1),v.target.setPointerCapture(v.pointerId)},[o,i,S,L,t,e]),Y=r.useCallback(v=>{if(v.stopPropagation(),W||H(!0),T.current){const{clickPoint:u,dir:w}=T.current,[C,P]=(n==null?void 0:n[e])||[void 0,void 0];let M=io(u,w,v.ray.origin,v.ray.direction);C!==void 0&&(M=Math.max(M,C-E.current)),P!==void 0&&(M=Math.min(M,P-E.current)),t.current[e]=E.current+M,o&&(m.current.innerText=`${t.current[e].toFixed(2)}`),Bt.makeTranslation(w.x*M,w.y*M,w.z*M),O(Bt)}},[o,O,W,t,n,e]),A=r.useCallback(v=>{o&&(m.current.style.display="none"),v.stopPropagation(),T.current=null,U(),S&&(S.enabled=!0),v.target.releasePointerCapture(v.pointerId)},[o,S,U]),oe=r.useCallback(v=>{v.stopPropagation(),H(!1)},[]),{cylinderLength:K,coneWidth:ee,coneLength:_,matrixL:I}=r.useMemo(()=>{const v=h?d/a*1.6:a/20,u=h?.2:a/5,w=h?1-u:a-u,C=new bt().setFromUnitVectors(so,i.clone().normalize()),P=new B().makeRotationFromQuaternion(C);return{cylinderLength:w,coneWidth:v,coneLength:u,matrixL:P}},[i,a,d,h]),y=W?l:p[e];return r.createElement("group",{ref:g},r.createElement("group",{matrix:I,matrixAutoUpdate:!1,onPointerDown:z,onPointerMove:Y,onPointerUp:A,onPointerOut:oe},o&&r.createElement(tt,{position:[0,-_,0]},r.createElement("div",{style:{display:"none",background:"#151520",color:"white",padding:"6px 8px",borderRadius:7,whiteSpace:"nowrap"},className:s,ref:m})),r.createElement("mesh",{visible:!1,position:[0,(K+_)/2,0],userData:R},r.createElement("cylinderGeometry",{args:[ee*1.4,ee*1.4,K+_,8,1]})),r.createElement(Je,{transparent:!0,raycast:()=>null,depthTest:c,points:[0,0,0,0,K,0],lineWidth:d,side:Qe,color:y,opacity:b,polygonOffset:!0,renderOrder:1,polygonOffsetFactor:-10,fog:!1}),r.createElement("mesh",{raycast:()=>null,position:[0,K+_/2,0],renderOrder:F},r.createElement("coneGeometry",{args:[ee,_,24,1]}),r.createElement("meshBasicMaterial",{transparent:!0,depthTest:c,color:y,opacity:b,polygonOffset:!0,polygonOffsetFactor:-10,fog:!1}))))},at=new f,ct=new f,lt=i=>i*180/Math.PI,ao=i=>i*Math.PI/180,co=(i,e,t,n,o)=>{at.copy(i).sub(t),ct.copy(e).sub(t);const s=n.dot(n),c=o.dot(o),a=at.dot(n)/s,d=at.dot(o)/c,h=ct.dot(n)/s,p=ct.dot(o)/c,l=Math.atan2(d,a);return Math.atan2(p,h)-l},lo=(i,e)=>{let t=Math.floor(i/e);return t=t<0?t+1:t,i-t*e},Tt=i=>{let e=lo(i,2*Math.PI);return Math.abs(e)<1e-6?0:(e<0&&(e+=2*Math.PI),e)},Ie=new B,Wt=new f,je=new fn,ut=new f,dt=({dir1:i,dir2:e,axis:t})=>{const{rotationLimits:n,annotations:o,annotationsClass:s,depthTest:c,scale:a,lineWidth:d,fixed:h,axisColors:p,hoveredColor:l,renderOrder:b,opacity:F,onDragStart:L,onDrag:O,onDragEnd:U,userData:R}=r.useContext(Ue),S=pe(y=>y.controls),m=r.useRef(null),g=r.useRef(null),T=r.useRef(0),E=r.useRef(0),W=r.useRef(null),[H,z]=r.useState(!1),Y=r.useCallback(y=>{o&&(m.current.innerText=`${lt(E.current).toFixed(0)}º`,m.current.style.display="block"),y.stopPropagation();const v=y.point.clone(),u=new f().setFromMatrixPosition(g.current.matrixWorld),w=new f().setFromMatrixColumn(g.current.matrixWorld,0).normalize(),C=new f().setFromMatrixColumn(g.current.matrixWorld,1).normalize(),P=new f().setFromMatrixColumn(g.current.matrixWorld,2).normalize(),M=new dn().setFromNormalAndCoplanarPoint(P,u);W.current={clickPoint:v,origin:u,e1:w,e2:C,normal:P,plane:M},L({component:"Rotator",axis:t,origin:u,directions:[w,C,P]}),S&&(S.enabled=!1),y.target.setPointerCapture(y.pointerId)},[o,S,L,t]),A=r.useCallback(y=>{if(y.stopPropagation(),H||z(!0),W.current){const{clickPoint:v,origin:u,e1:w,e2:C,normal:P,plane:M}=W.current,[k,N]=(n==null?void 0:n[t])||[void 0,void 0];je.copy(y.ray),je.intersectPlane(M,ut),je.direction.negate(),je.intersectPlane(M,ut);let x=co(v,ut,u,w,C),te=lt(x);y.shiftKey&&(te=Math.round(te/10)*10,x=ao(te)),k!==void 0&&N!==void 0&&N-k<2*Math.PI?(x=Tt(x),x=x>Math.PI?x-2*Math.PI:x,x=St.clamp(x,k-T.current,N-T.current),E.current=T.current+x):(E.current=Tt(T.current+x),E.current=E.current>Math.PI?E.current-2*Math.PI:E.current),o&&(te=lt(E.current),m.current.innerText=`${te.toFixed(0)}º`),Ie.makeRotationAxis(P,x),Wt.copy(u).applyMatrix4(Ie).sub(u).negate(),Ie.setPosition(Wt),O(Ie)}},[o,O,H,n,t]),oe=r.useCallback(y=>{o&&(m.current.style.display="none"),y.stopPropagation(),T.current=E.current,W.current=null,U(),S&&(S.enabled=!0),y.target.releasePointerCapture(y.pointerId)},[o,S,U]),K=r.useCallback(y=>{y.stopPropagation(),z(!1)},[]),ee=r.useMemo(()=>{const y=i.clone().normalize(),v=e.clone().normalize();return new B().makeBasis(y,v,y.clone().cross(v))},[i,e]),_=h?.65:a*.65,I=r.useMemo(()=>{const v=[];for(let u=0;u<=32;u++){const w=u*(Math.PI/2)/32;v.push(new f(Math.cos(w)*_,Math.sin(w)*_,0))}return v},[_]);return r.createElement("group",{ref:g,onPointerDown:Y,onPointerMove:A,onPointerUp:oe,onPointerOut:K,matrix:ee,matrixAutoUpdate:!1},o&&r.createElement(tt,{position:[_,_,0]},r.createElement("div",{style:{display:"none",background:"#151520",color:"white",padding:"6px 8px",borderRadius:7,whiteSpace:"nowrap"},className:s,ref:m})),r.createElement(Je,{points:I,lineWidth:d*4,visible:!1,userData:R}),r.createElement(Je,{transparent:!0,raycast:()=>null,depthTest:c,points:I,lineWidth:d,side:Qe,color:H?l:p[t],opacity:F,polygonOffset:!0,polygonOffsetFactor:-10,renderOrder:b,fog:!1}))},uo=(i,e,t)=>{const n=Math.abs(i.x)>=Math.abs(i.y)&&Math.abs(i.x)>=Math.abs(i.z)?0:Math.abs(i.y)>=Math.abs(i.x)&&Math.abs(i.y)>=Math.abs(i.z)?1:2,o=[0,1,2].sort((L,O)=>Math.abs(e.getComponent(O))-Math.abs(e.getComponent(L))),s=n===o[0]?o[1]:o[0],c=i.getComponent(n),a=i.getComponent(s),d=e.getComponent(n),h=e.getComponent(s),p=t.getComponent(n),b=(t.getComponent(s)-p*(a/c))/(h-d*(a/c));return[(p-b*d)/c,b]},Fe=new fn,He=new f,It=new B,ft=({dir1:i,dir2:e,axis:t})=>{const{translation:n,translationLimits:o,annotations:s,annotationsClass:c,depthTest:a,scale:d,lineWidth:h,fixed:p,axisColors:l,hoveredColor:b,opacity:F,onDragStart:L,onDrag:O,onDragEnd:U,userData:R}=r.useContext(Ue),S=pe(u=>u.controls),m=r.useRef(null),g=r.useRef(null),T=r.useRef(null),E=r.useRef(0),W=r.useRef(0),[H,z]=r.useState(!1),Y=r.useCallback(u=>{s&&(m.current.innerText=`${n.current[(t+1)%3].toFixed(2)}, ${n.current[(t+2)%3].toFixed(2)}`,m.current.style.display="block"),u.stopPropagation();const w=u.point.clone(),C=new f().setFromMatrixPosition(g.current.matrixWorld),P=new f().setFromMatrixColumn(g.current.matrixWorld,0).normalize(),M=new f().setFromMatrixColumn(g.current.matrixWorld,1).normalize(),k=new f().setFromMatrixColumn(g.current.matrixWorld,2).normalize(),N=new dn().setFromNormalAndCoplanarPoint(k,C);T.current={clickPoint:w,e1:P,e2:M,plane:N},E.current=n.current[(t+1)%3],W.current=n.current[(t+2)%3],L({component:"Slider",axis:t,origin:C,directions:[P,M,k]}),S&&(S.enabled=!1),u.target.setPointerCapture(u.pointerId)},[s,S,L,t]),A=r.useCallback(u=>{if(u.stopPropagation(),H||z(!0),T.current){const{clickPoint:w,e1:C,e2:P,plane:M}=T.current,[k,N]=(o==null?void 0:o[(t+1)%3])||[void 0,void 0],[x,te]=(o==null?void 0:o[(t+2)%3])||[void 0,void 0];Fe.copy(u.ray),Fe.intersectPlane(M,He),Fe.direction.negate(),Fe.intersectPlane(M,He),He.sub(w);let[$,ne]=uo(C,P,He);k!==void 0&&($=Math.max($,k-E.current)),N!==void 0&&($=Math.min($,N-E.current)),x!==void 0&&(ne=Math.max(ne,x-W.current)),te!==void 0&&(ne=Math.min(ne,te-W.current)),n.current[(t+1)%3]=E.current+$,n.current[(t+2)%3]=W.current+ne,s&&(m.current.innerText=`${n.current[(t+1)%3].toFixed(2)}, ${n.current[(t+2)%3].toFixed(2)}`),It.makeTranslation($*C.x+ne*P.x,$*C.y+ne*P.y,$*C.z+ne*P.z),O(It)}},[s,O,H,n,o,t]),oe=r.useCallback(u=>{s&&(m.current.style.display="none"),u.stopPropagation(),T.current=null,U(),S&&(S.enabled=!0),u.target.releasePointerCapture(u.pointerId)},[s,S,U]),K=r.useCallback(u=>{u.stopPropagation(),z(!1)},[]),ee=r.useMemo(()=>{const u=i.clone().normalize(),w=e.clone().normalize();return new B().makeBasis(u,w,u.clone().cross(w))},[i,e]),_=p?1/7:d/7,I=p?.225:d*.225,y=H?b:l[t],v=r.useMemo(()=>[new f(0,0,0),new f(0,I,0),new f(I,I,0),new f(I,0,0),new f(0,0,0)],[I]);return r.createElement("group",{ref:g,matrix:ee,matrixAutoUpdate:!1},s&&r.createElement(tt,{position:[0,0,0]},r.createElement("div",{style:{display:"none",background:"#151520",color:"white",padding:"6px 8px",borderRadius:7,whiteSpace:"nowrap"},className:c,ref:m})),r.createElement("group",{position:[_*1.7,_*1.7,0]},r.createElement("mesh",{visible:!0,onPointerDown:Y,onPointerMove:A,onPointerUp:oe,onPointerOut:K,scale:I,userData:R},r.createElement("planeGeometry",null),r.createElement("meshBasicMaterial",{transparent:!0,depthTest:a,color:y,polygonOffset:!0,polygonOffsetFactor:-10,side:Qe,fog:!1})),r.createElement(Je,{position:[-I/2,-I/2,0],transparent:!0,depthTest:a,points:v,lineWidth:h,color:y,opacity:F,polygonOffset:!0,polygonOffsetFactor:-10,userData:R,fog:!1})))},Oe=new f,jt=new f,fo=(i,e,t,n)=>{const o=e.dot(e),s=e.dot(i)-e.dot(t),c=e.dot(n);return c===0?-s/o:(Oe.copy(n).multiplyScalar(o/c).sub(e),jt.copy(n).multiplyScalar(s/c).add(t).sub(i),-Oe.dot(jt)/Oe.dot(Oe))},po=new f(0,1,0),ze=new f,Ft=new B,pt=({direction:i,axis:e})=>{const{scaleLimits:t,annotations:n,annotationsClass:o,depthTest:s,scale:c,lineWidth:a,fixed:d,axisColors:h,hoveredColor:p,opacity:l,renderOrder:b,onDragStart:F,onDrag:L,onDragEnd:O,userData:U}=r.useContext(Ue),R=pe(u=>u.size),S=pe(u=>u.controls),m=r.useRef(null),g=r.useRef(null),T=r.useRef(null),E=r.useRef(1),W=r.useRef(1),H=r.useRef(null),[z,Y]=r.useState(!1),A=d?1.2:1.2*c,oe=r.useCallback(u=>{n&&(m.current.innerText=`${W.current.toFixed(2)}`,m.current.style.display="block"),u.stopPropagation();const w=new B().extractRotation(g.current.matrixWorld),C=u.point.clone(),P=new f().setFromMatrixPosition(g.current.matrixWorld),M=i.clone().applyMatrix4(w).normalize(),k=g.current.matrixWorld.clone(),N=k.clone().invert(),x=d?1/xn(g.current.getWorldPosition(Oe),c,u.camera,R):1;H.current={clickPoint:C,dir:M,mPLG:k,mPLGInv:N,offsetMultiplier:x},F({component:"Sphere",axis:e,origin:P,directions:[M]}),S&&(S.enabled=!1),u.target.setPointerCapture(u.pointerId)},[n,S,i,F,e,d,c,R]),K=r.useCallback(u=>{if(u.stopPropagation(),z||Y(!0),H.current){const{clickPoint:w,dir:C,mPLG:P,mPLGInv:M,offsetMultiplier:k}=H.current,[N,x]=(t==null?void 0:t[e])||[1e-5,void 0],$=fo(w,C,u.ray.origin,u.ray.direction)*k,ne=d?$:$/c;let j=Math.pow(2,ne*.2);u.shiftKey&&(j=Math.round(j*10)/10),j=Math.max(j,N/E.current),x!==void 0&&(j=Math.min(j,x/E.current)),W.current=E.current*j,T.current.position.set(0,A+$,0),n&&(m.current.innerText=`${W.current.toFixed(2)}`),ze.set(1,1,1),ze.setComponent(e,j),Ft.makeScale(ze.x,ze.y,ze.z).premultiply(P).multiply(M),L(Ft)}},[n,A,L,z,t,e]),ee=r.useCallback(u=>{n&&(m.current.style.display="none"),u.stopPropagation(),E.current=W.current,H.current=null,T.current.position.set(0,A,0),O(),S&&(S.enabled=!0),u.target.releasePointerCapture(u.pointerId)},[n,S,O,A]),_=r.useCallback(u=>{u.stopPropagation(),Y(!1)},[]),{radius:I,matrixL:y}=r.useMemo(()=>{const u=d?a/c*1.8:c/22.5,w=new bt().setFromUnitVectors(po,i.clone().normalize()),C=new B().makeRotationFromQuaternion(w);return{radius:u,matrixL:C}},[i,c,a,d]),v=z?p:h[e];return r.createElement("group",{ref:g},r.createElement("group",{matrix:y,matrixAutoUpdate:!1,onPointerDown:oe,onPointerMove:K,onPointerUp:ee,onPointerOut:_},n&&r.createElement(tt,{position:[0,A/2,0]},r.createElement("div",{style:{display:"none",background:"#151520",color:"white",padding:"6px 8px",borderRadius:7,whiteSpace:"nowrap"},className:o,ref:m})),r.createElement("mesh",{ref:T,position:[0,A,0],renderOrder:b,userData:U},r.createElement("sphereGeometry",{args:[I,12,12]}),r.createElement("meshBasicMaterial",{transparent:!0,depthTest:s,color:v,opacity:l,polygonOffset:!0,polygonOffsetFactor:-10}))))},Ht=new B,kt=new B,Nt=new B,ke=new B,mt=new B,we=new B,$t=new B,Gt=new B,Vt=new B,Se=new me,ht=new me,qt=new f,Xt=new f,Zt=new f,Jt=new f,Le=new f,be=new f(1,0,0),Ee=new f(0,1,0),Me=new f(0,0,1),mo=r.forwardRef(({enabled:i=!0,matrix:e,onDragStart:t,onDrag:n,onDragEnd:o,autoTransform:s=!0,anchor:c,disableAxes:a=!1,disableSliders:d=!1,disableRotations:h=!1,disableScaling:p=!1,activeAxes:l=[!0,!0,!0],offset:b=[0,0,0],rotation:F=[0,0,0],scale:L=1,lineWidth:O=4,fixed:U=!1,translationLimits:R,rotationLimits:S,scaleLimits:m,depthTest:g=!0,renderOrder:T=500,axisColors:E=["#ff2060","#20df80","#2080ff"],hoveredColor:W="#ffff40",annotations:H=!1,annotationsClass:z,opacity:Y=1,visible:A=!0,userData:oe,children:K,...ee},_)=>{const I=pe(x=>x.invalidate),y=r.useRef(null),v=r.useRef(null),u=r.useRef(null),w=r.useRef(null),C=r.useRef([0,0,0]),P=r.useRef(new f(1,1,1)),M=r.useRef(new f(1,1,1));r.useLayoutEffect(()=>{c&&(w.current.updateWorldMatrix(!0,!0),ke.copy(w.current.matrixWorld).invert(),Se.makeEmpty(),w.current.traverse(x=>{x.geometry&&(x.geometry.boundingBox||x.geometry.computeBoundingBox(),we.copy(x.matrixWorld).premultiply(ke),ht.copy(x.geometry.boundingBox),ht.applyMatrix4(we),Se.union(ht))}),qt.copy(Se.max).add(Se.min).multiplyScalar(.5),Xt.copy(Se.max).sub(Se.min).multiplyScalar(.5),Zt.copy(Xt).multiply(new f(...c)).add(qt),Jt.set(...b).add(Zt),u.current.position.copy(Jt),I())});const k=r.useMemo(()=>({onDragStart:x=>{Ht.copy(v.current.matrix),kt.copy(v.current.matrixWorld),t&&t(x),I()},onDrag:x=>{Nt.copy(y.current.matrixWorld),ke.copy(Nt).invert(),mt.copy(kt).premultiply(x),we.copy(mt).premultiply(ke),$t.copy(Ht).invert(),Gt.copy(we).multiply($t),s&&v.current.matrix.copy(we),n&&n(we,Gt,mt,x),I()},onDragEnd:()=>{o&&o(),I()},translation:C,translationLimits:R,rotationLimits:S,axisColors:E,hoveredColor:W,opacity:Y,scale:L,lineWidth:O,fixed:U,depthTest:g,renderOrder:T,userData:oe,annotations:H,annotationsClass:z}),[t,n,o,C,R,S,m,g,L,O,U,...E,W,Y,oe,s,H,z]),N=new f;return et(x=>{if(U){const te=xn(u.current.getWorldPosition(N),L,x.camera,x.size);P.current.setScalar(te)}e&&e instanceof B&&(v.current.matrix=e),v.current.updateWorldMatrix(!0,!0),Vt.makeRotationFromEuler(u.current.rotation).setPosition(u.current.position).premultiply(v.current.matrixWorld),M.current.setFromMatrixScale(Vt),Le.copy(P.current).divide(M.current),(Math.abs(u.current.scale.x-Le.x)>1e-4||Math.abs(u.current.scale.y-Le.y)>1e-4||Math.abs(u.current.scale.z-Le.z)>1e-4)&&(u.current.scale.copy(Le),x.invalidate())}),r.useImperativeHandle(_,()=>v.current,[]),r.createElement(Ue.Provider,{value:k},r.createElement("group",{ref:y},r.createElement("group",Ze({ref:v,matrix:e,matrixAutoUpdate:!1},ee),r.createElement("group",{visible:A,ref:u,position:b,rotation:F},i&&r.createElement(r.Fragment,null,!a&&l[0]&&r.createElement(st,{axis:0,direction:be}),!a&&l[1]&&r.createElement(st,{axis:1,direction:Ee}),!a&&l[2]&&r.createElement(st,{axis:2,direction:Me}),!d&&l[0]&&l[1]&&r.createElement(ft,{axis:2,dir1:be,dir2:Ee}),!d&&l[0]&&l[2]&&r.createElement(ft,{axis:1,dir1:Me,dir2:be}),!d&&l[2]&&l[1]&&r.createElement(ft,{axis:0,dir1:Ee,dir2:Me}),!h&&l[0]&&l[1]&&r.createElement(dt,{axis:2,dir1:be,dir2:Ee}),!h&&l[0]&&l[2]&&r.createElement(dt,{axis:1,dir1:Me,dir2:be}),!h&&l[2]&&l[1]&&r.createElement(dt,{axis:0,dir1:Ee,dir2:Me}),!p&&l[0]&&r.createElement(pt,{axis:0,direction:be}),!p&&l[1]&&r.createElement(pt,{axis:1,direction:Ee}),!p&&l[2]&&r.createElement(pt,{axis:2,direction:Me}))),r.createElement("group",{ref:w},K))))}),ho=r.forwardRef(function({children:e,...t},n){const o=pe(s=>s.gl);return G.jsx(xt,{plugin:jn,args:{renderer:o,...t},ref:n,children:e})}),go=r.forwardRef(function(e,t){const{type:n,order:o=null,opacity:s=1,color:c=16777215,worldToProjection:a=null,...d}=e,h=r.useContext(Rn),p=r.useContext(Dn),l=r.useMemo(()=>new n(d),[n,xo(d)]);r.useEffect(()=>(h.addOverlay(l,o),()=>{h.deleteOverlay(l)}),[l,h]),r.useEffect(()=>{h.setOverlayOrder(l,o)},[l,h,o]),r.useEffect(()=>{l.opacity=s,l.color.set(c),a&&!l.frame?l.frame=new B:!a&&l.frame&&(l.frame=null)},[l,s,c,a]),et(()=>{a&&p&&l.frame.copy(a).multiply(p.group.matrixWorld)}),yo(l,t)});function yo(i,...e){r.useEffect(()=>{e.forEach(t=>{t&&(t instanceof Function?t(i):t.current=i)})},[i,...e])}function vo(i,e){if(i===e)return!0;if(!i||!e)return i===e;for(const t in i)if(i[t]!==e[t])return!1;for(const t in e)if(i[t]!==e[t])return!1;return!0}function xo(i){const e=r.useRef();return vo(e.current,i)||(e.current=i),e.current}const Qt=new me,Ne=new f;class wn extends sn{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new qe(e,3)),this.setAttribute("uv",new qe(t,2))}applyMatrix4(e){const t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const n=new _e(t,6,1);return this.setAttribute("instanceStart",new re(n,3,0)),this.setAttribute("instanceEnd",new re(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const n=new _e(t,6,1);return this.setAttribute("instanceColorStart",new re(n,3,0)),this.setAttribute("instanceColorEnd",new re(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new an(e.geometry)),this}fromLineSegments(e){const t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new me);const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),Qt.setFromBufferAttribute(t),this.boundingBox.union(Qt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ke),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){const n=this.boundingSphere.center;this.boundingBox.getCenter(n);let o=0;for(let s=0,c=e.count;s<c;s++)Ne.fromBufferAttribute(e,s),o=Math.max(o,n.distanceToSquared(Ne)),Ne.fromBufferAttribute(t,s),o=Math.max(o,n.distanceToSquared(Ne));this.boundingSphere.radius=Math.sqrt(o),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}Pe.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new Ye(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};Ve.line={uniforms:Xe.merge([Pe.common,Pe.fog,Pe.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
				vUv = uv;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			float alpha = opacity;

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};class wo extends cn{static get type(){return"LineMaterial"}constructor(e){super({uniforms:Xe.clone(Ve.line.uniforms),vertexShader:Ve.line.vertexShader,fragmentShader:Ve.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}}const gt=new ie,Yt=new f,Kt=new f,X=new ie,Z=new ie,ce=new ie,yt=new f,vt=new B,Q=new un,en=new f,$e=new me,Ge=new Ke,le=new ie;let de,xe;function tn(i,e,t){return le.set(0,0,-e,1).applyMatrix4(i.projectionMatrix),le.multiplyScalar(1/le.w),le.x=xe/t.width,le.y=xe/t.height,le.applyMatrix4(i.projectionMatrixInverse),le.multiplyScalar(1/le.w),Math.abs(Math.max(le.x,le.y))}function So(i,e){const t=i.matrixWorld,n=i.geometry,o=n.attributes.instanceStart,s=n.attributes.instanceEnd,c=Math.min(n.instanceCount,o.count);for(let a=0,d=c;a<d;a++){Q.start.fromBufferAttribute(o,a),Q.end.fromBufferAttribute(s,a),Q.applyMatrix4(t);const h=new f,p=new f;de.distanceSqToSegment(Q.start,Q.end,p,h),p.distanceTo(h)<xe*.5&&e.push({point:p,pointOnLine:h,distance:de.origin.distanceTo(p),object:i,face:null,faceIndex:a,uv:null,uv1:null})}}function bo(i,e,t){const n=e.projectionMatrix,s=i.material.resolution,c=i.matrixWorld,a=i.geometry,d=a.attributes.instanceStart,h=a.attributes.instanceEnd,p=Math.min(a.instanceCount,d.count),l=-e.near;de.at(1,ce),ce.w=1,ce.applyMatrix4(e.matrixWorldInverse),ce.applyMatrix4(n),ce.multiplyScalar(1/ce.w),ce.x*=s.x/2,ce.y*=s.y/2,ce.z=0,yt.copy(ce),vt.multiplyMatrices(e.matrixWorldInverse,c);for(let b=0,F=p;b<F;b++){if(X.fromBufferAttribute(d,b),Z.fromBufferAttribute(h,b),X.w=1,Z.w=1,X.applyMatrix4(vt),Z.applyMatrix4(vt),X.z>l&&Z.z>l)continue;if(X.z>l){const m=X.z-Z.z,g=(X.z-l)/m;X.lerp(Z,g)}else if(Z.z>l){const m=Z.z-X.z,g=(Z.z-l)/m;Z.lerp(X,g)}X.applyMatrix4(n),Z.applyMatrix4(n),X.multiplyScalar(1/X.w),Z.multiplyScalar(1/Z.w),X.x*=s.x/2,X.y*=s.y/2,Z.x*=s.x/2,Z.y*=s.y/2,Q.start.copy(X),Q.start.z=0,Q.end.copy(Z),Q.end.z=0;const O=Q.closestPointToPointParameter(yt,!0);Q.at(O,en);const U=St.lerp(X.z,Z.z,O),R=U>=-1&&U<=1,S=yt.distanceTo(en)<xe*.5;if(R&&S){Q.start.fromBufferAttribute(d,b),Q.end.fromBufferAttribute(h,b),Q.start.applyMatrix4(c),Q.end.applyMatrix4(c);const m=new f,g=new f;de.distanceSqToSegment(Q.start,Q.end,g,m),t.push({point:g,pointOnLine:m,distance:de.origin.distanceTo(g),object:i,face:null,faceIndex:b,uv:null,uv1:null})}}}class Eo extends ln{constructor(e=new wn,t=new wo({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,o=new Float32Array(2*t.count);for(let c=0,a=0,d=t.count;c<d;c++,a+=2)Yt.fromBufferAttribute(t,c),Kt.fromBufferAttribute(n,c),o[a]=a===0?0:o[a-1],o[a+1]=o[a]+Yt.distanceTo(Kt);const s=new _e(o,2,1);return e.setAttribute("instanceDistanceStart",new re(s,1,0)),e.setAttribute("instanceDistanceEnd",new re(s,1,1)),this}raycast(e,t){const n=this.material.worldUnits,o=e.camera;o===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const s=e.params.Line2!==void 0&&e.params.Line2.threshold||0;de=e.ray;const c=this.matrixWorld,a=this.geometry,d=this.material;xe=d.linewidth+s,a.boundingSphere===null&&a.computeBoundingSphere(),Ge.copy(a.boundingSphere).applyMatrix4(c);let h;if(n)h=xe*.5;else{const l=Math.max(o.near,Ge.distanceToPoint(de.origin));h=tn(o,l,d.resolution)}if(Ge.radius+=h,de.intersectsSphere(Ge)===!1)return;a.boundingBox===null&&a.computeBoundingBox(),$e.copy(a.boundingBox).applyMatrix4(c);let p;if(n)p=xe*.5;else{const l=Math.max(o.near,$e.distanceToPoint(de.origin));p=tn(o,l,d.resolution)}$e.expandByScalar(p),de.intersectsBox($e)!==!1&&(n?So(this,t):bo(this,o,t))}onBeforeRender(e){const t=this.material.uniforms;t&&t.resolution&&(e.getViewport(gt),this.material.uniforms.resolution.value.set(gt.z,gt.w))}}const Mo="https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json";function Sn(i,e,t=null){t===null&&(t=new Array(100).fill().map(()=>new Array(2)));for(let n=0;n<100;n++){const o=Math.PI*2*n/100,s=Math.sin(o+i),c=Math.cos(o+i),a=Math.sin(10*o)*10*e+75;t[n][0]=s*a,t[n][1]=c*a}return t}const nn={type:"Feature",geometry:{type:"Polygon",coordinates:[Sn(0,1)]}};function Po(){const[i,e]=r.useState(null),[t,n]=r.useState(null),o=r.useMemo(()=>{const a=new f().set(40,40,20),d=new f(-a.x,10,a.y*.25),h=new On(-Math.PI/2),p=new bt().setFromEuler(h);return new B().compose(d,p,a)},[]),s=r.useMemo(()=>{const a=new An;a.translate(.5,.5,.5);const d=new Un(a),h=new wn().fromEdgesGeometry(d),p=new Eo(h);return p.material.color.set(16776960),p.material.linewidth=2,p},[]),c=r.useMemo(()=>new B,[]);return r.useEffect(()=>()=>{s.geometry.dispose(),s.material.dispose()},[s]),et(a=>{if(t&&s&&(s.scale.x=t.aspectRatio,c.copy(i.matrixWorld).invert()),t){const d=a.clock.getElapsedTime(),h=d*Math.PI*2*.1,p=Math.sin(d*5);Sn(h,p,nn.geometry.coordinates[0]),t.imageSource.redraw()}}),G.jsxs(G.Fragment,{children:[G.jsx("color",{attach:"background",args:[2236962]}),G.jsx("group",{"rotation-x":Math.PI/2,children:G.jsxs(Tn,{url:Mo,errorTarget:6,children:[G.jsx(xt,{plugin:In,fadeDuration:500}),G.jsx(ho,{children:G.jsx(go,{type:Fn,geojson:nn,color:"red",strokeWidth:10,fillStyle:"rgba( 255, 255, 255, 0.25 )",worldToProjection:c,ref:n})}),G.jsx(xt,{plugin:Hn})]})}),G.jsx(Wn,{enableDamping:!0,maxDistance:1e3,minDistance:1,cameraRadius:0}),G.jsx(mo,{scale:150,matrix:o,fixed:!0,children:G.jsx("group",{ref:e,"position-z":-1,children:G.jsx("primitive",{object:s})})})]})}function _o(){return G.jsx(Bn,{camera:{position:[0,40,35]},style:{width:"100%",height:"100%",position:"absolute",margin:0,left:0,top:0},onContextMenu:i=>{i.preventDefault()},children:G.jsx(Po,{})})}pn.createRoot(document.getElementById("root")).render(G.jsx(r.StrictMode,{children:G.jsx(_o,{})}));
//# sourceMappingURL=projection-DBblGoYX.js.map
