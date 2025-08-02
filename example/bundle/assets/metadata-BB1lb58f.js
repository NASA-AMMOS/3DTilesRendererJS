import{V as Y,R as $,W as G,S as j,a as V,D as N,A as W,G as k,d as X,l as L,ao as z}from"./three.module-CQU0seT4.js";/* empty css               */import{g as O}from"./lil-gui.module.min-Vka56b52.js";import{E as B}from"./EnvironmentControls-CLbQ_1-I.js";import{T as K}from"./TilesRenderer-Dt06WWnf.js";import{C as q}from"./CesiumIonAuthPlugin-DL6JcDIR.js";import{G as Z}from"./GLTFExtensionsPlugin-DKG5_O3O.js";import"./I3DMLoader--guqwtSo.js";import"./readMagicBytes-ReGFEf36.js";import"./GLTFLoader-Bzr6GmPM.js";import"./Ellipsoid-BKsGN9dG.js";import"./B3DMLoader-BZtrZCNg.js";import"./PNTSLoader-gB5YPyhc.js";import"./CMPTLoader-VEto4VOC.js";import"./EllipsoidRegion-BEIhCuST.js";import"./GeometryClipper-DDKqlNfA.js";import"./EPSGTilesPlugin-DJF9gzHX.js";import"./ImageFormatPlugin-gd2xpo9t.js";import"./TMSImageSource-BwMpBOyS.js";import"./TiledImageSource-Dter0Emb.js";const J=i=>class extends i{get featureTexture(){return this.uniforms.featureTexture.value}set featureTexture(e){const t=this.uniforms.featureTexture.value;t!==e&&t&&t.dispose(),this.uniforms.featureTexture.value=e}get nullFeatureId(){return this.uniforms.nullFeatureId.value}set nullFeatureId(e){e<0||e===null||e===void 0?(this.uniforms.nullFeatureId.value=null,this.setDefine("USE_NULL_FEATURE",0)):(this.uniforms.nullFeatureId.value=e,this.setDefine("USE_NULL_FEATURE",1))}get highlightFeatureId(){return this.uniforms.highlightFeatureId.value}set highlightFeatureId(e){e==null?(this.uniforms.highlightFeatureId.value=null,this.setDefine("USE_HIGHLIGHT_FEATURE",0)):(this.uniforms.highlightFeatureId.value=e,this.setDefine("USE_HIGHLIGHT_FEATURE",1))}constructor(...e){super(...e),this.isMeshFeaturesMaterial=!0,this.uniforms={featureChannelsLength:{value:0},featureChannels:{value:new Array(4).fill(0)},featureTexture:{value:null},nullFeatureId:{value:null},highlightFeatureId:{value:-1}},Object.assign(this.defines,{FEATURE_TYPE:0,USE_HIGHLIGHT_FEATURE:0,USE_NULL_FEATURE:0,FEATURE_ATTR:"",FEATURE_TEXTURE_ATTR:"uv"}),this.addEventListener("dispose",()=>{this.featureTexture&&this.featureTexture.dispose()})}copy(e){const t=this.defines;if(super.copy(e),e.defines&&Object.assign(this.defines,t,e.defines),e.uniforms)for(const r in this.uniforms){const a=e.uniforms[r].value;Array.isArray(a)?this.uniforms[r].value=a.slice():this.uniforms[r].value=a}this.needsUpdate=!0}setDefine(e,t){const r=this.defines;r[e]!==t&&(this.needsUpdate=!0),t===null?delete r[e]:r[e]=t}setFromMeshFeatures(e,t){let r=null;typeof t=="number"?r=e.getFeatureInfo()[t]||null:typeof t=="string"&&(r=e.getFeatureInfo().find(a=>a.label===t)||null),r===null?(this.setDefine("FEATURE_TYPE",0),this.featureTexture=null):"attribute"in r?this._setAttributeFeature(r.attribute):"texture"in r?this._setTextureFeature(e.textures[r.texture.index],r.texture.texCoord,r.texture.channels):this._setAttributeFeature(null),r!==null&&(this.nullFeatureId=r.nullFeatureId==null?null:r.nullFeatureId)}disableFeatureDisplay(){this.setDefine("FEATURE_TYPE",0),this.featureTexture=null}_setTextureFeature(e,t,r){const a=this.uniforms;this.setDefine("FEATURE_TYPE",3),t===0?(this.setDefine("FEATURE_TEXTURE_ATTR","uv"),this.setDefine("USE_UV","")):(this.setDefine("FEATURE_TEXTURE_ATTR",`uv${t}`),this.setDefine(`USE_UV${t}`,"")),t!==0&&this.setDefine("USE_UV",null),t!==1&&this.setDefine("USE_UV1",null),t!==2&&this.setDefine("USE_UV2",null),t!==3&&this.setDefine("USE_UV3",null),a.featureChannelsLength.value=r.length,a.featureChannels.value=[...r],this.featureTexture=e}_setAttributeFeature(e=null){e===null?this.setDefine("FEATURE_TYPE",1):(this.setDefine("FEATURE_TYPE",2),this.setDefine("FEATURE_ATTR",`_feature_id_${e}`)),this.featureTexture=null}customProgramCacheKey(){const e=this.defines;return`${e.FEATURE_TYPE}|${e.USE_HIGHLIGHT_FEATURE}|${e.USE_NULL_FEATURE}|${e.FEATURE_ATTR}|${e.FEATURE_TEXTURE_ATTR}`}onBeforeCompile(e){e.uniforms={...e.uniforms,...this.uniforms},e.defines=this.defines,e.vertexShader=e.vertexShader.replace(/^/,t=>`
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

				`)}};let h,p,g,T,I,f,A,_,R,U,w=!1,c=null,v=!1;const b=new Y(-1,-1),y=new $;y.firstHitOnly=!0;y.params.Points.threshold=.05;const Q=localStorage.getItem("ionApiKey")??"put-your-api-key-here",l={accessToken:Q,assetId:2333904,reload:()=>{P()},featureIndex:0,propertyTexture:0,highlightAllFeatures:!1};ee();H();function ee(){_=document.getElementById("meshFeatures"),R=document.getElementById("structuralMetadata"),T=new G({antialias:!0}),T.setPixelRatio(window.devicePixelRatio),T.setSize(window.innerWidth,window.innerHeight),T.setClearColor(1383455),document.body.appendChild(T.domElement),g=new j,h=new V(60,window.innerWidth/window.innerHeight,.1,5e3),h.position.set(-4,2,0).multiplyScalar(30),h.lookAt(0,0,0),p=new B(g,h,T.domElement),p.minDistance=.1,p.cameraRadius=.1,p.minAltitude=0,p.maxAltitude=Math.PI,p.adjustHeight=!1,p.addEventListener("start",()=>w=!0),p.addEventListener("end",()=>w=!1),I=new N(16777215,3.3),I.position.set(1,2,3).multiplyScalar(40),g.add(I),g.add(new W(16777215,1)),A=new k,A.position.y=40,g.add(A),P(),S(),window.addEventListener("resize",S,!1),window.addEventListener("pointermove",i=>{b.x=i.clientX/window.innerWidth*2-1,b.y=-(i.clientY/window.innerHeight)*2+1})}function te(){U&&U.destroy(),U=new O;const i=U.addFolder("ion");i.add(l,"accessToken"),i.add(l,"assetId",[2333904,2342602]).onChange(P),i.add(l,"reload");const e=U.addFolder("features");l.assetId===2333904?(e.add(l,"featureIndex",[0,1]),e.add(l,"highlightAllFeatures")):e.add(l,"propertyTexture",{NONE:0,HORIZ_UNCERTAINTY:1,VERT_UNCERTAINTY:2})}function P(){f&&(f.dispose(),f.group.removeFromParent()),localStorage.setItem("ionApiKey",l.accessToken),f=new K,f.registerPlugin(new q({apiToken:l.accessToken,assetId:l.assetId})),f.registerPlugin(new Z({metadata:!0})),f.setCamera(h),A.add(f.group),f.addEventListener("load-model",({scene:i})=>{i.traverse(e=>{if(e.material&&e.userData.meshFeatures){const t=J(e.material.constructor),r=new t;r.copy(e.material),r.metalness=0,e.material=r}e.material&&e.userData.structuralMetadata&&(e.material.originalMap=e.material.map)})}),te()}function S(){h.aspect=window.innerWidth/window.innerHeight,T.setPixelRatio(window.devicePixelRatio),T.setSize(window.innerWidth,window.innerHeight),h.updateProjectionMatrix()}function C(i,e,t,r=null,a=null,d=null){if(R.innerText=`STRUCTURAL_METADATA
`,a!==null){const u=i.getPropertyTableData(a,d);n(u,i.getPropertyTableInfo(a))}r!==null&&n(i.getPropertyAttributeData(r),i.getPropertyAttributeInfo()),n(i.getPropertyTextureData(e,t),i.getPropertyTextureInfo());function n(u,s){const o=Math.max(...Object.values(u).flatMap(m=>Object.keys(m)).map(m=>m.length));for(const m in u){R.innerText+=`
${s[m].name||s[m].className}
`;const F=u[m];for(const D in F){let E=F[D];E&&E.toArray&&(E=E.toArray()),E&&E.join&&(E=`
`+E.map(x=>x.toFixed?parseFloat(x.toFixed(6)):x).map((x,M)=>`    [${M}] ${x}`).join(`
`)),typeof E=="number"&&(E=parseFloat(E.toFixed(6))),R.innerText+=`  ${D.padEnd(o+1)} : ${E}
`}}}}function re(){if(v||w)return;y.setFromCamera(b,h);const i=y.intersectObject(g)[0];if(i){const{object:e,face:t,point:r,index:a,faceIndex:d}=i,n=new L;if(t){const s=new z;s.setFromAttributeAndIndices(e.geometry.attributes.position,t.a,t.b,t.c),s.a.applyMatrix4(e.matrixWorld),s.b.applyMatrix4(e.matrixWorld),s.c.applyMatrix4(e.matrixWorld),s.getBarycoord(r,n)}else n.set(0,0,0);const{meshFeatures:u}=i.object.userData;u?(v=!0,u.getFeaturesAsync(d,n).then(s=>{v=!1,c={index:a,features:s,faceIndex:d,barycoord:n,object:e}})):c={index:a,features:null,faceIndex:d,barycoord:n,object:e}}else c=null}function ie(){const{featureIndex:i}=l;let e=null,t=null,r=null;if(c&&(e=c.object.userData.meshFeatures,t=c.object.userData.structuralMetadata,r=c.features),e!==null&&r!==null){const{index:a,faceIndex:d,barycoord:n}=c;if(_.innerText=`EXT_MESH_FEATURES

`,_.innerText+=`feature        : ${r.map(u=>u+"").join(", ")}
`,_.innerText+=`texture memory : ${T.info.memory.textures}
`,t!==null){const s=e.getFeatureInfo().map(o=>o.propertyTable);C(t,d,n,a,s,r)}}else if(_.innerText=`EXT_MESH_FEATURES

`,_.innerText+=`feature        : -
`,_.innerText+=`texture memory : ${T.info.memory.textures}`,t!==null){const{index:a,faceIndex:d,barycoord:n}=c;C(t,d,n,a)}else R.innerText="";f.forEachLoadedModel(a=>a.traverse(d=>{const n=d.material,{meshFeatures:u,structuralMetadata:s}=d.userData;if(n&&u)if(l.highlightAllFeatures)n.setFromMeshFeatures(u,i),n.highlightFeatureId=null;else if(c===null)n.disableFeatureDisplay();else{const o=r[i];n.setFromMeshFeatures(u,i),n.highlightFeatureId=o===null?-1:o}if(n&&s&&s.textureAccessors.length>0){let o=null;if(l.propertyTexture===0)o=n.originalMap;else if(l.propertyTexture===1){const F=s.getPropertyTextureInfo()[0].properties.r3dm_uncertainty_ce90sum;o=s.textures[F.index],o.channel=F.texCoord}else if(l.propertyTexture===2){const F=s.getPropertyTextureInfo()[1].properties.r3dm_uncertainty_le90sum;o=s.textures[F.index],o.channel=F.texCoord}n.map!==o&&(n.map=o,n.needsUpdate=!0)}}))}function H(){requestAnimationFrame(H),p.update(),h.updateMatrixWorld(),ie(),re();const i=new X,e=new L(0,1,0);f.getBoundingSphere(i),f.group.position.copy(i.center).multiplyScalar(-1),A.quaternion.setFromUnitVectors(i.center.normalize(),e),f.setResolutionFromRenderer(h,T),f.update(),T.render(g,h)}
//# sourceMappingURL=metadata-BB1lb58f.js.map
