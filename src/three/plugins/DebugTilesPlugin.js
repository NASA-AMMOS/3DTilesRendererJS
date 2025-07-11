import { Box3Helper, Group, MeshStandardMaterial, PointsMaterial, Sphere, Color, MeshBasicMaterial } from 'three';
import { SphereHelper } from './objects/SphereHelper.js';
import { EllipsoidRegionLineHelper } from './objects/EllipsoidRegionHelper.js';
import { traverseAncestors, traverseSet } from '../../core/renderer/tiles/traverseFunctions.js';

const ORIGINAL_MATERIAL = Symbol( 'ORIGINAL_MATERIAL' );
const HAS_RANDOM_COLOR = Symbol( 'HAS_RANDOM_COLOR' );
const HAS_RANDOM_NODE_COLOR = Symbol( 'HAS_RANDOM_NODE_COLOR' );
const LOAD_TIME = Symbol( 'LOAD_TIME' );
const PARENT_BOUND_REF_COUNT = Symbol( 'PARENT_BOUND_REF_COUNT' );

const _sphere = /* @__PURE__ */ new Sphere();
const emptyRaycast = () => {};
const colors = {};

// Return a consistent random color for an index
export function getIndexedRandomColor( index ) {

	if ( ! colors[ index ] ) {

		const h = Math.random();
		const s = 0.5 + Math.random() * 0.5;
		const l = 0.375 + Math.random() * 0.25;

		colors[ index ] = new Color().setHSL( h, s, l );

	}
	return colors[ index ];

}

// color modes
const NONE = 0;
const SCREEN_ERROR = 1;
const GEOMETRIC_ERROR = 2;
const DISTANCE = 3;
const DEPTH = 4;
const RELATIVE_DEPTH = 5;
const IS_LEAF = 6;
const RANDOM_COLOR = 7;
const RANDOM_NODE_COLOR = 8;
const CUSTOM_COLOR = 9;
const LOAD_ORDER = 10;

const ColorModes = Object.freeze( {
	NONE,
	SCREEN_ERROR,
	GEOMETRIC_ERROR,
	DISTANCE,
	DEPTH,
	RELATIVE_DEPTH,
	IS_LEAF,
	RANDOM_COLOR,
	RANDOM_NODE_COLOR,
	CUSTOM_COLOR,
	LOAD_ORDER,
} );

export class DebugTilesPlugin {

	static get ColorModes() {

		return ColorModes;

	}

	get unlit() {

		return this._unlit;

	}

	set unlit( v ) {

		if ( v !== this._unlit ) {

			this._unlit = v;
			this.materialsNeedUpdate = true;

		}

	}

	get colorMode() {

		return this._colorMode;

	}

	set colorMode( v ) {

		if ( v !== this._colorMode ) {

			this._colorMode = v;
			this.materialsNeedUpdate = true;

		}

	}

	constructor( options ) {

		options = {
			displayParentBounds: false,
			displayBoxBounds: false,
			displaySphereBounds: false,
			displayRegionBounds: false,
			colorMode: NONE,
			maxDebugDepth: - 1,
			maxDebugDistance: - 1,
			maxDebugError: - 1,
			customColorCallback: null,
			unlit: false,
			enabled: true,
			...options,
		};

		this.name = 'DEBUG_TILES_PLUGIN';
		this.tiles = null;

		this._colorMode = null;
		this._unlit = null;
		this.materialsNeedUpdate = false;

		this.extremeDebugDepth = - 1;
		this.extremeDebugError = - 1;
		this.boxGroup = null;
		this.sphereGroup = null;
		this.regionGroup = null;

		// options
		this._enabled = options.enabled;
		this._displayParentBounds = options.displayParentBounds;
		this.displayBoxBounds = options.displayBoxBounds;
		this.displaySphereBounds = options.displaySphereBounds;
		this.displayRegionBounds = options.displayRegionBounds;
		this.colorMode = options.colorMode;
		this.maxDebugDepth = options.maxDebugDepth;
		this.maxDebugDistance = options.maxDebugDistance;
		this.maxDebugError = options.maxDebugError;
		this.customColorCallback = options.customColorCallback;
		this.unlit = options.unlit;

		this.getDebugColor = ( value, target ) => {

			target.setRGB( value, value, value );

		};

	}

	get enabled() {

		return this._enabled;

	}

	set enabled( v ) {

		if ( v !== this._enabled && this.tiles !== null ) {

			if ( v ) {

				this.init( this.tiles );

			} else {

				this.dispose();

			}

		}

		this._enabled = v;

	}

	get displayParentBounds() {

		return this._displayParentBounds;

	}

	set displayParentBounds( v ) {

		if ( this._displayParentBounds !== v ) {

			this._displayParentBounds = v;

			if ( ! v ) {

				// Reset all ref counts
				traverseSet( this.tiles.root, null, tile => {

					tile[ PARENT_BOUND_REF_COUNT ] = null;
					this._onTileVisibilityChange( tile, tile.__visible );

				} );

			} else {

				// Initialize ref count for existing tiles
				this.tiles.traverse( tile => {

					if ( tile.__visible ) {

						this._onTileVisibilityChange( tile, true );

					}

				} );

			}

		}

	}

