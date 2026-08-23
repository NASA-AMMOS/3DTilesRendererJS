/** @import { TilesRenderer } from '3d-tiles-renderer/three' */
import { Box3, MathUtils, Matrix3, Matrix4, Vector3 } from 'three';
import { ProjectionScheme } from '../../../../src/three/plugins/images/utils/ProjectionScheme.js';
import { getMeshesCartographicRange } from '../../../../src/three/plugins/images/overlays/utils.js';

// number of samples taken along each axis of a bounding volume when deriving the cartographic
// range it covers. The tile surface is curved so the volume corners alone under sample it.
const VOLUME_SAMPLES = 3;

// longitude is unstable within this distance of the poles
const POLE_EPSILON = 1e-5;

// Cap on how far the geometric error is scaled up. Every cartographic projection stretches without
// bound as it approaches the poles, so the raw stretch factor runs to infinity there. Mercator
// happens to self limit near 11 because its own bounds stop at ~85 degrees; equirectangular runs to
// a true 90 and does not.
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

	const xAxis = _vec.set( _size.x, 0, 0 ).applyMatrix3( _rotation ).toArray();
	const yAxis = _vec.set( 0, _size.y, 0 ).applyMatrix3( _rotation ).toArray();
	const zAxis = _vec.set( 0, 0, _size.z ).applyMatrix3( _rotation ).toArray();

	return [ ..._center.toArray(), ...xAxis, ...yAxis, ...zAxis ];

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
		this.tiles = null;

		this.projection = new ProjectionScheme( scheme );

		// the width of the projected world in meters, derived from the ellipsoid on init
		this.worldWidth = 0;

	}

	init( tiles ) {

		this.tiles = tiles;
		this.worldWidth = 2 * Math.PI * tiles.ellipsoid.radius.x;

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

		const { projection, worldWidth } = this;
		const [ , minLat, , maxLat ] = projection.getBounds();

		// mercator runs to infinity at the poles so the latitude is clamped into the valid range
		const clampedLat = MathUtils.clamp( lat, minLat, maxLat );
		const u = projection.convertLongitudeToNormalized( lon );
		const v = projection.convertLatitudeToNormalized( clampedLat );

		// the projection tile counts describe the aspect ratio of the projected world
		const worldHeight = worldWidth * projection.tileCountY / projection.tileCountX;

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

		const { projection, worldWidth } = this;
		const worldHeight = worldWidth * projection.tileCountY / projection.tileCountX;

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
		const scale = this._getScaleFactor( ( range[ 1 ] + range[ 3 ] ) / 2 );
		tile.geometricError *= scale;

		// recorded so the amount of scaling applied to a tile can be inspected
		tile.projectionErrorScale = scale;
		tile.projectionRange = range;

		// the renderer applies the tile transform to the bounding volume afterwards, so the box
		// is stored in the tile local frame
		this._getProjectedBox( range, _box );
		_invMatrix.copy( _matrix ).invert();

		tile.boundingVolume = { box: toBoxArray( _box, _invMatrix ) };

	}

	// returns the amount the projection stretches the surface at the given latitude
	_getScaleFactor( lat ) {

		const [ , minLat, , maxLat ] = this.projection.getBounds();
		const clampedLat = MathUtils.clamp( lat, minLat, maxLat );

		return Math.min( 1 / Math.cos( clampedLat ), MAX_ERROR_SCALE );

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

		// the vertices are positioned relative to the tile origin now, so any transforms in the
		// loaded hierarchy have to be cleared
		scene.traverse( c => {

			if ( c !== scene ) {

				c.position.setScalar( 0 );
				c.quaternion.identity();
				c.scale.setScalar( 1 );

			}

		} );

		scene.position.copy( _center );
		scene.quaternion.identity();
		scene.scale.setScalar( 1 );
		scene.updateMatrixWorld( true );

		// the bounds derived in "preprocessNode" are an estimate based on the tile bounding
		// volume, so they are replaced with the exact projected bounds of the geometry
		tile.engineData.boundingVolume.setObbData( toBoxArray( _box, _identity ), _identity );

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
	// volume type is not supported
	_getCartographicRange( boundingVolume, matrix ) {

		const points = [];
		if ( 'region' in boundingVolume ) {

			// regions are already cartographic
			return [ ...boundingVolume.region ];

		} else if ( 'box' in boundingVolume ) {

			const data = boundingVolume.box;
			_center.fromArray( data, 0 );
			_axisX.fromArray( data, 3 );
			_axisY.fromArray( data, 6 );
			_axisZ.fromArray( data, 9 );

			// sample a grid across the volume rather than just the corners, since the tile
			// surface is curved and the extreme lat / lon values can fall between them
			for ( let x = 0; x < VOLUME_SAMPLES; x ++ ) {

				for ( let y = 0; y < VOLUME_SAMPLES; y ++ ) {

					for ( let z = 0; z < VOLUME_SAMPLES; z ++ ) {

						const point = new Vector3().copy( _center );
						point.addScaledVector( _axisX, MathUtils.mapLinear( x, 0, VOLUME_SAMPLES - 1, - 1, 1 ) );
						point.addScaledVector( _axisY, MathUtils.mapLinear( y, 0, VOLUME_SAMPLES - 1, - 1, 1 ) );
						point.addScaledVector( _axisZ, MathUtils.mapLinear( z, 0, VOLUME_SAMPLES - 1, - 1, 1 ) );

						points.push( point );

					}

				}

			}

		} else if ( 'sphere' in boundingVolume ) {

			const [ x, y, z, radius ] = boundingVolume.sphere;
			_center.set( x, y, z );

			points.push( new Vector3().copy( _center ) );
			for ( let i = 0; i < 3; i ++ ) {

				_vec.setScalar( 0 ).setComponent( i, radius );
				points.push( new Vector3().addVectors( _center, _vec ) );
				points.push( new Vector3().subVectors( _center, _vec ) );

			}

		} else {

			return null;

		}

		return this._getPointsCartographicRange( points, _center.clone(), matrix );

	}

	// converts a set of volume-local points into a cartographic range, unwrapping the longitude
	// values around the volume center so a tile crossing the date line stays contiguous
	_getPointsCartographicRange( points, volumeCenter, matrix ) {

		const { ellipsoid } = this.tiles;

		ellipsoid.getPositionToCartographic( volumeCenter.applyMatrix4( matrix ), _cart );

		// fall back to 0 because the lat / lon are NaN for a point at the ellipsoid center
		const centerLon = _cart.lon || 0;

		let minLon = Infinity;
		let minLat = Infinity;
		let minHeight = Infinity;
		let maxLon = - Infinity;
		let maxLat = - Infinity;
		let maxHeight = - Infinity;

		points.forEach( point => {

			ellipsoid.getPositionToCartographic( point.applyMatrix4( matrix ), _cart );

			const { lat, height } = _cart;
			let { lon } = _cart;

			// a sample at the center of the ellipsoid has no cartographic position. Volumes that
			// span a large portion of the globe contain that point, so it is skipped here rather
			// than poisoning the whole range with NaN.
			if ( ! Number.isFinite( lat ) || ! Number.isFinite( lon ) || ! Number.isFinite( height ) ) {

				return;

			}

			// the longitude is not meaningful at the poles, so collapse it to the center value
			// to avoid growing the range across the whole globe
			if ( Math.abs( Math.abs( lat ) - Math.PI / 2 ) < POLE_EPSILON ) {

				lon = centerLon;

			}

			// unwrap the longitude so it stays on the same side of the date line as the center
			if ( Math.abs( centerLon - lon ) > Math.PI ) {

				lon += Math.sign( centerLon - lon ) * Math.PI * 2;

			}

			minLon = Math.min( minLon, lon );
			maxLon = Math.max( maxLon, lon );

			minLat = Math.min( minLat, lat );
			maxLat = Math.max( maxLat, lat );

			minHeight = Math.min( minHeight, height );
			maxHeight = Math.max( maxHeight, height );

		} );

		// leave the tile alone if nothing usable came out of the volume
		if ( minLon === Infinity ) {

			return null;

		}

		// A volume that covers a large part of the globe cannot be sampled accurately - the
		// extremes fall between the samples - so it is widened to the full range. Coarse tiles end
		// up with loose bounds, which is only a culling cost, while tiles that project to a small
		// patch keep tight ones.
		if ( maxLon - minLon > Math.PI ) {

			minLon = - Math.PI;
			maxLon = Math.PI;

		}

		if ( maxLat - minLat > Math.PI / 2 ) {

			minLat = - Math.PI / 2;
			maxLat = Math.PI / 2;

		}

		// The samples are points on the volume, so the heights they report only describe the
		// volume surface and not how low the terrain inside it sits. Across a wide arc the surface
		// curves away from those samples, leaving the floor of the range far above the ground, so
		// it is dropped by the sagitta of the arc. This is fractions of a millimeter for a city
		// block sized tile and the full radius for one that spans the globe.
		const midLat = ( minLat + maxLat ) / 2;
		const arc = Math.max( ( maxLon - minLon ) * Math.cos( midLat ), maxLat - minLat );
		const halfAngle = Math.min( arc / 2, Math.PI / 2 );
		minHeight -= this.tiles.ellipsoid.radius.x * ( 1 - Math.cos( halfAngle ) );

		return [ minLon, minLat, maxLon, maxLat, minHeight, maxHeight ];

	}

}
