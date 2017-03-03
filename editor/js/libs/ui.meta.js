/*

srcObject properties:
    value: current property value
    default: default value, mostly for new array elements
    label: optional header text
    type: one of these

*/

UI.Meta = function( srcObject ){
    
    UI.Row.call( this );
    
    this.onChangeCallback = null;

    var value;

    var scope = this, desc = {
        row: this,
        meta: {type:'unknown'},
        header: null,

        get value(){
            return value;
        },

        set value( newValue ){
            var dirty = false;

            if( newValue && typeof newValue == 'object' ){
                dirty = JSON.stringify(value) !== JSON.stringify( newValue );
            } else {
                dirty = value !== newValue;
            }

            value = newValue;

            if( dirty && scope.onChangeCallback )
                scope.onChangeCallback();
        }
    };

    Object.assign( desc, srcObject );

    this.descriptor = desc;    

};

UI.Meta.prototype = Object.create( UI.Row.prototype );
UI.Meta.prototype.constructor = UI.Meta;

UI.Meta.prototype.render = function(){
    var scope = this;
    this.clear();

    if( this.descriptor.header )
        this.add( this.descriptor.header );

    var factory = this.factories[ this.descriptor.meta.type ] || this.factories.unknown;
    factory.call( this, this.descriptor );
};

UI.Meta.prototype.setValue = function( value, callCallback ){
    var onChange = this.onChangeCallback;

    if( !callCallback )
        this.onChangeCallback = null;

    this.descriptor.value = value;

    this.onChangeCallback = onChange;

    this.render();
    return this; // value?
}

UI.Meta.prototype.getValue = function(){
    return this.descriptor.value;
}

UI.Meta.prototype.onChange = function( callback ) {
    
    this.onChangeCallback = callback;
    
    return this;

}

