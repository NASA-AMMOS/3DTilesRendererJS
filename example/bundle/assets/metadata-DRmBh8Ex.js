import{k as Ce,aj as Me,ai as Fe,j as Q,V as E,O as Ne,g as Le,af as Oe,ak as ie,W as we,al as oe,b as Ve,am as je,an as Be,ao as Ge,ap as Ie,aq as He,F as $e,R as ze,S as Ye,a as Xe,D as ke,A as qe,G as We,d as Ke,ar as Ze}from"./three.module-D__zfobH.js";import{G as Qe}from"./GLTFLoader-tpP7d8rB.js";import{G as Je}from"./lil-gui.module.min-BZfzOr10.js";import{E as et}from"./EnvironmentControls-ChTcrc7D.js";import{C as tt}from"./CesiumIonTilesRenderer-D6H-JYs8.js";import"./TilesRenderer-CXFY6_I3.js";import"./B3DMLoader-GhqTx3rt.js";import"./readMagicBytes-BpU7wwna.js";import"./LoaderBase-DXn50-K6.js";import"./PNTSLoader-C5XJGP_j.js";import"./I3DMLoader-DV8gfO_k.js";import"./CMPTLoader-BfbE6aHN.js";import"./GLTFExtensionLoader-DgjxHc9V.js";class J{constructor(e,t,s,n){J.prototype.isMatrix2=!0,this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,s,n)}set(e,t,s,n){const i=this.elements;return i[0]=e,i[1]=s,i[2]=t,i[3]=n,this}}function y(r,e,t){return r&&e in r?r[e]:t}function Re(r){return r!=="BOOLEAN"&&r!=="STRING"&&r!=="ENUM"}function st(r){return/^FLOAT/.test(r)}function L(r){return/^VEC/.test(r)}function O(r){return/^MATRIX/.test(r)}function nt(r){const e=/([A-Z]+)([0-9]+)/.exec(r),t=e[1]==="UINT",s=parseInt(e[2]);return t?(1<<s)-1:(1<<s-1)-1}function Ue(r,e,t,s=null){if(O(t)){const n=s.elements;for(let i=0,o=n.length;i<o;i++)n[i]=r[i+e];return s}else return L(t)?(s.x=r[e+0],s.y=r[e+1],"z"in s&&(s.z=r[e+2]),"w"in s&&(s.w=r[e+3]),s):r[e]}function q(r){switch(r){case"SCALAR":return 0;case"VEC2":return new E;case"VEC3":return new Q;case"VEC4":return new Fe;case"MAT2":return new J;case"MAT3":return new Me;case"MAT4":return new Ce;case"BOOLEAN":return!1;case"STRING":return"";case"ENUM":return 0}}function ae(r,e){if(e==null)return!1;switch(r){case"SCALAR":return e instanceof Number;case"VEC2":return e.isVector2;case"VEC3":return e.isVector3;case"VEC4":return e.isVector4;case"MAT2":return e.isMatrix2;case"MAT3":return e.isMatrix3;case"MAT4":return e.isMatrix4;case"BOOLEAN":return e instanceof Boolean;case"STRING":return e instanceof String;case"ENUM":return e instanceof Number||e instanceof String}}function N(r,e){switch(r){case"INT8":return Int8Array;case"INT16":return Int16Array;case"INT32":return Int32Array;case"INT64":return BigInt64Array;case"UINT8":return Uint8Array;case"UINT16":return Uint16Array;case"UINT32":return Uint32Array;case"UINT64":return BigUint64Array;case"FLOAT32":return Float32Array;case"FLOAT64":return Float64Array}switch(e){case"BOOLEAN":return Uint8Array;case"STRING":return Uint8Array}}function rt(r,e=null){if(r.array){e=e&&Array.isArray(e)?e:[],e.length=r.count;for(let s=0,n=e.length;s<n;s++)e[s]=B(r,e[s])}else e=B(r,e);return e}function B(r,e=null){const t=r.default,s=r.type;if(t===null)return null;if(e=e||q(s),O(s)){const n=e.elements;for(let i=0,o=n.length;i<o;i++)n[i]=t[i]}else if(L(s))e.fromArray(t);else return t}function it(r,e){if(r.noData===null)return e;const t=r.noData,s=r.type;if(Array.isArray(e))for(let o=0,a=e.length;o<a;o++)e[o]=n(e[o]);else e=n(e);return e;function n(o){return i(o)&&(o=B(r,o)),o}function i(o){if(O(s)){const a=o.elements;for(let u=0,f=t.length;u<f;u++)if(t[u]!==a[u])return!1;return!0}else if(L(s)){for(let a=0,u=t.length;a<u;a++)if(t[a]!==o.getComponent(a))return!1;return!0}else return t===o}}function ot(r,e){const{type:t,componentType:s,scale:n,offset:i,normalized:o}=r;if(Array.isArray(e))for(let l=0,c=e.length;l<c;l++)e[l]=a(e[l]);else e=a(e);return e;function a(l){return l===null?null:(O(t)?l=f(l):L(t)?l=u(l):l=h(l),l)}function u(l){return l.x=h(l.x),l.y=h(l.y),"z"in l&&(l.z=h(l.z)),"w"in l&&(l.w=h(l.w)),l}function f(l){const c=l.elements;for(let d=0,p=c.length;d<p;d++)c[d]=h(c[d]);return l}function h(l){return o&&(l=l/nt(s)),(o||st(s))&&(l=l*n+i),l}}function ee(r,e,t=null){if(r.array){Array.isArray(e)||(e=new Array(r.count||0)),e.length=t!==null?t:r.count;for(let s=0,n=e.length;s<n;s++)ae(r.type,e[s])||(e[s]=q(r.type))}else ae(r.type,e)||(e=q(r.type));return e}function te(r,e){for(const t in e)t in r||delete e[t];for(const t in r){const s=r[t];e[t]=ee(s,e[t])}}class se{constructor(e,t,s=null){this.type=t.type,this.componentType=t.componentType||null,this.enumType=t.enumType||null,this.array=t.array||!1,this.count=t.count||0,this.normalized=t.normalized||!1,this.offset=t.offset||0,this.scale=y(t,"scale",1),this.max=y(t,"max",1/0),this.min=y(t,"min",-1/0),this.required=t.required||!1,this.noData=y(t,"noData",null),this.default=y(t,"default",null),this.semantic=y(t,"semantic",null),this.enumSet=null,this.accessorProperty=s,s&&(this.offset=y(s,"offset",this.offset),this.scale=y(s,"scale",this.scale),this.max=y(s,"max",this.max),this.min=y(s,"min",this.min)),t.type==="ENUM"&&(this.enumSet=e[this.enumType],this.componentType===null&&(this.componentType=y(this.enumSet,"valueType","UINT16")))}shapeToProperty(e,t=null){return ee(this,e,t)}resolveDefaultElement(e){return B(this,e)}resolveDefault(e){return rt(this,e)}resolveNoData(e){return it(this,e)}resolveEnumsToStrings(e){const t=this.enumSet;if(this.type==="ENUM")if(Array.isArray(e))for(let n=0,i=e.length;n<i;n++)e[n]=s(e[n]);else e=s(e);return e;function s(n){const i=t.values.find(o=>o.value===n);return i===null?null:i.name}}adjustValueScaleOffset(e){return Re(this.type)?ot(this,e):e}}class ne{constructor(e,t={},s={},n=null){this.definition=e,this.class=t[e.class],this.className=e.class,this.enums=s,this.data=n,this.name="name"in e?e.name:null,this.properties=null}getPropertyNames(){return Object.keys(this.class.properties)}includesData(e){return!!this.definition.properties[e]}dispose(){}_initProperties(e=se){const t={};for(const s in this.class.properties)t[s]=new e(this.enums,this.class.properties[s],this.definition.properties[s]);this.properties=t}}class at extends ne{constructor(...e){super(...e),this.isPropertyAttributeAccessor=!0,this._initProperties()}getData(e,t,s={}){const n=this.properties;te(n,s);for(const i in n)s[i]=this.getPropertyValue(i,e,t,s[i]);return s}getPropertyValue(e,t,s,n=null){if(t>=this.count)throw new Error("PropertyAttributeAccessor: Requested index is outside the range of the table.");const i=this.properties[e],o=i.type;if(i){if(!this.definition.properties[e])return i.resolveDefault(n)}else throw new Error("PropertyAttributeAccessor: Requested property does not exist.");n=i.shapeToProperty(n);const a=s.getAttribute(i.attribute.toLowerCase());if(O(o)){const u=n.elements;for(let f=0,h=u.length;f<h;f<h)u[f]=a.getComponent(t,f)}else if(L(o))n.fromBufferAttribute(a,t);else if(o==="SCALAR"||o==="ENUM")n=a.getX(t);else throw new Error("StructuredMetadata.PropertyAttributeAccessor: BOOLEAN and STRING types are not supported by property attributes.");return n=i.adjustValueScaleOffset(n),n=i.resolveNoData(n),n=i.resolveEnumsToStrings(n),n}}class ut extends se{constructor(e,t,s=null){super(e,t,s),this.valueLength=parseInt(this.type.replace(/[^0-9]/g,""))||1,this.values=s.values,this.arrayOffsets=y(s,"arrayOffsets",null),this.stringOffsets=y(s,"stringOffsets",null),this.arrayOffsetType=y(s,"arrayOffsetType","UINT32"),this.stringOffsetType=y(s,"stringOffsetType","UINT32")}getArrayLengthFromId(e,t){let s=this.count;if(this.arrayOffsets!==null){const{arrayOffsets:n,arrayOffsetType:i,type:o}=this,a=new(N(i,o))(e[n]);s=a[t+1]-a[t]}return s}getIndexOffsetFromId(e,t){let s=t;if(this.arrayOffsets){const{arrayOffsets:n,arrayOffsetType:i,type:o}=this;s=new(N(i,o))(e[n])[s]}else this.array&&(s*=this.count);return s}}class lt extends ne{constructor(...e){super(...e),this.isPropertyTableAccessor=!0,this.count=this.definition.count,this._initProperties(ut)}getData(e,t={}){const s=this.properties;te(s,t);for(const n in s)t[n]=this.getPropertyValue(n,e,t[n]);return t}_readValueAtIndex(e,t,s,n=null){const i=this.properties[e],{componentType:o,type:a}=i,u=this.data,f=u[i.values],h=new(N(o,a))(f);let l=i.getIndexOffsetFromId(u,t);if(Re(a)||a==="ENUM"){const c=i.valueLength;n=Ue(h,c*(s+l),a,n)}else if(a==="STRING"){l+=s;let c=0;if(i.stringOffsets!==null){const{stringOffsets:p,stringOffsetType:m}=i,T=new(N(m,a))(u[p]);c=T[l+1]-T[l],l=T[l]}const d=new Uint8Array(h.buffer,l,c);n=new TextDecoder().decode(d)}else if(a==="BOOLEAN"){const c=l+s,d=Math.floor(c/8),p=c%8;n=!!(h[d]&1<<p)}return n}getPropertyValue(e,t,s=null){if(t>=this.count)throw new Error("PropertyTableAccessor: Requested index is outside the range of the table.");const n=this.properties[e];if(n){if(!this.definition.properties[e])return n.resolveDefault(s)}else throw new Error("PropertyTableAccessor: Requested property does not exist.");const i=n.array,o=this.data,a=n.getArrayLengthFromId(o,t);if(s=n.shapeToProperty(s,a),i)for(let u=0,f=s.length;u<f;u++)s[u]=this._readValueAtIndex(e,t,u,s[u]);else s=this._readValueAtIndex(e,t,0,s);return s=n.adjustValueScaleOffset(s),s=n.resolveNoData(s),s=n.resolveEnumsToStrings(s),s}}const ct=new Ne(-1,1,1,-1,0,1);class ft extends Oe{constructor(){super(),this.setAttribute("position",new ie([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ie([0,2,0,0,2,0],2))}}const ht=new ft;class dt{constructor(e){this._mesh=new Le(ht,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,ct)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}const ue=parseInt(Ie)>=165,mt=parseInt(Ie)>=166,P=new He,le=new Fe,Y=new E,I=new class{constructor(){this._renderer=new we,this._target=new oe(1,1),this._texTarget=new oe,this._quad=new dt(new Ve({blending:je,blendDst:Be,blendSrc:Ge,uniforms:{map:{value:null},pixel:{value:new E}},vertexShader:`
				void main() {

					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}
			`,fragmentShader:`
				uniform sampler2D map;
				uniform ivec2 pixel;

				void main() {

					gl_FragColor = texelFetch( map, pixel, 0 );

				}
			`}))}increaseSizeTo(r){this._target.setSize(Math.max(this._target.width,r),1)}readDataAsync(r){const{_renderer:e,_target:t}=this;return ue?e.readRenderTargetPixelsAsync(t,0,0,r.length/4,1,r):Promise.resolve().then(()=>this.readData(r))}readData(r){const{_renderer:e,_target:t}=this;e.readRenderTargetPixels(t,0,0,r.length/4,1,r)}renderPixelToTarget(r,e,t){const{_quad:s,_renderer:n,_target:i,_texTarget:o}=this;if(mt)P.min.copy(e),P.max.copy(e),P.max.x+=1,P.max.y+=1,n.initRenderTarget(i),n.copyTextureToTexture(r,i.texture,P,t,0);else{const a=n.autoClear,u=n.getRenderTarget(),f=n.getScissorTest();n.getScissor(le),o.setSize(r.image.width,r.image.height),n.setRenderTarget(o),Y.set(0,0),ue?n.copyTextureToTexture(r,o.texture,null,Y):n.copyTextureToTexture(Y,r,o.texture),s.material.uniforms.map.value=o.texture,s.material.uniforms.pixel.value.copy(e),n.setRenderTarget(i),n.setScissorTest(!0),n.setScissor(t.x,t.y,1,1),n.autoClear=!1,s.render(n),n.setScissorTest(f),n.setScissor(le),n.setRenderTarget(u),n.autoClear=a,o.dispose()}}};function pt(r,e){return e===0?r.getAttribute("uv"):r.getAttribute(`uv${e}`)}function be(r,e,t=new Array(3)){let s=3*e,n=3*e+1,i=3*e+2;return r.index&&(s=r.index.getX(s),n=r.index.getX(n),i=r.index.getX(i)),t[0]=s,t[1]=n,t[2]=i,t}const ce=new E,fe=new E,he=new E;function Se(r,e,t,s,n){const[i,o,a]=s,u=pt(r,e);ce.fromBufferAttribute(u,i),fe.fromBufferAttribute(u,o),he.fromBufferAttribute(u,a),n.set(0,0,0).addScaledVector(ce,t.x).addScaledVector(fe,t.y).addScaledVector(he,t.z)}function De(r,e,t,s){const n=r.x-Math.floor(r.x),i=r.y-Math.floor(r.y),o=Math.floor(n*e%e),a=Math.floor(i*t%t);return s.set(o,a),s}const de=new E,me=new E,pe=new E;class Tt extends se{constructor(e,t,s=null){super(e,t,s),this.channels=y(s,"channels",[0]),this.index=y(s,"index",null),this.texCoord=y(s,"texCoord",null),this.valueLength=parseInt(this.type.replace(/[^0-9]/g,""))||1}readDataFromBuffer(e,t,s=null){const n=this.type;if(n==="BOOLEAN"||n==="STRING")throw new Error("PropertyTextureAccessor: BOOLEAN and STRING types not supported.");return Ue(e,t*this.valueLength,n,s)}}class yt extends ne{constructor(...e){super(...e),this.isPropertyTextureAccessor=!0,this._asyncRead=!1,this._initProperties(Tt)}getData(e,t,s,n={}){const i=this.properties;te(i,n);const o=Object.keys(i),a=o.map(u=>n[u]);return this.getPropertyValuesAtTexel(o,e,t,s,a),o.forEach((u,f)=>n[u]=a[f]),n}getPropertyValuesAtTexelAsync(...e){this._asyncRead=!0;const t=this.getFeatures(...e);return this._asyncRead=!1,t}getPropertyValuesAtTexel(e,t,s,n,i=[]){for(;i.length<e.length;)i.push(null);i.length=e.length,I.increaseSizeTo(i.length);const o=this.data,a=this.definition.properties,u=this.properties,f=be(n,t);for(let c=0,d=e.length;c<d;c++){const p=e[c];if(!a[p])continue;const m=u[p],T=o[m.index];Se(n,m.texCoord,s,f,de),De(de,T.image.width,T.image.height,me),pe.set(c,0),I.renderPixelToTarget(T,me,pe)}const h=new Uint8Array(e.length*4);if(this._asyncRead)return I.readDataAsync(h).then(()=>(l.call(this),i));return I.readData(h),l.call(this),i;function l(){for(let c=0,d=e.length;c<d;c++){const p=e[c],m=u[p],T=m.type;if(i[c]=ee(m,i[c]),m){if(!a[p]){i[c]=m.resolveDefault(i);continue}}else throw new Error("PropertyTextureAccessor: Requested property does not exist.");const b=m.valueLength*(m.count||1),H=m.channels.map(S=>h[4*c+S]),V=m.componentType,$=N(V,T),z=new $(b);if(new Uint8Array(z.buffer).set(H),m.array){const S=i[c];for(let D=0,ve=S.length;D<ve;D++)S[D]=m.readDataFromBuffer(z,D,S[D])}else i[c]=m.readDataFromBuffer(z,0,i[c]);i[c]=m.adjustValueScaleOffset(i[c]),i[c]=m.resolveNoData(i[c]),i[c]=m.resolveEnumsToStrings(i[c])}}}dispose(){this.data.forEach(e=>{e&&(e.dispose(),e.image instanceof ImageBitmap&&e.image.close())})}}class Te{constructor(e,t,s,n=null,i=null){const{schema:o,propertyTables:a=[],propertyTextures:u=[],propertyAttributes:f=[]}=e,{enums:h,classes:l}=o,c=a.map(m=>new lt(m,l,h,s));let d=[],p=[];n&&(n.propertyTextures&&(d=n.propertyTextures.map(m=>new yt(u[m],l,h,t))),n.propertyAttributes&&(p=n.propertyAttributes.map(m=>new at(f[m],l,h)))),this.schema=o,this.tableAccessors=c,this.textureAccessors=d,this.attributeAccessors=p,this.object=i,this.textures=t,this.nodeMetadata=n}getPropertyTableData(e,t,s=[]){const n=Math.min(e.length,t.length);s.length=n;for(let i=0;i<n;i++){const o=this.tableAccessors[e[i]];s[i]=o.getData(t[i],s[i])}return s}getPropertyTableInfo(e=null){return e===null?this.tableAccessors.map(t=>({name:t.name,className:t.definition.class})):e.map(t=>{const s=this.tableAccessors[t];return{name:s.name,className:s.definition.class}})}getPropertyTextureData(e,t,s=[]){const n=this.textureAccessors;s.length=n.length;for(let i=0;i<n.length;i++){const o=n[i];s[i]=o.getData(e,t,this.object.geometry,s[i])}return s}async getPropertyTextureDataAsync(e,t,s=[]){const n=this.textureAccessors;s.length=n.length;const i=[];for(let o=0;o<n.length;o++){const u=n[o].getDataAsync(e,t,this.object.geometry,s[o]).then(f=>{s[o]=f});i.push(u)}return await Promise.all(i),s}getPropertyTextureInfo(){return this.textureAccessors}getPropertyAttributeData(e,t=[]){const s=this.attributeAccessors;t.length=s.length;for(let n=0;n<s.length;n++){const i=s[n];t[n]=i.getData(e,this.object.geometry,t[n])}return t}getPropertyAttributeInfo(){return this.attributeAccessors.map(e=>({name:e.name,className:e.definition.class}))}dispose(){[...this.textureAccessors,...this.tableAccessors,...this.attributeAccessors].forEach(e=>{e.dispose()})}}const j="EXT_structural_metadata";function xt(r,e=[]){var n;const t=((n=r.json.textures)==null?void 0:n.length)||0,s=new Array(t).fill(null);return e.forEach(({properties:i})=>{for(const o in i){const{index:a}=i[o];s[a]===null&&(s[a]=r.loadTexture(a))}}),Promise.all(s)}function At(r,e=[]){var n;const t=((n=r.json.bufferViews)==null?void 0:n.length)||0,s=new Array(t).fill(null);return e.forEach(({properties:i})=>{for(const o in i){const{values:a,arrayOffsets:u,stringOffsets:f}=i[o];s[a]===null&&(s[a]=r.loadBufferView(a)),s[u]===null&&(s[u]=r.loadBufferView(u)),s[f]===null&&(s[f]=r.loadBufferView(f))}}),Promise.all(s)}class Et{constructor(e){this.parser=e,this.name=j}async afterRoot({scene:e,parser:t}){const s=t.json.extensions;let n=s&&s[j];if(!n)return;let i=null;if(n.schemaUri){const{manager:f,path:h,requestHeader:l,crossOrigin:c}=t.options,d=new URL(n.schemaUri,h).toString(),p=new $e(f);p.setCrossOrigin(c),p.setResponseType("json"),p.setRequestHeader(l),i=p.loadAsync(d).then(m=>{n={...n,schema:m}})}const[o,a]=await Promise.all([xt(t,n.propertyTextures),At(t,n.propertyTables),i]),u=new Te(n,o,a);e.userData.structuralMetadata=u,e.traverse(f=>{if(t.associations.has(f)){const{meshes:h,primitives:l}=t.associations.get(f),c=t.json.meshes[h].primitives[l];if(c&&c.extensions&&c.extensions[j]){const d=c.extensions[j];f.userData.structuralMetadata=new Te(n,o,a,d,f)}else f.userData.structuralMetadata=u}})}}const ye=new E,xe=new E,Ae=new E;function gt(r){return r.x>r.y&&r.x>r.z?0:r.y>r.z?1:2}class _t{constructor(e,t,s){this.geometry=e,this.textures=t,this.data=s,this._asyncRead=!1,this.featureIds=s.featureIds.map(n=>{const{texture:i,...o}=n,a={label:null,propertyTable:null,nullFeatureId:null,...o};return i&&(a.texture={texCoord:0,channels:[0],...i}),a})}getTextures(){return this.textures}getFeatureInfo(){return this.featureIds}getFeaturesAsync(...e){this._asyncRead=!0;const t=this.getFeatures(...e);return this._asyncRead=!1,t}getFeatures(e,t){const{geometry:s,textures:n,featureIds:i}=this,o=new Array(i.length).fill(null),a=i.length;I.increaseSizeTo(a);const u=be(s,e),f=u[gt(t)];for(let c=0,d=i.length;c<d;c++){const p=i[c],m="nullFeatureId"in p?p.nullFeatureId:null;if("texture"in p){const T=n[p.texture.index];Se(s,p.texture.texCoord,t,u,ye),De(ye,T.image.width,T.image.height,xe),Ae.set(c,0),I.renderPixelToTarget(n[p.texture.index],xe,Ae)}else if("attribute"in p){const b=s.getAttribute(`_feature_id_${p.attribute}`).getX(f);b!==m&&(o[c]=b)}else{const T=f;T!==m&&(o[c]=T)}}const h=new Uint8Array(a*4);if(this._asyncRead)return I.readDataAsync(h).then(()=>(l(),o));return I.readData(h),l(),o;function l(){const c=new Uint32Array(1);for(let d=0,p=i.length;d<p;d++){const m=i[d],T="nullFeatureId"in m?m.nullFeatureId:null;if("texture"in m){const{channels:b}=m.texture,H=b.map($=>h[4*d+$]);new Uint8Array(c.buffer).set(H);const V=c[0];V!==T&&(o[d]=V)}}}}dispose(){this.textures.forEach(e=>{e&&(e.dispose(),e.image instanceof ImageBitmap&&e.image.close())})}}const W="EXT_mesh_features";function Ee(r,e,t){r.traverse(s=>{if(e.associations.has(s)){const{meshes:n,primitives:i}=e.associations.get(s),o=e.json.meshes[n].primitives[i];o&&o.extensions&&o.extensions[W]&&t(s,o.extensions[W])}})}class Ft{constructor(e){this.parser=e,this.name=W}async afterRoot({scene:e,parser:t}){var o;const s=((o=t.json.textures)==null?void 0:o.length)||0,n=new Array(s).fill(null);Ee(e,t,(a,{featureIds:u})=>{u.forEach(f=>{if(f.texture&&n[f.texture.index]===null){const h=f.texture.index;n[h]=t.loadTexture(h)}})});const i=await Promise.all(n);Ee(e,t,(a,u)=>{a.userData.meshFeatures=new _t(a.geometry,i,u)})}}const wt=r=>class extends r{get featureTexture(){return this.uniforms.featureTexture.value}set featureTexture(e){const t=this.uniforms.featureTexture.value;t!==e&&t&&t.dispose(),this.uniforms.featureTexture.value=e}get nullFeatureId(){return this.uniforms.nullFeatureId.value}set nullFeatureId(e){e<0||e===null||e===void 0?(this.uniforms.nullFeatureId.value=null,this.setDefine("USE_NULL_FEATURE",0)):(this.uniforms.nullFeatureId.value=e,this.setDefine("USE_NULL_FEATURE",1))}get highlightFeatureId(){return this.uniforms.highlightFeatureId.value}set highlightFeatureId(e){e==null?(this.uniforms.highlightFeatureId.value=null,this.setDefine("USE_HIGHLIGHT_FEATURE",0)):(this.uniforms.highlightFeatureId.value=e,this.setDefine("USE_HIGHLIGHT_FEATURE",1))}constructor(...e){super(...e),this.isMeshFeaturesMaterial=!0,this.uniforms={featureChannelsLength:{value:0},featureChannels:{value:new Array(4).fill(0)},featureTexture:{value:null},nullFeatureId:{value:null},highlightFeatureId:{value:-1}},Object.assign(this.defines,{FEATURE_TYPE:0,USE_HIGHLIGHT_FEATURE:0,USE_NULL_FEATURE:0,FEATURE_ATTR:"",FEATURE_TEXTURE_ATTR:"uv"}),this.addEventListener("dispose",()=>{this.featureTexture&&this.featureTexture.dispose()})}copy(e){const t=this.defines;if(super.copy(e),e.defines&&Object.assign(this.defines,t,e.defines),e.uniforms)for(const s in this.uniforms){const n=e.uniforms[s].value;Array.isArray(n)?this.uniforms[s].value=n.slice():this.uniforms[s].value=n}this.needsUpdate=!0}setDefine(e,t){const s=this.defines;s[e]!==t&&(this.needsUpdate=!0),t===null?delete s[e]:s[e]=t}setFromMeshFeatures(e,t){let s=null;typeof t=="number"?s=e.getFeatureInfo()[t]||null:typeof t=="string"&&(s=e.getFeatureInfo().find(n=>n.label===t)||null),s===null?(this.setDefine("FEATURE_TYPE",0),this.featureTexture=null):"attribute"in s?this._setAttributeFeature(s.attribute):"texture"in s?this._setTextureFeature(e.textures[s.texture.index],s.texture.texCoord,s.texture.channels):this._setAttributeFeature(null),s!==null&&(this.nullFeatureId=s.nullFeatureId||null)}disableFeatureDisplay(){this.setDefine("FEATURE_TYPE",0),this.featureTexture=null}_setTextureFeature(e,t,s){const n=this.uniforms;this.setDefine("FEATURE_TYPE",3),t===0?(this.setDefine("FEATURE_TEXTURE_ATTR","uv"),this.setDefine("USE_UV","")):(this.setDefine("FEATURE_TEXTURE_ATTR",`uv${t}`),this.setDefine(`USE_UV${t}`,"")),t!==0&&this.setDefine("USE_UV",null),t!==1&&this.setDefine("USE_UV1",null),t!==2&&this.setDefine("USE_UV2",null),t!==3&&this.setDefine("USE_UV3",null),n.featureChannelsLength.value=s.length,n.featureChannels.value=[...s],this.featureTexture=e}_setAttributeFeature(e=null){e===null?this.setDefine("FEATURE_TYPE",1):(this.setDefine("FEATURE_TYPE",2),this.setDefine("FEATURE_ATTR",`_feature_id_${e}`)),this.featureTexture=null}customProgramCacheKey(){const e=this.defines;return`${e.FEATURE_TYPE}|${e.USE_HIGHLIGHT_FEATURE}|${e.USE_NULL_FEATURE}|${e.FEATURE_ATTR}|${e.FEATURE_TEXTURE_ATTR}`}onBeforeCompile(e){e.uniforms={...e.uniforms,...this.uniforms},e.defines=this.defines,e.vertexShader=e.vertexShader.replace(/^/,t=>`
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

				`)}};let _,w,U,g,X,A,C,R,M,v,K=!1,F=null,k=!1;const Z=new E(-1,-1),G=new ze;G.firstHitOnly=!0;G.params.Points.threshold=.05;const It=localStorage.getItem("ionApiKey")??"put-your-api-key-here",x={accessToken:It,assetId:2333904,reload:()=>{re()},featureIndex:0,propertyTexture:0,highlightAllFeatures:!1};Rt();Pe();function Rt(){R=document.getElementById("meshFeatures"),M=document.getElementById("structuralMetadata"),g=new we({antialias:!0}),g.setPixelRatio(window.devicePixelRatio),g.setSize(window.innerWidth,window.innerHeight),g.setClearColor(1383455),document.body.appendChild(g.domElement),U=new Ye,_=new Xe(60,window.innerWidth/window.innerHeight,.1,5e3),_.position.set(-4,2,0).multiplyScalar(30),_.lookAt(0,0,0),w=new et(U,_,g.domElement),w.minDistance=.1,w.cameraRadius=.1,w.minAltitude=0,w.maxAltitude=Math.PI,w.adjustHeight=!1,w.addEventListener("start",()=>K=!0),w.addEventListener("end",()=>K=!1),X=new ke(16777215,3.3),X.position.set(1,2,3).multiplyScalar(40),U.add(X),U.add(new qe(16777215,1)),C=new We,C.position.y=40,U.add(C),re(),ge(),window.addEventListener("resize",ge,!1),window.addEventListener("pointermove",r=>{Z.x=r.clientX/window.innerWidth*2-1,Z.y=-(r.clientY/window.innerHeight)*2+1})}function Ut(){v&&v.destroy(),v=new Je;const r=v.addFolder("ion");r.add(x,"accessToken"),r.add(x,"assetId",[2333904,2342602]).onChange(re),r.add(x,"reload");const e=v.addFolder("features");x.assetId===2333904?(e.add(x,"featureIndex",[0,1]),e.add(x,"highlightAllFeatures")):e.add(x,"propertyTexture",{NONE:0,HORIZ_UNCERTAINTY:1,VERT_UNCERTAINTY:2})}function re(){A&&(A.dispose(),A.group.removeFromParent()),localStorage.setItem("ionApiKey",x.accessToken),A=new tt(x.assetId,x.accessToken),A.setCamera(_),C.add(A.group);const r=new Qe(A.manager);r.register(()=>new Ft),r.register(()=>new Et),A.manager.addHandler(/(gltf|glb)$/g,r),A.addEventListener("load-model",({scene:e})=>{e.traverse(t=>{if(t.material&&t.userData.meshFeatures){const s=wt(t.material.constructor),n=new s;n.copy(t.material),n.metalness=0,t.material=n}t.material&&t.userData.structuralMetadata&&(t.material.originalMap=t.material.map)})}),Ut()}function ge(){_.aspect=window.innerWidth/window.innerHeight,g.setPixelRatio(window.devicePixelRatio),g.setSize(window.innerWidth,window.innerHeight),_.updateProjectionMatrix()}function _e(r,e,t,s=null,n=null,i=null){if(M.innerText=`STRUCTURAL_METADATA
`,n!==null){const a=r.getPropertyTableData(n,i);o(a,r.getPropertyTableInfo(n))}s!==null&&o(r.getPropertyAttributeData(s),r.getPropertyAttributeInfo()),o(r.getPropertyTextureData(e,t),r.getPropertyTextureInfo());function o(a,u){const f=Math.max(...Object.values(a).flatMap(h=>Object.keys(h)).map(h=>h.length));for(const h in a){M.innerText+=`
${u[h].name||u[h].className}
`;const l=a[h];for(const c in l){let d=l[c];d&&d.toArray&&(d=d.toArray()),d&&d.join&&(d=`
`+d.map(p=>p.toFixed?parseFloat(p.toFixed(6)):p).map((p,m)=>`    [${m}] ${p}`).join(`
`)),typeof d=="number"&&(d=parseFloat(d.toFixed(6))),M.innerText+=`  ${c.padEnd(f+1)} : ${d}
`}}}}function bt(){if(k||K)return;G.setFromCamera(Z,_);const r=G.intersectObject(U)[0];if(r){const{object:e,face:t,point:s,index:n,faceIndex:i}=r,o=new Ze,a=new Q;t?(o.setFromAttributeAndIndices(e.geometry.attributes.position,t.a,t.b,t.c),o.a.applyMatrix4(e.matrixWorld),o.b.applyMatrix4(e.matrixWorld),o.c.applyMatrix4(e.matrixWorld),o.getBarycoord(s,a)):(o.setFromAttributeAndIndices(e.geometry.attributes.position,n,n,n),o.a.applyMatrix4(e.matrixWorld),o.b.applyMatrix4(e.matrixWorld),o.c.applyMatrix4(e.matrixWorld),a.set(0,0,0));const{meshFeatures:u}=r.object.userData;u?(k=!0,u.getFeaturesAsync(i,a).then(f=>{k=!1,F={index:n,features:f,faceIndex:i,barycoord:a,object:e}})):F={index:n,features:null,faceIndex:i,barycoord:a,object:e}}else F=null}function St(){const{featureIndex:r}=x;let e=null,t=null,s=null;if(F&&(e=F.object.userData.meshFeatures,t=F.object.userData.structuralMetadata,s=F.features),e!==null&&s!==null){const{index:n,faceIndex:i,barycoord:o}=F;if(R.innerText=`EXT_MESH_FEATURES

`,R.innerText+=`feature        : ${s.map(a=>a+"").join(", ")}
`,R.innerText+=`texture memory : ${g.info.memory.textures}
`,t!==null){const u=e.getFeatureInfo().map(f=>f.propertyTable);_e(t,i,o,n,u,s)}}else if(R.innerText=`EXT_MESH_FEATURES

`,R.innerText+=`feature        : -
`,R.innerText+=`texture memory : ${g.info.memory.textures}`,t!==null){const{index:n,faceIndex:i,barycoord:o}=F;_e(t,i,o,n)}else M.innerText="";A.forEachLoadedModel(n=>n.traverse(i=>{const o=i.material,{meshFeatures:a,structuralMetadata:u}=i.userData;if(o&&a&&(x.highlightAllFeatures?(o.setFromMeshFeatures(a,r),o.highlightFeatureId=null):F===null?o.disableFeatureDisplay():(o.setFromMeshFeatures(a,r),o.highlightFeatureId=s[r]||-1)),o&&u&&u.textureAccessors.length>0){let f=null;if(x.propertyTexture===0)f=o.originalMap;else if(x.propertyTexture===1){const l=u.getPropertyTextureInfo()[0].properties.r3dm_uncertainty_ce90sum;f=u.textures[l.index],f.channel=l.texCoord}else if(x.propertyTexture===2){const l=u.getPropertyTextureInfo()[1].properties.r3dm_uncertainty_le90sum;f=u.textures[l.index],f.channel=l.texCoord}o.map!==f&&(o.map=f,o.needsUpdate=!0)}}))}function Pe(){requestAnimationFrame(Pe),w.update(),_.updateMatrixWorld(),St(),bt();const r=new Ke,e=new Q(0,1,0);A.getBoundingSphere(r),A.group.position.copy(r.center).multiplyScalar(-1),C.quaternion.setFromUnitVectors(r.center.normalize(),e),A.setResolutionFromRenderer(_,g),A.update(),g.render(U,_)}
