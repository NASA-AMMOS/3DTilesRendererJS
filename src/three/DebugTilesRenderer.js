import { Box3Helper, Group, MeshStandardMaterial, PointsMaterial, Sphere } from 'three';
import { getIndexedRandomColor } from './utilities.js';
import { TilesRenderer } from './TilesRenderer.js';
import { SphereHelper } from './objects/SphereHelper.js';
import { EllipsoidRegionLineHelper } from './objects/EllipsoidRegionHelper.js';

const ORIGINAL_MATERIAL = Symbol( 'ORIGINAL_MATERIAL' );
const HAS_RANDOM_COLOR = Symbol( 'HAS_RANDOM_COLOR' );
const HAS_RANDOM_NODE_COLOR = Symbol( 'HAS_RANDOM_NODE_COLOR' );
const LOAD_TIME = Symbol( 'LOAD_TIME' );

function emptyRaycast() {}

export const NONE = 0;
export const SCREEN_ERROR = 1;
export const GEOMETRIC_ERROR = 2;
export const DISTANCE = 3;
export const DEPTH = 4;
export const RELATIVE_DEPTH = 5;
export const IS_LEAF = 6;
export const RANDOM_COLOR = 7;
export const RANDOM_NODE_COLOR = 8;
export const CUSTOM_COLOR = 9;
export const LOAD_ORDER = 10;

const _sphere = new Sphere();
export class DebugTilesRenderer extends TilesRenderer {

	constructor( ...args ) {

		super( ...args );

		const tilesGroup = this.group;
		const boxGroup = new Group();
		boxGroup.name = 'DebugTilesRenderer.boxGroup';
		tilesGroup.add( boxGroup );

		const sphereGroup = new Group();
		sphereGroup.name = 'DebugTilesRenderer.sphereGroup';
		tilesGroup.add( sphereGroup );

		const regionGroup = new Group();
		regionGroup.name = 'DebugTilesRenderer.regionGroup';
		tilesGroup.add( regionGroup );

		this.displayBoxBounds = false;
		this.displaySphereBounds = false;
		this.displayRegionBounds = false;
		this.colorMode = NONE;
		this.customColorCallback = null;
		this.boxGroup = boxGroup;
		this.sphereGroup = sphereGroup;
		this.regionGroup = regionGroup;
		this.maxDebugDepth = - 1;
		this.maxDebugDistance = - 1;
		this.maxDebugError = - 1;

		this.getDebugColor = ( value, target ) => {

			target.setRGB( value, value, value );

		};

		this.extremeDebugDepth = - 1;
		this.extremeDebugError = - 1;

	}

	initExtremes() {

		// initialize the extreme values of the hierarchy
		let maxDepth = - 1;
		this.traverse( tile => {

			maxDepth = Math.max( maxDepth, tile.__depth );

		} );

		let maxError = - 1;
		this.traverse( tile => {

			maxError = Math.max( maxError, tile.geometricError );

		} );

		this.extremeDebugDepth = maxDepth;
		this.extremeDebugError = maxError;

	}

	fetchTileSet( ...args ) {

		const pr = super.fetchTileSet( ...args );
		pr
			.then( () => {

				// defer to after the loaded tileset has been initialized
				queueMicrotask( () => {

					this.initExtremes();

				} );

			} )
			.catch( () => {

				// error is logged internally

			} );

		return pr;

	}

