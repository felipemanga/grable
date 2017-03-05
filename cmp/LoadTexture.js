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

    create:function(){
        var scope = this, texture;

        if( this.texture )
            this.entity.call( "loadImage", this.texture, onLoad );

        function onLoad( texture ){
            var key = scope.type || scope.uniform,
                material = scope.asset.material;

            var oldTexture;

            if( material.uniforms && key in material.uniforms ){
                oldTexture = material.uniforms[ key ].value;
                material.uniforms[ key ].value = texture;
            } else if( key in material ) {
                oldTexture = material[key];
                material[ key ] = texture;
            }

            if( oldTexture ){
                texture.wrapS = oldTexture.wrapS;
                texture.wrapT = oldTexture.wrapT;
            }

            material.needsUpdate = true;

            if( scope.onLoad )
                scope.entity.message(scope.onLoad);
        }

        function onError(){
            if( scope.onError )
                scope.entity.message(scope.onError );
        }
    }

});