import { SUBTREELoader } from './SUBTREELoader.js';

export class ImplicitTilingPlugin {

	constructor() {

		this.name = 'IMPLICIT_TILING_PLUGIN';

	}

	init( tiles ) {

		this.tiles = tiles;

	}

	preprocessNode( tile, tilesetDir, parentTile ) {

		if ( tile.implicitTiling ) {

			tile.internal.hasUnrenderableContent = true;
			tile.internal.hasRenderableContent = false;

			tile.implicitTilingData = {
				// Keep this tile as an Implicit Root Tile
				root: tile,

				// Idx of the tile in its subtree
				subtreeIdx: 0,

				// Coords of the tile
				x: 0,
				y: 0,
				z: 0,
				level: 0,
			};

		} else if ( /.subtree$/i.test( tile.content?.uri ) ) {

			// Handling content uri pointing to a subtree file
			tile.internal.hasUnrenderableContent = true;
			tile.internal.hasRenderableContent = false;

		}

	}

	parseTile( buffer, tile, extension ) {

		if ( /^subtree$/i.test( extension ) ) {

			const loader = new SUBTREELoader( tile );
			loader.workingPath = tile.internal.basePath;
			loader.fetchOptions = this.tiles.fetchOptions;
			return loader.parse( buffer );

		}

	}

	preprocessURL( url, tile ) {

		if ( tile && tile.implicitTiling ) {

			const implicitUri = tile.implicitTiling.subtrees.uri
				.replace( '{level}', tile.implicitTilingData.level )
				.replace( '{x}', tile.implicitTilingData.x )
				.replace( '{y}', tile.implicitTilingData.y )
				.replace( '{z}', tile.implicitTilingData.z );

			return new URL( implicitUri, tile.internal.basePath + '/' ).toString();

		}

		return url;

	}

	disposeTile( tile ) {

		if ( /.subtree$/i.test( tile.content?.uri ) ) {

			// TODO: ideally the plugin doesn't need to know about children being processed
			tile.children.forEach( child => {

				// TODO: there should be a reliable way for removing children like this.
				this.tiles.processNodeQueue.remove( child );

			} );
			tile.children.length = 0;

		}

	}

}
