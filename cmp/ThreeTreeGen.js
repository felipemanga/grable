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

    INJECT:['entity', 'asset', 'seed', 'iterations', 'source', 'tiles', 'amount', 'ground', 'spread'],

    '@hidePlaceholder':{type:'bool'},
    hidePlaceholder:true,

    '@amount':{type:'int', min:1},
    amount:1,

    '@ground':{type:'node', test:{gt:{amount:1}} },
    ground:null,

    '@spread':{type:'float', test:{gt:{amount:1}} },
    spread:10,

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
        geometry.setIndex(null);
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
        var transfer = [], list = [], params = {
            iterations: tree.iterations, 
            source: tree.source, 
            seed: tree.seed,
            lod:0,
            tiles: tree.tiles
        };

        var a = 0;
        for( var i=0; i<tree.amount; ++i ){
            var transform = new THREE.Matrix4();
            if( applyTransform ) transform.elements.set( node.matrixWorld.elements );
            else transform.identity();
            var r = i/tree.amount * tree.spread;
            var cosa = Math.cos(a * Math.PI * 0.2) * r;
            var sina = Math.sin(a * Math.PI * 0.2) * r;
            a += 1.618033;

            transform.elements[12] += sina;
            // to-do: transform[13] = tree.ground...
            transform.elements[14] += cosa;            
            list[i] = transform.elements;
            transfer[i] = transform.elements.buffer;
        }

        
        this.taskman.call( this._generate, [params, list], transfer, tree._onGenerate.bind( tree ) );
    },

    _generate:function( params, list ){
        var lsys = new lib.LSystem();

        var MT = new MersenneTwister( params.seed );
        lsys.random = MT.random.bind(MT);

        var proc = new lib.ProcGeom( params.lod, params.tiles, lsys.random );
        var keys = Object.keys( lib.ProcGeom.methods );
        var values = keys.map( k => proc[k].bind(proc) );
        keys.unshift( null );

        try{
            lsys.source( params.source );

            for( var i=0; i<list.length; i++ ){
                var code = lsys.generate( params.iterations );
                keys.push( code );
                
                proc.transform.elements.set( list[i] );
                func = new (Function.bind.apply( Function, keys ));
                var ret = func.apply( null, values );
                if( ret !== undefined )
                    console.log( ret );
                
                keys.pop();
            }
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