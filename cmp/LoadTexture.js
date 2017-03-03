CLAZZ("cmp.LoadTexture", {
    INJECT:["entity", "asset", "texture", "type", "onLoad", "onError"],

    "@texture":{type:"texture"},
    texture:null,

    "@type":{ type:"enum", fromKeys:'material', filter:'[Mm]ap$', test:{ neq:{'material.isShaderMaterial':true}} },
    type:null,

    "@uniform":{ type:"enum", fromKeys:'material.uniforms', test:{ eq:{'material.isShaderMaterial':true} } },
    uniform:null,

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
            var cache = cmp.LoadTexture.cache[this.texture];
            if( !cache ){
                cache = cmp.LoadTexture.cache[this.texture] = {texture:texture, listeners:[onLoad]};
                var tl = new THREE.TextureLoader();
                texture = cache.texture = tl.load( this.texture, function(){
                    while( cache.listeners.length )
                        cache.listeners.pop()();
                    cache.listeners = null;
                }, undefined, onError );
            } else {
                var texture = cache.texture;
                if( cache.listeners )
                    cache.listeners.push(onLoad);
                else
                    onLoad();
            }
        }

        function onLoad(){
            var key = scope.type || scope.uniform;

            if( key in scope.asset.material )
                scope.asset.material[ key ] = texture;
            else if( key in scope.asset.material.uniforms )
                scope.asset.material.uniforms[ key ].value = texture;

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