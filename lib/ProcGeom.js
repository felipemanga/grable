CLAZZ("lib.ProcGeom", {
    transform:null,
    root:null,
    current:null,

    _width:0,
    _detail:1,
    _uvId:0,
    _ring:0,
    colorR:1,
    colorG:1,
    colorB:1,

    uvTileCount:0,
    lod:0,
    random:null,

    CONSTRUCTOR:function( worldMatrix, lod, random ){
        this.lod = lod;
        this.transform = new THREE.Matrix4();
        this.transform.elements.set( worldMatrix );
        this.random = random || Math.random;
    },

    initUV:function( count ){
        if( !this.uvTileCount )
            this.uvTileCount = count || 0;
    },

    rnd:function(min, max){
        return this.random() * (max - min) + min;
    },

    rotateX:function(amount){
        tmp.makeRotationX( amount / 180 * Math.PI );
        this.transform.multiplyMatrices( this.transform, tmp );
    },

    rotateY:function(amount){
        tmp.makeRotationY( amount / 180 * Math.PI );
        this.transform.multiplyMatrices( this.transform, tmp );
    },

    rotateZ:function(amount){
        tmp.makeRotationZ( amount / 180 * Math.PI );
        this.transform.multiplyMatrices( this.transform, tmp );
    },

    width:function(w){
        this._width = w || 0;
        if( this.current )
            this.current.width = this._width;
    },

    tile:function(id){
        this._uvId = id || 0;
        if( this.current )
            this.current.uvId = this._uvId;
    },

    detail:function(id){
        this._detail = id || 0;
        if( this.current )
            this.current.detail = this._detail;
    },

    ring:function( amount ){
        this._ring = Math.max(0, Math.min(1, amount||0) );
        if( this.current )
            this.current.ring = this._ring;
    },


    color:function(r,g,b){
        this.colorR = r || 0;
        this.colorG = g || 0;
        this.colorB = b || 0;
    },

    push:function(length){
        if( !this.root )
            this.root = this.current = new lib.ProcGeom.Node( null, 0, this );

        var node = new lib.ProcGeom.Node( this.current, length, this );
        node.parent = this.current;
        this.current = node;
        if( !this.root ) this.root = node;
    },

    pop:function(){
        this.current.close( this );
        this.current = this.current.parent;
    },

    _build:function(){
        while( this.current )
            this.pop();

        var position = [], uv = [], normal = [], color = [];
        var mesh = {
            position, 
            uv,
            normal,
            color
        };

        if( this.root )
            this.root.build(mesh);

        for( var k in mesh )
            mesh[k] = new Float32Array( mesh[k] );

        return mesh;
    }
});

var tmp  = new THREE.Matrix4(),
    tmp2 = new THREE.Matrix4(),
    tv4  = new THREE.Vector4();

function vtx( attributes, read, offset ){
    attributes.position[ attributes.position.length ] = read[offset++] || 0;
    attributes.position[ attributes.position.length ] = read[offset++] || 0;
    attributes.position[ attributes.position.length ] = read[offset++] || 0;
    attributes.uv[ attributes.uv.length ] = read[offset++] || 0;
    attributes.uv[ attributes.uv.length ] = read[offset++] || 0;
    attributes.normal[ attributes.normal.length ] = read[offset++] || 0;
    attributes.normal[ attributes.normal.length ] = read[offset++] || 0;
    attributes.normal[ attributes.normal.length ] = read[offset++] || 0;
    attributes.color[ attributes.color.length ] = read[offset++] || 0;
    attributes.color[ attributes.color.length ] = read[offset++] || 0;
    attributes.color[ attributes.color.length ] = read[offset++] || 0;
}

