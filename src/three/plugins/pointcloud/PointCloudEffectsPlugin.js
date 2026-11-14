import {
	BufferGeometry,
	Color,
	FloatType,
	Group,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	NearestFilter,
	RedFormat,
	Vector2,
	WebGLRenderTarget,
} from 'three';
import { PointCloudMaterial } from './PointCloudMaterial.js';
import {
	ActiveNodesTexture,
	SPACING_COVERAGE_FACTOR,
	idFromOctantPath,
	octantPathFromImplicitTile,
} from './ActiveNodesTexture.js';

// TODO:
// - Run the edl depth pre-pass at a lower resolution. Three sizes points from the canvas, not the
// bound render target, so the sprites need scaling to match.
// - Render color and depth in one pass and composite with a full screen quad, the way potree does,
// to rasterize the points once instead of twice.
// - The "sphere" projection points can be clipped at the edges due to an incorrectly projected
// sprite scale that doesn't fully capture the sphere bounds.

const _vec2 = /* @__PURE__ */ new Vector2();
const _color = /* @__PURE__ */ new Color();
const _matrix = /* @__PURE__ */ new Matrix4();

// Draws nothing. Its "onBeforeRender" is the only place the active renderer and camera are both
// known, and the render order runs it before the points.
class RenderHook extends Mesh {

	constructor( onBeforeRender ) {

		const geometry = new BufferGeometry();
		geometry.setDrawRange( 0, 0 );

		super( geometry, new MeshBasicMaterial( { colorWrite: false, depthWrite: false } ) );

		this.frustumCulled = false;
		this.renderOrder = - Infinity;
		this.onBeforeRender = onBeforeRender;

	}

	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}

/**
 * Plugin that applies display settings and eye dome lighting to loaded point content. Eye dome
 * lighting renders the points to a depth target first so each point can compare itself against
 * its neighbors as it rasterizes, shading silhouettes and creases.
 *
 * Points of implicit ADD octree tilesets can also be sized by the deepest active tile at their
 * position rather than by the tile they came from, as potree does, so a parent tile's points do
 * not stay large over its loaded children. The root tile's geometric error is taken as its point
 * spacing, halving per level, and its bounding volume must be a box.
 *
 * All the options below can be adjusted after construction.
 * @param {Object} [options]
 * @param {('square'|'round'|'sphere')} [options.pointShape='round'] Shape of the point sprites.
 * @param {number} [options.minPointSize=2] Smallest point size in pixels.
 * @param {number} [options.maxPointSize=50] Largest projected size in pixels of an attenuated point. Zero disables the cap.
 * @param {number} [options.edlStrength=0] Eye dome lighting falloff rate. Zero disables the effect and skips its depth pre-pass.
 * @param {number} [options.edlRadius=1.4] Radius of the eye dome lighting neighbor ring in css pixels, scaled by the renderer pixel ratio so the effect looks the same on every display.
 * @param {('none'|'node'|'depth'|'tile')} [options.debugColorMode='none'] Color points by the node they are sized by, that node's depth, or the tile they came from.
 * @param {boolean} [options.adaptivePointSize=false] Size the points of implicit ADD octree tilesets by the deepest active tile at their position.
 * @param {number} [options.pointScale=1] Multiplier on the point spacing used for adaptive point sizes.
 */
export class PointCloudEffectsPlugin {

	get adaptivePointSize() {

		return this._adaptivePointSize;

	}

	set adaptivePointSize( value ) {

		if ( value !== this._adaptivePointSize ) {

			this._adaptivePointSize = value;
			this._updateMaterials();

		}

	}

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

	get maxPointSize() {

		return this._maxPointSize;

	}

	set maxPointSize( value ) {

		if ( value !== this._maxPointSize ) {

			this._maxPointSize = value;
			this._updateMaterials();

		}

	}

	get edlStrength() {

		return this._edlStrength;

	}

	set edlStrength( value ) {

		if ( value !== this._edlStrength ) {

			this._edlStrength = value;
			this._updateMaterials();

		}

	}

	get edlRadius() {

		return this._edlRadius;

	}

	// scaled by the pixel ratio and pushed onto the materials by the depth pass
	set edlRadius( value ) {

		this._edlRadius = value;

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
			pointShape = 'round',
			minPointSize = 2,
			maxPointSize = 50,
			edlStrength = 0,
			edlRadius = 1.4,
			debugColorMode = 'none',
			adaptivePointSize = false,
			pointScale = 1,
		} = options;

