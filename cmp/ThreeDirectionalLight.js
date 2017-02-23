CLAZZ("cmp.ThreeDirectionalLight", {
	INJECT:["asset", "camLeftRight", "camTopBottom", "mapSize"],

    '@camLeftRight':{ type:'vec2f' },
    camLeftRight:{x:-1000, y:1000},

    '@camTopBottom':{ type:'vec2f' },
    camTopBottom:{x:1000, y:-1000},

    '@mapSize':{ type:'vec2i' },
    mapSize:{x:512, y:512},

	onReady:function(){

		var light = this.asset;
		light.shadow.mapSize.x = this.mapSize.x;
		light.shadow.mapSize.y = this.mapSize.y;

		light.shadow.camera.right = this.camLeftRight.y;
		light.shadow.camera.left = this.camLeftRight.x;
		light.shadow.camera.top = this.camTopBottom.x;
		light.shadow.camera.bottom = this.camTopBottom.y;
		
		light.shadow.camera.updateProjectionMatrix();
	},

    preview:function(){
        this.onReady();
    }
});