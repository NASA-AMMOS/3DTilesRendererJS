import { CanvasTexture, MathUtils } from 'three';
import { TiledImageSource } from './TiledImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';

// TODO: Add support for limited bounds
// TODO: Add support for padding of tiles to avoid clipping "wide" elements
// TODO: Scale points ellipse radii based on localized lat / lon distortion to preserve a circular appearance
export class GeoJSONImageSource extends TiledImageSource {

	constructor( {
		geojson = null,
		url = null, // URL or GeoJson object can be provided
		tileDimension = 256,
		levels = 20,
		pointRadius = 6,
		strokeStyle = 'red',
		strokeWidth = 2,
		fillStyle = 'rgba( 255,0,0,0.65 )',
	} = {} ) {

		super();
		this.geojson = geojson;
		this.url = url;
		this.tileDimension = tileDimension;
		this.levels = levels;

		this.pointRadius = pointRadius;
		this.strokeStyle = strokeStyle;
		this.strokeWidth = strokeWidth;
		this.fillStyle = fillStyle;

	}

	async init() {

		// configure tiling to content bounds and levels
		const { tiling, levels, tileDimension, geojson, url } = this;
		const projection = new ProjectionScheme();
		tiling.setProjection( projection );
		tiling.setContentBounds( ...projection.getBounds() );

		tiling.generateLevels(
			levels,
			projection.tileCountX,
			projection.tileCountY,
			{
				tilePixelWidth: tileDimension,
				tilePixelHeight: tileDimension,
			},
		);

		// If a URL was provided and no geojson object yet, fetch it now (use fetchData so overlay can inject headers)
		if ( ! geojson && url ) {

			const res = await this.fetchData( url );
			this.geojson = await res.json();

		}

		// TODO: If geojson present, compute bounds from data (with padding) and set as content bounds.
		// Falls back to full projection bounds if no geojson or unable to compute an extent.

		// seems that this approach to optimize rendering by defining bounds
		// doesn't work if not using a very large offset for the bounds, maybe an error?
		// const geoBounds = this._geoJSONBounds( 50 );
		// if ( geoBounds ) {
		// 	this.tiling.setContentBounds( ...geoBounds );
		// 	console.log( `GeoJSONImageSource: set content bounds from geojson: ${geoBounds}` );
		// } else {
		// 	this.tiling.setContentBounds( ...this.tiling.projection.getBounds() );
		// }

	}

	// main fetch per tile - > returns .Texture
	async fetchItem( tokens, signal ) {

		return this.drawCanvasImage( tokens );

	}

	drawCanvasImage( tokens ) {

		const { tiling, tileDimension, geojson } = this;
		const [ x, y, level ] = tokens;
		const tileBoundsDeg = tiling.getTileBounds( x, y, level, false, false ).map( v => MathUtils.RAD2DEG * v );

		// create canvas
		const canvas = document.createElement( 'canvas' );
		canvas.width = tileDimension;
		canvas.height = tileDimension;

		// draw features
		const ctx = canvas.getContext( '2d' );
		const features = this._featuresFromGeoJSON( geojson );
		for ( let i = 0; i < features.length; i ++ ) {

			const feature = features[ i ];
			if ( this._featureIntersectsTile( feature, tileBoundsDeg ) ) {

				this._drawFeatureOnCanvas( ctx, feature, tileBoundsDeg, canvas.width, canvas.height );

			}

		}

		const tex = new CanvasTexture( canvas );
		tex.needsUpdate = true;
		return tex;

	}

