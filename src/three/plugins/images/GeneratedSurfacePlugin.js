/** @import { ImageOverlay } from './ImageOverlayPlugin.js' */
import { Mesh, MeshBasicMaterial, MathUtils, Vector3, Sphere, BufferGeometry, BufferAttribute } from 'three';
export const TILE_X = Symbol( 'TILE_X' );
export const TILE_Y = Symbol( 'TILE_Y' );
export const TILE_LEVEL = Symbol( 'TILE_LEVEL' );
import { getCartographicToMeterDerivative } from './utils/getCartographicToMeterDerivative.js';
import { TilingScheme } from './utils/TilingScheme.js';
import { ProjectionScheme } from './utils/ProjectionScheme.js';

const MIN_LON_VERTS = 30;
const MIN_LAT_VERTS = 15;
const DEFAULT_LEVELS = 20;

const OVERLAY_RANGE = Symbol( 'OVERLAY_RANGE' );
const OVERLAY_LEVEL = Symbol( 'OVERLAY_LEVEL' );

const _pos = /* @__PURE__ */ new Vector3();
const _norm = /* @__PURE__ */ new Vector3();
const _sphere = /* @__PURE__ */ new Sphere();
const _resolution = { lonVerts: 0, latVerts: 0 };

// the raw terrain elevation range known for a tile, excluding any skirt depth
const ELEVATION_RANGE = Symbol( 'ELEVATION_RANGE' );

// Plane geometry with a skirt around the perimeter. The surface vertices and triangles are laid out
// first, matching PlaneGeometry, followed by the skirt vertices and triangles. Each skirt vertex
// duplicates the perimeter surface vertex at "skirtSourceIndices[ i - surfaceVertexCount ]".
class SkirtedPlaneGeometry extends BufferGeometry {

	constructor( width = 1, height = 1, widthSegments = 1, heightSegments = 1 ) {

		super();

		const cols = widthSegments + 1;
		const rows = heightSegments + 1;
		const surfaceVertexCount = cols * rows;

		// perimeter vertex loop, clockwise so the skirt triangles face outward
		const perimeter = [];
		for ( let x = 0; x < cols; x ++ ) {

			perimeter.push( x );

		}

		for ( let y = 1; y < rows; y ++ ) {

			perimeter.push( y * cols + cols - 1 );

		}

		for ( let x = cols - 2; x >= 0; x -- ) {

			perimeter.push( ( rows - 1 ) * cols + x );

		}

		for ( let y = rows - 2; y >= 1; y -- ) {

			perimeter.push( y * cols );

		}

		const skirtVertexCount = perimeter.length;
		const vertexCount = surfaceVertexCount + skirtVertexCount;
		const position = new Float32Array( 3 * vertexCount );
		const normal = new Float32Array( 3 * vertexCount );
		const uv = new Float32Array( 2 * vertexCount );

		// flat surface vertices
		for ( let row = 0; row < rows; row ++ ) {

			for ( let col = 0; col < cols; col ++ ) {

				const i = row * cols + col;
				const u = col / widthSegments;
				const v = 1 - row / heightSegments;
				position[ 3 * i + 0 ] = ( u - 0.5 ) * width;
				position[ 3 * i + 1 ] = ( v - 0.5 ) * height;
				normal[ 3 * i + 2 ] = 1;
				uv[ 2 * i + 0 ] = u;
				uv[ 2 * i + 1 ] = v;

			}

		}

		// skirt vertices copy their source vertex
		for ( let i = 0; i < skirtVertexCount; i ++ ) {

			const src = perimeter[ i ];
			const dst = surfaceVertexCount + i;
			position[ 3 * dst + 0 ] = position[ 3 * src + 0 ];
			position[ 3 * dst + 1 ] = position[ 3 * src + 1 ];
			position[ 3 * dst + 2 ] = position[ 3 * src + 2 ];
			normal[ 3 * dst + 2 ] = 1;
			uv[ 2 * dst + 0 ] = uv[ 2 * src + 0 ];
			uv[ 2 * dst + 1 ] = uv[ 2 * src + 1 ];

		}

		// surface triangles
		const index = new Uint32Array( 6 * widthSegments * heightSegments + 6 * skirtVertexCount );
		let offset = 0;
		for ( let y = 0; y < heightSegments; y ++ ) {

			for ( let x = 0; x < widthSegments; x ++ ) {

				const a = y * cols + x;
				const b = ( y + 1 ) * cols + x;
				const c = ( y + 1 ) * cols + x + 1;
				const d = y * cols + x + 1;
				index[ offset ++ ] = a;
				index[ offset ++ ] = b;
				index[ offset ++ ] = d;
				index[ offset ++ ] = b;
				index[ offset ++ ] = c;
				index[ offset ++ ] = d;

			}

		}

		// skirt triangles, one quad per perimeter edge
		for ( let e = 0; e < skirtVertexCount; e ++ ) {

			const ne = ( e + 1 ) % skirtVertexCount;
			const a = perimeter[ e ];
			const b = perimeter[ ne ];
			const sa = surfaceVertexCount + e;
			const sb = surfaceVertexCount + ne;
			index[ offset ++ ] = a;
			index[ offset ++ ] = b;
			index[ offset ++ ] = sa;
			index[ offset ++ ] = b;
			index[ offset ++ ] = sb;
			index[ offset ++ ] = sa;

		}

		this.setIndex( new BufferAttribute( index, 1 ) );
		this.setAttribute( 'position', new BufferAttribute( position, 3 ) );
		this.setAttribute( 'normal', new BufferAttribute( normal, 3 ) );
		this.setAttribute( 'uv', new BufferAttribute( uv, 2 ) );

		this.surfaceVertexCount = surfaceVertexCount;
		this.skirtSourceIndices = new Uint32Array( perimeter );

	}

}

