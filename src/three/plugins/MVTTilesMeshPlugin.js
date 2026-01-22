import { XYZTilesPlugin } from './images/EPSGTilesPlugin.js';
import { MVTLoader } from '../renderer/loaders/MVTLoader.js';
import { Mesh, MeshBasicMaterial, Vector3, MathUtils, SphereGeometry, FrontSide } from 'three';
import { TILE_X, TILE_Y, TILE_LEVEL } from './images/ImageFormatPlugin.js';
import { WGS84_RADIUS } from '../../core/renderer/constants.js';
import { MVT_EXTENT } from '../../core/renderer/loaders/MVTLoaderBase.js';

const _pos = new Vector3();
const _tileCenter = new Vector3();

export class MVTTilesMeshPlugin extends XYZTilesPlugin {

	constructor( options = {} ) {

		super( options );
		this.name = 'VECTOR_TILES_PLUGIN';

		this.loader = new MVTLoader( undefined, options.styles );

		if ( options.filter ) {

			this.loader.filter = options.filter;

		}

		this.globeMesh = new Mesh(
			new SphereGeometry( WGS84_RADIUS, 64, 64 ),
			new MeshBasicMaterial( { color: 0x292929, side: FrontSide } )
		);
		this.globeMesh.renderOrder = - 9999;
		this.globeMesh.raycast = () => false;

	}

	init( tiles ) {

		super.init( tiles );

		this.tiles = tiles;
		this.tiles.group.add( this.globeMesh );

	}

	async parseToMesh( buffer, tile, extension, uri, abortSignal ) {

		if ( abortSignal.aborted ) {

			return null;

		}

		if ( extension === 'pbf' || extension === 'mvt' ) {

			const result = await this.loader.parse( buffer );
			const group = result.scene;

			this._projectGroupToGlobe( group, tile );

			return group;

		}

		return null;

	}

	_projectGroupToGlobe( group, tile ) {

		const { tiling, projection, tiles } = this;
		const ellipsoid = tiles.ellipsoid;

		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];
		const extents = MVT_EXTENT;

		// 1. Calculate the Tile Center (RTC Origin)
		// We place the Group at the cartesian center of the tile.
		// All vertex positions will be relative to this point.

		// Get bounds in Projection (UV) space
		const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true, true );

		// Calculate center UV
		const centerU = ( minU + maxU ) / 2;
		const centerV = ( minV + maxV ) / 2;

		// Convert UV -> Lat/Lon -> Cartesian
		const centerLon = projection.convertNormalizedToLongitude( centerU );
		const centerLat = projection.convertNormalizedToLatitude( centerV );
		ellipsoid.getCartographicToPosition( centerLat, centerLon, 0, _tileCenter );

		group.position.copy( _tileCenter );
		group.updateMatrixWorld( true );

		// 2. Iterate over all meshes and project their vertices
		group.traverse( child => {

			if ( child.isMesh || child.isLineSegments || child.isPoints ) {

				const geometry = child.geometry;
				const positionAttribute = geometry.getAttribute( 'position' );
				const count = positionAttribute.count;

				for ( let i = 0; i < count; i ++ ) {

					// A. Read Local MVT Coordinate
					// Note: Your MVTLoader stores Y as negative (-4096 to 0) to match Three.js formatting,
					// but MVT data logically goes from 0 (Top) to 4096 (Bottom).
					// We invert Y back to positive to get the normalized 0-1 range relative to the tile top.
					const localX = positionAttribute.getX( i );
					const localY = - positionAttribute.getY( i );

					// B. Normalize to 0..1 (UV local to tile)
					const uLocal = localX / extents;
					const vLocal = localY / extents;

					// C. Map to Global Projection UV
					// Interpolate between the tile bounds we calculated earlier
					const uGlobal = MathUtils.lerp( minU, maxU, uLocal );
					const vGlobal = MathUtils.lerp( maxV, minV, vLocal );

					// D. Convert Global UV -> Lat/Lon
					const lon = projection.convertNormalizedToLongitude( uGlobal );
					const lat = projection.convertNormalizedToLatitude( vGlobal );

					// E. Convert Lat/Lon -> World Cartesian
					// Assuming altitude 0 for now
					ellipsoid.getCartographicToPosition( lat, lon, 0, _pos );

					// F. Convert to RTC (Relative To Center)
					// Subtract the group position so the vertex is local to the group
					_pos.sub( _tileCenter );

					// G. Update the vertex
					positionAttribute.setXYZ( i, _pos.x, _pos.y, _pos.z );

				}

				geometry.computeBoundingSphere();
				geometry.computeBoundingBox();
				positionAttribute.needsUpdate = true;

			}

		} );

	}

}
