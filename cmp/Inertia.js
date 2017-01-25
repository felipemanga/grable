CLAZZ("cmp.Inertia", {
    INJECT:["entity"],
    friction:0.9,
    gravity:9.8,
    velocityX:0,
    velocityY:0,
    enabled:true,
    addForce:function(vx, vy){
        this.velocityX += vx || 0;
        this.velocityY += vy || 0;
    },
    update:function(){
        if( this.enabled ){
            this.velocityY += this.gravity;
            this.velocityX *= this.friction;
            this.velocityY *= this.friction;
            this.entity.position.x += this.velocityX;
            this.entity.position.y += this.velocityY;
        }
    }
});