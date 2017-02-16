CLAZZ("cmp.Overboard", {
    INJECT:["entity", "pool", "bounds", "scope", "messageTarget", "message", "messageArgs", "limitSky" ],

    "@boundsType":{type:"enum", options:["world", "manual"]},
    boundsType:"world",

    "@limitSky":{type:"bool", test:{eq:{boundsType:"world"}}},
    limitSky:true,

    "@bounds":{type:"bounds", test:{eq:{boundsType:"manual"}}},
    bounds:null,

    "@scope":{type:"enum", options:["destroy", "broadcast", "message", "entity"]},
    scope:"destroy",

    "@messageTarget":{type:"node", test:{nin:{scope:["broadcast", "entity"]}} },
    messageTarget:"entity",

    "@message":{type:"string", test:{ neq:{scope:"destroy"} }, trim:true },
    message:null,

    "@messageArgs":{type:"array", subtype:"json", test:{ neq:{scope:"destroy"} } },
    messageArgs:[],

    isOverboard:false,

    create:function(){
        if( !this.bounds ){
            this.bounds = {};
            this.pool.call("getWorldBounds", this.bounds);
            if( !this.limitSky )
                this.bounds.height = 0;
        }
        
        cmp.Overboard.Service.add(this, "check");
    },

    onSceneLoaded:function(){
        if( this.messageTarget == "entity" ){
            this.messageTarget = this.entity;

            if( this.scope == "entity" )
                this.scope = "message";
        }
        else if( this.messageTarget )
            this.messageTarget = this.pool.call( 'getEntity' + this.messageTarget );

        if( this.scope == "destroy" ){
            this.scope = "message";
            this.message = "destroy";
        }
    },

    destroy:function(){
        cmp.Overboard.Service.remove(this);
    },

    onOverboardCheck:function(){
        var b = this.bounds, p = this.entity.position;
        var px = p.x, py = p.y, pz = p.z;
        if( !b ) return;
        var isOverboard = false;
        isOverboard = isOverboard || ( b.x && b.x > p.x );
        isOverboard = isOverboard || ( b.y && b.y > p.y );
        isOverboard = isOverboard || ( b.z && b.z > p.z );
        isOverboard = isOverboard || ( b.width && b.x + b.width < p.x );
        isOverboard = isOverboard || ( b.height && b.y + b.height < p.y );
        isOverboard = isOverboard || ( b.depth && b.z + b.depth < p.z );
        
        if( isOverboard && !this.isOverboard ){
            if( this.scope == "broadcast" ){
                this.pool.call.apply( this.pool, [this.message].concat(this.messageArgs || []) );
            }else{
                var node = this.messageTarget;
                if( !node || typeof node[ this.message ] != "function" ) return;
                node[this.message].apply( node, this.messageArgs || [] );
            }
        }

        this.isOverboard = isOverboard;
    }
});

CLAZZ("cmp.Overboard.Service", {
    listeners:null,
    pool:null,
    pos:0,

    add:function(l, evt){
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
            if( !l || !l.pool || !l.entity || typeof l.entity.onOverboardCheck != "function" )
                return;

            if( !this.instance )
                this.instance = new cmp.Overboard.Service();
            
            this.instance.add( l );
        },

        remove:function( l ){
            if( !l || !this.instance ) return;
            this.instance.remove(l);
        }
    },

    onTick:function(){
        if( !this.listeners || !this.listeners.length ) return;

        var l = this.listeners[ this.pos++ ];
        if( l === undefined ) l = this.listeners[ (this.pos=0) ];

        l.onOverboardCheck();
    }
})