UI.Meta.prototype.factories = {

    unknown:function( obj ){
        obj.row.add( new UI.Text( 'Unknown type:' + (obj.meta.type||"undefined")  ) ).setStyle('float', ['right']);
    },

    string:function( obj ){
        var e = new UI.Input().setValue(obj.value).setWidth( '180px' ).setStyle('float', ['right']);
        obj.row.add( e );
        e.onChange(function(){
            var v = e.getValue();
            if( obj.meta.trim ) v = v.trim();
            if( obj.meta.lowercase ) v = v.toLowerCase();
            if( obj.meta.uppercase ) v = v.toUpperCase();
            obj.value = (v);
        });
    },

    json:function( obj ){
        var e = new UI.Input()
            .setValue( JSON.stringify(obj.value) )
            .setWidth( (obj.meta.width || 260) - 6 + 'px' )
            .setStyle('float', ['right']);

        obj.row.add( e );

        e.onChange(function(){
            var v = e.getValue();
            try{
                obj.value = ( JSON.parse( v ) );
                e.setBackgroundColor('inherit');                    
            }catch(err){
                e.setBackgroundColor('red');
            }
        });
    },


    object:function( obj ){
        var arr = obj.value || {}, meta = obj.meta, scope = this;

        var e;
        if( obj.e ){
            e = obj.e;
        }else{
            e = new UI.Row();
            obj.row.add( e );
        }

        render();

        function render(){
            e.clear();
            for( var i in arr ){
                var sub = {
                    meta:  meta.meta || {type:meta.subtypes && meta.subtypes[i] ? meta.subtypes[i] : meta.subtype},
                    key: i,
                    
                    get value(){ return arr[ this.key ]; },
                    set value(newValue){ arr[ this.key ] = newValue; obj.value = Object.assign({}, arr); },

                    default: meta.default,
                    row: e,
                    header: null
                };

                sub.header = new UI.Input(i).setMarginBottom('3px');
                if( sub.meta.type == 'array' ) sub.header.setWidth('200px');
                else sub.header.setWidth('90px');

                sub.header.onChange((function(i, title){
                    var newKey = title.getValue().trim();

                    if( newKey == i )
                        return;

                    if( newKey != '' )
                        arr[newKey] = arr[i];

                    delete arr[i];

                    render();
                }).bind(this, i, sub.header));

                e.add( sub.header );

                var factory = scope.factories[ sub.meta.type ];
                if( !factory ) factory = scope.factories.unknown;
                factory.call( scope, sub );

                e.add( new UI.Row() );
            }


            var newKey = new UI.Input('')
                .setStyle('margin-right', ['auto'])
                .setDisplay('block')
                .setStyle('clear', ['both'])
                .onChange(function(){
                    var key = this.getValue().trim();
                    if( key == '' || key in arr ) return;
                    arr[key] = meta.default;
                    this.setValue('');
                    render();
                });
            newKey.dom.setAttribute( 'placeholder', 'new ' + obj.key );
            e.add( newKey );

            obj.value = arr;
            arr = Object.assign({}, arr);
        }
    },

    array:function( obj ){
        var arr = obj.value || [], meta = obj.meta, scope = this;

        var e;
        if( obj.e ){
            e = obj.e;
        }else{
            e = new UI.Row();
            obj.row.add( e );
        }

        render();

        function render(){
            e.clear();
            for( var i=0; i<arr.length; ++i ){
                e.add(new UI.Break());
                
                var sub = {
                    meta:  meta.meta || {type:meta.subtypes && meta.subtypes[i] ? meta.subtypes[i] : meta.subtype},
                    index: i,
                    
                    get value(){ return arr[ this.index ]; },
                    set value(newValue){ arr[ this.index ] = newValue; obj.value = arr.concat(); },

                    default: meta.default,
                    row: e,
                    header: null
                };

                if( meta.labels && meta.labels[i] ){
                    sub.header = new UI.Text( meta.labels[i] )
                        .setWidth( '90px' )
                        .setStyle( 'float', ['left'] )
                        .setStyle( 'clear', ['both'] );
                    sub.meta.width = (290 - 90);
                }else if( meta.canResize !== false && !meta.labels ){
                    sub.header = new UI.Button( 'x' )
                        .setWidth( '30px' )
                        .onClick((function(i){
                            arr.splice(i, 1); 
                            render(); 
                        }).bind(this, i));
                    sub.meta.width = (290 - 30);
                }

                if( sub.header )
                    e.add( sub.header );

                var factory = scope.factories[ sub.meta.type ];
                if( !factory ) factory = scope.factories.unknown;
                factory.call( scope, sub );
            }

            if( meta.canResize !== false && !meta.labels )
            {
                e.add( new UI.Button('add ' + obj.key)
                    .setStyle('margin-left', ['auto'])
                    .setDisplay('block')
                    .setStyle('clear', ['both'])
                    .onClick(function(){
                        arr.push(meta.default);
                        render();
                    }) 
                );
            }else{
                e.add( new UI.Row().setStyle('min-height', ['1px']).setHeight('1px') );
            }

            obj.value = (arr);
            arr = arr.concat();
        }
    },

    bool:function( obj ){
        var e = new UI.Checkbox(obj.value).setMarginLeft('10px');
        obj.row.add( e );
        e.onChange(function(){
            obj.value = (e.getValue());
        });
    },

    color:function( obj ){
        var e = new UI.Color();
        e.setValue( obj.value );
        e.onChange(function(){
            obj.value = this.getValue();
        })
        obj.row.add( e );
    },

    enum:function( obj ){
        var e = new UI.Select().setWidth( '180px' ).setFontSize( '12px' ).setStyle('float', ['right']);
        var opts = {};
        var options;
        if( 'options' in obj.meta ) options = obj.meta.options;
        else if( 'fromKeys' in obj.meta ){

            var keys = DOC.resolve( obj.meta.fromKeys, editor.selected );
            if( keys && typeof obj == 'object' ){

                options = Object.keys(keys);
                if( obj.meta.filter ){
                    var rex = new RegExp(obj.meta.filter);
                    options = options.filter( rex.test.bind(rex) );
                }
                
            }
            
        }

        if( !options ) options = [];
        
        if( Array.isArray(options) ){
            options.forEach((o) => opts[o] = o);
        }else options = o;

        e.setOptions( opts )
            .setValue( obj.value )
            .onChange(function(){
            obj.value = (e.getValue());
        });

        obj.row.add( e );
    },

    slot:function( obj ){
        var slotIndex = UI.Meta.slotIndex, scope = this;
        var call = obj.value;
        if( !Array.isArray(call) || call.length != 3 ) 
            call = ["", "setPosition", []];
        var args = call[2] || [];
        var callName = call[1], callScope = call[0];
        
        var scopeOpts = {
            "":"[ this entity ]",
            "broadcast":"[ all entities ]"
        };

        iterate( editor.scene );

        function iterate(n){
            if( !n || !editor.scripts[ n.uuid ] ) return;
            scopeOpts[n.uuid] = n.name;
            if( n.children ){
                for( var i=0; i<n.children.length; ++i )
                    iterate(n.children[i]);
            }
        }            

        var scopeSelect = new UI.Select()
            .setWidth( '90px' )
            .setFontSize( '12px' )
            .setTextTransform('none')
            .setOptions( scopeOpts )
            .setValue( callScope )
            .onChange(update);

        var isCustom = new UI.Checkbox().onChange(function(){
            updateUI( !isCustom.getValue() );
            update();
        });

        var opts = {};
        for( var k in slotIndex )
            if( !slotIndex[k].__hidden )
                opts[k] = k;

        var list = new UI.Select()
            .setWidth( '150px' )
            .setFontSize( '12px' )
            .setTextTransform('none')
            .setOptions( opts )
            .setValue( callName )
            .onChange(update);

        var custom = new UI.Input()
            .setWidth( '144px' )
            .setValue( callName )
            .onChange(update);

        var argContainer = new UI.Row()
            .setMarginTop('6px')
            .setStyle('min-height', ['1px']);

        var callContainer = new UI.Row()
            .setStyle('float', ['right'])
            .setMarginTop('2px');

        callContainer.add( scopeSelect );
        callContainer.add( isCustom );
        callContainer.add( list );
        callContainer.add( custom );
        obj.row.add( callContainer );
        obj.row.add( argContainer );

        updateUI();

        return;

        function update(){
            var newName;
            if( isCustom.getValue() ) newName = custom.getValue();
            else newName = list.getValue();
            var newScope = scopeSelect.getValue();

            if( newScope != callScope || newName != callName )
            {
                call = [newScope, newName];
                callName = newName;
                callScope = newScope;
                obj.value = call;
                updateUI();
            }
        }

        function updateUI( showList ){
            if( showList === undefined )
                showList = callName in slotIndex;
            
            isCustom.setValue( !showList );
            custom.setValue( callName );

            var index = slotIndex[callName];
            if( index )
                list.setValue( callName );

            list.setDisplay( showList ? 'inline' : 'none' );
            custom.setDisplay( showList ? 'none' : 'inline' );

            var subtypes;

            if( showList ){
                if( !index )
                    index = slotIndex[list.getValue()];
                var labels = [];
                var subtypes = [];
                if( index ){
                    args.length = index.length;
                    for( var i=0; i<args.length; ++i )
                    {
                        args[i] = args[i] === undefined ? index[i].default : args[i];
                        subtypes[i] = index[i].type || 'json';
                        labels[i] = index[i].name;
                    }
                }else args.length = 0;
            }

            var argDesc = {
                meta:  { type:'array', subtype:'json', subtypes:subtypes, labels:labels },
                get value(){ return args },
                set value( newArgs ){ args = newArgs; obj.value = [callScope, callName, args]; },
                key:'argument',
                default: [],
                e: argContainer
            };
            scope.factories.array.call( scope, argDesc );
        }
    },

    string:function( obj ){
        var value = obj.value;
        if( value === undefined )
            value = '';
        var e = new UI.Input()
            .setValue(value)
            .setWidth( '180px' )
            .setStyle('float', ['right']);
        obj.row.add( e );

        e.onChange(function(){
            obj.value = (e.getValue());
        });
    },

    longstring:function( obj ){
        var value = obj.value;
        if( value === undefined )
            value = '';

        var script = {
            type: 'text',
            name: obj.key,
            source: value,
            onChange: function( value ){
                script.source = obj.value = value;
            }
        };
        var e = new UI.Button('EDIT')
            .setWidth( '90px' )
            .setStyle('float', ['right'])
            .onClick(function(){
                editor.signals.editScript.dispatch( editor.selected, script );
            });
        obj.row.add( e );        
    },

    vec2i:function( obj ){
        var x = new UI.Integer( obj.value && obj.value.x || 0 ).setWidth( '50px' ).setStyle('float', ['right']);
        var y = new UI.Integer( obj.value && obj.value.y || 0 ).setWidth( '50px' ).setStyle('float', ['right']);
        obj.row.add( y );
        obj.row.add( x );

        if( "min" in obj.meta ) x.min = y.min = obj.meta.min;
        if( "max" in obj.meta ) x.max = y.max = obj.meta.max;
        if( "step" in obj.meta ) x.step = y.step = obj.meta.step;

        x.onChange(onChange);
        y.onChange(onChange);
        
        function onChange(){
            obj.value = ({
                x:x.getValue(),
                y:y.getValue()
            });
        }
    },

    vec3i:function( obj ){
        var x = new UI.Integer( obj.value && obj.value.x || 0 ).setWidth( '50px' );
        var y = new UI.Integer( obj.value && obj.value.y || 0 ).setWidth( '50px' );
        var z = new UI.Integer( obj.value && obj.value.z || 0 ).setWidth( '50px' );
        obj.row.add( x );
        obj.row.add( y );
        obj.row.add( z );

        if( "min" in obj.meta ) x.min = y.min = z.min = obj.meta.min;
        if( "max" in obj.meta ) x.max = y.max = z.max = obj.meta.max;
        if( "step" in obj.meta ) x.step = y.step = z.step = obj.meta.step;

        x.onChange(onChange);
        y.onChange(onChange);
        z.onChange(onChange);
        
        function onChange(){
            obj.value = ({
                x:x.getValue(),
                y:y.getValue(),
                z:z.getValue()
            });
        }
    },

    vec2f:function( obj ){
        var x = new UI.Number( obj.value && obj.value.x || 0 ).setWidth( '50px' );
        var y = new UI.Number( obj.value && obj.value.y || 0 ).setWidth( '50px' );
        obj.row.add( x );
        obj.row.add( y );

        if( "min" in obj.meta ) x.min = y.min = obj.meta.min;
        if( "max" in obj.meta ) x.max = y.max = obj.meta.max;
        if( "step" in obj.meta ) x.step = y.step = obj.meta.step;

        x.onChange(onChange);
        y.onChange(onChange);
        
        function onChange(){
            obj.value = ({
                x:x.getValue(),
                y:y.getValue()
            });
        }
    },

    vec3f:function( obj ){
        var x = new UI.Number( obj.value && obj.value.x || 0 ).setWidth( '50px' );
        var y = new UI.Number( obj.value && obj.value.y || 0 ).setWidth( '50px' );
        var z = new UI.Number( obj.value && obj.value.z || 0 ).setWidth( '50px' );
        obj.row.add( x );
        obj.row.add( y );
        obj.row.add( z );

        if( "min" in obj.meta ) x.min = y.min = z.min = obj.meta.min;
        if( "max" in obj.meta ) x.max = y.max = z.max = obj.meta.max;
        if( "step" in obj.meta ) x.step = y.step = z.step = obj.meta.step;

        x.onChange(onChange);
        y.onChange(onChange);
        z.onChange(onChange);
        
        function onChange(){
            obj.value = ({
                x:x.getValue(),
                y:y.getValue(),
                z:z.getValue()
            });
        }
    },

    int:function( obj ){
        var e = new UI.Integer(obj.value).setStyle('float', ['right']);
        obj.row.add( e );
        if( "min" in obj.meta ) e.min = obj.meta.min;
        if( "max" in obj.meta ) e.max = obj.meta.max;
        if( "step" in obj.meta ) e.step = obj.meta.step;
        e.dom.addEventListener("keydown", function(evt){
            if( evt.code == "ArrowUp" ){
                e.setValue( obj.value += e.step );
            }else if( evt.code == "ArrowDown" ){
                e.setValue( obj.value -= e.step );
            }else if( evt.code == "Space" ){
                var min = e.min, max = e.max;
                if( max == Number.POSITIVE_INFINITY )
                    max = Number.MAX_SAFE_INTEGER;
                if( min == Number.NEGATIVE_INFINITY )
                    min = Number.MIN_SAFE_INTEGER;
                e.setValue( obj.value = (Math.random()*(max-min)-min) );
            }else return;
            evt.preventDefault();
        });
        e.onChange(function(){
            obj.value = (e.getValue());
        });
    },

    float:function( obj ){
        var e = new UI.Number(obj.value).setStyle('float', ['right']);
        obj.row.add( e );
        if( "min" in obj.meta ) e.min = obj.meta.min;
        if( "max" in obj.meta ) e.max = obj.meta.max;
        if( "step" in obj.meta ) e.step = obj.meta.step;
        e.onChange(function(){
            obj.value = (e.getValue());
        });
    },

    bounds:function( obj ){
        var bounds = {};
        
        var r = new UI.Row();
        obj.row.add(r);
        add(r, "min x", "x");
        add(r, "max x", "width", "x");
        add(r, "min y", "y");
        add(r, "max y", "height", "y");
        add(r, "min z", "z");
        add(r, "max z", "depth", "z");

        function add( row, name, prop, sub ){
            var v = (obj.value && obj.value[prop]) || 0;
            bounds[prop] = v;

            if( obj.value && sub ) v += obj.value[sub];

            row.add( new UI.Text(name).setWidth("50px") );

            var e = new UI.Number(v);
            row.add( e );
            e.setWidth("80px");
            if( "min" in obj.meta ) e.min = obj.meta.min;
            if( "max" in obj.meta ) e.max = obj.meta.max;
            if( "step" in obj.meta ) e.step = obj.meta.step;
            e.onChange(function(){
                var v = e.getValue() || obj.default || 0;
                
                if( sub && bounds[sub] > v ){
                    v = bounds[sub];
                    e.setValue(v);
                }

                bounds[prop] = v;

                if( sub ) bounds[prop] -= bounds[sub];

                obj.value = ( bounds );
            });

        }
    },

    texture:function( obj ){
        var url;
        var canvas = DOC.create('canvas', obj.row.dom, {
            width:32,
            height:16,
            style:{
                marginRight:'5px',
                border:'1px solid #888'
            },
            onclick:function(){
                if( url )
                    window.open( url );
            }
        });
        var context = canvas.getContext( '2d' );
        
        var e = new UI.Input().setValue(obj.value).setWidth('155px').onChange(updateImage);
        obj.row.add(e);

        var image = DOC.create('img', {
            onload:function(){
                var scale = canvas.width / image.width;
                context.drawImage( image, 0, 0, image.width * scale, image.height * scale );
                e.setBackgroundColor('initial');
                obj.value = url;
            },
            onerror:function(){
                context.clearRect( 0, 0, canvas.width, canvas.height );
                e.setBackgroundColor('red');
                obj.value = obj.default;
            }
        });

        updateImage();

        function updateImage(){
            var newURL = e.getValue();
            if( newURL == url ) return;
            url = newURL;
            image.src = url;
        }
    },

    node:function( obj ){
        var e = new UI.Select().setStyle('float', ['right']);
        var opts = {}, meta = obj.meta;
        opts[obj.default] = "";
        
        var instOf = meta["instanceof"];
        if( instOf && !(instOf instanceof Array) ) instOf = [instOf];
        var instOfLength = (instOf && instOf.length) || 0;

        iterate( editor.scene );


        e.setOptions( opts )
            .setValue( obj.value )
            .onChange(function(){
            obj.value = (e.getValue());
        });

        obj.row.add( e );
        return;

        function iterate(n){
            if( !n ) return;
            check( n );
            if( n.children ){
                for( var i=0; i<n.children.length; ++i )
                    iterate(n.children[i]);
            }
        }

        function check(n){

            if( n.uuid ){

                if( instOf ){
                    for( var i=0; i<instOfLength; ++i ){

                        if( typeof instOf[i] != "string" )
                            continue;

                        var clazz = DOC.resolve( instOf[i] );
                        if( clazz && !(n instanceof clazz) )
                            return;
                    }
                }

                for( var k in meta.eq ){
                        if( meta.eq[k] != n[k] )
                        return;
                }

                opts[ n.uuid ] = n.name;

            }

        }
    }

};