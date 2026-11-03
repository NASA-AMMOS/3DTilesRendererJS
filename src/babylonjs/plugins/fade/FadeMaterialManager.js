import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MultiMaterial } from '@babylonjs/core/Materials/multiMaterial';
import { PBRBaseMaterial } from '@babylonjs/core/Materials/PBR/pbrBaseMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import * as Materials from '@babylonjs/core/Materials/index.js';

const PLUGIN_OWNERS = new WeakMap();

export function getDitheredTileFadeMaterialPlugin( materials = Materials ) {

	const plugin = materials[ 'DitheredTileFadeMaterialPlugin' ];
	const prototype = plugin?.prototype;
	if (
		typeof plugin?.GetOrCreate !== 'function' ||
		typeof prototype?.getFadeBoundsToRef !== 'function' ||
		typeof prototype?.setFadeBounds !== 'function' ||
		typeof prototype?.resetFade !== 'function'
	) {

		return null;

	}

	return plugin;

}

function getRenderableMeshes( root ) {

	const meshes = root instanceof Mesh || root.getClassName() === 'InstancedMesh' ? [ root ] : [];
	return meshes.concat( root.getChildMeshes( false ) );

}

function getLeafMaterials( mesh ) {

	const material = mesh.material || mesh.getScene().defaultMaterial;
	if ( material instanceof MultiMaterial ) {

		const materials = mesh.subMeshes.map( subMesh => material.getSubMaterial( subMesh.materialIndex ) );
		return [ ...new Set( materials.filter( Boolean ) ) ];

	}

	return material ? [ material ] : [];

}

function getUnsupportedReason( mesh, materials ) {

	if ( mesh.getClassName() === 'InstancedMesh' || mesh.hasThinInstances || mesh.instances?.length ) {

		return `Mesh "${ mesh.name }" uses unsupported Babylon instances.`;

	}

	for ( const material of materials ) {

		if ( ! ( material instanceof StandardMaterial || material instanceof PBRBaseMaterial ) ) {

			return `Mesh "${ mesh.name }" uses unsupported material "${ material.name }" (${ material.getClassName() }).`;

		}

		if ( material.alpha < 1 || material.needAlphaBlendingForMesh( mesh ) ) {

			return `Mesh "${ mesh.name }" uses alpha blending, but tile fading currently supports opaque materials only.`;

		}

	}

}

export class FadeMaterialManager {

	constructor( ditheredTileFadeMaterialPlugin = getDitheredTileFadeMaterialPlugin() ) {

		this._scenes = new Map();
		this._ditheredTileFadeMaterialPlugin = ditheredTileFadeMaterialPlugin;

	}

	get supported() {

		return this._ditheredTileFadeMaterialPlugin !== null;

	}

	isSceneSupported( scene ) {

		return this._scenes.get( scene )?.length > 0;

	}

	prepareScene( scene ) {

		if ( ! scene || this._scenes.has( scene ) ) {

			return;

		}

		const candidates = [];
		for ( const mesh of getRenderableMeshes( scene ) ) {

			if ( mesh.getTotalVertices() === 0 ) {

				continue;

			}

			const materials = getLeafMaterials( mesh );
			if ( materials.length === 0 ) {

				continue;

			}

			const reason = getUnsupportedReason( mesh, materials );
			if ( reason ) {

				console.warn( `TilesFadePlugin: ${ reason } This tile will render normally without fading.` );
				this._scenes.set( scene, [] );
				return;

			}

			candidates.push( { mesh, materials } );

		}

		const records = [];
		for ( const { mesh, materials } of candidates ) {

			for ( const material of materials ) {

				const plugin = this._ditheredTileFadeMaterialPlugin.GetOrCreate( material );
				const previousBounds = { lowerBound: 0, upperBound: 1 };
				const hadPreviousBounds = plugin.getFadeBoundsToRef( mesh, previousBounds );

				let pluginOwners = PLUGIN_OWNERS.get( plugin );
				if ( ! pluginOwners ) {

					pluginOwners = {
						count: 0,
						wasEnabled: plugin.isEnabled,
					};
					PLUGIN_OWNERS.set( plugin, pluginOwners );
					plugin.isEnabled = true;

				}

				pluginOwners.count ++;
				records.push( {
					mesh,
					plugin,
					hadPreviousBounds,
					previousBounds,
				} );

			}

		}

		this._scenes.set( scene, records );

	}

	setFade( scene, fadeIn, fadeOut ) {

		const records = this._scenes.get( scene );
		if ( ! records ) {

			return;

		}

		for ( const { mesh, plugin } of records ) {

			plugin.setFadeBounds( mesh, fadeOut, fadeIn );

		}

	}

	resetScene( scene ) {

		const records = this._scenes.get( scene );
		if ( ! records ) {

			return;

		}

		for ( const { mesh, plugin } of records ) {

			plugin.resetFade( mesh );

		}

	}

	deleteScene( scene ) {

		const records = this._scenes.get( scene );
		if ( ! records ) {

			return;

		}

		this._scenes.delete( scene );
		for ( const { mesh, plugin, hadPreviousBounds, previousBounds } of records ) {

			if ( hadPreviousBounds ) {

				plugin.setFadeBounds( mesh, previousBounds.lowerBound, previousBounds.upperBound );

			} else {

				plugin.resetFade( mesh );

			}

			const pluginOwners = PLUGIN_OWNERS.get( plugin );
			pluginOwners.count --;
			if ( pluginOwners.count === 0 ) {

				plugin.isEnabled = pluginOwners.wasEnabled;
				PLUGIN_OWNERS.delete( plugin );

			}

		}

	}

	dispose() {

		for ( const scene of [ ...this._scenes.keys() ] ) {

			this.deleteScene( scene );

		}

	}

}