CLAZZ("lib.ProcGeom.Node", {
    parent:null,
    transform:null,
    children:null,

    points:null,

    descendants:0,
    width:1,
    detail:0,
    ring:0,
    colorR:1, colorG:1, colorB:1,
    uvId:0,

    CONSTRUCTOR:function( parent, length, gen ){
        this.transform = new THREE.Matrix4();
        this.children = [];
        this.parent = parent;

        if( length ){
            this.transform.multiplyMatrices( gen.transform, tmp.makeTranslation( 0, length, 0 ) );
            gen.transform.elements.set( this.transform.elements );
        }else
            this.transform.copy( gen.transform );

        if( parent )
            parent.children.push( this );

        this.readContext( gen );
    },

    readContext:function( gen ){
        this.ring   = gen._ring;
        this.colorR = gen.colorR;
        this.colorG = gen.colorG;
        this.colorB = gen.colorB;
        this.uvId   = gen._uvId;
        this.width  = gen._width;
        this.detail = gen._detail * Math.max( 0.0001, Math.min( 1, 1-gen.lod ) );
    },

    writeContext:function( gen ){
        gen._ring = this.ring;
        gen.colorR = this.colorR;
        gen.colorG = this.colorG;
        gen.colorB = this.colorB;
        gen._uvId = this.uvId;
        gen._width = this.width;
        gen._detail = this.detail;
    },

    close:function( gen ){
        if( this.parent )
            this.parent.descendants += this.descendants + 1;
        this.writeContext( gen );
        this.points = this.getPoints();
    },

    getPoints:function(){
        var width = this.width,
            ring = this.ring,
            points = [],
            pointCount = (width * this.detail || 0) + 1,
            loop,
            mix,
            halfWidth = width*0.5,
            mat = tmp,
            mat2 = tmp2,
            worldMatrix = this.transform,
            colorR = this.colorR,
            colorG = this.colorG,
            colorB = this.colorB,
            nrm = tv4;

        mat2.identity();

        // debugger;
        
        if( pointCount < 3 )
            ring = 0;

        mix = ring - Math.floor(ring);

        if( ring == 1 )
            mix = 1;

        for( var i=0, p=0; i<pointCount; ++i ){
            var x = i - halfWidth, y, z = 0;
            nrm.set( x, 0, 1, 0 );
            
            if( ring ){
                var a = (i/width)*Math.PI*2 - Math.PI,
                    cosa = Math.cos(a),
                    sina = Math.sin(a);
                z = mix * cosa * width;
                x = x * (1-mix) + mix * sina * width;

                nrm.x = mix * sina * width * 2;
                nrm.z = mix * cosa * width * 2;


            }
            mat2.elements[12] = nrm.x;
            mat2.elements[13] = nrm.y;
            mat2.elements[14] = nrm.z;
            mat.multiplyMatrices( worldMatrix, mat2 );
            nrm.x = mat.elements[12];
            nrm.y = mat.elements[13];
            nrm.z = mat.elements[14];

            mat2.elements[12] = x;
            mat2.elements[13] = 0;
            mat2.elements[14] = z;

            mat.multiplyMatrices( worldMatrix, mat2 );

            x = points[p++] = mat.elements[12];
            y = points[p++] = mat.elements[13];
            z = points[p++] = mat.elements[14];

            points[p++] = i/width;
            points[p++] = 0;

            nrm.x = nrm.x - x;
            nrm.y = nrm.y - y;
            nrm.z = nrm.z - z;
            nrm.normalize();

            points[p++] = nrm.x;
            points[p++] = nrm.y;
            points[p++] = nrm.z;

            points[p++] = colorR;
            points[p++] = colorG;
            points[p++] = colorB;
        }

        return points;
    },

    build:function( mesh ){
        if( this.parent ){
            var size = 11,
                origin = this.points,
                target = this.parent.points,
                originLength=origin.length / size, 
                targetLength=target.length / size,
                length = Math.max(originLength, targetLength);

            for( var i=0; i<length-1; ++i ){
                var originI = Math.round( i / length * originLength );
                originI = (originI % originLength) * size;

                var targetI = Math.round( i / length * targetLength );
                targetI = (targetI % targetLength) * size;

                var nextOriginI = Math.round( (i+1) / length * originLength );
                nextOriginI = (nextOriginI % originLength) * size;

                var nextTargetI = Math.round( (i+1) / length * targetLength );
                nextTargetI = (nextTargetI % targetLength) * size;

                if( originI != nextOriginI ){
                    vtx( mesh, origin, originI );
                    vtx( mesh, target, targetI );
                    vtx( mesh, origin, nextOriginI );
                }

                if( targetI != nextTargetI ){
                    vtx( mesh, target, targetI );
                    vtx( mesh, target, nextTargetI );
                    vtx( mesh, origin, nextOriginI );
                }
            }
        }

        if( this.children )
            for( var i=0, l=this.children.length; i<l; ++i ){
                this.children[i].build( mesh );
            }
    }
});