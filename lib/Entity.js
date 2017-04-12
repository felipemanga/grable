CLAZZ("Entity",{
    INJECT:["descriptor", "pool", "call", "gameState", "game", "isClone"],
    isClone:false,
    isAlive:true,
    descriptor:null,
    methods:null,
    multifunc:null,
    blackboard:null,

    CONSTRUCTOR:function( descriptor ){
        
        this.blackboard = Object.create( this.gameState.blackboard );
        this.blackboard.gameState = this.gameState.blackboard;

        this.methods = DOC.merge(this.constructor.methods);
        this.multifunc = {};

        this.descriptor = descriptor = descriptor || this.descriptor || {};

        if( descriptor ){

            if( descriptor.components ){

                var srccom = descriptor.components;
                for( var k in srccom )
                    this.addComponent(k, srccom[k]);

            }

            this.apply(descriptor);
        }

        this.pool.add(this);

        if( typeof this.create == "function" )
            this.create();
    },

    clone:function(){
        var data = Object.assign({isClone:true}, this.descriptor), inject = {};

        if( this.multifunc.clone ) 
            this.multifunc.clone( data, inject );
            
        return this.gameState.addEntity( data, inject );
    },

    destroy:function(){
        if( !this.isAlive ){
            console.log("double destroy");
            debugger;
        }
        this.isAlive = false;
        if( this.multifunc.destroy ) this.multifunc.destroy();
        this.pool.remove(this);
    },

    message:function( msgs ){
        if( !msgs ){
            console.warn( this.asset.name, "Bad message list:", msgs);
            return;
        }

        var target = null;
        if( typeof msgs[0] == 'string' ) msgs = [msgs];
        for( var i=0, l=msgs.length; i<l; ++i ){
            var msg = msgs[i];
            if( msg[0] == "" ) 
                target = this;
            else if( msg[0] == 'broadcast' ){
                return this.pool.call.apply( this.pool, [msg[1]].concat(msg[2]) );
            }else{
                if( typeof msg[0] == "string" ){
                    target = this.pool.call("getEntity" + msg[0]);
                    msg[0] = target;
                }
                if( !target ) return;
            }

            if( msg[1] in target ){
                // console.log(target.__uid, msg[1]);
                target[msg[1]].apply(target, msg[2]);
            }
        }
    },

    apply:function(o){
        var R = DOC.resolve;
        if( typeof o == "function" ){
            var args = [];
            for( var i=1, l=arguments.length; i<l; ++i )
                args[i-1] = arguments[i];
            o.apply(this, args);
        }else{
            for( var k in o ){
                var parts = k.split("."), pos=0;
                var c = this;
                while(parts.length > pos+1){
                    if( !c[parts[pos]] )
                        c[parts[pos]] = {};

                    c = c[parts[pos++]];                
                }
                var r = c[parts[pos]];
                if( typeof r == "function" && o[k] instanceof Array) r.apply(c, o[k]);
                else c[parts[pos]] = o[k];
            }
        }
    },

    _addMethod:function( inst, name, bound ){
        var k = name, v = this[k];
        bound = bound || inst[k].bind(inst);
        
        if( v === undefined ) this[k] = bound;
        else if( k in this.constructor.methods ){
            if( !this.multifunc[k] ) this.multifunc[k] = getMulti([bound]);
            else this.multifunc[k].list.push(bound);
        }else if( !("list" in v) ) this[k] = getMulti([ v, bound ]);
        else v.list[v.list.length] = bound;
        
        if( !this.methods[k] )
            this.methods[k] = this[k];

        function getMulti(list){
            multi.list = list;
            return multi;

            function multi(){
                var args = [], list=multi.list, ret=undefined;
                for( var i=0, l=arguments.length; i<l; i++ ) args[i] = arguments[i];
                for( i=0, l=list.length; i<l; i++ ){
                    var tmp = list[i].apply(null, args);
                    if( tmp !== undefined ) ret = tmp;
                }
                return ret;
            }
        }            
    },

    addComponent:function( clazz, ctx ){
        var k, inst = CLAZZ.get( clazz, DOC.mergeTo({ entity:this }, ctx) );
        clazz = inst.constructor;

        for( k in inst )
            if( typeof inst[k] === "function" ) this._addMethod( inst, k );

        for( k in clazz.methods )
            this._addMethod( inst, k );

        var name = inst.constructor.NAME[0].toLowerCase() + inst.constructor.NAME.substr(1);
        // if( !(name in this) )
        //    this[name] = inst;
        this.blackboard[ name ] = inst;

        return inst;
    }
});