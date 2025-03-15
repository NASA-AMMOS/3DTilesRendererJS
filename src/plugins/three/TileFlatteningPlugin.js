import { Vector3 } from 'three';

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

		tiles.addEventListener( 'update-before', () => {

			if ( this.needsUpdate ) {

				this._updateTiles();

			}

		} );

	}

	setTileActive( tile, active ) {

		// update tiles if not visible yet
		if ( active && ! this.positionsUpdated.has( tile ) ) {

			this._updateTile( tile );

		}

	}

	_updateTile( tile ) {

		this.positionsUpdated.add( tile );

		// TODO: iterate over every vertex and update the flattening

	}

	_updateTiles() {

		this.positionsUpdated.clear();

		// TODO: iterate over every tile and update the flattening

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

		// TODO: reset all the geometry positions
		// TODO: remove event listener

	}

}
