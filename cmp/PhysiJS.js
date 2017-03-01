need([
    {FQCN:"THREE", URL:"lib/three.js"},
    {FQCN:"Physijs", URL:"lib/physi.js", NEEDS:[
         {FQCN:"THREE", URL:"lib/three.js"}
    ]}
], function( ){


CLAZZ("cmp.PhysiJS", {
    INJECT:[
        "entity", "pool", "game", "gameState", 

        // scene configs
        "gravity", "frameRate",

        // node configs
        "mass", "mesh", "friction", "bounciness", "name", "linearDamping", "angularDamping"
    ],
    PROVIDES:{"Physics":"implements"},

    asset:null,
    scene:null,
    node:null,
    bounds:null,

    // scene configs
    "@gravity":{type:"vec3f", test:{'instanceof':{'asset':'THREE.Scene'}} },
    gravity:{x:0, y:-98, z:0},

    "@frameRate":{type:"float", min:0, test:{'instanceof':{'asset':'THREE.Scene'}}},
    frameRate:30,

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

    // node configs
    "@name":{type:"string", test:{'notinstanceof':{'asset':'THREE.Scene'}}},
    name:"",

    "@mass":{type:"float", min:0, test:{'notinstanceof':{'asset':'THREE.Scene'}}},
    mass:1,

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

        this.asset = this.entity.getNode();
        
        if( scene == this.asset ){

            this.pool.silence("getWorldBounds");

            this.bounds = new THREE.Box3().setFromObject( this.asset );

            var cfg = {};
            if( this.frameRate )
                cfg.fixedTimeStep = 1 / this.frameRate;

            this.node = Physijs.Scene(cfg, this.entity.getNode());

            this.scene = this.node;

            cmp.PhysiJS.Service.add( this ).setGravity( this.gravity );

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

    onReady:function(){
        var entity = this.entity, asset = this.entity.getNode(), node, scope = this;

        if( this.node == this.scene )
            return;
        
        var type = this.mesh + "Mesh";
        node = this.node = Physijs[ type ]( null, null, this.mass, asset );

        node.entity = this.entity;
        node.friction = this.friction;
        node.restitution = this.bounciness;

        node.setDamping( this.linearDamping, this.angularDamping );

        if( this.name )
            node.addEventListener('collision', function(other, linear, angular){
                if( !entity.isAlive || !other.entity.isAlive )
                    return;

                var cb = entity["onHit" + other.entity.physiJS.name];
                if( scope.node && other.entity.physiJS.node && cb )
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

        if( this.node != this.scene ){
            this.scene.remove( this.node );
            this.node = null;
        } else {
            cmp.PhysiJS.Service.remove(this);
            this.scene._worker.onmessage = null;
            this.scene._worker = null;
        }
        this.scene = null;

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

    viscosity:0,
    '@setMediumViscosity':{ v:{type:'float'} },
    setMediumViscosity:function(v){
        v = Math.max(0, Math.min( 1, v||0 ) );
        if( v === this.viscosity )
            return;
        this.viscosity = v;
        this.node.setDamping( Math.max(this.linearDamping, v), Math.max(this.angularDamping, v) );
    },

    '@applyTorque':{ torque:{type:'vec3f'} },
    applyTorque:function( torque ){
        if( arguments.length == 3 || !torque )
            torque = { x:arguments[0]||0, y:arguments[1]||0, z:arguments[2]||0 };
        this.node.applyTorque( torque );
    },

    '@addForce':{ force:{type:'vec3f'} },
    addForce:function( _force ){
        var force = _force; // work-around: Not optmized: Assignment to parameter in arguments object
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
        instances:{},

        add:function( l ){
            if( !l || !l.pool || !l.entity )
                return;

            var instance = this.instances[ l.scene.id ];

            if( !instance )
                this.instances[ l.scene.id ] = instance = new cmp.PhysiJS.Service();
            
            instance.add( l );

            l.pool.silence('onPhysicsUpdate')
            l.scene.add('update', function(){
                l.pool.call('onPhysicsUpdate');
            });

            return instance;
        },

        remove:function( l ){
            if( !l || !this.instances[ l.scene.id ] ) return;
            this.instances[ l.scene.id ].remove(l);
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