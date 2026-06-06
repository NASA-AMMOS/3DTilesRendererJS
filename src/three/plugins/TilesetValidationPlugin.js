import { Matrix4, Vector3 } from 'three';

const CONTAINMENT_EPSILON = 1e-7;

const _vertex = /* @__PURE__ */ new Vector3();
const _matrix = /* @__PURE__ */ new Matrix4();

/**
 * Plugin that validates tile geometry containment on load. For each loaded tile it checks that
 * all mesh vertices lie within the tile's bounding volume and within the parent tile's bounding
 * volume, logging a warning for any violations. Intended for debugging only.
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] Whether the plugin is active on init.
 */
export class TilesetValidationPlugin {

	constructor( options = {} ) {

		const {
			enabled = true,
		} = options;

		this.name = 'TILESET_VALIDATION_PLUGIN';
		this.tiles = null;
		this.enabled = enabled;
		this._onLoadModelCB = null;

	}

	init( tiles ) {

		this.tiles = tiles;

		this._onLoadModelCB = ( { scene, tile } ) => {

			this._validateTile( scene, tile );

		};

		tiles.addEventListener( 'load-model', this._onLoadModelCB );
		tiles.forEachLoadedModel( ( scene, tile ) => {

			this._validateTile( scene, tile );

		} );

	}

	dispose() {

		this.tiles.removeEventListener( 'load-model', this._onLoadModelCB );

	}

	_validateTile( scene, tile ) {

		scene.updateMatrixWorld( true );

		const url = tile.content.uri;

		let node = tile;
		let depth = 0;
		while ( node !== null ) {

			const { violations, vertexCount, maxDist } = this._checkContainment( scene, node.engineData.boundingVolume );
			if ( violations > 0 ) {

				const label = depth === 0 ? 'tile' : `ancestor[${ depth }]`;
				console.warn(
					`TilesetValidationPlugin: ${ violations }/${ vertexCount } vertices are at most ${ maxDist.toExponential( 2 ) }m outside ${ label } bounding volume for "${ url }"`
				);

			}

			node = node.parent;
			depth ++;

		}

	}

	_checkContainment( scene, boundingVolume ) {

		const { matrixWorldInverse } = this.tiles.group;

		let vertexCount = 0;
		let violations = 0;
		let maxDist = 0;
		scene.traverse( object => {

			if ( ! object.isMesh ) {

				return;

			}

			_matrix.copy( object.matrixWorld );
			if ( scene.parent ) {

				_matrix.premultiply( matrixWorldInverse );

			}

			const posAttr = object.geometry.getAttribute( 'position' );
			for ( let i = 0, l = posAttr.count; i < l; i ++ ) {

				_vertex.fromBufferAttribute( posAttr, i ).applyMatrix4( _matrix );
				vertexCount ++;

				const dist = boundingVolume.distanceToPoint( _vertex );
				if ( dist > CONTAINMENT_EPSILON ) {

					violations ++;
					maxDist = Math.max( dist, maxDist );

				}

			}

		} );

		return { violations, vertexCount, maxDist };

	}

}
