import { DataTexture, NearestFilter, Points, Vector3 } from 'three';
import { PotreeLoader, getChildBounds } from './PotreeLoader.js';
import { PotreePointsMaterial, ACTIVE_NODES_TEXTURE_SIZE } from './PotreePointsMaterial.js';

// Point spacing is the average distance between points, so points are drawn somewhat larger than
// the spacing to cover the gaps between them. Potree uses the same factor.
const SPACING_COVERAGE_FACTOR = 1.7;

// Node key from a tile content uri, e.g. ".../r012.potree" -> "r012". Keys are the potree node
// names: "r" for the root with a child's octant digit appended per level.
function keyFromUri( uri ) {

	return String( uri ).split( '/' ).pop().replace( /\.potree$/, '' );

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
 * `tiles.rootURL` must point directly to the dataset metadata file:
 * - Potree v1: `cloud.js`
 * - Potree v2: `metadata.json`
 *
 * Builds a synthetic 3D Tiles tileset and streams point cloud nodes on demand using the same
 * lazy-expansion and disposal pattern as `QuantizedMeshPlugin`.
 *
 * Potree uses additive LOD (`refine: 'ADD'`): parent nodes remain visible while higher-density
 * children load in. Each point is sized by the deepest active node at its position, resolved in
 * the vertex shader against a texture encoding the loaded node hierarchy and per node active
 * states.
 *
 * @param {Object} [options]
 * @param {number} [options.pointScale=1] Multiplier on the point size, which is derived from the
 *   point spacing of the finest active level at each point. Can be adjusted dynamically.
 * @param {('square'|'round'|'sphere')} [options.pointShape='round'] Shape of the point sprites.
 *   Squares tile the surface with no gaps, circles read as a continuous organic surface, and
 *   spheres additionally write bulged depth values so overlapping points intersect. The sphere
 *   depth writes disable early depth testing, which has a fill rate cost. Can be adjusted
 *   dynamically.
 * @param {number} [options.minPointSize=2] Smallest point size in pixels.
 */
export class PotreePlugin {

	get pointScale() {

		return this._pointScale;

	}

	set pointScale( value ) {

		if ( value !== this._pointScale ) {

			this._pointScale = value;
			this._updatePointScales();

		}

	}

	get pointShape() {

		return this._pointShape;

	}

	set pointShape( value ) {

		if ( value !== this._pointShape ) {

			this._pointShape = value;
			this._updateMaterialSettings();

		}

	}

	get debugNodeColors() {

		return this._debugNodeColors;

	}

	set debugNodeColors( value ) {

		if ( value !== this._debugNodeColors ) {

			this._debugNodeColors = value;
			this._updateMaterialSettings();

		}

	}

	constructor( options = {} ) {

		const {
			pointScale = 1,
			pointShape = 'round',
			minPointSize = 2,
		} = options;

		this.name = 'POTREE_PLUGIN';
		this.priority = - 1000;

		this.tiles = null;
		this.loader = null;
		this.minPointSize = minPointSize;

		this._pointScale = pointScale;
		this._pointShape = pointShape;
		this._debugNodeColors = false;

		// The loaded node hierarchy shared by every material, encoded per texel as the octant
		// mask of the loaded children (r), the offset to the first of them (g, b), and whether
		// the node itself is active (a). Refreshed after the traversal of any frame that changed
		// the active or loaded tile sets. The active set ignores frustum culling so point sizes
		// stay stable as tiles pass in and out of view.
		this._activeNodesTexture = new DataTexture(
			new Uint8Array( ACTIVE_NODES_TEXTURE_SIZE * 4 ),
			ACTIVE_NODES_TEXTURE_SIZE,
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

		this.tiles = tiles;
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

		const { tiles } = this;

		// resolve the metadata file url
		let metaUrl = new URL( tiles.rootURL, location.href ).href;
		tiles.invokeAllPlugins( plugin => {

			metaUrl = plugin.preprocessURL ? plugin.preprocessURL( metaUrl, null ) : metaUrl;

		} );

		// load the metadata and root hierarchy, routing requests through the other plugins
		const loader = new PotreeLoader();
		loader.fetchOptions = tiles.fetchOptions;
		loader.fetchData = ( url, options ) => {

			return tiles.invokeOnePlugin( plugin => plugin !== this && plugin.fetchData && plugin.fetchData( url, options ) );

		};

		await loader.load( metaUrl );
		this.loader = loader;

		// build the synthetic tileset
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

		if ( ! /\.potree$/.test( String( uri ) ) ) {

			return null;

		}

		return this.loader.loadNodeData( keyFromUri( uri ), options );

	}

	parseToMesh( buffer, tile, extension, uri ) {

		if ( extension !== 'potree' ) {

			return null;

		}

		// parse the points and size them in world units to the point spacing of the node's own
		// level, which the vertex shader halves for every active level below the node at each
		// point's position
		const key = keyFromUri( uri );
		const [ tileMin, tileMax ] = boxToMinMax( tile.boundingVolume.box );
		const { geometry, center } = this.loader.parsePointData( buffer, key, tileMin, tileMax );

		const spacing = tile.geometricError;
		const material = new PotreePointsMaterial( {
			vertexColors: Boolean( geometry.attributes.color ),
			size: spacing * SPACING_COVERAGE_FACTOR * this._pointScale,
			pointShape: this._pointShape,
			minPointSize: this.minPointSize,
			debugNodeColors: this._debugNodeColors,
		} );
		material.userData.spacing = spacing;
		material.uniforms.uActiveNodes.value = this._activeNodesTexture;
		material.uniforms.uNodeSize.value = tileMax[ 0 ] - tileMin[ 0 ];
		material.uniforms.uNodeMinOffset.value.copy( center ).sub( new Vector3( ...tileMin ) );

		// offset the points by the node center so vertex positions stay near the origin
		const points = new Points( geometry, material );
		points.position.copy( center );
		points.updateMatrix();

		this._expandChildren( tile, key );
		this._activeSetDirty = true;
		return points;

	}

	disposeTile( tile ) {

		if ( ! tile.content?.uri || ! /\.potree$/.test( tile.content.uri ) ) {

			return;

		}

		const { processNodeQueue } = this.tiles;
		for ( let i = 0, l = tile.children.length; i < l; i ++ ) {

			processNodeQueue.remove( tile.children[ i ] );

		}

		tile.children.length = 0;
		this._activeSetDirty = true;

	}

	// Tile expansion

	// Lazily attach child tiles based on the hierarchy child mask once a node's content has
	// been parsed
	_expandChildren( tile, key ) {

		const { hierarchy } = this.loader;
		const node = hierarchy.get( key );

		if ( ! node || node.childMask === 0 ) {

			return;

		}

		const [ parentMin, parentMax ] = boxToMinMax( tile.boundingVolume.box );
		const childError = tile.geometricError / 2;

		for ( let octant = 0; octant < 8; octant ++ ) {

			const childKey = key + octant;
			if ( ! ( node.childMask & ( 1 << octant ) ) || ! hierarchy.has( childKey ) ) {

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

	// Encode the loaded tile hierarchy into the nodes texture: the loaded tiles sorted by level
	// then key, each texel holding the octant mask of the tile's loaded children (r), the offset
	// from its texel to the first of them (g, b), and whether the tile itself is active (a).
	// Sorting keeps every tile's children consecutive and in octant order, which the shader's
	// walk relies on. Each tile's active flag comes only from its own state, since with additive
	// refinement any subset of a node's descendants can be active at once.
	_updateActiveNodesTexture() {

		const { tiles } = this;
		const { activeTiles } = tiles;

		// collect the loaded tiles sorted by level then key
		const keys = new Map();
		tiles.forEachLoadedModel( ( scene, tile ) => {

			const uri = tile.content && tile.content.uri;
			if ( uri && /\.potree$/.test( uri ) ) {

				keys.set( tile, keyFromUri( uri ) );

			}

		} );

		const list = [ ...keys.keys() ].sort( ( a, b ) => {

			const ka = keys.get( a );
			const kb = keys.get( b );
			if ( ka.length !== kb.length ) return ka.length - kb.length;
			return ka < kb ? - 1 : 1;

		} );

		// the last texel is reserved as an always empty entry in case the list overflows
		list.length = Math.min( list.length, ACTIVE_NODES_TEXTURE_SIZE - 1 );

		// encode each tile's active flag and its link into its parent's mask and child offset
		const texture = this._activeNodesTexture;
		const data = texture.image.data;
		data.fill( 0 );

		const indices = new Map();
		const indexByKey = new Map();
		const firstChildOffsets = new Map();
		for ( let i = 0, l = list.length; i < l; i ++ ) {

			const tile = list[ i ];
			const key = keys.get( tile );
			indices.set( tile, i );
			indexByKey.set( key, i );
			data[ i * 4 + 3 ] = activeTiles.has( tile ) ? 255 : 0;

			if ( key.length > 1 ) {

				const parentIndex = indexByKey.get( key.slice( 0, - 1 ) );
				if ( parentIndex !== undefined ) {

					// the key's last digit is the tile's octant within its parent
					const octant = parseInt( key.charAt( key.length - 1 ) );
					const offset = Math.min( firstChildOffsets.get( parentIndex ) ?? Infinity, i - parentIndex );
					firstChildOffsets.set( parentIndex, offset );

					data[ parentIndex * 4 ] |= 1 << octant;
					data[ parentIndex * 4 + 1 ] = offset >> 8;
					data[ parentIndex * 4 + 2 ] = offset & 0xff;

				}

			}

		}

		texture.needsUpdate = true;

		// Point every loaded tile's material at its texel, or at the reserved empty texel when
		// the list overflowed so a stale index can never be sampled.
		tiles.forEachLoadedModel( ( scene, tile ) => {

			const index = indices.get( tile ) ?? ACTIVE_NODES_TEXTURE_SIZE - 1;
			scene.traverse( c => {

				if ( c.isPoints ) {

					c.material.uniforms.uVNStart.value = index;

				}

			} );

		} );

	}

	// Refresh the material sizes of the loaded tiles for the current point scale
	_updatePointScales() {

		const { tiles } = this;
		if ( ! tiles ) {

			return;

		}

		tiles.forEachLoadedModel( scene => {

			scene.traverse( c => {

				if ( c.isPoints ) {

					c.material.size = c.material.userData.spacing * SPACING_COVERAGE_FACTOR * this._pointScale;

				}

			} );

		} );

	}

	// Push the current point shape and debug settings onto the loaded materials, which recompile
	// themselves on change
	_updateMaterialSettings() {

		const { tiles } = this;
		if ( ! tiles ) {

			return;

		}

		tiles.forEachLoadedModel( scene => {

			scene.traverse( c => {

				if ( c.isPoints ) {

					c.material.pointShape = this._pointShape;
					c.material.debugNodeColors = this._debugNodeColors;

				}

			} );

		} );

	}

}
