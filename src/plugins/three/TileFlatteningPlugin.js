import { Vector3 } from 'three';

// Limitations:
// - No support for BatchedTilesPlugin
// - Sharing geometry between models may result in incorrect flattening
export class TileFlatteningPlugin {

	constructor() {

		this.name = 'TILE_FLATTENING_PLUGIN';
		this.priority = - 100;

		this.tiles = null;
		this.shapes = new Map();
		this.positionsMap = new Map();
		this.positionsUpdated = new Set();
		this.needsUpdate = false;

	}

	init( tiles ) {

		this.tiles = tiles;
		this.needsUpdate = true;

		this._updateBeforeCallback = () => {

			if ( this.needsUpdate ) {

				this._updateTiles();

			}

		};
		tiles.addEventListener( 'update-before', this._updateBeforeCallback );

	}

	setTileActive( tile, active ) {

		// update tiles if not visible yet
		if ( active && ! this.positionsUpdated.has( tile ) ) {

			this._updateTile( tile );

		}

	}

	_updateTile( tile ) {

		const { positionsUpdated, positionsMap, shapes } = this;
		positionsUpdated.add( tile );

		const scene = tile.cached.scene;
		if ( ! positionsMap.has( tile ) ) {

			const geomMap = new Map();
			positionsMap.set( tile, geomMap );
			scene.traverse( c => {

				if ( c.geometry ) {

					geomMap.set( c.geometry, c.geometry.attributes.position.array.clone() );

				}

			} );

		} else {

			const geomMap = positionsMap.get( tile );
			scene.traverse( c => {

				if ( c.geometry ) {

					const buffer = geomMap.get( c.geometry );
					if ( buffer ) {

						c.geometry.attributes.position.array.set( buffer );

					}

				}

			} );

		}
		shapes.forEach( ( { shape, matrix, direction } ) => {

			// TODO: check tile intersection with shape

			scene.traverse( c => {

				// TODO
				// iterate over every vertex and update the flattening

				if ( c.geometry ) {

					c.geometry.attributes.position.needsUpdate = true;

				}

			} );

		} );

	}

	_updateTiles() {

		this.positionsUpdated.clear();
		this.tiles.activeTiles.forEach( tile => {

			this._updateTile( tile );

		} );

	}

	addShape( mesh, direction = new Vector3( 0, - 1, 0 ) ) {

		this.needsUpdate = true;

		mesh.updateMatrix();
		this.shapes.set( mesh, {
			shape: mesh,
			direction: direction.clone(),
			matrix: mesh.matrix.clone(),
		} );

	}

	updateShape( mesh ) {

		this.needsUpdate = true;

		mesh.updateMatrix();
		this.shapes.get( mesh ).matrix.copy( mesh.matrix );

	}

	deleteShape( mesh ) {

		this.needsUpdate = true;

		return this.shapes.delete( mesh );

	}

	dispose() {

		this.tiles.removeEventListener( 'before-update', this._updateBeforeCallback );
		this.positionsMap.forEach( geomMap => {

			geomMap.forEach( ( geometry, buffer ) => {

				const { position } = geometry.attributes;
				position.array.set( buffer );
				position.needsUpdate = true;

			} );

		} );

	}

}
