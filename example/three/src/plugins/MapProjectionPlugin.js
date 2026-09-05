import { Box3, MathUtils, Matrix3, Matrix4, Vector3 } from 'three';
import { ProjectionScheme } from '../../../../src/three/plugins/images/utils/ProjectionScheme.js';
import { getCartographicToMeterDerivative } from '../../../../src/three/plugins/images/utils/getCartographicToMeterDerivative.js';
import { getMeshesCartographicRange } from '../../../../src/three/plugins/images/overlays/utils.js';

// number of samples taken along each axis of a bounding volume when deriving the cartographic
// range it covers. The tile surface is curved so the volume corners alone under sample it.
const VOLUME_SAMPLES = 3;

// evenly spaced sample positions running from one face of the volume to the opposite one
const SAMPLE_OFFSETS = new Array( VOLUME_SAMPLES )
	.fill()
	.map( ( v, i ) => MathUtils.mapLinear( i, 0, VOLUME_SAMPLES - 1, - 1, 1 ) );

// longitude is unstable within this distance of the poles
const POLE_EPSILON = 1e-5;

// cap on the geometric error scaling below. Every projection stretches without bound at the poles,
// so the raw factor runs to infinity there.
const MAX_ERROR_SCALE = 16;

const _matrix = /* @__PURE__ */ new Matrix4();
const _invMatrix = /* @__PURE__ */ new Matrix4();
const _identity = /* @__PURE__ */ new Matrix4();
const _rotation = /* @__PURE__ */ new Matrix3();
const _box = /* @__PURE__ */ new Box3();
const _vec = /* @__PURE__ */ new Vector3();
const _center = /* @__PURE__ */ new Vector3();
const _size = /* @__PURE__ */ new Vector3();
const _axisX = /* @__PURE__ */ new Vector3();
const _axisY = /* @__PURE__ */ new Vector3();
const _axisZ = /* @__PURE__ */ new Vector3();
const _cart = {};

// converts an axis aligned box into the "box" bounding volume array format, expressed in the
// frame described by the given matrix
function toBoxArray( box, matrix ) {

	box.getCenter( _center ).applyMatrix4( matrix );
	box.getSize( _size ).multiplyScalar( 0.5 );
	_rotation.setFromMatrix4( matrix );

	return [
		..._center,
		..._vec.set( _size.x, 0, 0 ).applyMatrix3( _rotation ),
		..._vec.set( 0, _size.y, 0 ).applyMatrix3( _rotation ),
		..._vec.set( 0, 0, _size.z ).applyMatrix3( _rotation ),
	];

}

/**
 * Flattens a globe-oriented tile set by reprojecting it into a map projection. Both the tile
 * geometry and the tile bounding volumes are transformed so traversal, culling, and screen space
 * error continue to work in the flattened frame.
 *
 * The resulting frame is y-up with x running east and z running south, so it can be navigated
 * with the default `EnvironmentControls` settings. Positions are in projected meters and heights
 * are left unscaled.
 *
 * @param {Object} [options]
 * @param {'EPSG:3857'|'EPSG:4326'|'CRS:84'} [options.scheme='EPSG:3857'] The projection to flatten to.
 */
export class MapProjectionPlugin {

	constructor( options = {} ) {

		const {
			scheme = 'EPSG:3857',
		} = options;

		this.name = 'MAP_PROJECTION_PLUGIN';

		// this rewrites every vertex, so it has to run before the plugins that consume the final
		// geometry - compression and flattening at -100, batching and fading above that. Plugins
		// that do cartographic math on loaded geometry, such as ImageOverlayPlugin, are not
		// compatible at all: the geometry is no longer in the ellipsoid frame once this has run.
		this.priority = - 200;

		this.tiles = null;

		this.projection = new ProjectionScheme( scheme );

		// dimensions of the projected world in meters, derived from the ellipsoid on init
		this.worldWidth = 0;
		this.worldHeight = 0;

	}

	init( tiles ) {

		const { projection } = this;
		this.tiles = tiles;

		// the projection tile counts describe the aspect ratio of the projected world
		this.worldWidth = 2 * Math.PI * tiles.ellipsoid.radius.x;
		this.worldHeight = this.worldWidth * projection.tileCountY / projection.tileCountX;

		// cached because "getBounds" allocates and this runs per vertex
		const [ , minLat, , maxLat ] = projection.getBounds();
		this.minLat = minLat;
		this.maxLat = maxLat;

	}

	/**
	 * Converts a cartographic point into the flattened frame. Longitudes outside the [ -PI, PI ]
	 * range are preserved rather than wrapped so geometry that crosses the date line stays
	 * contiguous.
	 *
	 * @param {number} lon
	 * @param {number} lat
	 * @param {number} height
	 * @param {Vector3} target
	 * @returns {Vector3}
	 */
	projectPoint( lon, lat, height, target ) {

		const { projection, worldWidth, worldHeight, minLat, maxLat } = this;

		// mercator runs to infinity at the poles so the latitude is clamped into the valid range
		const u = projection.convertLongitudeToNormalized( lon );
		const v = projection.convertLatitudeToNormalized( MathUtils.clamp( lat, minLat, maxLat ) );

		target.x = ( u - 0.5 ) * worldWidth;
		target.y = height;
		target.z = - ( v - 0.5 ) * worldHeight;

		return target;

	}

