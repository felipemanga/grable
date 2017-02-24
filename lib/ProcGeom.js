var tmp  = new THREE.Matrix4(),
    tmp2 = new THREE.Matrix4(),
    tv4  = new THREE.Vector4();

var Transformable = CLAZZ({
    transform:null,
    CONSTRUCTOR:function(){
        var copy = this.transform;
        this.transform = new THREE.Matrix4();
        if( copy )
            this.transform.elements.set( copy.elements );
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
    }
});

CLAZZ("lib.ProcGeom", {
    EXTENDS:Transformable,

    roots:null,
    tiles:null,
    lod:0,
    random:null,

    CONSTRUCTOR:function( lod, tiles, random ){
        SUPER();
        this.roots = [];
        this.lod = lod;
        this.random = random || Math.random;
        this.tiles = tiles;
    },

    rnd:function(min, max){
        return this.random() * (max - min) + min;
    },

    extrude:function(obj){
        if( !obj ) obj = {transform:this.transform};
        else if( !obj.transform ) obj.transform = this.transform;

        obj._gen = this;
        obj.parent = null;

        var root = new lib.ProcGeom.Node( obj );
        this.roots[ this.roots.length ] = root;
        return root;
    },

    _build:function(){
        var position = [], uv = [], normal = [], color = [];
        var mesh = {
            position, 
            uv,
            normal,
            color
        };

        for( var i=0; i<this.roots.length; ++i )
            this.roots[i].build(mesh, this);

        for( var k in mesh )
            mesh[k] = new Float32Array( mesh[k] );

        return mesh;
    }
});


CLAZZ("lib.ProcGeom.Node", {
    EXTENDS: Transformable,

    parent:null,
    children:null,
    points:null,

    _gen:null,

    width:1,
    detail:[3, 10],
    ring:0,
    colorR:1, colorG:1, colorB:1,
    uvId:0,

    CONSTRUCTOR:function( obj ){
        for( k in obj )
            this[k] = obj[k];
        
        var parent = this.parent;
        if( parent ){
            parent.children.push( this );
            var k, props = lib.ProcGeom.Node.properties;
            
            for( k in props )
                if( !(k in obj) )
                    this[k] = parent[k];
        }

        SUPER();
        this.children = [];
    },

    extrude:function(obj){
        obj = obj || {};
        obj.transform = obj.transform || this.transform;
        obj.parent = this;
        obj._gen = this._gen;
        return new lib.ProcGeom.Node( obj );
    },

    pop:function(){
        this._gen.transform.elements.set( this.transform.elements );
        return this.parent;
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
        this.detail = [min||0, max||1];
        return this;
    },

    getPoints:function(){
        var width = this.width,
            ring = this.ring,
            points = [],
            pointCount = ((1-this._gen.lod) * (this.detail[1] - this.detail[0]) + this.detail[0] || 0),
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
        this.points = this.getPoints();

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
            for( var i=0, l=this.children.length; i<l; ++i )
                this.children[i].build( mesh, gen );

        
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
    }
});