import {
	BufferAttribute,
	BufferGeometry,
	Color,
	DataTexture,
	FloatType,
	Group,
	Mesh,
	MeshBasicMaterial,
	NearestFilter,
	Points,
	RedFormat,
	RGBAIntegerFormat,
	ShaderMaterial,
	Sphere,
	UnsignedByteType,
	Vector2,
	Vector3,
	WebGLRenderTarget,
} from 'three';
import { PotreeLoader, getChildBounds } from './PotreeLoader.js';
import { PotreePointsMaterial, NODES_TEXTURE_WIDTH } from './PotreePointsMaterial.js';

// Points are drawn larger than the point spacing to cover the gaps between them - potree uses
// the same factor
const SPACING_COVERAGE_FACTOR = 1.7;

const _vec2 = /* @__PURE__ */ new Vector2();
const _color = /* @__PURE__ */ new Color();
const _sphere = /* @__PURE__ */ new Sphere();

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
// bytes directly rather than converting them back from normalized floats.
function createNodesTexture( height ) {

	const texture = new DataTexture(
		new Uint8Array( NODES_TEXTURE_WIDTH * height * 4 ),
		NODES_TEXTURE_WIDTH,
		height,
		RGBAIntegerFormat,
		UnsignedByteType,
	);
	texture.internalFormat = 'RGBA8UI';
	texture.minFilter = NearestFilter;
	texture.magFilter = NearestFilter;
	return texture;

}

// Draws nothing, but is rendered so that its "onBeforeRender" fires with the renderer and camera
// currently drawing. That is the only place both are known, and it runs before the points because
// of the render order.
function createRenderHook( onBeforeRender ) {

	const geometry = new BufferGeometry();
	geometry.setDrawRange( 0, 0 );

	const mesh = new Mesh( geometry, new MeshBasicMaterial( { colorWrite: false, depthWrite: false } ) );
	mesh.frustumCulled = false;
	mesh.renderOrder = - Infinity;
	mesh.onBeforeRender = onBeforeRender;
	return mesh;

}

