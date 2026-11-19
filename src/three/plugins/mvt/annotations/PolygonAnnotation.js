import { MathUtils, Matrix4, Vector2, Vector3 } from 'three';

// longitude step used to sample the east direction of the local frame
const EAST_SAMPLE_DELTA = 1e-6;

// decimal digits of the radian coordinates used to match boundary vertices between the pieces of
// a polygon in neighboring tiles, about a meter on earth
const BOUNDARY_KEY_DIGITS = 7;

const _point = [ 0, 0 ];
const _origin = /* @__PURE__ */ new Vector3();
const _east = /* @__PURE__ */ new Vector3();
const _north = /* @__PURE__ */ new Vector3();
const _up = /* @__PURE__ */ new Vector3();
const _pos = /* @__PURE__ */ new Vector3();
const _invFrame = /* @__PURE__ */ new Matrix4();

// shoelace area of a ring in tile space, the sign giving the winding
function signedArea( ring ) {

	let area = 0;
	for ( let i = 0, l = ring.length, j = l - 1; i < l; j = i ++ ) {

		area += ( ring[ j ].x - ring[ i ].x ) * ( ring[ i ].y + ring[ j ].y );

	}

	return area;

}

// Clip a ring to the tile square using Sutherland-Hodgman, one edge of the square at a time.
// "axis" is the coordinate compared and "keepBelow" which side of "value" is kept.
function clipRingToEdge( ring, axis, value, keepBelow ) {

	const result = [];
	const inside = p => keepBelow ? p[ axis ] <= value : p[ axis ] >= value;
	for ( let i = 0, l = ring.length; i < l; i ++ ) {

		const curr = ring[ i ];
		const prev = ring[ ( i + l - 1 ) % l ];
		const currInside = inside( curr );
		const prevInside = inside( prev );

		if ( currInside !== prevInside ) {

			// intersection with the edge, snapped exactly onto it so boundary edges are detectable
			const t = ( value - prev[ axis ] ) / ( curr[ axis ] - prev[ axis ] );
			const point = {
				x: prev.x + ( curr.x - prev.x ) * t,
				y: prev.y + ( curr.y - prev.y ) * t,
			};
			point[ axis ] = value;
			result.push( point );

		}

		if ( currInside ) {

			result.push( curr );

		}

	}

	return result;

}

function clipRingToTile( ring, extent ) {

	ring = clipRingToEdge( ring, 'x', 0, false );
	ring = clipRingToEdge( ring, 'x', extent, true );
	ring = clipRingToEdge( ring, 'y', 0, false );
	ring = clipRingToEdge( ring, 'y', extent, true );
	return ring;

}

// whether the edge between the two points lies along the tile boundary
function isBoundaryEdge( p0, p1, extent ) {

	return (
		( p0.x === p1.x && ( p0.x === 0 || p0.x === extent ) ) ||
		( p0.y === p1.y && ( p0.y === 0 || p0.y === extent ) )
	);

}

// local frame on the surface with x east, y north, and z up
function getSurfaceFrame( surface, lat, lon, target ) {

	surface.getCartographicToPosition( lat, lon, 0, _origin );
	surface.getCartographicToNormal( lat, lon, _up );
	surface.getCartographicToPosition( lat, lon + EAST_SAMPLE_DELTA, 0, _east ).sub( _origin ).normalize();
	_north.crossVectors( _up, _east ).normalize();
	_east.crossVectors( _north, _up );

	return target.makeBasis( _east, _north, _up ).setPosition( _origin );

}

// Footprint polygon parsed from an MVT feature and clipped to its tile, with the exterior ring
// first and holes after
export class PolygonAnnotation {

	constructor() {

		this.id = '';
		this.layer = '';
		this.properties = {};
		this.lodLevel = 0;
		this.tileKey = '';

		// per ring: cartographic coordinates in radians, 2d points in the local frame, and whether
		// the edge starting at each point lies on the tile boundary
		this.rings = [];

		// whether the polygon was cut by the tile boundary, so the rest of it lies in another tile,
		// and keys for the vertices on the boundary, which the piece in the neighboring tile shares
		this.onBoundary = false;
		this.boundaryKeys = [];

		// exterior ring centroid and the local frame at it on the surface in tiles.group space
		this.lat = 0;
		this.lon = 0;
		this.frame = new Matrix4();

		// height of the lowest exterior vertex above the frame, found during settling
		this.baseHeight = 0;

		this.enabled = true;
		this.ready = false;

		// set when settling changes the base height so the renderer refreshes its transform
		this.needsUpdate = false;

	}

}

