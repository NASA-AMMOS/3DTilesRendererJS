import{S as M,W as D,P as L,a as T,D as P,A as R,G as F,B as _,b as A,R as E,V as H,U as I,C as W,c as j}from"./three.module-CQU0seT4.js";/* empty css               */import{O as G}from"./OrbitControls-CAmelIij.js";import{B as z}from"./B3DMLoader-BZtrZCNg.js";import"./readMagicBytes-ReGFEf36.js";import"./GLTFLoader-Bzr6GmPM.js";let s,m,c,t,f,r,b,a,d,u;$();C();function O(i){const e={...i};return e.uniforms={highlightedBatchId:{value:-1},highlightColor:{value:new W(16761095).convertSRGBToLinear()},...I.clone(i.uniforms)},e.extensions={derivatives:!0},e.lights=!0,e.vertexShader=`
			attribute float _batchid;
			varying float batchid;
		`+e.vertexShader.replace(/#include <uv_vertex>/,`
			#include <uv_vertex>
			batchid = _batchid;
			`),e.fragmentShader=`
			varying float batchid;
			uniform float highlightedBatchId;
			uniform vec3 highlightColor;
		`+e.fragmentShader.replace(/vec4 diffuseColor = vec4\( diffuse, opacity \);/,`
			vec4 diffuseColor =
				abs( batchid - highlightedBatchId ) < 0.5 ?
				vec4( highlightColor, opacity ) :
				vec4( diffuse, opacity );
			`),e}function $(){u=document.getElementById("info"),c=new M,t=new D({antialias:!0}),t.setPixelRatio(window.devicePixelRatio),t.setSize(window.innerWidth,window.innerHeight),t.setClearColor(1383455),t.shadowMap.enabled=!0,t.shadowMap.type=L,document.body.appendChild(t.domElement),s=new T(60,window.innerWidth/window.innerHeight,1,4e3),s.position.set(400,400,400),m=new G(s,t.domElement),m.screenSpacePanning=!1,m.minDistance=1,m.maxDistance=2e3,r=new P(16777215,1.25),r.position.set(1,2,3).multiplyScalar(40),r.castShadow=!0,r.shadow.bias=-.01,r.shadow.mapSize.setScalar(2048);const i=r.shadow.camera;i.left=-200,i.bottom=-200,i.right=200,i.top=200,i.updateProjectionMatrix(),c.add(r);const e=new R(16777215,.05);c.add(e),f=new F,c.add(f),new z().loadAsync("https://raw.githubusercontent.com/CesiumGS/cesium/main/Apps/SampleData/Cesium3DTiles/Hierarchy/BatchTableHierarchy/tile.b3dm").then(h=>{console.log(h),d=h.scene,f.add(d);const n=new _;n.setFromObject(d),n.getCenter(f.position).multiplyScalar(-1),d.traverse(o=>{o.isMesh&&(o.material=new A(O(j.standard)))})}),b=new E,a=new H,y(),window.addEventListener("resize",y,!1),t.domElement.addEventListener("mousemove",U,!1)}function U(i){const e=this.getBoundingClientRect();a.x=i.clientX-e.x,a.y=i.clientY-e.y,a.x=a.x/e.width*2-1,a.y=-(a.y/e.height)*2+1,b.setFromCamera(a,s);const h=b.intersectObject(c,!0);let n=-1;if(h.length){const{face:o,object:p}=h[0],v=p.geometry.getAttribute("_batchid");if(v){let l=p;for(;!l.batchTable;)l=l.parent;const B=l.batchTable;n=v.getX(o.a);const w=B.getDataFromId(n);u.innerText=`_batchid : ${n}
Area     : ${w.height.toFixed(3)}
Height   : ${w.height.toFixed(3)}
`;const g=w["3DTILES_batch_table_hierarchy"];for(const x in g)for(const S in g[x])u.innerText+=`${S} : ${g[x][S]}
`}}else u.innerText="";d&&d.traverse(o=>{o.isMesh&&(o.material.uniforms.highlightedBatchId.value=n)})}function y(){s.aspect=window.innerWidth/window.innerHeight,t.setPixelRatio(window.devicePixelRatio),t.setSize(window.innerWidth,window.innerHeight),s.updateProjectionMatrix()}function C(){requestAnimationFrame(C),V()}function V(){t.render(c,s)}
//# sourceMappingURL=b3dmExample-CmIiLhj6.js.map
