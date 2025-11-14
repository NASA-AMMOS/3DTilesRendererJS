import{S as M,W as D,P as E,a as L,D as P,A as R,G as _,B as I,b as A,R as F,V as H,U as W,C as j,c as G}from"./three.module-DBfedTbk.js";/* empty css               */import{B as $}from"./B3DMLoader-D_8ejTd0.js";import{O as z}from"./OrbitControls-DkXhkMTr.js";import"./BatchTable-CRr3zuRk.js";import"./GLTFLoader-BjagHNWe.js";let s,u,c,t,w,r,g,a,d,f;U();B();function O(i){const e={...i};return e.uniforms={highlightedBatchId:{value:-1},highlightColor:{value:new j(16761095).convertSRGBToLinear()},...W.clone(i.uniforms)},e.extensions={derivatives:!0},e.lights=!0,e.vertexShader=`
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
			`),e}function U(){f=document.getElementById("hover-info"),c=new M,t=new D({antialias:!0}),t.setPixelRatio(window.devicePixelRatio),t.setSize(window.innerWidth,window.innerHeight),t.setClearColor(1383455),t.shadowMap.enabled=!0,t.shadowMap.type=E,document.body.appendChild(t.domElement),s=new L(60,window.innerWidth/window.innerHeight,1,4e3),s.position.set(400,400,400),u=new z(s,t.domElement),u.screenSpacePanning=!1,u.minDistance=1,u.maxDistance=2e3,r=new P(16777215,1.25),r.position.set(1,2,3).multiplyScalar(40),r.castShadow=!0,r.shadow.bias=-.01,r.shadow.mapSize.setScalar(2048);const i=r.shadow.camera;i.left=-200,i.bottom=-200,i.right=200,i.top=200,i.updateProjectionMatrix(),c.add(r);const e=new R(16777215,.05);c.add(e),w=new _,c.add(w),new $().loadAsync("https://raw.githubusercontent.com/CesiumGS/cesium/main/Apps/SampleData/Cesium3DTiles/Hierarchy/BatchTableHierarchy/tile.b3dm").then(h=>{console.log(h),d=h.scene,w.add(d);const n=new I;n.setFromObject(d),n.getCenter(w.position).multiplyScalar(-1),d.traverse(o=>{o.isMesh&&(o.material=new A(O(G.standard)))})}),g=new F,a=new H,C(),window.addEventListener("resize",C,!1),t.domElement.addEventListener("mousemove",K,!1)}function K(i){const e=this.getBoundingClientRect();a.x=i.clientX-e.x,a.y=i.clientY-e.y,a.x=a.x/e.width*2-1,a.y=-(a.y/e.height)*2+1,g.setFromCamera(a,s);const h=g.intersectObject(c);let n=-1;if(h.length>0){const{face:o,object:p}=h[0],v=p.geometry.getAttribute("_batchid");if(v){let m=p;for(;!m.batchTable;)m=m.parent;const x=m.batchTable;n=v.getX(o.a);const y=x.getDataFromId(n),b=y["3DTILES_batch_table_hierarchy"],T=x.getKeys();f.innerText=`${"_batchid".padEnd(15)}: ${n}
`;for(const l of T)f.innerText+=`${l.padEnd(15)}: ${y[l]}
`;for(const l in b)for(const S in b[l])f.innerText+=`${S.padEnd(15)}: ${b[l][S]}
`}}else f.innerText="";d&&d.traverse(o=>{o.isMesh&&(o.material.uniforms.highlightedBatchId.value=n)})}function C(){s.aspect=window.innerWidth/window.innerHeight,t.setPixelRatio(window.devicePixelRatio),t.setSize(window.innerWidth,window.innerHeight),s.updateProjectionMatrix()}function B(){requestAnimationFrame(B),V()}function V(){t.render(c,s)}
//# sourceMappingURL=b3dmExample-kFsC1IMb.js.map
