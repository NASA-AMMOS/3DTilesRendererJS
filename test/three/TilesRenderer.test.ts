import { Camera, Object3D } from 'three';
import { Tile, TilesRenderer } from '../../src/index.js';
import { expect, test } from 'vitest';

function addCamera( event: { camera: Camera } ) { }

function deleteCamera( event: { camera: Camera } ) { }

function emptyEvent( event: {} ) { }

function loadTileset( event: { tileset: object, url: string } ) { }

function loadModel( event: { scene: Object3D; tile: Tile } ) { }

function disposeModel( event: { scene: Object3D; tile: Tile; } ) { }

function tileVisibilityChange( event: { scene: Object3D; tile: Tile; visible: boolean } ) { }

function loadError( event: { tile: Tile | null, error: Error, url: string | URL } ) { }

function whatever( event: unknown ) { }

// This function is not meant to be executed, but just here to
// guarantee that the exported types match what is expected.

function typecheck( renderer: TilesRenderer ) {

	// Check events emitted by the TilesRenderer
	renderer.addEventListener( 'add-camera', addCamera );
	renderer.addEventListener( 'delete-camera', deleteCamera );
	renderer.addEventListener( 'camera-resolution-change', emptyEvent );
	renderer.addEventListener( 'load-root-tileset', emptyEvent );
	renderer.addEventListener( 'load-tileset', loadTileset );
	renderer.addEventListener( 'tiles-load-start', emptyEvent );
	renderer.addEventListener( 'tiles-load-end', emptyEvent );
	renderer.addEventListener( 'load-content', emptyEvent );
	renderer.addEventListener( 'load-model', loadModel );
	renderer.addEventListener( 'dispose-model', disposeModel );
	renderer.addEventListener( 'tile-visibility-change', tileVisibilityChange );
	renderer.addEventListener( 'update-before', emptyEvent );
	renderer.addEventListener( 'update-after', emptyEvent );
	renderer.addEventListener( 'needs-update', emptyEvent );
	renderer.addEventListener( 'load-error', loadError );

	// Check that we are still able to call an event type that is not
	// known by the TilesRenderer itself.
	renderer.addEventListener( 'my-unknown-event', whatever );

}

test( 'TilesRenderer should not throw', () => {

	const renderer = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json' );

	expect( () => {

		typecheck( renderer );

	} ).not.toThrow();

} );
