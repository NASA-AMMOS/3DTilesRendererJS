import { MathUtils, Vector3 } from 'three';

/**
 * A stitched, subsampled polyline parsed from MVT line ( type 2 ) content. Holds the
 * per-sample cartographic coordinates and a parallel array of settled world positions
 * ( populated later during raycast settling ), plus the feature metadata.
 *
 * This is the unit of "settling" for labeled lines. It is intentionally NOT registered
 * directly into the screen occupation grid — anchors derived from these paths are what
 * occupy the grid.
 * @private
 */
export class LineAnnotation {

	/**
	 * Number of samples in the path.
	 * @returns {number}
	 */
	get count() {

		return this.lat.length;

	}

	constructor() {

		// stable feature id ( `${ layerName }:${ feature.id }` ), used for cross-LoD association
		this.id = '';
		this.layer = '';
		this.properties = null;

		// tile this path came from: LoD level and cartographic range ( radians )
		this.lodLevel = 0;
		this.range = null;

		// per-sample cartographic coordinates in radians
		this.lat = [];
		this.lon = [];

		// per-sample settled positions in tiles.group local space, filled during settling
		this.positions = [];

		// anchors placed along the path, each `{ i0, i1, alpha, lat, lon }` — a point on the
		// segment between samples i0 and i1 at interpolant alpha
		this.anchors = [];

		// becomes true once every sample has been settled onto the surface
		this.ready = false;

	}

}

// Merge line fragments that share an endpoint and the same key into single polylines.
// Port of maplibre-gl-js src/symbol/merge_lines.ts, generalized to operate on plain
// { key, id, properties, points } segments. Merging is confined to matching keys so
// distinct roads with coincident endpoints are never joined.
function stitchSegments( segments ) {

	const leftIndex = {};
	const rightIndex = {};
	const merged = [];
	let count = 0;

	function endKey( seg, onRight ) {

		const point = onRight ? seg.points[ seg.points.length - 1 ] : seg.points[ 0 ];
		return `${ seg.key }:${ point.x }:${ point.y }`;

	}

	function add( seg ) {

		merged.push( seg );
		count ++;

	}

	function mergeFromRight( leftKey, rightKey, points ) {

		const i = rightIndex[ leftKey ];
		delete rightIndex[ leftKey ];
		rightIndex[ rightKey ] = i;

		merged[ i ].points.pop();
		merged[ i ].points = merged[ i ].points.concat( points );
		return i;

	}

	function mergeFromLeft( leftKey, rightKey, points ) {

		const i = leftIndex[ rightKey ];
		delete leftIndex[ rightKey ];
		leftIndex[ leftKey ] = i;

		merged[ i ].points.shift();
		merged[ i ].points = points.concat( merged[ i ].points );
		return i;

	}

	for ( const seg of segments ) {

		const leftKey = endKey( seg, false );
		const rightKey = endKey( seg, true );

		if ( ( leftKey in rightIndex ) && ( rightKey in leftIndex ) && ( rightIndex[ leftKey ] !== leftIndex[ rightKey ] ) ) {

			// fragments adjacent to both ends — merge all three
			const j = mergeFromLeft( leftKey, rightKey, seg.points );
			const i = mergeFromRight( leftKey, rightKey, merged[ j ].points );

			delete leftIndex[ leftKey ];
			delete rightIndex[ rightKey ];

			rightIndex[ endKey( merged[ i ], true ) ] = i;
			merged[ j ].points = null;

		} else if ( leftKey in rightIndex ) {

			// fragment adjacent to the start of the current segment
			mergeFromRight( leftKey, rightKey, seg.points );

		} else if ( rightKey in leftIndex ) {

			// fragment adjacent to the end of the current segment
			mergeFromLeft( leftKey, rightKey, seg.points );

		} else {

			// no adjacent fragment — seed a new merged segment
			add( seg );
			leftIndex[ leftKey ] = count - 1;
			rightIndex[ rightKey ] = count - 1;

		}

	}

	return merged.filter( seg => seg.points );

}

// Densify a polyline ( in tile coordinate space ) so no gap between consecutive samples
// exceeds `spacing`, preserving the original vertices. Because `spacing` is constant in
// tile space, the geographic sample density scales with the tile's LoD automatically.
function subsamplePath( points, spacing ) {

	const result = [];
	for ( let i = 0; i < points.length - 1; i ++ ) {

		const a = points[ i ];
		const b = points[ i + 1 ];
		result.push( a );

		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const dist = Math.sqrt( dx * dx + dy * dy );
		const steps = Math.floor( dist / spacing );
		for ( let s = 1; s <= steps; s ++ ) {

			const t = s * spacing / dist;
			if ( t >= 1 ) {

				break;

			}

			result.push( { x: a.x + dx * t, y: a.y + dy * t } );

		}

	}

	result.push( points[ points.length - 1 ] );
	return result;

}

