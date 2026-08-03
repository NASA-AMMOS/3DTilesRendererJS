import { Mesh, Vector3, MathUtils, BoxGeometry, BufferGeometry, LineSegments, BufferAttribute } from 'three';
import { EllipsoidRegion } from '3d-tiles-renderer/three';

const _norm = /* @__PURE__ */ new Vector3();
const _norm2 = /* @__PURE__ */ new Vector3();
const _pos = /* @__PURE__ */ new Vector3();
const _vec1 = /* @__PURE__ */ new Vector3();
const _vec2 = /* @__PURE__ */ new Vector3();

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

function getRegionGeometry( ellipsoidRegion, { computeNormals = false } = {} ) {

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

	if ( computeNormals ) {

		// compute the vertex normals so we can get the edge normals
		geometry.computeVertexNormals();

	}

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
		const geometry = getRegionGeometry( this.ellipsoidRegion, { computeNormals: true } );
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
