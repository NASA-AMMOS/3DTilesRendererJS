import { Box3Helper, Group, MeshBasicMaterial } from 'three';
import { TilesRenderer } from './TilesRenderer.js';
import { SphereHelper } from './SphereHelper.js';

const ORIGINAL_MATERIAL = Symbol( 'ORIGINAL_MATERIAL' );

const NONE = 0;
const SCREEN_ERROR = 1;
const GEOMETRIC_ERROR = 2;
const DISTANCE = 3;
const DEPTH = 4;
const IS_LEAF = 5;
const RANDOM_COLOR = 6;

function emptyRaycast() {}

export class DebugTilesRenderer extends TilesRenderer {

	constructor( ...args ) {

		super( ...args );

		const tilesGroup = this.group;
		const boxGroup = new Group();
		tilesGroup.add( boxGroup );

		const sphereGroup = new Group();
		tilesGroup.add( sphereGroup );

		this.displayBoxBounds = false;
		this.displaySphereBounds = false;
		this.colorMode = NONE;
		this.boxGroup = boxGroup;
		this.sphereGroup = sphereGroup;
		this.maxDepth = - 1;
		this.maxDistance = - 1;
		this.maxError = - 1;

		this.extremeDepth = - 1;
		this.extremeError = - 1;

	}

	initExtremes() {

		let maxDepth = - 1;
		this.traverse( tile => {

			maxDepth = Math.max( maxDepth, tile.__depth );

		} );

		let maxError = - 1;
		this.traverse( tile => {

			maxError = Math.max( maxError, tile.geometricError );

		} );

		this.extremeDepth = maxDepth;
		this.extremeError = maxError;

	}

	loadTileSet( ...args ) {

		const pr = super.loadTileSet( ...args );
		pr.then( () => this.initExtremes() );

		return pr;

	}

	getTileInformationFromActiveObject( object ) {

		let targetTile = null;
		const activeTiles = this.activeTiles;
		activeTiles.forEach( tile => {

			if ( targetTile ) {

				return true;

			}

			const scene = tile.cached.scene;
			if ( scene ) {

				scene.traverse( c => {

					if ( c === object ) {

						targetTile = tile;

					}

				} );

			}

		} );

		if ( targetTile ) {

			return {

				distanceToCamera: targetTile.cached.distance,
				geometricError: targetTile.geometricError,
				screenSpaceError: targetTile.__error,
				depth: targetTile.__depth,
				isLeaf: targetTile.__isLeaf

			};

		} else {

			return null;

		}

	}

	update() {

		super.update();

		if ( ! this.root ) {

			return;

		}

		this.boxGroup.visible = this.displayBoxBounds;
		this.sphereGroup.visible = this.displaySphereBounds;

		let maxDepth = - 1;
		if ( this.maxDepth === - 1 ) {

			maxDepth = this.extremeDepth;

		} else {

			maxDepth = this.maxDepth;

		}

		let maxError = - 1;
		if ( this.maxError === - 1 ) {

			maxError = this.extremeError;

		} else {

			maxError = this.maxError;

		}

		let maxDistance = - 1;
		if ( this.maxDistance === - 1 ) {

			maxDistance = this.root.cached.sphere.radius;

		} else {

			maxDistance = this.maxDistance;

		}

		const errorTarget = this.errorTarget;
		const colorMode = this.colorMode;
		const visibleTiles = this.visibleTiles;
		visibleTiles.forEach( tile => {

			const scene = tile.cached.scene;
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

					if ( colorMode !== RANDOM_COLOR ) {

						delete c.material.__randomColor;

					}

					switch ( colorMode ) {

						case DEPTH: {

							const val = tile.__depth / maxDepth;
							c.material.color.setRGB( val, val, val );
							break;

						}
						case SCREEN_ERROR: {

							const val = tile.__error / errorTarget;
							if ( val > 1.0 ) {

								c.material.color.setRGB( 1.0, 0.0, 0.0 );

							} else {

								c.material.color.setRGB( val, val, val );

							}
							break;

						}
						case GEOMETRIC_ERROR: {

							const val = Math.min( tile.geometricError / maxError, 1 );
							c.material.color.setRGB( val, val, val );
							break;

						}
						case DISTANCE: {

							// We don't update the distance if the geometric error is 0.0 so
							// it will always be black.
							const val = Math.min( tile.cached.distance / maxDistance, 1 );
							c.material.color.setRGB( val, val, val );
							break;

						}
						case IS_LEAF: {

							if ( ! tile.children || tile.children.length === 0 ) {

								c.material.color.set( 0xffffff );

							} else {

								c.material.color.set( 0 );

							}
							break;

						}
						case RANDOM_COLOR: {

							if ( ! c.material.__randomColor ) {

								const h = Math.random();
								const s = 0.5 + Math.random() * 0.5;
								const l = 0.375 + Math.random() * 0.25;
								c.material.color.setHSL( h, s, l );
								c.material.__randomColor = true;

							}
							break;

						}

					}

				}

			} );

		} );

	}

	setTileVisible( tile, visible ) {

		super.setTileVisible( tile, visible );

		const cached = tile.cached;
		const sphereGroup = this.sphereGroup;
		const boxGroup = this.boxGroup;
		const boxHelperGroup = cached.boxHelperGroup;
		const sphereHelper = cached.sphereHelper;

		if ( ! visible ) {

			boxGroup.remove( boxHelperGroup );
			sphereGroup.remove( sphereHelper );

		} else {

			boxGroup.add( boxHelperGroup );
			boxHelperGroup.updateMatrixWorld( true );

			sphereGroup.add( sphereHelper );
			sphereHelper.updateMatrixWorld( true );

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

					const boxHelperGroup = new Group();
					boxHelperGroup.matrix.copy( cachedBoxMat );
					boxHelperGroup.matrix.decompose( boxHelperGroup.position, boxHelperGroup.quaternion, boxHelperGroup.scale );

					const boxHelper = new Box3Helper( cachedBox );
					boxHelper.raycast = emptyRaycast;
					boxHelperGroup.add( boxHelper );

					cached.boxHelperGroup = boxHelperGroup;

					if ( this.visibleTiles.has( tile ) && this.displayBoxBounds ) {

						this.boxGroup.add( boxHelperGroup );
						boxHelperGroup.updateMatrixWorld( true );

					}

					const cachedSphere = cached.sphere;
					const sphereHelper = new SphereHelper( cachedSphere );
					sphereHelper.raycast = emptyRaycast;
					cached.sphereHelper = sphereHelper;

					if ( this.visibleTiles.has( tile ) && this.displaySphereBounds ) {

						this.sphereGroup.add( sphereHelper );
						sphereHelper.updateMatrixWorld( true );

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

		const cached = tile.cached;
		if ( cached.boxHelperGroup ) {

			cached.boxHelperGroup.children[ 0 ].geometry.dispose();
			cached.sphereHelper.geometry.dispose();

			delete cached.boxHelperGroup;
			delete cached.sphereHelper;

		}

	}

}
