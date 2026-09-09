import { DataTexture, NearestFilter, Points, Vector3 } from 'three';
import { PotreeLoader, getChildBounds } from './PotreeLoader.js';
import { PotreePointsMaterial, NODES_TEXTURE_WIDTH } from './PotreePointsMaterial.js';

// Points are drawn larger than the point spacing to cover the gaps between them - potree uses
// the same factor
const SPACING_COVERAGE_FACTOR = 1.7;

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
 * Plugin that adds support for Potree point cloud datasets (v1.x and v2.0) via
 * {@link PotreeLoader}.
 *
 * Builds a synthetic additive-refinement tileset and streams point cloud nodes on demand. Each
 * point is sized by the deepest active node at its position, resolved in the vertex shader
 * against a texture encoding the active node hierarchy.
 *
 * @param {Object} [options]
 * @param {string|null} [options.url=null] Url of the dataset metadata file - `cloud.js` for v1
 *   or `metadata.json` for v2. Falls back to `tiles.rootURL`.
 * @param {number} [options.pointScale=1] Multiplier on the point size. Can be adjusted
 *   dynamically.
 * @param {('square'|'round'|'sphere')} [options.pointShape='round'] Shape of the point sprites.
 *   Can be adjusted dynamically.
 * @param {number} [options.minPointSize=2] Smallest point size in pixels. Can be adjusted
 *   dynamically.
 */
export class PotreePlugin {

	get pointScale() {

		return this._pointScale;

	}

	set pointScale( value ) {

		if ( value !== this._pointScale ) {

			this._pointScale = value;
			this._updateMaterials();

		}

	}

	get pointShape() {

		return this._pointShape;

	}

	set pointShape( value ) {

		if ( value !== this._pointShape ) {

			this._pointShape = value;
			this._updateMaterials();

		}

	}

	get minPointSize() {

		return this._minPointSize;

	}

	set minPointSize( value ) {

		if ( value !== this._minPointSize ) {

			this._minPointSize = value;
			this._updateMaterials();

		}

	}

	get debugColorMode() {

		return this._debugColorMode;

	}

	set debugColorMode( value ) {

		if ( value !== this._debugColorMode ) {

			this._debugColorMode = value;
			this._updateMaterials();

		}

	}

	constructor( options = {} ) {

		const {
			url = null,
			pointScale = 1,
			pointShape = 'round',
			minPointSize = 2,
		} = options;

		this.name = 'POTREE_PLUGIN';
		this.priority = - 1000;

		this.url = url;
		this.tiles = null;
		this.loader = null;

		this._pointScale = pointScale;
		this._pointShape = pointShape;
		this._minPointSize = minPointSize;
		this._debugColorMode = 'none';

		// The active node hierarchy shared by every material: per texel the active-children
		// octant mask (r) and the offset to the first child texel (g, b). Rebuilt after any
		// frame that changes the active tile set.
		this._activeNodesTexture = new DataTexture(
			new Uint8Array( NODES_TEXTURE_WIDTH * 4 ),
			NODES_TEXTURE_WIDTH,
			1,
		);
		this._activeNodesTexture.minFilter = NearestFilter;
		this._activeNodesTexture.magFilter = NearestFilter;

		this._activeSetDirty = false;
		this._onUpdateAfter = () => {

			if ( this._activeSetDirty ) {

				this._activeSetDirty = false;
				this._updateActiveNodesTexture();

			}

		};

	}

	// Plugin lifecycle
	init( tiles ) {

		// route the loader requests through the other plugins
		const loader = new PotreeLoader();
		loader.fetchOptions = tiles.fetchOptions;
		loader.fetchData = ( url, options ) => {

			return tiles.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( url, options ) );

		};

