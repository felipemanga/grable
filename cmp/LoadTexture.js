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

    create:function(){
        var scope = this, texture;
        if( this.texture && this.type ){
            var tl = new THREE.TextureLoader();
            texture = tl.load( this.texture, onLoad, undefined, onError );
        }

        function onLoad(){
            scope.asset.material[scope.type] = texture;
            if( scope.onLoad )
                scope.entity.message(scope.onLoad);
        }

        function onError(){
            if( scope.onError )
                scope.entity.message(scope.onError );
        }
    }

});