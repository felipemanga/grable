CLAZZ("cmp.ThreeNode", {
    INJECT:["entity", "gameState", "asset", "scripts"],

    CONSTRUCTOR:function(){
        var entity = this.entity, script;
        if( entity.isClone ){
            var parent = this.asset.parent;
            this.asset = this.asset.clone();
            parent.add( this.asset );
            CLAZZ.set("asset", this.asset);
        }

        entity.position = this.asset.position;
        entity.rotation = this.asset.rotation;
        entity.scale = this.asset.scale;

        function addComponent( name, data ){
            if( typeof name != "string" && script.hidden ){
                data = name;
                name = script.name;
            }

            entity.addComponent( name, data );
        };
        
        for( var i=0; i<this.scripts.length; ++i ){
            script = this.scripts[i];
            try{
                var f = new Function('pool', 'addComponent', script.source);
                f.call(this.asset, this.gameState.pool, addComponent);
            }catch(ex){
                console.warn(ex);
            }
        }
    },

    getNode:function(){
        return this.asset;
    }
})