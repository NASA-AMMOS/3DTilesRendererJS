// Manager for keeping track of point or PoI annotations and deduping them based on
// the id and tracking the items added and removed.
export class PointAnnotationManager {

	constructor() {

		this.added = new Set();
		this.removed = new Set();
		this.points = new Set();
		this._annotationsById = new Map();


	}

	add( annotation ) {

		const { _annotationsById, points, added } = this;
		const { id } = annotation;
		if ( ! _annotationsById.has( id ) ) {

			_annotationsById.set( id, { annotation, ref: 0 } );
			points.add( annotation );
			added.add( annotation );

		} else {

			// refine the position of the canonical annotation if the new one is from a
			// higher LoD.
			const canonicalAnnotation = _annotationsById.get( id ).annotation;
			if ( annotation.lodLevel > canonicalAnnotation.lodLevel ) {

				canonicalAnnotation.lodLevel = annotation.lodLevel;
				canonicalAnnotation.lat = annotation.lat;
				canonicalAnnotation.lon = annotation.lon;

			}

		}

		_annotationsById.get( id ).ref ++;

	}

	delete( annotation ) {

		const { _annotationsById } = this;
		const { id } = annotation;
		const info = _annotationsById.get( id );
		info.ref --;


	}

	update() {

		const { removed, points, _annotationsById } = this;
		_annotationsById.forEach( ( info, id ) => {

			if ( info.ref === 0 ) {

				removed.add( info.annotation );
				points.delete( info.annotation );
				_annotationsById.delete( id );

			}

		} );

	}

	reset() {

		this.added.clear();
		this.removed.clear();

	}

}
