import { Color, MathUtils, Matrix4, Mesh, Vector2, Vector3 } from 'three';
import { wrapTopoLineMaterial } from './wrapTopoLineMaterial.js';

const _vec = /* @__PURE__ */ new Vector3();
const _vec2 = /* @__PURE__ */ new Vector2();
const _pos = /* @__PURE__ */ new Vector3();
const _norm = /* @__PURE__ */ new Vector3();
const _surfacePoint = /* @__PURE__ */ new Vector3();
const _p0 = /* @__PURE__ */ new Vector3();
const _p1 = /* @__PURE__ */ new Vector3();
const _invFrame = /* @__PURE__ */ new Matrix4();
const _viewMatrix = /* @__PURE__ */ new Matrix4();
const _step0 = /* @__PURE__ */ new Vector3();
const _step1 = /* @__PURE__ */ new Vector3();

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

	get resolution() {

		return this._resolution;

	}

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
		this._resolution = new Vector2( 1, 1 );

		this._resolutionSampleObject = null;

	}

	// function for calculating the positioning of topographic lines at a given world position
	computeTopographicLineInfo( camera, worldPos, target = {} ) {

		// initialize the target
		target.alpha = 0;
		target.value = 0;
		target.fade = 0;
		target.emphasisStride = 0;

		target.min = target.min || {
			step: 0,
			stepInPixels: 0,
		};

		target.max = target.max || {
			step: 0,
			stepInPixels: 0,
		};

		// retrieve local variables
		const { cartoLimit, cartoFadeLimit, topoLimit, topoFadeLimit } = this;
		const pixelRatio = this._pixelRatioUniform.value;
		const resolution = this._resolution;
		const projection = this._projection;
		const invFrame = _invFrame.copy( this.tiles.group.matrixWorld ).invert();
		const viewMatrix = _viewMatrix.copy( camera.matrixWorld ).invert();

		const FADE_SIZE = 0.25;
		const FADE_SIZE_HALF = FADE_SIZE * 0.5;

		// port of calculation of topographic line stride
		const targetPixelsPerStep = pixelRatio * 1.75;

		// calculate projected screen points
		const distanceFromCamera = _vec.copy( worldPos ).applyMatrix4( viewMatrix ).z;
		const p0 = _p0.set( 0, 0, distanceFromCamera ).applyMatrix4( camera.projectionMatrix );
		const p1 = _p1.set( 1, 1, distanceFromCamera ).applyMatrix4( camera.projectionMatrix );

		// amount of pixel change per meter in screen space
		// multiple by 0.5 since the NDC value range is between [-1, 1]
		const pixelDelta = _vec2.subVectors( p1, p0 ).multiply( resolution ).multiplyScalar( 0.5 );

		// amount of meter change per pixel
		const pixelsPerMeter = Math.max( Math.abs( pixelDelta.x ), Math.abs( pixelDelta.y ) );
		const metersPerPixel = 1.0 / pixelsPerMeter;
		const targetMeters = targetPixelsPerStep * metersPerPixel;

		// calculate the nearest power of 10 that the meters
		// TODO: this pixel size target / topo step calculation is too much of an estimation
		const nearestPow10 = Math.log10( targetMeters );
		const topoAlpha = 1.0 - MathUtils.smoothstep( 1.0 - Math.abs( nearestPow10 % 1 ), 1.0 - FADE_SIZE, 1.0 );
		const topoStep = Math.pow( 10.0, Math.ceil( nearestPow10 ) );

		if ( projection === 'ellipsoid' ) {

			_pos.copy( worldPos ).applyMatrix4( invFrame );

			const ellipsoid = this.tiles.ellipsoid;
			ellipsoid.getPositionToSurfacePoint( _pos, _surfacePoint );
			ellipsoid.getPositionToNormal( _pos, _norm );

			const height = _pos.distanceTo( _surfacePoint );

			_pos.x = Math.atan( _norm.y, _norm.x );
			_pos.y = Math.asin( _norm.z );
			_pos.z = height;

			_pos.x = _pos.x * MathUtils.RAD2DEG;
			_pos.y = _pos.x * MathUtils.RAD2DEG;

			_pos.x += 180;

			_pos.x *= 1000.0;
			_pos.y *= 1000.0;

		} else {

			_pos.copy( worldPos ).applyMatrix4( invFrame );
			_pos.x *= 0.1;
			_pos.y *= 0.1;

		}

		_step0.x = MathUtils.clamp( topoStep, cartoLimit.x, cartoLimit.y );
		_step0.y = MathUtils.clamp( topoStep, cartoLimit.x, cartoLimit.y );
		_step0.z = MathUtils.clamp( topoStep, topoLimit.x, topoLimit.y );

		_step1.x = MathUtils.clamp( topoStep * 10.0, cartoLimit.x, cartoLimit.y );
		_step1.y = MathUtils.clamp( topoStep * 10.0, cartoLimit.x, cartoLimit.y );
		_step1.z = MathUtils.clamp( topoStep * 10.0, topoLimit.x, topoLimit.y );

		// const maxFadeLimitAlphaCarto = 1.0 - MathUtils.smoothstep( cartoFadeLimit.y * ( 1.0 - FADE_SIZE_HALF ), cartoFadeLimit.y * ( 1.0 + FADE_SIZE_HALF ), Math.pow( 10.0, nearestPow10 + 1.0 ) );
		// const minFadeLimitAlphaCarto = MathUtils.smoothstep( cartoFadeLimit.x * 0.75, cartoFadeLimit.x * 1.25, Math.pow( 10.0, nearestPow10 + 1.0 ) );
		const maxFadeLimitAlphaTopo = 1.0 - MathUtils.smoothstep( topoFadeLimit.y * ( 1.0 - FADE_SIZE_HALF ), topoFadeLimit.y * ( 1.0 + FADE_SIZE_HALF ), Math.pow( 10.0, nearestPow10 + 1.0 ) );
		const minFadeLimitAlphaTopo = MathUtils.smoothstep( cartoFadeLimit.y * ( 1.0 - FADE_SIZE_HALF ), cartoFadeLimit.y * ( 1.0 + FADE_SIZE_HALF ), Math.pow( 10.0, nearestPow10 + 1.0 ) );

		// result
		target.alpha = topoAlpha;
		target.fade = maxFadeLimitAlphaTopo * minFadeLimitAlphaTopo;
		target.value = _pos.z;

		target.min.step = _step0.z;
		target.min.stepInPixels = _step0.z * pixelsPerMeter;
		target.max.step = _step1.z;
		target.max.stepInPixels = _step1.z * pixelsPerMeter;

		return target;

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

				this._resolution.width = renderTarget.width;
				this._resolution.height = renderTarget.height;
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