	getTileInformationFromActiveObject( object ) {

		// Find which tile this scene is associated with. This is slow and
		// intended for debug purposes only.
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

				distanceToCamera: targetTile.__distanceFromCamera,
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

		// set box or sphere visibility
		this.boxGroup.visible = this.displayBoxBounds;
		this.sphereGroup.visible = this.displaySphereBounds;
		this.regionGroup.visible = this.displayRegionBounds;

		// get max values to use for materials
		let maxDepth = - 1;
		if ( this.maxDebugDepth === - 1 ) {

			maxDepth = this.extremeDebugDepth;

		} else {

			maxDepth = this.maxDebugDepth;

		}

		let maxError = - 1;
		if ( this.maxDebugError === - 1 ) {

			maxError = this.extremeDebugError;

		} else {

			maxError = this.maxDebugError;

		}

		let maxDistance = - 1;
		if ( this.maxDebugDistance === - 1 ) {

			this.root.cached.boundingVolume.getSphere( _sphere );
			maxDistance = _sphere.radius;

		} else {

			maxDistance = this.maxDebugDistance;

		}

		const errorTarget = this.errorTarget;
		const colorMode = this.colorMode;
		const visibleTiles = this.visibleTiles;
		let sortedTiles;
		if ( colorMode === LOAD_ORDER ) {

			sortedTiles = Array.from( visibleTiles ).sort( ( a, b ) => {

				return a[ LOAD_TIME ] - b[ LOAD_TIME ];

			} );

		}

		visibleTiles.forEach( tile => {

			const scene = tile.cached.scene;

			// create a random color per-tile
			let h, s, l;
			if ( colorMode === RANDOM_COLOR ) {

				h = Math.random();
				s = 0.5 + Math.random() * 0.5;
				l = 0.375 + Math.random() * 0.25;

			}

			scene.traverse( c => {

				if ( colorMode === RANDOM_NODE_COLOR ) {

					h = Math.random();
					s = 0.5 + Math.random() * 0.5;
					l = 0.375 + Math.random() * 0.25;

				}

				const currMaterial = c.material;
				if ( currMaterial ) {

					// Reset the material if needed
					const originalMaterial = c[ ORIGINAL_MATERIAL ];
					if ( colorMode === NONE && currMaterial !== originalMaterial ) {

						c.material.dispose();
						c.material = c[ ORIGINAL_MATERIAL ];

					} else if ( colorMode !== NONE && currMaterial === originalMaterial ) {

						if ( c.isPoints ) {

							const pointsMaterial = new PointsMaterial();
							pointsMaterial.size = originalMaterial.size;
							pointsMaterial.sizeAttenuation = originalMaterial.sizeAttenuation;
							c.material = pointsMaterial;

						} else {

							c.material = new MeshStandardMaterial();
							c.material.flatShading = true;

						}

					}

					if ( colorMode !== RANDOM_COLOR ) {

						delete c.material[ HAS_RANDOM_COLOR ];

					}

					if ( colorMode !== RANDOM_NODE_COLOR ) {

						delete c.material[ HAS_RANDOM_NODE_COLOR ];

					}

					// Set the color on the basic material
					switch ( colorMode ) {

						case DEPTH: {

							const val = tile.__depth / maxDepth;
							this.getDebugColor( val, c.material.color );
							break;

						}
						case RELATIVE_DEPTH: {

							const val = tile.__depthFromRenderedParent / maxDepth;
							this.getDebugColor( val, c.material.color );
							break;

						}
						case SCREEN_ERROR: {

							const val = tile.__error / errorTarget;
							if ( val > 1.0 ) {

								c.material.color.setRGB( 1.0, 0.0, 0.0 );

							} else {

								this.getDebugColor( val, c.material.color );

							}
							break;

						}
						case GEOMETRIC_ERROR: {

							const val = Math.min( tile.geometricError / maxError, 1 );
							this.getDebugColor( val, c.material.color );
							break;

						}
						case DISTANCE: {

							// We don't update the distance if the geometric error is 0.0 so
							// it will always be black.
							const val = Math.min( tile.__distanceFromCamera / maxDistance, 1 );
							this.getDebugColor( val, c.material.color );
							break;

						}
						case IS_LEAF: {

							if ( ! tile.children || tile.children.length === 0 ) {

								this.getDebugColor( 1.0, c.material.color );


							} else {

								this.getDebugColor( 0.0, c.material.color );

							}
							break;

						}
						case RANDOM_NODE_COLOR: {

							if ( ! c.material[ HAS_RANDOM_NODE_COLOR ] ) {

								c.material.color.setHSL( h, s, l );
								c.material[ HAS_RANDOM_NODE_COLOR ] = true;

							}
							break;

						}
						case RANDOM_COLOR: {

							if ( ! c.material[ HAS_RANDOM_COLOR ] ) {

								c.material.color.setHSL( h, s, l );
								c.material[ HAS_RANDOM_COLOR ] = true;

							}
							break;

						}
						case CUSTOM_COLOR: {

							if ( this.customColorCallback ) {

								this.customColorCallback( tile, c );

							} else {

								console.warn( 'DebugTilesRenderer: customColorCallback not defined' );

							}
							break;

						}
						case LOAD_ORDER: {

							const value = sortedTiles.indexOf( tile );
							this.getDebugColor( value / ( sortedTiles.length - 1 ), c.material.color );
							break;

						}

					}

				}

			} );

		} );

	}

