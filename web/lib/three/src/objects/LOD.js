/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 */

THREE.LOD = function () {

	THREE.Object3D.call( this );

	this.objects = [];

};


THREE.LOD.prototype = Object.create( THREE.Object3D.prototype );

THREE.LOD.prototype.addLevel = function ( object, distance ) {

	if ( distance === undefined ) distance = 0;

	distance = Math.abs( distance );

	for ( var l = 0; l < this.objects.length; l ++ ) {

		if ( distance < this.objects[ l ].distance ) {

			break;

		}

	}

	this.objects.splice( l, 0, { distance: distance, object: object } );
	this.add( object );

};

THREE.LOD.prototype.getObjectForDistance = function ( distance ) {

	for ( var i = 1, l = this.objects.length; i < l; i ++ ) {

		if ( distance < this.objects[ i ].distance ) {

			break;

		}

	}

	return this.objects[ i - 1 ].object;

};

THREE.LOD.prototype.raycast = ( function () {

	var matrixPosition = new THREE.Vector3();

	return function ( raycaster, intersects ) {

		matrixPosition.setFromMatrixPosition( this.matrixWorld );

		var distance = raycaster.ray.origin.distanceTo( matrixPosition );

		this.getObjectForDistance( distance ).raycast( raycaster, intersects );

	};

}() );

THREE.LOD.prototype.update = function () {

	var v1 = new THREE.Vector3();
	var v2 = new THREE.Vector3();

	return function ( camera ) {

		if ( this.objects.length > 1 ) {

			v1.setFromMatrixPosition( camera.matrixWorld );
			v2.setFromMatrixPosition( this.matrixWorld );

			var distance = v1.distanceTo( v2 );

			this.objects[ 0 ].object.visible = true;

			for ( var i = 1, l = this.objects.length; i < l; i ++ ) {

				if ( distance >= this.objects[ i ].distance ) {

					this.objects[ i - 1 ].object.visible = false;
					this.objects[ i     ].object.visible = true;

				} else {

					break;

				}

			}

			for ( ; i < l; i ++ ) {

				this.objects[ i ].object.visible = false;

			}

		}

	};

}();

THREE.LOD.prototype.clone = function ( object ) {

	if ( object === undefined ) object = new THREE.LOD();

	THREE.Object3D.prototype.clone.call( this, object );

	for ( var i = 0, l = this.objects.length; i < l; i ++ ) {
		var x = this.objects[ i ].object.clone();
		x.visible = i === 0;
		object.addLevel( x, this.objects[ i ].distance );
	}

	return object;

};
