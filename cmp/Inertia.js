CLAZZ("cmp.Inertia", {
    INJECT:["entity", "enabled", "friction", "gravity", "velocity"],

    "@enabled":{type:"bool"},
    enabled:true,

    "@friction":{type:"float", min:0, max:1},
    friction:0.9,

    "@gravity":{type:"float"},
    gravity:9.8,

    "@velocity":{type:"vec3f"},
    velocity:null,

    '@addForce':{ force:{type:'vec3f'} },
    addForce:function( force ){
        if( arguments.length == 3 ){
            vx = arguments[0]||0;
            vy = arguments[1]||0;
            vz = arguments[2]||0;
        }else{
            var vx = force.x || 0;
            var vy = force.y || 0;
            var vz = force.z || 0;
        }

        if( !this.velocity )
            this.velocity = {x:vx, y:vy, z:vz};
        else{
            this.velocity.x += vx;
            this.velocity.y += vy;
            this.velocity.z += vz;
        }
    },

    onTick:function( delta ){
        if( this.enabled && this.velocity ){
            this.velocity.y += this.gravity * delta;
            this.velocity.x *= 1 - this.friction;
            this.velocity.y *= 1 - this.friction;
            this.velocity.z *= 1 - this.friction;
            this.entity.position.x += this.velocity.x * delta;
            this.entity.position.y += this.velocity.y * delta;
            this.entity.position.z += this.velocity.z * delta;
        }
    }
});