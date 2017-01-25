"use strict";

CLAZZ("Main", {
    DOM:null,
    game:null,
    pool:null,

    CONSTRUCTOR:function(){
        this.pool = new DOC.Pool();
        this.DOM = DOC.index(document.body, null, this);
        this.pool.add(this);
        this.setGameState("boot");
    },

    setGameState:function( strstate ){
        var state = DOC.resolve( "resources.states." + strstate );
        if( !state ){
            console.log("Game state not defined: resources.states." + strstate )
            return;
        }
        
        var inst = CLAZZ.get( state.clazz || "GameState", {
            resources:state,
            pool:this.pool
        });

        if( this.game ) this.game.state.add( strstate, inst, true );
        else this.game = new Phaser.Game( 1920, 1080, Phaser.AUTO, this.DOM.container, inst );
    }
});