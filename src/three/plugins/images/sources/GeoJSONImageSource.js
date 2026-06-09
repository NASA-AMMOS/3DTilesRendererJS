import { CanvasTexture, MathUtils, Vector3, SRGBColorSpace } from 'three';
import { RegionImageSource } from './RegionImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { VectorShapeCanvasRenderer } from '../utils/VectorShapeCanvasRenderer.js';
import { WGS84_ELLIPSOID } from '3d-tiles-renderer/three';

// TODO: Consider option to support world-space thickness definitions. Eg world-space point size or line thickness in meters.

const GEOMETRY_TYPES = new Set( [ 'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon' ] );

// function for calculating the the change in arc length at a given cartographic point
// in order to preserve a circular look when drawing points
const _v0 = /* @__PURE__ */ new Vector3();
const _v1 = /* @__PURE__ */ new Vector3();
function calculateArcRatioAtPoint( ellipsoid, lat, lon ) {

	const DELTA = 0.01;
	ellipsoid.getCartographicToPosition( lat, lon, 0, _v0 );
	ellipsoid.getCartographicToPosition( lat + DELTA, lon, 0, _v1 );

	const latDelta = _v0.distanceTo( _v1 );
	ellipsoid.getCartographicToPosition( lat, lon + DELTA, 0, _v1 );

	const lonDelta = _v0.distanceTo( _v1 );
	return lonDelta / latDelta;

}

export class GeoJSONImageSource extends RegionImageSource {

	constructor( {
		geojson = null,
		url = null, // URL or GeoJson object can be provided
		resolution = 256,
		pointRadius = 6,
		strokeStyle = 'white',
		strokeWidth = 2,
		fillStyle = 'rgba( 255, 255, 255, 0.5 )',
		getStyle = ( ( _feature, properties ) => ( {
			fill: properties.fillStyle || this.fillStyle,
			stroke: properties.strokeStyle || this.strokeStyle,
			strokeWidth: properties.strokeWidth || this.strokeWidth,
			radius: properties.pointRadius || this.pointRadius,
		} ) ),
		...rest
	} = {} ) {

		super( rest );
		this.geojson = geojson;
		this.url = url;
		this.resolution = resolution;

		this.pointRadius = pointRadius;
		this.strokeStyle = strokeStyle;
		this.strokeWidth = strokeWidth;
		this.fillStyle = fillStyle;
		this.getStyle = getStyle;

		this.features = null;
		this.featureBounds = new Map();
		this.contentBounds = null;

		this.projection = new ProjectionScheme();
		this.fetchData = ( ...args ) => fetch( ...args );
		this._canvasRenderer = new VectorShapeCanvasRenderer( {
			flipY: true,
			getX: p => p[ 0 ],
			getY: p => p[ 1 ],
		} );

	}

	async init() {

		const { geojson, url } = this;

		// If a URL was provided and no geojson object yet, fetch it now (use fetchData so overlay can inject headers)
		if ( ! geojson && url ) {

			const res = await this.fetchData( url );
			this.geojson = await res.json();

		}

		this._updateCache( true );

	}

	hasContent( minX, minY, maxX, maxY ) {

		// TODO: only return true if there are features within the range
		// TODO: this won't get "dirtied" - no textures will be generated for those cases
		// where "false" has already been returned on redraw. How to fix? Return a "false"
		// target to fill in later if needed?
		// TODO: we may want to include the LoD or resolution or something here, as well, since that will
		// impact the size of the points, etc.

		const boundsDeg = [ minX, minY, maxX, maxY ].map( v => v * Math.RAD2DEG );
		return this._boundsIntersectBounds( boundsDeg, this.contentBounds );

	}

	// main fetch per region -> returns CanvasTexture
	fetchItem( tokens, signal ) {

		// create canvas
		const canvas = document.createElement( 'canvas' );
		const tex = new CanvasTexture( canvas );
		tex.colorSpace = SRGBColorSpace;
		tex.generateMipmaps = false;

		this._drawToCanvas( canvas, tokens );
		tex.needsUpdate = true;

		return tex;

	}

	disposeItem( texture ) {

		if ( texture ) {

			texture.dispose();

		}

	}

	redraw( ...args ) {

		const tex = this.get( ...args );
		if ( ! tex ) {

			return;

		}

		this._drawToCanvas( tex.image, args );
		tex.needsUpdate = true;

	}

	_updateCache( force = false ) {

		// TODO: if we "bake" shapes or geometries to Path2Ds the redraw performance
		// can improve by up to 2x.

		const { geojson, featureBounds } = this;
		if ( ! geojson || ( this.features && ! force ) ) {

			return;

		}

		featureBounds.clear();

		let minLon = Infinity;
		let minLat = Infinity;
		let maxLon = - Infinity;
		let maxLat = - Infinity;

		// extract the relevant features
		this.features = this._featuresFromGeoJSON( geojson );
		for ( const feature of this.features ) {

			// save the feature bounds
			const bounds = this._getFeatureBounds( feature );
			featureBounds.set( feature, bounds );

			// expand full content bounds
			const [ fMinLon, fMinLat, fMaxLon, fMaxLat ] = bounds;
			minLon = Math.min( minLon, fMinLon );
			minLat = Math.min( minLat, fMinLat );
			maxLon = Math.max( maxLon, fMaxLon );
			maxLat = Math.max( maxLat, fMaxLat );

		}

		this.contentBounds = [ minLon, minLat, maxLon, maxLat ];

	}

