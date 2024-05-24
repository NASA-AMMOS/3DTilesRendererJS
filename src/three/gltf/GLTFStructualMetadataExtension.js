
// https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata

const EXT_NAME = 'EXT_structural_metadata';
export class GLTFStructuralMetadataExtension {

	constructor( parser ) {

		this.parser = parser;
		this.name = EXT_NAME;

	}

	async afterRoot( { scene, parser } ) {

		const extensions = parser.json.extensions;
		const rootExtension = extensions && extensions[ EXT_NAME ];
		if ( ! rootExtension ) {

			return;

		}

		console.log( rootExtension )

		// scene.traverse( c => {

		// 	if ( parser.associations.has( c ) ) {

		// 		// check if this object has extension references
		// 		const { meshes, primitives } = parser.associations.get( c );
		// 		const primitive = parser.json.meshes[ meshes ].primitives[ primitives ];
		// 		if ( primitive.extensions && primitive.extensions[ EXT_NAME ] ) {

		// 			const ext = primitive.extensions[ EXT_NAME ];


		// 		}

		// 	}

		// } );

	}

}
