CLAZZ("cmp.SetRenderOrder", {
	INJECT:["entity", "asset", "order"],

    '@order':{type:'int', 'min':1},
    order: 0,

	onReady:function(){

		this.entity.getNode().renderOrder = this.order;

	},

    preview:function(){

        this.asset.renderOrder = this.order;

    },

    setNode:function( node ){

        if( node )
            node.renderOrder = this.order;

    }
});