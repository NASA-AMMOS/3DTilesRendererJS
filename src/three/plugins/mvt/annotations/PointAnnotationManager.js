// Manager for keeping track of point or PoI annotations and deduping them based on
// the id and tracking the items added and removed.
export class PointAnnotationManager {

	constructor() {

		this.added = new Set();
		this.removed = new Set();
		this.annotations = new Map();

	}

	add( annotation ) {

		// TODO: we need to "refine" the point annotation positions based on LoD level
		// so we always have the most precise lat / lon position
		const { annotations, added } = this;
		const { id } = annotation;
		if ( ! annotations.has( id ) ) {

			annotations.set( id, { annotation, ref: 0 } );
			added.add( annotation );

		}

		annotations.get( id ).ref ++;

	}

	delete( annotation ) {

		const { annotations } = this;
		const { id } = annotation;
		const info = annotations.get( id );
		info.ref --;


	}

	update() {

		const { removed, annotations } = this;
		annotations.forEach( ( info, id ) => {

			if ( info.ref === 0 ) {

				removed.add( info.annotation );
				annotations.delete( id );

			}

		} );

	}

	reset() {

		this.added.clear();
		this.removed.clear();

	}

}
