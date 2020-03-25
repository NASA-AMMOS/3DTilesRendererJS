import { Box3Helper, Group, MeshBasicMaterial } from 'three';
import { TilesRenderer } from './TilesRenderer.js';

const ORIGINAL_MATERIAL = Symbol( 'ORIGINAL_MATERIAL' );

const NONE = 0;
const SCREEN_ERROR = 1;
const GEOMETRIC_ERROR = 2;
const DISTANCE = 3;
const DEPTH = 4;
export class DebugTilesRenderer extends TilesRenderer {

	constructor( ...args ) {

		super( ...args );

		const tilesGroup = this.group;
		const boxGroup = new Group();
		tilesGroup.add( boxGroup );

		this.displayBounds = false;
		this.colorMode = NONE;
		this.boxGroup = boxGroup;

	}

	update() {

		super.update();

		this.boxGroup.visible = this.displayBounds;

		let maxDepth = - 1;
		this.traverse( tile => {

			maxDepth = Math.max( maxDepth, tile.__depth );

		} );

		const errorTarget = this.errorTarget;
		const colorMode = this.colorMode;
		const visibleSet = this.visibleSet;
		this.traverse( tile => {

			const scene = tile.cached.scene;
			if ( visibleSet.has( scene ) ) {

				scene.traverse( c => {

					const currMaterial = c.material;
					if ( currMaterial ) {

						const originalMaterial = c[ ORIGINAL_MATERIAL ];
						if ( colorMode === NONE && currMaterial !== originalMaterial ) {

							c.material.dispose();
							c.material = c[ ORIGINAL_MATERIAL ];

						} else if ( colorMode !== NONE && currMaterial === originalMaterial ) {

							c.material = new MeshBasicMaterial();

						}

						switch ( colorMode ) {

							case DEPTH: {

								const val = tile.__depth / maxDepth;
								c.material.color.setRGB( val, val, val );
								break;

							}
							case SCREEN_ERROR: {

								// TODO
								const relativeError = tile.__error - errorTarget;
								const val = relativeError / 5;
								if ( val < 0.0 ) {

									c.material.color.setRGB( 1.0, 0.0, 0.0 );

								} else {

									c.material.color.setRGB( val, val, val );

								}
								break;

							}
							case GEOMETRIC_ERROR: {

								const val = Math.min( tile.geometricError / 7, 1 );
								c.material.color.setRGB( val, val, val );
								break;

							}
							case DISTANCE: {

								// TODO
								const val = Math.min( tile.geometricError / 7, 1 );
								c.material.color.setRGB( val, val, val );
								break;

							}



						}

					}

				} );

			}

		} );

	}

	setTileVisible( tile, visible ) {

		super.setTileVisible( tile, visible );

		const boxGroup = this.boxGroup;
		const cached = tile.cached;
		const boxHelperGroup = cached.boxHelperGroup;

		if ( ! visible && boxHelperGroup.parent ) {

			boxGroup.remove( boxHelperGroup );

		} else if ( visible && ! boxHelperGroup.parent ) {

			boxGroup.add( boxHelperGroup );
			boxHelperGroup.updateMatrixWorld( true );

		}

	}

	parseTile( buffer, tile ) {

		return super
			.parseTile( buffer, tile )
			.then( () => {

				const cached = tile.cached;
				const scene = cached.scene;
				if ( scene ) {

					const cachedBox = cached.box;
					const cachedBoxMat = cached.boxTransform;
					const cachedTransform = cached.transform;

					const boxHelperGroup = new Group();
					boxHelperGroup.matrix.copy( cachedBoxMat );
					boxHelperGroup.matrix.multiply( cachedTransform );
					boxHelperGroup.matrix.decompose( boxHelperGroup.position, boxHelperGroup.quaternion, boxHelperGroup.scale );

					const boxHelper = new Box3Helper( cachedBox );
					boxHelperGroup.add( boxHelper );
					boxHelperGroup.updateMatrixWorld( true );

					cached.boxHelperGroup = boxHelperGroup;

					if ( this.displayBounds ) {

						this.boxGroup.add( boxHelperGroup );

					}

					scene.traverse( c => {

						const material = c.material;
						if ( material ) {

							c[ ORIGINAL_MATERIAL ] = material;

						}

					} );

				}

			} );

	}

	disposeTile( tile ) {

		super.disposeTile( tile );
		delete tile.cached.boxBounds;

	}

}
