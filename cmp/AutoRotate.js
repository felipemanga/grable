CLAZZ("cmp.AutoRotate", {
    INJECT:[ "entity", "speed", "movementThreshold", "movementSmoothing", "xMode", "zMode" ],
    x:0,
    y:0,
    z:0,

    pdx:0,
    pdy:0,
    pdz:0,
    deltaY:0,

    enabled:true,

    "@zMode":{ type:"enum", options:["", "set to zero", "tween to zero", "tween to delta"]},
    zMode:"tween to zero",

    "@xMode":{ type:"enum", options:["", "set to zero", "tween to zero", "tween to delta"]},
    xMode:"tween to zero",

    '@speed':{ type:'float', min:0, max:1 },
    speed:0.1,

    '@movementThreshold':{ type:'float', min:0 },
    movementThreshold:0.2,

    '@movementSmoothing':{ type:'float', min:0.01, max:0.99 },
    movementSmoothing:0.3,

    '@setAutoRotateEnabled':{type:'bool'},
    setAutoRotateEnabled:function(enabled){
        this.enabled = enabled;
    },

    onReady:function(){
        this.x = this.entity.position.x;
        this.y = this.entity.position.y;
        this.z = this.entity.position.z;
    },

    onPostTick:function(){
        if( !this.enabled ) return;

        var entity = this.entity, pos = entity.position;
        var px = pos.x;
        var py = pos.y;
        var pz = pos.z;

        var dx = px - this.x;
        var dy = py - this.y;
        var dz = pz - this.z;

        this.pdx -= (this.pdx - dx) * (1 - this.movementSmoothing);
        this.pdy -= (this.pdy - dy) * (1 - this.movementSmoothing);
        this.pdz -= (this.pdz - dz) * (1 - this.movementSmoothing);

        this.x = px;
        this.y = py;
        this.z = pz;

        if( Math.abs(this.pdx) + Math.abs(this.pdz) > 0.2 ){
            var deltaY = this.deltaY = entity.getRotationDeltaY( Math.atan2( this.pdx, this.pdz ) );
            // if( entity.applyTorque )
            //     entity.applyTorque(0, deltaY * this.speed * 100, 0);
            // else
                entity.rotation.y += deltaY * this.speed;
        }

        switch( this.zMode ){
        case "set to zero":
            entity.rotation.z = 0;
            break;

        case "tween to zero":
            entity.rotation.z += entity.getRotationDeltaZ( 0 ) * this.speed;
            break;
        
        case "tween to delta":
            entity.rotation.z += entity.getRotationDeltaZ( -this.deltaY*0.5 ) * this.speed;
            break;

        }

        switch( this.xMode ){
        case "set to zero":
            entity.rotation.x = 0;
            break;

        case "tween to zero":
            entity.rotation.x += entity.getRotationDeltaX( 0 ) * this.speed;
            break;

        case "tween to delta":
            entity.rotation.x += entity.getRotationDeltaX( Math.min(1, Math.max(-1, -dy*0.3) ) ) * this.speed;
            break;
        }

    }

});

