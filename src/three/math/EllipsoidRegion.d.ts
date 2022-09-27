import { Box3, Sphere, Matrix4 } from 'three';
import { Ellipsoid } from './Ellipsoid';

export class EllipsoidRegion extends Ellipsoid {

	latStart: Number;
	latEnd: Number;
	lonStart: Number;
	lonEnd: Number;
	heightStart: Number;
	heightEnd: Number;

	constructor(
		x: Number, y: Number, z: Number,
		latStart: Number, latEnd: Number,
		lonStart: Number, lonEnd: Number,
		heightStart: Number, heightEnd: Number
	);

	getBoundingBox( box : Box3, matrix : Matrix4 );
	getBoundingSphere( sphere : Sphere );

}
