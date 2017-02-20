need([
    "lib.LSystem",
    "lib.Task"
], function(){

CLAZZ("cmp.ThreeTreeGen", {

    INJECT:['entity', 'seed', 'iterations', 'source'],

    "@seed":{type:"int"},
    seed:0xDEADBEEF,

    '@iterations':{ type:'int', min:1, max:20 },
    iterations:5,

    '@source':{ type:'longstring' },
    source: '',

    create: function(){
        var placeholder = this.entity.getNode();
        if( placeholder.parent )
            placeholder.parent.remove( placeholder );

        cmp.ThreeTreeGen.Service.generate( this );
    },

    _onGenerate: function( position, uv, normal )
    {
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
            root + "lib/LSystem.js",
            root + "lib/ProcGeom.js"
        ], {
            WebGLRenderingContext,
            THREE
        });
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
            boundingBox: box
        }], [], tree._onGenerate.bind( tree ) );
    },

    _generate:function( params ){
        var lsys = new lib.LSystem();
        lsys.source( params.source );
        var code = lsys.generate( params.iterations );

        var proc = new lib.ProcGeom();
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