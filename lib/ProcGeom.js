var tmp  = new THREE.Matrix4(),
    tmp2 = new THREE.Matrix4(),
    tv4  = new THREE.Vector4();

var Transformable = CLAZZ({

    STATIC:{
        spares:[]
    },

    ENUMERABLE:["transform", "data"],

    transform:null,
    transformStack:null,
    data:null,

    CONSTRUCTOR:function(){
        var copy = this.transform;
        this.transformStack = [];
        this.transform = new THREE.Matrix4();
        if( copy )
            this.transform.elements.set( copy.elements );

        if( !this.data )
            this.data = {};
    },

    copyTransform:function(other){
        this.transform.elements.set( other.transform.elements );
    },

    push:function( /*variadic string...*/ ){
        var state;

        if( Transformable.spares.length ) state = Transformable.spares.pop();
        else state = { transform:new THREE.Matrix4(), data:null };
        state.transform.elements.set( this.transform.elements );

        if( arguments.length > 0 )
            state.data = {};

        for( var i=0, data=state.data, src=this.data; i<arguments.length; ++i ){
            data[ arguments[i] ] = src[ arguments[i] ];
        }

        this.transformStack.push( state );
    },

    pop:function(){
        var state = this.transformStack.pop(), data=this.data;
        this.transform.elements.set( state.transform.elements );

        for( var k in state.data )
            data[k] = state.data[k];

        state.data = null;
        Transformable.spares.push( state );
    },
    
    rotateX:function(amount){
        tmp.makeRotationX( amount / 180 * Math.PI );
        this.transform.multiplyMatrices( this.transform, tmp );
        return this;
    },

    rotateY:function(amount){
        tmp.makeRotationY( amount / 180 * Math.PI );
        this.transform.multiplyMatrices( this.transform, tmp );
        return this;
    },

    rotateZ:function(amount){
        tmp.makeRotationZ( amount / 180 * Math.PI );
        this.transform.multiplyMatrices( this.transform, tmp );
        return this;
    },

    translate:function( x, y, z ){
        tmp.makeTranslation( x, y, z );
        this.transform.multiplyMatrices( this.transform, tmp );
        return this;
    },

    getY:function(){
        return this.transform.elements[13];
    }
});

CLAZZ("lib.ProcGeom", {
    EXTENDS:Transformable,

    pointSets:null,
    tiles:null,
    lod:0,
    random:null,

    CONSTRUCTOR:function( lod, tiles, random ){
        SUPER();
        this.pointSets = [];
        this.lod = lod;
        this.random = random || Math.random;
        this.tiles = tiles;
    },

    rnd:function(min, max){
        return this.random() * (max - min) + min;
    },

    pointSet:function(obj){
        if( !obj ) obj = {transform:this.transform};
        else if( !obj.transform ) obj.transform = this.transform;
        obj._gen = this;
        var ps = new lib.ProcGeom.Node( obj );
        this.pointSets[ this.pointSets.length ] = ps;
        return ps;
    },

    _build:function(){
        var position = [], uv = [], normal = [], color = [];
        var mesh = {
            position, 
            uv,
            normal,
            color
        };

        for( var i=0; i<this.pointSets.length; ++i )
            this.pointSets[i].build(mesh, this);

        for( var k in mesh ){
            var arr = new Float32Array( mesh[k].length );
            arr.set( mesh[k] );
            mesh[k] = arr;
        }

        return mesh;
    }
});


