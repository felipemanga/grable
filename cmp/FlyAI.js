CLAZZ("cmp.FlyAI",{
    INJECT:["entity", "speed", "call", "manualBounds", "axis", "enabled"],
    targetX:0,
    targetY:0,
    targetZ:0,
    error:20,
    _timeout:0,
    timeout:100,

    "@enabled":{type:"bool"},
    enabled:true,

    "@speed":{type:"float"},
    speed:1,

    "@axis":{type:"enum", options:["X Y", "X Z", "Y Z", "X Y Z"]},
    axis:"X Y Z",

    "@bounds":{type:"enum", options:["world", "manual"]},
    bounds:"world",

    "@manualBounds":{ type:"bounds", test:{ eq:{bounds:"manual"} } },
    manualBounds:null,


    '@setFlyAIEnabled':{ enabled:{type:'bool'} },
    setFlyAIEnabled:function( enabled ){
        this.enabled = enabled;
    },

    pickRandomTarget:function(){
        if( !this.manualBounds ){
            this.manualBounds = {};
            this.call("getWorldBounds", this.manualBounds);
        }

        var pos = this.entity.position, tries = 10, axis = this.axis;
        do{
            if( axis.indexOf("X") != -1 )
                this.targetX = (Math.random() * this.manualBounds.width || 0) + (this.manualBounds.x || 0);
            else
                this.targetX = undefined;
            
            if( axis.indexOf("Y") != -1 )
                this.targetY = (Math.random() * this.manualBounds.height || 0) + (this.manualBounds.y || 0);
            else
                this.targetY = undefined;
            
            if( axis.indexOf("Z") != -1 )
                this.targetZ = (Math.random() * this.manualBounds.depth || 0) + (this.manualBounds.z || 0);
            else
                this.targetZ = undefined;

            var dx = (this.targetX - pos.x) || 0;
            var dy = (this.targetY - pos.y) || 0;
            var dz = (this.targetZ - pos.z) || 0;
        }while( tries-- && Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < this.error )

        this._timeout = 0;
    },

    onTick:function( delta ){
        if( this.enabled ){
            this._timeout++;

            if( this._timeout >= this.timeout )
                this.pickRandomTarget();
            
            var pos = this.entity.position, speed = this.speed;
            var vx = 0; // Math.random() * speed * 0.2;
            var vy = 0; // Math.random() * speed * 0.2;
            var vz = 0; // Math.random() * speed * 0.2;
            var dx = (this.targetX - pos.x) || 0;
            var dy = (this.targetY - pos.y) || 0;
            var dz = (this.targetZ - pos.z) || 0;
            if( Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < this.error ){
                if( this.entity.onGetTarget )
                    this.entity.apply(this.entity.onGetTarget);
                else{
                    this.pickRandomTarget();
                }
            }
            vx += speed * Math.sign(dx);
            vy += speed * Math.sign(dy);
            vz += speed * Math.sign(dz);

            if( this.entity.addForce ) this.entity.addForce({x:vx, y:vy, z:vz});
            else this.entity.addPosition(vx, vy, vz);
        }
    }
});