// Parse a single polygon feature into one annotation per polygon, clipped to the tile. The first
// ring's winding marks the exterior rings, matching vector-tile-js "classifyRings".
export function parsePolygonFeature( feature, layerName, level, tileBounds, tiling, surface, target = [] ) {

	const [ tMinX, tMinY, tMaxX, tMaxY ] = tileBounds;
	const { flipY, projection } = tiling;
	const extent = feature.extent;
	const id = `${ layerName }:${ feature.id }`;
	const start = target.length;

	let exteriorSign = 0;
	let annotation = null;
	for ( let ring of feature.loadGeometry() ) {

		const area = signedArea( ring );
		if ( area === 0 ) {

			continue;

		}

		if ( exteriorSign === 0 ) {

			exteriorSign = Math.sign( area );

		}

		const isExterior = Math.sign( area ) === exteriorSign;

		// drop the repeated closing point and the parts outside the tile
		const first = ring[ 0 ];
		const last = ring[ ring.length - 1 ];
		if ( first.x === last.x && first.y === last.y ) {

			ring = ring.slice( 0, - 1 );

		}

		ring = clipRingToTile( ring, extent );
		if ( ring.length < 3 ) {

			if ( isExterior ) {

				annotation = null;

			}

			continue;

		}

		if ( isExterior ) {

			annotation = new PolygonAnnotation();
			annotation.id = id;
			annotation.layer = layerName;
			annotation.properties = feature.properties;
			annotation.lodLevel = level;
			target.push( annotation );

		} else if ( annotation === null ) {

			continue;

		}

		const lat = [];
		const lon = [];
		const boundary = [];
		for ( let i = 0, l = ring.length; i < l; i ++ ) {

			const u = MathUtils.lerp( tMinX, tMaxX, ring[ i ].x / extent );
			const vf = ring[ i ].y / extent;
			const v = flipY
				? MathUtils.lerp( tMaxY, tMinY, vf )
				: MathUtils.lerp( tMinY, tMaxY, vf );

			projection.fromNormalizedToCartographic( u, v, _point );
			lon.push( _point[ 0 ] );
			lat.push( _point[ 1 ] );
			boundary.push( isBoundaryEdge( ring[ i ], ring[ ( i + 1 ) % l ], extent ) );

		}

		// both ends of a boundary edge are shared with the neighboring tile's piece
		for ( let i = 0, l = ring.length; i < l; i ++ ) {

			if ( boundary[ i ] ) {

				const next = ( i + 1 ) % l;
				annotation.onBoundary = true;
				annotation.boundaryKeys.push(
					`${ lat[ i ].toFixed( BOUNDARY_KEY_DIGITS ) }_${ lon[ i ].toFixed( BOUNDARY_KEY_DIGITS ) }`,
					`${ lat[ next ].toFixed( BOUNDARY_KEY_DIGITS ) }_${ lon[ next ].toFixed( BOUNDARY_KEY_DIGITS ) }`,
				);

			}

		}

		annotation.rings.push( { lat, lon, boundary, points: [] } );

	}

	// build the local frame at each exterior centroid and project the rings into it
	for ( let i = start, l = target.length; i < l; i ++ ) {

		const annotation = target[ i ];
		const { rings, frame } = annotation;
		const { lat, lon } = rings[ 0 ];

		let centerLat = 0;
		let centerLon = 0;
		for ( let j = 0, n = lat.length; j < n; j ++ ) {

			centerLat += lat[ j ] / n;
			centerLon += lon[ j ] / n;

		}

		annotation.lat = centerLat;
		annotation.lon = centerLon;
		getSurfaceFrame( surface, centerLat, centerLon, frame );
		_invFrame.copy( frame ).invert();

		for ( const ring of rings ) {

			for ( let j = 0, n = ring.lat.length; j < n; j ++ ) {

				surface.getCartographicToPosition( ring.lat[ j ], ring.lon[ j ], 0, _pos ).applyMatrix4( _invFrame );
				ring.points.push( new Vector2( _pos.x, _pos.y ) );

			}

		}

	}

	return target;

}
