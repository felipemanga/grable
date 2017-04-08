(function(){


CLAZZ("cmp.Spriter", {

    INJECT:["entity", "game", "sconURL", "imagePath", "enabled", "skeleton", "animation"],

    "@enabled":{type:"bool"},
	enabled:true,

    "@sconURL":{type:"string"},
    sconURL:"resources/scons/default.scon",

    "@imagePath":{type:"string"},
    imagePath:"resources/image/",

    "@skeleton":{type:"enum", async:"getSkeletonList"},
	skeleton:"",

    "@animation":{type:"enum", async:"getAnimationList"},
	animation:"",

    sconJSON:null,
    scon:null,
    asset:null,
    buffer:null,

	time:0,
	_prevAnim:null,

	create:function(){
        this.entity.pool.call("onLoadingAsyncStart");
        var ldr = new THREE.SconLoader();
        ldr.setTexturePath( this.imagePath );
        ldr.load( this.sconURL, this._onGotSCON.bind(this) );
	},

    onTick:function( delta ){
        if( this.asset )
            this.asset.setDelta( delta );
    },

    _editorGetSCON:function( arg, cb ){
        var scon = this.scon;
        if( !scon ){

            DOC.getURL( this.sconURL, function( scon ){

                var ret = null;
                try{
                    ret = cb( JSON.parse(scon) );
                }catch(ex){
                    console.log(ex);
                }

                if( arg )
                    arg( ret );

            }, {anystate:true} );

        } else {

            var ret = cb( null );

            if( arg )
                arg( ret );

            return ret;
        }
    },

    getAnimationList:function( cb ){
        var skeleton = this.skeleton;
        return this._editorGetSCON(cb, function( scon ){
            var names = [];
            if( !scon ) return names;
            var entities = scon.entity;
            
            for( var i=0, l=entities.length; i<l; ++i ){

                if( entities[i].name == skeleton ){

                    var animations = entities[i].animation;
                    for( var j=0, al=animations.length; j<al; ++j ){
                        names[names.length] = animations[j].name;
                    }
                    return names;
                }

            }

            return names;
        });
    },

    getSkeletonList:function( cb ){
        return this._editorGetSCON( cb, function( scon ){

            var ret = [], entities = scon.entity;

            for( var i=0, l=entities.length; i<l; ++i )
                ret.push(entities[i].name);
                
            return ret;

        });
    },

    _onGotSCON:function( scon ){
        var node = new THREE.SconSprite( scon );
        this.asset = node;
        
        this.asset.setSkeleton( this.skeleton );
        this.asset.setAnimation( this.animation );
        this.asset.play();

        this.entity.setNode( node );
        this.entity.pool.call("onLoadingAsyncEnd");
    },

	setEnabled:function(e){
		if( e == this.enabled ) return;
		this.enabled = e;
	}	

});


(function (){

    function SconSprite( scon ){
        var animation, skeleton, time = 0, delta = 1/30, dirty = true, playing = false;

        THREE.Object3D.call( this );

        this.isMesh = true;
        this.frustumCulled = false;
		this.drawMode = THREE.TrianglesDrawMode;

        this.type = 'SconSprite';

        this.scon = scon;

        this.buffer = null;

        if( scon ){

            this.createGeometry( scon );
            this.material = new THREE.SconSpriteMaterial( scon );

        }

        this.setScon = function( _scon ){

            this.scon = scon = _scon;

        };

        this.setSkeleton = function( name ){

            skeleton = scon.getEntityId( name );

        };

        this.setAnimation = function( name ){

            var id = scon.getAnimationId( skeleton, name );

            if( id != animation ){

                animation = id;
                time = 0;

            }

        };

        this.isDirty = function(){ return dirty || playing; };

        this.play = function(){ playing = true; };

        this.stop = function(){ playing = false; };

        this.setTime = function( t ){

            time = t || 0;
            dirty = true;

        };

        this.setDelta = function( _delta ){

            delta = _delta;

        };

        this.getSkeletonList = function(){

            var ret = [], entities = scon.entity;

            for( var i=0, l=entities.length; i<l; ++i )
                ret.push(entities[i].name);
                
            return ret;
            
        };

        this.getAnimationList = function( skeleton ){

            var names = [];
            if( !scon ) return names;
            var entities = scon.entity;
            
            for( var i=0, l=entities.length; i<l; ++i ){

                if( entities[i].name == skeleton ){

                    var animations = entities[i].animation;
                    for( var j=0, al=animations.length; j<al; ++j ){

                        names[names.length] = animations[j].name;

                    }

                    return names;

                }

            }

            return names;

        };

        var sprites = {};

        this._update = function(){
            
            dirty = false;
            if( playing ){

                time += delta;

            }

            var buffer = this.buffer.array;
            var geometry = this.geometry;

            geometry.drawRange.count = 0;
            var i=0, z=0, folder = this.scon.folder;

            var size = this.material.map.image.width;

		    this.scon.setCurrentTime( time * 1000, {}, skeleton || 0, animation || 0, function( obj ) {

    			var meta = folder[ obj.folder ].file[ obj.file ];
                var fit = meta.fit;
                
                var sprite = sprites[ meta.name ];

                if( !sprite ){

                    sprite = sprites[ meta.name ] = {
                        pivot_x: 0.5,
                        pivot_y: 0.5,
                        scale_x: 1,
                        scale_y: 1,
                        x:0,
                        y:0,
                        angle:0
                    };

                }

                if( "pivot_x" in meta ) sprite.pivot_x = meta.pivot_x;
                if( "pivot_y" in meta ) sprite.pivot_y = 1-meta.pivot_y;
                if( "scale_x" in obj  ) sprite.scale_x = obj.scale_x;
                if( "scale_y" in obj  ) sprite.scale_y = obj.scale_y;
                if( "x" in obj ) sprite.x = obj.x;
                if( "y" in obj ) sprite.y = obj.y;
                if( "angle" in obj ) sprite.rotation = - obj.angle / 180 * Math.PI - Math.PI*0.5;

                var p = 0;

                buffer[ i++ ] = sprite.x;
                buffer[ i++ ] = sprite.y;
                buffer[ i++ ] = 0;

                buffer[ i++ ] = meta.width * sprite.pivot_x;
                buffer[ i++ ] = - meta.height * sprite.pivot_y;

                buffer[ i++ ] = sprite.rotation;
                buffer[ i++ ] = z;
                buffer[ i++ ] = meta.x;
                buffer[ i++ ] = 1 - (meta.y);
                p++;

                buffer[ i++ ] = sprite.x;
                buffer[ i++ ] = sprite.y;
                buffer[ i++ ] = 0;

                buffer[ i++ ] = - meta.width * ( 1 - sprite.pivot_x );
                buffer[ i++ ] = meta.height * ( 1 - sprite.pivot_y );

                buffer[ i++ ] = sprite.rotation;
                buffer[ i++ ] = z;
                buffer[ i++ ] = meta.x + meta.w;
                buffer[ i++ ] = 1 - (meta.y + meta.h);
                p++;

                buffer[ i++ ] = sprite.x;
                buffer[ i++ ] = sprite.y;
                buffer[ i++ ] = 0;

                buffer[ i++ ] = - meta.width * ( 1 - sprite.pivot_x );
                buffer[ i++ ] = - meta.height * sprite.pivot_y;

                buffer[ i++ ] = sprite.rotation;
                buffer[ i++ ] = z;
                buffer[ i++ ] = meta.x + meta.w;
                buffer[ i++ ] = 1 - (meta.y);
                p++;



                buffer[ i++ ] = sprite.x;
                buffer[ i++ ] = sprite.y;
                buffer[ i++ ] = 0;

                buffer[ i++ ] = meta.width * sprite.pivot_x;
                buffer[ i++ ] = meta.height * ( 1 - sprite.pivot_y );

                buffer[ i++ ] = sprite.rotation;
                buffer[ i++ ] = z;
                buffer[ i++ ] = meta.x;
                buffer[ i++ ] = 1 - (meta.y + meta.h);
                p++;

                buffer[ i++ ] = sprite.x;
                buffer[ i++ ] = sprite.y;
                buffer[ i++ ] = 0;

                buffer[ i++ ] = - meta.width * ( 1 - sprite.pivot_x );
                buffer[ i++ ] = meta.height * ( 1 - sprite.pivot_y );

                buffer[ i++ ] = sprite.rotation;
                buffer[ i++ ] = z;
                buffer[ i++ ] = meta.x + meta.w;
                buffer[ i++ ] = 1 - (meta.y + meta.h);
                p++;

                buffer[ i++ ] = sprite.x;
                buffer[ i++ ] = sprite.y;
                buffer[ i++ ] = 0;

                buffer[ i++ ] = meta.width * sprite.pivot_x;
                buffer[ i++ ] = - meta.height * sprite.pivot_y;

                buffer[ i++ ] = sprite.rotation;
                buffer[ i++ ] = z;
                buffer[ i++ ] = meta.x;
                buffer[ i++ ] = 1 - (meta.y);
                p++;

                geometry.drawRange.count += p;
                z++;

            });

            this.buffer.needsUpdate = true;            

        };

        this.onBeforeRender = SconSprite.prototype.onBeforeRender;

    }

    SconSprite.prototype = Object.assign( Object.create( THREE.Object3D.prototype ), {

        constructor: SconSprite,

        onBeforeRender:function(){

            if( this.isDirty() )
                this._update();

        },

        createGeometry: function(){

            var vertexSize =
                  3 // position
                + 2 // offset
                + 2 // rotation, priority
                + 2 // uv
                ;


            // allocate enough vertices for the worst-case scenario: every sprite is visible
            var points = 0;
            var folder = this.scon.folder;
            for( var i=0, l=folder.length; i<l; ++i ){
                var files = folder[i].file;
                points += files.length * vertexSize * 6;
            }
            
            var arr = new Float32Array( points );
            arr.fill(0xFF);

            var ibuff = new THREE.InterleavedBuffer( arr, vertexSize );
            this.buffer = ibuff;
            ibuff.setDynamic( true );

            var geometry = new THREE.BufferGeometry();
            this.geometry = geometry;
            geometry.drawRange.count = 0;

            var p = 0;
            var position = new THREE.InterleavedBufferAttribute( ibuff, 3, p );
            geometry.addAttribute("position", position); p += 3;

            var offset = new THREE.InterleavedBufferAttribute( ibuff, 2, p );
            geometry.addAttribute("offset", offset); p += 2;

            var rotation = new THREE.InterleavedBufferAttribute( ibuff, 1, p );
            geometry.addAttribute("rotation", rotation); p += 1;

            var priority = new THREE.InterleavedBufferAttribute( ibuff, 1, p );
            geometry.addAttribute("priority", priority); p += 1;

            var uv = new THREE.InterleavedBufferAttribute( ibuff, 2, p );
            geometry.addAttribute("uv", uv); p += 2;

        }
        
    });

    THREE.SconSprite = SconSprite;


    function SconSpriteMaterial( scon ){

        THREE.ShaderMaterial.call( this, {
            fragmentShader: this.fragmentShader,
            vertexShader: this.vertexShader,

            lights: true,
            side: THREE.DoubleSide,
            
			uniforms: THREE.UniformsUtils.merge( [
				THREE.UniformsLib.common,
				THREE.UniformsLib.aomap,
				THREE.UniformsLib.lightmap,
				THREE.UniformsLib.emissivemap,
				THREE.UniformsLib.fog,
				THREE.UniformsLib.lights,
				{
					emissive: { value: new THREE.Color( 0x000000 ) }
				}
			])

        });

        this.map = this.uniforms.map.value = scon.map;
        this.alphaTest = 0.5;
        
    }

    SconSpriteMaterial.prototype = Object.assign( Object.create( THREE.ShaderMaterial.prototype ), {

        constructor: SconSpriteMaterial,
        
        vertexShader:`
#define LAMBERT

varying vec3 vLightFront;

#ifdef DOUBLE_SIDED

	varying vec3 vLightBack;

#endif

#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <bsdfs>
#include <lights_pars>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

attribute vec2 offset;
attribute float rotation;
attribute float priority;

void main() {

	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>

	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>

	#include <begin_vertex>

    vec2 RSC = vec2( sin(rotation), cos(rotation) );

    vec2 rotOffset = vec2(
        offset.x * RSC.x - offset.y * RSC.y,
        offset.x * RSC.y + offset.y * RSC.x
        );

    transformed.xy += rotOffset.xy;

	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>

    if( projectionMatrix[3][3] != 1. ){

        float csz = ( modelMatrix * vec4( transformed, 1.0 ) ).z;

        float epsilon = projectionMatrix[3][2] * ( priority / ( csz * ( csz + priority ) ) ) * 10.;

        gl_Position.z += epsilon;

    }

	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <lights_lambert_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>

}        
        `,

        fragmentShader: THREE.ShaderChunk.meshlambert_frag
        

    });

    THREE.SconSpriteMaterial = SconSpriteMaterial;


	function SconLoader( manager ) {

		if ( typeof manager === 'boolean' ) {

			console.warn( 'THREE.JSONLoader: showStatus parameter has been removed from constructor.' );
			manager = undefined;

		}

		this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

		this.withCredentials = false;

	}

	Object.assign( SconLoader.prototype, {

		load: function( url, onLoad, onProgress, onError ) {

			var scope = this;

			var loader = new THREE.FileLoader( this.manager );
			loader.setWithCredentials( this.withCredentials );
			loader.load( url, function ( text ) {

                if( !this.texturePath || typeof this.texturePath !== "string" )
			        this.texturePath = THREE.Loader.prototype.extractUrlBase( url );

				var json = JSON.parse( text );
                scope.parse( json, onLoad );

            });

		},

		setTexturePath: function ( value ) {

			this.texturePath = value;

		},

		parse: function ( json, onLoad ) {

            var scon = new Scon( json.entity, json.folder );

            this.parseImages( scon, function( texture ){

                scon.map = texture;

                onLoad( scon );
                
            });

        },

        parseImages: function( scon, onLoad ){

            var files = [], queueSize = 1, scope = this;

            var manager = new THREE.LoadingManager( onImagesLoaded );
            var loader = new THREE.ImageLoader( manager );
            loader.setCrossOrigin( this.crossOrigin );            


            for( var i=0, l=scon.folder.length; i<l; ++i ){

                var file = scon.folder[i].file;

                for( j=0, fl=file.length; j<fl; ++j ){

                    files[files.length] = file[j];
                    loadImage( file[j] );

                }

            }

            return;

            function onImagesLoaded(){

                files.sort(function(a, b){
                    var A = a.w*a.h,
                        B = b.w*b.h;
                    if( A > B ) return -1;
                    if( A < B ) return 1;
                    return 0;
                });

                var packer = new GrowingPacker();
                packer.fit( files );

                var size = powerOfTwo( Math.max( packer.root.w, packer.root.h ) );

                var canvas = document.createElementNS( 'http://www.w3.org/1999/xhtml', 'canvas' );
                canvas.width = size;
                canvas.height = size;

                var ctx = canvas.getContext( '2d' );

                for(var i = 0 ; i < files.length ; i++) {

                    var file = files[i];
                    if (file.fit) {

                        file.x = file.fit.x / size;
                        file.y = file.fit.y / size;
                        file.w = file.w / size;
                        file.h = file.h / size;
                        ctx.drawImage( file.image, file.fit.x, file.fit.y );

                    } else {

                        console.warn("NO FIT: ", file);

                    }
                
                }

                var texture = new THREE.Texture( canvas );
                texture.needsUpdate = true;

                onLoad( texture );
            }


			function loadImage( file ) {

                var url = /^(\/\/)|([a-z]+:(\/\/)?)/i.test( file.name ) ? file.name : scope.texturePath + file.name;

				scope.manager.itemStart( url );

				loader.load( url, function ( image ) {

                    file.image = image;
                    file.w = image.width;
                    file.h = image.height;

					scope.manager.itemEnd( url );

				}, undefined, function () {

					scope.manager.itemError( url );

				} );

			}            

        }

    });


    THREE.SconLoader = SconLoader;


    function powerOfTwo(n){

        var o = n;
        for( var j=0; j<6; ++j ) 
            n |= (n>>(1<<j));
        n++;
        if( o<<1 === n ) return o;
        return n;

    }

// Implementation of http://www.brashmonkey.com/ScmlDocs/ScmlReference.html
//
// Works with JSON loaded from SCON file

/*

The MIT License (MIT)

Copyright (c) 2014 Dean Giberson

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

    var Epslion = 0.000001;

    function toRad(n) {
        return n * Math.PI / 180;
    }

    var asArray = function(e) {
        return (e instanceof Array) ? e : [e];
    };

    var lerp = function( a, b, t) {
        return ((b-a) * t) + a;
    };

    var angleDiff = function( a, b) {
        var d = Math.abs(a - b);
        return Math.abs( ((d + 180) % 360) - 180);
    };

    var angleLerp = function( a, b, t, spin) {
        if(spin===0)
        {
            return a;
        }
        var diff = angleDiff(a, b);
        
        // b clockwise from a
        if (spin>=0)
        {
            return (a + diff * t);
        }
        // b anticlockwise from a
        else 
        {
            return (a - diff * t);
        }
    };

    // Find the animations main key that bounds this time
    var mainlineKeyFromTime = function( a, t) {
        var k = null;
        a.mainline.key.every( function( elem, i, array) {
	    var kTime = elem.time || 0.0;
            if (kTime <= t) {
                k = elem;
            } else if (kTime >= t) {
                return false;
            }
            return true;
        });
        return k;
    };

    var keyFromRef = function( anim, ref) {
        var tl = anim.timeline[ref.timeline];
        var ka = tl.key[ref.key];

        if ( tl.key.length === 1) {
            return {a:ka,b:ka,bTime:ka.time};
        }

        var kbIndex = ref.key + 1;

        if ( kbIndex >= tl.key.length) {
            if ( anim.looping !== 'false') {
                kbIndex = 0;
            } else {
                return {a:ka,b:ka,bTime:ka.time};
            }
        }

        var kb = tl.key[kbIndex];
        var kbTime = kb.time || 0.0;

        if ( kbTime < ka.time) {
	    kbTime = anim.length;
        }

        return {a:ka,b:kb,bTime:kbTime};
    };

    var getTBetweenKeys = function( a, b, nextTime, currentTime) {
	var aTime = a.time || 0.0;
        var curveType = a.curve_type || 'linear';
        if (curveType === 'instant' || aTime === nextTime) {
            return 0;
        }
        var bTime = nextTime || aTime+1.0;
        var t = (currentTime - aTime) / (bTime - aTime);
        return t;
    };

    var unmapFromParent = function( pos, parent) {
	var pScaleX = parent.scale_x || 1.0;
	var pScaleY = parent.scale_y || 1.0;
	var pAngle  = parent.angle || 0.0;

	var preMultX = pos.x * pScaleX;
        var preMultY = pos.y * pScaleY;

        var sin = Math.sin( toRad( pAngle));
        var cos = Math.cos( toRad( pAngle));

        var x = ((preMultX * cos) - (preMultY * sin)) + (parent.x || 0.0);
        var y = ((preMultX * sin) + (preMultY * cos)) + (parent.y || 0.0);

	var cAngle = pos.angle;
	if( pScaleX*pScaleY < 0 ) cAngle = 360 - cAngle;
	
	var s = {
         x       : x, 
		 y       : y,
         pivot_x : pos.pivot_x,
         pivot_y : pos.pivot_y,
		 angle   : cAngle + pAngle,
		 scale_x : pos.scale_x * pScaleX,
		 scale_y : pos.scale_y * pScaleY,
		 pos     : pos.a * (parent.a || 1.0),
         file    : pos.file,
         folder  : pos.folder
        };

	return s;
    };

    var tween = function( a, b, t) {
	var ao = a.object || a.bone;
	var bo = b.object || b.bone;
        return { x       : lerp( ao.x || 0.0, bo.x || 0.0, t),
                 y       : lerp( ao.y || 0.0, bo.y || 0.0, t),
                 angle   : angleLerp( ao.angle || 0.0, bo.angle || 0.0, t, a.spin || 1),
                 a       : lerp( ao.a || 1.0, bo.a || 1.0, t),
                 scale_x : lerp( ao.scale_x || 1.0, bo.scale_x || 1.0, t),
                 scale_y : lerp( ao.scale_y || 1.0, bo.scale_y || 1.0, t),
                 pivot_x : lerp( ao.pivot_x, bo.pivot_x, t),
                 pivot_y : lerp( ao.pivot_y, bo.pivot_y, t),
                 file    : ao.file,
                 folder  : ao.folder};
    };

    var updateCharacter = function( anim, keys, time, root){
        var transformedBones = [];
        keys.bone_ref.forEach( function(elem) {
            var parent = (elem.parent !== undefined && elem.parent >= 0)
                    ? transformedBones[elem.parent]
                    : root;
            var interp = keyFromRef( anim, elem);
            var interpT = getTBetweenKeys( interp.a, interp.b, interp.bTime, time);
            var tweened = tween( interp.a, interp.b, interpT);
	    var transformed = unmapFromParent( tweened, parent);
	    transformedBones.push( transformed);
        });

        var transformedObjs = [];
        keys.object_ref.forEach( function(elem) {
            var parent = (elem.parent !== undefined && elem.parent >= 0)
                    ? transformedBones[elem.parent]
                    : root;
            var interp = keyFromRef( anim, elem);
            var interpT = getTBetweenKeys( interp.a, interp.b, interp.bTime, time);
            var tweened = tween( interp.a, interp.b, interpT);
	    var transformed = unmapFromParent( tweened, parent);
	    transformed.name = anim.timeline[elem.timeline].name;
	    transformedObjs.push( transformed);
        });

	return transformedObjs;
    };

    var setCurrentTime = function(t, characterInfo, currentEntity, currentAnim, paintFunc) {
        var e = this.entity[currentEntity || 0];
        var anim = e.animation[currentAnim || 0];

        var newTime = (anim.looping !== 'false')
                ? t % anim.length
                : Math.min( t, anim.length);

        var key  = mainlineKeyFromTime( anim, newTime);
        var objs = updateCharacter( anim, key, newTime, characterInfo);
	objs.forEach( paintFunc);
    };

    var getEntityId = function(entityName) {
	for ( var i = 0, l = this.entity.length;
	      i < l;
	      i++ ) {
		  if ( this.entity[i].name === entityName) {
		      return i;
		  }
	      }
	return 0;
    };

    var getAnimationId = function(currentEntity, animName) {
        var e = this.entity[currentEntity];
	for ( var i = 0, l = e.animation.length;
	      i < l;
	      i++ ) {
		  if ( e.animation[i].name === animName) {
		      return i;
		  }
	      }
	return 0;
    };

    var Scon = function(entity,folder) {
        this.entity = entity;
        this.folder = folder;
    };

    Scon.prototype.getEntityId = getEntityId;
    Scon.prototype.getAnimationId = getAnimationId;
    Scon.prototype.setCurrentTime = setCurrentTime;
    Scon.prototype.constructor = Scon;




// https://github.com/jakesgordon/bin-packing/blob/master/js/packer.growing.js

/******************************************************************************

Copyright (c) 2011, 2012, 2013, 2014, 2015, 2016 Jake Gordon and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

This is a binary tree based bin packing algorithm that is more complex than
the simple Packer (packer.js). Instead of starting off with a fixed width and
height, it starts with the width and height of the first block passed and then
grows as necessary to accomodate each subsequent block. As it grows it attempts
to maintain a roughly square ratio by making 'smart' choices about whether to
grow right or down.
When growing, the algorithm can only grow to the right OR down. Therefore, if
the new block is BOTH wider and taller than the current target then it will be
rejected. This makes it very important to initialize with a sensible starting
width and height. If you are providing sorted input (largest first) then this
will not be an issue.
A potential way to solve this limitation would be to allow growth in BOTH
directions at once, but this requires maintaining a more complex tree
with 3 children (down, right and center) and that complexity can be avoided
by simply chosing a sensible starting block.
Best results occur when the input blocks are sorted by height, or even better
when sorted by max(width,height).
Inputs:
------
  blocks: array of any objects that have .w and .h attributes
Outputs:
-------
  marks each block that fits with a .fit attribute pointing to a
  node with .x and .y coordinates
Example:
-------
  var blocks = [
    { w: 100, h: 100 },
    { w: 100, h: 100 },
    { w:  80, h:  80 },
    { w:  80, h:  80 },
    etc
    etc
  ];
  var packer = new GrowingPacker();
  packer.fit(blocks);
  for(var n = 0 ; n < blocks.length ; n++) {
    var block = blocks[n];
    if (block.fit) {
      Draw(block.fit.x, block.fit.y, block.w, block.h);
    }
  }
******************************************************************************/

GrowingPacker = function() { };

GrowingPacker.prototype = {

  fit: function(blocks) {
    var n, node, block, len = blocks.length;
    var w = len > 0 ? blocks[0].w : 0;
    var h = len > 0 ? blocks[0].h : 0;
    this.root = { x: 0, y: 0, w: w, h: h };
    for (n = 0; n < len ; n++) {
      block = blocks[n];
      if (node = this.findNode(this.root, block.w, block.h))
        block.fit = this.splitNode(node, block.w, block.h);
      else
        block.fit = this.growNode(block.w, block.h);
    }
  },

  findNode: function(root, w, h) {
    if (root.used)
      return this.findNode(root.right, w, h) || this.findNode(root.down, w, h);
    else if ((w <= root.w) && (h <= root.h))
      return root;
    else
      return null;
  },

  splitNode: function(node, w, h) {
    node.used = true;
    node.down  = { x: node.x,     y: node.y + h, w: node.w,     h: node.h - h };
    node.right = { x: node.x + w, y: node.y,     w: node.w - w, h: h          };
    return node;
  },

  growNode: function(w, h) {
    var canGrowDown  = (w <= this.root.w);
    var canGrowRight = (h <= this.root.h);

    var shouldGrowRight = canGrowRight && (this.root.h >= (this.root.w + w)); // attempt to keep square-ish by growing right when height is much greater than width
    var shouldGrowDown  = canGrowDown  && (this.root.w >= (this.root.h + h)); // attempt to keep square-ish by growing down  when width  is much greater than height

    if (shouldGrowRight)
      return this.growRight(w, h);
    else if (shouldGrowDown)
      return this.growDown(w, h);
    else if (canGrowRight)
     return this.growRight(w, h);
    else if (canGrowDown)
      return this.growDown(w, h);
    else
      return null; // need to ensure sensible root starting size to avoid this happening
  },

  growRight: function(w, h) {
    this.root = {
      used: true,
      x: 0,
      y: 0,
      w: this.root.w + w,
      h: this.root.h,
      down: this.root,
      right: { x: this.root.w, y: 0, w: w, h: this.root.h }
    };
    if (node = this.findNode(this.root, w, h))
      return this.splitNode(node, w, h);
    else
      return null;
  },

  growDown: function(w, h) {
    this.root = {
      used: true,
      x: 0,
      y: 0,
      w: this.root.w,
      h: this.root.h + h,
      down:  { x: 0, y: this.root.h, w: this.root.w, h: h },
      right: this.root
    };
    if (node = this.findNode(this.root, w, h))
      return this.splitNode(node, w, h);
    else
      return null;
  }

}


})();


})();