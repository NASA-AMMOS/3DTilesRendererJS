import {
	ClampToEdgeWrapping,
	DataTexture,
	FloatType,
	LinearFilter,
	Matrix4,
	MeshDepthMaterial,
	MeshDistanceMaterial,
	NoColorSpace,
	RedFormat,
	RGBADepthPacking,
	Vector3,
} from 'three';

const MATERIAL_STATE = /* @__PURE__ */ Symbol( 'POLYGON_CLIPPING_MATERIAL_STATE' );
const MESH_STATE = /* @__PURE__ */ Symbol( 'POLYGON_CLIPPING_MESH_STATE' );
const DEFAULT_RESOLUTION = 512;
const MAX_RESOLUTION = 4096;
const BORDER_TEXELS = 2;

const _inverseMatrix = /* @__PURE__ */ new Matrix4();
const _point = /* @__PURE__ */ new Vector3();

/**
 * A two-dimensional point in polygon-local coordinates.
 * @typedef {Array<number>} PolygonClippingPoint
 */

/**
 * A closed polygon ring. The final point does not need to repeat the first point.
 * @typedef {Array<PolygonClippingPoint>} PolygonClippingRing
 */

/**
 * A polygon represented by an outer ring followed by zero or more hole rings.
 * @typedef {Array<PolygonClippingRing>} PolygonClippingPolygon
 */

function isPointInRing( x, y, ring ) {

	let result = false;
	for ( let i = 0, j = ring.length - 1; i < ring.length; j = i ++ ) {

		const pointA = ring[ i ];
		const pointB = ring[ j ];
		const intersects =
			( pointA[ 1 ] > y ) !== ( pointB[ 1 ] > y ) &&
			x < ( pointB[ 0 ] - pointA[ 0 ] ) * ( y - pointA[ 1 ] ) / ( pointB[ 1 ] - pointA[ 1 ] ) + pointA[ 0 ];
		if ( intersects ) {

			result = ! result;

		}

	}

	return result;

}

function isPointInPolygon( x, y, polygon ) {

	let result = false;
	for ( const ring of polygon ) {

		if ( isPointInRing( x, y, ring ) ) {

			result = ! result;

		}

	}

	return result;

}

function distanceToSegmentSquared( x, y, pointA, pointB ) {

	const deltaX = pointB[ 0 ] - pointA[ 0 ];
	const deltaY = pointB[ 1 ] - pointA[ 1 ];
	const lengthSquared = deltaX * deltaX + deltaY * deltaY;
	let alpha = lengthSquared === 0 ? 0 :
		( ( x - pointA[ 0 ] ) * deltaX + ( y - pointA[ 1 ] ) * deltaY ) / lengthSquared;
	alpha = Math.max( 0, Math.min( 1, alpha ) );

	const offsetX = x - ( pointA[ 0 ] + alpha * deltaX );
	const offsetY = y - ( pointA[ 1 ] + alpha * deltaY );
	return offsetX * offsetX + offsetY * offsetY;

}

function signedDistanceToPolygons( x, y, polygons ) {

	let inside = false;
	let minDistanceSquared = Infinity;
	for ( const polygon of polygons ) {

		if ( isPointInPolygon( x, y, polygon ) ) {

			inside = true;

		}

		for ( const ring of polygon ) {

			for ( let i = 0, l = ring.length; i < l; i ++ ) {

				minDistanceSquared = Math.min(
					minDistanceSquared,
					distanceToSegmentSquared( x, y, ring[ i ], ring[ ( i + 1 ) % l ] ),
				);

			}

		}

	}

	const distance = Math.sqrt( minDistanceSquared );
	return inside ? - distance : distance;

}

