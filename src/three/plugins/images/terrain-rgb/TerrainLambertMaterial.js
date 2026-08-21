import { MeshLambertMaterial, Vector2 } from 'three';

// MeshLambertMaterial with the built-in bump map chunk replaced for use with terrain height maps.
// The height gradient is evaluated at fixed one texel offsets, since the built-in screen
// derivative sampling of a bilinearly filtered texture is constant within each texel cell and
// shades every texel as a flat facet. The unnormalized surface derivatives keep the world size of
// a screen pixel so the gradient, which is in world units per pixel, resolves to the true physical
// slope at every scale.
export class TerrainLambertMaterial extends MeshLambertMaterial {

	constructor( params ) {

		super( params );

		const material = this;
		const texelSize = new Vector2();
		this.onBeforeCompile = shader => {

			shader.uniforms.bumpMapTexelSize = {
				get value() {

					const image = material.bumpMap ? material.bumpMap.image : null;
					if ( image ) {

						texelSize.set( 1 / image.width, 1 / image.height );

					}

					return texelSize;

				},
			};

			shader.fragmentShader = shader.fragmentShader.replace( '#include <bumpmap_pars_fragment>', /* glsl */`
				#ifdef USE_BUMPMAP

					uniform sampler2D bumpMap;
					uniform float bumpScale;
					uniform vec2 bumpMapTexelSize;

					vec2 dHdxy_fwd() {

						vec2 dSTdx = dFdx( vBumpMapUv );
						vec2 dSTdy = dFdy( vBumpMapUv );

						// central differences at one texel spacing interpolate smoothly across texel cells
						vec2 dx = vec2( bumpMapTexelSize.x, 0.0 );
						vec2 dy = vec2( 0.0, bumpMapTexelSize.y );
						float gradU = ( texture2D( bumpMap, vBumpMapUv + dx ).x - texture2D( bumpMap, vBumpMapUv - dx ).x ) / ( 2.0 * bumpMapTexelSize.x );
						float gradV = ( texture2D( bumpMap, vBumpMapUv + dy ).x - texture2D( bumpMap, vBumpMapUv - dy ).x ) / ( 2.0 * bumpMapTexelSize.y );

						// project the gradient onto the screen space steps to match the original convention
						float dBx = bumpScale * ( gradU * dSTdx.x + gradV * dSTdx.y );
						float dBy = bumpScale * ( gradU * dSTdy.x + gradV * dSTdy.y );

						return vec2( dBx, dBy );

					}

					vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {

						// the unnormalized surface derivatives keep the world size of a screen pixel
						vec3 vSigmaX = dFdx( surf_pos.xyz );
						vec3 vSigmaY = dFdy( surf_pos.xyz );
						vec3 vN = surf_norm; // normalized

						vec3 R1 = cross( vSigmaY, vN );
						vec3 R2 = cross( vN, vSigmaX );

						float fDet = dot( vSigmaX, R1 ) * faceDirection;

						vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
						return normalize( abs( fDet ) * surf_norm - vGrad );

					}

				#endif
			` );

		};

	}

}