/**
 * Plugin that generates tiled surface geometry from a tiling scheme, optionally loading
 * image overlay data.
 *
 * The tiling scheme and projection are derived from a provided overlay.
 * If the source's projection is cartographic (any EPSG scheme), the plugin supports
 * both planar and ellipsoidal geometry via the `shape` option.
 *
 * @param {Object} [options]
 * @param {ImageOverlay} [options.overlay=null] Overlay instance to derive the tiling scheme from. When `applyOverlayTexture` is enabled, also used to texture the generated tile meshes.
 * @param {string} [options.shape='ellipsoid'] Geometry shape: `'planar'` or `'ellipsoid'`. Only
 *   meaningful for cartographic sources.
 * @param {boolean} [options.endCaps=true] For Mercator ellipsoid mode, snap poles to ±90° lat.
 * @param {boolean} [options.center=true] Shift planar tiles so the image is centered at origin.
 * @param {boolean} [options.useRecommendedSettings=true] Apply recommended TilesRenderer settings.
 * @param {boolean} [options.applyOverlayTexture=false] Whether to apply the overlay's texture to the generated tile meshes.
 */
export class GeneratedSurfacePlugin {

	constructor( options = {} ) {

		const {
			overlay = null,
			shape = 'ellipsoid',
			endCaps = true,
			center = true,
			useRecommendedSettings = true,
			applyOverlayTexture = false,
		} = options;

		this.priority = - 10;
		this.tiles = null;

		this.overlay = overlay;
		this.shape = shape;
		this.endCaps = endCaps;
		this.center = center;
		this.useRecommendedSettings = useRecommendedSettings;
		this.applyOverlayTexture = applyOverlayTexture;

		this._tiling = null;

	}

	// Plugin functions
	init( tiles ) {

		if ( this.useRecommendedSettings ) {

			tiles.errorTarget = 1;

		}

		this.tiles = tiles;

	}

	async loadRootTileset() {

		const { overlay } = this;
		if ( overlay ) {

			await overlay.init();
			this._tiling = overlay.tiling || this._createDefaultTiling();

		} else {

			this._tiling = this._createDefaultTiling();

		}

		return this.getTileset();

	}

