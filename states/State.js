CLAZZ("states.State", {
    PROVIDES:{"states.State":"implements"},
    entities:null,
    entityDefinitions:null,
    sceneLoaded:false,
    loadingAsync:0,

    STATIC:{
        activeState:null,
        cache:{}
    },

    initState:function(){
        if( states.State.activeState ){
            if( states.State.activeState == this ) throw "State Reinitialization";
            states.State.activeState.shutdown();
        }
        states.State.activeState = this;

        this.pool.add(this);

        if( !this.entities )
            this.entities = {};

        if( !this.entityDefinitions )
            this.entityDefinitions = {};
    },

    isActive:function(){
        return states.State.activeState == this;
    },

    shutdown:function(){
        this.pool.call("destroy");
        this.pool.remove(this);
    },

    loadJSON:function( path, onLoad ){
        var cache = states.State.cache[path], json, scope = this;
        if( !cache ){

            cache = states.State.cache[path] = {json:json, listeners:[onLoad]};
            scope.pool.call("onLoadingAsyncStart");

            DOC.getURL( path, function( src ){

                try{
                    json = JSON.parse(src);
                }catch(e){
                    json = undefined;
                    console.warn(e);
                }

                while( cache.listeners.length )
                    cache.listeners.pop()( json );
                cache.listeners = null;

                scope.pool.call("onLoadingAsyncEnd");
                
            }, {anystate:true});

        } else {
            json = cache.json;
            if( cache.listeners )
                cache.listeners.push(onLoad);
            else
                onLoad( json );
        }
    },

    initResources:function(){
        for( var method in this.resources ){
            var rec = this.resources[method];
            if( this.load[method] ){
                if( Array.isArray(rec) ){
                    for( var i=0; i<rec.length; ++i )
                        this.load[method].apply( this.load, rec[i] );
                }else this.load[method].call( this.load, rec );
            }else if( method == "class" ){
                for( var k in rec ){
                    var def = this.entityDefinitions[k] = rec[k];
                    if( def.components ){
                        for( var j in def.components ){
                            if( !DOC.resolve(j) )
                                this.load.script( j, j.replace(/\./g, "/") + ".js" )
                        }
                    }
                }
            }
        }
    },

    create:function(){
        var dlist = this.resources.entity;
        if( dlist instanceof Array ){
            console.log("creating entities");
            for( var i=0, l=dlist.length; i<l; ++i )
                this.addEntity.apply(this, dlist[i]);
        }

        if( !this.loadingAsync ){
            this.sceneLoaded = true;
            this.pool.call( "onReady", true );
        }
    },

    onLoadingAsyncStart: function(){
        this.loadingAsync++;
    },

    onLoadingAsyncEnd: function(){
        this.loadingAsync--;
        if( !this.loadingAsync && !this.sceneLoaded ){
            this.sceneLoaded = true;
            this.pool.call("onReady", true);
        }
    },

    addEntity:function(name, inject){
        var e = CLAZZ.get("Entity", DOC.mergeTo({
            gameState:this, 
            game:this.game,
            pool:this.pool,
            call:this.__call.bind(this),
            descriptor:DOC.mergeTo({}, (typeof name == "string" ? this.entityDefinitions[name] : name), inject)
        }, inject));

        if( this.sceneLoaded && e.onReady )
            e.onReady( false );

        return e;
    },

    __call:function(method){
        var args = [];
        for( var i=0; i<arguments.length; ++i )
            args[i] = arguments[i];
        this.pool.call.apply(this.pool, args);

        args.shift();
        for( var k in this.entities ){
            var e = this.entities[k];
            if( e instanceof Array ){
                for( i=0, l=e.length; i<l; ++i ){
                    if( typeof e[i][method] == "function" )
                        e[i][method].apply(e[i], args);
                }

            }else if( typeof e.method == "function" ) {
                e[method].apply(e, args);
            }
        }
    }

});