	// Compute pixel from projected coords and tileInfo
	_projectedToPixel( pxProjX, pxProjY, bounds, width, height ) {

		let [ minX, minY, maxX, maxY ] = bounds;

		// avoid zero-range (prevents division by zero in mapLinear)
		if ( maxX === minX ) maxX = minX + 1;
		if ( maxY === minY ) maxY = minY + 1;

		const x = MathUtils.mapLinear( pxProjX, minX, maxX, 0, width );

		// canvas y origin is top, projection y increases north -> flip
		const y = height - MathUtils.mapLinear( pxProjY, minY, maxY, 0, height );

		// clamp to finite numbers
		// round to integer to gain performance
		// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas#avoid_floating-point_coordinates_and_use_integers_instead

		return [ isFinite( x ) ? Math.round( x ) : 0, isFinite( y ) ? Math.round( y ) : 0 ];

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

		const consume = ( lon, lat ) => {

			minLon = Math.min( minLon, lon );
			maxLon = Math.max( maxLon, lon );
			minLat = Math.min( minLat, lat );
			maxLat = Math.max( maxLat, lat );

		};

		if ( type === 'Point' ) {

			consume( coordinates[ 0 ], coordinates[ 1 ] );

		} else if ( type === 'MultiPoint' || type === 'LineString' ) {

			coordinates.forEach( c => consume( c[ 0 ], c[ 1 ] ) );

		} else if ( type === 'MultiLineString' || type === 'Polygon' ) {

			coordinates.forEach( ring => ring.forEach( c => consume( c[ 0 ], c[ 1 ] ) ) );

		} else if ( type === 'MultiPolygon' ) {

			coordinates.forEach( polygon =>
				polygon.forEach( ring => ring.forEach( c => consume( c[ 0 ], c[ 1 ] ) ) ),
			);

		}

		if ( minLon === Infinity ) {

			return null;

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
	_drawFeatureOnCanvas( ctx, feature, tileInfo, width, height ) {

		const { geometry = null, properties = {} } = feature;
		if ( ! geometry ) {

			// A feature may have null geometry in GeoJSON
			return;

		}

		const strokeStyle = properties.strokeStyle || this.strokeStyle;
		const fillStyle = properties.fillStyle || this.fillStyle;
		const pointRadius = properties.pointRadius || this.pointRadius;
		const strokeWidth = properties.strokeWidth || this.strokeWidth;

		ctx.save();
		ctx.strokeStyle = strokeStyle;
		ctx.fillStyle = fillStyle;
		ctx.lineWidth = strokeWidth;

		const projectPoint = ( lon, lat ) => {

			return this._projectedToPixel( lon, lat, tileInfo, width, height );

		};

		const type = geometry.type;

		if ( type === 'Point' ) {

			const [ lon, lat ] = geometry.coordinates;
			const [ px, py ] = projectPoint( lon, lat );
			ctx.beginPath();
			ctx.ellipse( px, py, pointRadius, pointRadius, 0, 0, Math.PI * 2 );
			ctx.fill();

		} else if ( type === 'MultiPoint' ) {

			geometry.coordinates.forEach( ( [ lon, lat ] ) => {

				const [ px, py ] = projectPoint( lon, lat );
				ctx.beginPath();
				ctx.ellipse( px, py, pointRadius, pointRadius, 0, 0, Math.PI * 2 );
				ctx.fill();

			} );

		} else if ( type === 'LineString' ) {

			ctx.beginPath();

			geometry.coordinates.forEach( ( [ lon, lat ], i ) => {

				const [ px, py ] = projectPoint( lon, lat );
				if ( i === 0 ) ctx.moveTo( px, py );
				else ctx.lineTo( px, py );

			} );

			ctx.stroke();

		} else if ( type === 'MultiLineString' ) {

			geometry.coordinates.forEach( ( line ) => {

				ctx.beginPath();
				line.forEach( ( [ lon, lat ], i ) => {

					const [ px, py ] = projectPoint( lon, lat );
					if ( i === 0 ) ctx.moveTo( px, py );
					else ctx.lineTo( px, py );

				} );
				ctx.stroke();

			} );

		} else if ( type === 'Polygon' ) {

			geometry.coordinates.forEach( ( ring, rIndex ) => {

				ctx.beginPath();
				ring.forEach( ( [ lon, lat ], i ) => {

					const [ px, py ] = projectPoint( lon, lat );
					if ( i === 0 ) ctx.moveTo( px, py );
					else ctx.lineTo( px, py );

				} );
				ctx.closePath();
				// fill only outer ring
				if ( rIndex === 0 ) ctx.fill();
				ctx.stroke();

			} );

		} else if ( type === 'MultiPolygon' ) {

			geometry.coordinates.forEach( ( polygon ) => {

				polygon.forEach( ( ring, rIndex ) => {

					ctx.beginPath();
					ring.forEach( ( [ lon, lat ], i ) => {

						const [ px, py ] = projectPoint( lon, lat );
						if ( i === 0 ) ctx.moveTo( px, py );
						else ctx.lineTo( px, py );

					} );
					ctx.closePath();
					if ( rIndex === 0 ) ctx.fill();
					ctx.stroke();

				} );

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
