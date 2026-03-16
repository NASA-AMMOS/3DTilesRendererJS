/**
 * Plugin that ensures every tile has a non-zero geometric error. Tiles with a geometric
 * error of zero are assigned a derived value based on the nearest ancestor with a non-zero
 * error, halved once per level of depth below that ancestor.
 */
export class EnforceNonZeroErrorPlugin {

	constructor() {

		this.name = 'ENFORCE_NONZERO_ERROR';
		this.priority = - Infinity;
		this.originalError = new Map();

	}

	preprocessNode( tile ) {

		// if a tile has zero error then traverse the parents and find some geometric error value in
		// the parent hierarchy to use for calculating a pseudo geometric error for this tile.
		if ( tile.geometricError === 0 ) {

			let parent = tile.parent;
			let depth = 1;
			while ( parent !== null ) {

				if ( parent.geometricError !== 0 ) {

					tile.geometricError = parent.geometricError * ( 2 ** - depth );
					break;

				}

				parent = parent.parent;
				depth ++;

			}

		}

	}

}