	// initialize the groups for displaying helpers, register events, and initialize existing tiles
	init( tiles ) {

		this.tiles = tiles;

		if ( ! this.enabled ) {

			return;

		}

		// initialize groups
		const tilesGroup = tiles.group;
		this.boxGroup = new Group();
		this.boxGroup.name = 'DebugTilesRenderer.boxGroup';
		tilesGroup.add( this.boxGroup );
		this.boxGroup.updateMatrixWorld();

		this.sphereGroup = new Group();
		this.sphereGroup.name = 'DebugTilesRenderer.sphereGroup';
		tilesGroup.add( this.sphereGroup );
		this.sphereGroup.updateMatrixWorld();

		this.regionGroup = new Group();
		this.regionGroup.name = 'DebugTilesRenderer.regionGroup';
		tilesGroup.add( this.regionGroup );
		this.regionGroup.updateMatrixWorld();

		// register events
		this._onLoadTileSetCB = () => {

			this._initExtremes();

		};

		this._onLoadModelCB = ( { scene, tile } ) => {

			this._onLoadModel( scene, tile );

		};

		this._onDisposeModelCB = ( { tile } ) => {

			this._onDisposeModel( tile );

		};

		this._onUpdateAfterCB = () => {

			this._onUpdateAfter();

		};

		this._onTileVisibilityChangeCB = ( { scene, tile, visible } ) => {

			this._onTileVisibilityChange( tile, visible );

		};

		tiles.addEventListener( 'load-tile-set', this._onLoadTileSetCB );
		tiles.addEventListener( 'load-model', this._onLoadModelCB );
		tiles.addEventListener( 'dispose-model', this._onDisposeModelCB );
		tiles.addEventListener( 'update-after', this._onUpdateAfterCB );
		tiles.addEventListener( 'tile-visibility-change', this._onTileVisibilityChangeCB );

		this._initExtremes();

		// initialize an already-loaded tiles
		tiles.traverse( tile => {

			if ( tile.cached.scene ) {

				this._onLoadModel( tile.cached.scene, tile );

			}

		} );

		tiles.visibleTiles.forEach( tile => {

			this._onTileVisibilityChange( tile, true );

		} );

	}

