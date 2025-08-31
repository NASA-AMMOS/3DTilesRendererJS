// Helper function for traversing a tile set. If `beforeCb` returns `true` then the
// traversal will end early.
export function traverseSet( tile, beforeCb = null, afterCb = null ) {

	const stack = [];

	// A stack-based, depth-first traversal, storing
	// triplets (tile, parent, depth) in the stack array.

	stack.push( tile );
	stack.push( null );
	stack.push( 0 );

	while ( stack.length > 0 ) {

		const depth = stack.pop();
		const parent = stack.pop();
		const tile = stack.pop();

		if ( beforeCb && beforeCb( tile, parent, depth ) ) {

			if ( afterCb ) {

				afterCb( tile, parent, depth );

			}

			return;

		}

		const children = tile.children;

		// Children might be undefined if the tile has not been preprocessed yet
		if ( children ) {

			for ( let i = children.length - 1; i >= 0; i -- ) {

				stack.push( children[ i ] );
				stack.push( tile );
				stack.push( depth + 1 );

			}

		}

		if ( afterCb ) {

			afterCb( tile, parent, depth );

		}

	}

}

// Traverses the ancestry of the tile up to the root tile.
export function traverseAncestors( tile, callback = null ) {

	let current = tile;

	while ( current ) {

		const depth = current.__depth;
		const parent = current.parent;

		if ( callback ) {

			callback( current, parent, depth );

		}

		current = parent;

	}


}
