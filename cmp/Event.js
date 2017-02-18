CLAZZ("cmp.Event", {
    INJECT:["entity", "events"],

    '@events':{ type:'object', meta:{ type:'array', default:null, meta:{ type:'slot' } } },
    events:null,

    CONSTRUCTOR:function(){
        var events = this.events;
        for( var k in events ){
            if( events[k] ){
                var eventList = events[k].filter( e => !!e );
                this[k] = this.entity.message.bind( this.entity, eventList );
            }
        }
    }
});