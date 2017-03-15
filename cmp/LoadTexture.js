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
        var key = this.type || this.uniform,
            material = this.asset.material,
            oldTexture;

        if( material.uniforms && key in material.uniforms ){
            oldTexture = material.uniforms[ key ].value;
        } else if( key in material ) {
            oldTexture = material[key];
        }

        if( this.texture ){
            var newTexture = this.entity.call( "loadImage", this.texture, onLoad );
            if( !oldTexture )
                applyTexture( newTexture );
        }

        function onLoad( texture ){

            applyTexture( texture );

            material.needsUpdate = true;

            if( scope.onLoad )
                scope.entity.message(scope.onLoad);
        }

        function applyTexture( texture ){
            if( material.uniforms && key in material.uniforms ){
                material.uniforms[ key ].value = texture;
            } else if( key in material ) {
                material[ key ] = texture;
            }

            if( oldTexture ){
                texture.wrapS = oldTexture.wrapS;
                texture.wrapT = oldTexture.wrapT;
            }
        }

        function onError(){
            if( scope.onError )
                scope.entity.message(scope.onError );
        }
    }

});