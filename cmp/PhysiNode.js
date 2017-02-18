need([
    {FQCN:"THREE", URL:"lib/three.js"},
    {FQCN:"Physijs", URL:"lib/physi.js", NEEDS:[
         {FQCN:"THREE", URL:"lib/three.js"}
    ]}
], function( ){


CLAZZ("cmp.PhysiNode", {
    INJECT:["entity", "asset", "game", "gameState", "mass", "mesh", "friction", "bounciness", "name", "linearDamping", "angularDamping"],
    PROVIDES:{"Physics":"implements"},

    node:null,

    "@name":{type:"string"},
    name:"",

    "@mass":{type:"float", min:0},
    mass:1,

    "@mesh":{type:"enum", options:[
        "Box",
        "Cylinder",
        "Capsule",
        "Cone",
        "Concave",
        "Convex",
        "Heightfield",
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

    create:function(){
        var scene = this.game.scene;
        if( !scene ) return;
        if( !scene.entity ){
            this.gameState.addEntity({
					components:{
						"cmp.ThreeNode":{ scripts: {}, asset:scene },
                        "cmp.PhysiScene":{ asset:scene }
					}                 
            });
        }
    },

    onSceneLoaded:function(){
        var entity = this.entity, asset = this.asset, node;
        
        var type = this.mesh + "Mesh";
        node = this.node = Physijs[ type ]( null, null, this.mass, this.entity.getNode() );

        node.entity = this.entity;
        node.friction = this.friction;
        node.restitution = this.bounciness;

        node.setDamping( this.linearDamping, this.angularDamping );

        if( this.name )
            node.addEventListener('collision', function(other, linear, angular){
                var cb = entity["onHit" + other.entity.physiNode.name];
                if( cb )
                    cb.call(entity, other.entity, linear, angular);
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

    '@setLinearVelocity':{ velocity:{type:'vec3f'} },
    setLinearVelocity:function( velocity ){
        if( arguments.length == 3 || !velocity )
            velocity = { x:arguments[0]||0, y:arguments[1]||0, z:arguments[2]||0 };
        
        this.node.setLinearVelocity(velocity);
    },

    '@setAngularVelocity':{ velocity:{type:'vec3f'} },
    setAngularVelocity:function( velocity ){
        if( arguments.length == 3 || !velocity )
            velocity = { x:arguments[0]||0, y:arguments[1]||0, z:arguments[2]||0 };
        
        this.node.setAngularVelocity(velocity);
    },

    '@applyTorque':{ torque:{type:'vec3f'} },
    applyTorque:function( torque ){
        if( arguments.length == 3 || !torque )
            torque = { x:arguments[0]||0, y:arguments[1]||0, z:arguments[2]||0 };
        this.node.applyTorque( torque );
    },

    '@addForce':{ force:{type:'vec3f'} },
    addForce:function( force ){
        if( arguments.length == 3 || !force )
            force = { x:arguments[0]||0, y:arguments[1]||0, z:arguments[2]||0 };
        this.node.applyCentralForce(force);
    }
});

});