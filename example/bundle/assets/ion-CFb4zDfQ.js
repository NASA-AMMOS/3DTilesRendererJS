import{d as g,k as d}from"./three.module-CvwULque.js";import{c as x,j as e,r as f,C as k,T as b,d as s,E as P}from"./extends-DA1lou62.js";import{D as C}from"./DRACOLoader-_-dX8e_o.js";import{u as v,T as j}from"./leva.esm-DzU7uSz4.js";import{C as y}from"./CesiumIonAuthPlugin-C-sj__GU.js";import{G as E}from"./GLTFExtensionsPlugin-D2kmT0dy.js";import{O as T}from"./Ellipsoid-LZ-ZKZQp.js";import{U as L}from"./UpdateOnChangePlugin-CElRVQKd.js";import{E as M}from"./Environment-D94G94f6.js";import{G as I,a as w}from"./GizmoViewport-Csmucsmh.js";import"./EnvironmentControls-1r8kezR_.js";import"./GlobeControls-C2UdnvQA.js";import"./TilesRenderer-BAHxqsCz.js";import"./I3DMLoader-MN4j8OdF.js";import"./readMagicBytes-Da5ueiou.js";import"./LoaderBase-CVSPpjX2.js";import"./GLTFLoader-nx88wwE7.js";import"./B3DMLoader-CD9oTgMD.js";import"./PNTSLoader-C7nCRwvo.js";import"./CMPTLoader-CyKyYgz6.js";import"./GLTFExtensionLoader-XUNwtda-.js";import"./EllipsoidRegion-DxePPRoU.js";import"./GoogleCloudAuthPlugin-BEQkopts.js";const l=new g,p=new d;class z{constructor(t){t={up:"+z",recenter:!0,lat:null,lon:null,height:0,...t},this.tiles=null,this.up=t.up.toLowerCase().replace(/\s+/,""),this.lat=t.lat,this.lon=t.lon,this.height=t.height,this.recenter=t.recenter,this._callback=null}init(t){this.tiles=t,this._callback=()=>{const{up:i,lat:a,lon:r,height:n,recenter:u}=this;if(a!==null&&r!==null)this.transformLatLonHeightToOrigin(a,r,n);else{const{ellipsoid:m}=t,h=Math.min(...m.radius);if(t.getBoundingSphere(l),l.center.length()>h*.5){const o={};m.getPositionToCartographic(l.center,o),this.transformLatLonHeightToOrigin(o.lat,o.lon,o.height)}else{const o=t.group;switch(o.rotation.set(0,0,0),i){case"x":case"+x":o.rotation.z=Math.PI/2;break;case"-x":o.rotation.z=-Math.PI/2;break;case"y":case"+y":break;case"-y":o.rotation.z=Math.PI;break;case"z":case"+z":o.rotation.x=-Math.PI/2;break;case"-z":o.rotation.x=Math.PI/2;break}t.group.position.copy(l.center).applyEuler(o.rotation).multiplyScalar(-1)}}u||t.group.position.setScalar(0),t.removeEventListener("load-tile-set",this._callback)},t.addEventListener("load-tile-set",this._callback)}transformLatLonHeightToOrigin(t,i,a=0){const{group:r,ellipsoid:n}=this.tiles;n.getRotationMatrixFromAzElRoll(t,i,0,0,0,r.matrix,T),n.getCartographicToPosition(t,i,a,p),r.matrix.setPosition(p).invert().decompose(r.position,r.quaternion,r.scale),r.updateMatrixWorld()}dispose(){const{group:t}=this.tiles;t.position.setScalar(0),t.quaternion.identity(),t.scale.set(1,1,1),this.tiles.addEventListener("load-tile-set",this._callback)}}const R=new C().setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");function S(){const c={apiToken:{value:localStorage.getItem("ion-token")||"put-your-api-key-here",onChange:a=>localStorage.setItem("ion-token",a),transient:!1},assetId:{value:"40866",options:{"Aerometrex - San Francisco":"1415196","Aerometrex - Denver":"354307","New York City 3D Buildings":"75343","Melbourne Photogrammetry":"69380","Cesium HQ":"40866","Melbourne Point Cloud":"43978","Montreal Point Cloud":"28945"}}},{apiToken:t,assetId:i}=v(c);return e.jsxs(k,{frameloop:"demand",camera:{position:[300,300,300],near:1,far:1e5},style:{width:"100%",height:"100%",position:"absolute",margin:0,left:0,top:0},children:[e.jsxs(b,{children:[e.jsx(s,{plugin:y,args:{apiToken:t,assetId:i}}),e.jsx(s,{plugin:E,dracoLoader:R}),e.jsx(s,{plugin:z}),e.jsx(s,{plugin:L}),e.jsx(j,{})]},i+t),e.jsx(P,{enableDamping:!0,maxDistance:5e3}),e.jsx(M,{preset:"sunset",background:!0,backgroundBlurriness:.9,environmentIntensity:1}),e.jsx(I,{alignment:"bottom-right",children:e.jsx(w,{})})]})}x(document.getElementById("root")).render(e.jsx(f.StrictMode,{children:e.jsx(S,{})}));