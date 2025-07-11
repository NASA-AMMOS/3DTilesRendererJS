import { LineSegments, BufferGeometry, Vector3, BufferAttribute, LineBasicMaterial } from 'three';

const _vector = new Vector3();
const axes = [ 'x', 'y', 'z' ];
export class SphereHelper extends LineSegments {

	constructor( sphere, color = 0xffff00, angleSteps = 40 ) {

		const geometry = new BufferGeometry();
		const positions = [];
		for ( let i = 0; i < 3; i ++ ) {

			const axis1 = axes[ i ];
			const axis2 = axes[ ( i + 1 ) % 3 ];
			_vector.set( 0, 0, 0 );

			for ( let a = 0; a < angleSteps; a ++ ) {

				let angle;
				angle = 2 * Math.PI * a / ( angleSteps - 1 );
				_vector[ axis1 ] = Math.sin( angle );
				_vector[ axis2 ] = Math.cos( angle );

				positions.push( _vector.x, _vector.y, _vector.z );

				angle = 2 * Math.PI * ( a + 1 ) / ( angleSteps - 1 );
				_vector[ axis1 ] = Math.sin( angle );
				_vector[ axis2 ] = Math.cos( angle );

				positions.push( _vector.x, _vector.y, _vector.z );

			}


		}

		geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( positions ), 3 ) );
		geometry.computeBoundingSphere();

		super( geometry, new LineBasicMaterial( { color: color, toneMapped: false } ) );
		this.sphere = sphere;
		this.type = 'SphereHelper';

	}

	updateMatrixWorld( force ) {

		const sphere = this.sphere;
		this.position.copy( sphere.center );
		this.scale.setScalar( sphere.radius );
		super.updateMatrixWorld( force );

	}

}
