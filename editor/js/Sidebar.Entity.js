/**
 * @author FManga
 */

Sidebar.Entity = function ( editor ) {

	var components = null, 
        loadedCompPath = null, 
        editingObject = null, 
        editingComponent = null, 
        externalSlotIndex = {},
        internalSlotIndex = {};

	var jsonPrefix = 'return addComponent(', jsonPostfix = ')';

	var signals = editor.signals;

	var container = new UI.Panel();
	container.setBorderTop( '0' );
	container.setPaddingTop( '20px' );
	container.setDisplay( 'none' );

	var scriptsContainer = new UI.Row();
	container.add( scriptsContainer );

	var btns = new UI.Row();
	container.add( btns );

	var newScript = new UI.Button( 'Add Component' ).onClick( function () {
		editingComponent = null;
		var script = { hidden: true, name:"", source: jsonPrefix + '{}' + jsonPostfix };
		editor.execute( new AddScriptCommand( editor.selected, script ) );

	} );
	btns.add( newScript );

	var listCmps = new UI.Button( 'List Components' ).onClick( function () {
		editingComponent = null;

		scriptsContainer.setDisplay( 'block' );

		propsContainer.clear();
		propsContainer.setDisplay( 'none' );

		listCmps.setDisplay( 'none' );

	} );
	btns.add( listCmps );


	var propsContainer = new UI.Div();
	container.add( propsContainer );
	propsContainer.setDisplay( 'none' );    
    

	// events

	signals.objectSelected.add( function ( object ) {

		if ( object !== null ) {

			container.setDisplay( 'block' );

			updateUI( object );

		} else {

			container.setDisplay( 'none' );

		}

	} );
    
	signals.scriptAdded.add( updateUI );
	signals.scriptRemoved.add( updateUI );
	signals.scriptChanged.add( updateUI );

	var loadQueueSize = 0;

	function loadCompPath(path){
		loadedCompPath = path;
		components = {};

		var loader = new THREE.FileLoader();
		loader.load( path + '/components.json', function ( text ) {
			
			components = JSON.parse(text) || {};
            
            if( !components['cmp.ThreeNode'] )
                components['cmp.ThreeNode'] = {'threejs':true};

			for( var k in components ){
				var cmp = components[k];
				if( cmp && cmp.threejs )
					loadComponent(path, k);
				else components[k] = null;
			}

		});

	}

	var CLAZZQueue = null;

	function loadComponent(path, fqcn){
		loadQueueSize++;
		var i = 0, script;
		var pathparts = path.split("/");
		var fqcnparts = fqcn.split(".");
		while( 
			pathparts.length && 
			i < fqcnparts.length && 
			pathparts[pathparts.length-1] == fqcnparts[i] 
			){
				pathparts.pop();
				fqcnparts[i++];
			}
		var cmpPath = pathparts.concat(fqcnparts).join("/") + ".js";

		if( !self.CLAZZ ){
			self.CLAZZ = true;
			script = document.createElement("script");
			script.src = pathparts.join("/") + "/lib/CLAZZ.js";
			script.onload = function(){
				CLAZZQueue.forEach(e => document.head.appendChild(e));
				CLAZZQueue = null;
			};
			document.head.appendChild(script);
			CLAZZQueue = [];
		}

		script = document.createElement("script");
		script.src = cmpPath;
		script.onload = onLoadComponent.bind(null, fqcn);
		script.onerror = onError.bind(null, fqcn);
		if( CLAZZQueue ) CLAZZQueue.push(script);
		else document.head.appendChild(script);
	}

    function indexSlots( clazz, index )
    {

        for( var k in clazz.methods ){
            if( !index[k] )
                index[k] = [];

            var argIndex = index[k];
            var func = clazz.methods[k];
            var meta = clazz.meta[k] || {};
            if( meta.__hidden )
                argIndex.__hidden = true;

            var match = func.toString().match(/^[a-z0-9_$\s]*\(([^)]*)\)/i);
            if( match ){
                var args = match[1].trim();
                if( args.length ){
                    args.split(',').forEach( (argName, i) =>{
                        argName = argName.trim();
                        if( !argIndex[i] ){
                            argIndex[i] = { 
                                name:argName,
                                type:null,
                                default:null
                            };
                        }

                        if( meta[argName] && typeof meta[argName] == 'object' ){
                            var index = argIndex[i];
                            if( meta[argName].type )
                                index.type = meta[argName].type;

                            if( meta[argName].default )
                                index.default = meta[argName].default;
                        }
                    });
                }
            }else{
            	// console.log(func.toString());
            }
        }
        
    }

	function onLoadComponent( fqcn ){
		loadQueueSize--;
		var clazz = components[fqcn].clazz = CLAZZ.get(RESOLVE(fqcn));
		var meta = clazz.CLAZZ;

		if( clazz.PROVIDES ){
			for( var k in clazz.PROVIDES )
				components[k] = components[fqcn];
		}

        indexSlots( clazz, externalSlotIndex );

		if( !loadQueueSize )
			updateUI();
	}

	function onError(fqcn){
		console.warn("could not load component: ", fqcn);
		loadQueueSize--;
		if( !loadQueueSize )
			updateUI();
	}

	function updateUI() {
		var object = editor.selected;

		if ( object === null || (object === editingObject && editingComponent) ) {

			return;

		}

		editingObject = object;

		var path = editor.config.getKey('editorComponentPath') || "../cmp";
		if( path != loadedCompPath ){
			loadCompPath(path);
		}

		scriptsContainer.clear();
		scriptsContainer.setDisplay( 'none' );

		propsContainer.clear();
		propsContainer.setDisplay( 'none' );

		listCmps.setDisplay( 'none' );


		var scripts = editor.scripts[ object.uuid ];

		if ( scripts === undefined ) {

            return;

        }

		var refOpts = {};

		if( components ){
			for( var k in components ){

				var cmp = components[k];
				if( !cmp ) continue;

				refOpts[k] = k;

			}
		}


        scriptsContainer.setDisplay( 'block' );

        for ( var i = 0; i < scripts.length; i ++ ) {

            ( function ( object, script ) {

                if( !script.hidden ) return;

                var ref = new UI.Select()
					.setWidth( '200px' )
					.setTextTransform( 'none' )
					.setFontSize( '12px' )
					.setOptions(refOpts)
                	.onChange( function () {

                    editor.execute( new SetScriptValueCommand( editor.selected, script, 'name', this.getValue() ) );

                } );
				ref.setValue( script.name );
                scriptsContainer.add( ref );

                var edit = new UI.Button( 'Edit' );
                edit.setMarginLeft( '4px' );
                edit.onClick( function () {

                    // signals.editScript.dispatch( object, script );
					editProps( object, script )

                } );
                scriptsContainer.add( edit );

                var remove = new UI.Button( 'X' );
                remove.setMarginLeft( '4px' );
                remove.onClick( function () {

                    if ( confirm( 'Remove component ' + script.name + '?' ) ) {

                        editor.execute( new RemoveScriptCommand( editor.selected, script ) );

                    }

                } );
                scriptsContainer.add( remove );

                scriptsContainer.add( new UI.Break() );
                
                showPreview( object, script );

            } )( object, scripts[ i ] )

        }

	}

    function showPreview( object, script, data ){
        if( components 
            && components[script.name] 
            && components[script.name].clazz
            && components[script.name].clazz.CLAZZ
            && typeof components[script.name].clazz.CLAZZ.preview == "function"
            ){
                var clazz = components[script.name].clazz;
                if( !data )
                    data = getScriptData(script);
                else data = Object.assign({}, data);

                for( var key in clazz.meta ){
                    if( !(key in data) )
                        data[key] = clazz.CLAZZ[key];
                }
                data.entity = null;
                data.asset  = object;
                data.game   = null;

                var inst = CLAZZ.get( clazz, data );
                inst.preview();

                editor.signals.geometryChanged.dispatch( object );
            }
    }

    function getScriptData( script ){
        var data = (script.source||"").match(/^[^(]+\((.*)\)$/);
		if( !data ) data = {};
		else data = JSON.parse(data[1]);
        return data;
    }

	function editProps( object, script ){
		editingComponent = script;

		scriptsContainer.setDisplay( 'none' );
		listCmps.setDisplay( '' );
		propsContainer.setDisplay( 'block' );
		propsContainer.clear();

		if( !components || !components[script.name] || !components[script.name].clazz )
			return;

		var clazz = components[script.name].clazz;
		var props = [], data = getScriptData(script);

		var header = new UI.Row();
		header.add( new UI.Text(script.name) );
		propsContainer.add(header)

        var triggers = {};

		for( var k in clazz.meta ){
            if( k in clazz.methods ) 
                continue;

			var meta = clazz.meta[k], factory = propEditor[meta.type];
			if( !factory ) factory = propEditor.unknown;
			var row = new UI.Row();
			var desc = {
				priority: meta.priority || 0,
				meta:  meta,
				value: (k in data ? data[k] : clazz.CLAZZ[k]),
				default: clazz.CLAZZ[k],
				key:k,

				row: row,
                header: new UI.Text( meta.label || k ).setWidth( '90px' ),

				update: function(value){
					if( value == undefined ) value = this.value;
					else this.value = value;

					if( data[ this.key ] == value && typeof value != 'object' )
						return;
						
					data[ this.key ] = value;

					src = jsonPrefix + JSON.stringify(data) + jsonPostfix;

                    if( script.source == src )
                        return;
					
					editor.execute( new SetScriptValueCommand( object, script, 'source', src, {line: 1, ch: 1}, {left:0, top:0, width:0, height:0, clientWidth:0, clientHeight:0} ) );

                    if( this.key in triggers ){
                        var list = triggers[this.key];
                        for( var i=0; i<list.length; ++i )
                            list[i].test();
                    }

                    showPreview( object, script, data )
				},

                test:function(){
                    var pass = !this.meta.test || AND( data, clazz.CLAZZ, this.meta.test );
                    this.row.setDisplay( pass?'block':'none' );
                    if( !pass ) this.update( clazz.CLAZZ[this.key] );
                }
			};

			row.add( desc.header );

            for( var op in desc.meta.test ){
                for( var k in desc.meta.test[op] ){
                    triggers[k] = triggers[k] || [];
                    triggers[k].push( desc );
                }
            }

            desc.test();
            
			factory( desc );
			props.push( desc );

			var OPS = {
				AND,
				OR,
				EQ,
				NEQ,
				IN,
				NIN
			};

            function AND( data, clazz, tests ){
                for( var op in tests ){
                	if( !OPS[(op||"").toUpperCase()](data, clazz, tests[op]) ) return false;
                }
                return true;
            }

            function OR( data, clazz, tests ){
                for( var op in tests ){
                	if( OPS[(op||"").toUpperCase()](data, clazz, tests[op]) ) return true;
                }
                return false;
            }

            function EQ( data, clazz, tests ){
                for( var key in tests ){
                    var value = data[key];
                    if( value === undefined ) value = clazz[key];
                    if( value != tests[key] ) return false;
                }
                return true;
            }

            function NEQ( data, clazz, tests ){
                for( var key in tests ){
                    var value = data[key];
                    if( value === undefined ) value = clazz[key];
                    if( value == tests[key] ) return false;
                }
                return true;
            }            

            function IN( data, clazz, tests ){
                for( var key in tests ){
                    var value = data[key];
                    if( value === undefined ) value = clazz[key];
                    if( tests[key].indexOf(value) == -1 ) return false;
                }
                return true;
            }

            function NIN( data, clazz, tests ){
                for( var key in tests ){
                    var value = data[key];
                    if( value === undefined ) value = clazz[key];
                    if( tests[key].indexOf(value) != -1 ) return false;
                }
                return true;
            }            
		}

		props.sort(function(a, b){
			if( a.priority > b.priority ) return 1;
			if( a.priority < b.priority ) return -1;
			return 0;
		}).forEach( (p) => propsContainer.add(p.row) );
	}

	var propEditor = {

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
				obj.update(v);
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
				    obj.update( JSON.parse( v ) );
                    e.setBackgroundColor('inherit');                    
                }catch(err){
                    e.setBackgroundColor('red');
                }
			});
		},

		array:function( obj ){
            var arr = obj.value || [], meta = obj.meta;

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
                    var sub = {
                        meta:  {type:meta.subtypes && meta.subtypes[i] ? meta.subtypes[i] : meta.subtype},
                        value: arr[i],
                        default: meta.default,
                        row: e,
                        header: null,
                        update: (function(i, value){
                            if( value === undefined ) value = this.value;
                            else this.value = value;
                            
                            if( (typeof value != 'object' && arr[i] == value) || JSON.stringify(arr[i]) == JSON.stringify(value) )
                            	return;
                            arr[i] = value;
                            obj.update( arr );
                        }).bind(sub, i)
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

                    var factory = propEditor[ sub.meta.type ];
                    if( !factory ) factory = propEditor.unknown;
                    factory( sub );
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
                    e.add( new UI.Row() );
                }

                obj.update(arr);
                arr = arr.concat();
            }
		},        

		bool:function( obj ){
			var e = new UI.Checkbox(obj.value).setMarginLeft('10px');
			obj.row.add( e );
			e.onChange(function(){
				obj.update(e.getValue());
			});
		},

		enum:function( obj ){
			var e = new UI.Select().setWidth( '180px' ).setFontSize( '12px' ).setStyle('float', ['right']);
			var opts = {};
			var options = obj.meta.options || [];
			
			if( Array.isArray(options) ){
				options.forEach((o) => opts[o] = o);
			}else options = o;

			e.setOptions( opts )
			 .setValue( obj.value )
			 .onChange(function(){
				obj.update(e.getValue());
			});

			obj.row.add( e );
		},

        slot:function( obj ){
            var call = obj.value;
            if( !Array.isArray(call) || call.length != 3 ) 
                call = ["", "", []];
            var args = call[2] || [];
            var callName = call[1], callScope = call[0];
            
            var scopeOpts = {
                "":"[ this entity ]",
                "broadcast":"[ all entities ]"
            };

            iterate( editor.scene );

            function iterate(n){
                if( !n ) return;
                scopeOpts[n.uuid] = n.name;
                if( n.children ){
                    for( var i=0; i<n.children.length; ++i )
                        iterate(n.children[i]);
                }
            }            

            var scope = new UI.Select()
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
            for( var k in externalSlotIndex )
                if( !externalSlotIndex[k].__hidden )
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

            var argContainer = new UI.Row().setMarginTop('6px');
            var callContainer = new UI.Row().setStyle('float', ['right']).setMarginTop('2px');

			callContainer.add( scope );
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
                var newScope = scope.getValue();

                if( newScope != callScope || newName != callName )
                {
                    call = [newScope, newName];
                    callName = newName;
                    callScope = newScope;
                    obj.update(call);
					updateUI();
                }
            }

            function updateUI( showList ){
                if( showList === undefined )
                    showList = callName in externalSlotIndex;
                
                isCustom.setValue( !showList );
                custom.setValue( callName );

                var index = externalSlotIndex[callName];
                if( index )
                    list.setValue( callName );

                list.setDisplay( showList ? 'inline' : 'none' );
                custom.setDisplay( showList ? 'none' : 'inline' );

                var subtypes;

                if( showList ){
                    if( !index )
                        index = externalSlotIndex[list.getValue()];
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
                    value: args,
                    key:'argument',
                    default: [],
                    e: argContainer,
                    update: function(value){
                        if( value === undefined ) value = argDesc.value;
                        else argDesc.value = value;
                        args = value;
                        obj.update( [callScope, callName, value] );
                    }
                };
                propEditor.array( argDesc );
            }
        },

		string:function( obj ){
			var e = new UI.Input().setValue(obj.value).setWidth( '180px' ).setStyle('float', ['right']);
			obj.row.add( e );
			e.onChange(function(){
				obj.update(e.getValue());
			});
		},

		vec3i:function( obj ){
			var x = new UI.Integer( obj.value && obj.value.x || 0 ).setWidth( '50px' );
			var y = new UI.Integer( obj.value && obj.value.y || 0 ).setWidth( '50px' );
			var z = new UI.Integer( obj.value && obj.value.z || 0 ).setWidth( '50px' );
			obj.row.add( x );
			obj.row.add( y );
			obj.row.add( z );

			if( "min" in obj.meta ) x.min = y.min = z.min = obj.meta.min;
			if( "max" in obj.meta ) x.min = y.min = z.max = obj.meta.max;
			if( "step" in obj.meta ) x.min = y.min = z.step = obj.meta.step;

			x.onChange(onChange);
			y.onChange(onChange);
			z.onChange(onChange);
			
			function onChange(){
				obj.update({
					x:x.getValue(),
					y:y.getValue(),
					z:z.getValue()
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
			if( "max" in obj.meta ) x.min = y.min = z.max = obj.meta.max;
			if( "step" in obj.meta ) x.min = y.min = z.step = obj.meta.step;

			x.onChange(onChange);
			y.onChange(onChange);
			z.onChange(onChange);
			
			function onChange(){
				obj.update({
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
			e.onChange(function(){
				obj.update(e.getValue());
			});
		},

		float:function( obj ){
			var e = new UI.Number(obj.value).setStyle('float', ['right']);
			obj.row.add( e );
			if( "min" in obj.meta ) e.min = obj.meta.min;
			if( "max" in obj.meta ) e.max = obj.meta.max;
			if( "step" in obj.meta ) e.step = obj.meta.step;
			e.onChange(function(){
				obj.update(e.getValue());
			});
		},

        bounds:function( obj ){
            var bounds = {};
            
            var r = new UI.Row();
            obj.row.add(r);
            add(r, "min x", "x");
            add(r, "max x", "width", "x");
            add(r, "min y", "y");
            add(r, "max y", "top", "y");
            add(r, "min z", "z");
            add(r, "max z", "far", "z");

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
                    bounds[prop] = e.getValue();
                    if( sub ) bounds[prop] -= bounds[sub];

                    obj.update( bounds );
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
                    // obj.update( url );
                },
                onerror:function(){
                    context.clearRect( 0, 0, canvas.width, canvas.height );
                    e.setBackgroundColor('red');
                    obj.update( obj.default );
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
				obj.update(e.getValue());
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

	return container;

};
