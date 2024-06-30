import{S as k,W as F,P as R,a as z,O as L,D as T,A as W,B as E,d as I,G as V,M as D,b as v}from"./three.module-D__zfobH.js";import{O as G}from"./OrbitControls-sLmUVcT7.js";import{g as H}from"./lil-gui.module.min-BZfzOr10.js";import{S as A}from"./stats.module--VATS4Kh.js";import{T as N}from"./TilesRenderer-CXFY6_I3.js";import"./B3DMLoader-GhqTx3rt.js";import"./readMagicBytes-BpU7wwna.js";import"./LoaderBase-DXn50-K6.js";import"./GLTFLoader-tpP7d8rB.js";import"./PNTSLoader-C5XJGP_j.js";import"./I3DMLoader-DV8gfO_k.js";import"./CMPTLoader-BfbE6aHN.js";import"./GLTFExtensionLoader-DgjxHc9V.js";let n,m,p,o,t,a,c,h,f,d,s,w;const g=0,x=1,y=2,S=3,l={material:g,orthographic:!1,rebuild:M},O={vertexShader:`
		varying vec3 wPosition;
		void main() {

			#include <begin_vertex>
			#include <project_vertex>
			wPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;

		}
	`,fragmentShader:`
		varying vec3 wPosition;
		void main() {

			float minVal = - 30.0;
			float maxVal = 30.0;

			float val = ( wPosition.y - minVal ) / ( maxVal - minVal );

			vec4 color1 = vec4( 0.149, 0.196, 0.219, 1.0 ) * 0.5;
			vec4 color2 = vec4( 1.0 );

			gl_FragColor = mix( color1, color2, val );

		}
	`},_={extensions:{derivatives:!0},vertexShader:`
		varying vec3 wPosition;
		varying vec3 vViewPosition;
		void main() {

			#include <begin_vertex>
			#include <project_vertex>
			wPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
			vViewPosition = - mvPosition.xyz;

		}
	`,fragmentShader:`
		varying vec3 wPosition;
		varying vec3 vViewPosition;
		void main() {

			// lighting
			vec3 fdx = vec3( dFdx( wPosition.x ), dFdx( wPosition.y ), dFdx( wPosition.z ) );
			vec3 fdy = vec3( dFdy( wPosition.x ), dFdy( wPosition.y ), dFdy( wPosition.z ) );
			vec3 worldNormal = normalize( cross( fdx, fdy ) );

			float lighting =
				0.4 +
				clamp( dot( worldNormal, vec3( 1.0, 1.0, 1.0 ) ), 0.0, 1.0 ) * 0.5 +
				clamp( dot( worldNormal, vec3( - 1.0, 1.0, - 1.0 ) ), 0.0, 1.0 ) * 0.3;

			// thickness scale
			float upwardness = dot( worldNormal, vec3( 0.0, 1.0, 0.0 ) );
			float yInv = clamp( 1.0 - abs( upwardness ), 0.0, 1.0 );
			float thicknessScale = pow( yInv, 0.4 );
			thicknessScale *= 0.25 + 0.5 * ( vViewPosition.z + 1.0 ) / 2.0;

			// thickness
			float thickness = 0.01 * thicknessScale;
			float thickness2 = thickness / 2.0;
			float m = mod( wPosition.y, 3.0 );

			// soften edge
			float center = thickness2;
			float dist = clamp( abs( m - thickness2 ) / thickness2, 0.0, 1.0 );

			vec4 topoColor = vec4( 0.149, 0.196, 0.219, 1.0 ) * 0.5;
			gl_FragColor = mix( topoColor * lighting, vec4( lighting ), dist );

		}
	`};$();b();function P(i){const r=parseFloat(l.material);i.traverse(e=>{if(e.isMesh)switch(e.material.dispose(),r){case g:e.material=e.originalMaterial,e.material.side=2,e.receiveShadow=!1,e.castShadow=!1;break;case x:e.material=new v(O),e.material.side=2,e.receiveShadow=!1,e.castShadow=!1;break;case y:e.material=new v(_),e.material.side=2,e.material.flatShading=!0,e.receiveShadow=!1,e.castShadow=!1;break;case S:e.material=new D,e.material.side=2,e.receiveShadow=!0,e.castShadow=!0}})}function j(i){i.traverse(r=>{r.isMesh&&(r.originalMaterial=r.material)}),P(i)}function B(i){i.traverse(r=>{r.isMesh&&r.material.dispose()})}function M(){t&&(t.group.parent.remove(t.group),t.dispose());const i=window.location.hash.replace(/^#/,"")||"../data/tileset.json";t=new N(i),t.errorTarget=2,t.onLoadModel=j,t.onDisposeModel=B,c.add(t.group)}function $(){p=new k,o=new F({antialias:!0}),o.setPixelRatio(window.devicePixelRatio),o.setSize(window.innerWidth,window.innerHeight),o.setClearColor(1383455),o.shadowMap.enabled=!0,o.shadowMap.type=R,document.body.appendChild(o.domElement),n=new z(60,window.innerWidth/window.innerHeight,1,4e3),n.position.set(400,400,400),a=new L,m=new G(n,o.domElement),m.screenSpacePanning=!1,m.minDistance=1,m.maxDistance=2e3,d=new T(16777215,1.25),d.position.set(1,2,3).multiplyScalar(40),d.castShadow=!0,d.shadow.bias=-.01,d.shadow.mapSize.setScalar(2048);const i=d.shadow.camera;i.left=-200,i.bottom=-200,i.right=200,i.top=200,i.updateProjectionMatrix(),p.add(d);const r=new W(16777215,.05);p.add(r),h=new E,f=new I,c=new V,p.add(c),M(),u(),window.addEventListener("resize",u,!1);const e=new H;e.width=300,e.add(l,"orthographic"),e.add(l,"material",{DEFAULT:g,GRADIENT:x,TOPOGRAPHIC_LINES:y,LIGHTING:S}).onChange(()=>{t.forEachLoadedModel(P)}),e.add(l,"rebuild"),e.open(),w=new A,w.showPanel(0),document.body.appendChild(w.dom),s=document.createElement("div"),s.style.position="absolute",s.style.top=0,s.style.left=0,s.style.color="white",s.style.width="100%",s.style.textAlign="center",s.style.padding="5px",s.style.pointerEvents="none",s.style.lineHeight="1.5em",document.body.appendChild(s)}function u(){n.aspect=window.innerWidth/window.innerHeight,o.setPixelRatio(window.devicePixelRatio),o.setSize(window.innerWidth,window.innerHeight),n.updateProjectionMatrix(),C()}function C(){a.position.copy(n.position),a.rotation.copy(n.rotation);const i=n.position.distanceTo(m.target)/2,r=window.innerWidth/window.innerHeight;a.left=-r*i,a.right=r*i,a.bottom=-i,a.top=i,a.near=n.near,a.far=n.far,a.updateProjectionMatrix()}function b(){requestAnimationFrame(b),l.orthographic?(t.deleteCamera(n),t.setCamera(a),t.setResolutionFromRenderer(a,o)):(t.deleteCamera(a),t.setCamera(n),t.setResolutionFromRenderer(n,o)),c.rotation.set(0,0,0),l.up==="-Z"&&(c.rotation.x=Math.PI/2),c.updateMatrixWorld(!0),t.getBoundingBox(h)?(h.getCenter(t.group.position),t.group.position.multiplyScalar(-1)):t.getBoundingSphere(f)&&(t.group.position.copy(f.center),t.group.position.multiplyScalar(-1)),window.tiles=t,n.updateMatrixWorld(),a.updateMatrixWorld(),t.update(),q(),w.update()}function q(){C(),s.innerText=`Geometries: ${o.info.memory.geometries} Textures: ${o.info.memory.textures} Programs: ${o.info.programs.length} `,o.render(p,l.orthographic?a:n)}
