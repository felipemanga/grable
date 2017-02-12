CLAZZ("cmp.Bob", {
    INJECT:["entity", "amplitude", "speed", "iterator", "enabled"],

    "@enabled":{type:"bool", priority:-1},
    enabled:true,

    "@amplitude":{ type:"vec3f", min:0, priority:1 },
    amplitude:{x:0, y:100, z:0},

    "@iterator":{ type:"vec3f", min:0, priority:3 },
    iterator:null,

    "@speed":{ type:"vec3f", min:0, priority:2 },
    speed:{x:0, y:0, z:0},

    offset:null,

    CONSTRUCTOR:function(){
        this.offset = {x:0, y:0, z:0};
        this.iterator = this.iterator || {x:0, y:0, z:0};
    },

    onTick:function( time ){
        if( !this.enabled )
            return;

        time *= Math.PI * 2;

        var offsetX = Math.sin( this.iterator.x += this.speed.x * time ) * this.amplitude.x;
        var offsetY = Math.sin( this.iterator.y += this.speed.y * time ) * this.amplitude.y;
        var offsetZ = Math.sin( this.iterator.z += this.speed.z * time ) * this.amplitude.z;
        this.entity.position.x += -this.offset.x + offsetX;
        this.entity.position.y += -this.offset.y + offsetY;
        this.entity.position.z += -this.offset.z + offsetZ;
        this.offset.y = offsetY;
        this.offset.x = offsetX;
        this.offset.z = offsetZ;
    }
})