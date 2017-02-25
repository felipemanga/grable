/**
 * @author FManga
 */

Sidebar.Entity = function ( editor ) {

	var components = null, 
        loadedCompPath = null, 
        editingObject = null, 
        editingComponent = null, 
        externalSlotIndex = {},
        internalSlotIndex = {},
        nextPreviewHnd = {};

	loadedCompPath = editor.config.getKey('editorComponentPath') || "../cmp";
	loadCompPath( loadedCompPath );

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

	var newScript = new UI.Button( 'Add Component' ).setMargin('2px').onClick( function () {
		editingComponent = null;
		var script = { type: "component", name:"", source: jsonPrefix + '{}' + jsonPostfix };
		editor.execute( new AddScriptCommand( editor.selected, script ) );
	} );

	btns.add( newScript );

	var listCmps = new UI.Button( 'List Components' ).setMargin('2px').onClick( function () {
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

    signals.objectAdded.add( function ( object ){
        preview( object, false ); 
    } );

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
            
            if( !components['cmp.Node'] )
                components['cmp.Node'] = {'threejs':'cmp.ThreeNode'};

			for( var k in components ){
				var cmp = components[k];
				if( cmp && cmp.threejs ){
                    if( cmp.threejs === true )
                        cmp.threejs = k;
					loadComponent( path, cmp.threejs, k );
                } else components[k] = null;
			}

		});

	}

	var CLAZZQueue = null;

	function loadComponent(path, fqcn, _interface){
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

        components[ _interface ].src = cmpPath;

		script = document.createElement("script");
		script.src = cmpPath;
		script.onload = onLoadComponent.bind(null, fqcn, _interface);
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
                        if( argName[0] == '_' )
                            return;
                            
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

	function onLoadComponent( fqcn, interface ){
		loadQueueSize--;
		var clazz = components[interface].clazz = DOC.resolve(fqcn);
		var meta = clazz.CLAZZ;

		if( clazz.PROVIDES ){
			for( var k in clazz.PROVIDES )
				components[k] = components[fqcn];
		}

        indexSlots( clazz, externalSlotIndex );

		if( !loadQueueSize ){
            preview( editor.scene, true );
			updateUI();
        }
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

        // preview( object, false );

        for ( var i = 0; i < scripts.length; i ++ ) {

            ( function ( object, script ) {

                if( script.hidden ){
                    script.type = 'component';
                    delete script.hidden;
                }

                if( script.type != 'component' ) return;

                var remove = new UI.Button( 'X' );
                remove.setMarginRight( '4px' );
                remove.onClick( function () {

                    editor.execute( new RemoveScriptCommand( editor.selected, script ) );
                    editingComponent = null;
                    updateUI();

                } );
                scriptsContainer.add( remove );

                var ref = new UI.Select()
					.setWidth( '170px' )
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

                var help = new UI.Button( '?' );
                help.setMarginLeft( '4px' );
                help.onClick( function () {

                    var cmpSrc = {
                        type: 'text',
                        name: script.name + ' [READ ONLY]',
                        source: components[ script.name ].help || "",
                        onChange: function(){}
                    };
                    editor.signals.editScript.dispatch( editor.selected, cmpSrc );

                } );
                scriptsContainer.add( help );                

                scriptsContainer.add( new UI.Break() );

            } )( object, scripts[ i ] )

        }

	}

    function preview( object, nest ){
		var scripts = editor.scripts[ object.uuid ];

        for( var k in scripts ){
            showPreview( object, scripts[k] );
        }

        if( nest && object.children ){

            for( var i=0; i<object.children.length; ++i ){
                preview( object.children[i], true );
            }

        }
        
    }

    function showPreview( object, script, data, immediate ){
        if( components 
            && components[script.name] 
            && components[script.name].clazz
            && components[script.name].clazz.CLAZZ
            && typeof components[script.name].clazz.CLAZZ.preview == "function"
            ){
                if( nextPreviewHnd[script.name] ){
                    clearTimeout( nextPreviewHnd[script.name] );
                }
                if( !immediate ){
                    nextPreviewHnd[script.name] = setTimeout( showPreview.bind(this, object, script, data, true), 1000 );
                    return;
                }
                delete nextPreviewHnd[script.name];
                
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
                var helper = editor.helpers[ object.id ];
                inst.preview(helper, function( newHelper ){
                    if( !newHelper ){
                        if( helper ){
                            editor.sceneHelpers.remove(helper);
                        }
                        return;
                    }

                    if( !helper ){
                        helper = Object.create( newHelper );
                        helper.update = function(){
                            helper.position.copy( object.position );
                            helper.rotation.copy( object.rotation );
                            helper.scale.copy( object.scale );
                        };
                        editor.helpers[ object.id ] = helper;
                        editor.sceneHelpers.add( helper );
                    }
                    helper.position.copy( object.position );
                    helper.rotation.copy( object.rotation );
                    helper.scale.copy( object.scale );
                    editor.signals.sceneGraphChanged.dispatch();
                });
                

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

		var scope = this, clazz = components[script.name].clazz;
		var props = [], data = getScriptData(script);

		var header = new UI.Row();
		header.add( new UI.Text(script.name) );
        header.add( new UI.Button('SOURCE').setMarginLeft('10px').onClick(function(){
            DOC.getURL( components[ script.name ].src, function( src ){
                var cmpSrc = {
                    name: script.name + ' [READ ONLY]',
                    source: src,
                    onChange: function(){}
                };
                editor.signals.editScript.dispatch( editor.selected, cmpSrc );
            });
        }));

        if( components[ script.name ].help ){
            header.add( new UI.Button('HELP').setMarginLeft('10px').onClick(function(){
                var cmpSrc = {
                    type: 'text',
                    name: script.name + ' [READ ONLY]',
                    source: components[ script.name ].help || "",
                    onChange: function(){}
                };
                editor.signals.editScript.dispatch( editor.selected, cmpSrc );
            }));
        }


		propsContainer.add(header)

        var triggers = {};

        UI.Meta.slotIndex = externalSlotIndex;

        var disableSave = false;

		for( var k in clazz.meta ){
            if( k in clazz.methods ) 
                continue;

			var meta = clazz.meta[k];
			var desc = {
				meta: meta,
				priority: meta.priority || 0,
				default: clazz.CLAZZ[k],
				key:k,
                header: new UI.Text( meta.label || k ).setWidth( '90px' )
			};

            var row = new UI.Meta(desc);
            desc.row = row;

            for( var op in meta.test ){
                for( var testKey in meta.test[op] ){
                    triggers[testKey] = triggers[testKey] || [];
                    triggers[testKey].push( desc );
                }
            }

			row.setValue( k in data ? data[k] : clazz.CLAZZ[k] );

            row.onChange(function(){
            	data[ this.descriptor.key ] = this.getValue();
                if( disableSave ) return;
                disableSave = true;
                if( this.descriptor.key in triggers ){
                    var list = triggers[this.descriptor.key];
                    for( var i=0; i<list.length; ++i )
                        test( list[i], data, clazz );
                }
                disableSave = false;

                var src = jsonPrefix + JSON.stringify(data) + jsonPostfix;
                editor.execute( new SetScriptValueCommand( object, script, 'source', src, {line: 1, ch: 1}, {left:0, top:0, width:0, height:0, clientWidth:0, clientHeight:0} ) );

                showPreview( object, script, data );
            });

            test( desc, data, clazz );
			props.push( desc );
		}

		props.sort(function(a, b){
			if( a.priority > b.priority ) return 1;
			if( a.priority < b.priority ) return -1;
			return 0;
		}).forEach( (p) => propsContainer.add(p.row) );
	}

    function test( desc, data, clazz ){
        var pass = !desc.meta.test || AND( data, clazz.CLAZZ, desc.meta.test );
        
        desc.row.setDisplay( pass?'block':'none' );

        if( !pass )
            desc.row.setValue( clazz.CLAZZ[desc.key], true );
    }

    var OPS = {
        AND,
        OR,
        EQ,
        NEQ,
        GT,
        LT,
        IN,
        NIN,
        INSTANCEOF,
        NOTINSTANCEOF
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

    function GT( data, clazz, tests ){
        for( var key in tests ){
            var value = data[key];
            if( value === undefined ) value = clazz[key];
            if( value <= tests[key] ) return false;
        }
        return true;
    }

    function LT( data, clazz, tests ){
        for( var key in tests ){
            var value = data[key];
            if( value === undefined ) value = clazz[key];
            if( value >= tests[key] ) return false;
        }
        return true;
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

    function INSTANCEOF( data, clazz, tests ){
        var ctx = Object.assign({ asset:editor.selected }, data);
        for( var key in tests ){
            var value = DOC.resolve( key, ctx );
            if( value === undefined ) value = clazz[key];
            if( !value || !(value instanceof DOC.resolve(tests[key])) ) 
                return false;
        }
        return true;
    }    

    function NOTINSTANCEOF( data, clazz, tests ){
        var ctx = Object.assign({ asset:editor.selected }, data);
        for( var key in tests ){
            var value = DOC.resolve( key, ctx );
            if( value === undefined ) value = clazz[key];
            if( value && (value instanceof DOC.resolve(tests[key])) ) 
                return false;
        }
        return true;
    }    

	return container;

};
