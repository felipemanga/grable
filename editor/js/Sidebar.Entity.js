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
		var script = { type: "component", name:"", source: jsonPrefix + '{}' + jsonPostfix };
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

                if( script.hidden ){
                    script.type = 'component';
                    delete script.hidden;
                }

                if( script.type != 'component' ) return;

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

		var scope = this, clazz = components[script.name].clazz;
		var props = [], data = getScriptData(script);

		var header = new UI.Row();
		header.add( new UI.Text(script.name) );
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

	return container;

};
