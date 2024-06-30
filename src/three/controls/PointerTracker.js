import { Vector2 } from 'three';

export class PointerTracker {

	constructor() {

		this.domElement = null;
		this.buttons = 0;
		this.pointerType = null;
		this.pointerOrder = [];
		this.previousPositions = {};
		this.pointerPositions = {};
		this.startPositions = {};
		this.pointerSetThisFrame = {};
		this.hoverPosition = new Vector2();
		this.hoverSet = false;

	}

	reset() {

		this.buttons = 0;
		this.pointerType = null;
		this.pointerOrder = [];
		this.previousPositions = {};
		this.pointerPositions = {};
		this.startPositions = {};
		this.pointerSetThisFrame = {};
		this.hoverPosition = new Vector2();
		this.hoverSet = false;

	}

	// The pointers can be set multiple times per frame so track whether the pointer has
	// been set this frame or not so we don't overwrite the previous position and lose information
	// about pointer movement
	updateFrame() {

		const { previousPositions, pointerPositions } = this;
		for ( const id in pointerPositions ) {

			previousPositions[ id ].copy( pointerPositions[ id ] );

		}

	}

	setHoverEvent( e ) {

		if ( e.pointerType === 'mouse' ) {

			this.getAdjustedPointer( e, this.hoverPosition );
			this.hoverSet = true;

		}

	}

	getLatestPoint( target ) {

		if ( this.pointerType !== null ) {

			this.getCenterPoint( target );
			return target;

		} else if ( this.hoverSet ) {

			target.copy( this.hoverPosition );
			return target;

		} else {

			return null;

		}

	}

	// get the pointer position in the coordinate system of the target element
	getAdjustedPointer( e, target ) {

		const domRef = this.domElement ? this.domElement : e.target;
		const rect = domRef.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		target.set( x, y );

	}

	addPointer( e ) {

		const id = e.pointerId;
		const position = new Vector2();
		this.getAdjustedPointer( e, position );
		this.pointerOrder.push( id );
		this.pointerPositions[ id ] = position;
		this.previousPositions[ id ] = position.clone();
		this.startPositions[ id ] = position.clone();

		if ( this.getPointerCount() === 1 ) {

			this.pointerType = e.pointerType;
			this.buttons = e.buttons;

		}

	}

	updatePointer( e ) {

		const id = e.pointerId;
		if ( ! ( id in this.pointerPositions ) ) {

			return false;

		}

		this.getAdjustedPointer( e, this.pointerPositions[ id ] );
		return true;

	}

	deletePointer( e ) {

		const id = e.pointerId;
		const pointerOrder = this.pointerOrder;
		pointerOrder.splice( pointerOrder.indexOf( id ), 1 );
		delete this.pointerPositions[ id ];
		delete this.previousPositions[ id ];
		delete this.startPositions[ id ];

		if ( this.getPointerCount.length === 0 ) {

			this.buttons = 0;
			this.pointerType = null;

		}

	}

	getPointerCount() {

		return this.pointerOrder.length;

	}

	getCenterPoint( target, pointerPositions = this.pointerPositions ) {

		const pointerOrder = this.pointerOrder;
		if ( this.getPointerCount() === 1 || this.getPointerType() === 'mouse' ) {

			const id = pointerOrder[ 0 ];
			target.copy( pointerPositions[ id ] );
			return target;

		} else if ( this.getPointerCount() === 2 ) {

			const id0 = this.pointerOrder[ 0 ];
			const id1 = this.pointerOrder[ 1 ];

			const p0 = pointerPositions[ id0 ];
			const p1 = pointerPositions[ id1 ];

			target.addVectors( p0, p1 ).multiplyScalar( 0.5 );
			return target;

		}

		return null;

	}

	getPreviousCenterPoint( target ) {

		return this.getCenterPoint( target, this.previousPositions );

	}

	getStartCenterPoint( target ) {

		return this.getCenterPoint( target, this.startPositions );

	}

	getPointerDistance( pointerPositions = this.pointerPositions ) {

		if ( this.getPointerCount() <= 1 || this.getPointerType() === 'mouse' ) {

			return 0;

		}

		const { pointerOrder } = this;
		const id0 = pointerOrder[ 0 ];
		const id1 = pointerOrder[ 1 ];

		const p0 = pointerPositions[ id0 ];
		const p1 = pointerPositions[ id1 ];

		return p0.distanceTo( p1 );

	}

	getPreviousPointerDistance() {

		return this.getPointerDistance( this.previousPositions );

	}

	getStartPointerDistance() {

		return this.getPointerDistance( this.startPositions );

	}

	getPointerType() {

		return this.pointerType;

	}

	isPointerTouch() {

		return this.getPointerType() === 'touch';

	}

	getPointerButtons() {

		return this.buttons;

	}

	isLeftClicked() {

		return Boolean( this.buttons & 1 );

	}

	isRightClicked() {

		return Boolean( this.buttons & 2 );

	}

}
