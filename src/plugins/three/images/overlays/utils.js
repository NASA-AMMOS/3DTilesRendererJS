import { Vector3, Matrix4, MathUtils } from 'three';

// iterates over all present tiles in the given tile set at the given level in the given range
export function forEachTileInBounds( range, level, tiling, normalized, callback ) {

	// pull the bounds in a bit to avoid loading unnecessary tiles. 1e-7 was chosen since smaller values
	// are not larger enough and cause extra tiles to load in cases where 1-to-1 tile-to-image should occur
	let [ minLon, minLat, maxLon, maxLat ] = range;
	minLat += 1e-7;
	minLon += 1e-7;
	maxLat -= 1e-7;
	maxLon -= 1e-7;

	const clampedLevel = Math.max( Math.min( level, tiling.maxLevel ), tiling.minLevel );
	const [ minX, minY, maxX, maxY ] = tiling.getTilesInRange( minLon, minLat, maxLon, maxLat, clampedLevel, normalized );
	for ( let x = minX; x <= maxX; x ++ ) {

		for ( let y = minY; y <= maxY; y ++ ) {

			if ( tiling.getTileExists( x, y, clampedLevel ) ) {

				callback( x, y, clampedLevel );

			}

		}

	}

}

// functions for generating UVs for cartographic-projected UVs
function getGeometryCartographicChannel( geometry, geomToEllipsoidMatrix, ellipsoid ) {

	const _vec = new Vector3();
	const _cart = {};
	const uv = [];
	const posAttr = geometry.getAttribute( 'position' );

	geometry.computeBoundingBox();
	geometry.boundingBox.getCenter( _vec ).applyMatrix4( geomToEllipsoidMatrix );

	// find a rough mid lat / lon point
	ellipsoid.getPositionToCartographic( _vec, _cart );
	const centerLat = _cart.lat;
	const centerLon = _cart.lon;

	let minLat = Infinity;
	let minLon = Infinity;
	let maxLat = - Infinity;
	let maxLon = - Infinity;
	for ( let i = 0; i < posAttr.count; i ++ ) {

		// get the lat / lon values per vertex
		_vec.fromBufferAttribute( posAttr, i ).applyMatrix4( geomToEllipsoidMatrix );
		ellipsoid.getPositionToCartographic( _vec, _cart );

		// The latitude calculations are not so stable at the poles so force the lat value to
		// the mid point to ensure we don't load an unnecessarily large of tiles
		// NOTE: this can distort the texture a bit at the poles
		if ( Math.abs( Math.abs( _cart.lat ) - Math.PI / 2 ) < 1e-5 ) {

			_cart.lon = centerLon;

		}

		// ensure we're not wrapping on the same geometry
		if ( Math.abs( centerLon - _cart.lon ) > Math.PI ) {

			_cart.lon += Math.sign( centerLon - _cart.lon ) * Math.PI * 2;

		}

		if ( Math.abs( centerLat - _cart.lat ) > Math.PI ) {

			_cart.lat += Math.sign( centerLat - _cart.lat ) * Math.PI * 2;

		}

		uv.push( _cart.lon, _cart.lat );

		minLat = Math.min( minLat, _cart.lat );
		maxLat = Math.max( maxLat, _cart.lat );

		minLon = Math.min( minLon, _cart.lon );
		maxLon = Math.max( maxLon, _cart.lon );

	}

	const range = [ minLon, minLat, maxLon, maxLat ];
	return { uv, range };

}

