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

		// tile this path came from
		this.lodLevel = 0;
		this.range = null;

		// per-sample cartographic coordinates in radians
		this.lat = [];
		this.lon = [];

		// per-sample settled positions in tiles.group local space, filled during settling
		this.positions = [];

		// anchors placed along the path, each `{ i0, i1, alpha, lat, lon }`
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

	// TODO: is this necessary?
	// TODO: review / simplify this
	const leftIndex = {};
	const rightIndex = {};
	const merged = [];
	let count = 0;

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

}

// Densify a polyline in tile coordinate space so no gap between consecutive samples
// exceeds "spacing", preserving the original vertices. "spacing" is constant in tile
// space, the geographic sample density scales with the tile's LoD automatically.
function subsamplePath( points, spacing ) {

	const result = [];
	for ( let i = 0, l = points.length - 1; i < l; i ++ ) {

		const p0 = points[ i ];
		const p1 = points[ i + 1 ];
		result.push( p0 );

		const dx = p1.x - p0.x;
		const dy = p1.y - p0.y;
		const dist = Math.sqrt( dx * dx + dy * dy );
		const steps = Math.ceil( dist / spacing );
		for ( let s = 1; s < steps; s ++ ) {

			const t = s / steps;
			result.push( {
				x: MathUtils.lerp( p0.x, p1.x, t ),
				y: MathUtils.lerp( p0.y, p1.y, t ),
			} );

		}

	}

	result.push( points[ points.length - 1 ] );
	return result;

}

// Place anchors along a path at a fixed "spacing" (geographic, in radians), recording the
// bounding sample indices. Short paths receive a single anchor at their midpoint.
function placeAnchors( line, spacing ) {

	const { lat, lon } = line;

	// segment lengths and total length in cartographic space so anchor count tracks the
	// path's real-world length rather than the tile's size
	const segLengths = [];
	let totalLength = 0;
	for ( let i = 0, l = lat.length - 1; i < l; i ++ ) {

		const lat0 = lat[ i ];
		const lat1 = lat[ i + 1 ];

		const lon0 = lon[ i ];
		const lon1 = lon[ i + 1 ];

		// TODO: we should figure out a better way to handle this spacing...
		const latMid = 0.5 * ( lat0 + lat1 );
		const dLat = lat1 - lat0;
		const dLon = ( lon1 - lon0 ) * Math.cos( latMid );
		const d = Math.sqrt( dLat * dLat + dLon * dLon );
		segLengths.push( d );
		totalLength += d;

	}

	// first anchor offset half a spacing in, fall back to the midpoint for
	// short paths
	let target = spacing * 0.5;
	if ( target > totalLength ) {

		target = totalLength * 0.5;

	}

	let currLength = 0;
	let currIndex = 0;
	const anchorCandidates = [];
	while ( target <= totalLength ) {

		// advance to the segment containing "target"
		while ( currIndex < segLengths.length && currLength + segLengths[ currIndex ] < target ) {

			currLength += segLengths[ currIndex ];
			currIndex ++;

		}

		if ( currIndex >= segLengths.length ) {

			break;

		}

		const i0 = currIndex;
		const i1 = currIndex + 1;
		const d0 = segLengths[ i0 ];
		const alpha = d0 > 0 ? ( target - currLength ) / d0 : 0;

		anchorCandidates.push( {
			i0,
			i1,
			alpha,
			lat: MathUtils.lerp( lat[ i0 ], lat[ i1 ], alpha ),
			lon: MathUtils.lerp( lon[ i0 ], lon[ i1 ], alpha ),
		} );

		target += spacing;

	}

	return anchorCandidates;

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
		// anchor spacing in radians ( geographic ) — ~250 m on the WGS84 ellipsoid. Density
		// tracks real-world length, independent of the tile's zoom / size
		anchorSpacing = 250 / 6378137,
	} = options;

	const tileBounds = tiling.getTileBounds( x, y, level, true, false );
	const [ tMinX, tMinY, tMaxX, tMaxY ] = tileBounds;
	const { flipY } = tiling;

	// the tile's cartographic range, shared by every line parsed from it
	// TODO: this is not a good way to handle the range...
	const cornerA = tiling.toCartographicPoint( tMinX, tMinY );
	const cornerB = tiling.toCartographicPoint( tMaxX, tMaxY );
	const range = {
		minLon: Math.min( cornerA[ 0 ], cornerB[ 0 ] ),
		maxLon: Math.max( cornerA[ 0 ], cornerB[ 0 ] ),
		minLat: Math.min( cornerA[ 1 ], cornerB[ 1 ] ),
		maxLat: Math.max( cornerA[ 1 ], cornerB[ 1 ] ),
	};

	const lineAnnotations = [];

	for ( const layerName in vectorTile.layers ) {

		const layer = vectorTile.layers[ layerName ];
		const extent = layer.extent;
		const spacing = extent * subsampleFraction;

		// collect every line fragment in the layer in tile coordinate space
		const segments = [];
		for ( let i = 0; i < layer.length; i ++ ) {

			const feature = layer.feature( i );

			// skip non-line features
			if ( feature.type !== 2 ) {

				continue;

			}

			// skip lines that don't match the filter
			if ( ! filter( layerName, feature.properties ) ) {

				continue;

			}

			// feature.id is the OSM element id preserved across LoDs — the paths's stable key
			const id = `${ layerName }:${ feature.id }`;
			const geometry = feature.loadGeometry();
			for ( const line of geometry ) {

				segments.push( {
					key: id,
					id,
					properties: feature.properties,
					points: line,
				} );

			}

		}

		// stitch fragments into coherent paths, then densify and project to cartographic
		// TODO: is this stitching needed?
		const stitched = stitchSegments( segments );

		for ( const seg of stitched ) {

			const subSampledPoints = subsamplePath( seg.points, spacing );

			// init the annotation
			const annotation = new LineAnnotation();
			annotation.id = seg.id;
			annotation.layer = layerName;
			annotation.properties = seg.properties;
			annotation.lodLevel = level;
			annotation.range = range;

			// construct the lat / lon points
			for ( const point of subSampledPoints ) {

				// tile Y=0 is geographic north; with flipY the V axis increases northward
				const u = MathUtils.lerp( tMinX, tMaxX, point.x / extent );
				const vf = point.y / extent;

				// TODO: is this not already accounted for in the toCartographicPoint?
				const v = flipY
					? MathUtils.lerp( tMaxY, tMinY, vf )
					: MathUtils.lerp( tMinY, tMaxY, vf );

				const [ lon, lat ] = tiling.toCartographicPoint( u, v );
				annotation.lon.push( lon );
				annotation.lat.push( lat );
				annotation.positions.push( new Vector3() );

			}

			// construct the anchors
			annotation.anchors = placeAnchors( annotation, anchorSpacing );

			// append the annotation
			lineAnnotations.push( annotation );

		}

	}

	return lineAnnotations;

}
