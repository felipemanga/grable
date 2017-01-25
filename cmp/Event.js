CLAZZ("cmp.Event", {
    INJECT:["entity", "event"],
    CONSTRUCTOR:function(){
        for( k in this.event ){
            this[k] = checkEvent.bind(this, this.event[k]);
        }

        function checkEvent(map){
            this.entity.apply(map);
        } 
    }
});