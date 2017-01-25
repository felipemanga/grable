CLAZZ("cmp.FlyAI",{
    INJECT:["entity", "speed", "game"],
    enabled:true,
    targetX:0,
    targetY:0,
    speed:1,
    error:20,
    _timeout:0,
    timeout:100,

    pickRandomTarget:function(){
        var pos = this.entity.position;
        do{
            this.targetX = Math.random() * this.game.width;
            this.targetY = Math.random() * this.game.height;
            var dx = this.targetX - pos.x;
            var dy = this.targetY - pos.y;
        }while( Math.abs(dx) + Math.abs(dy) < this.speed*this.error )
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
            var dx = this.targetX - pos.x;
            var dy = this.targetY - pos.y;
            if( Math.abs(dx) + Math.abs(dy) < speed*this.error ){
                if( this.entity.onGetTarget )
                    this.entity.apply(this.entity.onGetTarget);
                else{
                    this.pickRandomTarget();
                }
            }
            vx += speed * Math.sign(dx);
            vy += speed * Math.sign(dy);
            this.entity.addForce(vx, vy);
        }
    }
});