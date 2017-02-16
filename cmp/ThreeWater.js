need([
    {FQCN:"THREE.Water", URL:"lib/water-material.js"}
], function(){

CLAZZ("cmp.ThreeWater", {
    INJECT:["entity", "game", "asset", "sunLight"],

    "@sunLight":{type:"node", "instanceof":"THREE.Light"},
    sunLight:null,

    water:null,

    onSceneLoaded:function(){
        var entity = this.entity, oldAsset = this.asset;


        var sunDirection, sunColor = 0xffffff;
        if( this.sunLight ){
            var node = this.game.scene.getObjectByProperty( 'uuid', this.sunLight );
            if( node ){
                sunDirection = node.position;
                sunColor = node.color.getHex();
            }else{
                console.log("could not find light node: ", this.sunLight);
            }
        }

        if( !sunDirection ) 
            sunDirection = (new THREE.Vector3(1,1,0)).normalize();

        var waterNormals = oldAsset.material.normalMap;
        if( waterNormals )
            waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping; 
        else
            console.warn("No normalMap in placeholder!");

        var water = this.water = new THREE.Water(
            this.game.renderer,
            this.game.camera,
            this.game.scene, {
                eye: this.game.camera.position,
                waterNormals: waterNormals,
                textureWidth:  512, 
                textureHeight: 512,
                alpha: 	1.0,
                sunDirection: sunDirection,
                sunColor: sunColor,
                waterColor: 0x001e0f,
                distortionScale: 50.0
            });


        var bounds = new THREE.Box3().setFromObject( oldAsset );

		var mirror = new THREE.Mesh(
			new THREE.PlaneBufferGeometry( bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z, 10, 10), 
			water.material
		);
		mirror.add(water);

        mirror.receiveShadow = oldAsset.receiveShadow;
        
        entity.setNode( mirror );
    },

    onPostTick:function( delta ){
        this.water.material.uniforms.time.value += delta;
        this.water.render();
    }

});
    
})