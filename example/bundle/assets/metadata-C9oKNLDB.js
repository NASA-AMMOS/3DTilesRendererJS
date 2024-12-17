import{W as Y,S as G,a as $,D as j,A as V,G as N,V as W,R as k,k as C,am as X,d as z}from"./three.module-DpclfMcJ.js";import{G as O}from"./GLTFLoader-DkJa3Jo5.js";import{g as B}from"./lil-gui.module.min-Bc0DeA9g.js";import{E as K}from"./EnvironmentControls-C8X7oAWq.js";import{T as q}from"./TilesRenderer-B1NhZ5io.js";import{C as Z}from"./CesiumIonAuthPlugin-CVl4yipB.js";import{G as J,a as Q}from"./GLTFMeshFeaturesExtension-D473cUUw.js";import"./I3DMLoader-BlebwdUJ.js";import"./readMagicBytes-Da5ueiou.js";import"./LoaderBase-CVSPpjX2.js";import"./Ellipsoid-Cnb0UTwk.js";import"./B3DMLoader-B2OeBq6-.js";import"./PNTSLoader-BMN5TswI.js";import"./CMPTLoader-nLXQ3OXQ.js";import"./GLTFExtensionLoader-TubLlshp.js";import"./EllipsoidRegion-D6hT1syi.js";import"./GoogleCloudAuthPlugin-CWIx3JJD.js";import"./Pass-inUSP30K.js";const ee=i=>class extends i{get featureTexture(){return this.uniforms.featureTexture.value}set featureTexture(e){const t=this.uniforms.featureTexture.value;t!==e&&t&&t.dispose(),this.uniforms.featureTexture.value=e}get nullFeatureId(){return this.uniforms.nullFeatureId.value}set nullFeatureId(e){e<0||e===null||e===void 0?(this.uniforms.nullFeatureId.value=null,this.setDefine("USE_NULL_FEATURE",0)):(this.uniforms.nullFeatureId.value=e,this.setDefine("USE_NULL_FEATURE",1))}get highlightFeatureId(){return this.uniforms.highlightFeatureId.value}set highlightFeatureId(e){e==null?(this.uniforms.highlightFeatureId.value=null,this.setDefine("USE_HIGHLIGHT_FEATURE",0)):(this.uniforms.highlightFeatureId.value=e,this.setDefine("USE_HIGHLIGHT_FEATURE",1))}constructor(...e){super(...e),this.isMeshFeaturesMaterial=!0,this.uniforms={featureChannelsLength:{value:0},featureChannels:{value:new Array(4).fill(0)},featureTexture:{value:null},nullFeatureId:{value:null},highlightFeatureId:{value:-1}},Object.assign(this.defines,{FEATURE_TYPE:0,USE_HIGHLIGHT_FEATURE:0,USE_NULL_FEATURE:0,FEATURE_ATTR:"",FEATURE_TEXTURE_ATTR:"uv"}),this.addEventListener("dispose",()=>{this.featureTexture&&this.featureTexture.dispose()})}copy(e){const t=this.defines;if(super.copy(e),e.defines&&Object.assign(this.defines,t,e.defines),e.uniforms)for(const r in this.uniforms){const n=e.uniforms[r].value;Array.isArray(n)?this.uniforms[r].value=n.slice():this.uniforms[r].value=n}this.needsUpdate=!0}setDefine(e,t){const r=this.defines;r[e]!==t&&(this.needsUpdate=!0),t===null?delete r[e]:r[e]=t}setFromMeshFeatures(e,t){let r=null;typeof t=="number"?r=e.getFeatureInfo()[t]||null:typeof t=="string"&&(r=e.getFeatureInfo().find(n=>n.label===t)||null),r===null?(this.setDefine("FEATURE_TYPE",0),this.featureTexture=null):"attribute"in r?this._setAttributeFeature(r.attribute):"texture"in r?this._setTextureFeature(e.textures[r.texture.index],r.texture.texCoord,r.texture.channels):this._setAttributeFeature(null),r!==null&&(this.nullFeatureId=r.nullFeatureId==null?null:r.nullFeatureId)}disableFeatureDisplay(){this.setDefine("FEATURE_TYPE",0),this.featureTexture=null}_setTextureFeature(e,t,r){const n=this.uniforms;this.setDefine("FEATURE_TYPE",3),t===0?(this.setDefine("FEATURE_TEXTURE_ATTR","uv"),this.setDefine("USE_UV","")):(this.setDefine("FEATURE_TEXTURE_ATTR",`uv${t}`),this.setDefine(`USE_UV${t}`,"")),t!==0&&this.setDefine("USE_UV",null),t!==1&&this.setDefine("USE_UV1",null),t!==2&&this.setDefine("USE_UV2",null),t!==3&&this.setDefine("USE_UV3",null),n.featureChannelsLength.value=r.length,n.featureChannels.value=[...r],this.featureTexture=e}_setAttributeFeature(e=null){e===null?this.setDefine("FEATURE_TYPE",1):(this.setDefine("FEATURE_TYPE",2),this.setDefine("FEATURE_ATTR",`_feature_id_${e}`)),this.featureTexture=null}customProgramCacheKey(){const e=this.defines;return`${e.FEATURE_TYPE}|${e.USE_HIGHLIGHT_FEATURE}|${e.USE_NULL_FEATURE}|${e.FEATURE_ATTR}|${e.FEATURE_TEXTURE_ATTR}`}onBeforeCompile(e){e.uniforms={...e.uniforms,...this.uniforms},e.defines=this.defines,e.vertexShader=e.vertexShader.replace(/^/,t=>`
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

				`)}};let h,p,_,T,I,l,A,g,R,U,w=!1,c=null,v=!1;const b=new W(-1,-1),y=new k;y.firstHitOnly=!0;y.params.Points.threshold=.05;const te=localStorage.getItem("ionApiKey")??"put-your-api-key-here",o={accessToken:te,assetId:2333904,reload:()=>{P()},featureIndex:0,propertyTexture:0,highlightAllFeatures:!1};re();H();function re(){g=document.getElementById("meshFeatures"),R=document.getElementById("structuralMetadata"),T=new Y({antialias:!0}),T.setPixelRatio(window.devicePixelRatio),T.setSize(window.innerWidth,window.innerHeight),T.setClearColor(1383455),document.body.appendChild(T.domElement),_=new G,h=new $(60,window.innerWidth/window.innerHeight,.1,5e3),h.position.set(-4,2,0).multiplyScalar(30),h.lookAt(0,0,0),p=new K(_,h,T.domElement),p.minDistance=.1,p.cameraRadius=.1,p.minAltitude=0,p.maxAltitude=Math.PI,p.adjustHeight=!1,p.addEventListener("start",()=>w=!0),p.addEventListener("end",()=>w=!1),I=new j(16777215,3.3),I.position.set(1,2,3).multiplyScalar(40),_.add(I),_.add(new V(16777215,1)),A=new N,A.position.y=40,_.add(A),P(),S(),window.addEventListener("resize",S,!1),window.addEventListener("pointermove",i=>{b.x=i.clientX/window.innerWidth*2-1,b.y=-(i.clientY/window.innerHeight)*2+1})}function ie(){U&&U.destroy(),U=new B;const i=U.addFolder("ion");i.add(o,"accessToken"),i.add(o,"assetId",[2333904,2342602]).onChange(P),i.add(o,"reload");const e=U.addFolder("features");o.assetId===2333904?(e.add(o,"featureIndex",[0,1]),e.add(o,"highlightAllFeatures")):e.add(o,"propertyTexture",{NONE:0,HORIZ_UNCERTAINTY:1,VERT_UNCERTAINTY:2})}function P(){l&&(l.dispose(),l.group.removeFromParent()),localStorage.setItem("ionApiKey",o.accessToken),l=new q,l.registerPlugin(new Z({apiToken:o.accessToken,assetId:o.assetId})),l.setCamera(h),A.add(l.group);const i=new O(l.manager);i.register(()=>new J),i.register(()=>new Q),l.manager.addHandler(/(gltf|glb)$/g,i),l.addEventListener("load-model",({scene:e})=>{e.traverse(t=>{if(t.material&&t.userData.meshFeatures){const r=ee(t.material.constructor),n=new r;n.copy(t.material),n.metalness=0,t.material=n}t.material&&t.userData.structuralMetadata&&(t.material.originalMap=t.material.map)})}),ie()}function S(){h.aspect=window.innerWidth/window.innerHeight,T.setPixelRatio(window.devicePixelRatio),T.setSize(window.innerWidth,window.innerHeight),h.updateProjectionMatrix()}function L(i,e,t,r=null,n=null,d=null){if(R.innerText=`STRUCTURAL_METADATA
`,n!==null){const u=i.getPropertyTableData(n,d);a(u,i.getPropertyTableInfo(n))}r!==null&&a(i.getPropertyAttributeData(r),i.getPropertyAttributeInfo()),a(i.getPropertyTextureData(e,t),i.getPropertyTextureInfo());function a(u,s){const f=Math.max(...Object.values(u).flatMap(m=>Object.keys(m)).map(m=>m.length));for(const m in u){R.innerText+=`
${s[m].name||s[m].className}
`;const F=u[m];for(const D in F){let E=F[D];E&&E.toArray&&(E=E.toArray()),E&&E.join&&(E=`
`+E.map(x=>x.toFixed?parseFloat(x.toFixed(6)):x).map((x,M)=>`    [${M}] ${x}`).join(`
`)),typeof E=="number"&&(E=parseFloat(E.toFixed(6))),R.innerText+=`  ${D.padEnd(f+1)} : ${E}
`}}}}function ne(){if(v||w)return;y.setFromCamera(b,h);const i=y.intersectObject(_)[0];if(i){const{object:e,face:t,point:r,index:n,faceIndex:d}=i,a=new C;if(t){const s=new X;s.setFromAttributeAndIndices(e.geometry.attributes.position,t.a,t.b,t.c),s.a.applyMatrix4(e.matrixWorld),s.b.applyMatrix4(e.matrixWorld),s.c.applyMatrix4(e.matrixWorld),s.getBarycoord(r,a)}else a.set(0,0,0);const{meshFeatures:u}=i.object.userData;u?(v=!0,u.getFeaturesAsync(d,a).then(s=>{v=!1,c={index:n,features:s,faceIndex:d,barycoord:a,object:e}})):c={index:n,features:null,faceIndex:d,barycoord:a,object:e}}else c=null}function ae(){const{featureIndex:i}=o;let e=null,t=null,r=null;if(c&&(e=c.object.userData.meshFeatures,t=c.object.userData.structuralMetadata,r=c.features),e!==null&&r!==null){const{index:n,faceIndex:d,barycoord:a}=c;if(g.innerText=`EXT_MESH_FEATURES

`,g.innerText+=`feature        : ${r.map(u=>u+"").join(", ")}
`,g.innerText+=`texture memory : ${T.info.memory.textures}
`,t!==null){const s=e.getFeatureInfo().map(f=>f.propertyTable);L(t,d,a,n,s,r)}}else if(g.innerText=`EXT_MESH_FEATURES

`,g.innerText+=`feature        : -
`,g.innerText+=`texture memory : ${T.info.memory.textures}`,t!==null){const{index:n,faceIndex:d,barycoord:a}=c;L(t,d,a,n)}else R.innerText="";l.forEachLoadedModel(n=>n.traverse(d=>{const a=d.material,{meshFeatures:u,structuralMetadata:s}=d.userData;if(a&&u)if(o.highlightAllFeatures)a.setFromMeshFeatures(u,i),a.highlightFeatureId=null;else if(c===null)a.disableFeatureDisplay();else{const f=r[i];a.setFromMeshFeatures(u,i),a.highlightFeatureId=f===null?-1:f}if(a&&s&&s.textureAccessors.length>0){let f=null;if(o.propertyTexture===0)f=a.originalMap;else if(o.propertyTexture===1){const F=s.getPropertyTextureInfo()[0].properties.r3dm_uncertainty_ce90sum;f=s.textures[F.index],f.channel=F.texCoord}else if(o.propertyTexture===2){const F=s.getPropertyTextureInfo()[1].properties.r3dm_uncertainty_le90sum;f=s.textures[F.index],f.channel=F.texCoord}a.map!==f&&(a.map=f,a.needsUpdate=!0)}}))}function H(){requestAnimationFrame(H),p.update(),h.updateMatrixWorld(),ae(),ne();const i=new z,e=new C(0,1,0);l.getBoundingSphere(i),l.group.position.copy(i.center).multiplyScalar(-1),A.quaternion.setFromUnitVectors(i.center.normalize(),e),l.setResolutionFromRenderer(h,T),l.update(),T.render(_,h)}
