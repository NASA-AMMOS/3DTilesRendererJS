import { SUBTREELoader } from './SUBTREELoader.js';

export class ImplicitTilingPlugin {

	constructor() {

		this.name = 'IMPLICIT_TILING_PLUGIN';

	}

	init( tiles ) {

		this.tiles = tiles;

	}

	preprocessNode( tile, uri, parentTile ) {

		if ( tile.implicitTiling ) {	//Check if the tile is an Implicit Root Tile

			tile.__hasUnrenderableContent = true;
			tile.__hasRenderableContent = false;

			// Keep the original content uri
			tile.__contentUri = uri ?? tile.content?.uri;

			// Declare some properties
			tile.__subtreeIdx = 0;	// Idx of the tile in its subtree
			tile.__implicitRoot = tile;	// Keep this tile as an Implicit Root Tile

			// Coords of the tile
			tile.__x = 0;
			tile.__y = 0;
			tile.__z = 0;
			tile.__level = 0;

			// Replace the original content uri to the subtree uri
			const implicitUri = tile.implicitTiling.subtrees.uri
				.replace( '{level}', tile.__level )
				.replace( '{x}', tile.__x )
				.replace( '{y}', tile.__y )
				.replace( '{z}', tile.__z );

			tile.content.uri = new URL( implicitUri, tile.__basePath + '/' ).toString();

		} else if ( /.subtree$/i.test( tile.content?.uri ) ) {

			// Handling content uri pointing to a subtree file
			tile.__hasUnrenderableContent = true;
			tile.__hasRenderableContent = false;

		}

	}

	parseTile( buffer, parseTile, extension ) {

		//todo use extension instead ?
		if ( /.subtree$/i.test( parseTile.content.uri ) ) {

			const loader = new SUBTREELoader( parseTile );
			loader.parse( buffer );
			return Promise.resolve();

		}

	}

	disposeTile( tile ) {

		if ( /.subtree$/i.test( tile.content?.uri ) ) {

			tile.children.length = 0;

		}

	}

}
