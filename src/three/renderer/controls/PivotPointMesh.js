import { Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three';
export class PivotPointMesh extends Mesh {

	constructor() {

		super( new PlaneGeometry( 0, 0 ), new PivotMaterial() );
		this.renderOrder = Infinity;

	}

	onBeforeRender( renderer ) {

		const uniforms = this.material.uniforms;
		renderer.getSize( uniforms.resolution.value );

	}

	updateMatrixWorld() {

		this.matrixWorld.makeTranslation( this.position );

	}

	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}

class PivotMaterial extends ShaderMaterial {

	constructor() {

		super( {

			depthWrite: false,
			depthTest: false,
			transparent: true,

			uniforms: {

				resolution: { value: new Vector2() },
				size: { value: 15 },
				thickness: { value: 2 },
				opacity: { value: 1 },

			},

			vertexShader: /* glsl */`

				uniform float pixelRatio;
				uniform float size;
				uniform float thickness;
				uniform vec2 resolution;
				varying vec2 vUv;

				void main() {

					vUv = uv;

					float aspect = resolution.x / resolution.y;
					vec2 offset = uv * 2.0 - vec2( 1.0 );
					offset.y *= aspect;

					vec4 screenPoint = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
					screenPoint.xy += offset * ( size + thickness ) * screenPoint.w / resolution.x;

					gl_Position = screenPoint;

				}
			`,

			fragmentShader: /* glsl */`

				uniform float size;
				uniform float thickness;
				uniform float opacity;

				varying vec2 vUv;
				void main() {

					float ht = 0.5 * thickness;
					float planeDim = size + thickness;
					float offset = ( planeDim - ht - 2.0 ) / planeDim;
					float texelThickness = ht / planeDim;

					vec2 vec = vUv * 2.0 - vec2( 1.0 );
					float dist = abs( length( vec ) - offset );
					float fw = fwidth( dist ) * 0.5;
					float a = smoothstep( texelThickness - fw, texelThickness + fw, dist );

					gl_FragColor = vec4( 1, 1, 1, opacity * ( 1.0 - a ) );

				}
			`,

		} );

	}

}
