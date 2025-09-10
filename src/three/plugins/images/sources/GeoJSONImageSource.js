import { Texture, LinearFilter, CanvasTexture, MathUtils } from 'three';
import { TiledImageSource } from './TiledImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';

export class GeoJSONImageSource extends TiledImageSource {

	constructor( {

		geojson = null,
		url = null, // URL or GeoJson object can be provided
		tileDimension = 256,
		levels = 18,
		pointRadius = 6,
		strokeStyle = 'red',
		fillStyle = 'rgba( 255,0,0,0.65 )',

	} = {} ) {

		super( );
		this.geojson = geojson;
		this.url = url;
		this.tileDimension = tileDimension;
		this.levels = levels;

		this.pointRadius = pointRadius;
		this.strokeStyle = strokeStyle;
		this.fillStyle = fillStyle;

	}

	async init( ) {

		// configure tiling to content bounds and levels
		this.tiling.setProjection( new ProjectionScheme( 'EPSG:3857' ) );
		this.tiling.setContentBounds( ...this.tiling.projection.getBounds() );

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

				throw new Error( `GeoJSONImageSource: failed to fetch or parse geojson from url ${this.url}` );

			}

		}

	}

	// main fetch per tile - > returns .Texture
	async fetchItem( tokens, signal ) {

		//return this.drawCanvasImage(tokens);
		return await this.drawSVGImage( tokens, signal );

	}


	async drawSVGImage( tokens, signal ) {

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

		// quick set of features to consider
		const features = this._featuresFromGeoJSON();
		// helper to map lon/lat to pixel coords for this tile (same math used by canvas path code)
		const proj = tileInfo.projection;
		const projectPointPx = ( lon, lat, width, height ) => {

			const p = this._projectLonLat( lon, lat, proj );
			const [ px, py ] = this._projectedToPixel( p.x, p.y, tileInfo, width, height );
			// clamp to finite numbers
			return [ isFinite( px ) ? px : 0, isFinite( py ) ? py : 0 ];

		};

		const width = this.tileDimension;
		const height = this.tileDimension;

		// Build SVG content for features that intersect this tile
		const svgParts = [ ];
		svgParts.push( '<?xml version="1.0" encoding="utf-8"?>' );
		svgParts.push( `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMin meet">` );
		// background transparent
		svgParts.push( `<rect x="0" y="0" width="${width}" height="${height}" fill="transparent" />` );

		for ( let i = 0; i < features.length; i ++ ) {

			const f = features[ i ];
			if ( ! f || ! f.geometry ) continue;
			if ( ! this._featureIntersectsTile( f, tileInfo ) ) continue;

			const geom = f.geometry;
			const props = f.properties || {};
			const stroke = props.stroke || this.strokeStyle;
			const fill = props.fill || this.fillStyle;
			const strokeWidth = props.strokeWidth || 2;
			const r = props.radius || this.pointRadius;
			const type = geom.type;

			if ( type === 'Point' ) {

				const [ lon, lat ] = geom.coordinates;
				const [ px, py ] = projectPointPx( lon, lat, width, height );
				svgParts.push( `<circle cx="${px}" cy="${py}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />` );

			} else if ( type === 'MultiPoint' ) {

				geom.coordinates.forEach( ( [ lon, lat ] ) => {

					const [ px, py ] = projectPointPx( lon, lat, width, height );
					svgParts.push( `<circle cx="${px}" cy="${py}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />` );

				} );

			} else if ( type === 'LineString' ) {

				const d = geom.coordinates.map( ( [ lon, lat ] ) => {

					const [ px, py ] = projectPointPx( lon, lat, width, height );
					return `${px},${py}`;

				} ).join( ' ' );
				svgParts.push( `<polyline points="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round" />` );

			} else if ( type === 'MultiLineString' ) {

				geom.coordinates.forEach( ( line ) => {

					const d = line.map( ( [ lon, lat ] ) => {

						const [ px, py ] = projectPointPx( lon, lat, width, height );
						return `${px},${py}`;

					} ).join( ' ' );
					svgParts.push( `<polyline points="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round" />` );

				} );

			} else if ( type === 'Polygon' ) {

				geom.coordinates.forEach( ( ring, rIndex ) => {

					const d = ring.map( ( [ lon, lat ] ) => {

						const [ px, py ] = projectPointPx( lon, lat, width, height );
						return `${px},${py}`;

					} ).join( ' ' );
					const ringFill = rIndex === 0 ? fill : 'none';
					svgParts.push( `<polygon points="${d}" fill="${ringFill}" stroke="${stroke}" stroke-width="${strokeWidth}" />` );

				} );

			} else if ( type === 'MultiPolygon' ) {

				geom.coordinates.forEach( ( polygon ) => {

					polygon.forEach( ( ring, rIndex ) => {

						const d = ring.map( ( [ lon, lat ] ) => {

							const [ px, py ] = projectPointPx( lon, lat, width, height );
							return `${px},${py}`;

						} ).join( ' ' );
						const ringFill = rIndex === 0 ? fill : 'none';
						svgParts.push( `<polygon points="${d}" fill="${ringFill}" stroke="${stroke}" stroke-width="${strokeWidth}" />` );

					} );

				} );

			}

		}

		svgParts.push( '</svg>' );

		const svgStr = svgParts.join( '' );

		// Respect abort signal: if already aborted, throw
		if ( signal && signal.aborted ) {

			throw new DOMException( 'Aborted', 'AbortError' );

		}

		// Create an object URL for the SVG and load as image
		const svgBlob = new Blob( [ svgStr ], { type: 'image/svg+xml;charset=utf-8' } );
		const url = URL.createObjectURL( svgBlob );

		try {

			const img = await new Promise( ( resolve, reject ) => {

				const image = new Image();

				// allow crossOrigin if needed by app overlay usage
				image.crossOrigin = 'anonymous';

				const onAbort = () => {

					image.src = ''; // stop loading
					reject( new DOMException( 'Aborted', 'AbortError' ) );

				};

				const cleanup = () => {

					if ( signal ) signal.removeEventListener( 'abort', onAbort );
					image.onload = null;
					image.onerror = null;

				};

				image.onload = () => {

					cleanup();
					resolve( image );

				};
				image.onerror = ( e ) => {

					cleanup();
					reject( e || new Error( 'Failed to load SVG image' ) );

				};

				if ( signal ) signal.addEventListener( 'abort', onAbort );
				image.src = url;

			} );

			// create three texture from the loaded image
			const tex = new Texture( img );
			tex.needsUpdate = true;
			tex.minFilter = LinearFilter;
			tex.magFilter = LinearFilter;

			return tex;

		} catch ( e ) {

			// propagate aborts and other errors - caller handles logging
			throw new Error( `GeoJSONImageSource: failed to load SVG image for tile ${tokens.join( ',' )}` );

		} finally {

			// revoke URL, image already loaded or aborted so memory freed
			URL.revokeObjectURL( url );

		}

	}

	drawCanvasImage( tokens ) {

		const [ x, y, level ] = tokens;
		const boundsNormalized = this.tiling.getTileBounds(
			x,
			y,
			level,
			true,
			false
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
		const features = this.geojson && this.geojson.features ? this.geojson.features : [ ];

		for ( let i = 0; i < features.length; i ++ ) {

			const f = features[ i ];
			if ( ! f || ! f.geometry ) continue;
			if ( ! this._featureIntersectsTile( f, tileInfo ) ) continue;
			this._drawFeatureOnCanvas( ctx, f, tileInfo, canvas.width, canvas.height );

		}

		const tex = new CanvasTexture( canvas );
		tex.needsUpdate = true;
		return tex;

	}

	// - - - projection / mapping helpers - - -

	// Map normalized [ 0..1 ] bounds to either degrees or WebMercator meters
	_tileExtentFromNormalized( bounds ) {

		const [ minx, miny, maxx, maxy ] = bounds;

		// respect tiling.flipY: some tiling schemes return normalized Y with origin at top
		const flipY = ! ! ( this.tiling && this.tiling.flipY );
		// when flipY is true, normalized y=0 is top — invert the Y values so mapping is consistent
		const normYMin = flipY ? 1 - maxy : miny;
		const normYMax = flipY ? 1 - miny : maxy;

		const MERC_MIN = - 20037508.342789244;
		const MERC_MAX = 20037508.342789244;
		const minx_m = MathUtils.mapLinear( minx, 0, 1, MERC_MIN, MERC_MAX );
		const maxx_m = MathUtils.mapLinear( maxx, 0, 1, MERC_MIN, MERC_MAX );
		const miny_m = MathUtils.mapLinear(
			normYMin,
			0,
			1,
			MERC_MIN,
			MERC_MAX,
		);
		const maxy_m = MathUtils.mapLinear(
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
	_projectedToPixel( pxProjX, pxProjY, bounds, width, height ) {

		const { minX, minY } = bounds;
		let { maxX, maxY } = bounds;

		// avoid zero-range (prevents division by zero in mapLinear)
		if ( maxX === minX ) maxX = minX + 1;
		if ( maxY === minY ) maxY = minY + 1;

		const x = MathUtils.mapLinear( pxProjX, minX, maxX, 0, width );
		// canvas y origin is top, projection y increases north -> flip
		const y = height - MathUtils.mapLinear( pxProjY, minY, maxY, 0, height );

		// clamp to finite numbers
		return [ isFinite( x ) ? x : 0, isFinite( y ) ? y : 0 ];

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

	// Normalize top-level geojson into an array of Feature objects
	_featuresFromGeoJSON() {

		if ( ! this.geojson ) return [];

		const root = this.geojson;
		const t = String( root.type || '' );

		const geomTypes = new Set( [ 'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon' ] );

		// FeatureCollection: features may be Features or raw geometries — normalize
		if ( t === 'FeatureCollection' && Array.isArray( root.features ) ) {

			return root.features.map( ( f ) => {

				if ( ! f ) return null;
				if ( f.type === 'Feature' ) return f;
				// if someone put raw geometry inside features array
				if ( f.type && geomTypes.has( f.type ) ) return { type: 'Feature', geometry: f, properties: {} };
				return null;

			} ).filter( Boolean );

		}

		// Single Feature
		if ( t === 'Feature' ) return [ root ];

		// GeometryCollection -> convert each geometry to Feature
		if ( t === 'GeometryCollection' && Array.isArray( root.geometries ) ) {

			return root.geometries.map( ( g ) => ( { type: 'Feature', geometry: g, properties: {} } ) );

		}

		// Bare geometry -> wrap
		if ( geomTypes.has( t ) ) return [ { type: 'Feature', geometry: root, properties: {} } ];

		// If user passed an array of mixed items (features or geometries)
		if ( Array.isArray( root ) ) {

			return root.map( ( item ) => {

				if ( ! item ) return null;
				if ( item.type === 'Feature' ) return item;
				if ( item.type && geomTypes.has( item.type ) ) return { type: 'Feature', geometry: item, properties: {} };
				return null;

			} ).filter( Boolean );

		}

		// Unknown shape
		return [];

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
