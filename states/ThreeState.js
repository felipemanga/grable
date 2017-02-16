need([
    "states.State",
    {FQCN:"THREE", URL:"lib/three.js"}
], function( ){

var ThreeGame = CLAZZ({
    INJECT:["gameState", "pool", "json", "container"],

    container:null,

    width:1,
    height:1,

    loader:null,
    camera:null,
    scene:null,
    renderer:null,
    controls:null,
    effect:null, 
    cameraVR:null, 
    isVR:null,
    
    load:function(){
        var json = this.json;
        this.__animateBound = this.__animate.bind(this);
		var loader = this.loader = new THREE.ObjectLoader();

        this.isVR = json.project.vr;

        this.renderer = renderer = new THREE.WebGLRenderer( { antialias: true } );
        renderer.setClearColor( 0x000000 );
        renderer.setPixelRatio( window.devicePixelRatio );

        if ( json.project.gammaInput ) renderer.gammaInput = true;
        if ( json.project.gammaOutput ) renderer.gammaOutput = true;

        if ( json.project.shadows ) {
            renderer.shadowMap.enabled = true;
            // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }

        container.appendChild( renderer.domElement );

        var scene = this.scene = loader.parse( json.scene );

        this.camera = loader.parse( json.camera );

        this.setSize();

        if ( this.isVR === true ) {
            this.cameraVR = new THREE.PerspectiveCamera();
            this.cameraVR.projectionMatrix = camera.projectionMatrix;
            this.camera.add( this.cameraVR );

            this.controls = new THREE.VRControls( this.cameraVR );
            this.effect = new THREE.VREffect( renderer );

            if ( WEBVR.isAvailable() === true ) {
                container.appendChild( WEBVR.getButton( effect ) );
            }

            if ( WEBVR.isLatestAvailable() === false ) {
                container.appendChild( WEBVR.getMessage() );
            }
        }

        for ( var uuid in this.json.scripts ) {

            var object = scene.getObjectByProperty( 'uuid', uuid, true );

            if ( object === undefined ) {

                console.warn( 'APP.Player: Script without object.', uuid );
                continue;

            }

            this.gameState.addEntity({ 
                components:{
                    "cmp.ThreeNode":{
                        scripts: this.json.scripts[ uuid ],
                        asset:object
                    }
                } 
            });
        }
        
    },

    setSize:function(){
        var width = this.width = this.container.clientWidth || 1;
        var height = this.height = this.container.clientHeight || 1;

        if ( this.camera ) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }

        if ( this.renderer ) {
            this.renderer.setSize( width, height );
        }
    },


    prevTime:0,
    request:0,
    __animateBound:null,
	__animate: function ( time ) {
		this.request = requestAnimationFrame( this.__animateBound );

        var delta = (time - this.prevTime)/1000;
        this.pool.call("onTick", delta );
        this.pool.call("onPostTick", delta );

        if ( this.isVR === true ) {
            this.camera.updateMatrixWorld();
            this.controls.update();
            this.effect.render( this.scene, this.cameraVR );
        } else {
            this.renderer.render( this.scene, this.camera );
        }

        this.prevTime = time;        
    },

    start:function(){
        this.request = requestAnimationFrame( this.__animateBound );
    }
});

CLAZZ("states.ThreeState", {
    MIXIN:["states.State"],
    INJECT:["pool", "resources", "name", "DOM"],
    game:null,
    ldr:null,

    files:null,

    CONSTRUCTOR:function(){
        this.initState();

        this.ldr = new DOC.Loader();
        this.files = {};
        var load = {};
        for( var k in this.load )
            load[k] = this.load[k].bind(this);
        this.load = load;

        this.initResources();
        setTimeout(() => this.ldr.start(this.__onResourcesLoaded.bind(this)), 1);
    },

    __onResourcesLoaded:function(){
        CLAZZ.set("gameState", this);
        this.game = CLAZZ.get(ThreeGame, {
            gameState:this,
            pool:this.pool,
            container:this.DOM.container,
            json:this.resources
        });
        CLAZZ.set("game", this.game);

        this.game.load();
        
        this.create();

        this.game.start();
    },

    getCamera:function(){
        return this.game.camera;
    },

    load:{
        scripts:function( scripts ){
            for( var k in scripts ){
                var scriptList = scripts[k];
                for( var i=0; i<scriptList.length; ++i ){
                    var script = scriptList[i];
                    if( script.hidden )
                        this.ldr.load(script.name.replace(/\./g, '/')+'.js')
                }
            }
        }
    }
});

});