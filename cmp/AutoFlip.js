CLAZZ("cmp.AutoFlip", {
    INJECT:["entity", "enabled", "mirror"],

    "@enabled":{type:"bool", priority:-1},
    enabled:true,

    "@mirror":{type:"bool", priority:1},
    mirror:true,
    
    x:0,
    onTick:function(){
        if( !this.enabled ) return;
        var d = this.entity.position.x - this.x;
        if( d === 0 ) return;
        this.entity.scale.x = Math.abs(this.entity.scale.x) * Math.sign(d) * (this.mirror ? -1 : 1);
        this.x = this.entity.position.x;
    }
});