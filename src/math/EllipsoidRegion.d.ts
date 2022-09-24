import Matrix4 from 'cesium/Source/Core/Matrix4';
import { Box3 } from 'three';
import { Ellipsoid } from './Ellipsoid';

export class EllipsoidRegion extends Ellipsoid {

	latStart: Number;
	latEnd: Number;
	lonStart: Number;
	lonEnd: Number;
	heightStart: Number;
	heightEnd: Number;

	getBoundingBox( box : Box3, matrix : Matrix4 );
	getBoundingSphere( sphere : Sphere );

}
