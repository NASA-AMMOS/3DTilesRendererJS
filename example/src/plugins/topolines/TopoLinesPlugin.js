import { wrapTopoLineMaterial } from './TopoLineMaterialMixin.js';

export class TopoLinesPlugin {

	constructor() {

		this.name = 'TOPO_LINES_CONSTRUCTOR';

	}

	init( tiles ) {

		tiles.addEventListener( 'load-model', ( { scene } ) => {

			scene.traverse( c => {

				if ( c.material ) {

					const params = wrapTopoLineMaterial( c.material, c.material.onBeforeCompile );
					params.ellipsoid.value.copy( tiles.ellipsoid.radius );
					params.frame.value.copy( tiles.group.matrixWorld );

				}

			} );

		} );

	}

}