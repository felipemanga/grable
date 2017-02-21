need([

    {FQCN:"RAND_MT", URL:"lib/mersenne-twister.js"}

],

function (){
'use strict';

CLAZZ("cmp.ThreeTerrain", {
    INJECT:["entity", "asset", "height", "sizes", "island", "seed", "varyContrast", "discardBelow"],

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

    
    '@create':{__hidden:true},
    create:function(){
        this.generate( true );
    },

    '@preview':{__hidden:true},
    preview:function(){
        this.generate( false );
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
            sizesLength = this.sizes.length;

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

            for ( var i = 0; i < vertices.length; i += 3 ) {

                var vx = vertices[i  ];
                var vy = vertices[i+1];
                var vz = 0;

                var contrast = 0, weight = 0.5;

                for( var j=0; j<sizesLength; ++j ){
                    var scale = sizes[j];
                    if( scale ){
                        vz += (0.5+0.5*noise.call( ctx, vx / scale, vy / scale )) * weight;
                        if( noise2 )
                            contrast += (0.5+0.5*noise2.call( ctx2, vx / scale / 2, vy / scale / 2 )) * weight;
                    }
                    weight *= 0.5;
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

                    vz *= f;
                }

                vz *= height;

                vertices[i+2] = vz;
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

});