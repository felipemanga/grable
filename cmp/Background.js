CLAZZ("cmp.Background", {
    INJECT:["entity", "gameState", "asset"],
    EXTENDS:Phaser.Group,
    CONSTRUCTOR:function(){
        SUPER( this.gameState.game );
        this.game.world.addChild(this);
        this.fixedToCamera = true;

        var assets = this.asset;
        if( !(assets instanceof Array) )
            assets = [assets];

        for( var i=0, l=assets.length; i<l; ++i ){
            var ts = this.game.add.tileSprite(0,0,this.game.width,this.game.height,assets[i],undefined,this);
            ts.tileScale.setTo( this.game.height / ts.texture.height );
        }

        // not a NOP!
        this.preUpdate = this.preUpdate;
        this.postUpdate = this.__postUpdate;
        this.update = this.update;
    },

    __postUpdate:function(){
        var children = this.children;
        for( var i=0, l=children.length; i<l; ++i ){
            var ts = children[i];
            ts.tilePosition.x = - this.gameState.game.camera.position.x * Math.pow(i / (l+1), 3);
        }
        Phaser.Group.prototype.postUpdate.call(this);
    },

    create:function(){
        if( typeof this.entity.update == "function")
            this.update = this.entity.update;

        if( typeof this.entity.postUpdate == "function")
            this.postUpdate = this.entity.postUpdate;

        if( typeof this.entity.preUpdate == "function")
            this.preUpdate = this.entity.preUpdate;
    }
});