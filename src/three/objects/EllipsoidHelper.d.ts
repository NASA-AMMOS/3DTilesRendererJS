import { LineSegments, Mesh, Color } from 'three';
import { EllipsoidRegion } from '../math/EllipsoidRegion';

export class EllipsoidLineHelper extends LineSegments {

	constructor( ellipsoidRegion : EllipsoidRegion );
	update() : void;
	dispose() : void;

}

export class EllipsoidHelper extends Mesh {

	constructor( ellipsoidRegion : EllipsoidRegion, color : Color | number | string );
	update() : void;
	dispose() : void;

}
