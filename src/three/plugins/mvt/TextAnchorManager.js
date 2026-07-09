import { TextAnchorAnnotation } from './annotations/TextAnchorAnnotation.js';

// Manages the set of anchors per
export class TextAnchorManager {

	constructor() {

		this.added = new Set();
		this.removed = new Set();

		this._anchorsById = new Map();
		this._linesById = new Map();

		// ids whose lines were removed since the last update - only their anchors can have become
		// empty, so update() checks just these instead of scanning every anchor each frame
		this._dirtyIds = new Set();

		// flat sets of every tracked line / anchor, maintained on add / delete for allocation-free
		// iteration
		this.lines = new Set();
		this.anchors = new Set();

	}

	reset() {

		this.added.clear();
		this.removed.clear();

	}

	update() {

		// gather the removed items, checking only the ids whose lines were removed
		const { _anchorsById, _dirtyIds, removed } = this;
		_dirtyIds.forEach( id => {

			const anchors = _anchorsById.get( id );
			if ( ! anchors ) {

				return;

			}

			anchors.forEach( anchor => {

				if ( anchor.isEmpty() ) {

					anchors.delete( anchor );
					this.anchors.delete( anchor );
					removed.add( anchor );

				}

			} );

			// remove any empty anchor lists
			if ( anchors.size === 0 ) {

				_anchorsById.delete( id );

			}

		} );

		_dirtyIds.clear();

	}

	// add a set of lines
	// NOTE: This is is designed to be called with all lines from a single tile at once
	addLines( lines ) {

		const { _anchorsById, _linesById, added } = this;
		const newLineMap = new Map();
		lines.forEach( line => {

			if ( ! newLineMap.has( line.id ) ) {

				newLineMap.set( line.id, [] );

			}

			newLineMap.get( line.id ).push( line );

		} );

		// for each new line
		newLineMap.forEach( ( newLines, id ) => {

			// create the sets if they don't exist yet for these sets of lines
			if ( ! _anchorsById.has( id ) ) {

				_anchorsById.set( id, new Set() );

			}

			if ( ! _linesById.has( id ) ) {

				_linesById.set( id, new Set() );

			}

			// all lines are expected to be of the same LoD and tile if passed in at once
			const baseLine = newLines[ 0 ];

			// For each existing anchor, match it to the closest new anchor in the relevant set
			const anchorSet = _anchorsById.get( id );
			anchorSet.forEach( anchor => {

				// find the closest anchor in the set of lines
				let bestDist = Infinity;
				let bestLine = null;
				let bestIndex = - 1;
				if (
					! baseLine.hasCoverage( anchor.lat, anchor.lon ) ||
					anchor.hasLoD( baseLine.lodLevel )
				) {

					return;

				}

				newLines.forEach( line => {

					line.anchorPositions.forEach( ( anchorPosition, index ) => {

						if ( anchorPosition.ref === null ) {

							// TODO: should we use a consistent canonical position here? Or the current "best"?
							// TODO: does it make sense to "snap" this anchor to the closest line point, instead? Avoiding
							// a jump? But then we will slowly accumulate anchors. Or we can "snap" at first and then revert once
							// it hides? Or slide towards the goal (probably uncomfortable)?
							const dLat = anchor.lat - anchorPosition.lat;
							const dLon = anchor.lon - anchorPosition.lon;
							const dist = dLat * dLat + dLon * dLon;
							if ( dist < bestDist ) {

								bestDist = dist;
								bestLine = line;
								bestIndex = index;

							}

						}

					} );

				} );

				// save the reference
				if ( bestLine ) {

					anchor.addLine( bestLine, bestIndex );
					bestLine.anchorPositions[ bestIndex ].ref = anchor;

				}

			} );

			// Then, add any anchors that need to be created
			newLines.forEach( line => {

				line.anchorPositions.forEach( ( anchorPosition, index ) => {

					if ( anchorPosition.ref === null ) {

						const anchor = new TextAnchorAnnotation( id );
						anchor.addLine( line, index );
						if ( line.hasCoverage( anchor.lat, anchor.lon ) ) {

							anchorPosition.ref = anchor;
							anchorSet.add( anchor );
							this.anchors.add( anchor );
							added.add( anchor );

						}

					}

				} );

			} );

		} );

		// finally, add the lines to the set
		newLineMap.forEach( ( lines, id ) => {

			const lineSet = _linesById.get( id );
			lines.forEach( line => {

				lineSet.add( line );
				this.lines.add( line );

			} );

		} );

	}

	deleteLines( lines ) {

		lines.forEach( line => this.deleteLine( line ) );

	}

	// remove a path; anchors left with no associated paths are dropped
	deleteLine( line ) {

		const { _anchorsById, _linesById } = this;
		const id = line.id;

		_linesById.get( id ).delete( line );
		this.lines.delete( line );
		if ( _linesById.get( id ).size === 0 ) {

			_linesById.delete( id );

		}

		const existingAnchors = _anchorsById.get( id );
		if ( ! existingAnchors ) {

			// this can happen if a line has no anchors added
			return;

		}

		existingAnchors.forEach( anchor => {

			anchor.removeLine( line );

		} );

		// these anchors may have lost their last line - check them on the next update
		this._dirtyIds.add( id );

	}

}
