CLAZZ("cmp.SnapToGround", {
    INJECT:["entity", "game", "ground", "raiseToGround", "dropToGround", "offsetY"],

    "@raiseToGround":{type:"bool"},
    raiseToGround:true,

    "@dropToGround":{type:"bool"},
    dropToGround:false,
    
    "@ground":{type:"node"},
    ground:null,

    "@offsetY":{type:"float"},
    offsetY:0,

    STATIC:{
        raycaster:null,
    },

    onSceneLoaded:function(){
        var ground = this.game.scene.getObjectByProperty( 'uuid', this.ground );
        if( !ground ) 
            return;

        var position = this.entity.position;

        if( ground.getHeightAtXZ ){

            ground.getHeightAtXZ( position );

        }else if( ground.geometry ){
            var geometry = ground.geometry;
            if ( !geometry.boundingBox )
                geometry.computeBoundingBox();
            
            var raycaster = cmp.SnapToGround.raycaster;
            if( !raycaster ) 
                raycaster = cmp.SnapToGround.raycaster = new THREE.Raycaster();

            var box = geometry.boundingBox;
            
            raycaster.set( new THREE.Vector3(
                position.x,
                box.min.y * ground.scale.y + ground.position.y,
                position.z
            ), new THREE.Vector3(0,1,0) );

            var side = ground.material.side;
            ground.material.side = THREE.DoubleSide;

            var intersects = raycaster.intersectObject( ground );
            if( intersects && intersects.length ){
                position.y = intersects[0].point.y;
            }

            ground.material.side = side;
        }

        position.y += this.offsetY;
    }
});