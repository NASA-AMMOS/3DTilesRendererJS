import {
	BufferGeometry,
	Color,
	FloatType,
	Group,
	Mesh,
	MeshBasicMaterial,
	NearestFilter,
	RedFormat,
	Vector2,
	WebGLRenderTarget,
} from 'three';

// TODO:
// - Run the edl depth pre-pass at a lower resolution. Three sizes points from the canvas, not the
//   bound render target, so the sprites need scaling to match.
// - Render color and depth in one pass and composite with a full screen quad, the way potree does,
//   to rasterize the points once instead of twice.

const _vec2 = /* @__PURE__ */ new Vector2();
const _color = /* @__PURE__ */ new Color();

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

/**
 * Plugin that applies point cloud display settings and eye dome lighting to any loaded tile
 * content drawn with a PointCloudMaterial. Eye dome lighting renders the points to a depth
 * target first so each point can compare itself against its neighbours as it rasterizes.
 *
 * All the options below can be adjusted after construction.
 * @param {Object} [options]
 * @param {('square'|'round'|'sphere')} [options.pointShape='round'] Shape of the point sprites.
 * @param {number} [options.minPointSize=2] Smallest point size in pixels.
 * @param {number} [options.edlStrength=0] Eye dome lighting falloff rate. Zero disables the effect and skips its depth pre-pass.
 * @param {number} [options.edlRadius=1.4] Radius of the eye dome lighting neighbour ring in css pixels, scaled by the renderer pixel ratio so the effect looks the same on every display.
 * @param {('none'|'node'|'depth'|'tile')} [options.debugColorMode='none'] Color points by the node they are sized by, that node's depth, or the tile they came from.
 */
export class PointCloudEffectsPlugin {

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
			edlStrength = 0,
			edlRadius = 1.4,
			debugColorMode = 'none',
		} = options;

		this.name = 'POINT_CLOUD_EFFECTS_PLUGIN';
		this.tiles = null;

		this._pointShape = pointShape;
		this._minPointSize = minPointSize;
		this._debugColorMode = debugColorMode;
		this._edlStrength = edlStrength;
		this._edlRadius = edlRadius;

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
		this._edlHook = createRenderHook( ( renderer, scene, camera ) => this._renderDepthPass( renderer, camera ) );

	}

	init( tiles ) {

		this.tiles = tiles;
		tiles.group.add( this._edlHook );

	}

	dispose() {

		this._edlHook.removeFromParent();
		this._edlHook.geometry.dispose();
		this._edlHook.material.dispose();
		this._edlTarget.dispose();

		this.tiles = null;

	}

	// apply the settings as soon as content is available so the first frame is correct
	processTileModel( scene ) {

		scene.traverse( child => {

			if ( child.material && child.material.isPointCloudMaterial ) {

				this._applyToMaterial( child.material );

			}

		} );

	}

	// Renders the visible points into the depth target so the main pass can read each point's
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

		// Gather what the main pass draws without reparenting it. The world matrices are already up
		// to date from the render in progress, so the group must not recompute them.
		const children = this._edlGroup.children;
		children.length = 0;
		this.tiles.group.traverseVisible( child => {

			if ( ! child.isPoints || ! child.material.isPointCloudMaterial ) {

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
			uniforms.uEdlRadius.value = this._edlRadius * renderer.getPixelRatio();
			uniforms.uEdlDepthPass.value = false;

		} );

		children.length = 0;

	}

	_applyToMaterial( material ) {

		material.pointShape = this._pointShape;
		material.minPointSize = this._minPointSize;
		material.debugColorMode = this._debugColorMode;
		material.edlStrength = this._edlStrength;

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
