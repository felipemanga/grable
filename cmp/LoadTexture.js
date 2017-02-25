CLAZZ("cmp.LoadTexture", {
    INJECT:["entity", "asset", "texture", "type", "onLoad", "onError"],

    "@texture":{type:"texture"},
    texture:null,

    "@type":{ type:"enum", fromKeys:'material', filter:'[Mm]ap$' },
    type:null,

    "@onLoad":{type:'array', subtype:'slot'},
    onLoad:null,

    "@onError":{type:'array', subtype:'slot'},
    onError:null,

    STATIC:{
        cache:{}
    },

    create:function(){
        var scope = this, texture;
        if( this.texture && this.type ){
            var texture = cmp.LoadTexture.cache[this.texture];
            if( !texture ){
                var tl = new THREE.TextureLoader();
                texture = tl.load( this.texture, onLoad, undefined, onError );
                cmp.LoadTexture.cache[this.texture] = texture;
            }
        }

        function onLoad(){
            scope.asset.material[scope.type] = texture;
            scope.asset.material.needsUpdate = true;
            if( scope.onLoad )
                scope.entity.message(scope.onLoad);
        }

        function onError(){
            if( scope.onError )
                scope.entity.message(scope.onError );
        }
    }

});