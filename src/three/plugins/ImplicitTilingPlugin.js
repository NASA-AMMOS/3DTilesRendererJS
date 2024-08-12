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

			// Store the infos from the tileset
			tile.__subtreeDivider = tile.implicitTiling.subdivisionScheme === 'QUADTREE' ? 4 : 8;
			tile.__subtreeUri = tile.implicitTiling.subtrees.uri;

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
			let implicitUri = tile.__subtreeUri.replace( '{level}', tile.__level );
			implicitUri = implicitUri.replace( '{x}', tile.__x );
			implicitUri = implicitUri.replace( '{y}', tile.__y );
			implicitUri = implicitUri.replace( '{z}', tile.__z );
			tile.content.uri = new URL( implicitUri, tile.__basePath + '/' ).toString();

			// Handling content uri pointing to a subtree file
		} else if ( /.subtree$/i.test( tile.content?.uri ) ) {

			tile.__hasUnrenderableContent = true;
			tile.__hasRenderableContent = false;
			tile.__implicitRoot = parentTile?.__implicitRoot;	// Idx of the tile in its subtree

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

	disposeTile(tile){
		if (/.subtree$/i.test(tile.content?.uri)){
			tile.children.length = 0;
		}
	}

}
