import { Mesh, MeshBasicMaterial, PlaneGeometry, MathUtils, Vector2 } from 'three';
import { TILE_X, TILE_Y, TILE_LEVEL } from './ImageFormatPlugin.js';
import { getCartographicToMeterDerivative } from './utils/getCartographicToMeterDerivative.js';

const _uv = /* @__PURE__ */ new Vector2();

export class GeneratedSurfacePlugin2 {

	constructor( options = {} ) {

		const {
			overlay = null,
			shape = 'planar',
			endCaps = true,
			center = true,
			useRecommendedSettings = true,
			transparent = false,
		} = options;

		this.priority = - 10;
		this.tiles = null;

		this.overlay = overlay;
		this.imageSource = overlay ? overlay.imageSource : null;

		this.shape = shape;
		this.endCaps = endCaps;
		this.center = center;
		this.transparent = transparent;
		this.useRecommendedSettings = useRecommendedSettings;

	}

	// Plugin functions
	init( tiles ) {

		if ( this.useRecommendedSettings ) {

			tiles.errorTarget = 1;

		}

		this.tiles = tiles;

		this.overlay.imageSource.fetchOptions = tiles.fetchOptions;

	}

	async loadRootTileset() {

		const { tiles } = this;
		const { overlay } = this;
		const { imageSource } = overlay;
		imageSource.url = imageSource.url || tiles.rootURL;
		tiles.invokeAllPlugins( plugin => imageSource.url = plugin.preprocessURL ? plugin.preprocessURL( imageSource.url, null ) : imageSource.url );

		// overlay.init() initializes the image source and creates regionImageSource
		await overlay.init();

		tiles.rootURL = imageSource.url;
		return this.getTileset( imageSource.url );

	}

	async parseToMesh( buffer, tile, extension, uri, abortSignal ) {

		if ( abortSignal.aborted ) {

			return null;

		}

		// Behavioral difference from GeneratedSurfacePlugin: load texture from imageSource
		const { imageSource, transparent } = this;
		const tx = tile[ TILE_X ];
		const ty = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];
		const texture = await imageSource.processBufferToTexture( buffer );

		if ( abortSignal.aborted ) {

			texture.dispose();
			texture.image.close();
			return null;

		}

		imageSource.setData( tx, ty, level, texture );

		const res = this._createPlanarMesh( tile );

		res.material.transparent = transparent;
		res.material.side = 2;

		// Behavioral difference from GeneratedSurfacePlugin: apply texture directly from imageSource
		res.material.map = texture;
		res.material.needsUpdate = true;

