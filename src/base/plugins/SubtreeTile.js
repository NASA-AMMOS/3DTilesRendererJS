export class SubtreeTile {

	constructor( parentTile, childMortonIndex ) {

		this.parent = parentTile;
		this.children = [];
		this.__level = parentTile.__level + 1;
		this.__implicitRoot = parentTile.__implicitRoot;

		// Index inside the tree
		this.__subtreeIdx = childMortonIndex;
		[ this.__x, this.__y ] = getSubtreeCoordinates( this, parentTile );

	}

	static copy( tile ) {

		const copyTile = {};
		copyTile.children = [];
		copyTile.__level = tile.__level;
		copyTile.__implicitRoot = tile.__implicitRoot;

		// Index inside the tree
		copyTile.__subtreeIdx = tile.__subtreeIdx;
		[ copyTile.__x, copyTile.__y ] = [ tile.__x, tile.__y ];

		copyTile.boundingVolume = tile.boundingVolume;
		copyTile.geometricError = tile.geometricError;
		return copyTile;

	}

}

function getSubtreeCoordinates( tile, parentTile ) {

	if ( ! parentTile ) {

		return [ 0, 0 ];

	}

	const x = 2 * parentTile.__x + ( tile.__subtreeIdx % 2 );
	const y = 2 * parentTile.__y + ( Math.floor( tile.__subtreeIdx / 2 ) % 2 );
	//TODO z coord

	return [ x, y ];

}


