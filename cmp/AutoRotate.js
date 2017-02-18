CLAZZ("cmp.AutoRotate", {
    INJECT:["entity", "speed"],
    x:0,
    y:0,
    z:0,

    pdx:0,
    pdy:0,
    pdz:0,

    enabled:true,

    '@speed':{ type:'float', min:0, max:1 },
    speed:0.1,

    '@setAutoRotateEnabled':{type:'bool'},
    setAutoRotateEnabled:function(enabled){
        this.enabled = enabled;
    },

    onSceneLoaded:function(){
        this.x = this.entity.position.x;
        this.y = this.entity.position.y;
        this.z = this.entity.position.z;
    },

    onPostTick:function(){
        if( !this.enabled ) return;

        var entity = this.entity, pos = entity.position;
        var px = pos.x;
        var py = pos.x;
        var pz = pos.x;

        var dx = px - this.x;
        var dy = py - this.y;
        var dz = pz - this.z;

        this.pdx -= (this.pdx - dx) * 0.3;
        this.pdy -= (this.pdy - dy) * 0.3;
        this.pdz -= (this.pdz - dz) * 0.3;

        this.x = px;
        this.y = py;
        this.z = pz;

        if( Math.abs(this.pdx) > 0.2 && Math.abs(this.pdz) > 0.2 ){
            var deltaY = entity.getRotationDeltaY( Math.atan2( this.pdx, this.pdz ) );
            // if( entity.applyTorque )
            //     entity.applyTorque(0, deltaY * this.speed * 100, 0);
            // else
                entity.rotation.y += deltaY * this.speed;
        }

    }

});