// Place anchors along a path at a fixed `spacing` ( in tile coordinate space ), recording
// the bounding sample indices and interpolant so a settled 3D position can be recovered
// later. Short paths receive a single anchor at their midpoint.
function placeAnchors( sampled, lat, lon, spacing ) {

	const anchors = [];

	// segment lengths and total length in tile space
	const segLengths = [];
	let totalLength = 0;
	for ( let i = 0, l = sampled.length - 1; i < l; i ++ ) {

		const dx = sampled[ i + 1 ].x - sampled[ i ].x;
		const dy = sampled[ i + 1 ].y - sampled[ i ].y;
		const d = Math.sqrt( dx * dx + dy * dy );
		segLengths.push( d );
		totalLength += d;

	}

	if ( totalLength === 0 ) {

		return anchors;

	}

	// first anchor offset half a spacing in; fall back to the midpoint for short paths
	let target = spacing * 0.5;
	if ( target > totalLength ) {

		target = totalLength * 0.5;

	}

	let accum = 0;
	let seg = 0;
	while ( target <= totalLength ) {

		// advance to the segment containing `target`
		while ( seg < segLengths.length && accum + segLengths[ seg ] < target ) {

			accum += segLengths[ seg ];
			seg ++;

		}

		if ( seg >= segLengths.length ) {

			break;

		}

		const i0 = seg;
		const i1 = seg + 1;
		const alpha = segLengths[ seg ] > 0 ? ( target - accum ) / segLengths[ seg ] : 0;

		anchors.push( {
			i0,
			i1,
			alpha,
			lat: MathUtils.lerp( lat[ i0 ], lat[ i1 ], alpha ),
			lon: MathUtils.lerp( lon[ i0 ], lon[ i1 ], alpha ),
		} );

		target += spacing;

	}

	return anchors;

}

/**
 * Parse all labeled line ( type 2 ) features from a decoded MVT tile into a set of
 * stitched, subsampled {@link LineAnnotation} instances.
 *
 * @private
 * @param {Object} vectorTile - The decoded vector tile ( `{ layers }` ).
 * @param {number} x - Tile column.
 * @param {number} y - Tile row.
 * @param {number} level - Tile zoom level; stored as `lodLevel` and drives sample density.
 * @param {Object} tiling - The overlay tiling helper ( `getTileBounds`, `toCartographicPoint`, `flipY` ).
 * @param {Object} [options={}]
 * @param {( layerName: string, properties: Object ) => boolean} [options.filter] - Return
 *   true to include a feature. Defaults to including everything.
 * @param {number} [options.subsampleFraction=1/64] - Maximum sample spacing as a fraction
 *   of the layer extent.
 * @returns {LineAnnotation[]}
 */
export function parseLineAnnotations( vectorTile, x, y, level, tiling, options = {} ) {

	const {
		filter = () => true,
		subsampleFraction = 1 / 64,
		// anchor spacing as a fraction of the tile extent
		anchorFraction = 1 / 16,
	} = options;

	const tileBounds = tiling.getTileBounds( x, y, level, true, false );
	const [ tMinX, tMinY, tMaxX, tMaxY ] = tileBounds;
	const { flipY } = tiling;

	// the tile's cartographic range, shared by every line parsed from it
	const cornerA = tiling.toCartographicPoint( tMinX, tMinY );
	const cornerB = tiling.toCartographicPoint( tMaxX, tMaxY );
	const range = {
		minLon: Math.min( cornerA[ 0 ], cornerB[ 0 ] ),
		maxLon: Math.max( cornerA[ 0 ], cornerB[ 0 ] ),
		minLat: Math.min( cornerA[ 1 ], cornerB[ 1 ] ),
		maxLat: Math.max( cornerA[ 1 ], cornerB[ 1 ] ),
	};

	const annotations = [];

	for ( const layerName in vectorTile.layers ) {

		const layer = vectorTile.layers[ layerName ];
		const extent = layer.extent;
		const spacing = extent * subsampleFraction;
		const anchorSpacing = extent * anchorFraction;

		// collect every line fragment in the layer in tile coordinate space
		const segments = [];
		for ( let i = 0; i < layer.length; i ++ ) {

			const feature = layer.feature( i );
			if ( feature.type !== 2 ) {

				continue;

			}

			if ( ! filter( layerName, feature.properties ) ) {

				continue;

			}

			// feature.id is the OSM element id preserved across LoDs — the road's stable key
			const id = `${ layerName }:${ feature.id }`;
			const geometry = feature.loadGeometry();
			for ( const line of geometry ) {

				if ( line.length < 2 ) {

					continue;

				}

				segments.push( {
					key: id,
					id,
					properties: feature.properties,
					points: line.map( p => ( { x: p.x, y: p.y } ) ),
				} );

			}

		}

		// stitch fragments into coherent paths, then densify and project to cartographic
		const stitched = stitchSegments( segments );
		for ( const seg of stitched ) {

			const sampled = subsamplePath( seg.points, spacing );
			const annotation = new LineAnnotation();
			annotation.id = seg.id;
			annotation.layer = layerName;
			annotation.properties = seg.properties;
			annotation.lodLevel = level;
			annotation.range = range;

			for ( const point of sampled ) {

				const u = MathUtils.lerp( tMinX, tMaxX, point.x / extent );
				// tile Y=0 is geographic north; with flipY the V axis increases northward
				const vf = point.y / extent;
				const v = flipY
					? MathUtils.lerp( tMaxY, tMinY, vf )
					: MathUtils.lerp( tMinY, tMaxY, vf );

				const [ lon, lat ] = tiling.toCartographicPoint( u, v );
				annotation.lon.push( lon );
				annotation.lat.push( lat );
				annotation.positions.push( new Vector3() );

			}

			annotation.anchors = placeAnchors( sampled, annotation.lat, annotation.lon, anchorSpacing );
			annotations.push( annotation );

		}

	}

	return annotations;

}