	_drawToCanvas( canvas, tokens ) {

		this._updateCache();

		const [ minX, minY, maxX, maxY ] = tokens;
		const { projection, resolution, features, _canvasRenderer } = this;

		canvas.width = resolution;
		canvas.height = resolution;

		// Convert normalized range to degrees for rendering
		const minLonRad = projection.convertNormalizedToLongitude( minX );
		const minLatRad = projection.convertNormalizedToLatitude( minY );
		const maxLonRad = projection.convertNormalizedToLongitude( maxX );
		const maxLatRad = projection.convertNormalizedToLatitude( maxY );
		const regionBoundsDeg = [
			minLonRad * MathUtils.RAD2DEG,
			minLatRad * MathUtils.RAD2DEG,
			maxLonRad * MathUtils.RAD2DEG,
			maxLatRad * MathUtils.RAD2DEG,
		];

		const ctx = canvas.getContext( '2d' );
		_canvasRenderer.setFrame( ctx, regionBoundsDeg, regionBoundsDeg );

		for ( const feature of features ) {

			// TODO: Add support for padding of tiles to avoid clipping "wide" elements that may extend beyond
			// edge of the bounds like stroke, point size.
			if ( this._featureIntersectsTile( feature, regionBoundsDeg ) ) {

				this._drawFeatureOnCanvas( feature, regionBoundsDeg, resolution );

			}

		}

	}

	// bounding box quick test in projected units
	_featureIntersectsTile( feature, boundsDeg ) {

		const featureBoundsDeg = this.featureBounds.get( feature );
		if ( ! featureBoundsDeg ) {

			return false;

		}

		return this._boundsIntersectBounds( featureBoundsDeg, boundsDeg );

	}

	_boundsIntersectBounds( bounds1, bounds2 ) {

		// check for intersection between bounds
		const [ minX1, minY1, maxX1, maxY1 ] = bounds1;
		const [ minX2, minY2, maxX2, maxY2 ] = bounds2;
		return ! ( maxX1 < minX2 || minX1 > maxX2 || maxY1 < minY2 || minY1 > maxY2 );

	}

	_getFeatureBounds( feature ) {

		const { geometry } = feature;
		if ( ! geometry ) {

			return null;

		}

		const { type, coordinates } = geometry;
		let minLon = Infinity;
		let minLat = Infinity;
		let maxLon = - Infinity;
		let maxLat = - Infinity;

		const expandBoundsByPoint = ( lon, lat ) => {

			minLon = Math.min( minLon, lon );
			maxLon = Math.max( maxLon, lon );
			minLat = Math.min( minLat, lat );
			maxLat = Math.max( maxLat, lat );

		};

		if ( type === 'Point' ) {

			expandBoundsByPoint( coordinates[ 0 ], coordinates[ 1 ] );

		} else if ( type === 'MultiPoint' || type === 'LineString' ) {

			coordinates.forEach( c => expandBoundsByPoint( c[ 0 ], c[ 1 ] ) );

		} else if ( type === 'MultiLineString' || type === 'Polygon' ) {

			coordinates.forEach( ring => ring.forEach( c => expandBoundsByPoint( c[ 0 ], c[ 1 ] ) ) );

		} else if ( type === 'MultiPolygon' ) {

			coordinates.forEach( polygon =>
				polygon.forEach( ring => ring.forEach( c => expandBoundsByPoint( c[ 0 ], c[ 1 ] ) ) ),
			);

		}

		return [ minLon, minLat, maxLon, maxLat ];

	}

	// Normalize top-level geojson into an array of Feature objects
	_featuresFromGeoJSON( root ) {

		const type = root.type;

		if ( type === 'FeatureCollection' ) {

			return root.features;

		} else if ( type === 'Feature' ) {

			return [ root ];

		} else if ( type === 'GeometryCollection' ) {

			return root.geometries.map( g => ( { type: 'Feature', geometry: g, properties: {} } ) );

		} else if ( GEOMETRY_TYPES.has( type ) ) {

			return [ { type: 'Feature', geometry: root, properties: {} } ];

		} else {

			return [];

		}

	}

	// draw feature on canvas ( assumes intersects already )
	_drawFeatureOnCanvas( feature, tileBoundsDeg, height ) {

		const { geometry = null, properties = {} } = feature;
		if ( ! geometry ) {

			return;

		}

		const [ , minLatDeg, , maxLatDeg ] = tileBoundsDeg;
		const { _canvasRenderer } = this;
		const style = this.getStyle( feature, properties );

		_canvasRenderer.setStyle( style );

		const type = geometry.type;

		if ( type === 'Point' || type === 'MultiPoint' ) {

			// Radius in geographic units (degrees) so the canvas transform handles positioning.
			_canvasRenderer.radius = style.radius * ( maxLatDeg - minLatDeg ) / height;
			const points = type === 'Point' ? [ geometry.coordinates ] : geometry.coordinates;
			for ( const point of points ) {

				// TODO: this should use the ellipsoid defined on the relevant tiles renderer
				const arcRatio = calculateArcRatioAtPoint(
					WGS84_ELLIPSOID,
					point[ 1 ] * MathUtils.DEG2RAD,
					point[ 0 ] * MathUtils.DEG2RAD,
				);
				const pointGroup = [ point ];
				_canvasRenderer._renderPoints( [ pointGroup ], arcRatio );

			}

		} else if ( type === 'LineString' ) {

			_canvasRenderer._renderLines( [ geometry.coordinates ] );

		} else if ( type === 'MultiLineString' ) {

			_canvasRenderer._renderLines( geometry.coordinates );

		} else if ( type === 'Polygon' ) {

			_canvasRenderer._renderPolygons( geometry.coordinates );

		} else if ( type === 'MultiPolygon' ) {

			geometry.coordinates.forEach( polygon => _canvasRenderer._renderPolygons( polygon ) );

		}

	}

}
