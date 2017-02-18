CLAZZ("cmp.Wait", {
    INJECT:["entity", "gameState", "cause", "delay", "effect", "cancelPrevious", "multiple"],
    
    '@cancelPrevious':{type:'bool'},
    cancelPrevious:false,

    '@multiple':{type:'bool'},
    multiple:false,

    '@cause':{type:'string'},
    cause:null,

    '@delay':{type:'int', min:0},
    delay:0,

    '@effect':{type:'slot'},
    effect:null,

    handle:null,

    CONSTRUCTOR:function(){
        if( this.cause && this.effect )
        {
            var scope = this;
            this[ this.cause ] = function(){
                if( scope.handle ){
                    if( scope.cancelPrevious )
                        clearTimeout(scope.handle);
                    else if( !scope.multiple )
                        return;
                }

                scope.handle = setTimeout( function(){
                    scope.handle = null;
                    if( scope.gameState.isActive() )
                        scope.entity.message( scope.effect );
                }, scope.delay );

            };
        }
    },

    destroy:function(){
        if( this.handle )
            clearTimeout(this.handle);
    },
    
    '@wait':{ __hidden:true },
    wait:function(o, time){
        return setTimeout( cb.bind(this), time);
        function cb(){
            if( this.gameState.isActive() )
                this.entity.apply(o);
        }
    }
});