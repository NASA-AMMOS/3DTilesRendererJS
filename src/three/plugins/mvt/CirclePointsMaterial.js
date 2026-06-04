import { PointsMaterial } from 'three';

export class CirclePointsMaterial extends PointsMaterial {

	constructor( parameters ) {

		super( parameters );

		this.alphaToCoverage = true;
		this.vertexColors = true;
		this.transparent = true;

		this.onBeforeCompile = ( shader ) => {

			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <opaque_fragment>',
				/* glsl */`
					float _dist = length( gl_PointCoord - 0.5 );
					float _fw = fwidth( _dist );
					float _circleAlpha = 1.0 - smoothstep( 0.5 - _fw * 2.0, 0.5, _dist );
					if ( _circleAlpha < 0.001 ) discard;
					diffuseColor.a *= _circleAlpha;
					#include <opaque_fragment>
				`
			);

		};

		this.customProgramCacheKey = () => 'CirclePointsMaterial';

	}

}
