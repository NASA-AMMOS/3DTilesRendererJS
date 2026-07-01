import { MathUtils, Vector3, Vector2, Matrix4 } from 'three';
import { OccupancyAnnotation } from '../ScreenOccupationManager.js';

// Share path annotation used for text anchors
export class LineAnnotation extends OccupancyAnnotation {

	// number of points in the path
	get count() {

		return this.lat.length;

	}

	// number of anchors
	get anchorCount() {

		return this.anchorPositions.length;

	}

	constructor() {

		super();

		// the range of the tile this line is associated with
		this.range = null;

		// per-sample cartographic coordinates in radians
		this.lat = [];
		this.lon = [];

		// per-sample settled positions in tiles.group local space, filled during settling
		this.positions = [];

		// anchors placed along the path, each `{ i0, i1, alpha, lat, lon, ref }`
		this.anchorPositions = [];

		// screen positions and dirty variables
		this.screenPositions = [];
		this.cumulativeLen = [];
		this.cachedMatrix = new Matrix4();
		this.cachedResolution = new Vector2();

	}

	hasCoverage( lat, lon ) {

		const [ minLon, minLat, maxLon, maxLat ] = this.range;
		return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;

	}

	evaluate() {

		throw new Error();

	}

	updateTransform( matrix, resolution, cameraPosition ) {

		const { positions, screenPositions, cachedMatrix, cachedResolution, cumulativeLen } = this;
		if ( cachedMatrix.equals( matrix ) && cachedResolution.equals( resolution ) ) {

			return;

		}

		cachedMatrix.copy( matrix );
		cachedResolution.copy( resolution );

		while ( screenPositions.length < positions.length ) {

			screenPositions.push( new Vector3() );

		}

		for ( let i = 0, l = screenPositions.length; i < l; i ++ ) {

			const position = positions[ i ];
			const screenPos = screenPositions[ i ];

			// project to screen space
			screenPos.copy( position ).applyMatrix4( matrix );

			// transform to resolution coordinates
			screenPos.x = ( screenPos.x * 0.5 + 0.5 ) * resolution.width;
			screenPos.y = ( - screenPos.y * 0.5 + 0.5 ) * resolution.height;
			screenPos.z = MathUtils.mapLinear( screenPos.z, - 1, 1, 0, 1 );

		}

		cumulativeLen.length = screenPositions.length;
		cumulativeLen[ 0 ] = 0;
		for ( let i = 1; i < screenPositions.length; i ++ ) {

			const a = screenPositions[ i - 1 ];
			const b = screenPositions[ i ];
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			cumulativeLen[ i ] = cumulativeLen[ i - 1 ] + Math.sqrt( dx * dx + dy * dy );

		}

	}

	// Place anchors along a path at a fixed "spacing" (geographic, in radians), recording the
	// bounding sample indices. Short paths receive a single anchor at their midpoint.
	generateAnchors( spacing ) {

		const { lat, lon } = this;

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

				ref: null,
				lat: MathUtils.lerp( lat[ i0 ], lat[ i1 ], alpha ),
				lon: MathUtils.lerp( lon[ i0 ], lon[ i1 ], alpha ),
			} );

			target += spacing;

		}

		this.anchorPositions = anchorCandidates;

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


// parse the vector tile geometry into line annotations
export function parseLineAnnotations( vectorTile, x, y, level, tiling, filter, target = [] ) {

	// TODO: this needs to scale based on LoD rather than a fixed - this is hackily-scaled below
	// anchor spacing in radians ( geographic ). Density
	// tracks real-world length, independent of the tile's zoom / size
	const anchorSpacing = 500000 / 6378137;
	const subsampleFraction = 1 / 64;
	const tileBounds = tiling.getTileBounds( x, y, level, true, false );
	const [ tMinX, tMinY, tMaxX, tMaxY ] = tileBounds;
	const { flipY } = tiling;

	const range = tiling.getTileBounds( x, y, level, false, false );
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
			if ( ! filter( layerName, feature.properties, feature.type ) ) {

				continue;

			}

			// feature.id is the OSM element id preserved across LoDs — the paths's stable key
			const id = `${ layerName }:${ feature.properties.name || feature.id }`;
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

		for ( const seg of segments ) {

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

				// TODO: is this not already accounted for in the toCartographicPoint? Is this supposed to
				// just be ALWAYS true? This seems to be a flip of the internal content rather than the
				// overall tiling?
				const v = flipY
					? MathUtils.lerp( tMaxY, tMinY, vf )
					: MathUtils.lerp( tMinY, tMaxY, vf );

				const [ lon, lat ] = tiling.toCartographicPoint( u, v );
				annotation.lon.push( lon );
				annotation.lat.push( lat );
				annotation.positions.push( new Vector3() );

			}

			// construct the anchors
			annotation.generateAnchors( anchorSpacing * ( range[ 2 ] - range[ 0 ] ) );

			// append the annotation
			target.push( annotation );

		}

	}

	return target;

}
