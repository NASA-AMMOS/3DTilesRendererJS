/** @import { Entity } from 'playcanvas' */
/** @import { Tile } from '3d-tiles-renderer/core' */
import { Quat, SHADERLANGUAGE_GLSL, SHADERLANGUAGE_WGSL, Vec3 } from 'playcanvas';
import { TilesFadePluginBase } from '3d-tiles-renderer/core/plugins';

// The fade is an opaque ordered-dither transition, as in the three.js plugin: a fragment is drawn
// when its 4x4 Bayer dither value is below the fade in value and not below the fade out value, so
// a tile fading in and the tile it replaces fading out draw complementary fragments.
const DECLARATIONS_GLSL = /* glsl */`
uniform float tilesFadeIn;
uniform float tilesFadeOut;

// adapted from https://www.shadertoy.com/view/Mlt3z8
float tilesBayerDither2x2( vec2 v ) {
	return mod( 3.0 * v.y + 2.0 * v.x, 4.0 );
}

float tilesBayerDither4x4( vec2 v ) {
	vec2 p1 = mod( v, 2.0 );
	vec2 p2 = floor( 0.5 * mod( v, 4.0 ) );
	return 4.0 * tilesBayerDither2x2( p1 ) + tilesBayerDither2x2( p2 );
}
`;

const MAIN_START_GLSL = /* glsl */`
	float tilesDither = ( 0.5 + tilesBayerDither4x4( floor( mod( gl_FragCoord.xy, 4.0 ) ) ) ) / 16.0;
	if ( tilesDither >= tilesFadeIn || tilesDither < tilesFadeOut ) {
		discard;
	}
`;

const DECLARATIONS_WGSL = /* wgsl */`
uniform tilesFadeIn: f32;
uniform tilesFadeOut: f32;

// adapted from https://www.shadertoy.com/view/Mlt3z8
fn tilesBayerDither2x2( v: vec2f ) -> f32 {
	return ( 3.0 * v.y + 2.0 * v.x ) % 4.0;
}

fn tilesBayerDither4x4( v: vec2f ) -> f32 {
	let p1 = v % vec2f( 2.0 );
	let p2 = floor( 0.5 * ( v % vec2f( 4.0 ) ) );
	return 4.0 * tilesBayerDither2x2( p1 ) + tilesBayerDither2x2( p2 );
}
`;

const MAIN_START_WGSL = /* wgsl */`
	let tilesDither = ( 0.5 + tilesBayerDither4x4( floor( pcPosition.xy % vec2f( 4.0 ) ) ) ) / 16.0;
	if ( tilesDither >= uniform.tilesFadeIn || tilesDither < uniform.tilesFadeOut ) {
		discard;
	}
`;

// the shader chunks the fade adds to a material while its tile fades, ahead of any code the
// application set in the same chunks
const FADE_CHUNKS = [
	[ SHADERLANGUAGE_GLSL, 'litUserDeclarationPS', DECLARATIONS_GLSL ],
	[ SHADERLANGUAGE_GLSL, 'litUserMainStartPS', MAIN_START_GLSL ],
	[ SHADERLANGUAGE_WGSL, 'litUserDeclarationPS', DECLARATIONS_WGSL ],
	[ SHADERLANGUAGE_WGSL, 'litUserMainStartPS', MAIN_START_WGSL ],
];

// the material the PlayCanvas glTF parser shares between all primitives without a material
const DEFAULT_GLB_MATERIAL = 'defaultGlbMaterial';

const _fromPosition = /* @__PURE__ */ new Vec3();
const _toPosition = /* @__PURE__ */ new Vec3();
const _fromRotation = /* @__PURE__ */ new Quat();
const _toRotation = /* @__PURE__ */ new Quat();

// whether the camera moved more than the fade can follow since the last update
function cameraMovedFast( previous, current ) {

	previous.getTranslation( _fromPosition );
	current.getTranslation( _toPosition );
	_fromRotation.setFromMat4( previous );
	_toRotation.setFromMat4( current );

	const dot = Math.min( 1, Math.abs( _fromRotation.dot( _toRotation ) ) );
	const angle = 2 * Math.acos( dot );
	return angle > 0.25 + 1e-6 || _fromPosition.distance( _toPosition ) > 0.1 + 1e-6;

}

/**
 * Plugin that fades tiles in and out as the level of detail changes, with an opaque ordered
 * dither, so the tile being replaced and its replacement draw complementary pixels instead of
 * popping. While a tile fades, the fade is added to its materials with the `litUserDeclarationPS`
 * and `litUserMainStartPS` shader chunks, ahead of any code the application set in those chunks,
 * and removed once the fade completes, which restores the application's chunks. It works for
 * materials using the lit shader, such as `StandardMaterial`; tiles with other materials, or with
 * materials shared with other tiles, are shown without fading.
 * @extends TilesFadePluginBase
 */
export class TilesFadePlugin extends TilesFadePluginBase {

	/**
	 * @param {Object} [options]
	 * @param {number} [options.fadeDuration=250] - Time in milliseconds for a tile to fully fade in
	 * or out.
	 * @param {number} [options.maximumFadeOutTiles=50] - Maximum simultaneous fade-out tiles. If
	 * exceeded while the camera moves quickly, tiles pop instead of fading.
	 * @param {boolean} [options.fadeRootTiles=false] - Whether root-level tiles fade in on their
	 * first appearance.
	 */
	constructor( options ) {

		super( options );

		// the materials of each tile scene that can fade, and whether they are fading
		this._scenes = new Map();

		// the tile each material belongs to, to detect materials shared between tiles
		this._materialOwners = new WeakMap();

		this._cameraMatrices = new Map();

	}

