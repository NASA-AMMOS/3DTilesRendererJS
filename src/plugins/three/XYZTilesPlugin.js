import { Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Texture } from 'three';

// TODO: reuse functionality between DZI and this plugin
export class XYZTilesPlugin {

	constructor( options = {} ) {

		const {
			maxZoom = 19,
			pixelSize = 0.00001,
			tileDimension = 256,
			center = false,
		} = options;

		this.name = 'XYZ_TILES_PLUGIN';
		this.priority = - 10;
		this.tiles = null;

		this.tileDimension = tileDimension;
		this.maxZoom = maxZoom;
		this.pixelSize = pixelSize,
		this.center = center;

		this._url = null;

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
		const mesh = new Mesh( new PlaneGeometry(), new MeshBasicMaterial( { map: texture, side: 2 } ) );
		const boundingBox = tile.boundingVolume.box;
		const [ x, y, z ] = boundingBox;
		const sx = boundingBox[ 3 ];
		const sy = boundingBox[ 7 ];

		mesh.position.set( x, y, z );
		mesh.scale.set( 2 * sx, 2 * sy, 1 );

		return mesh;

	}

	async loadRootTileSet() {

		const { tiles } = this;

		// transform the url
		let url = tiles.rootURL;
		tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );

		this._url = url;
		const tileset = {
			asset: {
				version: '1.1'
			},
			geometricError: 1e5,
			root: this.expandNode( 0, 0, 0 ),
		};

		tiles.preprocessTileSet( tileset, url );

		return tileset;

	}

	// TODO: this expansion can be very slow at lower depths
	preprocessNode( tile, dir, parentTile ) {

		const { maxZoom } = this;
		const depth = tile.__z;
		const x = tile.__x;
		const y = tile.__y;
		if ( depth < maxZoom ) {

			for ( let cx = 0; cx < 2; cx ++ ) {

				for ( let cy = 0; cy < 2; cy ++ ) {

					tile.children.push( this.expandNode( depth + 1, 2 * x + cx, 2 * y + cy ) );

				}

			}

		}

	}

	expandNode( depth, x, y ) {

		const { center, maxZoom, pixelSize, tileDimension, _url: url } = this;

		const fullSize = tileDimension * ( 2 ** maxZoom );
		const centerOffset = center ? pixelSize * - fullSize / 2 : 0;
		const depthSize = fullSize * ( 2 ** - ( maxZoom - depth ) );
		const ratio = fullSize / depthSize;
		const centerX = tileDimension * x + tileDimension / 2;
		const centerY = tileDimension * y + tileDimension / 2;

		const node = {
			refine: 'REPLACE',
			geometricError2: pixelSize * ( ( ( maxZoom + 1 ) / ( depth + 1 ) ) - 1 ),
			geometricError: pixelSize * ( ( fullSize / depthSize ) - 1 ),
			boundingVolume: {
				// XYZ operates in a left handed coordinate system so we have to flip y to orient it correctly. FlipY
				// is also enabled on the image bitmap texture generation above.
				box: [
					// center
					ratio * pixelSize * centerX + centerOffset, ratio * - pixelSize * centerY - centerOffset, 0,

					// x, y, z half vectors
					ratio * pixelSize * tileDimension / 2, 0.0, 0.0,
					0.0, ratio * pixelSize * tileDimension / 2, 0.0,
					0.0, 0.0, 0,
				],
			},
			content: {
				uri: url.replace( '{z}', depth ).replace( '{x}', x ).replace( '{y}', y ),
			},
			children: [],

			__x: x,
			__y: y,
			__z: depth,

		};

		return node;

	}

}
