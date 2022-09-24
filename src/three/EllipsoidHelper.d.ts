import { Mesh } from 'three';
import { EllipsoidRegion } from '../math/EllipsoidRegion';
export class EllipsoidHelper extends Mesh {

	constructor( ellipsoidRegion : EllipsoidRegion );
	update() : void;
	dispose() : void;

}
