import { CanvasTexture, SRGBColorSpace } from 'three';
import { MVTContentCache, MVTImageSource } from './MVTImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { forEachTileInBounds } from '../overlays/utils.js';
const DEG2RAD = Math.PI / 180;

let _pmtilesImport = null;
function importPMTiles() {

	return _pmtilesImport ??= import( 'pmtiles' ).then( m => m.PMTiles );

}

class PMTilesContentCache extends MVTContentCache {

	constructor( options = {} ) {

		super( options );
		this.instance = null;
		this.tileType = 1;

	}

	async init() {

		const { tiling, tileDimension } = this;

		const PMTiles = await importPMTiles();
		this.instance = new PMTiles( this.url );

		const header = await this.instance.getHeader();
		this.tileType = header.tileType;

		const projection = new ProjectionScheme( 'EPSG:3857' );

		tiling.flipY = true;
		tiling.setProjection( projection );
		tiling.setContentBounds(
			DEG2RAD * header.minLon,
			DEG2RAD * header.minLat,
			DEG2RAD * header.maxLon,
			DEG2RAD * header.maxLat,
		);
		tiling.generateLevels( header.maxZoom + 1, projection.tileCountX, projection.tileCountY, {
			tilePixelWidth: tileDimension,
			tilePixelHeight: tileDimension,
			minLevel: header.minZoom,
		} );

	}

	async fetchItem( key, signal ) {

		if ( this.tileType !== 1 ) {

			// Raster: store raw buffer instead of parsing as VectorTile
			const [ tx, ty, tl ] = key;
			const buffer = await this.fetchTileBuffer( tl, tx, ty, signal );
			return ( buffer && buffer.byteLength > 0 ) ? buffer : null;

		}

		return super.fetchItem( key, signal );

	}

	async fetchTileBuffer( z, x, y, signal ) {

		const res = await this.instance.getZxy( z, x, y, signal );
		return res ? res.data : null;

	}

}

export class PMTilesImageSource extends MVTImageSource {

	constructor( options = {} ) {

		super( { ...options, contentCache: new PMTilesContentCache( options ) } );

	}

	async fetchItem( [ minX, minY, maxX, maxY, level ], signal ) {

		const { _contentCache, resolution } = this;
		if ( _contentCache.tileType === 1 ) {

			// Vector tile path
			return super.fetchItem( [ minX, minY, maxX, maxY, level ], signal );

		}

		// Raster compositing path if not vector tiles
		const canvas = document.createElement( 'canvas' );
		canvas.width = resolution;
		canvas.height = resolution;

		const ctx = canvas.getContext( '2d' );
		const regionBounds = [ minX, minY, maxX, maxY ];
		const [ rMinX, rMinY, rMaxX, rMaxY ] = regionBounds;

		const promises = [];
		forEachTileInBounds( regionBounds, level, _contentCache.tiling, ( tx, ty, tl ) => {

			promises.push( ( async () => {

				const buffer = await _contentCache.lock( tx, ty, tl );
				if ( buffer ) {

					const [ tMinX, tMinY, tMaxX, tMaxY ] = _contentCache.tiling.getTileBounds( tx, ty, tl, true, false );
					const destX = ( tMinX - rMinX ) / ( rMaxX - rMinX ) * resolution;
					const destY = ( 1 - ( tMaxY - rMinY ) / ( rMaxY - rMinY ) ) * resolution;
					const destW = ( tMaxX - tMinX ) / ( rMaxX - rMinX ) * resolution;
					const destH = ( tMaxY - tMinY ) / ( rMaxY - rMinY ) * resolution;
					const bitmap = await createImageBitmap( new Blob( [ buffer ] ) );
					ctx.drawImage( bitmap, destX, destY, destW, destH );
					bitmap.close();

				}

			} )() );

		} );

		await Promise.all( promises );

		const tex = new CanvasTexture( canvas );
		tex.colorSpace = SRGBColorSpace;
		tex.generateMipmaps = false;
		tex.needsUpdate = true;
		tex._regionArgs = [ minX, minY, maxX, maxY, level ];
		return tex;

	}

	redraw() {

		// Raster tiles have no style to re-apply; only delegate for vector tiles
		if ( this._contentCache.tileType === 1 ) {

			super.redraw();

		}

	}

}
