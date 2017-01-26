CLAZZ("cmp.Bob", {
    INJECT:["entity"],
    amplitudeX:10,
    amplitudeY:10,
    iteratorX:0,
    iteratorY:0,
    speedX:0,
    speedY:0.1,
    offsetX:0,
    offsetY:0,
    update:function(){
        var offsetY = Math.sin( this.iteratorY += this.speedY ) * this.amplitudeY;
        var offsetX = Math.sin( this.iteratorX += this.speedX ) * this.amplitudeX;
        this.entity.position.y += -this.offsetY + offsetY;
        this.entity.position.x += -this.offsetX + offsetX;
        this.offsetY = offsetY;
        this.offsetX = offsetX;
    }
})