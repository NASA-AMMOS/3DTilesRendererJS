export class EnforceNonZeroErrorPlugin {

	constructor() {

		this.name = 'ENFORCE_NONZERO_ERROR';
		this.priority = - Infinity;
		this.originalError = new Map();

	}

	preprocessNode( tile ) {

		if ( tile.geometricError === 0 ) {

			let parent = tile.parent;
			let depth = 1;
			while ( parent !== null ) {

				if ( parent.geometricError !== 0 && parent.geometricError !== Infinity && ! parent.__hasUnrenderableContent ) {

					tile.geometricError = parent.geometricError * ( 2 ** - depth );
					return;

				}

				parent = parent.parent;
				depth ++;

			}

		}

	}

}
