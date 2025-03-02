import { Matrix4, Box3, Vector3, Plane, Ray } from 'three';

export class OBB {

	box: Box3;
	transform: Matrix4;
	inverseTransform: Matrix4;
	points: Vector3[];
	planes: Plane[];

	constructor( box: Box3, transform: Matrix4 )

	clampPoint( point: Vector3, result: Vector3 ): Vector3;
	distanceToPoint( point: Vector3 ): number;
	containsPoint( point: Vector3 ): boolean;
	intersectsRay( ray: Ray ): boolean;
	intersectRay( ray: Ray, target: Vector3 ): Vector3 | null;
	update(): void;
	updatePlanes(): void;
	intersectsFrustum( frustum: Frustum ): boolean;

}
