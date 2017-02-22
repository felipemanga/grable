CLAZZ("lib.ProcGeom", {
    triCount:0,

    position:null,
    uv:null,
    normal:null,

    transform:null,
    root:null,
    current:null,

    uvTileCount:0,
    lod:0,

    CONSTRUCTOR:function( worldMatrix, lod ){
        this.lod = lod;
        this.transform = new THREE.Matrix4();
        this.transform.elements.set( worldMatrix );
    },

    initUV:function( count ){
        if( !this.uvTileCount )
            this.uvTileCount = count || 0;
    },

    width:function(w){
        this.current.width = w || 0;
    },

    tile:function(id){
        this.current.uvId = id;
    },

    color:function(r,g,b){
        this.current.colorR = r || 0;
        this.current.colorG = g || 0;
        this.current.colorB = b || 0;
    },

    ring:function( amount ){
        this.current.ring = Math.max(0, Math.min(1, amount||0) );
    },

    push:function(length){
        var node = new lib.ProcGeom.Node( this.current, length, this.transform );
        node.parent = this.current;
        this.current = node;
        if( !this.root ) this.root = node;        
    },

    pop:function(){
        this.current.close();
        this.current = this.current.parent;
    },

    _build:function(){
        this.position = new Float32Array( this.triCount * 9 );
        this.uv = new Float32Array( this.triCount * 6 );
        this.normal = new Float32Array( this.triCount * 9 );
    }
});

var tmp = new THREE.Matrix4();

CLAZZ("lib.ProcGeom.Node", {
    parent:null,
    transform:null,
    children:null,
    vertices:0,

    descendants:0,
    width:1,
    ring:0,
    colorR:1, colorG:1, colorB:1,
    uvId:0,

    CONSTRUCTOR:function( parent, length, worldMatrix ){
        this.transform = new THREE.Matrix4();
        this.children = [];
        this.parent = parent;
        this.transform.copy( worldMatrix );

        if( length ){
            worldMatrix.multiplyMatrices( worldMatrix, tmp.makeTranslation( 0, length, 0 ) );
        }
        
        if( parent ){
            parent.children.push( this );
            this.ring = parent.ring;
            this.colorR = parent.colorR;
            this.colorG = parent.colorG;
            this.colorB = parent.colorB;
            this.uvId = parent.uvId;
        }
    },

    close:function(){
        if( this.parent )
            this.parent.descendants += this.descendants + 1;
        
    }
});