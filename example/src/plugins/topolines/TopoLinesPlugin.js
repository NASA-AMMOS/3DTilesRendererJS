import { wrapTopoLineMaterial } from "./TopoLineMaterialMixin";

export class TopoLinesPlugin {

	constructor() {

		this.name = 'TOPO_LINES_CONSTRUCTOR';

	}

	init( tiles ) {

		tiles.addEventListener( 'load-model', ( { scene } ) => {

			scene.traverse( c => {

				if ( c.material ) {

					wrapTopoLineMaterial( c.material, c.material.onBeforeCompile );

				}

			} );

		} );

	}

}