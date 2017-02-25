"use strict";

CLAZZ("Main", {
    DOM:null,
    pool:null,

    CONSTRUCTOR:function(){
        this.pool = new DOC.Pool();
        this.DOM = DOC.index(document.body, null, this);
        this.pool.add(this);
        this.setGameState("boot");
        window.addEventListener("resize", this._onResize.bind(this));
    },

    _onResize:function(){
        this.pool.call("onDOMResize", this.DOM.offsetWidth, this.DOM.offsetHeight );
    },

    setGameState:function( strstate ){
        var state = DOC.resolve( "resources.states." + strstate );
        if( !state ){
            console.log("Game state not defined: resources.states." + strstate )
            return;
        }
        
        CLAZZ.get( state.clazz || "GameState", {
            resources:state,
            pool:this.pool,
            name:strstate,
            DOM:this.DOM
        });
    }
});