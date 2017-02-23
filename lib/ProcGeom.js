CLAZZ("lib.ProcGeom", {
    transform:null,
    root:null,
    current:null,

    _length:1,

    _width:0,
    _detail:1,
    _uvId:0,
    _ring:0,
    colorR:1,
    colorG:1,
    colorB:1,

    tiles:null,
    lod:0,
    random:null,

    CONSTRUCTOR:function( worldMatrix, lod, tiles, random ){
        this.lod = lod;
        this.transform = new THREE.Matrix4();
        this.transform.elements.set( worldMatrix );
        this.random = random || Math.random;
        this.tiles = tiles;
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

    getLength:function(){ return this._length; },
    mulLength:function(v){ return this._length *= v || 0; },
    addLength:function(v){ return this._length += v || 0; },
    length:function(l){
        this._length = l || 0;
    },

    getWidth:function(){ return this._width; },
    mulWidth:function(v){ return this._width *= v; if( this.current ){ this.current.width = this._width; }},
    addWidth:function(v){ return this._width += v; if( this.current ){ this.current.width = this._width; }},
    width:function(w){
        this._width = w || 0;
        if( this.current )
            this.current.width = this._width;
    },

    getTile:function(){ return this._uvId; },
    mulTile:function(v){ return this._uvId *= v; if( this.current ){ this.current.tile *= v || 0; }},
    addTile:function(v){ return this._uvId += v; if( this.current ){ this.current.tile += v || 0; }},
    tile:function(id){
        this._uvId = id || 0;
        if( this.current )
            this.current.uvId = this._uvId;
    },

    getDetail:function(){ return this._detail; },
    mulDetail:function(v){ return this._detail *= v; if( this.current ){ this.current.detail *= v || 0; }},
    addDetail:function(v){ return this._detail += v; if( this.current ){ this.current.detail += v || 0; }},
    detail:function(id){
        this._detail = id || 0;
        if( this.current )
            this.current.detail = this._detail;
    },

    getRing:function(){ return this._ring; },
    mulRing:function(v){ return this._ring *= v; if( this.current ){ this.current.ring *= v || 0; }},
    addRing:function(v){ return this._ring += v; if( this.current ){ this.current.ring += v || 0; }},
    ring:function( amount ){
        this._ring = Math.max(0, Math.min(1, amount||0) );
        if( this.current )
            this.current.ring = this._ring;
    },


    getColorR:function(){ return this.colorR; },
    getColorG:function(){ return this.colorG; },
    getColorB:function(){ return this.colorB; },
    mulColor:function(r,g,b){
        this.colorR *= r; this.colorG *= g; this.colorB *= b; 
        if( this.current ){ 
            this.current.colorR *= r; 
            this.current.colorG *= g; 
            this.current.colorB *= b; 
        }
    },
    addColor:function(r,g,b){
        this.colorR += r; this.colorG += g; this.colorB += b; 
        if( this.current ){ 
            this.current.colorR += r; 
            this.current.colorG += g; 
            this.current.colorB += b; 
        }
    },
    color:function(r,g,b){
        this.colorR = r || 0;
        this.colorG = g || 0;
        this.colorB = b || 0;
    },

    push:function(){
        if( !this.root )
            this.root = this.current = new lib.ProcGeom.Node( null, 0, this );

        var node = new lib.ProcGeom.Node( this.current, this._length, this );
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
            this.root.build(mesh, this);

        for( var k in mesh )
            mesh[k] = new Float32Array( mesh[k] );

        return mesh;
    }
});

var tmp  = new THREE.Matrix4(),
    tmp2 = new THREE.Matrix4(),
    tv4  = new THREE.Vector4();

function vtx( attributes, read, offset, minX, maxX, minY ){
    attributes.position[ attributes.position.length ] = read[offset++] || 0;
    attributes.position[ attributes.position.length ] = read[offset++] || 0;
    attributes.position[ attributes.position.length ] = read[offset++] || 0;
    attributes.uv[ attributes.uv.length ] = (read[offset++] || 0) * maxX + minX;
    attributes.uv[ attributes.uv.length ] = (read[offset++] || 0) + minY;
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
    length:0,

    CONSTRUCTOR:function( parent, length, gen ){
        this.transform = new THREE.Matrix4();
        this.children = [];
        this.parent = parent;
        this.length = length;

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
        gen.transform.elements.set( this.transform.elements );
    },

    close:function( gen ){
        if( this.parent ){

            this.parent.descendants += this.descendants + 1;
            this.parent.writeContext( gen );

        }

        this.points = this.getPoints( gen );
    },

    getPoints:function( gen ){
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
            var x = (i/(pointCount-1)*width||0) - halfWidth, y, z = 0;
            nrm.set( x, 0, 1, 0 );
            
            if( ring ){
                var a = (i/(pointCount-1)||0)*Math.PI*2 - Math.PI,
                    cosa = Math.cos(a),
                    sina = Math.sin(a);
                z = mix * cosa * width * 0.5;
                x = x * (1-mix) + mix * sina * width * 0.5;

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

    build:function( mesh, gen ){
        if( this.parent && this.points ){
            var size = 11,
                origin = this.points,
                target = this.parent.points || this.points,
                originLength=origin.length / size, 
                targetLength=target.length / size,
                length = Math.max(originLength, targetLength),

                minUVX = (this.uvId % gen.tiles.x) / gen.tiles.x,
                maxUVX = (this.uvId % gen.tiles.x + 1) / gen.tiles.x - minUVX,
                minUVY = 1 - Math.floor(this.uvId / gen.tiles.x) / gen.tiles.y,
                maxUVY = 1 - Math.floor(this.uvId / gen.tiles.x + 1) / gen.tiles.y;

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
                    vtx( mesh, origin, originI, minUVX, maxUVX, minUVY );
                    vtx( mesh, target, targetI, minUVX, maxUVX, maxUVY );
                    vtx( mesh, origin, nextOriginI, minUVX, maxUVX, minUVY );
                }

                if( targetI != nextTargetI ){
                    vtx( mesh, target, targetI, minUVX, maxUVX, maxUVY );
                    vtx( mesh, target, nextTargetI, minUVX, maxUVX, maxUVY );
                    vtx( mesh, origin, nextOriginI, minUVX, maxUVX, minUVY );
                }
            }
        }

        if( this.children )
            for( var i=0, l=this.children.length; i<l; ++i ){
                this.children[i].build( mesh, gen );
            }
    }
});