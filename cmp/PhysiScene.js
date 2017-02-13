CLAZZ("cmp.PhysiScene", {
    INJECT:["entity", "asset", "gravity"],
    scene:null,

    "@gravity":{type:"vec3f"},
    gravity:{x:0, y:-9.8, z:0},

    create:function(){
        this.scene = Physijs.Scene({
            fixedTimeStep: 1/30
        }, this.entity.getNode());
        this.setGravity( this.gravity );
    },

    setGravity:function( gravity ){
        this.scene.setGravity( new THREE.Vector3( gravity.x||0, gravity.y||0, gravity.z||0 ) );
    },

    onTick:function( time ){
        this.scene.simulate( time );
    }
});