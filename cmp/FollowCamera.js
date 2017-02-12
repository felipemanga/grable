CLAZZ("cmp.FollowCamera", {
    INJECT:["entity", "gameState", "camera", "call"],

    enabled:true,
    offsetCamera:null,
    camera:null,
    speed:0.03,
    camerax:0,
    cameray:0,
    cameraz:0,

    CONSTRUCTOR:function(){
        this.camera = this.camera || this.call("getCamera");
        this.entity.offsetCamera = this.offsetCamera = {x:0, y:0, z:0};
        this.camerax = this.camera.x;
        this.cameray = this.camera.y;
        this.cameraz = this.camera.z;
    },

    onPostTick:function(){
        if( this.enabled ){
            this.camerax -= (this.camerax - (this.entity.position.x + this.offsetCamera.x)) * this.speed;
            this.cameray -= (this.cameray - (this.entity.position.y + this.offsetCamera.y)) * this.speed;
            this.cameraz -= (this.cameraz - (this.entity.position.z + this.offsetCamera.z)) * this.speed;
            this.camera.x = this.camerax;
            this.camera.y = this.cameray;
            this.camera.z = this.cameraz;
        }
    }
})