	parseTile( buffer, tile, ext ) {

		tile[ LOAD_TIME ] = performance.now();

		return super.parseTile( buffer, tile, ext );

	}

	setTileVisible( tile, visible ) {

		super.setTileVisible( tile, visible );

		const cached = tile.cached;
		const sphereGroup = this.sphereGroup;
		const boxGroup = this.boxGroup;
		const regionGroup = this.regionGroup;
		const boxHelperGroup = cached.boxHelperGroup;
		const sphereHelper = cached.sphereHelper;
		const regionHelper = cached.regionHelper;

		if ( ! visible ) {

			if ( boxHelperGroup ) {

				boxGroup.remove( boxHelperGroup );

			}

			if ( sphereHelper ) {

				sphereGroup.remove( sphereHelper );

			}

			if ( regionHelper ) {

				regionGroup.remove( regionHelper );

			}

		} else {

			if ( boxHelperGroup ) {

				boxGroup.add( boxHelperGroup );
				boxHelperGroup.updateMatrixWorld( true );

			}

			if ( sphereHelper ) {

				sphereGroup.add( sphereHelper );
				sphereHelper.updateMatrixWorld( true );

			}

			if ( regionHelper ) {

				regionGroup.add( regionHelper );
				regionHelper.updateMatrixWorld( true );

			}

		}

	}

	parseTile( buffer, tile, extension ) {

		return super
			.parseTile( buffer, tile, extension )
			.then( () => {

				const cached = tile.cached;
				const scene = cached.scene;
				if ( scene ) {

					const { sphere, obb, region } = cached.boundingVolume;
					if ( obb ) {

						// Create debug bounding box
						// In some cases the bounding box may have a scale of 0 in one dimension resulting
						// in the NaNs in an extracted rotation so we disable matrix updates instead.
						const boxHelperGroup = new Group();
						boxHelperGroup.name = 'DebugTilesRenderer.boxHelperGroup';
						boxHelperGroup.matrix.copy( obb.transform );
						boxHelperGroup.matrixAutoUpdate = false;

						const boxHelper = new Box3Helper( obb.box, getIndexedRandomColor( tile.__depth ) );
						boxHelper.raycast = emptyRaycast;
						boxHelperGroup.add( boxHelper );

						cached.boxHelperGroup = boxHelperGroup;

						if ( this.visibleTiles.has( tile ) && this.displayBoxBounds ) {

							this.boxGroup.add( boxHelperGroup );
							boxHelperGroup.updateMatrixWorld( true );

						}

					}

					if ( sphere ) {

						// Create debug bounding sphere
						const sphereHelper = new SphereHelper( sphere, getIndexedRandomColor( tile.__depth ) );
						sphereHelper.raycast = emptyRaycast;
						cached.sphereHelper = sphereHelper;

						if ( this.visibleTiles.has( tile ) && this.displaySphereBounds ) {

							this.sphereGroup.add( sphereHelper );
							sphereHelper.updateMatrixWorld( true );

						}

					}

					if ( region ) {

						// Create debug bounding region
						const regionHelper = new EllipsoidRegionLineHelper( region, getIndexedRandomColor( tile.__depth ) );
						regionHelper.raycast = emptyRaycast;

						// recenter the geometry to avoid rendering artifacts
						const sphere = new Sphere();
						region.getBoundingSphere( sphere );
						regionHelper.position.copy( sphere.center );

						sphere.center.multiplyScalar( - 1 );
						regionHelper.geometry.translate( ...sphere.center );

						cached.regionHelper = regionHelper;

						if ( this.visibleTiles.has( tile ) && this.displayRegionBounds ) {

							this.regionGroup.add( regionHelper );
							regionHelper.updateMatrixWorld( true );

						}

					}

					// Cache the original materials
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
			delete cached.boxHelperGroup;

		}

		if ( cached.sphereHelper ) {

			cached.sphereHelper.geometry.dispose();
			delete cached.sphereHelper;

		}

	}

}
