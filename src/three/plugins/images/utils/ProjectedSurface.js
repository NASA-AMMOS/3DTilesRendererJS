import { Vector2 } from 'three';
import { ProjectionScheme } from './ProjectionScheme.js';

const _point = [ 0, 0 ];

// Surface definition describing tile geometry flattened onto a projected plane, mapping between
// cartographic values and positions in the local group frame. Implements the same conversion
// functions as "Ellipsoid" so it can be assigned to "TilesRenderer.surface".
//
// The projection's [ 0, 1 ] normalized space is embedded in the local frame as
// "normalized * scale + offset" on the x / y plane with heights along z.
export class ProjectedSurface {

	constructor( projection = new ProjectionScheme() ) {

		this.isProjectedSurface = true;
		this.projection = projection;
		this.scale = new Vector2( 1, 1 );
		this.offset = new Vector2( 0, 0 );

	}

	getCartographicToPosition( lat, lon, height, target ) {

		const { projection } = this;
		if ( ! projection.isCartographic ) {

			throw new Error( 'ProjectedSurface: The projection is not cartographic.' );

		}

		const [ u, v ] = projection.fromCartographicToNormalized( lon, lat, _point );
		return this.getNormalizedToPosition( u, v, height, target );

	}

	getPositionToCartographic( pos, target ) {

		const { projection, scale, offset } = this;
		if ( ! projection.isCartographic ) {

			throw new Error( 'ProjectedSurface: The projection is not cartographic.' );

		}

		const u = ( pos.x - offset.x ) / scale.x;
		const v = ( pos.y - offset.y ) / scale.y;
		const [ lon, lat ] = projection.fromNormalizedToCartographic( u, v, _point );
		target.lon = lon;
		target.lat = lat;
		target.height = pos.z;
		return target;

	}

	// maps the projection's normalized coordinates into the local frame
	getNormalizedToPosition( u, v, height, target ) {

		const { scale, offset } = this;
		return target.set( u * scale.x + offset.x, v * scale.y + offset.y, height );

	}

	getCartographicToNormal( lat, lon, target ) {

		return target.set( 0, 0, 1 );

	}

	getPositionToNormal( pos, target ) {

		return target.set( 0, 0, 1 );

	}

}