CLAZZ("lib.ProcGeom.Node", {
    EXTENDS: Transformable,
    ENUMERABLE:[
        "width",
        "detail",
        "ring",
        "colorR", "colorG", "colorB",
        "uvId",
        "data"
    ],

    STATIC:{
        dataPrototype:null,
    },

    children:null,
    points:null,

    _gen:null,

    width:1,
    detail:[3, 10],
    ring:0,
    colorR:1, colorG:1, colorB:1,
    uvId:0,
    data:null,

    CONSTRUCTOR:function( obj ){
        var k, data, props = lib.ProcGeom.Node.properties;

        data = Object.create(lib.ProcGeom.Node.dataPrototype);

        if( obj && obj.data )
            Object.assign(data, obj.data);

        for( k in obj ){
            if( k in props )
                this[k] = obj[k];
            else
                data[k] = obj[k];
        }

        SUPER();
        this.data = data;
        this.children = [];
        this.detail = this.detail.concat();
    },

    pointSet:function(obj){
        obj = Object.assign({}, this, obj || {});
        
        if( !obj.data )
            obj.data = {};

        var data = this.data;
        for( var k in data ){
            if( !(k in obj.data) ){
                obj.data[k] = data[k];
            }
        }

        delete obj.points;

        var child = this._gen.pointSet( obj );
        this.children.push( child );

        return child;
    },

    set:function(key, val){
        this.data[key] = val;
        return this;
    },

    setId:function(id){
        this.uvId = id || 0;
        return this;
    },

    color:function(r,g,b){
        this.colorR = r;
        this.colorG = g;
        this.colorB = b;
        return this;
    },

    setRing:function(r){
        this.ring = r || 0;
        return this;
    },

    mulRing:function(r){
        this.ring *= r || 0;
        return this;
    },

    setWidth:function(w){
        this.width = w || 0;
        return this;
    },

    mulWidth:function(w){
        this.width *= w || 0;
        return this;
    },

    setDetail:function(min, max){
        if( min === undefined )
            min = this.detail[0];
        if( max === undefined )
            max = this.detail[1];
        if( max < min ) max = min;

        this.detail = [min, max];
        return this;
    },

    getPoints:function(){
        if( this.points )
            return this.points;

        var width = this.width,
            ring = this.ring,
            pointCount = Math.floor((1-this._gen.lod) * (this.detail[1] - this.detail[0]) + this.detail[0] || 0),
            points,
            loop,
            mix,
            halfWidth = width*0.5,
            mat = tmp,
            mat2 = tmp2,
            worldMatrix = this.transform,
            colorR = this.colorR,
            colorG = this.colorG,
            colorB = this.colorB,
            nrm = tv4,
            sign = 1;

        mat2.identity();

        if( ring < 0 ){
            sign = -1;
            ring = -ring;
        }
        
        if( pointCount < 3 )
            ring = 0;

        mix = ring - Math.floor(ring);

        if( ring == 1 )
            mix = 1;

        points = new Float32Array(pointCount * 11)

        for( var i=0, p=0; i<pointCount; ++i ){
            var x = (i/(pointCount-1)*width||0) - halfWidth, y, z = 0;
            nrm.set( x, 0, 1, 0 );
            
            if( ring ){
                var a = ((i/(pointCount-1)||0)*Math.PI*2 - Math.PI*sign),
                    cosa = Math.cos(a) * 0.5,
                    sina = Math.sin(a) * 0.5;
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

            points[p++] = points[p++] = i/(pointCount-1)*0.96+0.02;

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

        return this.points = points;
    },

    build:function( mesh, gen ){
        var size = 11,
            target = this.getPoints(),
            targetLength=target.length / size;

        for( var childId=0; childId<this.children.length; ++childId ){
            var child = this.children[childId];
            var 
                origin = child.getPoints(),
                originLength=origin.length / size, 
                length = Math.max(originLength, targetLength),
                uvId = Math.floor( child.uvId ),
                minUVX = (uvId % gen.tiles.x) / gen.tiles.x,
                maxUVX = (uvId % gen.tiles.x + 1) / gen.tiles.x - minUVX,
                originTextureY = child.uvId - uvId,
                targetTextureY = this.uvId - Math.floor(this.uvId);
            
            originTextureY = 1 - (Math.floor( uvId / gen.tiles.x ) + originTextureY) / gen.tiles.y;
            if( originTextureY == 0 ) originTextureY = 0.02;
            if( targetTextureY == 0 ) targetTextureY = 0.96;
            targetTextureY = 1 - (Math.floor( uvId / gen.tiles.x ) + targetTextureY) / gen.tiles.y;

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
                    vtx( mesh, origin, originI, minUVX, maxUVX, originTextureY );
                    vtx( mesh, target, targetI, minUVX, maxUVX, targetTextureY );
                    vtx( mesh, origin, nextOriginI, minUVX, maxUVX, originTextureY );
                }

                if( targetI != nextTargetI ){
                    vtx( mesh, target, targetI, minUVX, maxUVX, targetTextureY );
                    vtx( mesh, target, nextTargetI, minUVX, maxUVX, targetTextureY );
                    vtx( mesh, origin, nextOriginI, minUVX, maxUVX, originTextureY );
                }
            }
        }
        
        function vtx( attributes, read, offset, minX, maxX, textureY ){
            attributes.position[ attributes.position.length ] = read[offset++] || 0;
            attributes.position[ attributes.position.length ] = read[offset++] || 0;
            attributes.position[ attributes.position.length ] = read[offset++] || 0;
            attributes.uv[ attributes.uv.length ] = (read[offset++] || 0) * maxX + minX;
            attributes.uv[ attributes.uv.length ] = textureY; offset++;
            attributes.normal[ attributes.normal.length ] = read[offset++] || 0;
            attributes.normal[ attributes.normal.length ] = read[offset++] || 0;
            attributes.normal[ attributes.normal.length ] = read[offset++] || 0;
            attributes.color[ attributes.color.length ] = read[offset++] || 0;
            attributes.color[ attributes.color.length ] = read[offset++] || 0;
            attributes.color[ attributes.color.length ] = read[offset++] || 0;
        }
    }
});