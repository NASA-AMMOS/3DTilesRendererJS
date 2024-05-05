import { MeshFeatures } from './MeshFeatures.js';

const EXT_NAME = 'EXT_mesh_features';

// https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_mesh_features
export class GLTFMeshFeaturesExtension {

	constructor( parser ) {

		this.parser = parser;
		this.name = EXT_NAME;

	}

	async afterRoot( { scene, parser } ) {

		const textureCount = parser.json.textures?.length || 0;
		const textures = new Array( textureCount ).fill( null );
		const promises = new Array( textureCount ).fill( null );

		scene.traverse( c => {

			if ( parser.associations.has( c ) ) {

				const { meshes, primitives } = parser.associations.get( c );
				const { extensions } = parser.json.meshes[ meshes ].primitives[ primitives ];
				if ( extensions[ EXT_NAME ] ) {

					const ext = extensions[ EXT_NAME ];
					const { featureIds } = ext;
					featureIds.forEach( info => {

						if ( info.texture && promises[ info.texture.index ] === null ) {

							const index = info.texture.index;
							promises[ index ] = parser
								.loadTexture( index )
								.then( tex => textures[ index ] = tex );

						}

					} );

					c.userData.meshFeatures = new MeshFeatures( c.geometry, textures, ext );

				}

			}

		} );

		await Promise.all( promises );

	}

}
