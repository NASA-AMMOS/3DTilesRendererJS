import{S,W as C,P as y,a as L,D as B,A as M,G as R,B as P,b as F,R as D,V as T,C as W,U as E,c as H}from"./three.module-D__zfobH.js";import{O as j}from"./OrbitControls-sLmUVcT7.js";import{B as G}from"./B3DMLoader-GhqTx3rt.js";import"./readMagicBytes-BpU7wwna.js";import"./LoaderBase-DXn50-K6.js";import"./GLTFLoader-tpP7d8rB.js";let d,f,s,t,m,r,g,n,c,w;_();x();function I(i){const e={...i};return e.uniforms={highlightedBatchId:{value:-1},highlightColor:{value:new W(16761095).convertSRGBToLinear()},...E.clone(i.uniforms)},e.extensions={derivatives:!0},e.lights=!0,e.vertexShader=`
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
			`),e}function _(){w=document.getElementById("info"),s=new S,t=new C({antialias:!0}),t.setPixelRatio(window.devicePixelRatio),t.setSize(window.innerWidth,window.innerHeight),t.setClearColor(1383455),t.shadowMap.enabled=!0,t.shadowMap.type=y,document.body.appendChild(t.domElement),d=new L(60,window.innerWidth/window.innerHeight,1,4e3),d.position.set(400,400,400),f=new j(d,t.domElement),f.screenSpacePanning=!1,f.minDistance=1,f.maxDistance=2e3,r=new B(16777215,1.25),r.position.set(1,2,3).multiplyScalar(40),r.castShadow=!0,r.shadow.bias=-.01,r.shadow.mapSize.setScalar(2048);const i=r.shadow.camera;i.left=-200,i.bottom=-200,i.right=200,i.top=200,i.updateProjectionMatrix(),s.add(r);const e=new M(16777215,.05);s.add(e),m=new R,s.add(m),new G().load("https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/1.0/TilesetWithRequestVolume/city/lr.b3dm").then(h=>{console.log(h),c=h.scene,m.add(c);const a=new P;a.setFromObject(c),a.getCenter(m.position).multiplyScalar(-1),c.traverse(o=>{o.isMesh&&(o.material=new F(I(H.standard)))})}),g=new D,n=new T,v(),window.addEventListener("resize",v,!1),t.domElement.addEventListener("mousemove",z,!1)}function z(i){const e=this.getBoundingClientRect();n.x=i.clientX-e.x,n.y=i.clientY-e.y,n.x=n.x/e.width*2-1,n.y=-(n.y/e.height)*2+1,g.setFromCamera(n,d);const h=g.intersectObject(s,!0);let a=-1;if(h.length){const{face:o,object:b}=h[0],p=b.geometry.getAttribute("_batchid");if(p){let l=b;for(;!l.batchTable;)l=l.parent;const u=l.batchTable;a=p.getX(o.a),w.innerText=`_batchid   : ${a}
Latitude   : ${u.getData("Latitude")[a].toFixed(3)}
Longitude  : ${u.getData("Longitude")[a].toFixed(3)}
Height     : ${u.getData("Height")[a].toFixed(3)}
`}}else w.innerText="";c&&c.traverse(o=>{o.isMesh&&(o.material.uniforms.highlightedBatchId.value=a)})}function v(){d.aspect=window.innerWidth/window.innerHeight,t.setPixelRatio(window.devicePixelRatio),t.setSize(window.innerWidth,window.innerHeight),d.updateProjectionMatrix()}function x(){requestAnimationFrame(x),A()}function A(){t.render(s,d)}
