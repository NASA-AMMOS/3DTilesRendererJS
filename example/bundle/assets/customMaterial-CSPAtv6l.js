import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css               */import{T as k}from"./TilesRenderer-Bm042Xsy.js";import{S as F,W as L,P as R,a as z,O as E,D as T,A as W,B as I,d as V,G,f as H,b as v}from"./three.module-D-uF--xd.js";import{O as A}from"./OrbitControls-DlTkIL5F.js";import{g as D}from"./lil-gui.module.min-BH_YJbPT.js";import{S as N}from"./stats.module--VATS4Kh.js";import"./TilesRendererBase-CFsQu8zV.js";import"./constants-JFoaxC9y.js";import"./BatchTable-CRr3zuRk.js";import"./B3DMLoader-Cnf0ja_2.js";import"./B3DMLoaderBase-w5mdSgm-.js";import"./GLTFLoader-B4GrkiON.js";import"./PNTSLoader-DwvZQNdL.js";import"./I3DMLoader-BWluRuWb.js";import"./Ellipsoid-Dwquuq5w.js";import"./CMPTLoader-BOTrymv0.js";import"./EllipsoidRegion-VNvPMw5b.js";let r,c,p,o,t,a,m,h,f,d,s,w;const g=0,x=1,y=2,S=3,l={material:g,orthographic:!1,rebuild:C},O={vertexShader:`
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
	`};$();b();function P(i){const n=parseFloat(l.material);i.traverse(e=>{if(e.isMesh)switch(e.material.dispose(),n){case g:e.material=e.originalMaterial,e.material.side=2,e.receiveShadow=!1,e.castShadow=!1;break;case x:e.material=new v(O),e.material.side=2,e.receiveShadow=!1,e.castShadow=!1;break;case y:e.material=new v(_),e.material.side=2,e.material.flatShading=!0,e.receiveShadow=!1,e.castShadow=!1;break;case S:e.material=new H,e.material.side=2,e.receiveShadow=!0,e.castShadow=!0}})}function j({scene:i}){i.traverse(n=>{n.isMesh&&(n.originalMaterial=n.material)}),P(i)}function B({scene:i}){i.traverse(n=>{n.isMesh&&n.material.dispose()})}function C(){t&&(t.group.parent.remove(t.group),t.dispose());const i=window.location.hash.replace(/^#/,"")||"../../data/tileset.json";t=new k(i),t.errorTarget=2,t.addEventListener("load-model",j),t.addEventListener("dispose-model",B),m.add(t.group)}function $(){p=new F,o=new L({antialias:!0}),o.setPixelRatio(window.devicePixelRatio),o.setSize(window.innerWidth,window.innerHeight),o.setClearColor(1383455),o.shadowMap.enabled=!0,o.shadowMap.type=R,document.body.appendChild(o.domElement),r=new z(60,window.innerWidth/window.innerHeight,1,4e3),r.position.set(400,400,400),a=new E,c=new A(r,o.domElement),c.screenSpacePanning=!1,c.minDistance=1,c.maxDistance=2e3,d=new T(16777215,1.25),d.position.set(1,2,3).multiplyScalar(40),d.castShadow=!0,d.shadow.bias=-.01,d.shadow.mapSize.setScalar(2048);const i=d.shadow.camera;i.left=-200,i.bottom=-200,i.right=200,i.top=200,i.updateProjectionMatrix(),p.add(d);const n=new W(16777215,.05);p.add(n),h=new I,f=new V,m=new G,p.add(m),C(),u(),window.addEventListener("resize",u,!1);const e=new D;e.width=300,e.add(l,"orthographic"),e.add(l,"material",{DEFAULT:g,GRADIENT:x,TOPOGRAPHIC_LINES:y,LIGHTING:S}).onChange(()=>{t.forEachLoadedModel(P)}),e.add(l,"rebuild"),e.open(),w=new N,w.showPanel(0),document.body.appendChild(w.dom),s=document.createElement("div"),s.style.position="absolute",s.style.top=0,s.style.left=0,s.style.color="white",s.style.width="100%",s.style.textAlign="center",s.style.padding="5px",s.style.pointerEvents="none",s.style.lineHeight="1.5em",document.body.appendChild(s)}function u(){r.aspect=window.innerWidth/window.innerHeight,o.setPixelRatio(window.devicePixelRatio),o.setSize(window.innerWidth,window.innerHeight),r.updateProjectionMatrix(),M()}function M(){a.position.copy(r.position),a.rotation.copy(r.rotation);const i=r.position.distanceTo(c.target)/2,n=window.innerWidth/window.innerHeight;a.left=-n*i,a.right=n*i,a.bottom=-i,a.top=i,a.near=r.near,a.far=r.far,a.updateProjectionMatrix()}function b(){requestAnimationFrame(b),l.orthographic?(t.deleteCamera(r),t.setCamera(a),t.setResolutionFromRenderer(a,o)):(t.deleteCamera(a),t.setCamera(r),t.setResolutionFromRenderer(r,o)),m.rotation.set(0,0,0),l.up==="-Z"&&(m.rotation.x=Math.PI/2),m.updateMatrixWorld(!0),t.getBoundingBox(h)?(h.getCenter(t.group.position),t.group.position.multiplyScalar(-1)):t.getBoundingSphere(f)&&(t.group.position.copy(f.center),t.group.position.multiplyScalar(-1)),window.tiles=t,r.updateMatrixWorld(),a.updateMatrixWorld(),t.update(),q(),w.update()}function q(){M(),s.innerText=`Geometries: ${o.info.memory.geometries} Textures: ${o.info.memory.textures} Programs: ${o.info.programs.length} `,o.render(p,l.orthographic?a:r)}
//# sourceMappingURL=customMaterial-CSPAtv6l.js.map
