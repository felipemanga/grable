CLAZZ("cmp.Event", {
    INJECT:["entity", "events"],

    '@events':{ type:'object', meta:{ type:'array', default:null, meta:{ type:'slot' } } },
    events:null,

    disabled:null,

    CONSTRUCTOR:function(){
        this.disabled = {};

        var events = this.events, scope = this;
        for( var k in events )
        {
            if( events[k] )
            {
                var messages = events[k].filter( e => e && e[1] );

                if( messages.length )
                    this[k] = getCallback( k, messages );
            }
        }

        function getCallback( event, messages ){
            return function(){
                if( scope.disabled[event] ){
                    if( scope.disabled[event] < performance.now() )
                        scope.disabled[event] = 0;
                    else 
                        return;
                }
                scope.entity.message( messages );
                // this.entity.message.bind( this.entity, eventList );
            }
        }
    },

    '@disableEvent':{ name:{type:'string'}, timeToEnable:{type:'int', min:0} },
    disableEvent:function( name, timeToEnable ){
        if( !this.events[name] ) return;
        this.disabled[name] = performance.now() + timeToEnable;
    }
});