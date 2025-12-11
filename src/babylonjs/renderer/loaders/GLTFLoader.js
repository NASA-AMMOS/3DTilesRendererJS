import { LoaderBase } from '3d-tiles-renderer/core';
import { Matrix, Quaternion, ImportMeshAsync } from '@babylonjs/core';
import "@babylonjs/loaders/glTF/2.0";

// GLB magic bytes: "glTF" in ASCII (0x67, 0x6C, 0x54, 0x46)
const GLB_MAGIC = 0x46546C67;
const _worldMatrix = /* @__PURE__ */ Matrix.Identity();

export class GLTFLoader extends LoaderBase {

	constructor( scene ) {

		super();
		this.scene = scene;
		this.adjustmentTransform = Matrix.Identity();

	}

	/**
	 * Detect if buffer contains GLB binary data by checking magic bytes
	 * @param {ArrayBuffer|Uint8Array} buffer - The file buffer
	 * @returns {boolean} True if GLB format
	 */
	isGLB( buffer ) {

		// Handle both ArrayBuffer and typed arrays (e.g., Uint8Array)
		const arrayBuffer = buffer instanceof ArrayBuffer ? buffer : buffer.buffer;
		const byteOffset = buffer instanceof ArrayBuffer ? 0 : buffer.byteOffset;
		const byteLength = buffer.byteLength;

		if ( byteLength < 4 ) {

			return false;

		}

		const view = new DataView( arrayBuffer, byteOffset, byteLength );
		const magic = view.getUint32( 0, true ); // little-endian
		return magic === GLB_MAGIC;

	}

	/**
	 * Detect file extension from URI or buffer content
	 * @param {ArrayBuffer} buffer - The file buffer  
	 * @param {string} uri - The file URI
	 * @returns {string} '.glb' or '.gltf'
	 */
	detectExtension( buffer, uri ) {

		// First check magic bytes in buffer (most reliable)
		if ( this.isGLB( buffer ) ) {

			return '.glb';

		}

		// Fallback to URI extension
		const lowerUri = uri.toLowerCase();
		if ( lowerUri.endsWith( '.glb' ) ) {

			return '.glb';

		}

		// Default to gltf
		return '.gltf';
	}

	async parse( buffer, uri ) {

		const { scene, workingPath, adjustmentTransform } = this;

		// ensure working path ends in a slash for proper resource resolution
		let rootUrl = workingPath;
		if ( rootUrl.length && ! /[\\/]$/.test( rootUrl ) ) {

			rootUrl += '/';

		}

		// Detect format from buffer magic bytes or URI extension
		const pluginExtension = this.detectExtension( buffer, uri );
		// Use unique filename to prevent texture caching issues
		const container = await ImportMeshAsync(
			new File( [ buffer ], uri ),
			scene,
			{ pluginExtension }
		);

		// retrieve the primary scene
		const root = container.meshes[ 0 ];

		// ensure rotationQuaternion is initialized so we can decompose the matrix
		root.rotationQuaternion = Quaternion.Identity();

		// adjust the transform the model by the necessary rotation correction
		const worldMatrix = root.computeWorldMatrix( true );
		adjustmentTransform.multiplyToRef( worldMatrix, _worldMatrix );
		_worldMatrix.decompose( root.scaling, root.rotationQuaternion, root.position );

		return {
			scene: root,
			container,
		};

	}

}
