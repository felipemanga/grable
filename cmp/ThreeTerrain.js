need([

    {FQCN:"RAND_MT", URL:"lib/mersenne-twister.js"}

],

function (){
'use strict';

CLAZZ("cmp.ThreeTerrain", {
    INJECT:["entity", "asset", "height", "sizes", "island", "seed", "varyContrast", "discardBelow", "texturing", "inclineMap", "inclineSegments"],

    "@varyContrast":{type:"bool"},
    varyContrast:true,


	"@height":{type:"float", min:0},
    height:1,

    "@seed":{type:"int"},
    seed:0xDEADBEEF,

	"@sizes":{type:"array", meta:{type:'float', min:0} },
    sizes:[400,200,100],

    "@island":{type:"float", min:0},
    island:0,

    "@discardBelow":{type:"float"},
    discardBelow:0,

    "@texturing":{type:"enum", options:["map only", "inclineMap"]},
    texturing:"inclineMap",

    "@inclineMap":{type:"texture", test:{ eq:{ texturing:"inclineMap"} } },
    inclineMap:"resources/image/groundLayers.jpg",

    "@inclineSegments":{type:"vec2i", test:{ eq:{ texturing:"inclineMap"} } },
    inclineSegments:{x:2,y:2},

    heightmap:null,

    
    '@create':{__hidden:true},
    create:function(){
        this.generate( true );
        this.changeMaterial();
    },

    '@preview':{__hidden:true},
    preview:function( helper, callback ){
        this.generate( false );
        callback();
    },

    changeMaterial:function(){
        if( this.texturing != "inclineMap" )
            return;
            
        var srcmat = this.asset.material;

        var defines = {
            USE_MAP: ""
        };

        var opts = {
            fog:true,
            lights:true,

            defines: defines,

            fragmentShader: fragsrc,
            vertexShader: vertsrc,

            uniforms: THREE.UniformsUtils.merge( [
				THREE.UniformsLib.common,
				THREE.UniformsLib.aomap,
				THREE.UniformsLib.lightmap,
				THREE.UniformsLib.emissivemap,
				THREE.UniformsLib.fog,
				THREE.UniformsLib.lights,
				{
					emissive: { value: new THREE.Color( 0x000000 ) },
                    heightRange: { value: new THREE.Vector2( this.discardBelow, this.height + this.asset.position.y ) }
				}
			] )

        };

        var shader = new THREE.ShaderMaterial(opts);

        var texture = shader.uniforms.map.value = srcmat.map;
        if( srcmat.map ){
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;            
        }
        shader.uniforms.offsetRepeat.value.set( 0, 0, 1/this.inclineSegments.x, 1/this.inclineSegments.y );

        this.asset.material = shader;
    },

    '@generate':{__hidden:true},
    generate:function( doDiscard ){

        var geometry = this.asset.geometry, discardBelow = this.discardBelow, 
            noise = this.entity && this.entity.noise, 
            ctx = this.entity, 
            ctx2, noise2, cPow, cMul,
            island = this.island,
            height = this.height, 
            sizes = this.sizes,
            sizesLength = this.sizes.length,
            heightmap;

        if( geometry.parameters.width != geometry.parameters.height ){
            console.warn("Terrain not square!");
            return;
        }

        var size = geometry.parameters.width / 2;


        
        if( !noise ){
            ctx = new SimplexNoise( new MersenneTwister( this.seed ) );
            noise = ctx.noise;
        }

        if( this.varyContrast ){
        	var gen = new MersenneTwister( 2 * this.seed );
            ctx2 = new SimplexNoise( gen );
            noise2 = ctx2.noise;
            cPow = 1+gen.random()*10;
            cMul = 1+gen.random()*10;
        }

        if( geometry.isBufferGeometry ){
            var posatt = geometry.getAttribute("position");
            var vertices = posatt.array, indices = geometry.getIndex().array;

            var min = 10, max = -10, offsetY = this.asset.position.y;

            var widthSegments = geometry.parameters.widthSegments;
            var heightSegments = geometry.parameters.heightSegments;
            var scaleW = widthSegments / geometry.parameters.width,
                scaleH = (geometry.parameters.heightSegments+1) / geometry.parameters.height;
            var offsetW = geometry.parameters.width/2,
                offsetH = geometry.parameters.height/2;

            heightmap = this.heightmap = new Float32Array( (widthSegments+1)*(heightSegments+1) );

            var weights = [1], weight = 1;
            for( j=1; j<sizesLength; ++j ){
                weights[j] = weights[j-1] * 0.61803398874989;
                weight += weights[j];
            }
            for( j=0; j<sizesLength; ++j )
                weights[j] /= weight;

            for ( var i = 0; i < vertices.length; i += 3 ) {

                var vx = vertices[i  ];
                var vy = vertices[i+1];
                var vz = 0;

                var contrast = 0;

                for( var j=0; j<sizesLength; ++j ){
                    var scale = sizes[j];
                    weight = weights[j];
                    if( scale ){
                        vz += (0.5+0.5*noise.call( ctx, vx / scale, vy / scale )) * weight;
                        if( noise2 )
                            contrast += (0.5+0.5*noise2.call( ctx2, vx / scale / 2, vy / scale / 2 )) * weight;
                    }
                }

                if( vz > max )
                    max = vz;
                if( vz < min )
                    min = vz;

                if( noise2 ){
                    contrast = Math.pow( contrast, cPow ) * cMul;
                    if( vz < 0.5 ) vz = Math.pow( vz * 2, contrast ) / 2;
                    else if( vz > 0.5 ) vz = 1 - Math.pow( (1-vz) * 2, contrast ) / 2;
                }

                if( island ){
                    var f = 1.4 - Math.sqrt( vx*vx + vy*vy ) / size;
                    if( f < 0 ) f = 0;
                    if( f > 1 ) f = 1;

                    if( f < 0.5 ) f = Math.pow( f * 2, island ) / 2;
                    else if( f > 0.5 ) f = 1 - Math.pow( (1-f) * 2, island ) / 2;

                    if( f < 0.1 ) vz -= 0.2;

                    vz = (vz*f-0.5)*2;
                }

                vz *= height;

                vertices[i+2] = vz;

                heightmap[i/3] = vz;
            }


            this.asset.geometry.computeFaceNormals();
            this.asset.geometry.computeVertexNormals();

            if( indices && !isNaN(discardBelow) ){
                var write = 0, l = indices.length;
                if( doDiscard )
                {
                    for( i = 0; i<l; i+=3, write+=3 ){

                        var A = vertices[ indices[i  ] * 3 + 2 ] + offsetY;
                        var B = vertices[ indices[i+1] * 3 + 2 ] + offsetY;
                        var C = vertices[ indices[i+2] * 3 + 2 ] + offsetY;

                        if( A < discardBelow && B < discardBelow && C < discardBelow )
                            write -= 3;
                        else{
                            indices[write  ] = indices[i  ];
                            indices[write+1] = indices[i+1];
                            indices[write+2] = indices[i+2];
                        }
                    }

                    geometry.setDrawRange( 0, write );
                    geometry.elementsNeedUpdate = true;
                } else {
                    var normatt = this.asset.geometry.getAttribute('normal');
                    var normal = normatt.array;

                    for( i = 0; i<l; i+=3){

                        var A = vertices[ indices[i  ] * 3 + 2 ] + offsetY;
                        var B = vertices[ indices[i+1] * 3 + 2 ] + offsetY;
                        var C = vertices[ indices[i+2] * 3 + 2 ] + offsetY;

                        if( A < discardBelow && B < discardBelow && C < discardBelow ){
                            normal[ indices[i  ] * 3 + 1 ] = NaN;
                            normal[ indices[i+1] * 3 + 1 ] = NaN;
                            normal[ indices[i+2] * 3 + 1 ] = NaN;
                        }
                    }

                    normatt.needsUpdate = true;

                    
                }
            }

            posatt.needsUpdate = true;

        }else{
            for ( var i = 0; i < geometry.vertices.length; i++ ) {
                var vertex = geometry.vertices[i];

                vertex.z = 0;
                weight = 1;

                for( var j=0; j<sizesLength; ++j ){
                    var scale = sizes[j];
                    if( scale )
                        vertex.z += (0.5+0.5*noise.call( ctx, vertex.x / scale, vertex.y / scale )) * height * weight;

                    weight *= 0.5;
                }

                if( island ){
                    var f = 1.4 - Math.sqrt( vertex.x*vertex.x + vertex.y*vertex.y ) / size;
                    if( f < 0 ) f = 0;
                    if( f > 1 ) f = 1;

                    if( f < 0.5 ) f = Math.pow( f * 2, island ) / 2;
                    else if( f > 0.5 ) f = 1 - Math.pow( (1-f) * 2, island ) / 2;

                    vertex.z *= f;
                }

            }
            this.asset.geometry.computeFaceNormals();
            this.asset.geometry.computeVertexNormals();

        }
    },

    getHeightAtXZ:function(x, z){
        var asset = this.entity.asset;
        var param = this.asset.geometry.parameters;

        if( arguments.length == 1 ){
            z = x.z;
            x = x.x;
        }

        var w = param.widthSegments + 1;
        var map = this.heightmap;

        var yi = ((z - asset.position.z + param.height / 2) / param.height / asset.scale.z) * (w-1),
            xi = ((x - asset.position.x + param.width / 2) / param.width / asset.scale.x) * (w-1);

        var fy = Math.floor(yi), cy = fy + 1;
        var fx = Math.floor(xi), cx = fx + 1;

        if( fy < 0 || fx < 0 || cy >= w || cx >= w )
            return -1;
            
        var a, b, c;
        var y1, y2, y3, x1, x2, x3, z1, z2, z3;
        if( xi-fx < 1-(yi-fy) ){
            y1 = fy; x1 = fx;
            y2 = cy; x2 = fx;
            y3 = fy; x3 = cx;
        }else{
            y1 = cy; x1 = cx;
            x2 = fx; y2 = cy;
            x3 = cx; y3 = fy;
        }
        z1 = map[y1*w+x1];
        z2 = map[y2*w+x2];
        z3 = map[y3*w+x3];

        var d = (y2-y3)*(x1-x3) + (x3-x2)*(y1-y3);

        var d1 = (y2-y3)*(xi-x3) + (x3-x2)*(yi-y3);
        d1 /= d;

        var d2 = (y3-y1)*(xi-x3) + (x1-x3)*(yi-y3);
        d2 /= d;

        var d3 = 1 - d1 - d2;

        c = d1*z1 + d2*z2 + d3*z3;

        fy *= w; cy *= w;

        // if( xi < yi ){
        //     normal.x = nmap[(fy+fx)*3  ];
        //     normal.y = nmap[(fy+fx)*3+1];
        //     normal.z = nmap[(fy+fx)*3+2];
        // }else{
        //     normal.x = nmap[(cy+cx)*3  ];
        //     normal.y = nmap[(cy+cx)*3+1];
        //     normal.z = nmap[(cy+cx)*3+2];
        // }


        return ( c * asset.scale.z + asset.position.y ) || 0;


    }
});

// Ported from Stefan Gustavson's java implementation
// http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
// Read Stefan's excellent paper for details on how this code works.
//
// Sean McCullough banksean@gmail.com

/**
 * You can pass in a random number generator object if you like.
 * It is assumed to have a random() method.
 */
var SimplexNoise = (function() {
	var SimplexNoise = function(r) {
		if (r == undefined) r = Math;
	  this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0], 
	                                 [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1], 
	                                 [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]]; 
	  this.p = [];
	  for (var i=0; i<256; i++) {
		  this.p[i] = Math.floor(r.random()*256);
	  }
	  // To remove the need for index wrapping, double the permutation table length 
	  this.perm = []; 
	  for(var i=0; i<512; i++) {
			this.perm[i]=this.p[i & 255];
		} 
	
	  // A lookup table to traverse the simplex around a given point in 4D. 
	  // Details can be found where this table is used, in the 4D noise method. 
	  this.simplex = [ 
	    [0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0], 
	    [0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0], 
	    [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0], 
	    [1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0], 
	    [1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0], 
	    [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0], 
	    [2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0], 
	    [2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]; 
	};
	
	SimplexNoise.prototype.dot = function(g, x, y) { 
		return g[0]*x + g[1]*y;
	};
	
	SimplexNoise.prototype.noise = function(xin, yin) { 
	  var n0, n1, n2; // Noise contributions from the three corners 
	  // Skew the input space to determine which simplex cell we're in 
	  var F2 = 0.5*(Math.sqrt(3.0)-1.0); 
	  var s = (xin+yin)*F2; // Hairy factor for 2D 
	  var i = Math.floor(xin+s); 
	  var j = Math.floor(yin+s); 
	  var G2 = (3.0-Math.sqrt(3.0))/6.0; 
	  var t = (i+j)*G2; 
	  var X0 = i-t; // Unskew the cell origin back to (x,y) space 
	  var Y0 = j-t; 
	  var x0 = xin-X0; // The x,y distances from the cell origin 
	  var y0 = yin-Y0; 
	  // For the 2D case, the simplex shape is an equilateral triangle. 
	  // Determine which simplex we are in. 
	  var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords 
	  if(x0>y0) {i1=1; j1=0;} // lower triangle, XY order: (0,0)->(1,0)->(1,1) 
	  else {i1=0; j1=1;}      // upper triangle, YX order: (0,0)->(0,1)->(1,1) 
	  // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and 
	  // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where 
	  // c = (3-sqrt(3))/6 
	  var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords 
	  var y1 = y0 - j1 + G2; 
	  var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords 
	  var y2 = y0 - 1.0 + 2.0 * G2; 
	  // Work out the hashed gradient indices of the three simplex corners 
	  var ii = i & 255; 
	  var jj = j & 255; 
	  var gi0 = this.perm[ii+this.perm[jj]] % 12; 
	  var gi1 = this.perm[ii+i1+this.perm[jj+j1]] % 12; 
	  var gi2 = this.perm[ii+1+this.perm[jj+1]] % 12; 
	  // Calculate the contribution from the three corners 
	  var t0 = 0.5 - x0*x0-y0*y0; 
	  if(t0<0) n0 = 0.0; 
	  else { 
	    t0 *= t0; 
	    n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);  // (x,y) of grad3 used for 2D gradient 
	  } 
	  var t1 = 0.5 - x1*x1-y1*y1; 
	  if(t1<0) n1 = 0.0; 
	  else { 
	    t1 *= t1; 
	    n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1); 
	  }
	  var t2 = 0.5 - x2*x2-y2*y2; 
	  if(t2<0) n2 = 0.0; 
	  else { 
	    t2 *= t2; 
	    n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2); 
	  } 
	  // Add contributions from each corner to get the final noise value. 
	  // The result is scaled to return values in the interval [-1,1]. 
	  return 70.0 * (n0 + n1 + n2); 
	};
	
	// 3D simplex noise 
	SimplexNoise.prototype.noise3d = function(xin, yin, zin) { 
	  var n0, n1, n2, n3; // Noise contributions from the four corners 
	  // Skew the input space to determine which simplex cell we're in 
	  var F3 = 1.0/3.0; 
	  var s = (xin+yin+zin)*F3; // Very nice and simple skew factor for 3D 
	  var i = Math.floor(xin+s); 
	  var j = Math.floor(yin+s); 
	  var k = Math.floor(zin+s); 
	  var G3 = 1.0/6.0; // Very nice and simple unskew factor, too 
	  var t = (i+j+k)*G3; 
	  var X0 = i-t; // Unskew the cell origin back to (x,y,z) space 
	  var Y0 = j-t; 
	  var Z0 = k-t; 
	  var x0 = xin-X0; // The x,y,z distances from the cell origin 
	  var y0 = yin-Y0; 
	  var z0 = zin-Z0; 
	  // For the 3D case, the simplex shape is a slightly irregular tetrahedron. 
	  // Determine which simplex we are in. 
	  var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords 
	  var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords 
	  if(x0>=y0) { 
	    if(y0>=z0) 
	      { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; } // X Y Z order 
	      else if(x0>=z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; } // X Z Y order 
	      else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; } // Z X Y order 
	    } 
	  else { // x0<y0 
	    if(y0<z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; } // Z Y X order 
	    else if(x0<z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; } // Y Z X order 
	    else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; } // Y X Z order 
	  } 
	  // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z), 
	  // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and 
	  // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where 
	  // c = 1/6.
	  var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords 
	  var y1 = y0 - j1 + G3; 
	  var z1 = z0 - k1 + G3; 
	  var x2 = x0 - i2 + 2.0*G3; // Offsets for third corner in (x,y,z) coords 
	  var y2 = y0 - j2 + 2.0*G3; 
	  var z2 = z0 - k2 + 2.0*G3; 
	  var x3 = x0 - 1.0 + 3.0*G3; // Offsets for last corner in (x,y,z) coords 
	  var y3 = y0 - 1.0 + 3.0*G3; 
	  var z3 = z0 - 1.0 + 3.0*G3; 
	  // Work out the hashed gradient indices of the four simplex corners 
	  var ii = i & 255; 
	  var jj = j & 255; 
	  var kk = k & 255; 
	  var gi0 = this.perm[ii+this.perm[jj+this.perm[kk]]] % 12; 
	  var gi1 = this.perm[ii+i1+this.perm[jj+j1+this.perm[kk+k1]]] % 12; 
	  var gi2 = this.perm[ii+i2+this.perm[jj+j2+this.perm[kk+k2]]] % 12; 
	  var gi3 = this.perm[ii+1+this.perm[jj+1+this.perm[kk+1]]] % 12; 
	  // Calculate the contribution from the four corners 
	  var t0 = 0.6 - x0*x0 - y0*y0 - z0*z0; 
	  if(t0<0) n0 = 0.0; 
	  else { 
	    t0 *= t0; 
	    n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0, z0); 
	  }
	  var t1 = 0.6 - x1*x1 - y1*y1 - z1*z1; 
	  if(t1<0) n1 = 0.0; 
	  else { 
	    t1 *= t1; 
	    n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1, z1); 
	  } 
	  var t2 = 0.6 - x2*x2 - y2*y2 - z2*z2; 
	  if(t2<0) n2 = 0.0; 
	  else { 
	    t2 *= t2; 
	    n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2, z2); 
	  } 
	  var t3 = 0.6 - x3*x3 - y3*y3 - z3*z3; 
	  if(t3<0) n3 = 0.0; 
	  else { 
	    t3 *= t3; 
	    n3 = t3 * t3 * this.dot(this.grad3[gi3], x3, y3, z3); 
	  } 
	  // Add contributions from each corner to get the final noise value. 
	  // The result is scaled to stay just inside [-1,1] 
	  return 32.0*(n0 + n1 + n2 + n3); 
	};
	
	return SimplexNoise;
})();

