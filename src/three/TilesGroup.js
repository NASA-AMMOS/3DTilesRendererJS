import { Group, Matrix4 } from 'three';

// Specialization of "Group" that only updates world matrices of children if
// the transform has changed since the last update and ignores the "force"
// parameter under the assumption that the children tiles will not move.
const tempMat = new Matrix4();
export class TilesGroup extends Group {

	constructor( tilesRenderer ) {

		super();
		this.name = 'TilesRenderer.TilesGroup';
		this.tilesRenderer = tilesRenderer;

	}

	raycast( raycaster, intersects ) {

		if ( this.tilesRenderer.optimizeRaycast ) {

			this.tilesRenderer.raycast( raycaster, intersects );

		}

	}

	updateMatrixWorld( force ) {

		if ( this.matrixAutoUpdate ) {

			this.updateMatrix();

		}

		if ( this.matrixWorldNeedsUpdate || force ) {

			if ( this.parent === null ) {

				tempMat.copy( this.matrix );

			} else {

				tempMat.multiplyMatrices( this.parent.matrixWorld, this.matrix );

			}

			this.matrixWorldNeedsUpdate = false;

			// check if the matrix changed relative to what it was.
			const elA = tempMat.elements;
			const elB = this.matrixWorld.elements;
			let isDifferent = false;
			for ( let i = 0; i < 16; i ++ ) {

				const itemA = elA[ i ];
				const itemB = elB[ i ];
				const diff = Math.abs( itemA - itemB );

				if ( diff > Number.EPSILON ) {

					isDifferent = true;
					break;

				}

			}

			if ( isDifferent ) {

				this.matrixWorld.copy( tempMat );

				// update children
				// the children will not have to change unless the parent group has updated
				const children = this.children;
				for ( let i = 0, l = children.length; i < l; i ++ ) {

					children[ i ].updateMatrixWorld();

				}

			}

		}

	}

}
