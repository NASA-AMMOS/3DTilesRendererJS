import * as THREE from 'three';
import { TiledImageSource } from './TiledImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';

export class GeoJSONImageSource extends TiledImageSource {

	constructor( {

		geojson = null,
		url = null, // URL or GeoJson object can be provided
		tileDimension = 256,
		bounds = [ - 180, - 90, 180, 90 ],
		levels = 18,
		projection = null, // 'EPSG:3857' or 'EPSG:4326' or null to auto- detect
		pointRadius = 6,
		strokeStyle = 'red',
		fillStyle = 'rgba( 255,0,0,0.25 )'

	} = {} ) {

		super( );
		this.geojson = geojson;
		this.url = url;
		this.tileDimension = tileDimension;
		this.bounds = bounds;
		this.levels = levels;
		this.projection = projection;
		this.pointRadius = pointRadius;
		this.strokeStyle = strokeStyle;
		this.fillStyle = fillStyle;

	}

	async init( ) {

		// configure tiling to content bounds and levels
		this.tiling.setProjection( new ProjectionScheme( this._detectProjection( ) ) );
		this.tiling.setContentBounds( ...this.bounds );
		for ( let i = 0; i < this.levels; i ++ ) {

			const tilesX = 2 ** i;
			const tilesY = 2 ** i;
			this.tiling.setLevel( i, {
				tilePixelWidth: this.tileDimension,
				tilePixelHeight: this.tileDimension,
				tileCountX: tilesX,
				tileCountY: tilesY,
			} );

		}

		// If a URL was provided and no geojson object yet, fetch it now (use fetchData so overlay can inject headers)
		if ( ! this.geojson && this.url ) {

			try {

				const res = await this.fetchData( this.url );
				// fetchData should return a Response-like object
				// allow both Response and plain object (in case overlay fetch returns parsed JSON)
				if ( res && typeof res.json === 'function' ) {

					this.geojson = await res.json();

				} else if ( res ) {

					this.geojson = res;

				}

			} catch ( e ) {

				console.warn( 'GeoJSONImageSource: failed to fetch geojson from url', this.url, e );
				// continue, but without geojson no tiles will be produced

			}

		}

		return Promise.resolve( );

	}

	// main fetch per tile - > returns THREE.Texture
	async fetchItem( tokens, signal ) {

		const [ x, y, level ] = tokens;
		const boundsNormalized = this.tiling.getTileBounds(
			x,
			y,
			level,
			true,
			false,
		); // [ minx,miny,maxx,maxy ] normalized

		// compute tile extent in projection units ( degrees for 4326, meters for 3857 )
		const tileInfo = this._tileExtentFromNormalized( boundsNormalized );

		// create canvas
		const canvas = document.createElement( 'canvas' );
		canvas.width = this.tileDimension;
		canvas.height = this.tileDimension;
		const ctx = canvas.getContext( '2d' );

		// clear
		ctx.clearRect( 0, 0, canvas.width, canvas.height );

		// find features that ( quick bbox ) intersect tile
		const features =
			this.geojson && this.geojson.features ? this.geojson.features : [ ];

		for ( let i = 0; i < features.length; i ++ ) {

			const f = features[ i ];
			if ( ! f || ! f.geometry ) continue;
			if ( ! this._featureIntersectsTile( f, tileInfo ) ) continue;

			this._drawFeatureOnCanvas( ctx, f, tileInfo, canvas.width, canvas.height );

		}

		const tex = new THREE.CanvasTexture( canvas );
		tex.needsUpdate = true;
		return tex;

	}

	// - - - projection / mapping helpers - - -

	_detectProjection( ) {

		if ( this.projection ) return String( this.projection );
		const projFromTiling =
			this.tiling &&
			this.tiling.projection &&
			( this.tiling.projection.identifier ||
				this.tiling.projection.crs ||
				this.tiling.projection.name );
		if ( projFromTiling ) return String( projFromTiling );
		return 'EPSG:3857'; // default common for XYZ

	}

