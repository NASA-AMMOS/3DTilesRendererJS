import { Vector2 } from 'three';

export function getTextureCoordAttribute( geometry, index ) {

	if ( index === 0 ) {

		return geometry.getAttribute( 'uv' );

	} else {

		return geometry.getAttribute( `uv${ index }` );

	}

}

export function getTriangleIndices( geometry, faceIndex, target = new Array( 3 ) ) {

	// get the attribute indices
	let i0 = 3 * faceIndex;
	let i1 = 3 * faceIndex + 1;
	let i2 = 3 * faceIndex + 2;
	if ( geometry.index ) {

		i0 = geometry.index.getX( i0 );
		i1 = geometry.index.getX( i1 );
		i2 = geometry.index.getX( i2 );

	}

	target[ 0 ] = i0;
	target[ 1 ] = i1;
	target[ 2 ] = i2;
	return target;

}

const _uv0 = new Vector2();
const _uv1 = new Vector2();
const _uv2 = new Vector2();
export function getTexCoord( geometry, texCoord, barycoord, indices, target ) {

	const [ i0, i1, i2 ] = indices;
	const attr = getTextureCoordAttribute( geometry, texCoord );
	_uv0.fromBufferAttribute( attr, i0 );
	_uv1.fromBufferAttribute( attr, i1 );
	_uv2.fromBufferAttribute( attr, i2 );

	target
		.set( 0, 0, 0 )
		.addScaledVector( _uv0, barycoord.x )
		.addScaledVector( _uv1, barycoord.y )
		.addScaledVector( _uv2, barycoord.z );

}

export function getTexelIndices( uv, width, height, target ) {

	const fx = uv.x - Math.floor( uv.x );
	const fy = uv.y - Math.floor( uv.y );
	const px = Math.floor( ( fx * width ) % width );
	const py = Math.floor( ( fy * height ) % height );
	target.set( px, py );
	return target;

}
