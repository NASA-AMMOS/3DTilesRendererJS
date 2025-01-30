import { Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Texture } from 'three';

export class DeepZoomImagePlugin {

	constructor( options = {} ) {

		const {
			pixelSize = 0.01,
			center = false,
		} = options;

		this.name = 'DZI_TILES_PLUGIN';
		this.priority = - 10;
		this.tiles = null;

		this.pixelSize = pixelSize;
		this.center = center;

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
			imageOrientation: 'flipY',
		} );
		const texture = new Texture( imageBitmap );
		texture.generateMipmaps = false;
		texture.colorSpace = SRGBColorSpace;
		texture.needsUpdate = true;

		// Construct mesh
		const mesh = new Mesh( new PlaneGeometry(), new MeshBasicMaterial( { map: texture } ) );
		const boundingBox = tile.boundingVolume.box;
		const [ x, y, z ] = boundingBox;
		const sx = boundingBox[ 3 ];
		const sy = boundingBox[ 7 ];

		mesh.position.set( x, y, z );
		mesh.scale.set( 2 * sx, 2 * sy, 1 );

		return mesh;

	}

	loadRootTileSet() {

		const { pixelSize, center, tiles } = this;

		// TODO: it would be nice if we didn't have to transform the root url and preprocess the tile set here

		// transform the url
		let url = tiles.rootURL;
		tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );

		// If implementing DeepZoom with limitations like a fixed orthographic camera perspective then
		// the target tile level can be immediately "jumped" to for the entire image and in-view tiles
		// can be immediately queried without any hierarchy traversal. Due the flexibility of camera
		// type, rotation, and per-tile error calculation we generate a hierarchy.
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

				// offset for the image so it's center
				const offsetX = center ? pixelSize * - width / 2 : 0;
				const offsetY = center ? pixelSize * - height / 2 : 0;

				const [ stem ] = url.split( /\.[^.]+$/g );

				const tileset = {
					asset: {
						version: '1.1'
					},
					geometricError: 1e5,
					root: expand( 0, 0, 0 ),
				};

				tiles.preprocessTileSet( tileset, url );
				return tileset;

				function expand( level, x, y ) {

					const levelFactor = 2 ** - ( levels - level );
					const levelWidth = Math.ceil( width * levelFactor );
					const levelHeight = Math.ceil( height * levelFactor );

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

					// the center of the tile
					const centerX = tileX + tileWidth / 2;
					const centerY = tileY + tileHeight / 2;

					// the pixel ratio of the image
					const ratioX = width / levelWidth;
					const ratioY = height / levelHeight;

					// Generate the root node
					const node = {
						refine: 'REPLACE',
						geometricError: pixelSize * ( Math.max( width / levelWidth, height / levelHeight ) - 1 ),
						boundingVolume: {
							// DZI operates in a left handed coordinate system so we have to flip y to orient it correctly. FlipY
							// is also enabled on the image bitmap texture generation above.
							box: [
								// center
								ratioX * pixelSize * centerX + offsetX, - ratioY * pixelSize * centerY - offsetY, 0,

								// x, y, z half vectors
								ratioX * pixelSize * tileWidth / 2, 0.0, 0.0,
								0.0, ratioY * pixelSize * tileHeight / 2, 0.0,
								0.0, 0.0, 0,
							],
						},
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
