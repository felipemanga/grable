Phaser.Loader.prototype.__processPack = Phaser.Loader.prototype.processPack;
Phaser.Loader.prototype.processPack = function(pack){
     if( !pack.data.tilesets )
        return this.__processPack(pack);

    var sets = pack.data.tilesets;
    for( var i=0, l=sets.length; i<l; ++i ){
        var tileset = sets[i];
        if( tileset.image )
            this.spritesheet( "__SS" + tileset.image, "resources/image/tiles/" + tileset.image.replace(/.*?([^/]+$)/, "$1"), tileset.tilewidth, tileset.tileheight, tileset.tilecount, tileset.margin, tileset.spacing );
        
        else if( tileset.tiles ){
            for( var t=0; t<tileset.tilecount; ++t ){
                var tile = tileset.tiles[t];
                if( tile.image ){
                    this.image( "__OB" + tile.image, "resources/image/tiles/" + tile.image.replace(/.*?([^/]+$)/, "$1") );
                }
            }
        }
    }

    this.tilemap( pack.key, null, pack.data, Phaser.Tilemap.TILED_JSON );
};