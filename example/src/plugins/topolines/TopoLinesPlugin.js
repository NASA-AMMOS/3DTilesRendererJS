import { Color, Vector2 } from 'three';
import { wrapTopoLineMaterial } from './TopoLineMaterialMixin.js';

export class TopoLinesPlugin {

	get topoOpacity() {

		return this.topoOpacityUniform.value;

	}

	set topoOpacity( v ) {

		if ( this.topoOpacityUniform.value !== v ) {

			this.topoOpacityUniform.value = v;
			this.updateDefines();

		}

	}

	get cartoOpacity() {

		return this.cartoOpacityUniform.value;

	}

	set cartoOpacity( v ) {

		if ( this.cartoOpacityUniform.value !== v ) {

			this.cartoOpacityUniform.value = v;
			this.updateDefines();

		}

	}

	get projection() {

		return this._projection;

	}

	set projection( v ) {

		if ( v !== this._projection ) {

			this._projection = v;
			this.updateDefines();

		}

	}

	constructor( options = {} ) {

		const isPlanar = 'projection' in options ? options.projection === 'planar' : true;

		const {
			projection = 'planar',

			topoColor = 		new Color( 0xffffff ),
			topoOpacity = 		0.5,
			topoLimit = 		isPlanar ? new Vector2( 0.1, 1 ) : new Vector2( 1, 1e10 ),
			topoFadeLimit = 	isPlanar ? new Vector2( 0, 1e10 ) : new Vector2( 0, 1e4 ),

			cartoColor = 		new Color( 0xffffff ),
			cartoOpacity = 		isPlanar ? 0 : 0.5,
			cartoLimit = 		new Vector2( 0.1, 1e10 ),
			cartoFadeLimit = 	isPlanar ? new Vector2( 0, 1e10 ) : new Vector2( 1e4, 1e10 ),
		} = options;

		this.name = 'TOPO_LINES_PLUGIN';
		this.tiles = null;

		this.topoColor = new Color().set( topoColor );
		this.topoOpacityUniform = { value: topoOpacity };
		this.topoLimit = new Vector2( ...topoLimit );
		this.topoFadeLimit = new Vector2( ...topoFadeLimit );

		this.cartoColor = new Color().set( cartoColor );
		this.cartoOpacityUniform = { value: cartoOpacity };
		this.cartoLimit = new Vector2( ...cartoLimit );
		this.cartoFadeLimit = new Vector2( ...cartoFadeLimit );

		this._projection = projection;

	}

	init( tiles ) {

		this.tiles = tiles;

		this._loadModelCallback = ( { scene } ) => {

			scene.traverse( c => {

				if ( c.material ) {

					const params = wrapTopoLineMaterial( c.material, c.material.onBeforeCompile );
					params.ellipsoid.value = tiles.ellipsoid.radius;
					params.frame.value = tiles.group.matrixWorld;

					params.topoColor.value = this.topoColor;
					params.topoOpacity = this.topoOpacityUniform;
					params.topoLimit.value = this.topoLimit;
					params.topoFadeLimit.value = this.topoFadeLimit;

					params.cartoColor.value = this.cartoColor;
					params.cartoOpacity = this.cartoOpacityUniform;
					params.cartoLimit.value = this.cartoLimit;
					params.cartoFadeLimit.value = this.cartoFadeLimit;

					c.material.defines.USE_TOPO_ELLIPSOID = Number( this.projection === 'ellipsoid' );
					c.material.needsUpdate = true;

				}

			} );

		};

		tiles.addEventListener( 'load-model', this._loadModelCallback );

	}

	updateDefines() {

		const USE_TOPO_ELLIPSOID = Number( this.projection === 'ellipsoid' );
		const USE_TOPO_LINES = Number( ! ! ( this.topoOpacity + this.cartoOpacity ) );
		this.tiles.forEachLoadedModel( scene => {

			scene.traverse( c => {

				if ( c.material ) {

					const { defines } = c.material.defines;
					if ( defines.USE_TOPO_ELLIPSOID !== USE_TOPO_ELLIPSOID ) {

						defines.USE_TOPO_ELLIPSOID = USE_TOPO_ELLIPSOID;
						c.material.needsUpdate = true;

					}

					if ( defines.USE_TOPO_LINES !== USE_TOPO_LINES ) {

						defines.USE_TOPO_LINES = USE_TOPO_LINES;
						c.material.needsUpdate = true;

					}

				}

			} );

		} );

	}

	dispose() {

		this.cartoOpacity = 0;
		this.topoOpacity = 0;

		this.tiles.removeEventListener( 'load-model', this._loadModelCallback );
		this.updateDefines();

	}

}
