need([
    "lib.LSystem",
    "lib.Task"
], function(){

function CustomAttribute( buffer, itemSize ){
    THREE.BufferAttribute.call( this, buffer, itemSize );
}

CustomAttribute.prototype = THREE.Float32BufferAttribute.prototype;

CLAZZ("cmp.ThreeTreeGen", {

    INJECT:['entity', 'seed', 'iterations', 'source'],

    '@hidePlaceholder':{type:'bool'},
    hidePlaceholder:true,

    "@seed":{type:"int"},
    seed:0xDEADBEEF,

    '@iterations':{ type:'int', min:1, max:20 },
    iterations:5,

    '@source':{ type:'longstring' },
    source: '',

    asset:null,

    create: function(){
        this.asset = this.entity.getNode();

        if( this.hidePlaceholder )
            this.asset.visible = false;

        // cmp.ThreeTreeGen.Service.generate( this );
    },

    _onGenerate: function( position, uv, normal )
    {
        var node = this.asset;

        if( this.hidePlaceholder )
            node.visible = true;
                    
        if( !position )
            return;
        
        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute('position', new CustomAttribute( position, 3 ) );
        geometry.addAttribute('uv', new CustomAttribute( uv, 2 ) );
        geometry.addAttribute('normal', new CustomAttribute( normal, 3 ) );
        node.geometry = geometry;

        if( this.entity.onGenerate )
            this.entity.onGenerate();

        console.log( "onGenerate", position, uv, normal );
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
            root + "lib/ProcGeom.js"
        ]);
    },

    generate:function( tree ){
        var node = tree.entity.getNode();
        if( !node.geometry.boundingBox )
            node.geometry.computeBoundingBox();

        var box = node.geometry.boundingBox.clone();
        box.applyMatrix4( node.matrixWorld );

        this.taskman.call( this._generate, [{
            iterations: tree.iterations, 
            source: tree.source, 
            seed: tree.seed,
            boundingBox: box,
            matrixWorld: node.matrixWorld.elements,
            lod:0
        }], [], tree._onGenerate.bind( tree ) );
    },

    _generate:function( params ){
        debugger;

        var lsys = new lib.LSystem();
        lsys.source( params.source );
        var code = lsys.generate( params.iterations );

        var proc = new lib.ProcGeom( params.matrixWorld, params.lod );
        var keys = Object.keys( lib.ProcGeom.methods );
        var values = keys.map( k => proc[k].bind(proc) );

        keys.unshift( null );
        keys.push( code );

        try{
            var func = new (Function.bind.apply( Function, keys ));
            var ret = func.apply( null, values );
            if( ret !== undefined )
                console.log( ret );
        }catch( ex ){
            console.log( ex.stack, code );
            return null;
        }

        proc._build();

        return new REPLY( 
            new MOVE(proc.position), 
            new MOVE(proc.uv), 
            new MOVE(proc.normal)
        );
    },

    STATIC:{
        instance:null,
        generate:function( tree ){
            if( !this.instance )
                this.instance = new cmp.ThreeTreeGen.Service();
            this.instance.generate( tree );
        }
    }

});

});