import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MultiMaterial } from '@babylonjs/core/Materials/multiMaterial';
import { PBRBaseMaterial } from '@babylonjs/core/Materials/PBR/pbrBaseMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DitheredTileFadeMaterialPlugin } from '@babylonjs/core/Materials/ditheredTileFadeMaterialPlugin';

const MESH_OWNERS = new WeakMap();
const PLUGIN_OWNERS = new WeakMap();

function getRenderableMeshes( root ) {

	const meshes = root instanceof Mesh ? [ root ] : [];
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

function validateMesh( mesh, materials ) {

	if ( mesh.getClassName() === 'InstancedMesh' || mesh.hasThinInstances || mesh.instances?.length ) {

		throw new Error( `TilesFadePlugin: Mesh "${ mesh.name }" uses unsupported Babylon instances.` );

	}

	for ( const material of materials ) {

		if ( ! ( material instanceof StandardMaterial || material instanceof PBRBaseMaterial ) ) {

			throw new Error( `TilesFadePlugin: Mesh "${ mesh.name }" uses unsupported material "${ material.name }" (${ material.getClassName() }).` );

		}

		if ( material.alpha < 1 || material.needAlphaBlendingForMesh( mesh ) ) {

			throw new Error( `TilesFadePlugin: Mesh "${ mesh.name }" uses alpha blending, but tile fading currently supports opaque materials only.` );

		}

	}

}

export class FadeMaterialManager {

	constructor() {

		this._scenes = new Map();

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

			validateMesh( mesh, materials );
			const owner = MESH_OWNERS.get( mesh );
			if ( owner && owner !== this ) {

				throw new Error( `TilesFadePlugin: Mesh "${ mesh.name }" is already controlled by another fade manager.` );

			}

			candidates.push( { mesh, materials } );

		}

		const records = [];
		for ( const { mesh, materials } of candidates ) {

			MESH_OWNERS.set( mesh, this );
			for ( const material of materials ) {

				const plugin = DitheredTileFadeMaterialPlugin.GetOrCreate( material );
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

			MESH_OWNERS.delete( mesh );

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
