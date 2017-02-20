CLAZZ("lib.Task", {
    all:null,
    idle:null,
    busy:null,
    queue:null,
    broadcast:null,
    cb:null,

    CONSTRUCTOR:function( headers, stub ){
		this.all = [];
		this.idle = [];
		this.busy = {};
		this.queue = [];
		this.broadcast = [];
        this.cb = [];

        headers = headers || [];
        var sources = [], count = 0;
        
        headers.forEach( (h, i) => DOC.getURL( h, (src) => onGotHeader.call(this, h, i, src) ) );

        if( !headers.length )
            this.onLoadHeaders(sources, stub);

        function onGotHeader(h, i, src){
            sources[i] = src;
            count++;
            if( count == headers.length )
                this.onLoadHeaders(sources, stub);
        }
    },

    onLoadHeaders:function(headers, stub){
        var workersrc = "";
        for( var k in stub ){
            var v = stub[k];
            workersrc += "self['" + k + "'] = " + serialize(v) + ";\n";
        }

        workersrc += headers.join("\n") + this.workerSource.toString().replace(/^[^{]+\{/, "").replace(/\}\s*$/, "");
        
        var url = window.URL.createObjectURL(new Blob([ workersrc ], { type: "text/javascript" }));
        var cores = (Math.max(2, navigator.hardwareConcurrency) || 5)-1;

        for( var i=0; i<cores; ++i ){
            var worker = new Worker(url);
            this.all.push(worker);
            if( !this.broadcast ) this.idle.push(worker);
            worker.busyCount = 1;
            worker.id = DOC.getUID();
            for( var j=0; j<this.broadcast.length; ++j )
                this.sendMessage( worker, this.broadcast[j].call, this.broadcast[j].args );
            worker.onmessage = this.onWorkerMessage.bind(this, worker);
        }
        this.broadcast.length = 0;

        return;

        var skip;

        function serialize(obj){
            if( !skip ) skip = [];

            if( !obj || (typeof obj != "object" && typeof obj != "function") ) return JSON.stringify(obj);
            var a = [];
            for( var k in obj ){
                var v = obj[k];
                a[a.length] = JSON.stringify(k) + ":" + serialize(v);
            }
            
            return "{" + a.join(",") + "}";
        }
    },

    call:function( call, args, moves, cb ){
        if( this.idle.length ){
            var worker = this.idle.pop();
            this.sendMessage(worker, call, args, moves, cb);
        }else this.queue.push({call:call, args:args, moves:moves, cb:cb});
    },

    each:function( call ){
        var args = [];
        for( var i=1; i<arguments.length; ++i ) args[i-1] = arguments[i];
        if( this.all.length == 0 )
            this.broadcast[this.broadcast.length] = {call:call, args:args};
        else{
            this.all.forEach( worker => this.sendMessage(worker, call, args) )
            this.all = this.all.concat(this.idle);
            this.idle.length = 0;
        } 
    },

    sendMessage:function( worker, call, args, moves, cb ){
        var id = DOC.getUID();
        this.cb[ id ] = cb;
        worker.busyCount++;
        worker.postMessage({
            call:call.toString(),
            args:args,
            id:id
        }, moves);
    },
    
    onWorkerMessage:function(worker, e){
        var value = e.data.ret;
        if( e.data.id && this.cb[e.data.id] ){
            if( e.data.reply ){
                for( var i=0; i<e.data.instance.length; ++i ){
                    var c = window[e.data.instance[i]];
                    if( !c ) continue;
                    value[i] = new c(value[i]);
                }
                this.cb[e.data.id].apply(null, value);
            }else
                this.cb[e.data.id](value);
            this.cb[ e.data.id ] = undefined;
        }

        if( --worker.busyCount )
            return;

        if( this.queue.length ){
            var task = this.queue.shift();
            this.sendMessage( worker, task.call, task.args, task.moves, task.cb );
        }else{
            this.idle[this.idle.length] = worker;
        }
    },

    workerSource:function(){
        function COPY(v){
            if( this == self ) return new COPY(v);
            this.value = v;
        }

        function MOVE(v){
            if( this == self ) return new MOVE(v);
            this.value = v;
        }

        function NESTED(v){
            if( this == self ) return new NESTED(v);
            this.value = v;
        }

        function REPLY(){
            var args = [], moves = [], instance = [];
            this.values = args;
            this.moves = moves;
            this.instance = instance;

            function check( a, i ){
                if( a instanceof MOVE ){
                    if( i !== undefined ) instance[i] = a.value.constructor.name;
                    a = a.value.buffer;
                    moves[moves.length] = a;
                }

                else if( a instanceof COPY ){
                    if( i !== undefined ) instance[i] = a.value.constructor.name;
                    a = a.value;
                }

                else if( a instanceof NESTED ){
                    a = a.value;
                    for( var k in a ){
                        var ak = a[k];
                        if( ak && typeof ak == "object" )
                            a[k] = check(ak);
                    }
                }
                
                else if( a.buffer && self.SharedArrayBuffer &&  a.buffer instanceof self.SharedArrayBuffer ){
                    if( i !== undefined ) instance[i] = a.constructor.name;
                    moves[moves.length] = a.buffer;
                    a = a.buffer;
                }
                return a;
            }

            for( var i=0; i<arguments.length; ++i ){
                var a = arguments[i];
                if( a && typeof a == "object" )
                    a = check(a, i);
                args[i] = a;
            }
        }

        onmessage = function(e){

            var _waiting = false;
            function WAIT(){ _waiting=true; }

            var func, args, ret;

            try{
                func = eval("(" + e.data.call + ")");
                ret = func.apply(self, e.data.args || []);
            }catch(e){
                ret = new REPLY(null, e.stack);
            }            
            
            function RETURN(ret){
                var transfer = undefined, msg = {
                    reply: false,
                    id: e.data.id,
                    ret: ret
                };

                if( ret instanceof REPLY ){
                    msg.ret = ret.values;
                    msg.reply = true;
                    msg.instance = ret.instance;
                    transfer = ret.moves;
                }
                
                postMessage( msg, transfer );
            }

            if( !_waiting ) RETURN(ret);
        }
        postMessage({ready:true});
    }
});