	async parseToMesh( buffer, tile, extension, url, abortSignal ) {

		if ( extension !== 'generated_surface' ) {

			return null;

		}

		let res;
		if ( this._useEllipsoid() ) {

			res = this._createEllipsoidMesh( tile );

		} else {

			res = this._createPlanarMesh( tile );

		}

		const { overlay, applyOverlayTexture } = this;
		if ( overlay && applyOverlayTexture ) {

			const x = tile[ TILE_X ];
			const y = tile[ TILE_Y ];
			const level = tile[ TILE_LEVEL ];
			const range = this._tiling.getTileBounds( x, y, level, true, false );

			if ( overlay.hasContent( range, level ) ) {

				try {

					await overlay.lockTexture( range, level );

				} catch ( err ) {

					if ( err.name !== 'AbortError' ) {

						throw err;

					}

					return null;

				}

				const texture = overlay.getTexture( range, level );
				tile[ OVERLAY_RANGE ] = range;
				tile[ OVERLAY_LEVEL ] = level;

				if ( abortSignal.aborted ) {

					overlay.releaseTexture( range, level );
					delete tile[ OVERLAY_RANGE ];
					delete tile[ OVERLAY_LEVEL ];
					return null;

				}

				res.material.map = texture;
				res.material.needsUpdate = true;

			}

		}

		return res;

	}

	preprocessNode( tile ) {

		const tiling = this._tiling;
		const maxLevel = tiling.maxLevel;
		const level = tile[ TILE_LEVEL ];
		if ( level < maxLevel && tile.parent !== null ) {

			this.expandChildren( tile );

		}

	}

	disposeTile( tile ) {

		const range = tile[ OVERLAY_RANGE ];
		if ( this.overlay && range ) {

			this.overlay.releaseTexture( range, tile[ OVERLAY_LEVEL ] );
			delete tile[ OVERLAY_RANGE ];
			delete tile[ OVERLAY_LEVEL ];

		}

	}

