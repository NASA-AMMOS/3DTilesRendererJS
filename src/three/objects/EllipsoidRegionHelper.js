import { EllipsoidRegion } from '../math/EllipsoidRegion.js';
import { Mesh, Vector3, MathUtils, BoxGeometry, BufferGeometry, EdgesGeometry, LineSegments } from 'three';
import { BufferAttribute } from 'three';

const _norm = new Vector3();
const _norm2 = new Vector3();
const _pos = new Vector3();
const _vec1 = new Vector3();
const _vec2 = new Vector3();

// Converts a geometry with a given set of groups rendering a smaller set of
// geometry into a new one with only the relevant triangles.
function toGroupGeometry( geometry ) {

	// non indexed makes this process easier
	geometry = geometry.toNonIndexed();

	// prep the arrays
	const { groups } = geometry;
	const { position, normal } = geometry.attributes;
	const newNorm = [];
	const newPos = [];

	// add the normals and the positions
	for ( const group of groups ) {

		const { start, count } = group;
		for ( let i = start, l = ( start + count ); i < l; i ++ ) {

			_vec1.fromBufferAttribute( position, i );
			_vec2.fromBufferAttribute( normal, i );

			newPos.push( ..._vec1 );
			newNorm.push( ..._vec2 );

		}

	}

	// set the new geometry
	const newGeometry = new BufferGeometry();
	newGeometry.setAttribute( 'position', new BufferAttribute( new Float32Array( newPos ), 3 ) );
	newGeometry.setAttribute( 'normal', new BufferAttribute( new Float32Array( newNorm ), 3 ) );

	return newGeometry;

}

function getRegionGeometry( ellipsoidRegion ) {

	// retrieve the relevant fields
	const {
		latStart = - Math.PI / 2, latEnd = Math.PI / 2,
		lonStart = 0, lonEnd = 2 * Math.PI,
		heightStart = 0, heightEnd = 0,
	} = ellipsoidRegion;

	// get the attributes
	const geometry = new BoxGeometry( 1, 1, 1, 32, 32 );
	const { normal, position } = geometry.attributes;

	// clone the position buffer so we can reference it for normal calculations later
	const refPosition = position.clone();

	// perturb the position buffer into an ellipsoid region
	for ( let i = 0, l = position.count; i < l; i ++ ) {

		_pos.fromBufferAttribute( position, i );

		const lat = MathUtils.mapLinear( _pos.x, - 0.5, 0.5, latStart, latEnd );
		const lon = MathUtils.mapLinear( _pos.y, - 0.5, 0.5, lonStart, lonEnd );

		let height = heightStart;
		ellipsoidRegion.getCartographicToNormal( lat, lon, _norm );
		if ( _pos.z < 0 ) {

			height = heightEnd;

		}
		ellipsoidRegion.getCartographicToPosition( lat, lon, height, _pos );
		position.setXYZ( i, ..._pos );

	}

	// compute the vertex normals so we can get the edge normals
	geometry.computeVertexNormals();

	// compute the top and bottom cap normals
	for ( let i = 0, l = refPosition.count; i < l; i ++ ) {

		_pos.fromBufferAttribute( refPosition, i );

		const lat = MathUtils.mapLinear( _pos.x, - 0.5, 0.5, latStart, latEnd );
		const lon = MathUtils.mapLinear( _pos.y, - 0.5, 0.5, lonStart, lonEnd );

		_norm.fromBufferAttribute( normal, i );
		ellipsoidRegion.getCartographicToNormal( lat, lon, _norm2 );

		// exclude the sides so we get sharp corners
		if ( Math.abs( _norm.dot( _norm2 ) ) > 0.1 ) {

			if ( _pos.z > 0 ) {

				_norm2.multiplyScalar( - 1 );

			}

			normal.setXYZ( i, ..._norm2 );

		}

	}

	return geometry;

}

export class EllipsoidRegionLineHelper extends LineSegments {

	constructor( ellipsoidRegion = new EllipsoidRegion(), color = 0xffff00 ) {

		super();
		this.ellipsoidRegion = ellipsoidRegion;
		this.material.color.set( color );
		this.update();

	}

	update() {

		const geometry = getRegionGeometry( this.ellipsoidRegion );
		this.geometry.dispose();
		this.geometry = new EdgesGeometry( geometry, 80 );

	}

	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}

export class EllipsoidRegionHelper extends Mesh {

	constructor( ellipsoidRegion = new EllipsoidRegion() ) {

		super();
		this.ellipsoidRegion = ellipsoidRegion;
		this.update();

	}

	update() {

		// dispose of the existing geometry
		this.geometry.dispose();

		// retrieve the relevant fields
		const geometry = getRegionGeometry( this.ellipsoidRegion );
		const { lonStart, lonEnd } = this;

		// exclude the side tris if the region wraps around
		if ( lonEnd - lonStart >= 2 * Math.PI ) {

			geometry.groups.splice( 2, 2 );
			this.geometry = toGroupGeometry( geometry );

		} else {

			this.geometry = geometry;

		}

	}

	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}
