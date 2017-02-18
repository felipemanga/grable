CLAZZ("cmp.ThreeNode", {
    INJECT:["entity", "gameState", "asset", "scripts"],

    CONSTRUCTOR:function(){
        var entity = this.entity, script;
        if( entity.isClone ){
            var parent = this.asset.parent;

            this.asset = this.asset.clone();
            CLAZZ.set("asset", this.asset);

            if( parent )
                parent.add( this.asset );
        }

        this.setNode( this.asset );
        this.entity._addMethod( this.entity, "getEntity" + this.asset.uuid, function(){ return this; });

        function addComponent( name, data ){
            if( script.hidden == true ) script.type = 'component';
            if( typeof name != "string" && script.type == 'component' ){
                data = name;
                name = script.name;
                if( !name ) return;
            }

            entity.addComponent( name, data );
        };
        
        for( var i=0; i<this.scripts.length; ++i ){
            script = this.scripts[i];
            try{
                var f = new Function('pool', 'addComponent', script.source);
                f.call(this.asset, this.gameState.pool, addComponent);
            }catch(ex){
                console.warn( script.name, ex );
            }
        }
    },

    destroy:function(){
        if( this.asset && this.asset.parent )
            this.asset.parent.remove( this.asset );
    },

    '@setPosition':{ position:{type:'vec3f'} },
    setPosition:function( position ){
        if( arguments.length == 3 || !arguments[0] ){
            this.entity.position.x = arguments[0] || 0;
            this.entity.position.y = arguments[1] || 0;
            this.entity.position.z = arguments[2] || 0;
        }else{
            this.entity.position.x = position.x || 0;
            this.entity.position.y = position.y || 0;
            this.entity.position.z = position.z || 0;
        }
    },

    '@setRotation':{ position:{type:'vec3f'} },
    setRotation:function( position ){
        if( arguments.length == 3 || !arguments[0] ){
            this.entity.rotation.x = arguments[0] || 0;
            this.entity.rotation.y = arguments[1] || 0;
            this.entity.rotation.z = arguments[2] || 0;
        }else{
            this.entity.rotation.x = position.x || 0;
            this.entity.rotation.y = position.y || 0;
            this.entity.rotation.z = position.z || 0;
        }
    },    

    '@setScale':{ position:{type:'vec3f'} },
    setScale:function( position ){
        if( arguments.length == 3 || !arguments[0] ){
            this.entity.scale.x = arguments[0] || 0;
            this.entity.scale.y = arguments[1] || 0;
            this.entity.scale.z = arguments[2] || 0;
        }else{
            this.entity.scale.x = position.x || 0;
            this.entity.scale.y = position.y || 0;
            this.entity.scale.z = position.z || 0;
        }
    },    

    '@setNode':{ __hidden:true },
    setNode:function( asset, optval ){
        var opts = {
            keepPosition:true,
            keepRotation:true,
            keepScale:true,
            parent:true,
            remove:true,
            dispose:true
        };

        for( var k in optval )
            if( k in opts ) opts[k] = optval[k];

        var entity = this.entity, oldAsset = this.asset;
        this.asset = asset;

        if( oldAsset && asset != oldAsset ){

            if( opts.keepPosition ) asset.position.copy( oldAsset.position );
            if( opts.keepRotation ) asset.rotation.copy( oldAsset.rotation );
            if( opts.keepScale ) asset.scale.copy( oldAsset.scale );
            if( opts.parent === true ) oldAsset.parent.add(asset);

            if( opts.remove || opts.dispose ) oldAsset.parent.remove(oldAsset);
            if( opts.dispose && oldAsset.dispose ) oldAsset.dispose();
        }

        entity.position = asset.position;
        entity.rotation = asset.rotation;
        entity.scale    = asset.scale;
        asset.entity = this.entity;
    },

    '@getNode':{ __hidden:true },
    getNode:function(){
        return this.asset;
    }
})