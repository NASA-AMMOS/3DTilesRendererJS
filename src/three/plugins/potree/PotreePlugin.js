import { Points } from 'three';
import { PotreeLoader, getChildBounds } from './PotreeLoader.js';
import { PointCloudMaterial } from '../pointcloud/PointCloudMaterial.js';
import { PointCloudEffectsPlugin } from '../pointcloud/PointCloudEffectsPlugin.js';
import { SPACING_COVERAGE_FACTOR, idFromOctantPath } from '../pointcloud/ActiveNodesTexture.js';

// Node key from a tile content uri, e.g. ".../r012.potree" -> "r012"
function keyFromUri( uri ) {

	return uri.split( '/' ).pop().replace( /\.potree$/, '' );

}

// Build a 3D Tiles box array [cx,cy,cz, hx,0,0, 0,hy,0, 0,0,hz] from min/max
function makeBoundingBox( min, max ) {

	const cx = ( min[ 0 ] + max[ 0 ] ) / 2;
	const cy = ( min[ 1 ] + max[ 1 ] ) / 2;
	const cz = ( min[ 2 ] + max[ 2 ] ) / 2;
	const hx = ( max[ 0 ] - min[ 0 ] ) / 2;
	const hy = ( max[ 1 ] - min[ 1 ] ) / 2;
	const hz = ( max[ 2 ] - min[ 2 ] ) / 2;
	return [ cx, cy, cz, hx, 0, 0, 0, hy, 0, 0, 0, hz ];

}

// Extract [min, max] arrays from a 3D Tiles box array
function boxToMinMax( box ) {

	const [ cx, cy, cz, hx, , , , hy, , , , hz ] = box;
	return [
		[ cx - hx, cy - hy, cz - hz ],
		[ cx + hx, cy + hy, cz + hz ],
	];

}

/**
 * Plugin that adds support for Potree point cloud datasets (v1.x and v2.0).
 *
 * Builds a synthetic additive-refinement tileset and streams point cloud nodes on demand. Each
 * point is sized by the deepest active node at its position, resolved in the vertex shader
 * against a texture encoding the active node hierarchy.
 *
 * Extends PointCloudEffectsPlugin, so the point shape, size clamping, eye dome lighting and
 * debug color options are available here too.
 *
 * @param {Object} [options] PointCloudEffectsPlugin options plus the ones below.
 * @param {string|null} [options.url=null] Url of the dataset metadata file, `cloud.js` for v1 or `metadata.json` for v2. Falls back to `tiles.rootURL`.
 * @param {number} [options.pointScale=1] Multiplier on the point size. Can be adjusted after construction.
 * @param {boolean} [options.useRecommendedSettings=true] Whether to set the renderer error target to a value suited to point spacing based geometric error.
 */
export class PotreePlugin extends PointCloudEffectsPlugin {

	constructor( options = {} ) {

		super( options );

		const {
			url = null,
			useRecommendedSettings = true,
		} = options;

		this.name = 'POTREE_PLUGIN';
		this.priority = - 1000;

		this.url = url;
		this.loader = null;
		this.useRecommendedSettings = useRecommendedSettings;

	}

	init( tiles ) {

		super.init( tiles );

		// node geometric error is the potree point spacing, so the error target is that spacing
		// projected on screen in pixels
		if ( this.useRecommendedSettings ) {

			tiles.errorTarget = 1;

		}

		// route the loader requests through the other plugins
		const loader = new PotreeLoader();
		loader.fetchOptions = tiles.fetchOptions;
		loader.fetchData = ( url, options ) => {

			return tiles.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( url, options ) );

		};

