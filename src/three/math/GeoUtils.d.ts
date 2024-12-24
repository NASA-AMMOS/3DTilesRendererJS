import { Vector3 } from 'three';

export function swapToGeoFrame( target : Vector3 ) : Vector3;

export function swapToThreeFrame( target : Vector3 ) : Vector3;

export function sphericalPhiToLatitude( phi : number ) : number;

export function latitudeToSphericalPhi( latitude : number ) : number;
