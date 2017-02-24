need([
    "lib.LSystem",
    "lib.Task",
    "lib.ProcGeom"
], function(){

function CustomAttribute( buffer, itemSize ){
    THREE.BufferAttribute.call( this, buffer, itemSize );
}

CustomAttribute.prototype = THREE.Float32BufferAttribute.prototype;

CLAZZ("cmp.ThreeTreeGen", {

    INJECT:['entity', 'asset', 'seed', 'iterations', 'source', 'tiles'],

    '@hidePlaceholder':{type:'bool'},
    hidePlaceholder:true,

    "@seed":{type:"int"},
    seed:0xDEADBEEF,

    '@iterations':{ type:'int', min:1, max:20 },
    iterations:5,

    '@source':{ type:'longstring' },
    source: '',

    '@tiles':{ type:'vec2i', min:1 },
    tiles:{x:1, y:1},

    asset:null,

    create: function(){
        if( this.hidePlaceholder )
            this.asset.visible = false;

        cmp.ThreeTreeGen.Service.generate( this, true );
    },

    preview: function(){
        cmp.ThreeTreeGen.Service.generate( this, false );
    },

    _onGenerate: function( mesh )
    {
        var node = this.asset;
        console.log( "onGenerate", mesh );

        if( this.hidePlaceholder )
            node.visible = true;
                    
        if( !mesh || !mesh.position )
            return;

        var geometry;


        var geometry;
        var oldGeometry = node.geometry;
        if( !this.entity ) geometry = node.geometry.clone();
        else geometry = new THREE.BufferGeometry();
        oldGeometry.dispose();

        geometry.addAttribute('position', new CustomAttribute( mesh.position, 3 ) );
        geometry.addAttribute('uv', new CustomAttribute( mesh.uv, 2 ) );
        geometry.addAttribute('normal', new CustomAttribute( mesh.normal, 3 ) );
        geometry.addAttribute('color', new CustomAttribute( mesh.color, 3 ) );
        node.geometry = geometry;

        if( this.entity ){
            this.entity.setPosition(0,0,0);
            this.entity.setRotation(0,0,0);
            this.entity.setScale(1,1,1);

            if( this.entity.onGenerate )
                this.entity.onGenerate();
        } else editor.signals.geometryChanged.dispatch( node );
    }
});

CLAZZ("cmp.ThreeTreeGen.Service", {

    taskman:null,

    CONSTRUCTOR:function(){
        var root = window.ROOT_PATH || "";
        this.taskman = new lib.Task([
            root + "lib/CLAZZ.js",
            root + "lib/doc.js",
            root + "lib/three.js",
            root + "lib/LSystem.js",
            root + "lib/ProcGeom.js",
            root + "lib/mersenne-twister.js"
        ]);
    },

    generate:function( tree, applyTransform ){
        var node = tree.asset || tree.entity.getNode();
        if( !node.geometry.boundingBox )
            node.geometry.computeBoundingBox();

        var box = node.geometry.boundingBox.clone();
        box.applyMatrix4( node.matrixWorld );

        this.taskman.call( this._generate, [{
            iterations: tree.iterations, 
            source: tree.source, 
            seed: tree.seed,
            boundingBox: box,
            matrixWorld: applyTransform ? node.matrixWorld.elements : (new THREE.Matrix4()).identity().elements,
            lod:0,
            tiles: tree.tiles
        }], [], tree._onGenerate.bind( tree ) );
    },

    _generate:function( params ){
        var lsys = new lib.LSystem();

        var MT = new MersenneTwister( params.seed );
        lsys.random = MT.random.bind(MT);

        var proc = new lib.ProcGeom( params.matrixWorld, params.lod, params.tiles, lsys.random );
        var keys = Object.keys( lib.ProcGeom.methods );
        var values = keys.map( k => proc[k].bind(proc) );

        try{
            lsys.source( params.source );
            var code = lsys.generate( params.iterations );
            keys.unshift( null );
            keys.push( code );
            
            func = new (Function.bind.apply( Function, keys ));
            var ret = func.apply( null, values );
            if( ret !== undefined )
                console.log( ret );
                
            var mesh = proc._build();
        }catch( ex ){
            console.log( ex.stack, "\n\n", code );
            debugger;
            return null;
        }

        return new REPLY( new NESTED(mesh) );
    },

    STATIC:{
        instance:null,
        generate:function( tree, applyTransform ){
            if( !this.instance )
                this.instance = new cmp.ThreeTreeGen.Service();
            this.instance.generate( tree, applyTransform );
        }
    }

});

});