var vertsrc = `

#define LAMBERT

uniform vec2 heightRange;

varying vec3 vLightFront;
varying float height;

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

void main() {

	// # include <uv_vertex>
    vUv = uv;

	#include <uv2_vertex>
	#include <color_vertex>

	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>

	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	
    // # include <project_vertex>
    vec4 mPosition = modelMatrix * vec4( transformed, 1.0 );
    vec4 mvPosition = viewMatrix * mPosition;

    gl_Position = projectionMatrix * mvPosition;

	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

    height = (mPosition.y - heightRange.x) / (heightRange.y - heightRange.x);

	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <lights_lambert_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>

}


`;

var fragsrc = `

uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
uniform vec4 offsetRepeat;

varying vec3 vLightFront;
varying float height;

#ifdef DOUBLE_SIDED

	varying vec3 vLightBack;

#endif

#include <common>
#include <packing>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_pars_fragment>
#include <bsdfs>
#include <lights_pars>
#include <fog_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {

	#include <clipping_planes_fragment>

	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;

	#include <logdepthbuf_fragment>
	// # include <map_fragment>

    vec2 uva = vUv * offsetRepeat.zw;
    vec2 uvb = vUv * 50.; // offsetRepeat.zw + offsetRepeat.zw * 0.5;

	vec4 texelColorA = texture2D( map, uva );
	vec4 texelColorB = texture2D( map, uvb );

	texelColorA = mapTexelToLinear( texelColorA );
	texelColorB = mapTexelToLinear( texelColorB );

	diffuseColor *= mix( texelColorA, texelColorB, height );

	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <emissivemap_fragment>

	// accumulation
	reflectedLight.indirectDiffuse = getAmbientLightIrradiance( ambientLightColor );

	#include <lightmap_fragment>

	reflectedLight.indirectDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb );

	#ifdef DOUBLE_SIDED

		reflectedLight.directDiffuse = ( gl_FrontFacing ) ? vLightFront : vLightBack;

	#else

		reflectedLight.directDiffuse = vLightFront;

	#endif

	reflectedLight.directDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb ) * getShadowMask();

	// modulation
	#include <aomap_fragment>

	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;

	#include <normal_flip>
	#include <envmap_fragment>

	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
    // gl_FragColor = vec4( vec3(max(0., min(1., height) ) ), 1. );

	#include <premultiplied_alpha_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>

}


`;

});