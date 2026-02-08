import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css               */import{V as Y,R as $,W as G,S as j,a as V,D as N,A as W,G as k,d as X,o as L,aq as z}from"./three.module-D-uF--xd.js";import{T as O}from"./TilesRenderer-Bm042Xsy.js";import{E as B}from"./EnvironmentControls-BRF5UI-K.js";import{C as q}from"./plugins-DBdp9Zs1.js";import{g as K}from"./lil-gui.module.min-BH_YJbPT.js";import{G as Z}from"./GLTFExtensionsPlugin-CGSNI2LM.js";import"./TilesRendererBase-CFsQu8zV.js";import"./constants-JFoaxC9y.js";import"./BatchTable-CRr3zuRk.js";import"./B3DMLoader-Cnf0ja_2.js";import"./B3DMLoaderBase-w5mdSgm-.js";import"./GLTFLoader-B4GrkiON.js";import"./PNTSLoader-DwvZQNdL.js";import"./I3DMLoader-BWluRuWb.js";import"./Ellipsoid-Dwquuq5w.js";import"./CMPTLoader-BOTrymv0.js";import"./EllipsoidRegion-VNvPMw5b.js";import"./GoogleCloudAuth-vMnc9CC1.js";import"./CesiumIonAuth-ByA9ya_o.js";import"./EPSGTilesPlugin-DX3n6hNw.js";import"./ImageFormatPlugin-DGN9sc3I.js";import"./TMSImageSource-BIqdNmly.js";import"./TiledImageSource-DmD64Gn9.js";import"./GeometryClipper-7b525s21.js";const J=i=>class extends i{get featureTexture(){return this.uniforms.featureTexture.value}set featureTexture(e){const t=this.uniforms.featureTexture.value;t!==e&&t&&t.dispose(),this.uniforms.featureTexture.value=e}get nullFeatureId(){return this.uniforms.nullFeatureId.value}set nullFeatureId(e){e<0||e===null||e===void 0?(this.uniforms.nullFeatureId.value=null,this.setDefine("USE_NULL_FEATURE",0)):(this.uniforms.nullFeatureId.value=e,this.setDefine("USE_NULL_FEATURE",1))}get highlightFeatureId(){return this.uniforms.highlightFeatureId.value}set highlightFeatureId(e){e==null?(this.uniforms.highlightFeatureId.value=null,this.setDefine("USE_HIGHLIGHT_FEATURE",0)):(this.uniforms.highlightFeatureId.value=e,this.setDefine("USE_HIGHLIGHT_FEATURE",1))}constructor(...e){super(...e),this.isMeshFeaturesMaterial=!0,this.uniforms={featureChannelsLength:{value:0},featureChannels:{value:new Array(4).fill(0)},featureTexture:{value:null},nullFeatureId:{value:null},highlightFeatureId:{value:-1}},Object.assign(this.defines,{FEATURE_TYPE:0,USE_HIGHLIGHT_FEATURE:0,USE_NULL_FEATURE:0,FEATURE_ATTR:"",FEATURE_TEXTURE_ATTR:"uv"}),this.addEventListener("dispose",()=>{this.featureTexture&&this.featureTexture.dispose()})}copy(e){const t=this.defines;if(super.copy(e),e.defines&&Object.assign(this.defines,t,e.defines),e.uniforms)for(const r in this.uniforms){const a=e.uniforms[r].value;Array.isArray(a)?this.uniforms[r].value=a.slice():this.uniforms[r].value=a}this.needsUpdate=!0}setDefine(e,t){const r=this.defines;r[e]!==t&&(this.needsUpdate=!0),t===null?delete r[e]:r[e]=t}setFromMeshFeatures(e,t){let r=null;typeof t=="number"?r=e.getFeatureInfo()[t]||null:typeof t=="string"&&(r=e.getFeatureInfo().find(a=>a.label===t)||null),r===null?(this.setDefine("FEATURE_TYPE",0),this.featureTexture=null):"attribute"in r?this._setAttributeFeature(r.attribute):"texture"in r?this._setTextureFeature(e.textures[r.texture.index],r.texture.texCoord,r.texture.channels):this._setAttributeFeature(null),r!==null&&(this.nullFeatureId=r.nullFeatureId==null?null:r.nullFeatureId)}disableFeatureDisplay(){this.setDefine("FEATURE_TYPE",0),this.featureTexture=null}_setTextureFeature(e,t,r){const a=this.uniforms;this.setDefine("FEATURE_TYPE",3),t===0?(this.setDefine("FEATURE_TEXTURE_ATTR","uv"),this.setDefine("USE_UV","")):(this.setDefine("FEATURE_TEXTURE_ATTR",`uv${t}`),this.setDefine(`USE_UV${t}`,"")),t!==0&&this.setDefine("USE_UV",null),t!==1&&this.setDefine("USE_UV1",null),t!==2&&this.setDefine("USE_UV2",null),t!==3&&this.setDefine("USE_UV3",null),a.featureChannelsLength.value=r.length,a.featureChannels.value=[...r],this.featureTexture=e}_setAttributeFeature(e=null){e===null?this.setDefine("FEATURE_TYPE",1):(this.setDefine("FEATURE_TYPE",2),this.setDefine("FEATURE_ATTR",`_feature_id_${e}`)),this.featureTexture=null}customProgramCacheKey(){const e=this.defines;return`${e.FEATURE_TYPE}|${e.USE_HIGHLIGHT_FEATURE}|${e.USE_NULL_FEATURE}|${e.FEATURE_ATTR}|${e.FEATURE_TEXTURE_ATTR}`}onBeforeCompile(e){e.uniforms={...e.uniforms,...this.uniforms},e.defines=this.defines,e.vertexShader=e.vertexShader.replace(/^/,t=>`
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

				`)}};let T,p,g,E,I,f,A,_,R,U,w=!1,h=null,v=!1;const b=new Y(-1,-1),y=new $;y.firstHitOnly=!0;y.params.Points.threshold=.05;const Q=localStorage.getItem("ionApiKey")??"put-your-api-key-here",o={accessToken:Q,assetId:2333904,reload:()=>{P()},featureIndex:0,propertyTexture:0,highlightAllFeatures:!1};ee();H();function ee(){_=document.getElementById("meshFeatures"),R=document.getElementById("structuralMetadata"),E=new G({antialias:!0}),E.setPixelRatio(window.devicePixelRatio),E.setSize(window.innerWidth,window.innerHeight),E.setClearColor(1383455),document.body.appendChild(E.domElement),g=new j,T=new V(60,window.innerWidth/window.innerHeight,.1,5e3),T.position.set(-4,2,0).multiplyScalar(30),T.lookAt(0,0,0),p=new B(g,T,E.domElement),p.minDistance=.1,p.cameraRadius=.1,p.minAltitude=0,p.maxAltitude=Math.PI,p.adjustHeight=!1,p.addEventListener("start",()=>w=!0),p.addEventListener("end",()=>w=!1),I=new N(16777215,3.3),I.position.set(1,2,3).multiplyScalar(40),g.add(I),g.add(new W(16777215,1)),A=new k,A.position.y=40,g.add(A),P(),S(),window.addEventListener("resize",S,!1),window.addEventListener("pointermove",i=>{b.x=i.clientX/window.innerWidth*2-1,b.y=-(i.clientY/window.innerHeight)*2+1})}function te(){U&&U.destroy(),U=new K;const i=U.addFolder("ion");i.add(o,"accessToken"),i.add(o,"assetId",[2333904,2342602]).onChange(P),i.add(o,"reload");const e=U.addFolder("features");o.assetId===2333904?(e.add(o,"featureIndex",[0,1]),e.add(o,"highlightAllFeatures")):e.add(o,"propertyTexture",{NONE:0,HORIZ_UNCERTAINTY:1,VERT_UNCERTAINTY:2})}function P(){f&&(f.dispose(),f.group.removeFromParent()),localStorage.setItem("ionApiKey",o.accessToken),f=new O,f.registerPlugin(new q({apiToken:o.accessToken,assetId:o.assetId})),f.registerPlugin(new Z({metadata:!0})),f.setCamera(T),A.add(f.group),f.addEventListener("load-model",({scene:i})=>{i.traverse(e=>{if(e.material&&e.userData.meshFeatures){const t=J(e.material.constructor),r=new t;r.copy(e.material),r.metalness=0,e.material=r}e.material&&e.userData.structuralMetadata&&(e.material.originalMap=e.material.map)})}),te()}function S(){T.aspect=window.innerWidth/window.innerHeight,E.setPixelRatio(window.devicePixelRatio),E.setSize(window.innerWidth,window.innerHeight),T.updateProjectionMatrix()}function C(i,e,t,r=null,a=null,d=null){if(R.innerText=`STRUCTURAL_METADATA
`,a!==null){const u=i.getPropertyTableData(a,d);n(u,i.getPropertyTableInfo(a))}r!==null&&n(i.getPropertyAttributeData(r),i.getPropertyAttributeInfo()),n(i.getPropertyTextureData(e,t),i.getPropertyTextureInfo());function n(u,s){const l=Math.max(...Object.values(u).flatMap(c=>Object.keys(c)).map(c=>c.length));for(const c in u){R.innerText+=`
${s[c].name||s[c].className}
`;const F=u[c];for(const D in F){let m=F[D];m&&m.toArray&&(m=m.toArray()),m&&m.join&&(m=`
`+m.map(x=>x.toFixed?parseFloat(x.toFixed(6)):x).map((x,M)=>`    [${M}] ${x}`).join(`
`)),typeof m=="number"&&(m=parseFloat(m.toFixed(6))),R.innerText+=`  ${D.padEnd(l+1)} : ${m}
`}}}}function re(){if(v||w)return;y.setFromCamera(b,T);const i=y.intersectObject(g)[0];if(i){const{object:e,face:t,point:r,index:a,faceIndex:d}=i,n=new L;if(t){const s=new z;s.setFromAttributeAndIndices(e.geometry.attributes.position,t.a,t.b,t.c),s.a.applyMatrix4(e.matrixWorld),s.b.applyMatrix4(e.matrixWorld),s.c.applyMatrix4(e.matrixWorld),s.getBarycoord(r,n)}else n.set(0,0,0);const{meshFeatures:u}=i.object.userData;u?(v=!0,u.getFeaturesAsync(d,n).then(s=>{v=!1,h={index:a,features:s,faceIndex:d,barycoord:n,object:e}})):h={index:a,features:null,faceIndex:d,barycoord:n,object:e}}else h=null}function ie(){const{featureIndex:i}=o;let e=null,t=null,r=null;if(h&&(e=h.object.userData.meshFeatures,t=h.object.userData.structuralMetadata,r=h.features),e!==null&&r!==null){const{index:a,faceIndex:d,barycoord:n}=h;if(_.innerText=`EXT_MESH_FEATURES

`,_.innerText+=`feature        : ${r.map(u=>u+"").join(", ")}
`,_.innerText+=`texture memory : ${E.info.memory.textures}
`,t!==null){const s=e.getFeatureInfo().map(l=>l.propertyTable);C(t,d,n,a,s,r)}}else if(_.innerText=`EXT_MESH_FEATURES

`,_.innerText+=`feature        : -
`,_.innerText+=`texture memory : ${E.info.memory.textures}`,t!==null){const{index:a,faceIndex:d,barycoord:n}=h;C(t,d,n,a)}else R.innerText="";f.forEachLoadedModel(a=>a.traverse(d=>{const n=d.material,{meshFeatures:u,structuralMetadata:s}=d.userData;if(n&&u)if(o.highlightAllFeatures)n.setFromMeshFeatures(u,i),n.highlightFeatureId=null;else if(h===null)n.disableFeatureDisplay();else{const l=r[i];n.setFromMeshFeatures(u,i),n.highlightFeatureId=l===null?-1:l}if(n&&s&&s.textureAccessors.length>0){let l=null;if(o.propertyTexture===0)l=n.originalMap;else if(o.propertyTexture===1){const F=s.getPropertyTextureInfo()[0].properties.r3dm_uncertainty_ce90sum;l=s.textures[F.index],l.channel=F.texCoord}else if(o.propertyTexture===2){const F=s.getPropertyTextureInfo()[1].properties.r3dm_uncertainty_le90sum;l=s.textures[F.index],l.channel=F.texCoord}n.map!==l&&(n.map=l,n.needsUpdate=!0)}}))}function H(){requestAnimationFrame(H),p.update(),T.updateMatrixWorld(),ie(),re();const i=new X,e=new L(0,1,0);f.getBoundingSphere(i),f.group.position.copy(i.center).multiplyScalar(-1),A.quaternion.setFromUnitVectors(i.center.normalize(),e),f.setResolutionFromRenderer(T,E),f.update(),E.render(g,T)}
//# sourceMappingURL=metadata-Be8bknyT.js.map
