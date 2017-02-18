need([
    {FQCN:"Physijs", URL:"lib/physi.js", NEEDS:[
         {FQCN:"THREE", URL:"lib/three.js"}
    ]}
], function( ){


CLAZZ("cmp.PhysiScene", {
    INJECT:["entity", "pool", "asset", "gravity", "frameRate"],
    scene:null,
    bounds:null,

    "@gravity":{type:"vec3f"},
    gravity:{x:0, y:-98, z:0},

    "@frameRate":{type:"float", min:0},
    frameRate:30,

    create:function(){
        this.pool.silence("getWorldBounds");

        this.bounds = new THREE.Box3().setFromObject( this.asset );

        var cfg = {};
        if( this.frameRate )
            cfg.fixedTimeStep = 1 / this.frameRate;

        this.scene = Physijs.Scene(cfg, this.entity.getNode());

        this.setGravity( this.gravity );
    },

    destroy:function(){
        if( !this.scene ){
            console.log("double destroy", this.entity);
            return;
        }

        this.scene._worker.onmessage = null;
        this.scene._worker = null;
        this.scene = null;
    },

    '@setGravity':{ gravity:{type:'vec3f'} },
    setGravity:function( gravity ){
        this.scene.setGravity( new THREE.Vector3( gravity.x||0, gravity.y||0, gravity.z||0 ) );
    },

    '@onPostTick':{ __hidden:true },
    onPostTick:function( time ){
        this.scene.simulate( time );
    },

    '@getWorldBounds':{ __hidden:true },
    getWorldBounds:function(bounds){
        bounds.x = this.bounds.min.x;
        bounds.y = this.bounds.min.y;
        bounds.z = this.bounds.min.z;
        
        bounds.width = this.bounds.max.x - this.bounds.min.x;
        bounds.height = this.bounds.max.y - this.bounds.min.y;
        bounds.depth = this.bounds.max.z - this.bounds.min.z;
    }
});

});