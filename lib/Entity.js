CLAZZ("Entity",{
    INJECT:["descriptor", "pool", "call", "gameState", "game"],
    descriptor:null,

    CONSTRUCTOR:function( descriptor ){
        descriptor = descriptor || this.descriptor || {};

        if( descriptor ){
            if( descriptor.components ){
                var srccom = descriptor.components;
                for( var k in srccom ){
                    var inst = this.addComponent(k, srccom[k]);
                    var name = inst.constructor.NAME[0].toLowerCase() + inst.constructor.NAME.substr(1);
                    if( !(name in this) )
                        this[name] = inst;
                }
            }

            this.apply(descriptor);
        }

        this.pool.add(this);

        if( typeof this.create == "function" )
            this.create();
    },

    destroy:function(){
        if( arguments.callee.multi ) arguments.callee.multi();
        this.pool.remove(this);
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

    addComponent:function( clazz, ctx ){
        var k, inst = CLAZZ.get( clazz, DOC.mergeTo({ entity:this }, ctx) );
        clazz = inst.constructor;

        for( k in inst )
            if( typeof inst[k] === "function" ) add.call(this, k);

        for( k in clazz.methods )
            add.call(this, k);

        return inst;

        function add(k){
            var v = this[k], bound = inst[k].bind(inst);
            if( v === undefined ) this[k] = bound;
            else if( k in this.constructor.methods ){
                if( !v.multi ) v.multi = getMulti([bound]);
                else v.multi.list.push(bound);
            }else if( !("list" in v) ) this[k] = getMulti([ v, bound ]);
            else v.list[v.list.length] = bound;
        }

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
    }
});