	/**
	 * The inverse of `projectPoint`, converting a point in the flattened frame back into a
	 * cartographic position.
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {Object} [target]
	 * @returns {Object}
	 */
	unprojectPoint( x, y, z, target = {} ) {

		const { projection, worldWidth, worldHeight } = this;

		target.lon = projection.convertNormalizedToLongitude( x / worldWidth + 0.5 );
		target.lat = projection.convertNormalizedToLatitude( - z / worldHeight + 0.5 );
		target.height = y;

		return target;

	}

	preprocessNode( tile, tilesetDir, parentTile = null ) {

		// the renderer computes the tile transform chain after the plugins run, so it is derived
		// here in order to place the bounding volume
		_matrix.identity();
		if ( tile.transform ) {

			_matrix.fromArray( tile.transform );

		}

		if ( parentTile ) {

			_matrix.premultiply( parentTile.engineData.transform );

		}

		const range = this._getCartographicRange( tile.boundingVolume, _matrix );
		if ( range === null ) {

			return;

		}

		// the projection stretches the surface, so scale the error to match in order to keep the
		// amount of detail loaded consistent with the unprojected tile set
		tile.geometricError *= this._getScaleFactor( ( range[ 1 ] + range[ 3 ] ) / 2, ( range[ 0 ] + range[ 2 ] ) / 2 );

		// the renderer applies the tile transform to the bounding volume afterwards, so the box
		// is stored in the tile local frame
		this._getProjectedBox( range, _box );
		_invMatrix.copy( _matrix ).invert();

		tile.boundingVolume = { box: toBoxArray( _box, _invMatrix ) };

	}

	processTileModel( scene, tile ) {

		const { ellipsoid } = this.tiles;

		// the tile transform has already been baked into the scene matrix at this point, so the
		// scene sits in the ellipsoid frame
		scene.updateMatrixWorld( true );

		const meshes = [];
		scene.traverse( c => {

			if ( c.geometry ) {

				meshes.push( c );

			}

		} );

		if ( meshes.length === 0 ) {

			return;

		}

		// per vertex cartographic values with the date line and pole wrapping already resolved
		const { uvs, region } = getMeshesCartographicRange( meshes, ellipsoid );

		// place the tile origin at the center of the projected patch so the vertex values stay
		// small enough to keep float32 precision
		this._getProjectedBox( region, _box );
		_box.getCenter( _center );

		meshes.forEach( ( mesh, i ) => {

			const cartographic = uvs[ i ];
			const { geometry } = mesh;
			const attribute = geometry.getAttribute( 'position' );

			for ( let j = 0, l = attribute.count; j < l; j ++ ) {

				const lon = cartographic[ 3 * j + 0 ];
				const lat = cartographic[ 3 * j + 1 ];
				const height = cartographic[ 3 * j + 2 ];

				this.projectPoint( lon, lat, height, _vec ).sub( _center );
				attribute.setXYZ( j, _vec.x, _vec.y, _vec.z );

			}

			attribute.needsUpdate = true;

			// the surface is warped by the projection so the original normals no longer apply
			if ( geometry.getAttribute( 'normal' ) ) {

				geometry.computeVertexNormals();

			}

			geometry.computeBoundingBox();
			geometry.computeBoundingSphere();

		} );

		// every vertex is absolute within the tile now, so the loaded hierarchy is flattened and
		// only the tile origin carries a transform
		scene.traverse( c => {

			c.position.setScalar( 0 );
			c.quaternion.identity();
			c.scale.setScalar( 1 );

		} );

		scene.position.copy( _center );
		scene.updateMatrixWorld( true );

		// the bounds derived in "preprocessNode" are an estimate based on the tile bounding
		// volume, so they are replaced with the exact projected bounds of the geometry
		tile.engineData.boundingVolume.setObbData( toBoxArray( _box, _identity ), _identity );

	}

	// returns the amount the projection stretches the surface at the given point, as the ratio of
	// projected meters to real meters on the ellipsoid
	_getScaleFactor( lat, lon ) {

		const { projection, worldWidth, worldHeight, minLat, maxLat } = this;
		const clampedLat = MathUtils.clamp( lat, minLat, maxLat );

		// meters per radian on the ellipsoid
		const [ xDeriv, yDeriv ] = getCartographicToMeterDerivative( this.tiles.ellipsoid, clampedLat, lon );

		// radians per normalized unit, which turns the world size into projected meters per radian
		const lonFactor = projection.getLongitudeDerivativeAtNormalized( projection.convertLongitudeToNormalized( lon ) );
		const latFactor = projection.getLatitudeDerivativeAtNormalized( projection.convertLatitudeToNormalized( clampedLat ) );

		// the two axes stretch by different amounts outside of a conformal projection, so the
		// larger of the two drives the error
		const xScale = worldWidth / ( lonFactor * xDeriv );
		const yScale = worldHeight / ( latFactor * yDeriv );

		return Math.min( Math.max( xScale, yScale ), MAX_ERROR_SCALE );

	}

