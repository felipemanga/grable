need([
    {FQCN:"THREE", URL:"lib/three.js"},
    {FQCN:"Physijs", URL:"lib/physi.js", NEEDS:[
         {FQCN:"THREE", URL:"lib/three.js"}
    ]}
], function( ){


CLAZZ("cmp.PhysiJS", {
    INJECT:[
        "entity", "pool", "asset", "game", "gameState", 

        // scene configs
        "gravity", "frameRate",

        // node configs
        "mass", "mesh", "friction", "bounciness", "name", "linearDamping", "angularDamping"
    ],
    PROVIDES:{"Physics":"implements"},

    scene:null,
    node:null,
    bounds:null,

    // scene configs
    "@gravity":{type:"vec3f", test:{'instanceof':{'asset':'THREE.Scene'}} },
    gravity:{x:0, y:-98, z:0},

    "@frameRate":{type:"float", min:0, test:{'instanceof':{'asset':'THREE.Scene'}}},
    frameRate:30,

    // node configs
    "@name":{type:"string", test:{'notinstanceof':{'asset':'THREE.Scene'}}},
    name:"",

    "@mass":{type:"float", min:0, test:{'notinstanceof':{'asset':'THREE.Scene'}}},
    mass:1,

    "@mesh":{type:"enum", test:{'notinstanceof':{'asset':'THREE.Scene'}}, options:[
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

    "@friction":{type:"float", min:0, max:1, test:{'notinstanceof':{'asset':'THREE.Scene'}}},
    friction:0.1,

    "@bounciness":{type:"float", min:0, max:1, test:{'notinstanceof':{'asset':'THREE.Scene'}}},
    bounciness:0.98,

    "@linearDamping":{type:"float", min:0, max:1, test:{'notinstanceof':{'asset':'THREE.Scene'}}},
    linearDamping:0,

    "@angularDamping":{type:"float", min:0, max:1, test:{'notinstanceof':{'asset':'THREE.Scene'}}},
    angularDamping:0,

    create:function(){
        var scene = this.game.scene;
        if( !scene ) return;
        if( scene == this.asset ){

            this.pool.silence("getWorldBounds");

            this.bounds = new THREE.Box3().setFromObject( this.asset );

            var cfg = {};
            if( this.frameRate )
                cfg.fixedTimeStep = 1 / this.frameRate;

            this.node = Physijs.Scene(cfg, this.entity.getNode());

            this.scene = this.node;

            cmp.PhysiJS.Service.add( this );

            cmp.PhysiJS.Service.instance.setGravity( this.gravity );

        } else if( !scene.entity ){

            this.gameState.addEntity({
                components:{
                    "cmp.ThreeNode":{ scripts: {}, asset:scene },
                    "cmp.PhysiJS":{ asset:scene }
                }
            });

        }

        this.scene = scene.entity.getPhysiJSScene();
    },

    getPhysiJSScene:function(){
        return this.scene;
    },

    onSceneLoaded:function(){
        var entity = this.entity, asset = this.asset, node;

        if( this.node == this.scene )
            return;
        
        var type = this.mesh + "Mesh";
        node = this.node = Physijs[ type ]( null, null, this.mass, this.entity.getNode() );

        node.entity = this.entity;
        node.friction = this.friction;
        node.restitution = this.bounciness;

        node.setDamping( this.linearDamping, this.angularDamping );

        if( this.name )
            node.addEventListener('collision', function(other, linear, angular){
                var cb = entity["onHit" + other.entity.physiJS.name];
                if( cb )
                    cb.call(entity, other.entity, linear, angular);
            });

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
        if( !this.node || !this.scene )
            return;

        if( this.node != this.scene )
            return this.scene.remove( this.node );

        this.scene._worker.onmessage = null;
        this.scene._worker = null;
        this.scene = null;
        cmp.PhysiJS.Service.remove(this);
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



CLAZZ("cmp.PhysiJS.Service", {
    listeners:null,
    pool:null,
    pos:0,

    add:function(l){
        if( !this.listeners ){
            this.listeners = [];
            this.pool = l.pool;
            this.pool.add(this);
        }
        this.listeners.push( l );
    },

    remove:function(l){
        if( !this.listeners )
            return;

        var pos = this.listeners.indexOf(l);
        if( pos == -1 ) return;

        this.listeners.splice(pos, 1);

        if( this.listeners.length == 0 ){
            this.pool.remove(this);
            this.listeners = null;
        }
    },

    STATIC:{
        instance:null,

        add:function( l ){
            if( !l || !l.pool || !l.entity )
                return;

            if( !this.instance )
                this.instance = new cmp.PhysiJS.Service();
            
            this.instance.add( l );
        },

        remove:function( l ){
            if( !l || !this.instance ) return;
            this.instance.remove(l);
        }
    },

    onPostTick:function( time ){
        if( !this.listeners ) return;

        for( var i=0, l=this.listeners.length; i<l; ++i )
            this.listeners[i].scene.simulate(time);
    },

    setGravity:function( gravity ){
        if( !this.listeners ) return;

        for( var i=0, l=this.listeners.length; i<l; ++i )
            this.listeners[i].scene.setGravity( new THREE.Vector3( gravity.x||0, gravity.y||0, gravity.z||0 ) );
    },

    getWorldBounds:function(bounds){
        if( !this.listeners || !this.listeners.length ) return;
        var listener = this.listeners[0];

        bounds.x = listener.bounds.min.x;
        bounds.y = listener.bounds.min.y;
        bounds.z = listener.bounds.min.z;
        
        bounds.width = listener.bounds.max.x - listener.bounds.min.x;
        bounds.height = listener.bounds.max.y - listener.bounds.min.y;
        bounds.depth = listener.bounds.max.z - listener.bounds.min.z;
    }
    
    
});


});