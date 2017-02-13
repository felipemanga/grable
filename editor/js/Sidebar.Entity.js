/**
 * @author FManga
 */

Sidebar.Entity = function ( editor ) {

	var components = null, loadedCompPath = null, editingObject = null, editingComponent = null;

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
    

	function update() {

	}

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

	function onLoadComponent( fqcn ){
		loadQueueSize--;
		var clazz = components[fqcn].clazz = CLAZZ.get(RESOLVE(fqcn));
		var meta = clazz.CLAZZ;

		if( CLAZZ.PROVIDES ){
			for( var k in CLAZZ.PROVIDES )
				components[k] = components[fqcn];
		}


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

		var path = editor.config.getKey('editorComponentPath');
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

                var ref = new UI.Select().setWidth( '200px' ).setFontSize( '12px' );
				ref.setOptions(refOpts);
                ref.onChange( function () {

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

            } )( object, scripts[ i ] )

        }

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
		var props = [], data = (script.source||"").match(/^[^(]+\((.*)\)$/);

		var header = new UI.Row();
		header.add( new UI.Text(script.name) );
		propsContainer.add(header)

		
		if( !data ) data = {};
		else data = JSON.parse(data[1]);

		for( var k in clazz.meta ){
			var meta = clazz.meta[k], factory = propEditor[meta.type];
			if( !factory ) factory = propEditor.unknown;
			var row = new UI.Row();
			var desc = {
				priority: meta.priority || 0,
				meta:  meta,
				value: data[k] || clazz.CLAZZ[k],
				key:k,
				row: row,
				update: function(value){
					if( value == undefined ) value = this.value;
					else this.value = value;
					data[ this.key ] = value;

					src = jsonPrefix + JSON.stringify(data) + jsonPostfix;
					
					editor.execute( new SetScriptValueCommand( object, script, 'source', src, {line: 1, ch: 1}, {left:0, top:0, width:0, height:0, clientWidth:0, clientHeight:0} ) );
				}
			};

			row.add( new UI.Text( meta.label || k ).setWidth( '90px' ) );
			factory( desc );
			props.push( desc );
		}

		props.sort(function(a, b){
			if( a.priority > b.priority ) return 1;
			if( a.priority < b.priority ) return -1;
			return 0;
		}).forEach( (p) => propsContainer.add(p.row) );
	}

	var propEditor = {

		unknown:function( obj ){
			obj.row.add( new UI.Text( 'Unknown type:' + (obj.meta.type||"undefined")  ) );
		},

		string:function( obj ){
			var e = new UI.Input().setValue(obj.value).setWidth( '180px' );
			obj.row.add( e );
			e.onChange(function(){
				obj.update(e.getValue());
			});
		},

		bool:function( obj ){
			var e = new UI.Checkbox(obj.value);
			obj.row.add( e );
			e.onChange(function(){
				obj.update(e.getValue());
			});
		},

		enum:function( obj ){
			var e = new UI.Select().setWidth( '180px' ).setFontSize( '12px' );
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

		string:function( obj ){
			var e = new UI.Input().setValue(obj.value).setWidth( '180px' );
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
			var e = new UI.Integer(obj.value);
			obj.row.add( e );
			if( "min" in obj.meta ) e.min = obj.meta.min;
			if( "max" in obj.meta ) e.max = obj.meta.max;
			if( "step" in obj.meta ) e.step = obj.meta.step;
			e.onChange(function(){
				obj.update(e.getValue());
			});
		},

		float:function( obj ){
			var e = new UI.Number(obj.value);
			obj.row.add( e );
			if( "min" in obj.meta ) e.min = obj.meta.min;
			if( "max" in obj.meta ) e.max = obj.meta.max;
			if( "step" in obj.meta ) e.step = obj.meta.step;
			e.onChange(function(){
				obj.update(e.getValue());
			});
		}

	};

	return container;

};
