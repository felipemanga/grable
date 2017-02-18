CLAZZ("cmp.Overboard", {
    INJECT:["entity", "pool", "bounds", "onOverboard", "limitSky" ],

    "@boundsType":{type:"enum", options:["world", "manual"]},
    boundsType:"world",

    "@limitSky":{type:"bool", test:{eq:{boundsType:"world"}}},
    limitSky:true,

    "@bounds":{type:"bounds", test:{eq:{boundsType:"manual"}}},
    bounds:null,

    "@onOverboard":{type:"array", meta:{type:"slot"} },
    onOverboard:null,

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

    destroy:function(){
        cmp.Overboard.Service.remove(this);
    },

    '@onOverboardCheck':{__hidden:true},
    onOverboardCheck:function(){
        var b = this.bounds, p = this.entity.position;
        var px = p.x, py = p.y, pz = p.z;
        if( !b ) return;
        var isOverboard = false;
        isOverboard = isOverboard || ( b.x && b.x > p.x );
        isOverboard = isOverboard || ( b.y && b.y > p.y );
        isOverboard = isOverboard || ( b.z && b.z > p.z );
        isOverboard = isOverboard || ( b.width && b.x + b.width < p.x );
        isOverboard = isOverboard || ( this.limitSky && b.y + b.height < p.y );
        isOverboard = isOverboard || ( b.depth && b.z + b.depth < p.z );
        
        if( isOverboard && !this.isOverboard )
            this.entity.message( this.onOverboard );

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