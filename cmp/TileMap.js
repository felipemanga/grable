CLAZZ("cmp.TileMap", {
    INJECT:["gameState", "game", "asset"],
    map:null,

    CONSTRUCTOR:function(){
        var json = this.game.cache.getTilemapData(this.asset);
        var mat = new PIXI.Matrix(), edef = this.gameState.entityDefinitions;
        var image, imageframe, gidcache = {};

        for( var layerId=0; layerId<json.data.layers.length; ++layerId ){
            var layer = json.data.layers[layerId];
            if( layer.type == "tilelayer" ) addTileLayer.call(this, layer);
            if( layer.type == "objectgroup" ) addObjectGroup.call(this, layer);
        }

        function addTileLayer(layer){
            var x = 0,
                y = 0,
                map = json.data,
                obj = {x:0, y:0};
            for (var i = 0, ldl=layer.data.length; i < ldl; ++i) {
                var o = layer.data[i];
                if (o) {
                    obj.x = x * map.tilewidth  + layer.x;
                    obj.y = y * map.tileheight + layer.y;
                    instanceDO.call(this, o, obj);
                }
                x++;
                if (x == layer.width) {
                    x = 0;
                    y++;
                }
            }
        }

        function addObjectGroup(layer){
            for( var objectId=0; objectId<layer.objects.length; ++objectId ){
                var obj = layer.objects[objectId];
                instanceDO.call(this, obj.gid, obj);
            }
        }

        function instanceDO(gid, obj){
            var DO, rotation = obj.rotation||0;
            resolveGID(gid);

            if( rotation ) 
                rotation = rotation * (1 / 180) * Math.PI;

            if( obj.type in edef ){
                var entity = this.gameState.addEntity( obj.name, {
                    asset:image,
                    frame:imageframe
                });
                DO = DO.sprite;
            }else{
                DO = this.game.add.image(0,0,image,imageframe);
            }
            mat.identity().translate( DO.width * DO.anchor.x, DO.height * DO.anchor.y - DO.height).rotate(rotation).translate( obj.x || 0, obj.y || 0 );
            DO.position.x = mat.tx;
            DO.position.y = mat.ty;
            return DO;
        }

        function resolveGID(gid){
            if( gid in gidcache ){
                image = gidcache[gid].image;
                imageframe = gidcache[gid].frame;
            }

            var sets = json.data.tilesets;
            for( var i=0, l=sets.length; i<l; ++i ){
                var tileset = sets[i];
                if( tileset.firstgid + tileset.tilecount <= gid )
                    continue;
                if( tileset.tiles ){
                    image = "__OB" + tileset.tiles[ gid - tileset.firstgid ].image;
                    imageframe = null;
                }else{
                    image = "__SS" + tileset.image;
                    imageframe = gid - tileset.firstgid;
                }
                gidcache[gid]={image:image, frame:imageframe};
                return;
            }
        }
    }
});
