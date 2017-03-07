(function(){


CLAZZ("cmp.Spriter", {

    INJECT:["entity", "game", "sconURL", "imagePath", "enabled", "skeleton"],

    "@enabled":{type:"bool"},
	enabled:true,

    "@sconURL":{type:"string"},
    sconURL:"resources/scons/default.scon",

    "@imagePath":{type:"string"},
    imagePath:"resources/images/",

    "@skeleton":{type:"enum", async:"getSkeletonList"},
	skeleton:"",

    sconJSON:null,
    scon:null,
    asset:null,
    buffer:null,

	time:0,
	animation:"",
	_prevAnim:null,

	create:function(){
        this.entity.pool.call("onLoadingAsyncStart");
        this.entity.call( "loadJSON", this.sconURL, this._onGotSCON.bind(this) );
	},


    getSkeletonList:function( cb ){
        var scon = this.scon;
        if( !scon ){
            DOC.getURL( this.sconURL, function( scon ){

                try{
                    getEntities( JSON.parse(scon) );
                }catch(ex){
                    return cb(ret);
                }

            }, {anystate:true});
        }
        else return getEntities(scon);

        function getEntities( scon )
        {
            var ret = [], entities = scon.entity;

            for( var i=0, l=entities.length; i<l; ++i )
                ret.push(entities[i].name);

            if( cb )
                cb( ret );

            return ret;
        }
    },

    _onGotSCON:function( scon ){
        this.sconJSON = scon;
		this.scon = new Scon( scon.entity, scon.folder );
        cmp.Spriter.Server.createNode( this );
    },

    _onCreateNode:function( node ){
        this.asset = node;
        this.buffer = this.sconJSON.buffer;
        this.entity.setNode( node );
        this.entity.pool.call("onLoadingAsyncEnd");
    },

	setEnabled:function(e){
		if( e == this.enabled ) return;
		this.enabled = e;
	},
	
	onPostTick:function( delta ){
		if( this.animation != this._prevAnim ) this.time = 0;
		else this.time += delta * 1000;
		this._prevAnim = this.animation;
		
		if( !this.enabled || !this.scon ) return;

        var scale = this.game.height * 0.5 / this.game.camera.aspect;

        if( this.asset.material.type == 'ShaderMaterial' )
            this.asset.material.uniforms.scale.value = scale;
		
		var scon = this.scon;
		var folder = scon.folder;
		var entityId = scon.getEntityId( this.skeleton );
		var animId   = scon.getAnimationId(entityId, this.animation);
        var geometry = this.buffer.array, z = 0, p = 0, count = 0;
        
        var textureSize = this.asset.material.map.image.width;

		scon.setCurrentTime( this.time, {}, entityId, animId || 0, function( obj ) {
            count++;
			var meta = folder[ obj.folder ].file[ obj.file ];

            if( "x" in obj ) geometry[p++] = obj.x;
            else p++;

            if( "y" in obj ) geometry[p++] = obj.y;
            else p++;
            
            geometry[p++] = z--;

			if( "scale_x" in obj  ) geometry[p++] = obj.scale_x;
            else geometry[p++] = 1; // p++;
            
			if( "scale_y" in obj  ) geometry[p++] = -obj.scale_y;
            else geometry[p++] = -1; // p++;

            geometry[p++] = meta.pivot_x;
            geometry[p++] = meta.pivot_y;

			if( "angle" in obj ) geometry[p++] = - obj.angle / 180 * Math.PI - Math.PI*0.5;
            else p++;

            geometry[p++] = meta.x;
            geometry[p++] = meta.y;
            geometry[p++] = meta.w;
            geometry[p++] = meta.h;
		});

        this.asset.geometry.drawRange.count = count;
        this.buffer.needsUpdate = true;
	}
});


CLAZZ("cmp.Spriter.Server", {
    INJECT:["pool", "scene"],

    vertexSize:
        3 // position
        + 2 // scale
        + 2 // pivot
        + 1 // rotation
        + 4 // uv
        ,

    CONSTRUCTOR:function(){
        this.pool.add(this);
        cmp.Spriter.Server.instances[ this.scene.id ] = this;
    },

    destroy:function(){
        this.pool.remove(this);
        delete cmp.Spriter.Server.instances[ this.scene.id ];
    },

    _createNode:function( cmp ){
    	var scope = this;
        this._loadImages( cmp.imagePath, cmp.sconJSON, function( texture ){
            var geo = scope._createGeometry( cmp.sconJSON, texture.image.width );
            var mat = scope._createMaterial( texture );
            cmp._onCreateNode( new THREE.Points( geo, mat ) );
        } );
    },

    _loadImages:function( imagePath, scon, cb ){
        if( scon.atlas && imagePath in scon.atlas )
            return cb( scon.atlas[ imagePath ] );

        var files = [], queueSize = 1, scope = this;

        for( var i=0, l=scon.folder.length; i<l; ++i ){

            var file = scon.folder[i].file;
            for( j=0, fl=file.length; j<fl; ++j ){

                files[files.length] = file[j];
                if( file[j].image ) continue;

                queueSize++;
                this.pool.call( "loadImage", imagePath + file[j].name, onLoadImage.bind(this, file[j]) );

            }

        }

        popQueue();

        return;

        function popQueue(){
            queueSize--;
            if( !queueSize ){
                var atlas = scope._onGotImages( files );
                if( !scon.atlas ) scon.atlas = {};
                scon.atlas[ imagePath ] = atlas;
                cb( scon.atlas[ imagePath ] );
            }
        }

        function onLoadImage( file, texture ){
            file.image = texture.image;
            file.w = texture.image.width;
            file.h = texture.image.height;
            popQueue();
        }
    },

    _onGotImages:function( files ){
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
        var canvas = DOC.create("canvas", {width:size, height:size});
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
                console.warn("NO FIT: ", file)
            }
        
        }

        var texture = new THREE.Texture( canvas );
        texture.needsUpdate = true;
        return texture;
    },    

    _createGeometry:function( scon, textureSize ){
        scon.useCount = (scon.useCount||0) + 1;

        if( scon.geometry )
            return scon.geometry;

        var points = 0;
        var folder = scon.folder;
        for( var i=0, l=folder.length; i<l; ++i ){
            var files = folder[i].file;
            points += files.length * this.vertexSize;
        }

        var arr = new Float32Array( points );
        arr.fill(0xFF);

        var ibuff = new THREE.InterleavedBuffer( arr, this.vertexSize );
        ibuff.setDynamic( true );

        var geometry = new THREE.BufferGeometry();

        p = 0;
        var position = new THREE.InterleavedBufferAttribute( ibuff, 3, p );
        geometry.addAttribute("position", position); p += 3;

        var scale = new THREE.InterleavedBufferAttribute( ibuff, 2, p );
        geometry.addAttribute("boneScale", scale); p += 2;

        var pivot = new THREE.InterleavedBufferAttribute( ibuff, 2, p );
        geometry.addAttribute("pivot", pivot); p += 2;

        var rotation = new THREE.InterleavedBufferAttribute( ibuff, 1, p );
        geometry.addAttribute("rotation", rotation); p += 1;

        var tex = new THREE.InterleavedBufferAttribute( ibuff, 4, p );
        geometry.addAttribute("tex", tex); p += 4;

        geometry.drawRange.count = 0;

        scon.geometry = geometry;
        scon.buffer = ibuff;

        return geometry;
    },

    _createMaterial:function( texture ){
        // var mat = new THREE.PointsMaterial({size:30});
        // mat.map = texture;
        // return mat;

        var mat = new THREE.ShaderMaterial({
            fragmentShader: this.fragmentShader,
            vertexShader: this.vertexShader,
            uniforms: THREE.UniformsUtils.merge([
				THREE.UniformsLib.points,
				THREE.UniformsLib.fog,
                {
                    textureSize:{value:texture.image.width}
                }
            ])
        });

        mat.map = mat.uniforms.map.value = texture;
        mat.alphaTest = 0.5;
        
        return mat;
    },


STATIC:{
    instances:{},

    createNode:function( com ){

        var scene = com.game.scene;
        var pool = com.entity.pool;
        var instance = this.instances[ scene.id ] || CLAZZ.get(cmp.Spriter.Server, {pool, scene});

        return instance._createNode( com );

    }
},


    vertexShader:`
uniform float scale;
uniform float textureSize;

#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

attribute vec2 boneScale;
attribute vec2 pivot;
attribute vec4 tex;
attribute float rotation;

varying vec4 vColor;
varying vec4 vTex;
varying float aspect;
varying vec2 RSC;
varying vec2 vBoneScale;

void main() {
	#include <begin_vertex>

    float pointSize = max( abs(tex.z * boneScale.x), abs(tex.w * boneScale.y) );
    aspect = tex.z / tex.w;

    RSC = vec2( sin(rotation), cos(rotation) );
    vColor = vec4(1.);
    vBoneScale = boneScale;

    vec4 origin = modelViewMatrix * vec4( 0, 0, 0, 1. );

    vec2 offset = (vec2(0.5) - pivot) * tex.zw * boneScale * textureSize * 0.5;


    transformed.xy = (transformed.xy - offset ) * ( scale / - origin.z );

	#include <project_vertex>

    float size = pointSize * textureSize * ( scale / - origin.z );

    vTex = tex;
    gl_PointSize = size;

	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>

}   
    `,

    fragmentShader:`
#include <common>
#include <packing>
#include <map_particle_pars_fragment>

#include <fog_pars_fragment>
#include <shadowmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

varying vec4 vTex;
varying vec4 vColor;
varying vec2 RSC;
varying vec2 vBoneScale;
varying float aspect;

void main() {

	#include <clipping_planes_fragment>

	vec3 outgoingLight = vec3( 1.0 );
	vec4 diffuseColor = vColor;

	#include <logdepthbuf_fragment>

    vec4 bounds = vec4( vTex.x, vTex.x+vTex.z, vTex.y, vTex.y+vTex.w );

    vec2 ftc = vec2( gl_PointCoord.x, gl_PointCoord.y );

    if( aspect > 1. ){ // wider than tall
        ftc.y = ftc.y * aspect - (1.-aspect) * 0.5;
    } else {
        float iaspect = 1. / aspect;
        ftc.x = ftc.x * iaspect - (1.-iaspect) * 0.5;
    }
    

    if( vBoneScale.x < 0. ) ftc.x = 1. - ftc.x;
    if( vBoneScale.y < 0. ) ftc.y = 1. - ftc.y;
    
    ftc = ftc.xy * vTex.zw + vTex.xy;

    vec2 ttc = ftc - (vTex.xy + vTex.zw * 0.5);

    ftc.x = ttc.x*RSC.x - ttc.y*RSC.y;
    ftc.y = ttc.x*RSC.y + ttc.y*RSC.x;

    ftc += (vTex.xy + vTex.zw * 0.5);


    if( ftc.x <= bounds.x || ftc.x >= bounds.y || ftc.y <= bounds.z || ftc.y >= bounds.w ){
        // diffuseColor = vec4(1.,0.,0.,1.);
        discard;
    }else{

        vec4 mapTexel = texture2D( map, vec2( ftc.x, 1.0 - ftc.y ) );
        diffuseColor *= mapTexelToLinear( mapTexel );
    }

	#include <alphatest_fragment>

	outgoingLight = diffuseColor.rgb;

	gl_FragColor = vec4( outgoingLight, diffuseColor.a );

	#include <premultiplied_alpha_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>

}    
    `,

});



