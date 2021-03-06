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

    INJECT:['entity', 'game', 'asset', 'seed', 'iterations', 'source', 'tiles', 'amount', 'ground', 'spread', 'variants', 'previewMode'],

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

    "@variants":{type:"int", min:1},
    variants:4,

    '@iterations':{ type:'int', min:1, max:20 },
    iterations:5,

    '@source':{ type:'longstring' },
    source: '',

    '@tiles':{ type:'vec2i', min:1 },
    tiles:{x:1, y:1},

    '@previewMode':{ type:'enum', options:['full', 'quick', 'none']},
    previewMode:'full',

    asset:null,

    create: function(){
        this.entity.call("onLoadingAsyncStart");
        if( this.hidePlaceholder )
            this.asset.visible = false;

        cmp.ThreeTreeGen.Service.generate( this, true );
    },

    editorAsset:null,
    onPreviewComplete:null,
    preview: function( editorAsset, callback ){
        if( this.previewMode == "none" )
            return;

        this.editorAsset = editorAsset;
        this.asset.updateMatrixWorld();
        this.onPreviewComplete = callback;
        cmp.ThreeTreeGen.Service.generate( this, false );
    },

    '@_onGenerate':{__hidden:true},
    _onGenerate: function( mesh )
    {
        if( this.entity )
            this.entity.call("onLoadingAsyncEnd");

        if( !mesh || !mesh.position )
            return;

        var geometry = clone.apply( this.asset.geometry ); // new THREE.BoxBufferGeometry();

        var node = this.asset;

        geometry.setIndex(null);
        geometry.addAttribute('position', new CustomAttribute( mesh.position, 3 ) );
        geometry.addAttribute('uv', new CustomAttribute( mesh.uv, 2 ) );
        geometry.addAttribute('normal', new CustomAttribute( mesh.normal, 3 ) );
        geometry.addAttribute('color', new CustomAttribute( mesh.color, 3 ) );

        var oldGeometry = this.asset.geometry;
        if( oldGeometry && oldGeometry.dispose )
            oldGeometry.dispose();

        if( this.hidePlaceholder )
            this.asset.visible = true;

        node.geometry = geometry;
        if( this.entity ){            
            this.entity.setPosition(0,0,0);
            this.entity.setRotation(0,0,0);
            this.entity.setScale(1,1,1);

            if( this.entity.onGenerate )
                this.entity.onGenerate();
        } else {
            this.onPreviewComplete();
        }

        function clone(){
            var parameters = this.parameters;

            if ( parameters !== undefined ) {

                var values = [];

                for ( var key in parameters ) {

                    values.push( parameters[ key ] );

                }

                var geometry = Object.create( this.constructor.prototype );
                this.constructor.apply( geometry, values );
                return geometry;

            }

            return new this.constructor().copy( this );
        }
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
        var ground, groundGeometry, raycaster, groundBox, raycasterNormal, groundSide, scene;

        if( tree.game ){
            scene = tree.game.scene;
        }else if( self.editor ){
            scene = self.editor.scene;
        }

        if( tree.ground ){
            ground = scene.getObjectByProperty( 'uuid', tree.ground );
            if( ground ){
                if( ground && ground.entity && ground.entity.getHeightAtXZ ){
                    ground = ground.entity;
                }else if( ground.geometry ){
                    if( !applyTransform && tree.previewMode == "quick" )
                        ground = null;
                    else{
                        groundGeometry = ground.geometry;
                        if( !groundGeometry.boundingBox )
                            groundGeometry.computeBoundingBox();
                        groundBox = groundGeometry.boundingBox;
                        raycaster = new THREE.Raycaster();
                        raycasterNormal = new THREE.Vector3(0,1,0);
                        groundSide = ground.material.side;
                        ground.material.side = THREE.DoubleSide;
                    }
                }else 
                    ground = null;
            }
        }

        var transfer = [], list = [], params = {
            variants: tree.variants,
            iterations: tree.iterations, 
            source: tree.source, 
            seed: +tree.seed,
            lod:0,
            tiles: tree.tiles
        };

        var MT = new MersenneTwister( params.seed );

        var a = 0, worldTransform = new THREE.Matrix4();
        for( var i=0; i<tree.amount; ++i ){
            var transform = new THREE.Matrix4();
            var r = Math.sqrt(i/tree.amount) * tree.spread;
            var cosa = Math.cos(a * Math.PI * 2) * r;
            var sina = Math.sin(a * Math.PI * 2) * r;
            a += 1.618033 + (MT.random()*0.01-0.005) * tree.spread / tree.amount;

            transform.makeTranslation(sina, 0, cosa);

            if( applyTransform ){
                transform.multiplyMatrices( node.matrixWorld, transform );
                worldTransform.copy( transform );
            }else{
                worldTransform.multiplyMatrices( node.matrixWorld, transform );
            }
            
            var y = 0;
            
            if( ground ){
                if( groundGeometry ){
                    raycaster.set( new THREE.Vector3(
                        worldTransform.elements[12],
                        groundBox.min.y * ground.scale.y + ground.position.y,
                        worldTransform.elements[14]
                    ), raycasterNormal );

                    var intersects = raycaster.intersectObject( ground );
                    if( intersects && intersects.length ){
                        y = intersects[0].point.y;
                    }else{
                        y = worldTransform.elements[13];
                    }
                    
                }else{
                    y = ground.getHeightAtXZ( worldTransform.elements[12], worldTransform.elements[14] );
                }
                
            }

            if( !applyTransform ){
                y -= node.position.y;
                y /= node.scale.y;
            }

            transform.elements[13] = y;

            list[i] = transform.elements;
            transfer[i] = transform.elements.buffer;
        }

        if( groundGeometry ){
            ground.material.side = groundSide;
        }

        
        this.taskman.call( this._generate, [params, list], transfer, tree._onGenerate.bind( tree ) );
    },

    _generate:function( params, list ){
        var treeCtx = {
            treeCfg:{
                scale:3,
                tree:null
            },

            PUSH:function(){
                this.treeCfg.tree.push("rotX", "rotY", "rotZ");
            },

            POP:function(){
                this.treeCfg.tree.pop();
            },

            RX:function( min, max ){
                var tmp = this.procgeom.rnd(min,max);
                this.treeCfg.tree.rotateX( tmp )
                this.treeCfg.tree.data.rotX += tmp;
            },

            RY:function( min, max ){
                var tmp = this.procgeom.rnd(min,max);
                this.treeCfg.tree.rotateY( tmp )
                this.treeCfg.tree.data.rotY += tmp;
            },

            RZ:function( min, max ){
                var tmp = this.procgeom.rnd(min,max);
                this.treeCfg.tree.rotateZ( tmp )
                this.treeCfg.tree.data.rotZ += tmp;
            },

            RGB:function(r,g,b){
	            this.treeCfg.tree.color(r,g,b);
            },

            CFG:function( cfg ){
                Object.assign( this.treeCfg.tree.data, cfg );
            },

            BEGINTREE:function( cfg ){
                var def = {
                    scale:1,
                    trunkSegments:3,
                    trunkLength:20,
                    trunkWidth:2,
                    trunkRound:1,
                    trunkTwistXZ:this.procgeom.rnd(-20,20),
                    trunkTwistY:this.procgeom.rnd(-20,20),
                    trunkDetail:1,
                    trunkTile:1,
                    trunkColorR:1,
                    trunkColorG:1,
                    trunkColorB:1,
                    trunkWidthMin:0.7,
                    trunkWidthMax:0.9,
                    trunkLengthMin:0.4,
                    trunkLengthMax:0.6,

                    leafLength:7,
                    leafWidth:7,
                    leafShape:0,
                    leafColorR:1,
                    leafColorG:1,
                    leafColorB:1,
                    leafDetailMin:3,
                    leafDetailMax:10,
                    leafRoundMin:0.0005,
                    leafRoundMax:0.004,
                    leafTile:2
                };

                cfg = Object.assign(this.treeCfg, def, cfg);

                this.treeCfg.tree = this.procgeom.pointSet({ width:this.treeCfg.scale*(this.treeCfg.trunkWidth), ring:1, data:{ 
                    length:this.treeCfg.scale*this.treeCfg.trunkLength,
                    seg:this.treeCfg.trunkSegments,
                    rotX:0,
                    rotY:0,
                    rotZ:0
                } })
                .setId( this.treeCfg.trunkTile )
                .color( this.treeCfg.trunkColorR, this.treeCfg.trunkColorG, this.treeCfg.trunkColorB )
                .rotateY(this.procgeom.rnd(0, 360))
            },

            LEAF:function( leafCfg ){
                var cfg = Object.assign( {}, this.treeCfg, this.treeCfg.tree.data, leafCfg );
                var length = cfg.leafLength * cfg.scale;

                var tree = this.treeCfg.tree;
                var detail = (1-this.procgeom.lod) * (cfg.leafDetailMax - cfg.leafDetailMin) + cfg.leafDetailMin;

                tree
                    .rotateZ(-tree.data.rotZ)
                    .rotateY( (tree.data.rotX+tree.data.rotZ>0?180-tree.data.rotX:-90))
                    .rotateX(-30)
                    .setDetail( cfg.leafDetailMin, cfg.leafDetailMax)
                    .setWidth(0);

                var ring = this.procgeom.rnd( cfg.leafRoundMin, cfg.leafRoundMax );

                for( var i=0; i<detail; ++i ){
                    var it = (i+1) / (detail);

                    tree = tree.pointSet()
                        .color( cfg.leafColorR, cfg.leafColorG, cfg.leafColorB )
                        .setRing( ring )
                        .setId( cfg.leafTile + 0.999 - it*0.998 )

                    switch( cfg.leafShape ){
                    case 0: // round
                        tree
                            .setWidth( Math.sin(it*Math.PI) * cfg.leafWidth * cfg.scale )
                            .translate( 0, length / (detail - 1), 0 );                        

                    break;

                    case 1: // square
                        tree
                            .setWidth( cfg.leafWidth * cfg.scale )
                            .translate( 0, length / (detail - 1), 0 );
                    default:

                    }

                }

            },

            TRUNK: function(){
                var tree = this.treeCfg.tree;
                var cfg = tree.data;
                var width = this.procgeom.rnd( cfg.trunkWidthMin, cfg.trunkWidthMax);
                if( !tree.data.seg )
                    tree.data.seg = 1;

                var base = tree, seg = Math.ceil( tree.data.seg * cfg.trunkDetail * (1-this.procgeom.lod));
                var len = base.data.length * this.procgeom.rnd( cfg.trunkLengthMin, cfg.trunkLengthMax );
                var uv = Math.floor(base.uvId), 
                    z=this.procgeom.rnd( -cfg.trunkTwistXZ, cfg.trunkTwistXZ ), 
                    x=this.procgeom.rnd( -cfg.trunkTwistXZ, cfg.trunkTwistXZ );

                for( var i=0; i<seg; ++i ){
                    tree = tree
                        .pointSet()
                        .color(  cfg.trunkColorR,  cfg.trunkColorG,  cfg.trunkColorB )
                        .mulWidth( width )
                        .setId( uv + i/seg )
                        .translate(0, len / seg, 0)
                        .rotateX(x)
                        .rotateY( cfg.trunkTwistY / seg)
                        .rotateZ(z)
                        .setDetail( undefined, 4+tree.width*cfg.trunkDetail )
                        .set("length", len)
                        .set("base", base);
                    tree.data.rotY +=  cfg.trunkTwistY;
                    tree.data.rotZ += z;
                    tree.data.rotX += x;
                }
                tree.setId(uv);
                this.treeCfg.tree = tree;
            },

            ENDTRUNK: function(){
                this.treeCfg.tree = this.treeCfg.tree.data.base;
            }
        };

        var lsys = new lib.LSystem();

        lsys.source("tree",`
        [ -> PUSH();

        ] -> POP();

        { -> TRUNK();

        } -> ENDTRUNK();
        `);

        var MT = new MersenneTwister( params.seed );
        lsys.random = MT.random.bind(MT);

        var proc = new lib.ProcGeom( params.lod, params.tiles, lsys.random );
        var keys = Object.keys( lib.ProcGeom.methods );
        var values = keys.map( k => proc[k].bind(proc) );
        var ctxkeys = Object.keys( treeCtx );
        values = values.concat( ctxkeys.map( 
            k => 
            typeof treeCtx[k] == "function" ? 
                treeCtx[k].bind(treeCtx) :
                treeCtx[k]
        ));
        treeCtx.procgeom = proc;
        lib.ProcGeom.Node.dataPrototype = treeCtx.treeCfg;

        keys = keys.concat(ctxkeys);

        keys.unshift( null );

        // var T = performance.now();

        // function TIME(cmd){
        //     var T2 = performance.now();
        //     console.log( cmd, T2 - T );
        //     T = T2;
        // }

        try {
            
            lsys.source( params.source );

            // TIME("SOURCE");

            var variants = [];
            for( var i=0; i<params.variants; ++i ){
                var code = lsys.generate( params.iterations );
                variants[i] = new (Function.bind.apply( Function, keys.concat(code) ));
            }

            // TIME("VARIANTS");

            for( var i=0; i<list.length; i++ ){
                var func = variants[ Math.floor(lsys.random() * variants.length) ];
                // lsys.generate( params.iterations );
                
                proc.transform.elements.set( list[i] );
                var ret = func.apply( null, values );
                if( ret !== undefined )
                    console.log( ret );
                
            }

            // TIME("APPLY");

            var mesh = proc._build();
            // TIME("BUILD");
        } catch( ex ) {
            if( lsys.debug || lsys.log )
                console.warn( ex.stack );

            if( lsys.debug )
                (function(){debugger;})();

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