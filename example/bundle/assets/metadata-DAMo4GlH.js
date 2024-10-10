import{p as Ne,ap as Me,ak as we,k as ee,V as E,O as ve,g as Oe,ae as Le,aq as ie,W as Fe,ar as oe,b as Ve,as as je,at as Be,au as Ge,av as Ie,aw as He,F as $e,S as ze,a as Ye,D as ke,A as Xe,G as qe,R as We,ax as Ke,d as Qe}from"./three.module-C94OeYjd.js";import{G as Ze}from"./GLTFLoader-C77rxX9H.js";import{g as Je}from"./lil-gui.module.min-NsHmRZWc.js";import{E as et}from"./EnvironmentControls-CTZuopjd.js";import{T as tt}from"./TilesRenderer-DQOLA18N.js";import{C as st}from"./CesiumIonAuthPlugin-CBH0S8UR.js";import"./B3DMLoader-B0T2UZ_1.js";import"./readMagicBytes-Da5ueiou.js";import"./LoaderBase-CVSPpjX2.js";import"./PNTSLoader-BUgecSBY.js";import"./I3DMLoader-C4TPl3Dp.js";import"./CMPTLoader-CXF13c0w.js";import"./GLTFExtensionLoader-Qt9Ghhze.js";import"./GoogleCloudAuthPlugin-CXITux-L.js";class te{constructor(e,t,s,r){te.prototype.isMatrix2=!0,this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,s,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let s=0;s<4;s++)this.elements[s]=e[s+t];return this}set(e,t,s,r){const i=this.elements;return i[0]=e,i[1]=s,i[2]=t,i[3]=r,this}}function T(n,e,t){return n&&e in n?n[e]:t}function Re(n){return n!=="BOOLEAN"&&n!=="STRING"&&n!=="ENUM"}function rt(n){return/^FLOAT/.test(n)}function j(n){return/^VEC/.test(n)}function B(n){return/^MATRIX/.test(n)}function Ue(n,e,t,s=null){return B(t)||j(t)?s.fromArray(n,e):n[e]}function Q(n){const{type:e,componentType:t}=n;switch(e){case"SCALAR":return t==="INT64"?0n:0;case"VEC2":return new E;case"VEC3":return new ee;case"VEC4":return new we;case"MAT2":return new te;case"MAT3":return new Me;case"MAT4":return new Ne;case"BOOLEAN":return!1;case"STRING":return"";case"ENUM":return 0}}function ae(n,e){if(e==null)return!1;switch(n){case"SCALAR":return typeof e=="number"||typeof e=="bigint";case"VEC2":return e.isVector2;case"VEC3":return e.isVector3;case"VEC4":return e.isVector4;case"MAT2":return e.isMatrix2;case"MAT3":return e.isMatrix3;case"MAT4":return e.isMatrix4;case"BOOLEAN":return typeof e=="boolean";case"STRING":return typeof e=="string";case"ENUM":return typeof e=="number"||typeof e=="bigint"}throw new Error("ClassProperty: invalid type.")}function V(n,e=null){switch(n){case"INT8":return Int8Array;case"INT16":return Int16Array;case"INT32":return Int32Array;case"INT64":return BigInt64Array;case"UINT8":return Uint8Array;case"UINT16":return Uint16Array;case"UINT32":return Uint32Array;case"UINT64":return BigUint64Array;case"FLOAT32":return Float32Array;case"FLOAT64":return Float64Array}switch(e){case"BOOLEAN":return Uint8Array;case"STRING":return Uint8Array}throw new Error("ClassProperty: invalid type.")}function nt(n,e=null){if(n.array){e=e&&Array.isArray(e)?e:[],e.length=n.count;for(let s=0,r=e.length;s<r;s++)e[s]=G(n,e[s])}else e=G(n,e);return e}function G(n,e=null){const t=n.default,s=n.type;if(e=e||Q(n),t===null){switch(s){case"SCALAR":return 0;case"VEC2":return e.set(0,0);case"VEC3":return e.set(0,0,0);case"VEC4":return e.set(0,0,0,0);case"MAT2":return e.identity();case"MAT3":return e.identity();case"MAT4":return e.identity();case"BOOLEAN":return!1;case"STRING":return"";case"ENUM":return""}throw new Error("ClassProperty: invalid type.")}else if(B(s))e.fromArray(t);else if(j(s))e.fromArray(t);else return t}function it(n,e){if(n.noData===null)return e;const t=n.noData,s=n.type;if(Array.isArray(e))for(let o=0,a=e.length;o<a;o++)e[o]=r(e[o]);else e=r(e);return e;function r(o){return i(o)&&(o=G(n,o)),o}function i(o){if(B(s)){const a=o.elements;for(let u=0,c=t.length;u<c;u++)if(t[u]!==a[u])return!1;return!0}else if(j(s)){for(let a=0,u=t.length;a<u;a++)if(t[a]!==o.getComponent(a))return!1;return!0}else return t===o}}function ot(n,e){switch(n){case"INT8":return Math.max(e/127,-1);case"INT16":return Math.max(e,32767,-1);case"INT32":return Math.max(e/2147483647,-1);case"INT64":return Math.max(Number(e)/9223372036854776e3,-1);case"UINT8":return e/255;case"UINT16":return e/65535;case"UINT32":return e/4294967295;case"UINT64":return Number(e)/18446744073709552e3}}function at(n,e){const{type:t,componentType:s,scale:r,offset:i,normalized:o}=n;if(Array.isArray(e))for(let l=0,f=e.length;l<f;l++)e[l]=a(e[l]);else e=a(e);return e;function a(l){return B(t)?l=c(l):j(t)?l=u(l):l=d(l),l}function u(l){return l.x=d(l.x),l.y=d(l.y),"z"in l&&(l.z=d(l.z)),"w"in l&&(l.w=d(l.w)),l}function c(l){const f=l.elements;for(let h=0,p=f.length;h<p;h++)f[h]=d(f[h]);return l}function d(l){return o&&(l=ot(s,l)),(o||rt(s))&&(l=l*r+i),l}}function se(n,e,t=null){if(n.array){Array.isArray(e)||(e=new Array(n.count||0)),e.length=t!==null?t:n.count;for(let s=0,r=e.length;s<r;s++)ae(n.type,e[s])||(e[s]=Q(n))}else ae(n.type,e)||(e=Q(n));return e}function H(n,e){for(const t in e)t in n||delete e[t];for(const t in n){const s=n[t];e[t]=se(s,e[t])}}function ut(n){switch(n){case"ENUM":return 1;case"SCALAR":return 1;case"VEC2":return 2;case"VEC3":return 3;case"VEC4":return 4;case"MAT2":return 4;case"MAT3":return 9;case"MAT4":return 16;case"BOOLEAN":return-1;case"STRING":return-1;default:return-1}}class Y{constructor(e,t,s=null){this.name=t.name||null,this.description=t.description||null,this.type=t.type,this.componentType=t.componentType||null,this.enumType=t.enumType||null,this.array=t.array||!1,this.count=t.count||0,this.normalized=t.normalized||!1,this.offset=t.offset||0,this.scale=T(t,"scale",1),this.max=T(t,"max",1/0),this.min=T(t,"min",-1/0),this.required=t.required||!1,this.noData=T(t,"noData",null),this.default=T(t,"default",null),this.semantic=T(t,"semantic",null),this.enumSet=null,this.accessorProperty=s,s&&(this.offset=T(s,"offset",this.offset),this.scale=T(s,"scale",this.scale),this.max=T(s,"max",this.max),this.min=T(s,"min",this.min)),t.type==="ENUM"&&(this.enumSet=e[this.enumType],this.componentType===null&&(this.componentType=T(this.enumSet,"valueType","UINT16")))}shapeToProperty(e,t=null){return se(this,e,t)}resolveDefaultElement(e){return G(this,e)}resolveDefault(e){return nt(this,e)}resolveNoData(e){return it(this,e)}resolveEnumsToStrings(e){const t=this.enumSet;if(this.type==="ENUM")if(Array.isArray(e))for(let r=0,i=e.length;r<i;r++)e[r]=s(e[r]);else e=s(e);return e;function s(r){const i=t.values.find(o=>o.value===r);return i===null?"":i.name}}adjustValueScaleOffset(e){return Re(this.type)?at(this,e):e}}class re{constructor(e,t={},s={},r=null){this.definition=e,this.class=t[e.class],this.className=e.class,this.enums=s,this.data=r,this.name="name"in e?e.name:null,this.properties=null}getPropertyNames(){return Object.keys(this.class.properties)}includesData(e){return!!this.definition.properties[e]}dispose(){}_initProperties(e=Y){const t={};for(const s in this.class.properties)t[s]=new e(this.enums,this.class.properties[s],this.definition.properties[s]);this.properties=t}}class lt extends Y{constructor(e,t,s=null){super(e,t,s),this.attribute=s.attribute}}class ct extends re{constructor(...e){super(...e),this.isPropertyAttributeAccessor=!0,this._initProperties(lt)}getData(e,t,s={}){const r=this.properties;H(r,s);for(const i in r)s[i]=this.getPropertyValue(i,e,t,s[i]);return s}getPropertyValue(e,t,s,r=null){if(t>=this.count)throw new Error("PropertyAttributeAccessor: Requested index is outside the range of the buffer.");const i=this.properties[e],o=i.type;if(i){if(!this.definition.properties[e])return i.resolveDefault(r)}else throw new Error("PropertyAttributeAccessor: Requested class property does not exist.");r=i.shapeToProperty(r);const a=s.getAttribute(i.attribute.toLowerCase());if(B(o)){const u=r.elements;for(let c=0,d=u.length;c<d;c<d)u[c]=a.getComponent(t,c)}else if(j(o))r.fromBufferAttribute(a,t);else if(o==="SCALAR"||o==="ENUM")r=a.getX(t);else throw new Error("StructuredMetadata.PropertyAttributeAccessor: BOOLEAN and STRING types are not supported by property attributes.");return r=i.adjustValueScaleOffset(r),r=i.resolveEnumsToStrings(r),r=i.resolveNoData(r),r}}class ft extends Y{constructor(e,t,s=null){super(e,t,s),this.values=s.values,this.valueLength=ut(this.type),this.arrayOffsets=T(s,"arrayOffsets",null),this.stringOffsets=T(s,"stringOffsets",null),this.arrayOffsetType=T(s,"arrayOffsetType","UINT32"),this.stringOffsetType=T(s,"stringOffsetType","UINT32")}getArrayLengthFromId(e,t){let s=this.count;if(this.arrayOffsets!==null){const{arrayOffsets:r,arrayOffsetType:i}=this,o=V(i),a=new o(e[r]);s=a[t+1]-a[t]}return s}getIndexOffsetFromId(e,t){let s=t;if(this.arrayOffsets){const{arrayOffsets:r,arrayOffsetType:i}=this,o=V(i);s=new o(e[r])[s]}else this.array&&(s*=this.count);return s}}class ht extends re{constructor(...e){super(...e),this.isPropertyTableAccessor=!0,this.count=this.definition.count,this._initProperties(ft)}getData(e,t={}){const s=this.properties;H(s,t);for(const r in s)t[r]=this.getPropertyValue(r,e,t[r]);return t}_readValueAtIndex(e,t,s,r=null){const i=this.properties[e],{componentType:o,type:a}=i,u=this.data,c=u[i.values],d=V(o,a),l=new d(c),f=i.getIndexOffsetFromId(u,t);if(Re(a)||a==="ENUM")return Ue(l,(f+s)*i.valueLength,a,r);if(a==="STRING"){let h=f+s,p=0;if(i.stringOffsets!==null){const{stringOffsets:y,stringOffsetType:I}=i,C=V(I),R=new C(u[y]);p=R[h+1]-R[h],h=R[h]}const m=new Uint8Array(l.buffer,h,p);r=new TextDecoder().decode(m)}else if(a==="BOOLEAN"){const h=f+s,p=Math.floor(h/8),m=h%8;r=(l[p]>>m&1)===1}return r}getPropertyValue(e,t,s=null){if(t>=this.count)throw new Error("PropertyTableAccessor: Requested index is outside the range of the table.");const r=this.properties[e];if(r){if(!this.definition.properties[e])return r.resolveDefault(s)}else throw new Error("PropertyTableAccessor: Requested property does not exist.");const i=r.array,o=this.data,a=r.getArrayLengthFromId(o,t);if(s=r.shapeToProperty(s,a),i)for(let u=0,c=s.length;u<c;u++)s[u]=this._readValueAtIndex(e,t,u,s[u]);else s=this._readValueAtIndex(e,t,0,s);return s=r.adjustValueScaleOffset(s),s=r.resolveEnumsToStrings(s),s=r.resolveNoData(s),s}}const dt=new ve(-1,1,1,-1,0,1);class mt extends Le{constructor(){super(),this.setAttribute("position",new ie([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ie([0,2,0,0,2,0],2))}}const pt=new mt;class Tt{constructor(e){this._mesh=new Oe(pt,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,dt)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}const ue=parseInt(Ie)>=165,yt=parseInt(Ie)>=166,N=new He,le=new we,q=new E,U=new class{constructor(){this._renderer=new Fe,this._target=new oe(1,1),this._texTarget=new oe,this._quad=new Tt(new Ve({blending:je,blendDst:Be,blendSrc:Ge,uniforms:{map:{value:null},pixel:{value:new E}},vertexShader:`
				void main() {

					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}
			`,fragmentShader:`
				uniform sampler2D map;
				uniform ivec2 pixel;

				void main() {

					gl_FragColor = texelFetch( map, pixel, 0 );

				}
			`}))}increaseSizeTo(n){this._target.setSize(Math.max(this._target.width,n),1)}readDataAsync(n){const{_renderer:e,_target:t}=this;return ue?e.readRenderTargetPixelsAsync(t,0,0,n.length/4,1,n):Promise.resolve().then(()=>this.readData(n))}readData(n){const{_renderer:e,_target:t}=this;e.readRenderTargetPixels(t,0,0,n.length/4,1,n)}renderPixelToTarget(n,e,t){const{_quad:s,_renderer:r,_target:i,_texTarget:o}=this;if(yt)N.min.copy(e),N.max.copy(e),N.max.x+=1,N.max.y+=1,r.initRenderTarget(i),r.copyTextureToTexture(n,i.texture,N,t,0);else{const a=r.autoClear,u=r.getRenderTarget(),c=r.getScissorTest();r.getScissor(le),o.setSize(n.image.width,n.image.height),r.setRenderTarget(o),q.set(0,0),ue?r.copyTextureToTexture(n,o.texture,null,q):r.copyTextureToTexture(q,n,o.texture),s.material.uniforms.map.value=o.texture,s.material.uniforms.pixel.value.copy(e),r.setRenderTarget(i),r.setScissorTest(!0),r.setScissor(t.x,t.y,1,1),r.autoClear=!1,s.render(r),r.setScissorTest(c),r.setScissor(le),r.setRenderTarget(u),r.autoClear=a,o.dispose()}}},ce=new E,fe=new E,he=new E;function xt(n,e){return e===0?n.getAttribute("uv"):n.getAttribute(`uv${e}`)}function be(n,e,t=new Array(3)){let s=3*e,r=3*e+1,i=3*e+2;return n.index&&(s=n.index.getX(s),r=n.index.getX(r),i=n.index.getX(i)),t[0]=s,t[1]=r,t[2]=i,t}function Se(n,e,t,s,r){const[i,o,a]=s,u=xt(n,e);ce.fromBufferAttribute(u,i),fe.fromBufferAttribute(u,o),he.fromBufferAttribute(u,a),r.set(0,0,0).addScaledVector(ce,t.x).addScaledVector(fe,t.y).addScaledVector(he,t.z)}function Ce(n,e,t,s){const r=n.x-Math.floor(n.x),i=n.y-Math.floor(n.y),o=Math.floor(r*e%e),a=Math.floor(i*t%t);return s.set(o,a),s}const de=new E,me=new E,pe=new E;class At extends Y{constructor(e,t,s=null){super(e,t,s),this.channels=T(s,"channels",[0]),this.index=T(s,"index",null),this.texCoord=T(s,"texCoord",null),this.valueLength=parseInt(this.type.replace(/[^0-9]/g,""))||1}readDataFromBuffer(e,t,s=null){const r=this.type;if(r==="BOOLEAN"||r==="STRING")throw new Error("PropertyTextureAccessor: BOOLEAN and STRING types not supported.");return Ue(e,t*this.valueLength,r,s)}}class Et extends re{constructor(...e){super(...e),this.isPropertyTextureAccessor=!0,this._asyncRead=!1,this._initProperties(At)}getData(e,t,s,r={}){const i=this.properties;H(i,r);const o=Object.keys(i),a=o.map(u=>r[u]);return this.getPropertyValuesAtTexel(o,e,t,s,a),o.forEach((u,c)=>r[u]=a[c]),r}async getDataAsync(e,t,s,r={}){const i=this.properties;H(i,r);const o=Object.keys(i),a=o.map(u=>r[u]);return await this.getPropertyValuesAtTexelAsync(o,e,t,s,a),o.forEach((u,c)=>r[u]=a[c]),r}getPropertyValuesAtTexelAsync(...e){this._asyncRead=!0;const t=this.getPropertyValuesAtTexel(...e);return this._asyncRead=!1,t}getPropertyValuesAtTexel(e,t,s,r,i=[]){for(;i.length<e.length;)i.push(null);i.length=e.length,U.increaseSizeTo(i.length);const o=this.data,a=this.definition.properties,u=this.properties,c=be(r,t);for(let f=0,h=e.length;f<h;f++){const p=e[f];if(!a[p])continue;const m=u[p],y=o[m.index];Se(r,m.texCoord,s,c,de),Ce(de,y.image.width,y.image.height,me),pe.set(f,0),U.renderPixelToTarget(y,me,pe)}const d=new Uint8Array(e.length*4);if(this._asyncRead)return U.readDataAsync(d).then(()=>(l.call(this),i));return U.readData(d),l.call(this),i;function l(){for(let f=0,h=e.length;f<h;f++){const p=e[f],m=u[p],y=m.type;if(i[f]=se(m,i[f]),m){if(!a[p]){i[f]=m.resolveDefault(i);continue}}else throw new Error("PropertyTextureAccessor: Requested property does not exist.");const I=m.valueLength*(m.count||1),C=m.channels.map(P=>d[4*f+P]),R=m.componentType,k=V(R,y),X=new k(I);if(new Uint8Array(X.buffer).set(C),m.array){const P=i[f];for(let D=0,De=P.length;D<De;D++)P[D]=m.readDataFromBuffer(X,D,P[D])}else i[f]=m.readDataFromBuffer(X,0,i[f]);i[f]=m.adjustValueScaleOffset(i[f]),i[f]=m.resolveEnumsToStrings(i[f]),i[f]=m.resolveNoData(i[f])}}}dispose(){this.data.forEach(e=>{e&&(e.dispose(),e.image instanceof ImageBitmap&&e.image.close())})}}class Te{constructor(e,t,s,r=null,i=null){const{schema:o,propertyTables:a=[],propertyTextures:u=[],propertyAttributes:c=[]}=e,{enums:d,classes:l}=o,f=a.map(m=>new ht(m,l,d,s));let h=[],p=[];r&&(r.propertyTextures&&(h=r.propertyTextures.map(m=>new Et(u[m],l,d,t))),r.propertyAttributes&&(p=r.propertyAttributes.map(m=>new ct(c[m],l,d)))),this.schema=o,this.tableAccessors=f,this.textureAccessors=h,this.attributeAccessors=p,this.object=i,this.textures=t,this.nodeMetadata=r}getPropertyTableData(e,t,s=null){if(!Array.isArray(e)||!Array.isArray(t))s=s||{},s=this.tableAccessors[e].getData(t,s);else{s=s||[];const r=Math.min(e.length,t.length);s.length=r;for(let i=0;i<r;i++){const o=this.tableAccessors[e[i]];s[i]=o.getData(t[i],s[i])}}return s}getPropertyTableInfo(e=null){if(e===null&&(e=this.tableAccessors.map((t,s)=>s)),Array.isArray(e))return e.map(t=>{const s=this.tableAccessors[t];return{name:s.name,className:s.definition.class}});{const t=this.tableAccessors[e];return{name:t.name,className:t.definition.class}}}getPropertyTextureData(e,t,s=[]){const r=this.textureAccessors;s.length=r.length;for(let i=0;i<r.length;i++){const o=r[i];s[i]=o.getData(e,t,this.object.geometry,s[i])}return s}async getPropertyTextureDataAsync(e,t,s=[]){const r=this.textureAccessors;s.length=r.length;const i=[];for(let o=0;o<r.length;o++){const u=r[o].getDataAsync(e,t,this.object.geometry,s[o]).then(c=>{s[o]=c});i.push(u)}return await Promise.all(i),s}getPropertyTextureInfo(){return this.textureAccessors}getPropertyAttributeData(e,t=[]){const s=this.attributeAccessors;t.length=s.length;for(let r=0;r<s.length;r++){const i=s[r];t[r]=i.getData(e,this.object.geometry,t[r])}return t}getPropertyAttributeInfo(){return this.attributeAccessors.map(e=>({name:e.name,className:e.definition.class}))}dispose(){this.textureAccessors.forEach(e=>e.dispose()),this.tableAccessors.forEach(e=>e.dispose()),this.attributeAccessors.forEach(e=>e.dispose())}}const M="EXT_structural_metadata";function _t(n,e=[]){var r;const t=((r=n.json.textures)==null?void 0:r.length)||0,s=new Array(t).fill(null);return e.forEach(({properties:i})=>{for(const o in i){const{index:a}=i[o];s[a]===null&&(s[a]=n.loadTexture(a))}}),Promise.all(s)}function gt(n,e=[]){var r;const t=((r=n.json.bufferViews)==null?void 0:r.length)||0,s=new Array(t).fill(null);return e.forEach(({properties:i})=>{for(const o in i){const{values:a,arrayOffsets:u,stringOffsets:c}=i[o];s[a]===null&&(s[a]=n.loadBufferView(a)),s[u]===null&&(s[u]=n.loadBufferView(u)),s[c]===null&&(s[c]=n.loadBufferView(c))}}),Promise.all(s)}class wt{constructor(e){this.parser=e,this.name=M}async afterRoot({scene:e,parser:t}){const s=t.json.extensionsUsed;if(!s||!s.includes(M))return;let r=null,i=t.json.extensions[M];if(i.schemaUri){const{manager:c,path:d,requestHeader:l,crossOrigin:f}=t.options,h=new URL(i.schemaUri,d).toString(),p=new $e(c);p.setCrossOrigin(f),p.setResponseType("json"),p.setRequestHeader(l),r=p.loadAsync(h).then(m=>{i={...i,schema:m}})}const[o,a]=await Promise.all([_t(t,i.propertyTextures),gt(t,i.propertyTables),r]),u=new Te(i,o,a);e.userData.structuralMetadata=u,e.traverse(c=>{if(t.associations.has(c)){const{meshes:d,primitives:l}=t.associations.get(c),f=t.json.meshes[d].primitives[l];if(f&&f.extensions&&f.extensions[M]){const h=f.extensions[M];c.userData.structuralMetadata=new Te(i,o,a,h,c)}else c.userData.structuralMetadata=u}})}}const ye=new E,xe=new E,Ae=new E;function Ft(n){return n.x>n.y&&n.x>n.z?0:n.y>n.z?1:2}class It{constructor(e,t,s){this.geometry=e,this.textures=t,this.data=s,this._asyncRead=!1,this.featureIds=s.featureIds.map(r=>{const{texture:i,...o}=r,a={label:null,propertyTable:null,nullFeatureId:null,...o};return i&&(a.texture={texCoord:0,channels:[0],...i}),a})}getTextures(){return this.textures}getFeatureInfo(){return this.featureIds}getFeaturesAsync(...e){this._asyncRead=!0;const t=this.getFeatures(...e);return this._asyncRead=!1,t}getFeatures(e,t){const{geometry:s,textures:r,featureIds:i}=this,o=new Array(i.length).fill(null),a=i.length;U.increaseSizeTo(a);const u=be(s,e),c=u[Ft(t)];for(let f=0,h=i.length;f<h;f++){const p=i[f],m="nullFeatureId"in p?p.nullFeatureId:null;if("texture"in p){const y=r[p.texture.index];Se(s,p.texture.texCoord,t,u,ye),Ce(ye,y.image.width,y.image.height,xe),Ae.set(f,0),U.renderPixelToTarget(r[p.texture.index],xe,Ae)}else if("attribute"in p){const I=s.getAttribute(`_feature_id_${p.attribute}`).getX(c);I!==m&&(o[f]=I)}else{const y=c;y!==m&&(o[f]=y)}}const d=new Uint8Array(a*4);if(this._asyncRead)return U.readDataAsync(d).then(()=>(l(),o));return U.readData(d),l(),o;function l(){const f=new Uint32Array(1);for(let h=0,p=i.length;h<p;h++){const m=i[h],y="nullFeatureId"in m?m.nullFeatureId:null;if("texture"in m){const{channels:I}=m.texture,C=I.map(k=>d[4*h+k]);new Uint8Array(f.buffer).set(C);const R=f[0];R!==y&&(o[h]=R)}}}}dispose(){this.textures.forEach(e=>{e&&(e.dispose(),e.image instanceof ImageBitmap&&e.image.close())})}}const $="EXT_mesh_features";function Ee(n,e,t){n.traverse(s=>{if(e.associations.has(s)){const{meshes:r,primitives:i}=e.associations.get(s),o=e.json.meshes[r].primitives[i];o&&o.extensions&&o.extensions[$]&&t(s,o.extensions[$])}})}class Rt{constructor(e){this.parser=e,this.name=$}async afterRoot({scene:e,parser:t}){var a;const s=t.json.extensionsUsed;if(!s||!s.includes($))return;const r=((a=t.json.textures)==null?void 0:a.length)||0,i=new Array(r).fill(null);Ee(e,t,(u,{featureIds:c})=>{c.forEach(d=>{if(d.texture&&i[d.texture.index]===null){const l=d.texture.index;i[l]=t.loadTexture(l)}})});const o=await Promise.all(i);Ee(e,t,(u,c)=>{u.userData.meshFeatures=new It(u.geometry,o,c)})}}const Ut=n=>class extends n{get featureTexture(){return this.uniforms.featureTexture.value}set featureTexture(e){const t=this.uniforms.featureTexture.value;t!==e&&t&&t.dispose(),this.uniforms.featureTexture.value=e}get nullFeatureId(){return this.uniforms.nullFeatureId.value}set nullFeatureId(e){e<0||e===null||e===void 0?(this.uniforms.nullFeatureId.value=null,this.setDefine("USE_NULL_FEATURE",0)):(this.uniforms.nullFeatureId.value=e,this.setDefine("USE_NULL_FEATURE",1))}get highlightFeatureId(){return this.uniforms.highlightFeatureId.value}set highlightFeatureId(e){e==null?(this.uniforms.highlightFeatureId.value=null,this.setDefine("USE_HIGHLIGHT_FEATURE",0)):(this.uniforms.highlightFeatureId.value=e,this.setDefine("USE_HIGHLIGHT_FEATURE",1))}constructor(...e){super(...e),this.isMeshFeaturesMaterial=!0,this.uniforms={featureChannelsLength:{value:0},featureChannels:{value:new Array(4).fill(0)},featureTexture:{value:null},nullFeatureId:{value:null},highlightFeatureId:{value:-1}},Object.assign(this.defines,{FEATURE_TYPE:0,USE_HIGHLIGHT_FEATURE:0,USE_NULL_FEATURE:0,FEATURE_ATTR:"",FEATURE_TEXTURE_ATTR:"uv"}),this.addEventListener("dispose",()=>{this.featureTexture&&this.featureTexture.dispose()})}copy(e){const t=this.defines;if(super.copy(e),e.defines&&Object.assign(this.defines,t,e.defines),e.uniforms)for(const s in this.uniforms){const r=e.uniforms[s].value;Array.isArray(r)?this.uniforms[s].value=r.slice():this.uniforms[s].value=r}this.needsUpdate=!0}setDefine(e,t){const s=this.defines;s[e]!==t&&(this.needsUpdate=!0),t===null?delete s[e]:s[e]=t}setFromMeshFeatures(e,t){let s=null;typeof t=="number"?s=e.getFeatureInfo()[t]||null:typeof t=="string"&&(s=e.getFeatureInfo().find(r=>r.label===t)||null),s===null?(this.setDefine("FEATURE_TYPE",0),this.featureTexture=null):"attribute"in s?this._setAttributeFeature(s.attribute):"texture"in s?this._setTextureFeature(e.textures[s.texture.index],s.texture.texCoord,s.texture.channels):this._setAttributeFeature(null),s!==null&&(this.nullFeatureId=s.nullFeatureId==null?null:s.nullFeatureId)}disableFeatureDisplay(){this.setDefine("FEATURE_TYPE",0),this.featureTexture=null}_setTextureFeature(e,t,s){const r=this.uniforms;this.setDefine("FEATURE_TYPE",3),t===0?(this.setDefine("FEATURE_TEXTURE_ATTR","uv"),this.setDefine("USE_UV","")):(this.setDefine("FEATURE_TEXTURE_ATTR",`uv${t}`),this.setDefine(`USE_UV${t}`,"")),t!==0&&this.setDefine("USE_UV",null),t!==1&&this.setDefine("USE_UV1",null),t!==2&&this.setDefine("USE_UV2",null),t!==3&&this.setDefine("USE_UV3",null),r.featureChannelsLength.value=s.length,r.featureChannels.value=[...s],this.featureTexture=e}_setAttributeFeature(e=null){e===null?this.setDefine("FEATURE_TYPE",1):(this.setDefine("FEATURE_TYPE",2),this.setDefine("FEATURE_ATTR",`_feature_id_${e}`)),this.featureTexture=null}customProgramCacheKey(){const e=this.defines;return`${e.FEATURE_TYPE}|${e.USE_HIGHLIGHT_FEATURE}|${e.USE_NULL_FEATURE}|${e.FEATURE_ATTR}|${e.FEATURE_TEXTURE_ATTR}`}onBeforeCompile(e){e.uniforms={...e.uniforms,...this.uniforms},e.defines=this.defines,e.vertexShader=e.vertexShader.replace(/^/,t=>`
					// texture
					#if FEATURE_TYPE == 3

						varying vec2 _feature_uv;

					// attribute
					#elif FEATURE_TYPE == 2

						attribute float FEATURE_ATTR;
						flat varying uint _feature_attr;

					// implicit
					#elif FEATURE_TYPE == 1

						flat varying uint _feature_attr;

					#endif

					${t}
				`).replace(/void main\(\) {/,t=>`
					${t}

					// texture
					#if FEATURE_TYPE == 3

						_feature_uv = FEATURE_TEXTURE_ATTR;

					// attribute
					#elif FEATURE_TYPE == 2

						_feature_attr = uint( FEATURE_ATTR );

					// none
					#elif FEATURE_TYPE == 1

						_feature_attr = uint( gl_VertexID );

					#endif
				`),e.fragmentShader=e.fragmentShader.replace(/^/,t=>`

					#if USE_HIGHLIGHT_FEATURE

						uniform uint highlightFeatureId;

					#endif

					#if USE_NULL_FEATURE

						uniform uint nullFeatureId;

					#endif

					// texture
					#if FEATURE_TYPE == 3

						uniform sampler2D featureTexture;
						uniform int featureChannelsLength;
						uniform uint featureChannels[ 4 ];
						varying vec2 _feature_uv;

					// attribute
					#elif FEATURE_TYPE == 2

						flat varying uint _feature_attr;

					// none
					#elif FEATURE_TYPE == 1

						flat varying uint _feature_attr;

					#endif

					// https://www.shadertoy.com/view/XljGzV
					vec3 hsl2rgb( in vec3 c ) {

						vec3 rgb = clamp( abs( mod( c.x * 6.0 + vec3( 0.0, 4.0, 2.0 ), 6.0 ) - 3.0 ) - 1.0, 0.0, 1.0 );
    					return c.z + c.y * ( rgb - 0.5 ) * ( 1.0 - abs( 2.0 * c.z - 1.0 ) );

					}

					// https://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
					float rand( float v ) {

						return fract( sin( dot( vec2( v, v ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );

					}

					vec3 randFeatureColor( uint feature ) {

						vec3 hsl;
						hsl.r = rand( float( feature ) / 5500.0 );
						hsl.g = 0.75;
						hsl.b = 0.5;
						return hsl2rgb( hsl );

					}

					${t}
				`).replace(/#include <color_fragment>/,t=>`
					${t}

					// disabled
					#if FEATURE_TYPE != 0

						uint featureId = 0u;

						// texture
						#if FEATURE_TYPE == 3

							// TODO: support anti aliasing here at the pixel edges
							uvec4 fields = uvec4( texture( featureTexture, _feature_uv ) * float( 0xff ) );
							for ( int i = 0; i < min( featureChannelsLength, 4 ); i ++ ) {

								uint offset = 8u * featureChannels[ i ];
								featureId = featureId | ( fields[ i ] << offset );

							}

						// attribute
						#elif FEATURE_TYPE == 2

							featureId = _feature_attr;

						// implicit
						#elif FEATURE_TYPE == 1

							featureId = _feature_attr;

						#endif

						#if USE_HIGHLIGHT_FEATURE

							if ( highlightFeatureId != featureId ) {

								diffuseColor.rgb *= 0.25;

							}

						#else

							vec3 featureColor = randFeatureColor( featureId );
							diffuseColor.rgb = mix( diffuseColor.rgb * featureColor, featureColor, 0.05 );

						#endif

						#if USE_NULL_FEATURE

							if ( nullFeatureId == featureId ) {

								diffuseColor.rgb *= vec3( 0.0 );

							}

						#endif

					#endif

				`)}};let g,F,S,_,W,x,O,b,L,v,Z=!1,w=null,K=!1;const J=new E(-1,-1),z=new We;z.firstHitOnly=!0;z.params.Points.threshold=.05;const bt=localStorage.getItem("ionApiKey")??"put-your-api-key-here",A={accessToken:bt,assetId:2333904,reload:()=>{ne()},featureIndex:0,propertyTexture:0,highlightAllFeatures:!1};St();Pe();function St(){b=document.getElementById("meshFeatures"),L=document.getElementById("structuralMetadata"),_=new Fe({antialias:!0}),_.setPixelRatio(window.devicePixelRatio),_.setSize(window.innerWidth,window.innerHeight),_.setClearColor(1383455),document.body.appendChild(_.domElement),S=new ze,g=new Ye(60,window.innerWidth/window.innerHeight,.1,5e3),g.position.set(-4,2,0).multiplyScalar(30),g.lookAt(0,0,0),F=new et(S,g,_.domElement),F.minDistance=.1,F.cameraRadius=.1,F.minAltitude=0,F.maxAltitude=Math.PI,F.adjustHeight=!1,F.addEventListener("start",()=>Z=!0),F.addEventListener("end",()=>Z=!1),W=new ke(16777215,3.3),W.position.set(1,2,3).multiplyScalar(40),S.add(W),S.add(new Xe(16777215,1)),O=new qe,O.position.y=40,S.add(O),ne(),_e(),window.addEventListener("resize",_e,!1),window.addEventListener("pointermove",n=>{J.x=n.clientX/window.innerWidth*2-1,J.y=-(n.clientY/window.innerHeight)*2+1})}function Ct(){v&&v.destroy(),v=new Je;const n=v.addFolder("ion");n.add(A,"accessToken"),n.add(A,"assetId",[2333904,2342602]).onChange(ne),n.add(A,"reload");const e=v.addFolder("features");A.assetId===2333904?(e.add(A,"featureIndex",[0,1]),e.add(A,"highlightAllFeatures")):e.add(A,"propertyTexture",{NONE:0,HORIZ_UNCERTAINTY:1,VERT_UNCERTAINTY:2})}function ne(){x&&(x.dispose(),x.group.removeFromParent()),localStorage.setItem("ionApiKey",A.accessToken),x=new tt,x.registerPlugin(new st({apiToken:A.accessToken,assetId:A.assetId})),x.setCamera(g),O.add(x.group);const n=new Ze(x.manager);n.register(()=>new Rt),n.register(()=>new wt),x.manager.addHandler(/(gltf|glb)$/g,n),x.addEventListener("load-model",({scene:e})=>{e.traverse(t=>{if(t.material&&t.userData.meshFeatures){const s=Ut(t.material.constructor),r=new s;r.copy(t.material),r.metalness=0,t.material=r}t.material&&t.userData.structuralMetadata&&(t.material.originalMap=t.material.map)})}),Ct()}function _e(){g.aspect=window.innerWidth/window.innerHeight,_.setPixelRatio(window.devicePixelRatio),_.setSize(window.innerWidth,window.innerHeight),g.updateProjectionMatrix()}function ge(n,e,t,s=null,r=null,i=null){if(L.innerText=`STRUCTURAL_METADATA
`,r!==null){const a=n.getPropertyTableData(r,i);o(a,n.getPropertyTableInfo(r))}s!==null&&o(n.getPropertyAttributeData(s),n.getPropertyAttributeInfo()),o(n.getPropertyTextureData(e,t),n.getPropertyTextureInfo());function o(a,u){const c=Math.max(...Object.values(a).flatMap(d=>Object.keys(d)).map(d=>d.length));for(const d in a){L.innerText+=`
${u[d].name||u[d].className}
`;const l=a[d];for(const f in l){let h=l[f];h&&h.toArray&&(h=h.toArray()),h&&h.join&&(h=`
`+h.map(p=>p.toFixed?parseFloat(p.toFixed(6)):p).map((p,m)=>`    [${m}] ${p}`).join(`
`)),typeof h=="number"&&(h=parseFloat(h.toFixed(6))),L.innerText+=`  ${f.padEnd(c+1)} : ${h}
`}}}}function Pt(){if(K||Z)return;z.setFromCamera(J,g);const n=z.intersectObject(S)[0];if(n){const{object:e,face:t,point:s,index:r,faceIndex:i}=n,o=new ee;if(t){const u=new Ke;u.setFromAttributeAndIndices(e.geometry.attributes.position,t.a,t.b,t.c),u.a.applyMatrix4(e.matrixWorld),u.b.applyMatrix4(e.matrixWorld),u.c.applyMatrix4(e.matrixWorld),u.getBarycoord(s,o)}else o.set(0,0,0);const{meshFeatures:a}=n.object.userData;a?(K=!0,a.getFeaturesAsync(i,o).then(u=>{K=!1,w={index:r,features:u,faceIndex:i,barycoord:o,object:e}})):w={index:r,features:null,faceIndex:i,barycoord:o,object:e}}else w=null}function Dt(){const{featureIndex:n}=A;let e=null,t=null,s=null;if(w&&(e=w.object.userData.meshFeatures,t=w.object.userData.structuralMetadata,s=w.features),e!==null&&s!==null){const{index:r,faceIndex:i,barycoord:o}=w;if(b.innerText=`EXT_MESH_FEATURES

`,b.innerText+=`feature        : ${s.map(a=>a+"").join(", ")}
`,b.innerText+=`texture memory : ${_.info.memory.textures}
`,t!==null){const u=e.getFeatureInfo().map(c=>c.propertyTable);ge(t,i,o,r,u,s)}}else if(b.innerText=`EXT_MESH_FEATURES

`,b.innerText+=`feature        : -
`,b.innerText+=`texture memory : ${_.info.memory.textures}`,t!==null){const{index:r,faceIndex:i,barycoord:o}=w;ge(t,i,o,r)}else L.innerText="";x.forEachLoadedModel(r=>r.traverse(i=>{const o=i.material,{meshFeatures:a,structuralMetadata:u}=i.userData;if(o&&a)if(A.highlightAllFeatures)o.setFromMeshFeatures(a,n),o.highlightFeatureId=null;else if(w===null)o.disableFeatureDisplay();else{const c=s[n];o.setFromMeshFeatures(a,n),o.highlightFeatureId=c===null?-1:c}if(o&&u&&u.textureAccessors.length>0){let c=null;if(A.propertyTexture===0)c=o.originalMap;else if(A.propertyTexture===1){const l=u.getPropertyTextureInfo()[0].properties.r3dm_uncertainty_ce90sum;c=u.textures[l.index],c.channel=l.texCoord}else if(A.propertyTexture===2){const l=u.getPropertyTextureInfo()[1].properties.r3dm_uncertainty_le90sum;c=u.textures[l.index],c.channel=l.texCoord}o.map!==c&&(o.map=c,o.needsUpdate=!0)}}))}function Pe(){requestAnimationFrame(Pe),F.update(),g.updateMatrixWorld(),Dt(),Pt();const n=new Qe,e=new ee(0,1,0);x.getBoundingSphere(n),x.group.position.copy(n.center).multiplyScalar(-1),O.quaternion.setFromUnitVectors(n.center.normalize(),e),x.setResolutionFromRenderer(g,_),x.update(),_.render(S,g)}
