need([
    {FQCN:"THREE", URL:"lib/three.js"},
    {FQCN:"Physijs", URL:"lib/physi.js", NEEDS:[
         {FQCN:"THREE", URL:"lib/three.js"}
    ]}
], function( ){


CLAZZ("cmp.PhysiNode", {
    INJECT:["entity", "asset", "game", "mass", "mesh", "friction", "bounciness", "name", "linearDamping", "angularDamping"],
    PROVIDES:{"Physics":"implements"},

    node:null,

    "@name":{type:"string"},
    name:"",

    "@mass":{type:"float", min:0},
    mass:0,

    "@mesh":{type:"enum", options:[
        "Box",
        "Cylinder",
        "Capsule",
        "Cone",
        "Concave",
        "Convex",
        "Heightfield",
        "Mesh",
        "Plane",
        "Sphere"
    ]},
    mesh:"Box",

    "@friction":{type:"float", min:0, max:1},
    friction:0.1,

    "@bounciness":{type:"float", min:0, max:1},
    bounciness:0.98,

    "@linearDamping":{type:"float", min:0, max:1},
    linearDamping:0,
    "@angularDamping":{type:"float", min:0, max:1},
    angularDamping:0,

    scene:null,

    onSceneLoaded:function(){
        var entity = this.entity, asset = this.asset, node;
        node = this.node = Physijs[ this.mesh + "Mesh"]( null, null, this.mass, this.entity.getNode() );

        node.entity = this.entity;
        node.friction = this.friction;
        node.restitution = this.bounciness;

        node.setDamping( this.linearDamping, this.angularDamping );

        if( this.name )
            node.addEventListener('collision', function(other, linear, angular){
                var cb = entity["onHit" + other.entity.physiNode.name];
                if( cb ) cb.call(entity, other.entity, linear, angular);
            });

        this.scene = this.game.scene.physijs;
        if( this.scene )
            this.scene.add( this.node );

        entity.position = Object.create(null, {
            x:{
                get:function(){ return asset.position.x; },
                set:function(v){ if( v != asset.position.x ){ asset.position.x = v||0; node.__dirtyPosition = true; } }
            },
            y:{
                get:function(){ return asset.position.y; },
                set:function(v){ if( v != asset.position.y ){ asset.position.y = v||0; node.__dirtyPosition = true; } }
            },
            z:{
                get:function(){ return asset.position.z; },
                set:function(v){ if( v != asset.position.z ){ asset.position.z = v||0; node.__dirtyPosition = true; } }
            }
        });

        entity.rotation = Object.create(null, {
            x:{
                get:function(){ return asset.rotation.x; },
                set:function(v){ if( v != asset.rotation.x ){ asset.rotation.x = v||0; node.__dirtyRotation = true; } }
            },
            y:{
                get:function(){ return asset.rotation.y; },
                set:function(v){ if( v != asset.rotation.y ){ asset.rotation.y = v||0; node.__dirtyRotation = true; } }
            },
            z:{
                get:function(){ return asset.rotation.z; },
                set:function(v){ if( v != asset.rotation.z ){ asset.rotation.z = v||0; node.__dirtyRotation = true; } }
            }
        });        
    },

    destroy:function(){
        if( this.scene )
            this.scene.remove( this.node );
    },

    addForce:function(x,y,z){
        this.node.applyCentralForce({x:x,y:y,z:z});
    }
});

});