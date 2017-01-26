Phaser.Loader.prototype.__processPack = Phaser.Loader.prototype.processPack;
Phaser.Loader.prototype.processPack = function(pack){
     if( !pack.data.tilesets )
        return this.__processPack(pack);
    
    var sets = pack.data.tilesets;
    for( var i=0, l=sets.length; i<l; ++i ){
        var tileset = sets[i];
        if( tileset.image )
            this.spritesheet( "__SS" + tileset.image, getImagePath(tileset.image), tileset.tilewidth, tileset.tileheight, tileset.tilecount, tileset.margin, tileset.spacing );
        
        else if( tileset.tiles ){
            for( var t=0; t<tileset.tilecount; ++t ){
                var tile = tileset.tiles[t];
                if( tile.image ){
                    this.image( "__OB" + tile.image, getImagePath(tile.image) );
                }
            }
        }
    }

    this.tilemap( pack.key, null, pack.data, Phaser.Tilemap.TILED_JSON );

    function getImagePath(srcPath){
        return (pack.url.replace(/\/[^\/]+$/, "/") + srcPath).replace(/\/\.\//g, "/").replace(/\/[^\/]+\/\.\.\//g, "/");
    }
};