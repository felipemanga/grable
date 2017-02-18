/**
 * @author mrdoob / http://mrdoob.com/
 */

Sidebar.Geometry.Modifiers = function ( editor, object ) {

	var signals = editor.signals;

	var container = new UI.Row().setPaddingLeft( '90px' );

	var geometry = object.geometry;

	// Compute Vertex Normals

	var button = new UI.Button( 'Compute Vertex Normals' );
	button.onClick( function () {

        var needIndices = geometry instanceof THREE.BufferGeometry && !geometry.index;

        if( needIndices ){

            computeIndices();

		    geometry.computeVertexNormals();

            removeIndices();
            // geometry.index = null;
            
        } else {

		    geometry.computeVertexNormals();

        }
        

		if ( geometry instanceof THREE.BufferGeometry ) {

			geometry.attributes.normal.needsUpdate = true;

		} else {

			geometry.normalsNeedUpdate = true;

		}

		signals.geometryChanged.dispatch( object );

	} );

	container.add( button );


    function removeIndices(){

        var indices = geometry.index.array;
        var normals = geometry.attributes.normal.array;
        geometry.index = null;

        var k = 0;
        for( var i=0, l = indices.length; i<l; ++i ){
            var j = indices[ i ] * 3;
            normals[ k++ ] = normals[ j++ ];
            normals[ k++ ] = normals[ j++ ];
            normals[ k++ ] = normals[ j++ ];
        }

    }


    function computeIndices(){
        var cloud = [], cloudSize = 256;

        if( !geometry.boundingBox )
            geometry.computeBoundingBox();
        var bbox = geometry.boundingBox;

        var position = geometry.attributes.position.array, pos;
        var vertexCount = position.length, indices = [], indicesLength=0;
        var W = bbox.max.x - bbox.min.x,
            H = bbox.max.y - bbox.min.y,
            D = bbox.max.z - bbox.min.z,
            tx, ty, tz,
            Ax, Ay, Az,
            Bx, By, Bz,
            Cx, Cy, Cz;

        for( var i = 0; i < vertexCount; i+=9 ){

            Ax = position[i  ];
            var Ap = Math.round( (( Ax - bbox.min.x) / W) * cloudSize );
            Ay = position[i+1];
            Ap += cloudSize * Math.round( (( Ay - bbox.min.y) / H) * cloudSize );
            Az = position[i+2];
            Ap += cloudSize * cloudSize * Math.round( (( Az - bbox.min.z) / D) * cloudSize );

            Bx = position[i+3];
            var Bp = Math.round( (( Bx - bbox.min.x) / W) * cloudSize );
            By = position[i+4];
            Bp += cloudSize * Math.round( (( By - bbox.min.y) / H) * cloudSize );
            Bz = position[i+5];
            Bp += cloudSize * cloudSize * Math.round( (( Bz - bbox.min.z) / D) * cloudSize );

            Cx = position[i+6];
            var Cp = Math.round( (( Cx - bbox.min.x) / W) * cloudSize );
            Cy = position[i+7];
            Cp += cloudSize * Math.round( (( Cy - bbox.min.y) / H) * cloudSize );
            Cz = position[i+8];
            Cp += cloudSize * cloudSize * Math.round( (( Cz - bbox.min.z) / D) * cloudSize );

            var collisions, collision;
            
            collisions = cloud[Ap];
            pos = i;
            if( !collisions ) cloud[Ap] = [pos];
            else{
                for( j=0, l=collisions.length; j<l; ++j ){
                    collision = collisions[j];
                    if( position[ collision   ]==Ax 
                     && position[ collision+1 ]==Ay 
                     && position[ collision+2 ]==Az 
                    ) break;
                }

                if( j<l )
                    pos = collision;
                else collisions[l] = pos;
            }
            indices[indicesLength++] = pos / 3;


            collisions = cloud[Bp];
            pos = i+3;
            if( !collisions ) cloud[Bp] = [pos];
            else{
                for( j=0, l=collisions.length; j<l; ++j ){
                    collision = collisions[j];
                    if( position[ collision   ]==Bx 
                     && position[ collision+1 ]==By 
                     && position[ collision+2 ]==Bz 
                    ) break;
                }

                if( j<l )
                    pos = collision;
                else collisions[l] = pos;
            }
            indices[indicesLength++] = pos / 3;


            collisions = cloud[Cp];
            pos = i+6;
            if( !collisions ) cloud[Cp] = [pos];
            else{
                for( j=0, l=collisions.length; j<l; ++j ){
                    collision = collisions[j];
                    if( position[ collision   ]==Cx 
                     && position[ collision+1 ]==Cy 
                     && position[ collision+2 ]==Cz 
                    ) break;
                }

                if( j<l )
                    pos = collision;
                else collisions[l] = pos;
            }
            indices[indicesLength++] = pos / 3;
            
        }

        geometry.setIndex( indices );
    }

	//

	return container;

};
