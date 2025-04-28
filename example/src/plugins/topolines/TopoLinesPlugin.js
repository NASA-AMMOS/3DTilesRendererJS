import { Color, Mesh, Vector2 } from 'three';
import { wrapTopoLineMaterial } from './wrapTopoLineMaterial.js';

class ResolutionSampler extends Mesh {

	constructor() {

		super();

	}

	dispose() {

		this.removeFromParent();
		this.material.dispose();
		this.geometry.dispose();

	}

}

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

	get thickness() {

		return this.thicknessUniform.value;

	}

	set thickness( v ) {

		this.thicknessUniform.value = v;

	}

	constructor( options = {} ) {

		const isPlanar = 'projection' in options ? options.projection === 'planar' : true;

		const {
			projection = 'planar',

			thickness = 		1,

			// options for topographic lines
			// "topoLimit" refers to the min and max distances between each topo line
			// "topoFadeLimit" refers to the fade in and out point of the topo lines as a whole
			topoColor = 		new Color( 0xffffff ),
			topoOpacity = 		0.5,
			topoLimit = 		isPlanar ? new Vector2( 0.1, 1e10 ) : new Vector2( 1, 1e10 ),
			topoFadeLimit = 	isPlanar ? new Vector2( 0, 1e10 ) : new Vector2( 0, 1e4 ),

			// options for cartesian and cartographic lines when in planar and ellipsoid mode respectively
			cartoColor = 		new Color( 0xffffff ),
			cartoOpacity = 		isPlanar ? 0 : 0.5,
			cartoLimit = 		new Vector2( 0.1, 1e10 ),
			cartoFadeLimit = 	isPlanar ? new Vector2( 0, 1e10 ) : new Vector2( 1.5 * 1e4, 1e6 ),
		} = options;

		this.name = 'TOPO_LINES_PLUGIN';
		this.tiles = null;

		this.thicknessUniform = { value: thickness };

		this.topoColor = new Color().set( topoColor );
		this.topoOpacityUniform = { value: topoOpacity };
		this.topoLimit = new Vector2( ...topoLimit );
		this.topoFadeLimit = new Vector2( ...topoFadeLimit );

		this.cartoColor = new Color().set( cartoColor );
		this.cartoOpacityUniform = { value: cartoOpacity };
		this.cartoLimit = new Vector2( ...cartoLimit );
		this.cartoFadeLimit = new Vector2( ...cartoFadeLimit );

		this._projection = projection;
		this._pixelRatioUniform = { value: 1 };
		this._resolution = new Vector2();

		this._resolutionSampleObject = null;

	}

	init( tiles ) {

		this.tiles = tiles;

		this._loadModelCallback = ( { scene } ) => {

			scene.traverse( c => {

				if ( c.material ) {

					const params = wrapTopoLineMaterial( c.material, c.material.onBeforeCompile );
					params.ellipsoid.value = tiles.ellipsoid.radius;
					params.frame.value = tiles.group.matrixWorld;

					params.thickness = this.thicknessUniform;

					params.topoColor.value = this.topoColor;
					params.topoOpacity = this.topoOpacityUniform;
					params.topoLimit.value = this.topoLimit;
					params.topoFadeLimit.value = this.topoFadeLimit;

					params.cartoColor.value = this.cartoColor;
					params.cartoOpacity = this.cartoOpacityUniform;
					params.cartoLimit.value = this.cartoLimit;
					params.cartoFadeLimit.value = this.cartoFadeLimit;

					params.resolution.value = this._resolution;
					params.pixelRatio = this._pixelRatioUniform;

					c.material.defines.USE_TOPO_ELLIPSOID = Number( this.projection === 'ellipsoid' );
					c.material.needsUpdate = true;

				}

			} );

		};

		tiles.addEventListener( 'load-model', this._loadModelCallback );

		// Create an empty
		const resolutionSampleObject = new ResolutionSampler();
		resolutionSampleObject.frustumCulled = false;
		resolutionSampleObject.onBeforeRender = renderer => {

			const renderTarget = renderer.getRenderTarget();
			if ( renderTarget ) {

				renderTarget.getSize( this._resolution );
				this._pixelRatioUniform.value = 1;

			} else {

				renderer.getDrawingBufferSize( this._resolution );
				this._pixelRatioUniform.value = renderer.getPixelRatio();

			}

		};
		tiles.group.add( resolutionSampleObject );
		this._resolutionSampleObject = resolutionSampleObject;

	}

	updateDefines() {

		const USE_TOPO_ELLIPSOID = Number( this.projection === 'ellipsoid' );
		const USE_TOPO_LINES = Number( ! ! ( this.topoOpacity + this.cartoOpacity ) );
		this.tiles.forEachLoadedModel( scene => {

			scene.traverse( c => {

				if ( c.material ) {

					const { defines } = c.material;
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

		this._resolutionSampleObject.dispose();

	}

}
