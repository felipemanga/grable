CLAZZ("lib.ProcGeom", {
    triCount:0,

    position:null,
    uv:null,
    normal:null,

    v:5,
    getV:function(){
        this.triCount++;
        return this.v;
    },

    _build:function(){
        this.position = new Float32Array( this.triCount * 9 );
        this.uv = new Float32Array( this.triCount * 6 );
        this.normal = new Float32Array( this.triCount * 9 );
    }
});