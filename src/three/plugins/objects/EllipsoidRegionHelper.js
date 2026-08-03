import { Mesh, Vector3, MathUtils, BoxGeometry, BufferGeometry, LineSegments, BufferAttribute } from 'three';
import { EllipsoidRegion } from '3d-tiles-renderer/three';

const _norm = /* @__PURE__ */ new Vector3();
const _norm2 = /* @__PURE__ */ new Vector3();
const _pos = /* @__PURE__ */ new Vector3();
const _vec1 = /* @__PURE__ */ new Vector3();
const _vec2 = /* @__PURE__ */ new Vector3();
const _zAxis = /* @__PURE__ */ new Vector3( 0, 0, 1 );

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

function getRegionGeometry( ellipsoidRegion, segments = 32 ) {

	// retrieve the relevant fields
	const {
		latStart = - Math.PI / 2, latEnd = Math.PI / 2,
		lonStart = 0, lonEnd = 2 * Math.PI,
		heightStart = 0, heightEnd = 0,
	} = ellipsoidRegion;

	// get the attributes
	const geometry = new BoxGeometry( 1, 1, 1, segments, segments );
	const { normal, position } = geometry.attributes;

	// The box positions map linearly onto the region, and the box's axis-aligned face normals identify
	// which face each vertex is on
	for ( let i = 0, l = position.count; i < l; i ++ ) {

		// the box position maps to a cartographic coordinate; the z sign selects the inner / outer shell
		_pos.fromBufferAttribute( position, i );
		const lat = MathUtils.mapLinear( _pos.x, - 0.5, 0.5, latStart, latEnd );
		const lon = MathUtils.mapLinear( _pos.y, - 0.5, 0.5, lonStart, lonEnd );
		const outer = _pos.z < 0;

		// the box face normal tells us whether this vertex is on a cap or a side wall
		_norm.fromBufferAttribute( normal, i );

		// perturb onto the region surface
		ellipsoidRegion.getCartographicToPosition( lat, lon, outer ? heightEnd : heightStart, _pos );
		position.setXYZ( i, _pos.x, _pos.y, _pos.z );

		// analytic surface normal
		ellipsoidRegion.getCartographicToNormal( lat, lon, _norm2 );
		if ( _norm.z !== 0 ) {

			// caps
			_norm2.multiplyScalar( outer ? 1 : - 1 );

		} else {

			// side walls
			_vec1.crossVectors( _zAxis, _norm2 );
			if ( _vec1.lengthSq() < 1e-12 ) {

				_vec1.set( 1, 0, 0 );

			}

			_vec1.normalize();
			if ( _norm.x !== 0 ) {

				// constant-latitude wall faces north / south
				_norm2.crossVectors( _norm2, _vec1 ).normalize().multiplyScalar( Math.sign( _norm.x ) );

			} else {

				// constant-longitude wall faces east / west
				_norm2.copy( _vec1 ).multiplyScalar( Math.sign( _norm.y ) );

			}

		}

		normal.setXYZ( i, _norm2.x, _norm2.y, _norm2.z );

	}

	return geometry;

}

// Builds the 12 curved edges of a region's bounding box directly as line segments. This avoids
// tessellating a dense solid box and running "EdgesGeometry" over it per tile, which is expensive.
function getRegionLineGeometry( region, segments = 32 ) {

	const {
		latStart = - Math.PI / 2, latEnd = Math.PI / 2,
		lonStart = 0, lonEnd = 2 * Math.PI,
		heightStart = 0, heightEnd = 0,
	} = region;

	const positions = [];

	// sample a curved edge between two cartographic endpoints as connected line segments
	const addEdge = ( lat0, lon0, h0, lat1, lon1, h1 ) => {

		for ( let i = 0; i < segments; i ++ ) {

			const t0 = i / segments;
			const t1 = ( i + 1 ) / segments;

			region.getCartographicToPosition( MathUtils.lerp( lat0, lat1, t0 ), MathUtils.lerp( lon0, lon1, t0 ), MathUtils.lerp( h0, h1, t0 ), _vec1 );
			region.getCartographicToPosition( MathUtils.lerp( lat0, lat1, t1 ), MathUtils.lerp( lon0, lon1, t1 ), MathUtils.lerp( h0, h1, t1 ), _vec2 );

			positions.push( _vec1.x, _vec1.y, _vec1.z, _vec2.x, _vec2.y, _vec2.z );

		}

	};

	// top and bottom rings at each height extreme
	for ( const h of [ heightStart, heightEnd ] ) {

		addEdge( latStart, lonStart, h, latStart, lonEnd, h );
		addEdge( latEnd, lonStart, h, latEnd, lonEnd, h );
		addEdge( latStart, lonStart, h, latEnd, lonStart, h );
		addEdge( latStart, lonEnd, h, latEnd, lonEnd, h );

	}

	// vertical edges connecting the four corners between the two heights
	for ( const lat of [ latStart, latEnd ] ) {

		for ( const lon of [ lonStart, lonEnd ] ) {

			addEdge( lat, lon, heightStart, lat, lon, heightEnd );

		}

	}

	const geometry = new BufferGeometry();
	geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( positions ), 3 ) );
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

		this.geometry.dispose();
		this.geometry = getRegionLineGeometry( this.ellipsoidRegion );

	}

	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}

export class EllipsoidRegionHelper extends Mesh {

	constructor( ellipsoidRegion = new EllipsoidRegion(), color = 0xffff00 ) {

		super();
		this.ellipsoidRegion = ellipsoidRegion;
		this.material.color.set( color );
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