	dispose() {

		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			this.disposeTile( tile );

		} );

	}

	/**
	 * Returns the cartographic coordinates for a given world-space position. "lat" and "lon" are assigned
	 * to the target object.
	 * @param {Vector3} position - World-space position. For ellipsoid surfaces this is a
	 * 3D point on the surface; for planar surfaces it is a 2D point in the plane.
	 * @param {{ lat: number, lon: number }} [target={}] - Optional target object to write results into.
	 * @returns {{ lat: number, lon: number }} The cartographic coordinates in radians.
	 * @throws {Error} If the tiling projection is not cartographic.
	 */
	getCartographicFromPosition( position, target = {} ) {

		const { _tiling: tiling } = this;
		const { projection } = tiling;

		if ( ! projection.isCartographic ) {

			throw new Error( 'GeneratedSurfacePlugin: getCartographicFromPosition requires a cartographic projection.' );

		}

		if ( this._useEllipsoid() ) {

			return this.tiles.ellipsoid.getPositionToCartographic( position, target );

		}

		const { center } = this;
		const normX = position.x / tiling.aspectRatio + ( center ? 0.5 : 0 );
		const normY = position.y + ( center ? 0.5 : 0 );
		target.lat = projection.convertNormalizedToLatitude( normY );
		target.lon = projection.convertNormalizedToLongitude( normX );
		return target;

	}

	/**
	 * Returns the world-space position for a given cartographic coordinate.
	 * @param {number} lat - Latitude in radians.
	 * @param {number} lon - Longitude in radians.
	 * @param {Vector3} [target=new Vector3()] - Optional target Vector3 to write results into.
	 * @returns {Vector3} The world-space position. For planar surfaces z is set to 0.
	 * @throws {Error} If the tiling projection is not cartographic.
	 */
	getPositionFromCartographic( lat, lon, target = new Vector3() ) {

		const { _tiling: tiling } = this;
		const { projection } = tiling;

		if ( ! projection.isCartographic ) {

			throw new Error( 'GeneratedSurfacePlugin: getPositionFromCartographic requires a cartographic projection.' );

		}

		if ( this._useEllipsoid() ) {

			return this.tiles.ellipsoid.getCartographicToPosition( lat, lon, 0, target );

		}

		const { center } = this;
		const normX = projection.convertLongitudeToNormalized( lon );
		const normY = projection.convertLatitudeToNormalized( lat );
		target.x = ( normX - ( center ? 0.5 : 0 ) ) * tiling.aspectRatio;
		target.y = normY - ( center ? 0.5 : 0 );
		target.z = 0;
		return target;

	}

	// whether the plugin is loading as an ellipsoid or not
	_useEllipsoid() {

		return this._tiling.projection.isCartographic && this.shape === 'ellipsoid';

	}

	_createPlanarMesh( tile ) {

		// the box z center stores the elevation range so the vertices carry the full elevation directly
		const boundingBox = tile.boundingVolume.box;
		let sx = 1, sy = 1, x = 0, y = 0;
		if ( boundingBox ) {

			[ x, y ] = boundingBox;
			sx = boundingBox[ 3 ];
			sy = boundingBox[ 7 ];

		}

		// adjust the geometry transform itself rather than the mesh because it reduces the artifact
		// errors when rendering.
		const { latVerts, lonVerts } = this.getSurfaceResolution( tile, true, _resolution );
		const geometry = new SkirtedPlaneGeometry( 2 * sx, 2 * sy, lonVerts, latVerts );
		const mesh = new Mesh( geometry, new MeshBasicMaterial() );
		mesh.position.set( x, y, 0 );

		this._displacePlanarGeometry( tile, geometry );
		return mesh;

	}

	// writes the displaced vertex positions and uvs for a tile into the given planar geometry. When
	// "edgesOnly" is set only the perimeter vertices are updated, for when new elevation data is
	// limited to the tile edges
	_displacePlanarGeometry( tile, geometry, edgesOnly = false ) {

		const tx = tile[ TILE_X ];
		const ty = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];

		const boundingBox = tile.boundingVolume.box;
		let sx = 1, sy = 1;
		if ( boundingBox ) {

			sx = boundingBox[ 3 ];
			sy = boundingBox[ 7 ];

		}

		const { latVerts, lonVerts } = this.getSurfaceResolution( tile, true, _resolution );
		const cols = lonVerts + 1;

		const uvRange = this._tiling.getTileContentUVBounds( tx, ty, level );
		const { position, uv } = geometry.attributes;
		const { surfaceVertexCount, skirtSourceIndices } = geometry;
		let minHeight = Infinity;
		let maxHeight = - Infinity;

		const count = edgesOnly ? skirtSourceIndices.length : surfaceVertexCount;
		for ( let j = 0; j < count; j ++ ) {

			const i = edgesOnly ? skirtSourceIndices[ j ] : j;
			const col = i % cols;
			const row = Math.floor( i / cols );
			const u = col / lonVerts;
			const v = 1 - row / latVerts;

			// displace the vertex
			const height = this.getElevation( u, v, tile );
			if ( height < minHeight ) minHeight = height;
			if ( height > maxHeight ) maxHeight = height;

			position.setXYZ(
				i,
				MathUtils.mapLinear( u, 0, 1, - sx, sx ),
				MathUtils.mapLinear( v, 0, 1, - sy, sy ),
				height,
			);

			// adjust the uvs so only the relevant texture portion is visible
			uv.setXY( i,
				MathUtils.mapLinear( u, 0, 1, uvRange[ 0 ], uvRange[ 2 ] ),
				MathUtils.mapLinear( v, 0, 1, uvRange[ 1 ], uvRange[ 3 ] ),
			);

		}

		// drop the skirt vertices from their source perimeter vertices by the skirt depth
		for ( let i = 0, l = skirtSourceIndices.length; i < l; i ++ ) {

			const src = skirtSourceIndices[ i ];
			const dst = surfaceVertexCount + i;
			position.setXYZ( dst, position.getX( src ), position.getY( src ), position.getZ( src ) - tile.geometricError );
			uv.setXY( dst, uv.getX( src ), uv.getY( src ) );

		}

		// edge updates only shift heights by a sub texel amount, so the bounding volume is unaffected
		if ( ! edgesOnly ) {

			this._updateBoundingVolume( tile, minHeight, maxHeight );

		}

		geometry.computeVertexNormals();
		geometry.computeBoundingSphere();
		position.needsUpdate = true;
		geometry.attributes.normal.needsUpdate = true;
		uv.needsUpdate = true;

	}

	_createEllipsoidMesh( tile ) {

		// new geometry positioned at the tile bounding sphere center
		const { latVerts, lonVerts } = this.getSurfaceResolution( tile, false, _resolution );
		const geometry = new SkirtedPlaneGeometry( 1, 1, lonVerts, latVerts );
		const mesh = new Mesh( geometry, new MeshBasicMaterial() );

		tile.engineData.boundingVolume.getSphere( _sphere );
		mesh.position.copy( _sphere.center );

		this._displaceEllipsoidGeometry( tile, geometry, mesh.position );
		return mesh;

	}

	// writes the displaced vertex positions, normals, and uvs for a tile into the given ellipsoid
	// geometry, with vertices positioned relative to "center". When "edgesOnly" is set only the
	// perimeter vertices are updated, for when new elevation data is limited to the tile edges
	_displaceEllipsoidGeometry( tile, geometry, center, edgesOnly = false ) {

		const { tiles, endCaps, _tiling: tiling } = this;
		const { projection } = tiling;
		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];

		const [ , south, , north ] = tile.boundingVolume.region;
		const { latVerts, lonVerts } = this.getSurfaceResolution( tile, false, _resolution );
		const cols = lonVerts + 1;

		const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true, true );
		const uvRange = tiling.getTileContentUVBounds( x, y, level );

		// adjust the geometry to position it at the region
		const { position, normal, uv } = geometry.attributes;
		const { surfaceVertexCount, skirtSourceIndices } = geometry;
		let minHeight = Infinity;
		let maxHeight = - Infinity;

		const count = edgesOnly ? skirtSourceIndices.length : surfaceVertexCount;
		for ( let j = 0; j < count; j ++ ) {

			const i = edgesOnly ? skirtSourceIndices[ j ] : j;
			const col = i % cols;
			const row = Math.floor( i / cols );
			const uNorm = col / lonVerts;
			const vNorm = 1 - row / latVerts;

			// convert the plane position to lat / lon
			const lon = projection.convertNormalizedToLongitude( MathUtils.mapLinear( uNorm, 0, 1, minU, maxU ) );
			let lat = projection.convertNormalizedToLatitude( MathUtils.mapLinear( vNorm, 0, 1, minV, maxV ) );

			// snap edges to poles for Mercator to avoid seams
			if ( projection.isMercator && endCaps ) {

				if ( maxV === 1 && vNorm === 1 ) {

					lat = Math.PI / 2;

				}

				if ( minV === 0 && vNorm === 0 ) {

					lat = - Math.PI / 2;

				}

			}

			// ensure we have an edge loop positioned at the mercator limit to avoid UV distortion
			// as much as possible at low LoDs.
			if ( projection.isMercator && vNorm !== 0 && vNorm !== 1 ) {

				const latLimit = projection.convertNormalizedToLatitude( 1 );
				const vStep = 1 / latVerts;
				const prevLat = MathUtils.mapLinear( vNorm - vStep, 0, 1, south, north );
				const nextLat = MathUtils.mapLinear( vNorm + vStep, 0, 1, south, north );

				if ( lat > latLimit && prevLat < latLimit ) {

					lat = latLimit;

				}

				if ( lat < - latLimit && nextLat > - latLimit ) {

					lat = - latLimit;

				}

			}

			// get the position and normal
			const height = this.getElevation( uNorm, vNorm, tile );
			if ( height < minHeight ) minHeight = height;
			if ( height > maxHeight ) maxHeight = height;
			tiles.ellipsoid.getCartographicToPosition( lat, lon, height, _pos ).sub( center );
			tiles.ellipsoid.getCartographicToNormal( lat, lon, _norm );

			// derive UV from the final (potentially adjusted) lat/lon so the overlay samples correctly
			const u = MathUtils.mapLinear( projection.convertLongitudeToNormalized( lon ), minU, maxU, uvRange[ 0 ], uvRange[ 2 ] );
			const v = MathUtils.mapLinear( projection.convertLatitudeToNormalized( lat ), minV, maxV, uvRange[ 1 ], uvRange[ 3 ] );

			// update the geometry
			position.setXYZ( i, _pos.x, _pos.y, _pos.z );
			normal.setXYZ( i, _norm.x, _norm.y, _norm.z );
			uv.setXY( i, u, v );

		}

		// drop the skirt vertices from their source perimeter vertices along the surface normal
		for ( let i = 0, l = skirtSourceIndices.length; i < l; i ++ ) {

			const src = skirtSourceIndices[ i ];
			const dst = surfaceVertexCount + i;
			_pos.fromBufferAttribute( position, src );
			_norm.fromBufferAttribute( normal, src );
			_pos.addScaledVector( _norm, - tile.geometricError );

			position.setXYZ( dst, _pos.x, _pos.y, _pos.z );
			normal.setXYZ( dst, _norm.x, _norm.y, _norm.z );
			uv.setXY( dst, uv.getX( src ), uv.getY( src ) );

		}

		// edge updates only shift heights by a sub texel amount, so the bounding volume is unaffected
		if ( ! edgesOnly ) {

			this._updateBoundingVolume( tile, minHeight, maxHeight );

		}

		geometry.computeBoundingSphere();
		position.needsUpdate = true;
		normal.needsUpdate = true;
		uv.needsUpdate = true;

	}

	// re-displaces a loaded tile's surface mesh in place after its elevation data has changed and
	// notifies listeners so acceleration structures can be updated
	_updateTileMesh( tile, edgesOnly = false ) {

		const scene = tile.engineData.scene;
		if ( ! scene ) {

			return;

		}

		const useEllipsoid = this._useEllipsoid();
		scene.traverse( c => {

			if ( c.isMesh ) {

				if ( useEllipsoid ) {

					this._displaceEllipsoidGeometry( tile, c.geometry, c.position, edgesOnly );

				} else {

					this._displacePlanarGeometry( tile, c.geometry, edgesOnly );

				}

			}

		} );

		this.tiles.dispatchEvent( { type: 'model-updated', scene, tile } );

	}

	// writes a terrain elevation range onto a tile's bounding volume so the traversal reads the new
	// bounds. the low bound is dropped by the tile's skirt depth so the hanging skirt stays enclosed.
	// "inherited" ranges are ancestor estimates that never overwrite a tile's own measured range and
	// cascade to any already-created descendants so their volumes are valid before they load
	_updateBoundingVolume( tile, minHeight, maxHeight, inherited = false ) {

		const range = tile[ ELEVATION_RANGE ];
		if ( inherited && range && ! range.inherited ) {

			return;

		}

		tile[ ELEVATION_RANGE ] = { min: minHeight, max: maxHeight, inherited };

		const min = minHeight - tile.geometricError;
		const max = maxHeight;

		// the engine volume only exists once the tile has been preprocessed
		const { boundingVolume, engineData } = tile;
		if ( boundingVolume.region ) {

			const region = boundingVolume.region;
			region[ 4 ] = min;
			region[ 5 ] = max;
			if ( engineData ) {

				engineData.boundingVolume.setRegionData( this.tiles.ellipsoid, ...region );

			}

		} else if ( boundingVolume.box ) {

			// elevation runs along local Z: set the box center and half extent
			const box = boundingVolume.box;
			box[ 2 ] = ( min + max ) / 2;
			box[ 11 ] = ( max - min ) / 2;
			if ( engineData ) {

				engineData.boundingVolume.setObbData( box, engineData.transform );

			}

		}

		// pass the range down to descendants created before this tile's terrain loaded
		const children = tile.children;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			this._updateBoundingVolume( children[ i ], minHeight, maxHeight, true );

		}

	}

	getTileset() {

		const { tiles, _tiling: tiling } = this;
		const minLevel = tiling.minLevel;
		const { tileCountX, tileCountY } = tiling.getLevel( minLevel );

		const children = [];
		for ( let x = 0; x < tileCountX; x ++ ) {

			for ( let y = 0; y < tileCountY; y ++ ) {

				const child = this.createChild( x, y, minLevel );
				if ( child !== null ) {

					children.push( child );

				}

			}

		}

		// generate tileset
		const tileset = {
			asset: { version: '1.1' },
			geometricError: Infinity,
			root: {
				refine: 'REPLACE',
				geometricError: Infinity,
				boundingVolume: this.createBoundingVolume( 0, 0, - 1 ),
				children,

				[ TILE_LEVEL ]: - 1,
				[ TILE_X ]: 0,
				[ TILE_Y ]: 0,
			},
		};

		tiles.preprocessTileset( tileset, '' );
		return tileset;

	}

	getUrl( /* x, y, level */ ) {

		return 'tile.generated_surface';

	}

	fetchData( url ) {

		if ( /generated_surface/.test( url ) ) {

			return new ArrayBuffer();

		}

	}

	createBoundingVolume( x, y, level, regionHeight = 0 ) {

		const { _tiling: tiling } = this;

		const isRoot = level === - 1;
		if ( this._useEllipsoid() ) {

			const { endCaps } = this;

			let normalizedBounds;
			let cartBounds;
			if ( isRoot ) {

				normalizedBounds = tiling.getContentBounds( true );
				cartBounds = tiling.getContentBounds();

			} else {

				normalizedBounds = tiling.getTileBounds( x, y, level, true, true );
				cartBounds = tiling.getTileBounds( x, y, level, false, true );

			}

			if ( endCaps ) {

				if ( normalizedBounds[ 3 ] === 1 ) cartBounds[ 3 ] = Math.PI / 2;
				if ( normalizedBounds[ 1 ] === 0 ) cartBounds[ 1 ] = - Math.PI / 2;

			}

			return { region: [ ...cartBounds, - regionHeight, 1 ] };

		} else {

			const { center } = this;
			let normalizedBounds;
			if ( isRoot ) {

				normalizedBounds = tiling.getContentBounds( true );

			} else {

				normalizedBounds = tiling.getTileBounds( x, y, level, true );

			}

			// calculate the world space bounds position from the range
			const [ minX, minY, maxX, maxY ] = normalizedBounds;
			let extentsX = ( maxX - minX ) / 2;
			let extentsY = ( maxY - minY ) / 2;
			let centerX = minX + extentsX;
			let centerY = minY + extentsY;

			if ( center ) {

				centerX -= 0.5;
				centerY -= 0.5;

			}

			// scale the fields
			centerX *= tiling.aspectRatio;
			extentsX *= tiling.aspectRatio;

			// return bounding box
			return {
				box: [
					// center
					centerX, centerY, 0,

					// x, y, z half extents
					extentsX, 0.0, 0.0,
					0.0, extentsY, 0.0,
					0.0, 0.0, 0.0,
				],
			};

		}

	}

	createChild( x, y, level ) {

		const { _tiling: tiling } = this;
		const { projection } = tiling;
		if ( ! tiling.getTileExists( x, y, level ) ) {

			return null;

		}

		let geometricError;
		const useRegions = this._useEllipsoid();
		if ( useRegions ) {

			const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true );
			const { tilePixelWidth, tilePixelHeight } = tiling.getLevel( level );

			// one pixel width in uv space
			const tileUWidth = ( maxU - minU ) / tilePixelWidth;
			const tileVWidth = ( maxV - minV ) / tilePixelHeight;

			// calculate the region ranges
			const [ /* west */, south, east, north ] = tiling.getTileBounds( x, y, level );

			// calculate the changes in lat / lon at the given point
			// find the most bowed point of the latitude range since the amount that latitude changes is
			// dependent on the Y value of the image
			const midLat = ( south > 0 ) !== ( north > 0 ) ? 0 : Math.min( Math.abs( south ), Math.abs( north ) );
			const midV = projection.convertLatitudeToNormalized( midLat );
			const lonFactor = projection.getLongitudeDerivativeAtNormalized( minU );
			const latFactor = projection.getLatitudeDerivativeAtNormalized( midV );

			// calculate the size of a pixel on the surface
			const [ xDeriv, yDeriv ] = getCartographicToMeterDerivative( this.tiles.ellipsoid, midLat, east );
			geometricError = Math.max( tileUWidth * lonFactor * xDeriv, tileVWidth * latFactor * yDeriv );

		} else {

			// Calculate geometric error: size of one pixel in world space.
			// The tile contents span [0, 1] along Y and [0, aspectRatio] along X.
			const { pixelWidth, pixelHeight } = tiling.getLevel( level );
			geometricError = Math.max( tiling.aspectRatio / pixelWidth, 1 / pixelHeight );

		}

		// Generate the node
		return {
			refine: 'REPLACE',
			geometricError,
			boundingVolume: this.createBoundingVolume( x, y, level, useRegions ? geometricError : 0 ),
			content: {
				uri: this.getUrl( x, y, level ),
			},
			children: [],

			// save the tile params so we can expand later
			[ TILE_X ]: x,
			[ TILE_Y ]: y,
			[ TILE_LEVEL ]: level,
		};

	}

	expandChildren( tile ) {

		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];

		// a child starts out assuming the same elevation range as its immediate parent; it gets tightened
		// once the child's own terrain is loaded and processed
		const range = tile[ ELEVATION_RANGE ];

		const { tileSplitX, tileSplitY } = this._tiling.getLevel( level );
		for ( let cx = 0; cx < tileSplitX; cx ++ ) {

			for ( let cy = 0; cy < tileSplitY; cy ++ ) {

				const child = this.createChild( tileSplitX * x + cx, tileSplitY * y + cy, level + 1 );
				if ( child ) {

					if ( range ) {

						this._updateBoundingVolume( child, range.min, range.max, true );

					}

					tile.children.push( child );

				}

			}

		}

	}

	// writes the interior vertex counts for a tile's surface grid onto "target"; override to match a
	// raster's resolution
	getSurfaceResolution( tile, planar, target ) {

		if ( planar ) {

			target.lonVerts = 1;
			target.latVerts = 1;
			return target;

		} else {

			const [ west, south, east, north ] = tile.boundingVolume.region;
			target.latVerts = Math.max( MIN_LAT_VERTS, Math.ceil( ( north - south ) * MathUtils.RAD2DEG * 0.25 ) );
			target.lonVerts = Math.max( MIN_LON_VERTS, Math.ceil( ( east - west ) * MathUtils.RAD2DEG * 0.25 ) );
			return target;

		}

	}

	// elevation in meters at a tile-local ( u, v ), origin south-west; override to displace vertices
	getElevation( /* u, v, tile */ ) {

		return 0;

	}

	_createDefaultTiling() {

		const tiling = new TilingScheme();
		if ( this.shape === 'ellipsoid' ) {

			const projection = new ProjectionScheme( 'EPSG:3857' );
			tiling.setProjection( projection );
			tiling.generateLevels( DEFAULT_LEVELS, projection.tileCountX, projection.tileCountY );

		} else {

			const projection = new ProjectionScheme( 'none' );
			tiling.setProjection( projection );
			tiling.generateLevels( DEFAULT_LEVELS, 1, 1 );

		}

		return tiling;

	}

}
