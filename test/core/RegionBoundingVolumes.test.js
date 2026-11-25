import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { Vec3 } from 'playcanvas';
import { TilesRenderer as BabylonTilesRenderer } from '../../src/babylonjs/renderer/tiles/TilesRenderer.js';
import { TilesRenderer as PlayCanvasTilesRenderer } from '../../src/playcanvas/renderer/tiles/TilesRenderer.js';
import { regionToBox } from '../../src/core/renderer/utilities/RegionUtils.js';
import { WGS84_HEIGHT, WGS84_RADIUS } from '../../src/core/renderer/constants.js';

const WGS84_RADII = [ WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT ];
const REGION = [ 0.4355, 1.0498, 0.4357, 1.0505, - 10, 150 ];

// a box well away from the region, with a transform that would move a region if applied to it
const BOX = [ 100, 200, 300, 10, 0, 0, 0, 20, 0, 0, 0, 30 ];
const TRANSFORM = [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1000, 0, 0, 1 ];

function createTile( boundingVolume, transform = undefined ) {

	return { boundingVolume, transform, children: [], refine: 'REPLACE', geometricError: 1 };

}

// the center of a 12 number box
function getBoxCenter( box ) {

	return [ box[ 0 ], box[ 1 ], box[ 2 ] ];

}

// the largest difference between two points. The renderers store boxes in 32-bit matrices, which
// round a position on the Earth's surface to a fraction of a meter
function getDistance( a, b ) {

	return Math.max( ...a.map( ( value, i ) => Math.abs( value - b[ i ] ) ) );

}

const renderers = [
	{
		name: 'PlayCanvas',
		create: () => new PlayCanvasTilesRenderer( 'tileset.json', null ),
		getObbCenter: obb => {

			const center = new Vec3();
			obb.transform.getTranslation( center );
			return [ center.x, center.y, center.z ];

		},
	},
	{
		name: 'Babylon.js',
		create: () => new BabylonTilesRenderer( 'tileset.json', new Scene( new NullEngine() ) ),
		getObbCenter: obb => {

			const center = new Vector3();
			obb.transform.decompose( undefined, undefined, center );
			return [ center.x, center.y, center.z ];

		},
	},
];

describe( 'region bounding volumes', () => {

	for ( const { name, create, getObbCenter } of renderers ) {

		describe( `${ name } TilesRenderer`, () => {

			it( 'bounds a tile with only a region by the box of the region', () => {

				const tiles = create();
				const tile = createTile( { region: REGION } );
				tiles.preprocessNode( tile, '', null );

				const { obb } = tile.engineData.boundingVolume;
				expect( obb ).toBeTruthy();

				const regionCenter = getBoxCenter( regionToBox( REGION, WGS84_RADII ) );
				expect( getDistance( getObbCenter( obb ), regionCenter ) ).toBeLessThan( 1 );

			} );

			it( 'does not apply the tile transform to a region', () => {

				const tiles = create();
				const tile = createTile( { region: REGION }, TRANSFORM );
				tiles.preprocessNode( tile, '', null );

				const { obb } = tile.engineData.boundingVolume;
				const regionCenter = getBoxCenter( regionToBox( REGION, WGS84_RADII ) );
				expect( getDistance( getObbCenter( obb ), regionCenter ) ).toBeLessThan( 1 );

			} );

			it( 'uses the box of a tile with both a box and a region', () => {

				const tiles = create();
				const tile = createTile( { box: BOX, region: REGION } );
				tiles.preprocessNode( tile, '', null );

				const { obb } = tile.engineData.boundingVolume;
				expect( getDistance( getObbCenter( obb ), getBoxCenter( BOX ) ) ).toBeLessThan( 1 );

			} );

		} );

	}

} );
