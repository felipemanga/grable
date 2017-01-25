CLAZZ("cmp.Collision",{
    INJECT:["gameState", "entity", "check", "handle"],
    handle:null,
    check:null,
    enabled:true,
    hit:null,

    CONSTRUCTOR:function(){
        if( this.handle ){
            var list = this.gameState.entities[this.handle];
            if( !list ) list = this.gameState.entities[this.handle] = [];
            list.push(this.entity);
        }
        if( this.check )
            this.update = this.__update;
        this.entity.bounds = this.entity.bounds || null;
    },

    update:function(){
        if( !this.enabled )
            return;

        var bounds = this.entity.bounds = this.entity.getBounds();
        this.entity.displayObjectUpdateTransform();
        if( this.check ){
            var check = this.check, entities = this.gameState.entities;
            for( var k in check ){
                var otherSet = entities[k];
                if( !otherSet ) continue;
                for( var i=0, l=otherSet.length; i<l; ++i ){
                    var other = otherSet[i];
                    if (other.bounds && Phaser.Rectangle.intersects(bounds, other.bounds)){
                        this.hit = other;
                        this.entity.apply(check[k]);
                    }
                }
            }
        }
    },

    destroy:function(){
        if( this.handle ){
            var list = this.gameState.entities[this.handle];
            list.splice( list.indexOf(this.entity), 1 );
        }
    }
});