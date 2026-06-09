import { Group, Matrix4 } from 'three';

// Specialization of "Group" that only updates world matrices of children if
// the transform has changed since the last update and ignores the "force"
// parameter under the assumption that the children tiles will not move.
const tempMat = /* @__PURE__ */ new Matrix4();
export class TilesGroup extends Group {

	constructor( tilesRenderer ) {

		super();
		this.isTilesGroup = true;
		this.name = 'TilesRenderer.TilesGroup';
		this.tilesRenderer = tilesRenderer;
		this.matrixWorldInverse = new Matrix4();

	}

	raycast( raycaster, intersects ) {

		// returning "false" ends raycast traversal
		this.tilesRenderer.raycast( raycaster, intersects );
		return false;

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
				this.matrixWorldInverse.copy( tempMat ).invert();

				// update children
				// the children will not have to change unless the parent group has updated
				const children = this.children;
				for ( let i = 0, l = children.length; i < l; i ++ ) {

					children[ i ].updateMatrixWorld();

				}

				// update the active tile scenes so they are up to date, as well. We iterate over all
				// children above because plugins etc may add other objects.
				const { tilesRenderer } = this;
				const { activeTiles, visibleTiles } = tilesRenderer;
				activeTiles.forEach( tile => {

					if ( ! visibleTiles.has( tile ) ) {

						const { scene } = tile.engineData;
						scene.traverse( c => {

							c.updateMatrix();
							c.matrixWorld.copy( c.matrix );
							if ( c.parent ) {

								c.matrixWorld.premultiply( c.parent.matrixWorld );

							} else {

								c.matrixWorld.premultiply( this.matrixWorld );

							}

						} );

					}

				} );

			}

		}

	}

	updateWorldMatrix( updateParents, updateChildren ) {

		if ( this.parent && updateParents ) {

			this.parent.updateWorldMatrix( updateParents, false );

		}

		// run the normal update function to ensure children and inverse matrices are in sync
		this.updateMatrixWorld( true );

	}

}
