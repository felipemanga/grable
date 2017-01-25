CLAZZ("cmp.Sprite", {
    INJECT:["entity", "gameState", "asset", "frame"],
    EXTENDS:Phaser.Sprite,
    DYNAMIC:true,
    frame:null,
    
    CONSTRUCTOR:function(){
        SUPER( this.gameState.game, 0, 0, this.asset, this.frame);
        this.game.world.addChild(this);
        this.entity.position = this.position;
        this.entity.anchor = this.anchor;
        this.entity.scale = this.scale;

        // not a NOP!
        this.input = this.input;
        this.animations = this.animations;
    },

    update:function(bail){
        if( bail ) return;
        Phaser.Sprite.prototype.update.call(this);

        if(this.entity.update)
            this.entity.update(true);
    },

    preUpdate:function(bail){
        if( bail ) return;
        Phaser.Sprite.prototype.preUpdate.call(this);
        
        if( this.entity.preUpdate )
            this.entity.preUpdate(true);
    },

    postUpdate:function(bail){
        if( bail ) return;
        Phaser.Sprite.prototype.postUpdate.call(this);
        
        if( this.entity.postUpdate )
            this.entity.postUpdate(true);
    }
    
});