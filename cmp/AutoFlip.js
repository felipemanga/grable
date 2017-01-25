CLAZZ("cmp.AutoFlip", {
    INJECT:["entity"],
    x:0,
    update:function(){
        var d = this.entity.position.x - this.x;
        if( d === 0 ) return;
        this.entity.scale.x = Math.abs(this.entity.scale.x) * Math.sign(d);
        this.x = this.entity.position.x;
    }
});