export function getMeshesCartographicRange( meshes, ellipsoid, meshToEllipsoidMatrix, tiling ) {

	// find the lat / lon ranges
	let minLat = Infinity;
	let minLon = Infinity;
	let maxLat = - Infinity;
	let maxLon = - Infinity;
	const uvs = [];

	const _matrix = new Matrix4();
	meshes.forEach( mesh => {

		// multiply in the ellipsoid matrix if necessary
		_matrix.copy( mesh.matrixWorld );
		if ( meshToEllipsoidMatrix ) {

			_matrix.premultiply( meshToEllipsoidMatrix );

		}

		const { uv, range } = getGeometryCartographicChannel( mesh.geometry, _matrix, ellipsoid );
		uvs.push( uv );

		// save the min and max values
		minLat = Math.min( minLat, range[ 1 ] );
		maxLat = Math.max( maxLat, range[ 3 ] );

		minLon = Math.min( minLon, range[ 0 ] );
		maxLon = Math.max( maxLon, range[ 2 ] );

	} );

	// Clamp the lat lon range to the bounds of the projection scheme. Note that clamping the data
	// allows for "stretching" the texture look at the edges of the projection which leads to a nicer
	// looking overlay. Eg at the poles of a web-mercator projection - otherwise there will be gaps
	// that show the underlying tile data. It's arguable which one is better but in all supported
	// ellipsoid projections (Web mercator, equirect) the projection ranges always span the entire
	// globe range.
	// const clampedRange = [ minLon, minLat, maxLon, maxLat ];
	const clampedRange = tiling.clampToBounds( [ minLon, minLat, maxLon, maxLat ] );
	const [ minU, minV, maxU, maxV ] = tiling.toNormalizedRange( clampedRange );
	uvs.forEach( uv => {

		for ( let i = 0, l = uv.length; i < l; i += 2 ) {

			const lon = uv[ i + 0 ];
			const lat = uv[ i + 1 ];

			const [ u, v ] = tiling.toNormalizedPoint( lon, lat );
			uv[ i + 0 ] = MathUtils.mapLinear( u, minU, maxU, 0, 1 );
			uv[ i + 1 ] = MathUtils.mapLinear( v, minV, maxV, 0, 1 );

		}

	} );

	return {
		uvs,
		range: clampedRange,
	};

}

// functions for generating UVs for planar-projected UVs
function getGeometryPlanarChannel( geometry, meshToFrame, aspect ) {

	const _vec = new Vector3();
	const uv = [];
	const posAttr = geometry.getAttribute( 'position' );

	let minU = Infinity;
	let minV = Infinity;
	let maxU = - Infinity;
	let maxV = - Infinity;
	for ( let i = 0; i < posAttr.count; i ++ ) {

		// divide U by the aspect to stretch the U dimension to the aspect of the image
		_vec.fromBufferAttribute( posAttr, i ).applyMatrix4( meshToFrame );
		_vec.x /= aspect;

		uv.push( _vec.x, _vec.y );

		minU = Math.min( minU, _vec.x );
		maxU = Math.max( maxU, _vec.x );

		minV = Math.min( minV, _vec.y );
		maxV = Math.max( maxV, _vec.y );

	}

	const range = [ minU, minV, maxU, maxV ];
	return { uv, range };

}

export function getMeshesPlanarRange( meshes, worldToFrame, tiling ) {

	// find the U / V ranges
	let minU = Infinity;
	let minV = Infinity;
	let maxU = - Infinity;
	let maxV = - Infinity;
	const uvs = [];

	const _matrix = new Matrix4();
	meshes.forEach( mesh => {

		// multiply in the ellipsoid matrix if necessary
		_matrix.copy( mesh.matrixWorld );
		if ( worldToFrame ) {

			_matrix.premultiply( worldToFrame );

		}

		const { uv, range } = getGeometryPlanarChannel( mesh.geometry, _matrix, tiling.aspect );
		uvs.push( uv );

		// save the min and max values
		minU = Math.min( minU, range[ 0 ] );
		maxU = Math.max( maxU, range[ 2 ] );

		minV = Math.min( minV, range[ 1 ] );
		maxV = Math.max( maxV, range[ 3 ] );

	} );

	uvs.forEach( uv => {

		for ( let i = 0, l = uv.length; i < l; i += 2 ) {

			const u = uv[ i + 0 ];
			const v = uv[ i + 1 ];

			uv[ i + 0 ] = MathUtils.mapLinear( u, minU, maxU, 0, 1 );
			uv[ i + 1 ] = MathUtils.mapLinear( v, minV, maxV, 0, 1 );

		}

	} );

	return {
		uvs,
		range: [ minU, minV, maxU, maxV ],
	};

}