	// converts a cartographic range into an axis aligned box in the flattened frame
	_getProjectedBox( range, target ) {

		const [ west, south, east, north, minHeight, maxHeight ] = range;

		// the projection is separable and monotonic in longitude and latitude, so the opposing
		// corners of the patch bound the projected result
		target.makeEmpty();
		target.expandByPoint( this.projectPoint( west, south, minHeight, _vec ) );
		target.expandByPoint( this.projectPoint( east, north, maxHeight, _vec ) );

		return target;

	}

	// derives the cartographic range covered by a tile bounding volume, returning null if the
	// volume cannot be sampled
	_getCartographicRange( boundingVolume, matrix ) {

		const { ellipsoid } = this.tiles;

		if ( 'region' in boundingVolume ) {

			// regions are already cartographic
			return [ ...boundingVolume.region ];

		} else if ( 'box' in boundingVolume ) {

			const data = boundingVolume.box;
			_center.fromArray( data, 0 );
			_axisX.fromArray( data, 3 );
			_axisY.fromArray( data, 6 );
			_axisZ.fromArray( data, 9 );

		} else if ( 'sphere' in boundingVolume ) {

			// bounded as the cube around the sphere so the sampling below is shared
			const [ x, y, z, radius ] = boundingVolume.sphere;
			_center.set( x, y, z );
			_axisX.set( radius, 0, 0 );
			_axisY.set( 0, radius, 0 );
			_axisZ.set( 0, 0, radius );

		} else {

			return null;

		}

		// the volume center anchors the date line unwrapping below. It falls back to 0 because the
		// lat / lon are NaN for a point at the ellipsoid center.
		ellipsoid.getPositionToCartographic( _vec.copy( _center ).applyMatrix4( matrix ), _cart );
		const centerLon = _cart.lon || 0;

		let minLon = Infinity;
		let minLat = Infinity;
		let minHeight = Infinity;
		let maxLon = - Infinity;
		let maxLat = - Infinity;
		let maxHeight = - Infinity;

		// sample a grid across the volume rather than just the corners, since the tile surface is
		// curved and the extreme lat / lon values can fall between them
		for ( const sx of SAMPLE_OFFSETS ) {

			for ( const sy of SAMPLE_OFFSETS ) {

				for ( const sz of SAMPLE_OFFSETS ) {

					_vec.copy( _center )
						.addScaledVector( _axisX, sx )
						.addScaledVector( _axisY, sy )
						.addScaledVector( _axisZ, sz )
						.applyMatrix4( matrix );

					ellipsoid.getPositionToCartographic( _vec, _cart );

					const { lat, height } = _cart;
					let { lon } = _cart;

					// a sample at the center of the ellipsoid has no cartographic position, and
					// volumes spanning much of the globe contain that point
					if ( ! Number.isFinite( lat ) || ! Number.isFinite( lon ) || ! Number.isFinite( height ) ) {

						continue;

					}

					// longitude is meaningless at the poles, so collapse it to the center value
					// rather than growing the range across the whole globe
					if ( Math.abs( Math.abs( lat ) - Math.PI / 2 ) < POLE_EPSILON ) {

						lon = centerLon;

					}

					// keep the longitude on the same side of the date line as the center
					if ( Math.abs( centerLon - lon ) > Math.PI ) {

						lon += Math.sign( centerLon - lon ) * Math.PI * 2;

					}

					minLon = Math.min( minLon, lon );
					maxLon = Math.max( maxLon, lon );

					minLat = Math.min( minLat, lat );
					maxLat = Math.max( maxLat, lat );

					minHeight = Math.min( minHeight, height );
					maxHeight = Math.max( maxHeight, height );

				}

			}

		}

		if ( minLon === Infinity ) {

			return null;

		}

		// a volume covering a large part of the globe cannot be sampled accurately, since the
		// extremes fall between the samples, so it is widened to the full range
		if ( maxLon - minLon > Math.PI ) {

			minLon = - Math.PI;
			maxLon = Math.PI;

		}

		if ( maxLat - minLat > Math.PI / 2 ) {

			minLat = - Math.PI / 2;
			maxLat = Math.PI / 2;

		}

		// the samples sit on the volume, so they describe its surface rather than how low the
		// terrain inside dips. Across a wide arc the surface curves away from them, so the floor is
		// dropped by the sagitta of that arc - sub millimeter for a city block, the full radius for
		// a volume spanning the globe.
		const arc = Math.max( ( maxLon - minLon ) * Math.cos( ( minLat + maxLat ) / 2 ), maxLat - minLat );
		minHeight -= ellipsoid.radius.x * ( 1 - Math.cos( Math.min( arc / 2, Math.PI / 2 ) ) );

		return [ minLon, minLat, maxLon, maxLat, minHeight, maxHeight ];

	}

}
