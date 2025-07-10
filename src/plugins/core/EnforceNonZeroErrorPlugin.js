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

			let targetDepth = - 1;
			let targetError = Infinity;
			while ( parent !== null ) {

				if ( parent.geometricError !== 0 && parent.geometricError < targetError ) {

					targetError = parent.geometricError;
					targetDepth = depth;

				}

				parent = parent.parent;
				depth ++;

			}

			// find the smallest error in the parent list to avoid grabbing artificially inflated error values
			// for the sake of forced refinement. Then scale the error by the depth.
			if ( targetDepth !== - 1 ) {

				tile.geometricError = targetError * ( 2 ** - depth );

			}

		}

	}

}
