import { Camera, Object3D } from 'three';
import { Tile, TilesRenderer } from '../../src';

function addCamera( event: { camera: Camera } ) {}
function deleteCamera( event: { camera: Camera } ) {}
function emptyEvent( event: { } ) {}
function loadTileset( event: { tileSet: object, url: string } ) {}
function loadModel( event: { scene: Object3D; tile: Tile } ) {}
function disposeModel( event: { scene: Object3D; tile: Tile; } ) {}
function tileVisibilityChange( event: { scene: Object3D; tile: Tile; visible: boolean } ) {}

function whatever( event: unknown ) {}

// This function is not meant to be executed, but just here to
// guarantee that the exported types match what is expected.
// eslint-disable-next-line no-unused-vars
function typecheck( renderer: TilesRenderer ) {

	// Check events emitted by the TilesRenderer
	renderer.addEventListener( 'add-camera', addCamera );
	renderer.addEventListener( 'delete-camera', deleteCamera );
	renderer.addEventListener( 'camera-resolution-change', emptyEvent );
	renderer.addEventListener( 'load-tile-set', loadTileset );
	renderer.addEventListener( 'tiles-load-start', emptyEvent );
	renderer.addEventListener( 'tiles-load-end', emptyEvent );
	renderer.addEventListener( 'load-content', emptyEvent );
	renderer.addEventListener( 'load-model', loadModel );
	renderer.addEventListener( 'dispose-model', disposeModel );
	renderer.addEventListener( 'tile-visibility-change', tileVisibilityChange );
	renderer.addEventListener( 'update-before', emptyEvent );
	renderer.addEventListener( 'update-after', emptyEvent );

	// Check that we are still able to call an event type that is not
	// known by the TilesRenderer itself.
	renderer.addEventListener( 'my-unknown-event', whatever );

}
