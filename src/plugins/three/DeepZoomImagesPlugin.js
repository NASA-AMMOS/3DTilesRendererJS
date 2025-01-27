import { Mesh, MeshBasicMaterial, PlaneGeometry, Texture } from 'three';

export class DeepZoomImagesPlugin {

	constructor( options = {} ) {

		const {
			pixelSize = 0.01,
			centered = false,
		} = options;

		this.name = 'DZI_TILES_PLUGIN';
		this.priority = - 10;
		this.tiles = null;

		this.pixelSize = pixelSize;
		this.centered = centered;

	}

	init( tiles ) {

		this.tiles = tiles;

	}

	async parseToMesh( buffer, tile, extension, uri, abortSignal ) {

		// Construct texture
		const blob = new Blob( [ buffer ] );
		const imageBitmap = await createImageBitmap( blob, {
			premultiplyAlpha: 'none',
			colorSpaceConversion: 'none',
		} );
		const texture = new Texture( imageBitmap );
		texture.needsUpdate = true;

		// Construct mesh
		const mesh = new Mesh( new PlaneGeometry(), new MeshBasicMaterial( { map: texture } ) );
		const [
			x, y, z,	// center
			sx,,,		// x vector
			, sy,,		// y vector
		] = tile.boundingVolume.box;

		mesh.position.set( x, y, z );
		mesh.scale.set( 2 * sx, 2 * sy, 1 );

		return mesh;

	}

	loadRootTileSet( url ) {

		const { pixelSize, centered, tiles } = this;

		return tiles
			.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( url, this.fetchOptions ) )
			.then( res => res.text() )
			.then( text => {

				const xml = new DOMParser().parseFromString( text, 'text/xml' );
				if ( xml.querySelector( 'DisplayRects' ) || xml.querySelector( 'Collection' ) ) {

					throw new Error( 'DeepZoomImagesPlugin: DisplayRect and Collection DZI files not supported.' );

				}

				// Elements
				const image = xml.querySelector( 'Image' );
				const size = image.querySelector( 'Size' );

				// Image properties
				const tileSize = parseInt( image.getAttribute( 'TileSize' ) );
				const overlap = parseInt( image.getAttribute( 'Overlap' ) );
				const format = image.getAttribute( 'Format' );
				const width = parseInt( size.getAttribute( 'Width' ) );
				const height = parseInt( size.getAttribute( 'Height' ) );
				const levels = Math.ceil( Math.log2( Math.max( width, height ) ) );

				// offset for the image so it's centered
				const offsetX = centered ? width / 2 : 0;
				const offsetY = centered ? height / 2 : 0;

				const [ stem ] = url.split( /\.[^.]+$/g );

				const tileset = {
					asset: {
						version: '1.1'
					},
					geometricError: 1e5,
					root: expand( 0, 0, 0 ),
				};

				return tileset;

				function expand( level, x, y ) {

					// TODO: we need to scale the these tiles based on the level so the scale of the image
					// is overall the same

					const levelWidth = Math.ceil( Math.pow( width, - ( levels - level ) ) );
					const levelHeight = Math.ceil( Math.pow( height, - ( levels - level ) ) );

					let tileX = tileSize * x - overlap;
					let tileY = tileSize * y - overlap;
					let tileWidth = tileSize + overlap * 2;
					let tileHeight = tileSize + overlap * 2;

					// adjust the starting position of the tile to the edge of the image
					if ( tileX < 0 ) {

						tileWidth += tileX;
						tileX = 0;

					}

					if ( tileY < 0 ) {

						tileHeight += tileY;
						tileY = 0;

					}

					// clamp the dimensions to the edge of the image
					if ( tileX + tileWidth > levelWidth ) {

						tileWidth -= tileX + tileWidth - levelWidth;

					}

					if ( tileY + tileHeight > levelHeight ) {

						tileHeight -= tileY + tileHeight - levelHeight;

					}

					// If this section doesn't cover an image then discard it
					if ( tileHeight <= 0 || tileWidth <= 0 ) {

						return null;

					}

					// Generate the root node
					const node = {
						boundingVolume: {
							box: [
								tileX - offsetX + tileWidth / 2, tileY - offsetY + tileHeight / 2, 0,
								tileWidth / 2, 0.0, 0.0,
								0.0, tileHeight / 2, 0.0,
								0.0, 0.0, 0.0,
							].map( n => n * pixelSize ),
						},
						geometricError: Math.max( width / levelWidth, height / levelHeight ) - 1,
						refine: 'REPLACE',
						content: {
							uri: `${ stem }_files/${ level }/${ x }_${ y }.${ format }`,
						},
						children: [],
					};

					// Generate the children
					if ( level < levels ) {

						for ( let cx = 0; cx < 2; cx ++ ) {

							for ( let cy = 0; cy < 2; cy ++ ) {

								const child = expand( level + 1, 2 * x + cx, 2 * y + cy );
								if ( child ) {

									node.children.push( child );

								}

							}

						}

					}

					return node;

				}

			} );

	}

}
