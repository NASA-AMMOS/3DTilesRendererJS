import { Box3, Frustum, Matrix4, Ray, Sphere, Vector3 } from 'three';
import { OBB } from './OBB.js';
import { EllipsoidRegion } from './EllipsoidRegion.js';

export class TileBoundingVolume {

	sphere?: Sphere;
	obb?: OBB;
	region?: EllipsoidRegion;
	regionObb?: OBB;
	constructor();
	intersectsRay( ray: Ray ): boolean;
	intersectRay( ray: Ray, target?: Vector3 ): Vector3 | null;
	distanceToPoint( point: Vector3 ): number;
	intersectsFrustum( frustum: Frustum ): boolean;
	intersectsSphere( sphere: Sphere ): boolean;
	intersectsOBB( obb: OBB ): boolean;
	getOBB( targetBox: Box3, targetMatrix: Matrix4 ): void;
	getAABB( target: Box3 ): void;
	getSphere( target: Sphere ): void;
	setObbData( data: number[], transform: Matrix4 ): void;
	setSphereData( x: number, y: number, z: number, radius: number, transform: Matrix4 ): void;
	setRegionData( ellipsoid: number, west: number, south: number, east: number, north: number, minHeight: number, maxHeight: number ): void;

}