// Implementation of http://www.brashmonkey.com/ScmlDocs/ScmlReference.html
//
// Works with JSON loaded from SCON file

    var Epslion = 0.000001;


    function powerOfTwo(n){
        var o = n;
        for( var j=0; j<6; ++j ) 
            n |= (n>>(1<<j));
        n++;
        if( o<<1 === n ) return o;
        return n;
    }

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
	
	var s = {x       : x, 
		 y       : y,
		 angle   : cAngle + pAngle,
		 scale_x : pos.scale_x * pScaleX,
		 scale_y : pos.scale_y * pScaleY,
		 pos     : pos.a * (parent.a || 1.0),
                 file    : pos.file,
                 folder  : pos.folder};

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
                 pivot_x : lerp( ao.pivot_x || 0.0, bo.pivot_x || 0.0, t),
                 pivot_y : lerp( ao.pivot_y || 0.0, bo.pivot_y || 0.0, t),
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

    // var loadFromScon = function(json,prefix) {
	// var data = new Scon( json.entity, json.folder );

    //     var manifest = [];
    //     asArray(data.folder).forEach( function(folder) {
    //         asArray(folder.file).forEach( function(file) {
    //             // Tell the loader about this
    //             manifest.push( {src:file.name, 
    //                             type:createjs.LoadQueue.IMAGE, 
    //                             data:file} );
    //         });
    //     });

    //     var queue = new createjs.LoadQueue(true, prefix);
    //     var fileload = function( result) {  
    //         var img  = result.item;
    //         var file = img.data;
    //         file.easelBitmap = new createjs.Bitmap( result.result);
    //     };
    //     queue.on('fileload', fileload, this);
    //     queue.loadManifest( manifest);

    //     return data;
    // };



// https://github.com/jakesgordon/bin-packing/blob/master/js/packer.growing.js

/******************************************************************************
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