function normalizePolygons( value ) {

	if ( value === null || value === undefined ) {

		return [];

	}

	if ( ! Array.isArray( value ) ) {

		throw new Error( 'PolygonClippingPlugin: "polygons" must be an array.' );

	}

	return value.map( ( polygon, polygonIndex ) => {

		if ( ! Array.isArray( polygon ) ) {

			throw new Error( `PolygonClippingPlugin: Polygon ${ polygonIndex } must be an array of rings.` );

		}

		return polygon.map( ( ring, ringIndex ) => {

			if ( ! Array.isArray( ring ) || ring.length < 3 ) {

				throw new Error( `PolygonClippingPlugin: Ring ${ ringIndex } in polygon ${ polygonIndex } must have at least three points.` );

			}

			return ring.map( ( point, pointIndex ) => {

				if (
					! Array.isArray( point ) ||
					point.length < 2 ||
					! Number.isFinite( point[ 0 ] ) ||
					! Number.isFinite( point[ 1 ] )
				) {

					throw new Error( `PolygonClippingPlugin: Point ${ pointIndex } in ring ${ ringIndex } of polygon ${ polygonIndex } is invalid.` );

				}

				return [ point[ 0 ], point[ 1 ] ];

			} );

		} );

	} );

}

function rasterizePolygons( polygons, resolution, padding ) {

	if ( polygons.length === 0 ) {

		return null;

	}

	if ( ! Number.isFinite( resolution ) || resolution < 2 || resolution > MAX_RESOLUTION ) {

		throw new Error( `PolygonClippingPlugin: "resolution" must be between 2 and ${ MAX_RESOLUTION }.` );

	}

	if ( ! Number.isFinite( padding ) || padding < 0 ) {

		throw new Error( 'PolygonClippingPlugin: "padding" must be a finite, non-negative number.' );

	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = - Infinity;
	let maxY = - Infinity;
	for ( const polygon of polygons ) {

		for ( const ring of polygon ) {

			for ( const point of ring ) {

				minX = Math.min( minX, point[ 0 ] );
				minY = Math.min( minY, point[ 1 ] );
				maxX = Math.max( maxX, point[ 0 ] );
				maxY = Math.max( maxY, point[ 1 ] );

			}

		}

	}

	if ( ! ( maxX > minX ) || ! ( maxY > minY ) ) {

		throw new Error( 'PolygonClippingPlugin: Polygons must span a non-zero area.' );

	}

	resolution = Math.round( resolution );
	const initialExtentX = maxX - minX + 2 * padding;
	const initialExtentY = maxY - minY + 2 * padding;
	const texelSize = Math.max( initialExtentX, initialExtentY ) / ( resolution - 1 );
	const border = BORDER_TEXELS * texelSize;
	minX -= padding + border;
	minY -= padding + border;
	maxX += padding + border;
	maxY += padding + border;

	const extentX = maxX - minX;
	const extentY = maxY - minY;
	const maxExtent = Math.max( extentX, extentY );
	const width = Math.max( 2, Math.round( extentX / maxExtent * ( resolution - 1 ) ) + 1 );
	const height = Math.max( 2, Math.round( extentY / maxExtent * ( resolution - 1 ) ) + 1 );
	const data = new Float32Array( width * height );

	for ( let y = 0; y < height; y ++ ) {

		const localY = minY + y / ( height - 1 ) * extentY;
		for ( let x = 0; x < width; x ++ ) {

			const localX = minX + x / ( width - 1 ) * extentX;
			data[ y * width + x ] = signedDistanceToPolygons( localX, localY, polygons );

		}

	}

	const texture = new DataTexture( data, width, height, RedFormat, FloatType );
	texture.name = 'polygon-clipping-sdf';
	texture.minFilter = LinearFilter;
	texture.magFilter = LinearFilter;
	texture.wrapS = ClampToEdgeWrapping;
	texture.wrapT = ClampToEdgeWrapping;
	texture.generateMipmaps = false;
	texture.colorSpace = NoColorSpace;
	texture.needsUpdate = true;

	const localToUv = new Matrix4().set(
		1 / extentX, 0, 0, - minX / extentX,
		0, 1 / extentY, 0, - minY / extentY,
		0, 0, 1, 0,
		0, 0, 0, 1,
	);

	return { texture, data, width, height, localToUv };

}

function wrapClippingMaterial( material, uniforms ) {

	if ( material.isShaderMaterial || material.isRawShaderMaterial ) {

		return false;

	}

	if ( material[ MATERIAL_STATE ] ) {

		if ( material[ MATERIAL_STATE ].uniforms !== uniforms ) {

			material[ MATERIAL_STATE ].uniforms = uniforms;
			material.needsUpdate = true;

		}

		return true;

	}

	const previousCompile = material.onBeforeCompile;
	const previousCacheKey = material.customProgramCacheKey;
	const state = { uniforms };
	material[ MATERIAL_STATE ] = state;

	material.customProgramCacheKey = function () {

		const cacheKey = previousCacheKey ? previousCacheKey.call( this ) : this.type;
		return `${ cacheKey }|polygon-clipping`;

	};

	material.onBeforeCompile = function ( shader, renderer ) {

		if ( previousCompile ) {

			previousCompile.call( this, shader, renderer );

		}

		const currentUniforms = state.uniforms;
		shader.uniforms.uPolygonClipEnabled = currentUniforms.enabled;
		shader.uniforms.uPolygonClipInverse = currentUniforms.inverse;
		shader.uniforms.uPolygonClipPadding = currentUniforms.padding;
		shader.uniforms.uPolygonClipSdf = currentUniforms.sdf;
		shader.uniforms.uPolygonClipMatrix = currentUniforms.matrix;

		shader.vertexShader = /* glsl */`
			varying vec3 vPolygonClipPosition;
			${ shader.vertexShader }
		`;
		shader.vertexShader = shader.vertexShader.replace(
			'#include <project_vertex>',
			/* glsl */`
				vec4 polygonClipWorldPosition = vec4( transformed, 1.0 );
				#ifdef USE_BATCHING
					polygonClipWorldPosition = batchingMatrix * polygonClipWorldPosition;
				#endif
				#ifdef USE_INSTANCING
					polygonClipWorldPosition = instanceMatrix * polygonClipWorldPosition;
				#endif
				vPolygonClipPosition = ( modelMatrix * polygonClipWorldPosition ).xyz;
				#include <project_vertex>
			`,
		);

		shader.fragmentShader = /* glsl */`
			uniform float uPolygonClipEnabled;
			uniform float uPolygonClipInverse;
			uniform float uPolygonClipPadding;
			uniform sampler2D uPolygonClipSdf;
			uniform mat4 uPolygonClipMatrix;
			varying vec3 vPolygonClipPosition;
			${ shader.fragmentShader }
		`;
		shader.fragmentShader = shader.fragmentShader.replace(
			'#include <clipping_planes_fragment>',
			/* glsl */`
				#include <clipping_planes_fragment>
				if ( uPolygonClipEnabled > 0.5 ) {

					vec2 polygonClipUv = ( uPolygonClipMatrix * vec4( vPolygonClipPosition, 1.0 ) ).xy;
					bool polygonClipInBounds = all( greaterThanEqual( polygonClipUv, vec2( 0.0 ) ) ) && all( lessThanEqual( polygonClipUv, vec2( 1.0 ) ) );
					bool polygonClipInside = polygonClipInBounds && texture2D( uPolygonClipSdf, polygonClipUv ).r < uPolygonClipPadding;
					if ( uPolygonClipInverse < 0.5 ? polygonClipInside : ! polygonClipInside ) discard;

				}
			`,
		);

	};

	material.needsUpdate = true;
	return true;

}

function createDepthMaterial( source, uniforms, distance = false ) {

	const common = {
		map: source.map || null,
		alphaMap: source.alphaMap || null,
		alphaTest: source.alphaTest,
		displacementMap: source.displacementMap || null,
		displacementScale: source.displacementScale === undefined ? 1 : source.displacementScale,
		displacementBias: source.displacementBias || 0,
	};
	const material = distance ?
		new MeshDistanceMaterial( common ) :
		new MeshDepthMaterial( {
			...common,
			depthPacking: RGBADepthPacking,
		} );
	material.side = source.shadowSide === null ? source.side : source.shadowSide;
	wrapClippingMaterial( material, uniforms );
	return material;

}

function prepareScene( scene, uniforms ) {

	scene.traverse( object => {

		if ( ! object.isMesh || ! object.material || object[ MESH_STATE ] ) {

			return;

		}

		const materials = Array.isArray( object.material ) ? object.material : [ object.material ];
		let wrapped = false;
		for ( const material of materials ) {

			wrapped = wrapClippingMaterial( material, uniforms ) || wrapped;

		}

		if ( ! wrapped ) {

			return;

		}

		const customDepthMaterial = object.customDepthMaterial;
		const customDistanceMaterial = object.customDistanceMaterial;
		let ownedDepthMaterial = null;
		let ownedDistanceMaterial = null;
		if ( customDepthMaterial ) {

			wrapClippingMaterial( customDepthMaterial, uniforms );

		} else {

			ownedDepthMaterial = createDepthMaterial( materials[ 0 ], uniforms );
			object.customDepthMaterial = ownedDepthMaterial;

		}

		if ( customDistanceMaterial ) {

			wrapClippingMaterial( customDistanceMaterial, uniforms );

		} else {

			ownedDistanceMaterial = createDepthMaterial( materials[ 0 ], uniforms, true );
			object.customDistanceMaterial = ownedDistanceMaterial;

		}

		object[ MESH_STATE ] = {
			customDepthMaterial,
			customDistanceMaterial,
			depthMaterial: ownedDepthMaterial,
			distanceMaterial: ownedDistanceMaterial,
		};

	} );

}

function restoreScene( scene ) {

	scene.traverse( object => {

		const state = object[ MESH_STATE ];
		if ( ! state ) {

			return;

		}

		object.customDepthMaterial = state.customDepthMaterial;
		object.customDistanceMaterial = state.customDistanceMaterial;
		if ( state.depthMaterial ) {

			state.depthMaterial.dispose();

		}

		if ( state.distanceMaterial ) {

			state.distanceMaterial.dispose();

		}

		delete object[ MESH_STATE ];

	} );

}

/**
 * Plugin that clips loaded 3D Tiles models with one or more planar polygons. Polygon
 * coordinates are rasterized into a signed-distance texture and projected through
 * `frame`, which maps polygon-local XY coordinates into world space. Polygons are
 * combined as a union and rings after the first ring in each polygon act as holes.
 *
 * The clipping volume is unbounded along the local Z axis of `frame`. Built-in three.js
 * materials and shadow materials are supported. Custom `ShaderMaterial` instances and
 * `BatchedTilesPlugin` are not supported.
 *
 * @param {Object} [options]
 * @param {Array<PolygonClippingPolygon>} [options.polygons=[]] Polygon coordinates to use for clipping.
 * @param {Matrix4} [options.frame] Transform from polygon-local coordinates to world coordinates.
 * @param {boolean} [options.inverse=false] If true, points outside every polygon are clipped. Otherwise, points inside any polygon are clipped.
 * @param {number} [options.resolution=512] Maximum width or height of the generated signed-distance texture.
 * @param {number} [options.padding=0] Distance to expand the clipping region in polygon-local units.
 * @param {boolean} [options.enabled=true] Whether clipping is enabled.
 */
export class PolygonClippingPlugin {

	get enabled() {

		return this._enabled;

	}

	set enabled( value ) {

		value = Boolean( value );
		if ( this._enabled !== value ) {

			this._enabled = value;
			this._syncUniforms();
			this._dispatchNeedsRender();

		}

	}

	get inverse() {

		return this._inverse;

	}

	set inverse( value ) {

		value = Boolean( value );
		if ( this._inverse !== value ) {

			this._inverse = value;
			this._syncUniforms();
			this._dispatchNeedsRender();

		}

	}

	/**
	 * The generated signed-distance texture, or `null` if there are no polygons.
	 * @type {DataTexture|null}
	 */
	get texture() {

		return this._sdf ? this._sdf.texture : null;

	}

	constructor( options = {} ) {

		const {
			polygons = [],
			frame = new Matrix4(),
			inverse = false,
			resolution = DEFAULT_RESOLUTION,
			padding = 0,
			enabled = true,
		} = options;

		this.name = 'POLYGON_CLIPPING_PLUGIN';
		this.tiles = null;
		this.frame = frame.clone();
		this.resolution = resolution;
		this.padding = padding;

		this._enabled = Boolean( enabled );
		this._inverse = Boolean( inverse );
		this._sdf = null;
		this._scenes = new Set();
		this._lastFrame = new Matrix4();
		this._onUpdateBefore = null;
		this._onDisposeModel = null;
		this._uniforms = {
			enabled: { value: 0 },
			inverse: { value: 0 },
			padding: { value: 0 },
			sdf: { value: null },
			matrix: { value: new Matrix4() },
		};

		this.setPolygons( polygons );

	}

	init( tiles ) {

		this.tiles = tiles;
		this._onUpdateBefore = () => {

			if ( ! this._lastFrame.equals( this.frame ) ) {

				this.update();

			}

		};

		this._onDisposeModel = ( { scene } ) => {

			restoreScene( scene );
			this._scenes.delete( scene );

		};

		tiles.addEventListener( 'update-before', this._onUpdateBefore );
		tiles.addEventListener( 'dispose-model', this._onDisposeModel );
		tiles.forEachLoadedModel( scene => {

			this.processTileModel( scene );

		} );
		this._dispatchNeedsRender();

	}

	processTileModel( scene ) {

		prepareScene( scene, this._uniforms );
		this._scenes.add( scene );

	}

	/**
	 * Replaces the clipping polygons and regenerates the signed-distance texture.
	 * @param {Array<PolygonClippingPolygon>} polygons
	 */
	setPolygons( polygons ) {

		const normalizedPolygons = normalizePolygons( polygons );
		const sdf = rasterizePolygons( normalizedPolygons, this.resolution, this.padding );
		if ( this._sdf ) {

			this._sdf.texture.dispose();

		}

		this.polygons = normalizedPolygons;
		this._sdf = sdf;
		this._uniforms.sdf.value = sdf ? sdf.texture : null;
		this.update();

	}

	/**
	 * Sets the transform from polygon-local coordinates to world coordinates.
	 * @param {Matrix4} frame
	 */
	setFrame( frame ) {

		this.frame.copy( frame );
		this.update();

	}

	/**
	 * Updates the world-to-texture transform from the current `frame`.
	 */
	update() {

		if ( this._sdf && this.frame.determinant() === 0 ) {

			throw new Error( 'PolygonClippingPlugin: "frame" must be invertible.' );

		}

		this._lastFrame.copy( this.frame );
		if ( this._sdf ) {

			this._uniforms.matrix.value
				.copy( this._sdf.localToUv )
				.multiply( _inverseMatrix.copy( this.frame ).invert() );

		} else {

			this._uniforms.matrix.value.identity();

		}

		this._syncUniforms();
		this._dispatchNeedsRender();

	}

	/**
	 * Returns whether a world-space point is discarded by the current clipping field.
	 * Use this to filter raycast results. Raycasting does not evaluate fragment shader discard.
	 * @param {Vector3} point
	 * @returns {boolean}
	 */
	isPointClipped( point ) {

		if ( ! this.enabled || ! this._sdf ) {

			return false;

		}

		_point.copy( point ).applyMatrix4( this._uniforms.matrix.value );
		let inside = false;
		if ( _point.x >= 0 && _point.x <= 1 && _point.y >= 0 && _point.y <= 1 ) {

			const { data, width, height } = this._sdf;
			const x = Math.min( width - 1, Math.max( 0, Math.round( _point.x * ( width - 1 ) ) ) );
			const y = Math.min( height - 1, Math.max( 0, Math.round( _point.y * ( height - 1 ) ) ) );
			inside = data[ y * width + x ] < this.padding;

		}

		return this.inverse ? ! inside : inside;

	}

	_syncUniforms() {

		this._uniforms.enabled.value = this.enabled && this._sdf ? 1 : 0;
		this._uniforms.inverse.value = this.inverse ? 1 : 0;
		this._uniforms.padding.value = this.padding;

	}

	_dispatchNeedsRender() {

		if ( this.tiles ) {

			this.tiles.dispatchEvent( { type: 'needs-render' } );

		}

	}

	dispose() {

		this._uniforms.enabled.value = 0;
		this._uniforms.sdf.value = null;
		if ( this.tiles ) {

			this.tiles.removeEventListener( 'update-before', this._onUpdateBefore );
			this.tiles.removeEventListener( 'dispose-model', this._onDisposeModel );

		}

		for ( const scene of this._scenes ) {

			restoreScene( scene );

		}

		this._scenes.clear();

		if ( this._sdf ) {

			this._sdf.texture.dispose();
			this._sdf = null;

		}

		this._enabled = false;
		this.tiles = null;

	}

}
