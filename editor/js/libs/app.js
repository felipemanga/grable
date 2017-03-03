/**
 * @author mrdoob / http://mrdoob.com/
 */

var APP = {

	Player: function () {

		var loader = new THREE.ObjectLoader();
		var camera, scene, renderer, pool, scope = this;

		var controls, effect, cameraVR, isVR;

		var events = {};

		this.dom = document.createElement( 'div' );
        this.sceneLoaded = false;
		this.width = 500;
		this.height = 500;
		this.scene = null;
		this.pool = null;
		this.scene = null;
		this.camera = null;
		this.renderer = null;

        isActive = true;

		this.load = function ( json ) {

			this.sceneLoaded = false;
            isActive = true;

			isVR = json.project.vr;

			this.renderer = renderer = new THREE.WebGLRenderer( { antialias: true } );
			renderer.setClearColor( 0x000000 );
			renderer.setPixelRatio( window.devicePixelRatio );

			if ( json.project.gammaInput ) renderer.gammaInput = true;
			if ( json.project.gammaOutput ) renderer.gammaOutput = true;

			if ( json.project.shadows ) {

				renderer.shadowMap.enabled = true;
				// renderer.shadowMap.type = THREE.PCFSoftShadowMap;

			}

			this.dom.appendChild( renderer.domElement );

			this.setScene( loader.parse( json.scene ) );
			this.setCamera( loader.parse( json.camera ) );

			pool = this.pool = self.POOL = new DOC.Pool();
            pool.add(this);

			events = {
				init: [],
				start: [],
				stop: [],
				keydown: [],
				keyup: [],
				mousedown: [],
				mouseup: [],
				mousemove: [],
				touchstart: [],
				touchend: [],
				touchmove: [],
				update: []
			};

			var scriptWrapParams = 'player,renderer,scene,camera,pool,addComponent';
			var scriptWrapResultObj = {};

			for ( var eventKey in events ) {

				scriptWrapParams += ',' + eventKey;
				scriptWrapResultObj[ eventKey ] = eventKey;

			}

			var scriptWrapResult = JSON.stringify( scriptWrapResultObj ).replace( /\"/g, '' );

			for ( var uuid in json.scripts ) {

				var object = scene.getObjectByProperty( 'uuid', uuid, true );

				if ( object === undefined ) {

                    if( uuid == this.camera.uuid ){
                        object = this.camera;
                    }else{
                        console.warn( 'APP.Player: Script without object.', uuid );
                        continue;
                    }


				}

				this.addEntity({
					components:{
						"cmp.ThreeNode":{
							scripts: json.scripts[ uuid ],
						}
					} 
				}, {
                    asset:object
                });
			}

            if( !this.loadingAsync ){
                this.sceneLoaded = true;
                pool.call("onReady");
            }
		};

        this.loadingAsync = 0;
        this.onLoadingAsyncStart = function(){
            this.loadingAsync++;
        };

        this.onLoadingAsyncEnd = function(){
            this.loadingAsync--;
            if( !this.loadingAsync && !this.sceneLoaded ){
                this.sceneLoaded = true;
                pool.call("onReady");
            }
        };
		
	    this.addEntity = function(name, inject){
			var e = CLAZZ.get("Entity", DOC.mergeTo({
				gameState:this, 
				pool:pool,
				call:pool.call.bind(pool),
				game:this,
				descriptor:DOC.mergeTo({}, name, inject)
			}, inject));

            if( this.sceneLoaded && e.onReady )
                e.onReady();
                
            return e;
		};


		this.setCamera = function ( value ) {

			this.camera = camera = value;
			camera.aspect = this.width / this.height;
			camera.updateProjectionMatrix();

			if ( isVR === true ) {

				cameraVR = new THREE.PerspectiveCamera();
				cameraVR.projectionMatrix = camera.projectionMatrix;
				camera.add( cameraVR );

				controls = new THREE.VRControls( cameraVR );
				effect = new THREE.VREffect( renderer );

				if ( WEBVR.isAvailable() === true ) {

					this.dom.appendChild( WEBVR.getButton( effect ) );

				}

				if ( WEBVR.isLatestAvailable() === false ) {

					this.dom.appendChild( WEBVR.getMessage() );

				}

			}

		};

		this.setScene = function ( value ) {

			scene = this.scene = value;

		};

		this.setSize = function ( width, height ) {

			this.width = width;
			this.height = height;

			if ( camera ) {

				camera.aspect = this.width / this.height;
				camera.updateProjectionMatrix();

			}

			if ( renderer ) {

				renderer.setSize( width, height );

			}

		};

		function dispatch( array, event ) {

			for ( var i = 0, l = array.length; i < l; i ++ ) {

				array[ i ]( event );

			}

		}

		var prevTime, request;

		function animate( time ) {

			request = requestAnimationFrame( animate );

            if( !scope.sceneLoaded )
                return;

            var delta = (time - prevTime) / 1000;
            if( delta < 0 ) delta = 1/30;
            else if( delta > 1 ) delta = 1;

			try {

				pool.call( "onTick", delta );
				pool.call( "onPostTick", delta );

			} catch ( e ) {

				console.error( ( e.message || e ), ( e.stack || "" ) );

			}

			if ( isVR === true ) {

				camera.updateMatrixWorld();

				controls.update();
				effect.render( scene, cameraVR );

			} else if( renderer ) {

				renderer.render( scene, camera );

			}

			prevTime = time;

		}

		this.play = function () {

			document.addEventListener( 'keydown', onDocumentKeyDown );
			document.addEventListener( 'keyup', onDocumentKeyUp );
			document.addEventListener( 'mousedown', onDocumentMouseDown );
			document.addEventListener( 'mouseup', onDocumentMouseUp );
			document.addEventListener( 'mousemove', onDocumentMouseMove );
			document.addEventListener( 'touchstart', onDocumentTouchStart );
			document.addEventListener( 'touchend', onDocumentTouchEnd );
			document.addEventListener( 'touchmove', onDocumentTouchMove );

			// dispatch( events.start, arguments );
			pool.call("start")

			request = requestAnimationFrame( animate );
			prevTime = performance.now();

		};

        this.isActive = function(){
            return isActive;
        };

		this.stop = function () {

            isActive = false;

			document.removeEventListener( 'keydown', onDocumentKeyDown );
			document.removeEventListener( 'keyup', onDocumentKeyUp );
			document.removeEventListener( 'mousedown', onDocumentMouseDown );
			document.removeEventListener( 'mouseup', onDocumentMouseUp );
			document.removeEventListener( 'mousemove', onDocumentMouseMove );
			document.removeEventListener( 'touchstart', onDocumentTouchStart );
			document.removeEventListener( 'touchend', onDocumentTouchEnd );
			document.removeEventListener( 'touchmove', onDocumentTouchMove );

			// dispatch( events.stop, arguments );
			pool.call("destroy")

			cancelAnimationFrame( request );

		};

		this.dispose = function () {

			while ( this.dom.children.length ) {

				this.dom.removeChild( this.dom.firstChild );

			}

			renderer.dispose();

			camera = undefined;
			scene = undefined;
			renderer = undefined;

		};

		//

		function onDocumentKeyDown( event ) {

			dispatch( events.keydown, event );

		}

		function onDocumentKeyUp( event ) {

			dispatch( events.keyup, event );

		}

		function onDocumentMouseDown( event ) {

			dispatch( events.mousedown, event );

		}

		function onDocumentMouseUp( event ) {

			dispatch( events.mouseup, event );

		}

		function onDocumentMouseMove( event ) {

			dispatch( events.mousemove, event );

		}

		function onDocumentTouchStart( event ) {

			dispatch( events.touchstart, event );

		}

		function onDocumentTouchEnd( event ) {

			dispatch( events.touchend, event );

		}

		function onDocumentTouchMove( event ) {

			dispatch( events.touchmove, event );

		}

	}

};
