import {
	LineSegments,
	Vector3,
	Sphere,
} from 'three';

export class WGS84Region {

	west : Number;
	south : Number;
	east : Number;
	north : Number;
	minHeight : Number;
	maxHeight : Number;

	constructor(
		west : Number,
		south : Number,
		east : Number,
		north : Number,
		minHeight : Number,
		maxHeight : Number
	);

	set(
		west : Number,
		south : Number,
		east : Number,
		north : Number,
		minHeight : Number,
		maxHeight : Number
	) : void;
	getClosestPointToPoint( point : Vector3, target : Vector3 ) : Vector3;
	getPointAt( latLerp : Number, lonLerp : Number, heightLerp : Number, target : Vector3 ) : Vector3;
	getBoundingSphere( sphere : Sphere ) : Sphere;
	distanceToPoint( point : Vector3 ) : Number;

}

export class WGS84RegionHelper extends LineSegments {

	region : WGS84Region;

	constructor( region : WGS84Region );
	update() : void;

}