	// Map normalized [ 0..1 ] bounds to either degrees or WebMercator meters
	_tileExtentFromNormalized( bounds ) {

		const [ minx, miny, maxx, maxy ] = bounds;
		const proj = this._detectProjection( );
		const is3857 = String( proj ).includes( '3857' );

		// respect tiling.flipY: some tiling schemes return normalized Y with origin at top
		const flipY = ! ! ( this.tiling && this.tiling.flipY );
		// when flipY is true, normalized y=0 is top — invert the Y values so mapping is consistent
		const normYMin = flipY ? 1 - maxy : miny;
		const normYMax = flipY ? 1 - miny : maxy;

		if ( is3857 ) {

			const MERC_MIN = - 20037508.342789244;
			const MERC_MAX = 20037508.342789244;
			const minx_m = THREE.MathUtils.mapLinear( minx, 0, 1, MERC_MIN, MERC_MAX );
			const maxx_m = THREE.MathUtils.mapLinear( maxx, 0, 1, MERC_MIN, MERC_MAX );
			const miny_m = THREE.MathUtils.mapLinear(
				normYMin,
				0,
				1,
				MERC_MIN,
				MERC_MAX,
			);
			const maxy_m = THREE.MathUtils.mapLinear(
				normYMax,
				0,
				1,
				MERC_MIN,
				MERC_MAX,
			);

			return {

				projection: 'EPSG:3857',
				minX: minx_m,
				minY: miny_m,
				maxX: maxx_m,
				maxY: maxy_m,

			};

		}

		// EPSG:4326 ( degrees )
		const minLon = THREE.MathUtils.mapLinear( minx, 0, 1, - 180, 180 );
		const maxLon = THREE.MathUtils.mapLinear( maxx, 0, 1, - 180, 180 );
		const minLat = THREE.MathUtils.mapLinear( normYMin, 0, 1, - 90, 90 );
		const maxLat = THREE.MathUtils.mapLinear( normYMax, 0, 1, - 90, 90 );
		return {

			projection: 'EPSG:4326',
			minX: minLon,
			minY: minLat,
			maxX: maxLon,
			maxY: maxLat,
		};

	}

	// Convert lon/lat ( degrees ) to projection units used by tileInfo
	_projectLonLat( lon, lat, projection ) {

		if ( String( projection ).includes( '3857' ) ) {

			const R = 6378137.0;
			const x = ( ( lon * Math.PI ) / 180.0 ) * R;
			const y = R * Math.log( Math.tan( Math.PI / 4 + ( lat * Math.PI ) / 360.0 ) );
			return { x, y };

		}
		// EPSG:4326: identity
		return { x: lon, y: lat };

	}

	// Compute pixel from projected coords and tileInfo
	_projectedToPixel( pxProjX, pxProjY, tileInfo, width, height ) {

		const { minX, minY, maxX, maxY } = tileInfo;
		const rangeX = maxX - minX || 1;
		const rangeY = maxY - minY || 1;
		const x = ( ( pxProjX - minX ) / rangeX ) * width;
		// canvas y origin is top, projection y increases north - > flip
		const y = height - ( ( pxProjY - minY ) / rangeY ) * height;
		return [ x, y ];

	}

	// bbox quick test in projected units
	_featureIntersectsTile( feature, tileInfo ) {

		// compute feature bbox ( projected )
		const geom = feature.geometry;
		if ( ! geom ) return false;

		const proj = tileInfo.projection;
		const bbox = this._projectedFeatureBBox( geom, proj );
		if ( ! bbox ) return false;
		// bbox = [ minX,minY,maxX,maxY ] in projected units
		const [ fminX, fminY, fmaxX, fmaxY ] = bbox;
		const { minX, minY, maxX, maxY } = tileInfo;
		// rectangle intersection
		return ! ( fmaxX < minX || fminX > maxX || fmaxY < minY || fminY > maxY );

	}

