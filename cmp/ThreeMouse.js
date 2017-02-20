CLAZZ("cmp.ThreeMouse", {
    INJECT:['entity', 'pool', 'game', 'onClick', 'onMouseOver', 'onMouseUp', 'onMouseDown', 'roughPicking'],
    PROVIDES:{"cmp.Mouse":"implements"},

    draggable:false,

    '@roughPicking':{type:'bool'},
    roughPicking:true,

    '@onClick':{type:'array', meta:{type:'slot'}},
    onClick:null,

    '@onMouseOver':{type:'array', meta:{type:'slot'}},
    onMouseOver:null,

    '@onMouseUp':{type:'array', meta:{type:'slot'}},
    onMouseUp:null,

    '@onMouseDown':{type:'array', meta:{type:'slot'}},
    onMouseDown:null,    

    onReady:function(){
        if( this.roughPicking )
            this.entity.getNode().roughIntersection = true;

        cmp.ThreeMouse.Service.add(this);
    },

    destroy:function(){
        cmp.ThreeMouse.Service.remove(this);
    }
});


CLAZZ("cmp.ThreeMouse.Service", {
    listenerCount:0,
    
    onClickListeners:null,
    onMouseOverListeners:null,
    onMouseUpListeners:null,
    onMouseDownListeners:null,

    pool:null,
    pos:0,

    dom:null,
    raycaster:null,
    mouse:null,

    CONSTRUCTOR:function( pool, game ){
        this.onClickListeners = [];
        this.onMouseOverListeners = [];
        this.onMouseUpListeners = [];
        this.onMouseDownListeners = [];

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.camera = game.camera;
        var dom = game.renderer.domElement;
        this.dom = dom;
        dom.addEventListener('click', this._click = this._raise.bind(this, "onClick", this.onClickListeners ) );

        this.pool = pool;
        pool.add(this);
    },

    _click:null,

    destroy:function(){
        this.dom.removeEventListener( 'click', this._click );
        this.pool.remove(this);
        cmp.ThreeMouse.Service.instance = null;
    },

    _raise:function( name, list, event ){
        this.mouse.x = ( event.offsetX / (this.dom.innerWidth || this.dom.clientWidth || 1) ) * 2 - 1;
        this.mouse.y = - ( event.offsetY / (this.dom.innerHeight || this.dom.clientHeight || 1) ) * 2 + 1;

        var nodes = [], map = {};
        for( var i=0, l=list.length; i<l; ++i ){
            nodes[i] = list[i].entity.getNode();
            map[ nodes[i].id ] = list[i];
        }
        
        this.raycaster.setFromCamera( this.mouse, this.camera );
        var intersects = this.raycaster.intersectObjects( nodes, false, true );
        if( intersects.length ){
            var target = map[ intersects[0].object.id ];
            target.entity.message( target[name] );
        }
    },

    add:function(l){
        this.listenerCount++;

        if( l.onClick && l.onClick.length )
            this.onClickListeners.push( l );

        if( l.onMouseOver && l.onMouseOver.length )
            this.onMouseOverListeners.push( l );

        if( l.onMouseUp && l.onMouseUp.length )
            this.onMouseUpListeners.push( l );

        if( l.onMouseDown && l.onMouseDown.length )
            this.onMouseDownListeners.push( l );
    },

    remove:function(l){
        var pos;
        pos = this.onClickListeners.indexOf(l);
        if( pos != -1 )
            this.onClickListeners.splice(pos, 1);

        pos = this.onMouseOverListeners.indexOf(l);
        if( pos != -1 )
            this.onMouseOverListeners.splice(pos, 1);

        pos = this.onMouseUpListeners.indexOf(l);
        if( pos != -1 )
            this.onMouseUpListeners.splice(pos, 1);

        pos = this.onMouseDownListeners.indexOf(l);
        if( pos != -1 )
            this.onMouseDownListeners.splice(pos, 1);

        if( --this.listenerCount == 0 )
            this.destroy();
    },

    STATIC:{
        instances:[],

        add:function( l ){
            if( !l || !l.pool || !l.entity || !l.game )
                return;

            if( !this.instances[ l.game.scene.id ] )
                this.instances[ l.game.scene.id ] = new cmp.ThreeMouse.Service( l.pool, l.game );
            
            this.instances[ l.game.scene.id ].add( l );
        },

        remove:function( l ){
            if( !l || !this.instances[ l.game.scene.id ] ) return;
            this.instances[ l.game.scene.id ].remove(l);
        }
    }
})