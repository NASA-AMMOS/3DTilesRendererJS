import { Box3, Sphere, Matrix4 } from 'three';
import { Ellipsoid } from './Ellipsoid';

export class EllipsoidRegion extends Ellipsoid {

	latStart: number;
	latEnd: number;
	lonStart: number;
	lonEnd: number;
	heightStart: number;
	heightEnd: number;

	constructor(
		x: number, y: number, z: number,
		latStart: number, latEnd: number,
		lonStart: number, lonEnd: number,
		heightStart: number, heightEnd: number
	);

	getBoundingBox( box : Box3, matrix : Matrix4 );
	getBoundingSphere( sphere : Sphere );

}
