CLAZZ("cmp.Wait", {
    INJECT:["entity", "gameState"],
    wait:function(o, time){
        return setTimeout( cb.bind(this), time);
        function cb(){
            if( this.gameState.isActive() )
                this.entity.apply(o);
        }
    }
});