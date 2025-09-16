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

		super();
		this.geojson = geojson;
		this.url = url;
		this.tileDimension = tileDimension;
		this.levels = levels;

		this.pointRadius = pointRadius;
		this.strokeStyle = strokeStyle;
		this.fillStyle = fillStyle;

	}

	async init() {

		const { tiling, levels, tileDimension } = this;


		// configure tiling to content bounds and levels
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
		if ( ! this.geojson && this.url ) {

			try {

				const res = await this.fetchData( this.url );

				const geojson = await res.json();
				// check if it follow geojson spec
				if ( ! geojson.type ) {

					throw new Error( 'GeoJSONImageSource: invalid geojson structure' );

				}

				// check if features present
				const features = this._featuresFromGeoJSON( geojson );
				if ( ! features.length ) {

					throw new Error( 'GeoJSONImageSource: no valid features found' );

				}

				this.geojson = geojson;

			} catch ( e ) {

				throw new Error( `GeoJSONImageSource: failed to fetch or parse geojson from url ${this.url}` );

			}

		}

		// If geojson present, compute bounds from data (with padding) and set as content bounds.
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
		//return await this.drawSVGImage( tokens, signal );

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
		const features = this._featuresFromGeoJSON( this.geojson );
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
		const features = this._featuresFromGeoJSON( this.geojson );
		for ( let i = 0; i < features.length; i ++ ) {

			const f = features[ i ];
			if ( ! f || ! f.geometry ) continue;
			//if ( ! this._featureIntersectsTile( f, tileInfo ) ) continue;
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

		// Map normalized coords to geographic degrees
		const minLon = MathUtils.mapLinear( minx, 0, 1, - 180, 180 );
		const maxLon = MathUtils.mapLinear( maxx, 0, 1, - 180, 180 );
		const minLat = MathUtils.mapLinear( normYMin, 0, 1, - 90, 90 );
		const maxLat = MathUtils.mapLinear( normYMax, 0, 1, - 90, 90 );

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
		// round to integer to gain performance
		// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas#avoid_floating-point_coordinates_and_use_integers_instead

		return [ isFinite( x ) ? Math.round( x ) : 0, isFinite( y ) ? Math.round( y ) : 0 ];

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
	_featuresFromGeoJSON( root ) {

		if ( ! root ) return [];

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

		ctx.save();
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
			ctx.beginPath();
			ctx.arc( px, py, props.radius || this.pointRadius, 0, Math.PI * 2 );
			ctx.fill();

		} else if ( type === 'MultiPoint' ) {

			geom.coordinates.forEach( ( [ lon, lat ] ) => {

				const [ px, py ] = projectPoint( lon, lat );
				ctx.beginPath();
				ctx.arc( px, py, props.radius || this.pointRadius, 0, Math.PI * 2 );
				ctx.fill();

			} );

		} else if ( type === 'LineString' ) {

			ctx.beginPath();

			geom.coordinates.forEach( ( [ lon, lat ], i ) => {

				const [ px, py ] = projectPoint( lon, lat );
				if ( i === 0 ) ctx.moveTo( px, py );
				else ctx.lineTo( px, py );

			} );

			ctx.stroke();

		} else if ( type === 'MultiLineString' ) {

			geom.coordinates.forEach( ( line ) => {

				ctx.beginPath();
				line.forEach( ( [ lon, lat ], i ) => {

					const [ px, py ] = projectPoint( lon, lat );
					if ( i === 0 ) ctx.moveTo( px, py );
					else ctx.lineTo( px, py );

				} );
				ctx.stroke();

			} );

		} else if ( type === 'Polygon' ) {

			geom.coordinates.forEach( ( ring, rIndex ) => {

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

			geom.coordinates.forEach( ( polygon ) => {

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

	// Compute geographic bounds [minLon,minLat,maxLon,maxLat] from current geojson.
	// pad: if 0 < pad < 1 => treated as fraction of width/height; if pad >= 1 => treated as degrees.
	_geoJSONBounds( pad = 0 ) {

		if ( ! this.geojson ) return null;
		const features = this._featuresFromGeoJSON( this.geojson );
		if ( ! features.length ) return null;
		let minLon = Infinity, minLat = Infinity, maxLon = - Infinity, maxLat = - Infinity;
		const consider = ( lon, lat ) => {

			if ( typeof lon !== 'number' || typeof lat !== 'number' ) return;
			minLon = Math.min( minLon, lon );
			maxLon = Math.max( maxLon, lon );
			minLat = Math.min( minLat, lat );
			maxLat = Math.max( maxLat, lat );

		};
		// iterate all features and their coordinates
		for ( let i = 0; i < features.length; i ++ ) {

			const f = features[ i ];
			if ( ! f || ! f.geometry ) continue;
			const g = f.geometry;
			const type = g.type;
			const c = g.coordinates;
			if ( ! c ) continue;

			if ( type === 'Point' ) {

				consider( c[ 0 ], c[ 1 ] );

			} else if ( type === 'MultiPoint' || type === 'LineString' ) {

				c.forEach( ( pt ) => consider( pt[ 0 ], pt[ 1 ] ) );

			} else if ( type === 'MultiLineString' || type === 'Polygon' ) {

				c.forEach( ( ring ) => ring.forEach( ( pt ) => consider( pt[ 0 ], pt[ 1 ] ) ) );

			} else if ( type === 'MultiPolygon' ) {

				c.forEach( ( poly ) => poly.forEach( ( ring ) => ring.forEach( ( pt ) => consider( pt[ 0 ], pt[ 1 ] ) ) ) );

			} else if ( type === 'GeometryCollection' && Array.isArray( g.geometries ) ) {

				g.geometries.forEach( ( geom ) => {

					// simple recursion for nested geometries
					const tempFeature = { type: 'Feature', geometry: geom };
					features.push( tempFeature );

				} );

			}

		}
		if ( minLon === Infinity ) return null;

		let width = maxLon - minLon;
		let height = maxLat - minLat;
		// handle degenerate case

		if ( width === 0 ) {

			width = Math.max( 0.000001, Math.abs( minLon ) * 1e-6 );

		}

		if ( height === 0 ) {

			height = Math.max( 0.000001, Math.abs( minLat ) * 1e-6 );

		}

		let padLon = 0, padLat = 0;
		if ( pad > 0 && pad < 1 ) {

			padLon = width * pad;
			padLat = height * pad;

		} else if ( pad >= 1 ) {

			padLon = pad;
			padLat = pad;

		}

		let outMinLon = minLon - padLon;
		let outMaxLon = maxLon + padLon;
		let outMinLat = minLat - padLat;
		let outMaxLat = maxLat + padLat;
		// clamp to valid geographic ranges
		outMinLon = Math.max( - 180, outMinLon );
		outMaxLon = Math.min( 180, outMaxLon );
		outMinLat = Math.max( - 90, outMinLat );
		outMaxLat = Math.min( 90, outMaxLat );
		return [ outMinLon, outMinLat, outMaxLon, outMaxLat ];

	}

}
