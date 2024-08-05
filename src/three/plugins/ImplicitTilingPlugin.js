import {parseImplicitURI} from "../../base/TilesRendererBase.js";

export class ImplicitTilingPlugin {

	constructor( ) {
		this.name = 'IMPLICIT_TILING_PLUGIN';
	}

	init( tiles ) {

		this.tiles = tiles;

	}

	preprocessNode( tile, uri ) {
		if ( tile.implicitTiling ) {	//only for root

			// Store the infos from the tileset
			tile.availableLevels = tile.implicitTiling.availableLevels;
			tile.subdivisionScheme = tile.implicitTiling.subdivisionScheme;
			tile.__subtreeLevels = tile.implicitTiling.subtreeLevels;
			tile.subtrees = tile.implicitTiling.subtrees;
			tile.__subtreeDivider = tile.subdivisionScheme === "QUADTREE" ? 4 : 8;
			tile.__subtreeUri = tile.implicitTiling.subtrees.uri;
			tile.__contentUri = uri ?? tile.content?.uri;

			// Declare some properties
			tile.__subtreeIdx = 0;	// Idx of the tile in its subtree

			// Coords of the tile
			tile.__x = 0;
			tile.__y = 0;
			tile.content.uri = parseImplicitURI(tile, tile.__basePath, tile.__subtreeUri)
		}


	}



	// preprocessURL( uri, tile ) {
	//
	// 	uri = uri.replace(new URL("{level}"), (tile.__depth ?? tile.__level) ?? 0);
	// 	uri = uri.replace(new URL("{x}"), tile.__x ?? 0);
	// 	uri = uri.replace(new URL("{y}"), tile.__y ?? 0);
	// 	uri = uri.replace(new URL("{z}"), tile.__z ?? 0);
	// 	return uri.toString();
	// }




	// preprocessNode
	// requestTileContents

}
