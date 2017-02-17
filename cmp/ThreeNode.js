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
            if( typeof name != "string" && script.hidden ){
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

    '@message':{ __hidden:true },
    message:function( msgs ){
        if( !msgs ){
            console.warn( this.asset.name, "Bad message list:", msgs);
            return;
        }

        var target = null;
        if( typeof msgs[0] == 'string' ) msgs = [msgs];
        for( var i=0, l=msgs.length; i<l; ++i ){
            var msg = msgs[i];
            if( msg[0] == "" ) 
                target = this.entity;
            else if( msg == 'broadcast' ){
                return this.pool.call( msg[1], msg[2] );
            }else{
                if( typeof msg[1] == "string" ){
                    target = this.pool.call("getEntity" + msg[1]);
                    msg[1] = target;
                }
                if( !target ) return;
            }

            if( msg[1] in target )
                target[msg[1]].apply(target, msg[2]);
        }
    },

    '@setPosition':{ position:{type:'vec3f'} },
    setPosition:function( position ){
        var x, y, z;
        if( arguments.length == 3 ){
            x = arguments[0];
            y = arguments[1];
            z = arguments[2];
        }else{
            x = position.x;
            y = position.y;
            z = position.z;
        }
        this.entity.position.x = x || 0;
        this.entity.position.y = y || 0;
        this.entity.position.z = z || 0;
    },

    '@setRotation':{ position:{type:'vec3f'} },
    setRotation:function( position ){
        var x, y, z;
        if( arguments.length == 3 ){
            x = arguments[0];
            y = arguments[1];
            z = arguments[2];
        }else{
            x = position.x;
            y = position.y;
            z = position.z;
        }
        this.entity.rotation.x = x || 0;
        this.entity.rotation.y = y || 0;
        this.entity.rotation.z = z || 0;
    },    

    '@setScale':{ position:{type:'vec3f'} },
    setScale:function( position ){
        var x, y, z;
        if( arguments.length == 3 ){
            x = arguments[0];
            y = arguments[1];
            z = arguments[2];
        }else{
            x = position.x;
            y = position.y;
            z = position.z;
        }
        this.entity.scale.x = x || 0;
        this.entity.scale.y = y || 0;
        this.entity.scale.z = z || 0;
    },    

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

    getNode:function(){
        return this.asset;
    }
})