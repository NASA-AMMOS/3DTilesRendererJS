import { CanvasTexture, MathUtils, Vector3, SRGBColorSpace } from 'three';
import { RegionImageSource } from './RegionImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { WGS84_ELLIPSOID } from '3d-tiles-renderer/three';

// TODO: Add support for limited bounds
// TODO: Add support for padding of tiles to avoid clipping "wide" elements
// TODO: Need to clip / fix geojson shapes across the 180 degree boundary
// TODO: Add support for easy regeneration when colors / styles / geojson change
// TODO: Consider option to support world-space thickness definitions. Eg world-space point size or line thickness in meters.

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

		this.projection = new ProjectionScheme();
		this.contentBounds = null;
		this.fetchData = ( ...args ) => fetch( ...args );

	}

	async init() {

		const { geojson, url } = this;

		// If a URL was provided and no geojson object yet, fetch it now (use fetchData so overlay can inject headers)
		if ( ! geojson && url ) {

			const res = await this.fetchData( url );
			this.geojson = await res.json();

		}

		// Compute bounds from GeoJSON data
		// Falls back to full projection bounds if no geojson or unable to compute an extent
		if ( this.geojson ) {

			const geoBounds = this._geoJSONBounds().map( v => v * MathUtils.DEG2RAD );
			this.contentBounds = geoBounds;

		} else {

			this.contentBounds = this.projection.getBounds();

		}

	}

	hasContent( minX, minY, maxX, maxY ) {

		return this.geojson !== null;

	}

	// main fetch per region -> returns CanvasTexture
	// TODO: must be async?
	async fetchItem( tokens, signal ) {

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

		texture.dispose();

	}

	redraw() {

		this.forEachItem( ( tex, args ) => {

			this._drawToCanvas( tex.image, args );
			tex.needsUpdate = true;

		} );

	}

	_drawToCanvas( canvas, tokens ) {

		const [ minX, minY, maxX, maxY ] = tokens;
		const { projection, resolution, geojson } = this;

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

		// draw features
		const ctx = canvas.getContext( '2d' );
		const features = this._featuresFromGeoJSON( geojson );
		for ( let i = 0; i < features.length; i ++ ) {

			const feature = features[ i ];
			if ( this._featureIntersectsTile( feature, regionBoundsDeg ) ) {

				this._drawFeatureOnCanvas( ctx, feature, regionBoundsDeg, canvas.width, canvas.height );

			}

		}

	}

	// bbox quick test in projected units
	_featureIntersectsTile( feature, boundsDeg ) {

		const featureBoundsDeg = this._getFeatureBounds( feature );
		if ( ! featureBoundsDeg ) {

			return false;

		}

		// check for intersection between bounds
		const [ fminX, fminY, fmaxX, fmaxY ] = featureBoundsDeg;
		const [ minX, minY, maxX, maxY ] = boundsDeg;
		return ! ( fmaxX < minX || fminX > maxX || fmaxY < minY || fminY > maxY );

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
		const geomTypes = new Set( [ 'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon' ] );

		if ( type === 'FeatureCollection' ) {

			return root.features;

		} else if ( type === 'Feature' ) {

			return [ root ];

		} else if ( type === 'GeometryCollection' ) {

			return root.geometries.map( g => ( { type: 'Feature', geometry: g, properties: {} } ) );

		} else if ( geomTypes.has( type ) ) {

			return [ { type: 'Feature', geometry: root, properties: {} } ];

		} else {

			return [];

		}

	}

	// draw feature on canvas ( assumes intersects already )
	_drawFeatureOnCanvas( ctx, feature, tileBoundsDeg, width, height ) {

		const { geometry = null, properties = {} } = feature;
		if ( ! geometry ) {

			// A feature may have null geometry in GeoJSON
			return;

		}

		const [ minLonDeg, minLatDeg, maxLonDeg, maxLatDeg ] = tileBoundsDeg;
		const strokeStyle = properties.strokeStyle || this.strokeStyle;
		const fillStyle = properties.fillStyle || this.fillStyle;
		const pointRadius = properties.pointRadius || this.pointRadius;
		const strokeWidth = properties.strokeWidth || this.strokeWidth;

		ctx.save();
		ctx.strokeStyle = strokeStyle;
		ctx.fillStyle = fillStyle;
		ctx.lineWidth = strokeWidth;

		// Compute pixel from cartographic coordinates and tile bounds
		const arr = new Array( 2 );
		const projectPoint = ( lon, lat, target = arr ) => {

			// canvas y origin is top, projection y increases north -> flip
			const x = MathUtils.mapLinear( lon, minLonDeg, maxLonDeg, 0, width );
			const y = height - MathUtils.mapLinear( lat, minLatDeg, maxLatDeg, 0, height );

			// round to integer to gain performance
			// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas#avoid_floating-point_coordinates_and_use_integers_instead
			target[ 0 ] = Math.round( x );
			target[ 1 ] = Math.round( y );
			return target;

		};

		const calculateAspectRatio = ( lon, lat ) => {

			// calculates the aspect ratio with which to draw points
			const latRad = lat * MathUtils.DEG2RAD;
			const lonRad = lon * MathUtils.DEG2RAD;
			const pxLat = ( maxLatDeg - minLatDeg ) / height;
			const pxLon = ( maxLonDeg - minLonDeg ) / width;
			const pixelRatio = pxLon / pxLat;

			// TODO: this should use the ellipsoid defined on the relevant tiles renderer
			return pixelRatio * calculateArcRatioAtPoint( WGS84_ELLIPSOID, latRad, lonRad );

		};

		const type = geometry.type;
		if ( type === 'Point' ) {

			const [ lon, lat ] = geometry.coordinates;
			const [ px, py ] = projectPoint( lon, lat );
			const drawRatio = calculateAspectRatio( lon, lat );

			ctx.beginPath();
			ctx.ellipse( px, py, pointRadius / drawRatio, pointRadius, 0, 0, Math.PI * 2 );
			ctx.fill();
			ctx.stroke();

		} else if ( type === 'MultiPoint' ) {

			geometry.coordinates.forEach( ( [ lon, lat ] ) => {

				const [ px, py ] = projectPoint( lon, lat );
				const drawRatio = calculateAspectRatio( lon, lat );

				ctx.beginPath();
				ctx.ellipse( px, py, pointRadius / drawRatio, pointRadius, 0, 0, Math.PI * 2 );
				ctx.fill();
				ctx.stroke();

			} );

		} else if ( type === 'LineString' ) {

			ctx.beginPath();
			geometry.coordinates.forEach( ( [ lon, lat ], i ) => {

				const [ px, py ] = projectPoint( lon, lat );
				if ( i === 0 ) {

					ctx.moveTo( px, py );

				} else {

					ctx.lineTo( px, py );

				}

			} );

			ctx.stroke();

		} else if ( type === 'MultiLineString' ) {

			ctx.beginPath();
			geometry.coordinates.forEach( ( line ) => {

				line.forEach( ( [ lon, lat ], i ) => {

					const [ px, py ] = projectPoint( lon, lat );
					if ( i === 0 ) {

						ctx.moveTo( px, py );

					} else {

						ctx.lineTo( px, py );

					}

				} );

			} );
			ctx.stroke();

		} else if ( type === 'Polygon' ) {

			ctx.beginPath();
			geometry.coordinates.forEach( ( ring, rIndex ) => {

				ring.forEach( ( [ lon, lat ], i ) => {

					const [ px, py ] = projectPoint( lon, lat );
					if ( i === 0 ) {

						ctx.moveTo( px, py );

					} else {

						ctx.lineTo( px, py );

					}

				} );
				ctx.closePath();

			} );
			ctx.fill( 'evenodd' );
			ctx.stroke();

		} else if ( type === 'MultiPolygon' ) {

			geometry.coordinates.forEach( ( polygon ) => {

				ctx.beginPath();
				polygon.forEach( ( ring, rIndex ) => {

					ring.forEach( ( [ lon, lat ], i ) => {

						const [ px, py ] = projectPoint( lon, lat );
						if ( i === 0 ) {

							ctx.moveTo( px, py );

						} else {

							ctx.lineTo( px, py );

						}

					} );
					ctx.closePath();

				} );
				ctx.fill( 'evenodd' );
				ctx.stroke();

			} );

		}

		ctx.restore();

	}

	// Compute geographic bounds in degrees from current geojson.
	_geoJSONBounds() {

		// TODO: add support for padding the bounding boxes
		const features = this._featuresFromGeoJSON( this.geojson );
		let minLon = Infinity;
		let minLat = Infinity;
		let maxLon = - Infinity;
		let maxLat = - Infinity;

		features.forEach( feature => {

			const [ fMinLon, fMinLat, fMaxLon, fMaxLat ] = this._getFeatureBounds( feature );
			minLon = Math.min( minLon, fMinLon );
			minLat = Math.min( minLat, fMinLat );
			maxLon = Math.max( maxLon, fMaxLon );
			maxLat = Math.max( maxLat, fMaxLat );

		} );

		return [ minLon, minLat, maxLon, maxLat ];

	}

}