		return res;

	}

	preprocessNode( tile ) {

		const { tiling } = this.overlay;
		const maxLevel = tiling.maxLevel;
		const level = tile[ TILE_LEVEL ];
		if ( level < maxLevel && tile.parent !== null ) {

			this.expandChildren( tile );

		}

	}

	disposeTile( tile ) {

		// Behavioral difference from GeneratedSurfacePlugin: release imageSource tile
		const tx = tile[ TILE_X ];
		const ty = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];
		const { imageSource } = this;
		if ( imageSource.has( tx, ty, level ) ) {

			imageSource.release( tx, ty, level );

		}

	}

	// Local functions
	_createPlanarMesh( tile ) {

		const { overlay } = this;
		const tx = tile[ TILE_X ];
		const ty = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];

		const boundingBox = tile.boundingVolume.box;
		let sx = 1, sy = 1, x = 0, y = 0, z = 0;
		if ( boundingBox ) {

			[ x, y, z ] = boundingBox;
			sx = boundingBox[ 3 ];
			sy = boundingBox[ 7 ];

		}

		const geometry = new PlaneGeometry( 2 * sx, 2 * sy );
		const mesh = new Mesh( geometry, new MeshBasicMaterial() );
		mesh.position.set( x, y, z );

		const uvRange = overlay.tiling.getTileContentUVBounds( tx, ty, level );
		const { uv } = geometry.attributes;
		for ( let i = 0; i < uv.count; i ++ ) {

			uv.setXY( i,
				MathUtils.mapLinear( uv.getX( i ), 0, 1, uvRange[ 0 ], uvRange[ 2 ] ),
				MathUtils.mapLinear( uv.getY( i ), 0, 1, uvRange[ 1 ], uvRange[ 3 ] ),
			);

		}

		return mesh;

	}

	getTileset( baseUrl ) {

		const { tiles, overlay } = this;
		const { tiling } = overlay;
		const minLevel = tiling.minLevel;
		const { tileCountX, tileCountY } = tiling.getLevel( minLevel );

		const children = [];
		for ( let x = 0; x < tileCountX; x ++ ) {

			for ( let y = 0; y < tileCountY; y ++ ) {

				const child = this.createChild( x, y, minLevel );
				if ( child !== null ) {

					children.push( child );

				}

			}

		}

		const tileset = {
			asset: { version: '1.1' },
			geometricError: Infinity,
			root: {
				refine: 'REPLACE',
				geometricError: Infinity,
				boundingVolume: this.createBoundingVolume( 0, 0, - 1 ),
				children,

				[ TILE_LEVEL ]: - 1,
				[ TILE_X ]: 0,
				[ TILE_Y ]: 0,
			},
		};

		tiles.preprocessTileset( tileset, baseUrl );
		return tileset;

	}

	getUrl( x, y, level ) {

		// Behavioral difference from GeneratedSurfacePlugin: returns real image URL
		return this.imageSource.getUrl( x, y, level );

	}

	fetchData( /* uri */ ) {

		// Behavioral difference from GeneratedSurfacePlugin: real fetches go through normal pipeline

	}

	createBoundingVolume( x, y, level, regionHeight = 0 ) {

		const { shape, overlay } = this;
		const { tiling, projection } = overlay;

		if ( projection.isCartographic && shape === 'ellipsoid' ) {

			const { endCaps } = this;
			const isRoot = level === - 1;
			const normalizedBounds = isRoot ? tiling.getContentBounds( true ) : tiling.getTileBounds( x, y, level, true, true );
			const cartBounds = isRoot ? tiling.getContentBounds() : tiling.getTileBounds( x, y, level, false, true );

			if ( endCaps ) {

				if ( normalizedBounds[ 3 ] === 1 ) cartBounds[ 3 ] = Math.PI / 2;
				if ( normalizedBounds[ 1 ] === 0 ) cartBounds[ 1 ] = - Math.PI / 2;

			}

			return { region: [ ...cartBounds, - regionHeight, 1 ] };

		} else {

			const { center } = this;
			const [ minX, minY, maxX, maxY ] = level === - 1
				? tiling.getContentBounds( true )
				: tiling.getTileBounds( x, y, level, true );

			let extentsX = ( maxX - minX ) / 2;
			let extentsY = ( maxY - minY ) / 2;
			let centerX = minX + extentsX;
			let centerY = minY + extentsY;

			if ( center ) {

				centerX -= 0.5;
				centerY -= 0.5;

			}

			centerX *= tiling.aspectRatio;
			extentsX *= tiling.aspectRatio;

			return {
				box: [
					centerX, centerY, 0,
					extentsX, 0.0, 0.0,
					0.0, extentsY, 0.0,
					0.0, 0.0, 0.0,
				],
			};

		}

	}

	createChild( x, y, level ) {

		const { shape, overlay } = this;
		const { tiling, projection } = overlay;
		if ( ! tiling.getTileExists( x, y, level ) ) {

			return null;

		}

		let geometricError;
		const useRegions = projection.isCartographic && shape === 'ellipsoid';
		if ( useRegions ) {

			const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true );
			const { tilePixelWidth, tilePixelHeight } = tiling.getLevel( level );

			const tileUWidth = ( maxU - minU ) / tilePixelWidth;
			const tileVWidth = ( maxV - minV ) / tilePixelHeight;

			const [ , south, east, north ] = tiling.getTileBounds( x, y, level );
			const midLat = ( south > 0 ) !== ( north > 0 ) ? 0 : Math.min( Math.abs( south ), Math.abs( north ) );
			const midV = projection.convertLatitudeToNormalized( midLat );
			const lonFactor = projection.getLongitudeDerivativeAtNormalized( minU );
			const latFactor = projection.getLatitudeDerivativeAtNormalized( midV );

			const [ xDeriv, yDeriv ] = getCartographicToMeterDerivative( this.tiles.ellipsoid, midLat, east );
			geometricError = Math.max( tileUWidth * lonFactor * xDeriv, tileVWidth * latFactor * yDeriv );

		} else {

			const { pixelWidth, pixelHeight } = tiling.getLevel( level );
			geometricError = Math.max( tiling.aspectRatio / pixelWidth, 1 / pixelHeight );

		}

		return {
			refine: 'REPLACE',
			geometricError,
			boundingVolume: this.createBoundingVolume( x, y, level, useRegions ? geometricError : 0 ),
			content: {
				uri: this.getUrl( x, y, level ),
			},
			children: [],

			[ TILE_X ]: x,
			[ TILE_Y ]: y,
			[ TILE_LEVEL ]: level,
		};

	}

	expandChildren( tile ) {

		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];

		const { tileSplitX, tileSplitY } = this.overlay.tiling.getLevel( level );
		for ( let cx = 0; cx < tileSplitX; cx ++ ) {

			for ( let cy = 0; cy < tileSplitY; cy ++ ) {

				const child = this.createChild( tileSplitX * x + cx, tileSplitY * y + cy, level + 1 );
				if ( child ) {

					tile.children.push( child );

				}

			}

		}

	}

}