		this.loader = loader;

	}

	dispose() {

		super.dispose();
		this.loader = null;

	}

	async loadRootTileset() {

		const { tiles, url, loader } = this;

		let metaUrl = new URL( url ?? tiles.rootURL, location.href ).href;
		tiles.invokeAllPlugins( plugin => {

			metaUrl = plugin.preprocessURL ? plugin.preprocessURL( metaUrl, null ) : metaUrl;

		} );

		await loader.load( metaUrl );

		const { spacing, boundingBox } = loader.metadata;
		const tileset = {
			asset: { version: '1.1' },
			geometricError: Infinity,
			root: {
				refine: 'ADD',
				geometricError: spacing,
				boundingVolume: { box: makeBoundingBox( boundingBox.min, boundingBox.max ) },
				content: { uri: 'r.potree' },
				children: [],
			},
		};

		tiles.preprocessTileset( tileset, metaUrl.slice( 0, metaUrl.lastIndexOf( '/' ) + 1 ) );

		return tileset;

	}

	fetchData( uri, options ) {

		if ( ! /\.potree$/.test( uri ) ) {

			return null;

		}

		return this.loader.loadNodeData( keyFromUri( uri ), options );

	}

	parseToMesh( buffer, tile, extension, uri ) {

		if ( extension !== 'potree' ) {

			return null;

		}

		const key = keyFromUri( uri );
		const [ tileMin, tileMax ] = boxToMinMax( tile.boundingVolume.box );
		const { geometry, center } = this.loader.parsePointData( buffer, key, tileMin, tileMax );

		const { spacing, boundingBox } = this.loader.metadata;
		const material = new PointCloudMaterial( {
			vertexColors: Boolean( geometry.attributes.color ),
			size: spacing * SPACING_COVERAGE_FACTOR * this.pointScale,
		} );
		material.activeNodes = this._getActiveNodes( this ).texture;
		material.uniforms.uTileId.value = idFromOctantPath( key.slice( 1 ) );
		material.uniforms.uNodeSize.value = boundingBox.max[ 0 ] - boundingBox.min[ 0 ];
		material.uniforms.uNodeTransform.value.makeTranslation(
			center.x - boundingBox.min[ 0 ],
			center.y - boundingBox.min[ 1 ],
			center.z - boundingBox.min[ 2 ],
		);

		// offset the points by the node center so vertex positions stay near the origin
		const points = new Points( geometry, material );
		points.position.copy( center );
		points.updateMatrix();

		this._expandChildren( tile, key );

		return points;

	}

	disposeTile( tile ) {

		super.disposeTile( tile );

		const { processNodeQueue } = this.tiles;
		for ( let i = 0, l = tile.children.length; i < l; i ++ ) {

			processNodeQueue.remove( tile.children[ i ] );

		}

		tile.children.length = 0;

	}

	// Attach child tiles for the node's loaded hierarchy children once its content is parsed
	_expandChildren( tile, key ) {

		const { loader } = this;
		const node = loader.hierarchy.get( key );
		const [ parentMin, parentMax ] = boxToMinMax( tile.boundingVolume.box );
		const childError = tile.geometricError / 2;

		for ( let octant = 0; octant < 8; octant ++ ) {

			const childKey = key + octant;
			if ( ! ( node.childMask & ( 1 << octant ) ) ) {

				continue;

			}

			const [ childMin, childMax ] = getChildBounds( parentMin, parentMax, octant );
			tile.children.push( {
				refine: 'ADD',
				geometricError: childError,
				boundingVolume: { box: makeBoundingBox( childMin, childMax ) },
				content: { uri: `${ childKey }.potree` },
				children: [],
			} );

		}

	}

	// Every potree tile is a node of the one octree, keyed by its content uri
	_getOctreeNode( tile ) {

		return tile.content ? { root: this, path: keyFromUri( tile.content.uri ).slice( 1 ) } : null;

	}

	// Push the current point scale onto the loaded materials
	_updateMaterials() {

		super._updateMaterials();

		// the loader has no metadata until the root tile set has loaded
		const { metadata } = this.loader ?? {};
		if ( ! metadata ) {

			return;

		}

		this.tiles.forEachLoadedModel( scene => {

			scene.material.size = metadata.spacing * SPACING_COVERAGE_FACTOR * this.pointScale;

		} );

	}

}
