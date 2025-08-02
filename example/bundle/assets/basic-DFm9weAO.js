import{M as j,b as k,U as I,aR as E,aM as F,aO as B,b1 as z,C as A}from"./three.module-CQU0seT4.js";import{r as c,e as O,a as w,c as U,j as n,C as P,T as N,b as G,E as L}from"./CameraControls-BTa4S6yL.js";import{E as V}from"./Environment-CaTRor8q.js";import{u as b,G as $,a as H}from"./GizmoViewport-DtionKFo.js";import{_ as K}from"./extends-CF3RwP-h.js";import{T as W}from"./TilesFadePlugin-D_u_P2Qt.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./EnvironmentControls-CLbQ_1-I.js";import"./GlobeControls-CKSk7BfI.js";import"./Ellipsoid-BKsGN9dG.js";import"./I3DMLoader--guqwtSo.js";import"./readMagicBytes-ReGFEf36.js";import"./GLTFLoader-Bzr6GmPM.js";import"./TilesRenderer-Dt06WWnf.js";import"./B3DMLoader-BZtrZCNg.js";import"./PNTSLoader-gB5YPyhc.js";import"./CMPTLoader-VEto4VOC.js";import"./EllipsoidRegion-BEIhCuST.js";import"./constants-BeIdOgZ8.js";function X(m,t,r,e){const s=class extends k{constructor(v={}){const f=Object.entries(m);super({uniforms:f.reduce((l,[u,x])=>{const d=I.clone({[u]:{value:x}});return{...l,...d}},{}),vertexShader:t,fragmentShader:r}),this.key="",f.forEach(([l])=>Object.defineProperty(this,l,{get:()=>this.uniforms[l].value,set:u=>this.uniforms[l].value=u})),Object.assign(this,v)}};return s.key=j.generateUUID(),s}const Y=X({},"void main() { }","void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); discard;  }");class q extends z{constructor(t=6,r=!1){super(),this.uniforms={chromaticAberration:{value:.05},transmission:{value:0},_transmission:{value:1},transmissionMap:{value:null},roughness:{value:0},thickness:{value:0},thicknessMap:{value:null},attenuationDistance:{value:1/0},attenuationColor:{value:new A("white")},anisotropicBlur:{value:.1},time:{value:0},distortion:{value:0},distortionScale:{value:.5},temporalDistortion:{value:0},buffer:{value:null}},this.onBeforeCompile=e=>{e.uniforms={...e.uniforms,...this.uniforms},this.anisotropy>0&&(e.defines.USE_ANISOTROPY=""),r?e.defines.USE_SAMPLER="":e.defines.USE_TRANSMISSION="",e.fragmentShader=`
      uniform float chromaticAberration;         
      uniform float anisotropicBlur;      
      uniform float time;
      uniform float distortion;
      uniform float distortionScale;
      uniform float temporalDistortion;
      uniform sampler2D buffer;

      vec3 random3(vec3 c) {
        float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
        vec3 r;
        r.z = fract(512.0*j);
        j *= .125;
        r.x = fract(512.0*j);
        j *= .125;
        r.y = fract(512.0*j);
        return r-0.5;
      }

      uint hash( uint x ) {
        x += ( x << 10u );
        x ^= ( x >>  6u );
        x += ( x <<  3u );
        x ^= ( x >> 11u );
        x += ( x << 15u );
        return x;
      }

      // Compound versions of the hashing algorithm I whipped together.
      uint hash( uvec2 v ) { return hash( v.x ^ hash(v.y)                         ); }
      uint hash( uvec3 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z)             ); }
      uint hash( uvec4 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z) ^ hash(v.w) ); }

      // Construct a float with half-open range [0:1] using low 23 bits.
      // All zeroes yields 0.0, all ones yields the next smallest representable value below 1.0.
      float floatConstruct( uint m ) {
        const uint ieeeMantissa = 0x007FFFFFu; // binary32 mantissa bitmask
        const uint ieeeOne      = 0x3F800000u; // 1.0 in IEEE binary32
        m &= ieeeMantissa;                     // Keep only mantissa bits (fractional part)
        m |= ieeeOne;                          // Add fractional part to 1.0
        float  f = uintBitsToFloat( m );       // Range [1:2]
        return f - 1.0;                        // Range [0:1]
      }

      // Pseudo-random value in half-open range [0:1].
      float randomBase( float x ) { return floatConstruct(hash(floatBitsToUint(x))); }
      float randomBase( vec2  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
      float randomBase( vec3  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
      float randomBase( vec4  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
      float rand(float seed) {
        float result = randomBase(vec3(gl_FragCoord.xy, seed));
        return result;
      }

      const float F3 =  0.3333333;
      const float G3 =  0.1666667;

      float snoise(vec3 p) {
        vec3 s = floor(p + dot(p, vec3(F3)));
        vec3 x = p - s + dot(s, vec3(G3));
        vec3 e = step(vec3(0.0), x - x.yzx);
        vec3 i1 = e*(1.0 - e.zxy);
        vec3 i2 = 1.0 - e.zxy*(1.0 - e);
        vec3 x1 = x - i1 + G3;
        vec3 x2 = x - i2 + 2.0*G3;
        vec3 x3 = x - 1.0 + 3.0*G3;
        vec4 w, d;
        w.x = dot(x, x);
        w.y = dot(x1, x1);
        w.z = dot(x2, x2);
        w.w = dot(x3, x3);
        w = max(0.6 - w, 0.0);
        d.x = dot(random3(s), x);
        d.y = dot(random3(s + i1), x1);
        d.z = dot(random3(s + i2), x2);
        d.w = dot(random3(s + 1.0), x3);
        w *= w;
        w *= w;
        d *= w;
        return dot(d, vec4(52.0));
      }

      float snoiseFractal(vec3 m) {
        return 0.5333333* snoise(m)
              +0.2666667* snoise(2.0*m)
              +0.1333333* snoise(4.0*m)
              +0.0666667* snoise(8.0*m);
      }
`+e.fragmentShader,e.fragmentShader=e.fragmentShader.replace("#include <transmission_pars_fragment>",`
        #ifdef USE_TRANSMISSION
          // Transmission code is based on glTF-Sampler-Viewer
          // https://github.com/KhronosGroup/glTF-Sample-Viewer
          uniform float _transmission;
          uniform float thickness;
          uniform float attenuationDistance;
          uniform vec3 attenuationColor;
          #ifdef USE_TRANSMISSIONMAP
            uniform sampler2D transmissionMap;
          #endif
          #ifdef USE_THICKNESSMAP
            uniform sampler2D thicknessMap;
          #endif
          uniform vec2 transmissionSamplerSize;
          uniform sampler2D transmissionSamplerMap;
          uniform mat4 modelMatrix;
          uniform mat4 projectionMatrix;
          varying vec3 vWorldPosition;
          vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
            // Direction of refracted light.
            vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
            // Compute rotation-independant scaling of the model matrix.
            vec3 modelScale;
            modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
            modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
            modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
            // The thickness is specified in local space.
            return normalize( refractionVector ) * thickness * modelScale;
          }
          float applyIorToRoughness( const in float roughness, const in float ior ) {
            // Scale roughness with IOR so that an IOR of 1.0 results in no microfacet refraction and
            // an IOR of 1.5 results in the default amount of microfacet refraction.
            return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
          }
          vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
            float framebufferLod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );            
            #ifdef USE_SAMPLER
              #ifdef texture2DLodEXT
                return texture2DLodEXT(transmissionSamplerMap, fragCoord.xy, framebufferLod);
              #else
                return texture2D(transmissionSamplerMap, fragCoord.xy, framebufferLod);
              #endif
            #else
              return texture2D(buffer, fragCoord.xy);
            #endif
          }
          vec3 applyVolumeAttenuation( const in vec3 radiance, const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
            if ( isinf( attenuationDistance ) ) {
              // Attenuation distance is +∞, i.e. the transmitted color is not attenuated at all.
              return radiance;
            } else {
              // Compute light attenuation using Beer's law.
              vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
              vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance ); // Beer's law
              return transmittance * radiance;
            }
          }
          vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
            const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
            const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
            const in vec3 attenuationColor, const in float attenuationDistance ) {
            vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
            vec3 refractedRayExit = position + transmissionRay;
            // Project refracted vector on the framebuffer, while mapping to normalized device coordinates.
            vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
            vec2 refractionCoords = ndcPos.xy / ndcPos.w;
            refractionCoords += 1.0;
            refractionCoords /= 2.0;
            // Sample framebuffer to get pixel the refracted ray hits.
            vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
            vec3 attenuatedColor = applyVolumeAttenuation( transmittedLight.rgb, length( transmissionRay ), attenuationColor, attenuationDistance );
            // Get the specular component.
            vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
            return vec4( ( 1.0 - F ) * attenuatedColor * diffuseColor, transmittedLight.a );
          }
        #endif
`),e.fragmentShader=e.fragmentShader.replace("#include <transmission_fragment>",`  
        // Improve the refraction to use the world pos
        material.transmission = _transmission;
        material.transmissionAlpha = 1.0;
        material.thickness = thickness;
        material.attenuationDistance = attenuationDistance;
        material.attenuationColor = attenuationColor;
        #ifdef USE_TRANSMISSIONMAP
          material.transmission *= texture2D( transmissionMap, vUv ).r;
        #endif
        #ifdef USE_THICKNESSMAP
          material.thickness *= texture2D( thicknessMap, vUv ).g;
        #endif
        
        vec3 pos = vWorldPosition;
        float runningSeed = 0.0;
        vec3 v = normalize( cameraPosition - pos );
        vec3 n = inverseTransformDirection( normal, viewMatrix );
        vec3 transmission = vec3(0.0);
        float transmissionR, transmissionB, transmissionG;
        float randomCoords = rand(runningSeed++);
        float thickness_smear = thickness * max(pow(roughnessFactor, 0.33), anisotropicBlur);
        vec3 distortionNormal = vec3(0.0);
        vec3 temporalOffset = vec3(time, -time, -time) * temporalDistortion;
        if (distortion > 0.0) {
          distortionNormal = distortion * vec3(snoiseFractal(vec3((pos * distortionScale + temporalOffset))), snoiseFractal(vec3(pos.zxy * distortionScale - temporalOffset)), snoiseFractal(vec3(pos.yxz * distortionScale + temporalOffset)));
        }
        for (float i = 0.0; i < ${t}.0; i ++) {
          vec3 sampleNorm = normalize(n + roughnessFactor * roughnessFactor * 2.0 * normalize(vec3(rand(runningSeed++) - 0.5, rand(runningSeed++) - 0.5, rand(runningSeed++) - 0.5)) * pow(rand(runningSeed++), 0.33) + distortionNormal);
          transmissionR = getIBLVolumeRefraction(
            sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
            pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness  + thickness_smear * (i + randomCoords) / float(${t}),
            material.attenuationColor, material.attenuationDistance
          ).r;
          transmissionG = getIBLVolumeRefraction(
            sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
            pos, modelMatrix, viewMatrix, projectionMatrix, material.ior  * (1.0 + chromaticAberration * (i + randomCoords) / float(${t})) , material.thickness + thickness_smear * (i + randomCoords) / float(${t}),
            material.attenuationColor, material.attenuationDistance
          ).g;
          transmissionB = getIBLVolumeRefraction(
            sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
            pos, modelMatrix, viewMatrix, projectionMatrix, material.ior * (1.0 + 2.0 * chromaticAberration * (i + randomCoords) / float(${t})), material.thickness + thickness_smear * (i + randomCoords) / float(${t}),
            material.attenuationColor, material.attenuationDistance
          ).b;
          transmission.r += transmissionR;
          transmission.g += transmissionG;
          transmission.b += transmissionB;
        }
        transmission /= ${t}.0;
        totalDiffuse = mix( totalDiffuse, transmission.rgb, material.transmission );
`)},Object.keys(this.uniforms).forEach(e=>Object.defineProperty(this,e,{get:()=>this.uniforms[e].value,set:s=>this.uniforms[e].value=s}))}}const J=c.forwardRef(({buffer:m,transmissionSampler:t=!1,backside:r=!1,side:e=B,transmission:s=1,thickness:h=0,backsideThickness:v=0,backsideEnvMapIntensity:f=1,samples:l=10,resolution:u,backsideResolution:x,background:d,anisotropy:T,anisotropicBlur:g,...R},D)=>{O({MeshTransmissionMaterial:q});const i=c.useRef(null),[_]=c.useState(()=>new Y),M=b(x||u),p=b(u);let S,C,y,a;return w(o=>{i.current.time=o.clock.elapsedTime,i.current.buffer===p.texture&&!t&&(a=i.current.__r3f.parent,a&&(y=o.gl.toneMapping,S=o.scene.background,C=i.current.envMapIntensity,o.gl.toneMapping=E,d&&(o.scene.background=d),a.material=_,r&&(o.gl.setRenderTarget(M),o.gl.render(o.scene,o.camera),a.material=i.current,a.material.buffer=M.texture,a.material.thickness=v,a.material.side=F,a.material.envMapIntensity=f),o.gl.setRenderTarget(p),o.gl.render(o.scene,o.camera),a.material=i.current,a.material.thickness=h,a.material.side=e,a.material.buffer=p.texture,a.material.envMapIntensity=C,o.scene.background=S,o.gl.setRenderTarget(null),o.gl.toneMapping=y))}),c.useImperativeHandle(D,()=>i.current,[]),c.createElement("meshTransmissionMaterial",K({args:[l,t],ref:i},R,{buffer:m||p.texture,_transmission:s,anisotropicBlur:g??T,transmission:t?s:0,thickness:h,side:e}))}),Q="https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json";function Z(m){const t=c.useRef();return w(()=>{const r=t.current;r.rotation.x=Math.sin(window.performance.now()*5e-4)*2,r.rotation.y=Math.cos(window.performance.now()*.0015)}),n.jsxs("mesh",{...m,ref:t,children:[n.jsx("icosahedronGeometry",{}),n.jsx(J,{thickness:1.5,chromaticAberration:.25,color:8445674})]})}function ee(){return n.jsxs(P,{camera:{position:[12,7.5,12]},style:{width:"100%",height:"100%",position:"absolute",margin:0,left:0,top:0},children:[n.jsx("group",{"rotation-x":Math.PI/2,children:n.jsxs(N,{url:Q,children:[n.jsx(G,{plugin:W,fadeDuration:500}),n.jsx(Z,{position:[0,-4,-4],scale:2})]})}),n.jsx(L,{enableDamping:!0,maxDistance:50}),n.jsx(V,{preset:"sunset",background:!0,backgroundBlurriness:.9,environmentIntensity:1}),n.jsx($,{alignment:"bottom-right",children:n.jsx(H,{})})]})}U.createRoot(document.getElementById("root")).render(n.jsx(c.StrictMode,{children:n.jsx(ee,{})}));
//# sourceMappingURL=basic-DFm9weAO.js.map