	getTileInformationFromActiveObject( object ) {

		// Find which tile this scene is associated with. This is slow and
		// intended for debug purposes only.
		let targetTile = null;
		const activeTiles = this.tiles.activeTiles;
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

	_initExtremes() {

		if ( ! ( this.tiles && this.tiles.root ) ) {

			return;

		}

		// initialize the extreme values of the hierarchy
		let maxDepth = - 1;
		let maxError = - 1;

		// Note that we are not using this.tiles.traverse()
		// as we don't want to pay the cost of preprocessing tiles.
		traverseSet( this.tiles.root, null, ( tile, _, depth ) => {

			maxDepth = Math.max( maxDepth, depth );
			maxError = Math.max( maxError, tile.geometricError );

		} );

		this.extremeDebugDepth = maxDepth;
		this.extremeDebugError = maxError;

	}

	_onUpdateAfter() {

		const { tiles, colorMode } = this;

		if ( ! tiles.root ) {

			return;

		}

		if ( this.materialsNeedUpdate ) {

			tiles.forEachLoadedModel( scene => {

				this._updateMaterial( scene );

			} );
			this.materialsNeedUpdate = false;

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

			tiles.getBoundingSphere( _sphere );
			maxDistance = _sphere.radius;

		} else {

			maxDistance = this.maxDebugDistance;

		}

		const { errorTarget, visibleTiles } = tiles;
		let sortedTiles;
		if ( colorMode === LOAD_ORDER ) {

			sortedTiles = Array.from( visibleTiles ).sort( ( a, b ) => {

				return a[ LOAD_TIME ] - b[ LOAD_TIME ];

			} );

		}

		// update plugins
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

				if ( c.material ) {

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

	_onTileVisibilityChange( tile, visible ) {

		if ( this.displayParentBounds ) {

			traverseAncestors( tile, current => {

				if ( current[ PARENT_BOUND_REF_COUNT ] == null ) {

					current[ PARENT_BOUND_REF_COUNT ] = 0;

				}

				if ( visible ) {

					current[ PARENT_BOUND_REF_COUNT ] ++;

				} else if ( current[ PARENT_BOUND_REF_COUNT ] > 0 ) {

					current[ PARENT_BOUND_REF_COUNT ] --;

				}

				const tileVisible = ( current === tile && visible ) || ( this.displayParentBounds && current[ PARENT_BOUND_REF_COUNT ] > 0 );

				this._updateBoundHelper( current, tileVisible );

			} );

		} else {

			this._updateBoundHelper( tile, visible );

		}

	}

	_createBoundHelper( tile ) {

		const tiles = this.tiles;
		const cached = tile.cached;
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

			if ( tiles.visibleTiles.has( tile ) && this.displayBoxBounds ) {

				this.boxGroup.add( boxHelperGroup );
				boxHelperGroup.updateMatrixWorld( true );

			}

		}

		if ( sphere ) {

			// Create debug bounding sphere
			const sphereHelper = new SphereHelper( sphere, getIndexedRandomColor( tile.__depth ) );
			sphereHelper.raycast = emptyRaycast;
			cached.sphereHelper = sphereHelper;

			if ( tiles.visibleTiles.has( tile ) && this.displaySphereBounds ) {

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

			if ( tiles.visibleTiles.has( tile ) && this.displayRegionBounds ) {

				this.regionGroup.add( regionHelper );
				regionHelper.updateMatrixWorld( true );

			}

		}

	}

	_updateHelperMaterial( tile, material ) {

		if ( tile.__visible || ! this.displayParentBounds ) {

			material.opacity = 1;

		} else {

			material.opacity = 0.2;

		}

		const transparent = material.transparent;
		material.transparent = material.opacity < 1;
		if ( material.transparent !== transparent ) {

			material.needsUpdate = true;

		}

	}

	_updateBoundHelper( tile, visible ) {

		const cached = tile.cached;

		if ( ! cached ) {

			return;

		}

		const sphereGroup = this.sphereGroup;
		const boxGroup = this.boxGroup;
		const regionGroup = this.regionGroup;

		if ( visible && ( cached.boxHelperGroup == null && cached.sphereHelper == null && cached.regionHelper == null ) ) {

			this._createBoundHelper( tile );

		}

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

			// TODO: consider updating the volumes based on the bounding regions here in case they've been changed
			if ( boxHelperGroup ) {

				boxGroup.add( boxHelperGroup );
				boxHelperGroup.updateMatrixWorld( true );

				this._updateHelperMaterial( tile, boxHelperGroup.children[ 0 ].material );

			}

			if ( sphereHelper ) {

				sphereGroup.add( sphereHelper );
				sphereHelper.updateMatrixWorld( true );

				this._updateHelperMaterial( tile, sphereHelper.material );

			}

			if ( regionHelper ) {

				regionGroup.add( regionHelper );
				regionHelper.updateMatrixWorld( true );

				this._updateHelperMaterial( tile, regionHelper.material );

			}

		}

	}

	_updateMaterial( scene ) {

		// update the materials for debug rendering
		const { colorMode, unlit } = this;
		scene.traverse( c => {

			if ( ! c.material ) {

				return;

			}

			const currMaterial = c.material;
			const originalMaterial = c[ ORIGINAL_MATERIAL ];

			// dispose the previous material
			if ( currMaterial !== originalMaterial ) {

				currMaterial.dispose();

			}

			// assign the new material
			if ( colorMode !== NONE || unlit ) {

				if ( c.isPoints ) {

					const pointsMaterial = new PointsMaterial();
					pointsMaterial.size = originalMaterial.size;
					pointsMaterial.sizeAttenuation = originalMaterial.sizeAttenuation;
					c.material = pointsMaterial;

				} else if ( unlit ) {

					c.material = new MeshBasicMaterial();

				} else {

					c.material = new MeshStandardMaterial();
					c.material.flatShading = true;

				}

				// if no debug rendering is happening then assign the material properties
				if ( colorMode === NONE ) {

					c.material.map = originalMaterial.map;
					c.material.color.set( originalMaterial.color );

				}

			} else {

				c.material = originalMaterial;

			}

		} );

	}

	_onLoadModel( scene, tile ) {

		tile[ LOAD_TIME ] = performance.now();

		// Cache the original materials
		scene.traverse( c => {

			const material = c.material;
			if ( material ) {

				c[ ORIGINAL_MATERIAL ] = material;

			}

		} );

		// Update the materials to align with the settings
		this._updateMaterial( scene );

	}

	_onDisposeModel( tile ) {

		const cached = tile.cached;
		if ( cached.boxHelperGroup ) {

			cached.boxHelperGroup.children[ 0 ].geometry.dispose();
			delete cached.boxHelperGroup;

		}

		if ( cached.sphereHelper ) {

			cached.sphereHelper.geometry.dispose();
			delete cached.sphereHelper;

		}

		if ( cached.regionHelper ) {

			cached.regionHelper.geometry.dispose();
			delete cached.regionHelper;

		}

	}

	dispose() {

		if ( ! this.enabled ) {

			return;

		}

		const tiles = this.tiles;

		tiles.removeEventListener( 'load-tile-set', this._onLoadTileSetCB );
		tiles.removeEventListener( 'load-model', this._onLoadModelCB );
		tiles.removeEventListener( 'dispose-model', this._onDisposeModelCB );
		tiles.removeEventListener( 'update-after', this._onUpdateAfterCB );
		tiles.removeEventListener( 'tile-visibility-change', this._onTileVisibilityChangeCB );

		// reset all materials
		this.colorMode = NONE;
		this.unlit = false;
		tiles.forEachLoadedModel( scene => {

			this._updateMaterial( scene );

		} );

		// dispose of all helper objects
		tiles.traverse( tile => {

			this._onDisposeModel( tile );

		} );

		this.boxGroup?.removeFromParent();
		this.sphereGroup?.removeFromParent();
		this.regionGroup?.removeFromParent();

	}

}
