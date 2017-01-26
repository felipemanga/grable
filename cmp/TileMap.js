CLAZZ("cmp.TileMap", {
    INJECT:["gameState", "game", "asset"],
    map:null,

    CONSTRUCTOR:function(){
        var json = this.game.cache.getTilemapData(this.asset);
        var mat = new PIXI.Matrix(), edef = this.gameState.entityDefinitions;
        var image, imageframe, gidcache = {}, isometric = json.data.orientation == "isometric";
        var tileheight = json.data.tileheight, tilewidth = json.data.tilewidth;
        var halfWorldWidth = tilewidth * json.data.width * 0.5, halfWorldHeight = tileheight * json.data.height * 0.5;

        for( var layerId=0; layerId<json.data.layers.length; ++layerId ){
            var layer = json.data.layers[layerId];
            if( !layer.visible ) continue;
            var data = layer.data;
            if( layer.encoding == "base64" ){
                data = atob(data);
                var buf = new Uint8Array(data.length);
                for( var i=0, l=data.length; i<l; ++i )
                    buf[i] = data.charCodeAt(i);
                data = new Uint32Array(buf.buffer);
            }

            if( layer.type == "tilelayer" ) addTileLayer.call(this, layer, data);
            if( layer.type == "objectgroup" ) addObjectGroup.call(this, layer, data);
        }

        function addTileLayer(layer, data){
            var x = 0,
                y = 0,
                obj = {x:0, y:0, width:tilewidth, height:tileheight};
            for (var i = 0, ldl=data.length; i < ldl; ++i) {
                var o = data[i];
                if (o) {
                    if( isometric ){
                        obj.x = (x-y) * tilewidth*0.5  + layer.x;
                        obj.y = (x+y) * tileheight*0.5 + layer.y;
                    }else{
                        obj.x = x * tilewidth  + layer.x;
                        obj.y = y * tileheight + layer.y;
                    }
                    obj.y += tileheight;
                    instanceDO.call(this, o, obj, true);
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
                if( isometric ){
                    var tx = obj.x / tileheight; // not a typo.
                    var ty = obj.y / tileheight;
                    obj = DOC.merge(obj, {
                        x: (tx - ty)*tilewidth*0.5 + layer.x,
                        y: (tx + ty)*tileheight*0.5 + layer.y
                    });
                }
                var DO = instanceDO.call(this, obj.gid, obj, isometric);
                if( "width" in obj ) DO.width = Math.sign(DO.scale.x) * obj.width;
                if( "height" in obj ) DO.height = Math.sign(DO.scale.y) * obj.height;
            }
        }

        function instanceDO(gid, obj, adjust){
            var DO, rotation = obj.rotation||0;
            resolveGID(gid & 0x0FFFFFFF);

            if( rotation ) 
                rotation = rotation * (1 / 180) * Math.PI;

            if( obj.type in edef ){
                var entity = this.gameState.addEntity( obj.type, DOC.mergeTo({
                    asset:image,
                    frame:imageframe
                }, obj.properties));
                DO = entity.sprite;
            }else{
                DO = this.game.add.image(0,0,image,imageframe);
            }
            var x = obj.x || 0
                y = obj.y || 0;

            if( isometric ){
                x += json.data.height*tilewidth*0.5;
                y += tileheight;
            }

            DO.position.x = x;
            DO.position.y = y;

            DO.rotation = rotation;
            if(gid & 0x80000000){
                DO.scale.x = -1;
                if( isometric ) DO.anchor.x = 0.5;
                else DO.anchor.x = 1;
            }else{
                if( isometric ) DO.anchor.x = 0.5;
                else DO.anchor.x = 0;
            }
            if(gid & 0x40000000){
                DO.scale.y = -1;
                DO.anchor.y = 0;
            }else DO.anchor.y = 1;
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
