import {
	DataTexture,
	NearestFilter,
	Points,
	RGBAIntegerFormat,
	UnsignedByteType,
	Vector3,
} from 'three';
import { PotreeLoader, getChildBounds } from './PotreeLoader.js';
import { PointCloudMaterial } from '../pointcloud/PointCloudMaterial.js';
import { PointCloudEffectsPlugin } from '../pointcloud/PointCloudEffectsPlugin.js';

// Points are drawn larger than the point spacing to cover the gaps between them - potree uses
// the same factor
const SPACING_COVERAGE_FACTOR = 1.7;

// Node key from a tile content uri, e.g. ".../r012.potree" -> "r012"
function keyFromUri( uri ) {

	return uri.split( '/' ).pop().replace( /\.potree$/, '' );

}

// Id built from the key's octant path, matching the one the shader accumulates while walking so
// the "node" and "tile" debug colors can be compared directly.
function idFromKey( key ) {

	let id = 0;
	for ( let i = 1, l = key.length; i < l; i ++ ) {

		id = ( id * 8 + parseInt( key[ i ] ) + 1 ) % 16777216;

	}

	return id;

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

// The node hierarchy is stored in an integer texture so the shader reads the mask and offset
// bytes directly rather than converting them back from normalized floats. Nodes fill it in
// row major order, and it is square so it stays well clear of the platform size limit.
function createNodesTexture( size ) {

	const texture = new DataTexture(
		new Uint8Array( size * size * 4 ),
		size,
		size,
		RGBAIntegerFormat,
		UnsignedByteType,
	);
	texture.internalFormat = 'RGBA8UI';
	texture.minFilter = NearestFilter;
	texture.magFilter = NearestFilter;
	return texture;

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

	get pointScale() {

		return this._pointScale;

	}

	set pointScale( value ) {

		if ( value !== this._pointScale ) {

			this._pointScale = value;
			this._updateMaterials();

		}

	}

	constructor( options = {} ) {

		super( options );

		const {
			url = null,
			pointScale = 1,
			useRecommendedSettings = true,
		} = options;

		this.name = 'POTREE_PLUGIN';
		this.priority = - 1000;

		this.url = url;
		this.loader = null;
		this.useRecommendedSettings = useRecommendedSettings;

		this._pointScale = pointScale;

		// The active node hierarchy shared by every material: per texel the active-children
		// octant mask (r) and the offset to the first child texel (g, b). Rebuilt after any
		// frame that changes the active tile set.
		this._activeNodesTexture = createNodesTexture( 1 );

		this._activeSetDirty = false;
		this._onUpdateAfter = () => {

			if ( this._activeSetDirty ) {

				this._activeSetDirty = false;
				this._updateActiveNodesTexture();

			}

		};

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
		tiles.addEventListener( 'update-after', this._onUpdateAfter );

	}

	dispose() {

		this.tiles.removeEventListener( 'update-after', this._onUpdateAfter );
		this._activeNodesTexture.dispose();

		super.dispose();
		this.loader = null;

	}

	setTileActive() {

		this._activeSetDirty = true;

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
		material.activeNodes = this._activeNodesTexture;
		material.uniforms.uTileId.value = idFromKey( key );
		material.uniforms.uNodeSize.value = boundingBox.max[ 0 ] - boundingBox.min[ 0 ];
		material.uniforms.uNodeMinOffset.value.copy( center ).sub( new Vector3( ...boundingBox.min ) );

		// offset the points by the node center so vertex positions stay near the origin
		const points = new Points( geometry, material );
		points.position.copy( center );
		points.updateMatrix();

		this._expandChildren( tile, key );
		this._activeSetDirty = true;

		return points;

	}

	disposeTile( tile ) {

		const { processNodeQueue } = this.tiles;
		for ( let i = 0, l = tile.children.length; i < l; i ++ ) {

			processNodeQueue.remove( tile.children[ i ] );

		}

		tile.children.length = 0;
		this._activeSetDirty = true;

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

	// Encode the active tiles into the nodes texture, sorted by level then key so a tile's
	// children are consecutive and in octant order, as the shader's walk expects. Additive
	// refinement keeps the set a connected tree.
	_updateActiveNodesTexture() {

		const { tiles } = this;

		const keys = new Map();
		tiles.activeTiles.forEach( tile => {

			keys.set( tile, keyFromUri( tile.content.uri ) );

		} );

		const list = [ ...keys.keys() ].sort( ( a, b ) => {

			const ka = keys.get( a );
			const kb = keys.get( b );
			if ( ka.length !== kb.length ) return ka.length - kb.length;
			return ka < kb ? - 1 : 1;

		} );

		// grow the texture when the tiles no longer fit
		let texture = this._activeNodesTexture;
		const size = Math.ceil( Math.sqrt( list.length ) );
		if ( size > texture.image.width ) {

			texture.dispose();
			texture = createNodesTexture( size );
			this._activeNodesTexture = texture;

			tiles.forEachLoadedModel( scene => {

				scene.material.activeNodes = texture;

			} );

		}

		const data = texture.image.data;
		data.fill( 0 );

		const indexByKey = new Map();
		for ( let i = 0, l = list.length; i < l; i ++ ) {

			const key = keys.get( list[ i ] );
			indexByKey.set( key, i );

			// byte 3: potree's density lod offset, 100 being its "no offset" encoding
			data[ i * 4 + 3 ] = 100;

			if ( i === 0 ) {

				continue;

			}

			const parentKey = key.slice( 0, - 1 );
			const parentIndex = indexByKey.get( parentKey );

			// bytes 1 and 2 are the offset to the first child, and siblings are consecutive so
			// the first one encountered sets it
			if ( data[ parentIndex * 4 ] === 0 ) {

				const offset = i - parentIndex;
				data[ parentIndex * 4 + 1 ] = offset >> 8;
				data[ parentIndex * 4 + 2 ] = offset & 0xff;

			}

			// byte 0 is the child occupancy mask, and the key's last digit is the tile's octant
			const octant = parseInt( key.charAt( key.length - 1 ) );
			data[ parentIndex * 4 ] |= 1 << octant;

		}

		texture.needsUpdate = true;

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