// Draws the eye dome lighting depth target over the frame so the log depth the pre-pass wrote
// can be inspected directly. A clip space triangle drawn after everything else.
function createDepthDebugMesh() {

	const geometry = new BufferGeometry();
	geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( [ - 1, - 1, 0, 3, - 1, 0, - 1, 3, 0 ] ), 3 ) );

	const material = new ShaderMaterial( {
		uniforms: {
			uEdlTexture: { value: null },
			uDepthRange: { value: new Vector2( 0, 1 ) },
		},
		depthTest: false,
		depthWrite: false,
		vertexShader: /* glsl */`
			varying vec2 vUv;

			void main() {

				vUv = position.xy * 0.5 + 0.5;
				gl_Position = vec4( position.xy, 0.0, 1.0 );

			}
		`,
		fragmentShader: /* glsl */`
			uniform sampler2D uEdlTexture;
			uniform vec2 uDepthRange;

			varying vec2 vUv;

			void main() {

				float logDepth = texture2D( uEdlTexture, vUv ).r;

				// zero means the pre-pass drew nothing here
				if ( logDepth == 0.0 ) {

					gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
					return;

				}

				// undo the log so the buffer reads as a normal near-is-bright depth image
				float depth = exp2( logDepth );
				float value = ( depth - uDepthRange.x ) / ( uDepthRange.y - uDepthRange.x );
				gl_FragColor = vec4( vec3( 1.0 - clamp( value, 0.0, 1.0 ) ), 1.0 );

			}
		`,
	} );

	const mesh = new Mesh( geometry, material );
	mesh.frustumCulled = false;
	mesh.renderOrder = Infinity;
	mesh.visible = false;
	return mesh;

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

	get edlStrength() {

		return this._edlStrength;

	}

	set edlStrength( value ) {

		if ( value !== this._edlStrength ) {

			const wasEnabled = this._edlStrength > 0;
			this._edlStrength = value;
			if ( wasEnabled !== value > 0 ) this._updateMaterials();
			this._updateDepthDebug();

		}

	}

	get edlRadius() {

		return this._edlRadius;

	}

	set edlRadius( value ) {

		this._edlRadius = value;

	}

	get debugDepth() {

		return this._debugDepth;

	}

	set debugDepth( value ) {

		if ( value !== this._debugDepth ) {

			this._debugDepth = value;
			this._updateDepthDebug();

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
			edlStrength = 0,
			edlRadius = 1.4,
			debugDepth = false,
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
		this._edlStrength = edlStrength;
		this._edlRadius = edlRadius;

		// Eye dome lighting renders the points to a depth target first so each point can compare
		// itself against its neighbours while it rasterizes. The hook mesh exists purely to learn
		// which renderer and camera are drawing.
		// Single channel float: the pass stores only a log depth, and full float precision keeps
		// the quantization steps from banding the shading when zoomed out.
		this._edlTarget = new WebGLRenderTarget( 1, 1, {
			format: RedFormat,
			type: FloatType,
			minFilter: NearestFilter,
			magFilter: NearestFilter,
		} );
		this._edlGroup = new Group();
		this._edlGroup.matrixWorldAutoUpdate = false;
		this._edlHook = createRenderHook( ( renderer, scene, camera ) => this._renderDepthPass( renderer, camera ) );

		this._debugDepth = debugDepth;
		this._depthDebugMesh = createDepthDebugMesh();

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
		tiles.group.add( this._edlHook );
		tiles.group.add( this._depthDebugMesh );
		tiles.addEventListener( 'update-after', this._onUpdateAfter );
		this._updateDepthDebug();

	}

	dispose() {

		this.tiles.removeEventListener( 'update-after', this._onUpdateAfter );
		this._activeNodesTexture.dispose();

		this._edlHook.removeFromParent();
		this._edlHook.geometry.dispose();
		this._edlHook.material.dispose();
		this._edlTarget.dispose();

		this._depthDebugMesh.removeFromParent();
		this._depthDebugMesh.geometry.dispose();
		this._depthDebugMesh.material.dispose();

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
		material.uniforms.uTileId.value = idFromKey( key );
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
			texture = createNodesTexture( height );
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

			// byte 3: potree's lod offset, which shifts the point size by the node's measured
			// density. 100 is its "no offset" encoding, which is all we have to report since we
			// do not measure density.
			data[ i * 4 + 3 ] = 100;

			if ( i === 0 ) {

				continue;

			}

			const parentKey = key.slice( 0, - 1 );
			const parentIndex = indexByKey.get( parentKey );

			// byte 0: child occupancy bit mask
			// byte 1 & 2: split

			// siblings are consecutive so the first one encountered sets the child offset
			if ( data[ parentIndex * 4 ] === 0 ) {

				const offset = i - parentIndex;
				data[ parentIndex * 4 + 1 ] = offset >> 8;
				data[ parentIndex * 4 + 2 ] = offset & 0xff;

			}

			// the key's last digit is the tile's octant within its parent
			const octant = parseInt( key.charAt( key.length - 1 ) );
			data[ parentIndex * 4 ] |= 1 << octant;

		}

		texture.needsUpdate = true;

	}

	// Renders the loaded points into the depth target so the main pass can read each point's
	// neighbourhood. Called from the hook mesh, which is the only place the active renderer and
	// camera are known.
	_renderDepthPass( renderer, camera ) {

		if ( this._edlStrength <= 0 ) {

			return;

		}

		const target = this._edlTarget;
		renderer.getDrawingBufferSize( _vec2 );
		if ( target.width !== _vec2.x || target.height !== _vec2.y ) {

			target.setSize( _vec2.x, _vec2.y );

		}

		// Gather the points without reparenting them. Their world matrices are already up to date
		// from the render in progress, so the group must not recompute them. Only what is actually
		// drawn is gathered - depth from a node the main pass skips would make the points in front
		// of it compare against a surface that is not there and darken for no reason.
		const children = this._edlGroup.children;
		children.length = 0;
		this.tiles.group.traverseVisible( child => {

			if ( ! child.isPoints ) {

				return;

			}

			children.push( child );

			// The target cannot stay bound as a texture while it is being drawn into or the draw
			// is dropped as a feedback loop, so it is unbound for the duration of the pass.
			const { uniforms } = child.material;
			uniforms.uEdlTexture.value = null;
			uniforms.uEdlDepthPass.value = true;

		} );

		const previousTarget = renderer.getRenderTarget();
		renderer.getClearColor( _color );
		const previousAlpha = renderer.getClearAlpha();

		renderer.setRenderTarget( target );
		renderer.setClearColor( 0x000000, 0 );
		renderer.clear();
		renderer.render( this._edlGroup, camera );

		renderer.setRenderTarget( previousTarget );
		renderer.setClearColor( _color, previousAlpha );

		children.forEach( scene => {

			const { uniforms } = scene.material;
			uniforms.uEdlTexture.value = target.texture;
			uniforms.uEdlResolution.value.set( target.width, target.height );
			uniforms.uEdlStrength.value = this._edlStrength;
			uniforms.uEdlRadius.value = this._edlRadius;
			uniforms.uEdlDepthPass.value = false;

		} );

		children.length = 0;

		// map the log depth across the span the tile set actually occupies so the debug view
		// keeps its contrast as the camera moves
		if ( this._debugDepth && this.tiles.getBoundingSphere( _sphere ) ) {

			const distance = camera.position.distanceTo( _sphere.center );
			const uniforms = this._depthDebugMesh.material.uniforms;
			uniforms.uEdlTexture.value = target.texture;
			uniforms.uDepthRange.value.set(
				Math.max( camera.near, distance - _sphere.radius ),
				Math.max( camera.near * 2, distance + _sphere.radius ),
			);

		}

	}

	// The debug view reads the pre-pass target, so it is only meaningful while that pass runs
	_updateDepthDebug() {

		this._depthDebugMesh.visible = this._debugDepth && this._edlStrength > 0;

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
			material.edl = this._edlStrength > 0;

		} );

	}

}