	setTileVisible( tile, visible ) {

		// tiles without fading materials pop in and out
		const scene = tile.engineData && tile.engineData.scene;
		const record = scene && this._scenes.get( scene );
		if ( ! record || record.materials.length === 0 ) {

			return false;

		}

		return super.setTileVisible( tile, visible );

	}

	/**
	 * @param {Entity} scene
	 * @param {Tile} tile
	 */
	prepareTileScene( scene, tile ) {

		if ( this._scenes.has( scene ) ) {

			return;

		}

		const candidates = new Set();
		for ( const render of scene.findComponents( 'render' ) ) {

			for ( const meshInstance of render.meshInstances ) {

				candidates.add( meshInstance.material );

			}

		}

		const materials = [];
		candidates.forEach( material => {

			const owner = this._materialOwners.get( material );
			if ( material.name !== DEFAULT_GLB_MATERIAL && ( ! owner || owner === tile ) ) {

				this._materialOwners.set( material, tile );
				materials.push( material );

			}

		} );

		this._scenes.set( scene, { materials, fading: false, savedChunks: [] } );

	}

	/**
	 * @param {Entity} scene
	 * @param {Tile} tile
	 */
	releaseTileScene( scene, tile ) {

		const record = this._scenes.get( scene );
		if ( ! record ) {

			return;

		}

		this._scenes.delete( scene );
		applyFade( record, false );
		for ( const material of record.materials ) {

			this._materialOwners.delete( material );

		}

	}

	/**
	 * @param {Tile} tile
	 * @param {number} fadeIn
	 * @param {number} fadeOut
	 */
	setFadeState( tile, fadeIn, fadeOut ) {

		const record = this._scenes.get( tile.engineData.scene );
		if ( record ) {

			applyFade( record, true, fadeIn, fadeOut );

		}

	}

	/**
	 * @param {Tile} tile
	 */
	resetFadeState( tile ) {

		const record = this._scenes.get( tile.engineData.scene );
		if ( record ) {

			applyFade( record, false );

		}

	}

	/**
	 * @param {boolean} checkMovement
	 * @returns {boolean}
	 */
	updateCameraState( checkMovement ) {

		const cameraMatrices = this._cameraMatrices;
		const cameras = this.tiles.cameras;
		let movedFast = false;
		for ( const camera of cameras ) {

			const current = camera.entity.getWorldTransform();
			const previous = cameraMatrices.get( camera );
			if ( previous ) {

				movedFast = movedFast || ( checkMovement && cameraMovedFast( previous, current ) );
				previous.copy( current );

			} else {

				cameraMatrices.set( camera, current.clone() );

			}

		}

		// forget the cameras that were removed
		cameraMatrices.forEach( ( matrix, camera ) => {

			if ( ! cameras.includes( camera ) ) {

				cameraMatrices.delete( camera );

			}

		} );

		return movedFast;

	}

	dispose() {

		super.dispose();
		this._cameraMatrices.clear();

	}

}

// Applies the fade state of a tile. When the tile starts fading, the fade code is added to its
// materials, and once the fade completes it is removed again, so tiles that are not fading render
// without the discard. The shader cache is keyed by the chunk contents, so this is two cached
// variants per material type, and switching between them after the first compile is a cache
// lookup. The fade values are set on the materials, with one Material#update per material for all
// the changes.
function applyFade( record, fading, fadeIn = 1, fadeOut = 0 ) {

	const chunksChanged = record.fading !== fading;
	if ( ! fading && ! chunksChanged ) {

		return;

	}

	record.fading = fading;
	if ( chunksChanged && ! fading ) {

		restoreChunks( record.savedChunks );

	}

	for ( const material of record.materials ) {

		if ( fading ) {

			if ( chunksChanged ) {

				addFadeChunks( material, record.savedChunks );

			}

			material.setParameter( 'tilesFadeIn', fadeIn );
			material.setParameter( 'tilesFadeOut', fadeOut );

		} else {

			material.deleteParameter( 'tilesFadeIn' );
			material.deleteParameter( 'tilesFadeOut' );

		}

		material.update();

	}

}

// Adds the fade code to the shader chunks of a material, ahead of any code the application set in
// the same chunks, and records what each chunk was so it can be restored.
function addFadeChunks( material, savedChunks ) {

	for ( const [ shaderLanguage, name, code ] of FADE_CHUNKS ) {

		const chunks = material.getShaderChunks( shaderLanguage );
		const original = chunks.get( name );
		const value = original ? `${ code }\n${ original }` : code;
		chunks.set( name, value );
		savedChunks.push( { chunks, name, original, value } );

	}

}

// Restores the shader chunks the fade changed. A chunk the application replaced during the fade is
// left as it is, as it no longer holds the fade code.
function restoreChunks( savedChunks ) {

	for ( const { chunks, name, original, value } of savedChunks ) {

		if ( chunks.get( name ) === value ) {

			if ( original === undefined ) {

				chunks.delete( name );

			} else {

				chunks.set( name, original );

			}

		}

	}

	savedChunks.length = 0;

}
