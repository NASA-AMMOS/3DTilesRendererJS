import {SUBTREELoader} from "./SUBTREELoader.js";

export class ImplicitTilingPlugin {

	constructor() {

		this.name = 'IMPLICIT_TILING_PLUGIN';

	}

	init(tiles) {

		this.tiles = tiles;

	}

	preprocessNode(tile, uri) {

		if (tile.implicitTiling) {	//only for root of the tileset

			tile.__hasUnrenderableContent = true;
			tile.__hasRenderableContent = false;

			// Store the infos from the tileset
			tile.__subtreeDivider =  tile.implicitTiling.subdivisionScheme === "QUADTREE" ? 4 : 8;
			tile.__subtreeUri = tile.implicitTiling.subtrees.uri;

			// Original content uri
			tile.__contentUri = uri ?? tile.content?.uri;

			// Declare some properties
			tile.__subtreeIdx = 0;	// Idx of the tile in its subtree

			// Coords of the tile
			tile.__x = 0;
			tile.__y = 0;
			tile.__z = 0;

			let implicitUri = tile.__subtreeUri.replace("{level}", (tile.__depth ?? tile.__level) ?? 0);
			implicitUri = implicitUri.replace("{x}", "0");
			implicitUri = implicitUri.replace("{y}", "0");
			implicitUri = implicitUri.replace("{z}", "0");
			tile.content.uri = new URL(implicitUri, tile.__basePath + '/').toString();
			// Handling subtree uri or empty content from subtree (using __subtreeIdx as a parameter discriminating subtrees)
		}else if (/.subtree$/i.test(tile.content?.uri) || !(tile.__subtreeIdx  || uri)){
			tile.__hasUnrenderableContent = true;
			tile.__hasRenderableContent = false;

		}

	}

	parseTile(buffer, parseTile, extension) {

		//todo use extension instead ?
		if (/.subtree$/i.test(parseTile.content.uri)) {
			const loader = new SUBTREELoader(parseTile, this.tiles.root);
			loader.parse(buffer);
			return Promise.resolve()
		}

	}

}
