CLAZZ("cmp.FlyAI",{
    INJECT:["entity", "speed", "call"],
    enabled:true,
    targetX:0,
    targetY:0,
    targetZ:0,
    speed:1,
    error:20,
    _timeout:0,
    timeout:100,

    bounds:null,

    pickRandomTarget:function(){
        if( !this.bounds ){
            this.bounds = {};
            this.call("getWorldBounds", bounds);
        }

        var pos = this.entity.position, tries = 100;
        do{
            this.targetX = (Math.random() * this.bounds.width || 0) + (this.bounds.x || 0);
            this.targetY = (Math.random() * this.bounds.height || 0) + (this.bounds.y || 0);
            this.targetZ = (Math.random() * this.bounds.depth || 0) + (this.bounds.z || 0);
            var dx = this.targetX - pos.x || 0;
            var dy = this.targetY - pos.y || 0;
            var dz = this.targetZ - pos.z || 0;
        }while( tries-- && Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < this.speed*this.error )
        this._timeout = 0;
    },

    update:function(){
        if( this.enabled ){
            this._timeout++;

            if( this._timeout >= this.timeout )
                this.pickRandomTarget();
            
            var pos = this.entity.position, speed = this.speed;
            var vx = 0; // Math.random() * speed * 0.2;
            var vy = 0; // Math.random() * speed * 0.2;
            var vz = 0; // Math.random() * speed * 0.2;
            var dx = this.targetX - pos.x;
            var dy = this.targetY - pos.y;
            var dz = this.targetY - pos.z;
            if( Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < speed*this.error ){
                if( this.entity.onGetTarget )
                    this.entity.apply(this.entity.onGetTarget);
                else{
                    this.pickRandomTarget();
                }
            }
            vx += speed * Math.sign(dx);
            vy += speed * Math.sign(dy);
            vz += speed * Math.sign(dz);
            this.entity.addForce(vx, vy, vz);
        }
    }
});