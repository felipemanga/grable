CLAZZ("cmp.Force",{
    INJECT:["entity", "force", "enabled", "call"],

    "@enabled":{type:"bool"},
    enabled:true,

    "@force":{type:"vec3f", min:0},
    force:null,

    '@onTick':{ __hidden:true },
    onTick:function( delta ){
        if( !this.enabled || !this.force ) return;
        this.entity.addForce({
            x:this.force.x*delta,
            y:this.force.y*delta,
            z:this.force.z*delta
        });
    }
});