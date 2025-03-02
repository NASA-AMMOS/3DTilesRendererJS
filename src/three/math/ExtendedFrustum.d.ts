import { Matrix4, Vector3 } from 'three';


export class ExtendedFrustum {

	points: Vector3[];

	constructor()

	setFromProjectionMatrix( m: Matrix4, coordinateSystem?: any ): void;
	calculateFrustumPoints(): void;

}
