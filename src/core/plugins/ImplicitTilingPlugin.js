import { SUBTREELoader } from './SUBTREELoader.js';

/**
 * Plugin that adds support for 3D Tiles 1.1 implicit tiling. Intercepts tiles that carry
 * an `implicitTiling` field and expands them by loading and parsing `.subtree` files,
 * generating child tiles according to the implicit subdivision scheme.
 */
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

		// json content arrives already parsed rather than as a buffer
		const isJsonSubtree = /^json$/i.test( extension ) && this.isSubtreeJson( tile );
		if ( /^subtree$/i.test( extension ) || isJsonSubtree ) {

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

	// json only reaches the plugin once it has been ruled out as an external tileset, so the implicit
	// tiling data identifies a subtree, unless the tileset serves its content as json as well.
	isSubtreeJson( tile ) {

		const root = tile.implicitTilingData?.root;
		return Boolean( root ) && ! /\.json$/i.test( root.content?.uri ?? '' );

	}

	disposeTile( tile ) {

		const uri = tile.content?.uri;
		const isJsonSubtree = /\.json$/i.test( uri ) && this.isSubtreeJson( tile );
		if ( /.subtree$/i.test( uri ) || isJsonSubtree ) {

			// TODO: ideally the plugin doesn't need to know about children being processed
			tile.children.forEach( child => {

				// TODO: there should be a reliable way for removing children like this.
				this.tiles.processNodeQueue.remove( child );

			} );
			tile.children.length = 0;

		}

	}

}
