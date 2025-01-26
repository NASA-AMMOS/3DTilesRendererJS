import { Mesh, MeshBasicMaterial, PlaneGeometry, Texture } from 'three';

export class DeepZoomImagesPlugin {

	constructor( options = {} ) {

		const {
			pixelSize = 0.01,
		} = options;

		this.tiles = null;
		this.pixelSize = pixelSize;

	}

	init( tiles ) {

		this.tiles = tiles;

	}

	parseTile( buffer, tile, extension, abortSignal ) {

		// TODO: need a function to insert before loaders via parseGeometry _or_ consider adding via loading manager?

		const blob = new Blob( [ buffer ] );
		const imageBitmap = createImageBitmap( blob, {
			premultiplyAlpha: 'none',
			colorSpaceConversion: 'none',
		} );
		const texture = new Texture( imageBitmap );
		texture.needsUpdate = true;

		const mesh = new Mesh( new PlaneGeometry(), new MeshBasicMaterial( { map: texture } ) );
		const [
			x, y, z,	// center
			sx,,,		// x vector
			, sy,,		// y vector
			,, sz,		// z vector
		] = tile.boundingVolume.box;

		mesh.position.set( x, y, z );
		mesh.scale.set( sx, sy, sz );

		return mesh;

	}

	loadRootTileSet( url ) {

		return this
			.tiles
			.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( url, this.fetchOptions ) )
			.then( res => res.text() )
			.then( text => {

				const xml = new DOMParser().parseFromString( text, 'text/xml' );
				if ( image.querySelector( 'DisplayRects' ) || xml.querySelector( 'Collection' ) ) {

					throw new Error();

				}

				const image = xml.querySelector( 'Image' );
				const size = image.querySelector( 'Size' );

				const tileSize = parseInt( image.getAttribute( 'TileSize' ) );
				const overlap = parseInt( image.getAttribute( 'Overlap' ) );
				const format = image.getAttribute( 'Format' );
				const width = parseInt( size.getAttribute( 'Width' ) );
				const height = parseInt( size.getAttribute( 'Height' ) );

				const tokens = url.split( /[/\\]/g );
				tokens.pop();
				const stem = tokens.join( '/' );

				// TODO: this probably can't be done with implicit tiles since it doesn't align like a proper octree. Ie you
				// may not split into 4 on the first layer or two with a wide image

				return {
					asset: {
						version: '1.1'
					},
					geometricError: 1024.0,
					root: {
						boundingVolume: {
							box: [ 0.5, 0.5, 0.00625, 0.5, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.00625 ]
						},
						geometricError: Math.max( width / tileSize, height / tileSize ),
						refine: 'REPLACE',
						content: {
							uri: `${ stem }/{level}/{x}_{y}.${ format }`,
						},
						implicitTiling: {
							subdivisionScheme: 'QUADTREE',
							subtreeLevels: Math.ceil( Math.max( width / tileSize, height / tileSize ) ),
							availableLevels: 6,
							subtrees: {
								uri: 'subtrees/{level}.{x}.{y}.subtree'
							}
						}
					}
				};

			} );

	}

}
