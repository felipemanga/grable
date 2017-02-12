need([
    "states.State",
    {FQCN:"Phaser.Loader.prototype.patched", URL:"lib/phaserpatch.js"}
], function( ){


CLAZZ("states.PhaserState", {
    MIXIN:["states.State"],
    INJECT:["pool", "resources", "game", "name", "DOM"],
    EXTENDS:Phaser.State,
    game:null,

    CONSTRUCTOR:function(){
        SUPER();
        this.initState();
        if( this.game ) this.game.state.add( this.name, this, true );
        else{
            this.game = new Phaser.Game( 1920, 1080, Phaser.AUTO, this.DOM.container, this );
            CLAZZ.set("game", this.game);
        }
    },

    getCamera:function(){
        return this.game.camera;
    },

    init:function(){
        this.game.stage.disableVisibilityChange = true;
        this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.game.scale.minWidth = this.gameWidth / 10;
        this.game.scale.minHeight = this.gameHeight / 10;
        this.game.scale.maxWidth = this.gameWidth;
        this.game.scale.maxHeight = this.gameHeight;
        this.game.scale.pageAlignHorizontally = true;
        this.game.scale.pageAlignVertically = true;
        this.game.scale.windowConstraints.bottom = "visual";
        this.game.scale.refresh();
    },

    preload:function(){
        if( !this.resources ) return;
        this.initResources();
    }
});

});