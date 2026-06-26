import { Vector3, MathUtils } from 'three';
import { OccupancyAnnotation } from '../ScreenOccupationManager.js';

const _delta = /* @__PURE__ */ new Vector3();

// suppress annotations within ~6 degrees of the globe horizon
const PERSPECTIVE_CULL_ANGLE = Math.acos( 0.1 );
export class PointAnnotation extends OccupancyAnnotation {

	constructor() {

		super();

		this.position = new Vector3();
		this.lat = 0;
		this.lon = 0;
		this.radius = 32;

		this._screenPos = new Vector3();
		this._facingAngle = 0;

	}

	updateTransform( matrix, resolution, cameraPosition ) {

		const { position } = this;
		const screenPos = this._screenPos;

		// project to screen space
		screenPos.copy( position ).applyMatrix4( matrix );

		// transform to resolution coordinates
		screenPos.x = ( screenPos.x * 0.5 + 0.5 ) * resolution.width;
		screenPos.y = ( - screenPos.y * 0.5 + 0.5 ) * resolution.height;
		screenPos.z = ( screenPos.z < - 1 || screenPos.z > 1 ) ? 1 : 0;

		// facing ratio: dot( surface normal, direction to camera )
		// TODO: store geodetic normal on the item at creation time and use it here instead of
		// normalize( position )
		if ( cameraPosition !== null ) {

			_delta.subVectors( cameraPosition, position );
			this._facingAngle = position.lengthSq() > 0 ? position.angleTo( _delta ) : 0;

		} else {

			this._facingAngle = 0;

		}

	}

	copyPosition( source ) {

		this.position.copy( source.position );
		this.ready = source.ready;

	}

	evaluate( handle ) {

		const { _screenPos, radius, _facingAngle } = this;
		if ( ! this.ready ) {

			return false;

		}

		if ( _screenPos.z !== 0 ) {

			return false;

		}

		if ( _facingAngle > PERSPECTIVE_CULL_ANGLE ) {

			return false;

		}

		if ( handle.test( _screenPos.x, _screenPos.y, radius ) ) {

			return false;

		}

		handle.mark( _screenPos.x, _screenPos.y, radius );
		return true;

	}

}

export function parsePointAnnotations( vectorTile, x, y, level, tiling, filter ) {

	const [ tMinX, tMinY, tMaxX, tMaxY ] = tiling.getTileBounds( x, y, level, true, false );
	const points = [];

	for ( const layerName in vectorTile.layers ) {

		const layer = vectorTile.layers[ layerName ];
		const extent = layer.extent;

		for ( let i = 0; i < layer.length; i ++ ) {

			// process only points
			const feature = layer.feature( i );
			if ( feature.type !== 1 ) {

				continue;

			}

			if ( filter !== null && ! filter( layerName, feature.properties, feature.type ) ) {

				continue;

			}

			// retrieve the geometry
			const geometry = feature.loadGeometry();
			for ( const [ point ] of geometry ) {

				const u = MathUtils.lerp( tMinX, tMaxX, point.x / extent );
				// tile Y=0 is geographic north; with flipY the V axis increases northward
				// so we invert vf when flipY is set
				const vf = point.y / extent;
				const v = tiling.flipY
					? MathUtils.lerp( tMaxY, tMinY, vf )
					: MathUtils.lerp( tMinY, tMaxY, vf );

				const [ lon, lat ] = tiling.toCartographicPoint( u, v );

				const item = new PointAnnotation();
				// feature.id is the OSM element ID (node/way/relation) preserved by Planetiler
				// across all zoom levels — stable and unique for cross-LoD annotation replacement.
				// TODO: is this id always guaranteed to be unique and consistent across LoDs?
				item.id = `${ layerName }:${ feature.id }`;
				item.layer = layerName;
				item.properties = feature.properties;
				item.lat = lat;
				item.lon = lon;
				item.lodLevel = level;

				points.push( item );

			}

		}

	}

	return points;

}
