import { Vector2 } from 'three';

export class PointerTracker {

	constructor() {

		this.pointerOrder = [];
		this.pointerPositions = {};

	}

	addPointer( e ) {

		const id = e.pointerId;
		const position = new Vector2( e.clientX, e.clientY );
		this.pointerOrder.push( id );
		this.pointerPositions[ id ] = position;

	}

	updatePointer( e ) {

		const id = e.pointerId;
		if ( ! ( id in this.pointerPositions ) ) {

			return false;

		}

		this.pointerPositions[ id ].set( e.clientX, e.clientY );
		return true;

	}

	deletePointer( e ) {

		const id = e.pointerId;
		const pointerOrder = this.pointerOrder;
		pointerOrder.splice( pointerOrder.indexOf( id ), 1 );
		delete this.pointerPositions[ id ];

	}

	getPointerCount() {

		return this.pointerOrder.length;

	}

	getCenterPoint( target ) {

		const pointerOrder = this.pointerOrder;
		const pointerPositions = this.pointerPositions;
		if ( this.getPointerCount() === 1 ) {

			const id = pointerOrder[ 0 ];
			target.copy( pointerPositions[ id ] );
			return target;

		} else if ( this.getPointerCount() === 2 ) {

			const id0 = this.pointerOrder[ 0 ];
			const id1 = this.pointerOrder[ 1 ];

			const p0 = this.pointerPositions[ id0 ];
			const p1 = this.pointerPositions[ id1 ];

			target.addVectors( p0, p1 ).multiplyScalar( 0.5 );
			return target;

		}

		return null;

	}

	getPointerDistance() {

		if ( this.getPointerCount() <= 1 ) {

			return 0;

		}

		const id0 = this.pointerOrder[ 0 ];
		const id1 = this.pointerOrder[ 1 ];

		const p0 = this.pointerPositions[ id0 ];
		const p1 = this.pointerPositions[ id1 ];

		return p0.distanceTo( p1 );

	}

}