		this.name = 'POINT_CLOUD_EFFECTS_PLUGIN';
		this.tiles = null;

		this._pointShape = pointShape;
		this._minPointSize = minPointSize;
		this._maxPointSize = maxPointSize;
		this._debugColorMode = debugColorMode;
		this._edlStrength = edlStrength;
		this._edlRadius = edlRadius;
		this._adaptivePointSize = adaptivePointSize;
		this._pointScale = pointScale;

		// Active node hierarchy per octree root, read by the materials' lod walk, and the settings
		// of the implicit tile materials so adaptive sizing can be switched off again. Rebuilt after
		// any frame that changes the active tile set.
		this._activeNodes = new Map();
		this._octreeMaterials = new WeakMap();
		this._activeSetDirty = false;
		this._onUpdateAfter = () => {

			if ( this._activeSetDirty ) {

				this._activeSetDirty = false;
				this._updateActiveNodes();

			}

		};

		// The target holds only a log depth, so a single channel is enough, and full float keeps
		// quantization from banding the shading.
		this._edlTarget = new WebGLRenderTarget( 1, 1, {
			format: RedFormat,
			type: FloatType,
			minFilter: NearestFilter,
			magFilter: NearestFilter,
		} );
		this._edlGroup = new Group();
		this._edlGroup.matrixWorldAutoUpdate = false;
		this._edlHook = new RenderHook( ( renderer, scene, camera ) => this._renderDepthPass( renderer, camera ) );

	}

	init( tiles ) {

		this.tiles = tiles;
		tiles.group.add( this._edlHook );
		tiles.addEventListener( 'update-after', this._onUpdateAfter );

	}

	dispose() {

		this.tiles.removeEventListener( 'update-after', this._onUpdateAfter );
		this._activeNodes.forEach( nodes => nodes.dispose() );
		this._activeNodes.clear();

		this._edlHook.removeFromParent();
		this._edlHook.dispose();
		this._edlTarget.dispose();

		this.tiles = null;

	}

	setTileActive() {

		this._activeSetDirty = true;

	}

	disposeTile() {

		this._activeSetDirty = true;

	}

	processTileModel( scene, tile ) {

		// the scene is not parented yet, so its world matrices are relative to the tiles group
		const node = this._getOctreeNode( tile );
		if ( node ) {

			scene.updateMatrixWorld( true );

		}

		scene.traverse( child => {

			if ( ! child.isPoints ) {

				return;

			}

			// content that does not bring its own point cloud material is converted so the
			// display settings and eye dome lighting apply to it
			if ( ! child.material.isPointCloudMaterial ) {

				const previousMaterial = child.material;
				child.material = new PointCloudMaterial( {
					color: previousMaterial.color,
					vertexColors: previousMaterial.vertexColors,
					size: previousMaterial.size,
					sizeAttenuation: previousMaterial.sizeAttenuation,
					map: previousMaterial.map,
					transparent: previousMaterial.transparent,
					opacity: previousMaterial.opacity,
				} );

				previousMaterial.dispose();

			}

			// materials that already carry a hierarchy were set up by their loader
			if ( node && child.material.activeNodes === null ) {

				this._initOctreeMaterial( child, node );

			}

			this._applyToMaterial( child.material );

		} );

	}

	// Renders the visible points into the depth target so the main pass can read each point's
	// neighborhood.
	_renderDepthPass( renderer, camera ) {

		if ( this.edlStrength <= 0 ) {

			return;

		}

		const target = this._edlTarget;
		renderer.getDrawingBufferSize( _vec2 );
		if ( target.width !== _vec2.x || target.height !== _vec2.y ) {

			target.setSize( _vec2.x, _vec2.y );

		}

		// the world matrices are already up to date from the render in progress, so the group must
		// not recompute them
		const children = this._edlGroup.children;
		children.length = 0;
		this.tiles.group.traverseVisible( child => {

			if ( ! child.isPoints || ! child.material.isPointCloudMaterial ) {

				return;

			}

			children.push( child );

			// the target cannot stay bound as a texture while it is drawn into or the draw is
			// dropped as a feedback loop
			const { uniforms } = child.material;
			uniforms.uEdlTexture.value = null;
			uniforms.uEdlDepthPass.value = true;

		} );

		const previousTarget = renderer.getRenderTarget();
		const previousAlpha = renderer.getClearAlpha();
		renderer.getClearColor( _color );

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
			uniforms.uEdlRadius.value = this.edlRadius * renderer.getPixelRatio();
			uniforms.uEdlDepthPass.value = false;

		} );

		children.length = 0;

	}

	// Returns the octree a tile belongs to and its octant path in it, or null if the tile is not
	// part of an implicit ADD octree with a box bounding volume.
	_getOctreeNode( tile ) {

		const data = tile.implicitTilingData;
		if ( ! data ) {

			return null;

		}

		const { root } = data;
		if ( root.refine !== 'ADD' || root.implicitTiling.subdivisionScheme !== 'OCTREE' || ! root.boundingVolume.box ) {

			return null;

		}

		return { root, path: octantPathFromImplicitTile( data.level, data.x, data.y, data.z ) };

	}

	_getActiveNodes( root ) {

		if ( ! this._activeNodes.has( root ) ) {

			this._activeNodes.set( root, new ActiveNodesTexture() );

		}

		return this._activeNodes.get( root );

	}

	// Point the lod walk at the root box of the tile's octree. The box is mapped to a unit cube so
	// the walk halves every axis per level whatever the box proportions.
	_initOctreeMaterial( points, node ) {

		const { root, path } = node;
		const { material } = points;
		const [ cx, cy, cz, xx, xy, xz, yx, yy, yz, zx, zy, zz ] = root.boundingVolume.box;
		_matrix.set(
			2 * xx, 2 * yx, 2 * zx, cx - xx - yx - zx,
			2 * xy, 2 * yy, 2 * zy, cy - xy - yy - zy,
			2 * xz, 2 * yz, 2 * zz, cz - xz - yz - zz,
			0, 0, 0, 1,
		).premultiply( root.engineData.transform ).invert();

		const { uniforms } = material;
		uniforms.uNodeTransform.value.multiplyMatrices( _matrix, points.matrixWorld );
		uniforms.uNodeSize.value = 1;
		uniforms.uTileId.value = idFromOctantPath( path );

		this._octreeMaterials.set( material, {
			root,
			size: material.size,
			sizeAttenuation: material.sizeAttenuation,
		} );

	}

	// Encode the active tiles of every octree into its hierarchy texture
	_updateActiveNodes() {

		const { tiles } = this;
		const pathsByRoot = new Map();
		this._activeNodes.forEach( ( nodes, root ) => pathsByRoot.set( root, [] ) );
		tiles.activeTiles.forEach( tile => {

			const node = this._getOctreeNode( tile );
			if ( node ) {

				if ( ! pathsByRoot.has( node.root ) ) {

					pathsByRoot.set( node.root, [] );

				}

				pathsByRoot.get( node.root ).push( node.path );

			}

		} );

		const replaced = new Set();
		pathsByRoot.forEach( ( paths, root ) => {

			if ( this._getActiveNodes( root ).update( paths ) ) {

				replaced.add( root );

			}

		} );

		// a texture too small for the active set is replaced, so swap it on the materials using it
		if ( replaced.size !== 0 ) {

			tiles.forEachLoadedModel( ( scene, tile ) => {

				const node = this._getOctreeNode( tile );
				if ( ! node || ! replaced.has( node.root ) ) {

					return;

				}

				const { texture } = this._activeNodes.get( node.root );
				scene.traverse( child => {

					if ( child.material && child.material.isPointCloudMaterial && child.material.activeNodes !== null ) {

						child.material.activeNodes = texture;

					}

				} );

			} );

		}

	}

	_applyToMaterial( material ) {

		const octree = this._octreeMaterials.get( material );
		if ( octree ) {

			const { adaptivePointSize } = this;
			const sizeAttenuation = adaptivePointSize || octree.sizeAttenuation;
			material.activeNodes = adaptivePointSize ? this._getActiveNodes( octree.root ).texture : null;
			material.size = adaptivePointSize ? octree.root.geometricError * SPACING_COVERAGE_FACTOR * this.pointScale : octree.size;
			if ( material.sizeAttenuation !== sizeAttenuation ) {

				material.sizeAttenuation = sizeAttenuation;
				material.needsUpdate = true;

			}

		}

		material.pointShape = this.pointShape;
		material.minPointSize = this.minPointSize;
		material.maxPointSize = this.maxPointSize;
		material.debugColorMode = this.debugColorMode;
		material.edlStrength = this.edlStrength;

	}

	_updateMaterials() {

		if ( ! this.tiles ) {

			return;

		}

		this.tiles.forEachLoadedModel( scene => {

			scene.traverse( child => {

				if ( child.material && child.material.isPointCloudMaterial ) {

					this._applyToMaterial( child.material );

				}

			} );

		} );

	}

}
