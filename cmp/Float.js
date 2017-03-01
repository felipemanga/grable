CLAZZ("cmp.Float", {

INJECT:["entity", "height", "enabled", "strength", "waterViscosity"],

    '@enabled':{type:'bool'},
    enabled:true,

    '@height':{type:'float'},
    height:0,

    '@strength':{type:'float'},
    strength:10,

    '@waterViscosity':{type:'float', min:0, max:1},
    waterViscosity:0.98,


    onTick:function(delta){
        var depth = this.height - this.entity.position.y;
        
        if( this.entity.setMediumViscosity )
            this.entity.setMediumViscosity( Math.max(0, Math.min( this.waterViscosity, depth * 0.25 ) ) );

        if( depth > 0 )
            this.entity.addForce(0, this.strength * depth, 0);
    }

});