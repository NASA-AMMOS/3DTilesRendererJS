import { SUBTREELoader } from './SUBTREELoader.js';

export class ImplicitTilingPlugin {

	constructor() {

		this.name = 'IMPLICIT_TILING_PLUGIN';

	}

	init( tiles ) {

		this.tiles = tiles;

	}

	preprocessNode( tile, tileSetDir, parentTile ) {

		if ( tile.implicitTiling ) {

			tile.__hasUnrenderableContent = true;
			tile.__hasRenderableContent = false;

			// Declare some properties
			tile.__subtreeIdx = 0;	// Idx of the tile in its subtree
			tile.__implicitRoot = tile;	// Keep this tile as an Implicit Root Tile

			// Coords of the tile
			tile.__x = 0;
			tile.__y = 0;
			tile.__z = 0;
			tile.__level = 0;

		} else if ( /.subtree$/i.test( tile.content?.uri ) ) {

			// Handling content uri pointing to a subtree file
			tile.__hasUnrenderableContent = true;
			tile.__hasRenderableContent = false;

		}

	}

	parseTile( buffer, parseTile, extension ) {

		if ( /^subtree$/i.test( extension ) ) {

			const loader = new SUBTREELoader( parseTile );
			loader.parse( buffer );
			return Promise.resolve();

		}

	}

	preprocessURL( url, tile ) {

		if ( tile && tile.implicitTiling ) {

			const implicitUri = tile.implicitTiling.subtrees.uri
				.replace( '{level}', tile.__level )
				.replace( '{x}', tile.__x )
				.replace( '{y}', tile.__y )
				.replace( '{z}', tile.__z );

			return new URL( implicitUri, tile.__basePath + '/' ).toString();

		}

		return url;

	}

	disposeTile( tile ) {

		if ( /.subtree$/i.test( tile.content?.uri ) ) {

			tile.children.length = 0;

		}

	}

}
