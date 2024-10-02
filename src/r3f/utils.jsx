
const applyMatrix4_matrixVersion = ( obj, matrix ) => {

	// https://github.com/mrdoob/three.js/blob/76bff1eb9584c47d521755b87e49246079a8ae24/src/core/Object3D.js#L128
	// mat.(de)compose(p, q, s) introduces errors in scale+quaternion computation
	// So using this method to update the matrix itself
	/*
  // For reference: Object3D.applyMatrix4
  applyMatrix4( matrix ) {
    if ( this.matrixAutoUpdate ) this.updateMatrix();
    // updateMatrix() {
    // 	this.matrix.compose( this.position, this.quaternion, this.scale );
    // 	this.matrixWorldNeedsUpdate = true;
    // }
    this.matrix.premultiply( matrix );
    this.matrix.decompose( this.position, this.quaternion, this.scale );
  }
  */
	obj.matrix.premultiply( matrix );
	obj.matrixAutoUpdate = false;
	obj.updateMatrixWorld( true );

};



export {
	applyMatrix4_matrixVersion,
};
