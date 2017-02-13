CLAZZ("cmp.Force",{
    INJECT:["entity", "force", "enabled", "call"],

    "@enabled":{type:"bool"},
    enabled:true,

    "@force":{type:"vec3f", min:0},
    force:null,

    onTick:function( delta ){
        if( !this.enabled || !this.force ) return;
        this.entity.addForce( this.force.x*delta, this.force.y*delta, this.force.z*delta );
    }
});