		this.tiles = tiles;
		this.loader = loader;
		tiles.addEventListener( 'update-after', this._onUpdateAfter );

	}

	dispose() {

		this.tiles.removeEventListener( 'update-after', this._onUpdateAfter );
		this._activeNodesTexture.dispose();

		this.tiles = null;
		this.loader = null;

	}

	setTileActive() {

		this._activeSetDirty = true;

	}

	// Tileset loading
	async loadRootTileset() {

		const { tiles, url, loader } = this;

		// resolve the metadata file url
		let metaUrl = new URL( url ?? tiles.rootURL, location.href ).href;
		tiles.invokeAllPlugins( plugin => {

			metaUrl = plugin.preprocessURL ? plugin.preprocessURL( metaUrl, null ) : metaUrl;

		} );

		// load the metadata and root hierarchy, then build the synthetic tileset
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

	// Tile content hooks
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

		// size the points in world units to the root level spacing, which the vertex shader
		// halves per active level below the root at each point's position
		const key = keyFromUri( uri );
		const [ tileMin, tileMax ] = boxToMinMax( tile.boundingVolume.box );
		const { geometry, center } = this.loader.parsePointData( buffer, key, tileMin, tileMax );

		const { spacing, boundingBox } = this.loader.metadata;
		const material = new PotreePointsMaterial( {
			vertexColors: Boolean( geometry.attributes.color ),
			size: spacing * SPACING_COVERAGE_FACTOR * this._pointScale,
			pointShape: this._pointShape,
			minPointSize: this._minPointSize,
			debugColorMode: this._debugColorMode,
		} );
		material.uniforms.uActiveNodes.value = this._activeNodesTexture;
		material.uniforms.uNodeSize.value = boundingBox.max[ 0 ] - boundingBox.min[ 0 ];
		material.uniforms.uNodeMinOffset.value.copy( center ).sub( new Vector3( ...boundingBox.min ) );

		// offset the points by the node center so vertex positions stay near the origin
		const points = new Points( geometry, material );
		points.position.copy( center );
		points.updateMatrix();

		this._expandChildren( tile, key );
		this._activeSetDirty = true;

		// points.visible = tile.internal.depth === 2;
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

	// Tile expansion

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

	// Point sizing

	// Encode the active tile hierarchy into the nodes texture, sorted by level then key so
	// every tile's children are consecutive and in octant order as the shader's walk expects.
	// The set is a connected tree since with additive refinement a tile is only active when its
	// ancestors are.
	_updateActiveNodesTexture() {

		const { tiles } = this;

		// collect the active tiles sorted by level then key
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

		// grow the texture by rows and point the loaded materials at it when the tiles no
		// longer fit
		let texture = this._activeNodesTexture;
		if ( list.length > NODES_TEXTURE_WIDTH * texture.image.height ) {

			let height = texture.image.height;
			while ( list.length > NODES_TEXTURE_WIDTH * height ) height *= 2;

			texture.dispose();
			texture = new DataTexture( new Uint8Array( NODES_TEXTURE_WIDTH * height * 4 ), NODES_TEXTURE_WIDTH, height );
			texture.minFilter = NearestFilter;
			texture.magFilter = NearestFilter;
			this._activeNodesTexture = texture;

			tiles.forEachLoadedModel( scene => {

				scene.material.uniforms.uActiveNodes.value = texture;

			} );

		}

		// encode each tile's link into its parent's mask and child offset
		const data = texture.image.data;
		data.fill( 0 );

		const indexByKey = new Map();
		for ( let i = 0, l = list.length; i < l; i ++ ) {

			const key = keys.get( list[ i ] );
			indexByKey.set( key, i );

			const parentIndex = indexByKey.get( key.slice( 0, - 1 ) );
			if ( parentIndex !== undefined ) {

				// siblings are consecutive so the first one encountered sets the child offset
				if ( data[ parentIndex * 4 ] === 0 ) {

					const offset = i - parentIndex;
					data[ parentIndex * 4 + 1 ] = offset >> 8;
					data[ parentIndex * 4 + 2 ] = offset & 0xff;

				}

				// the key's last digit is the tile's octant within its parent
				data[ parentIndex * 4 ] |= 1 << parseInt( key.charAt( key.length - 1 ) );

			}

		}

		texture.needsUpdate = true;

	}

	// Push the current point scale, shape, and debug settings onto the loaded materials
	_updateMaterials() {

		const { spacing } = this.loader.metadata;
		this.tiles.forEachLoadedModel( scene => {

			const { material } = scene;
			material.size = spacing * SPACING_COVERAGE_FACTOR * this._pointScale;
			material.pointShape = this._pointShape;
			material.minPointSize = this._minPointSize;
			material.debugColorMode = this._debugColorMode;

		} );

	}

}
