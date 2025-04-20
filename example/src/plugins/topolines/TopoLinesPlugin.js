import { Color, Vector2 } from 'three';
import { wrapTopoLineMaterial } from './TopoLineMaterialMixin.js';

export class TopoLinesPlugin {

	get topoOpacity() {

		return this.topoOpacityUniform.value;

	}

	set topoOpacity( v ) {

		this.topoOpacityUniform.value = v;

	}

	get cartoOpacity() {

		return this.cartoOpacityUniform.value;

	}

	set cartoOpacity( v ) {

		this.cartoOpacityUniform.value = v;

	}

	get projection() {

		return this._projection;

	}

	set projection( v ) {

		if ( v !== this._projection ) {

			this._projection = v;
			this.tiles.forEachLoadedModel( scene => {

				scene.traverse( c => {

					if ( c.material ) {

						c.material.defines.USE_TOPO_ELLIPSOID = Number( v === 'ellipsoid' );
						c.material.needsUpdate = true;

					}

				} );

			} );

		}

	}

	constructor( options = {} ) {

		const {
			projection = 'planar',

			topoColor = new Color( 0xffffff ),
			topoOpacity = 0.5,
			topoLimits = new Vector2( 0, 1e10 ),

			cartoColor = new Color( 0xffffff ),
			cartoOpacity = 0.5,
			cartoLimits = new Vector2( 0, 1e3 ),
		} = options;

		this.name = 'TOPO_LINES_CONSTRUCTOR';
		this.tiles = null;

		this.topoColor = new Color().set( topoColor );
		this.topoOpacityUniform = { value: topoOpacity };
		this.topoLimits = new Vector2( ...topoLimits );

		this.cartoColor = new Color().set( cartoColor );
		this.cartoOpacityUniform = { value: cartoOpacity };
		this.cartoLimits = new Vector2( ...cartoLimits );

		this._projection = projection;

	}

	init( tiles ) {

		this.tiles = tiles;

		tiles.addEventListener( 'load-model', ( { scene } ) => {

			scene.traverse( c => {

				if ( c.material ) {

					const params = wrapTopoLineMaterial( c.material, c.material.onBeforeCompile );
					params.ellipsoid.value = tiles.ellipsoid.radius;
					params.frame.value = tiles.group.matrixWorld;

					params.topoColor.value = this.topoColor;
					params.topoOpacity = this.topoOpacityUniform;
					params.topoLimits.value = this.topoLimits;

					params.cartoColor.value = this.cartoColor;
					params.cartoOpacity = this.cartoOpacityUniform;
					params.cartoLimits.value = this.cartoLimits;

					c.material.defines.USE_TOPO_ELLIPSOID = Number( this.projection === 'ellipsoid' );
					c.material.needsUpdate = true;

				}

			} );

		} );

	}

}
