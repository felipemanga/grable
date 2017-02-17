CLAZZ("cmp.SkyBox", {
    INJECT:["entity", "asset", "enabled", "+x", "-x", "+y", "-y", "+z", "-z"],

    "@enabled":{type:"bool", priority:-1},
    enabled:true,

    "@+x":{type:"texture"},
    "+x":'resources/image/px.jpg',
    "@-x":{type:"texture"},
    "-x":'resources/image/nx.jpg',
    "@+y":{type:"texture"},
    "+y":'resources/image/py.jpg',
    "@-y":{type:"texture"},
    "-y":'resources/image/ny.jpg',
    "@+z":{type:"texture"},
    "+z":'resources/image/pz.jpg',
    "@-z":{type:"texture"},
    "-z":'resources/image/nz.jpg',

    create:function(){
        this.load();
    },

    load:function(){
        var scope = this, ctl = new THREE.CubeTextureLoader();
        ctl.load([
		  this['+x'],
		  this['-x'],
		  this['+y'],
		  this['-y'],
		  this['+z'],
		  this['-z'],
		], function( texture ){
            texture.format = THREE.RGBFormat;

            var aShader = THREE.ShaderLib['cube'];
            aShader.uniforms['tCube'].value = texture;

            scope.asset.material.dispose();
            scope.asset.material = new THREE.ShaderMaterial({
                fragmentShader: aShader.fragmentShader,
                vertexShader: aShader.vertexShader,
                uniforms: aShader.uniforms,
                depthWrite: false,
                side: THREE.BackSide
            });
        });
    },

    onTick:function( time ){
        if( !this.enabled )
            return;

    }
})