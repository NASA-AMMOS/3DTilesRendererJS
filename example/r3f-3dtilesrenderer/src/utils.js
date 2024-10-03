import proj4 from 'proj4';
import * as THREE from "three";

const computeCrsTransform = (
	sourceCrsOriginCoords,
	sourceCrsProj,
	targetCrsProj
) => {

	const sourceCrsDefinition =
      sourceCrsProj || '+proj=longlat +datum=WGS84 +no_defs';
	const targetCrsDefinition =
      targetCrsProj || '+proj=longlat +datum=WGS84 +no_defs';

	// Attempt to use sourceCrsProj if defined; otherwise, define and use 'sourceCRS'
	const sourceCRS = proj4.defs( sourceCrsProj ) ? sourceCrsProj : 'sourceCRS';
	if ( ! proj4.defs( sourceCrsProj ) ) {

		proj4.defs( sourceCRS, sourceCrsDefinition );

	}

	// Attempt to use targetCrsProj if defined; otherwise, define and use 'targetCRS'
	const targetCRS = proj4.defs( targetCrsProj ) ? targetCrsProj : 'targetCRS';
	if ( ! proj4.defs( targetCrsProj ) ) {

		proj4.defs( targetCRS, targetCrsDefinition );

	}

	const transformProj = proj4( sourceCRS, targetCRS );
	// Use first scene position as origin of transformation
	const originInSourceCoords = sourceCrsOriginCoords;
	const originInTargetCoords = new THREE.Vector3().fromArray(
		transformProj.forward( originInSourceCoords.toArray() )
	);

	const scale = 1000;

	const xVector = new THREE.Vector3().fromArray(
		transformProj.forward(
			originInSourceCoords
				.clone()
				.add( new THREE.Vector3( scale, 0, 0 ) )
				.toArray()
		)
	);
	const yVector = new THREE.Vector3().fromArray(
		transformProj.forward(
			originInSourceCoords
				.clone()
				.add( new THREE.Vector3( 0, scale, 0 ) )
				.toArray()
		)
	);
	// Optionally compute zVector for full 3D transformation
	// const zVector = new THREE.Vector3().fromArray(
	//   transformProj.forward(
	//     originInSourceCoords.clone().add(new THREE.Vector3(0, 0, scale)).toArray()
	//   )
	// );

	const ox = xVector.clone().sub( originInTargetCoords.clone() );
	const oy = yVector.clone().sub( originInTargetCoords.clone() );

	// For oz, seems like we can cross-vectors and results are almost similar
	// + remove warning of non unit scale in all directions by 3dtilesrenderer
	// const oz = z.clone().sub(origin_datasetCrs.clone());
	// oz.divideScalar(scale);
	ox.divideScalar( scale );
	oy.divideScalar( scale );
	const oz = new THREE.Vector3().crossVectors( ox, oy );

	const rot_scene_to_dataset = new THREE.Matrix4().makeBasis( ox, oy, oz );
	const rot_dataset_to_scene = rot_scene_to_dataset.clone().invert();
	const trans_zeroToScene = new THREE.Matrix4().makeTranslation(
		...originInSourceCoords.toArray()
	);
	const minus_origin_datasetCrs = originInTargetCoords
		.clone()
		.multiplyScalar( - 1 );
	const trans_datasetToZero = new THREE.Matrix4().makeTranslation(
		...minus_origin_datasetCrs.toArray()
	);

	const matrixTransform = new THREE.Matrix4()
		.multiply( trans_zeroToScene )
		.multiply( rot_dataset_to_scene )
		.multiply( trans_datasetToZero );

	// Try to suppress warning
	// ThreeTilesRenderer : Non uniform scale used for tile which may cause issues when calculating screen space error.
	// By setting uniform mean scale

	// let mTranslation = new THREE.Vector3(),
	//   mRotation = new THREE.Quaternion(),
	//   mScale = new THREE.Vector3();
	// matrixTransform.decompose(mTranslation, mRotation, mScale);
	// const sMean = (mScale.x + mScale.y + mScale.z) / 3;
	// const matrixTransformUniformScale = new THREE.Matrix4().compose(
	//   mTranslation,
	//   mRotation,
	//   mScale
	//   // new THREE.Vector3(sMean, sMean, sMean)
	// );
	// return matrixTransformUniformScale;

	return matrixTransform;

};


const computeTransformToLocalZup = (
    originCoords,
    sourceCrs,
    targetCrs = null
  ) => {
    /* 
          TILESET_CRS_GEOCENTRIC (found in tileset.json) or default EPSG:4978
          https://epsg.io/?q=EPSG:4978&format=json
        */
    // target crs is 3d tiles crs
    const targetCrsProj4 =
      targetCrs || "+proj=geocent +datum=WGS84 +units=m +no_defs +type=crs";
    // source crs is found in rcInfo of glb
    const sourceCrsProj4 = sourceCrs;
    // source crs origin coords found in transformToModel matrix of glb rcInfo
    const sourceCrsOriginCoords = new THREE.Vector3(
      parseFloat(originCoords.x),
      parseFloat(originCoords.y),
      parseFloat(originCoords.z)
    );
    const crsTransform = computeCrsTransform(
      sourceCrsOriginCoords,
      sourceCrsProj4,
      targetCrsProj4
    );
    const inverseOriginCoords = originCoords.clone().negate();
    const translateBack = new THREE.Matrix4().makeTranslation(
      inverseOriginCoords
    );
    const transform = crsTransform.clone().premultiply(translateBack);
    return transform;
  };
  const computeTransformToLocalYup = (
      originCoords,
      sourceCrs,
      targetCrs = null
    ) => {
      const transformToLocalZup = computeTransformToLocalZup(originCoords, sourceCrs, targetCrs);
      const rotateZToY = new THREE.Matrix4().makeRotationX (- Math.PI / 2);
      const transform = transformToLocalZup.clone().premultiply(rotateZToY);
      return transform;
    };

export {
    computeCrsTransform, 
    computeTransformToLocalZup, 
    computeTransformToLocalYup, 
};