	_projectedFeatureBBox( geometry, projection ) {

		const type = geometry.type;
		if ( ! geometry.coordinates ) return null;

		let minX = Infinity,
			minY = Infinity,
			maxX = - Infinity,
			maxY = - Infinity;

		const consume = ( lon, lat ) => {

			const p = this._projectLonLat( lon, lat, projection );
			minX = Math.min( minX, p.x );
			maxX = Math.max( maxX, p.x );
			minY = Math.min( minY, p.y );
			maxY = Math.max( maxY, p.y );

		};

		const coords = geometry.coordinates;

		if ( type === 'Point' ) {

			consume( coords[ 0 ], coords[ 1 ] );

		} else if ( type === 'MultiPoint' || type === 'LineString' ) {

			coords.forEach( ( c ) => consume( c[ 0 ], c[ 1 ] ) );

		} else if ( type === 'MultiLineString' || type === 'Polygon' ) {

			coords.forEach( ( ring ) => ring.forEach( ( c ) => consume( c[ 0 ], c[ 1 ] ) ) );

		} else if ( type === 'MultiPolygon' ) {

			coords.forEach( ( polygon ) =>
				polygon.forEach( ( ring ) => ring.forEach( ( c ) => consume( c[ 0 ], c[ 1 ] ) ) ),
			);

		} else {

			return null;

		}

		if ( minX === Infinity ) return null;
		return [ minX, minY, maxX, maxY ];

	}

	// draw feature on canvas ( assumes intersects already )
	_drawFeatureOnCanvas( ctx, feature, tileInfo, width, height ) {

		const geom = feature.geometry;
		const props = feature.properties || {};
		const stroke = props.stroke || this.strokeStyle;
		const fill = props.fill || this.fillStyle;

		ctx.save( );
		ctx.strokeStyle = stroke;
		ctx.fillStyle = fill;
		ctx.lineWidth = props.strokeWidth || 2;

		const proj = tileInfo.projection;

		const projectPoint = ( lon, lat ) => {

			const p = this._projectLonLat( lon, lat, proj );
			return this._projectedToPixel( p.x, p.y, tileInfo, width, height );

		};

		const type = geom.type;

		if ( type === 'Point' ) {

			const [ lon, lat ] = geom.coordinates;
			const [ px, py ] = projectPoint( lon, lat );
			ctx.beginPath( );
			ctx.arc( px, py, props.radius || this.pointRadius, 0, Math.PI * 2 );
			ctx.fill( );

		} else if ( type === 'MultiPoint' ) {

			geom.coordinates.forEach( ( [ lon, lat ] ) => {

				const [ px, py ] = projectPoint( lon, lat );
				ctx.beginPath( );
				ctx.arc( px, py, props.radius || this.pointRadius, 0, Math.PI * 2 );
				ctx.fill( );

			} );

		} else if ( type === 'LineString' ) {

			ctx.beginPath( );

			geom.coordinates.forEach( ( [ lon, lat ], i ) => {

				const [ px, py ] = projectPoint( lon, lat );
				if ( i === 0 ) ctx.moveTo( px, py );
				else ctx.lineTo( px, py );

			} );

			ctx.stroke( );

		} else if ( type === 'MultiLineString' ) {

			geom.coordinates.forEach( ( line ) => {

				ctx.beginPath( );
				line.forEach( ( [ lon, lat ], i ) => {

					const [ px, py ] = projectPoint( lon, lat );
					if ( i === 0 ) ctx.moveTo( px, py );
					else ctx.lineTo( px, py );

				} );
				ctx.stroke( );

			} );

		} else if ( type === 'Polygon' ) {

			geom.coordinates.forEach( ( ring, rIndex ) => {

				ctx.beginPath( );
				ring.forEach( ( [ lon, lat ], i ) => {

					const [ px, py ] = projectPoint( lon, lat );
					if ( i === 0 ) ctx.moveTo( px, py );
					else ctx.lineTo( px, py );

				} );
				ctx.closePath( );
				// fill only outer ring
				if ( rIndex === 0 ) ctx.fill( );
				ctx.stroke( );

			} );

		} else if ( type === 'MultiPolygon' ) {

			geom.coordinates.forEach( ( polygon ) => {

				polygon.forEach( ( ring, rIndex ) => {

					ctx.beginPath( );
					ring.forEach( ( [ lon, lat ], i ) => {

						const [ px, py ] = projectPoint( lon, lat );
						if ( i === 0 ) ctx.moveTo( px, py );
						else ctx.lineTo( px, py );

					} );
					ctx.closePath( );
					if ( rIndex === 0 ) ctx.fill( );
					ctx.stroke( );

				} );

			} );

		}

		ctx.restore( );

	}

}
