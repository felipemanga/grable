CLAZZ("cmp.ThreeParticles", {
    PROVIDES:{
        "cmp.Particles":"implements"
    },
	INJECT:[
        "entity", "asset", "game", 
        "texture", "enabled", "rate",
        "sizeVariance", "randomRotation",
        "color", "life", "gravity", "force", "opacities", "sizes", "inTime", "outTime"
    ],
	
    '@enabled':{type:'bool'},
    enabled:true,

    '@rate':{type:'float', min:0},
    rate:10,

	'@texture':{type:'texture'},
	texture:'resources/image/smoke.jpg',

    '@color':{type:'color'},
    color:"#FFFFFF",

    '@inTime':{type:'int', min:0},
    inTime:1000,

    '@outTime':{type:'int', min:0},
    outTime:1000,

    '@life':{type:'int', min:0},
    life:3000,

    '@gravity':{type:'float'},
    gravity:10,

    '@force':{type:'vec3f'},
    force:{x:0,y:0,z:0},

    '@opacities':{type:'vec3f'},
    opacities:{x:0, y:1, z:0},

    '@sizes':{type:'vec3f'},
    sizes:{x:0, y:20, z:0},

    '@sizeVariance':{type:'vec2f'},
    sizeVariance:{x:0.5, y:1.5},

    '@randomRotation':{type:'bool'},
    randomRotation:true,

    // used by server
    acc:0,
    position:null,

    setParticlesEnabled:function( enabled ){

        this.enabled = enabled;

    },

	onReady:function(){
		
        this.position = (new THREE.Vector3()).copy(this.entity.position);
        this.color = new THREE.Color( this.color );
		cmp.ThreeParticles.Server.add(this);
		
	},
	
	destroy:function(){

		cmp.ThreeParticles.Server.remove(this);

	}
});

CLAZZ("cmp.ThreeParticles.Server", {
    INJECT:['pool', 'scene', 'game'],

    vertexSize:
            3   // position
            + 3 // color
            + 3 // force.xyz
            + 4 // start time, tween in, tween out, die time
            + 1 // gravity
            + 3 // start size, live size, die size
            + 3 // start opactiy, live opacity, die opacity
            + 1 // rotation
            ,

    index:null,

    vertexShader:`
uniform float time;
uniform float scale;


#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

attribute vec3 force;
attribute vec4 timeline;
attribute float gravity;
attribute vec3 sizes;
attribute vec3 opacities;
attribute float rotation;

varying vec4 vColor;
varying vec2 RSC;

void main() {
    float lifeTime = time - timeline.x;

    float age = max(0., min(1., lifeTime / timeline.w));
    
	#include <begin_vertex>

    RSC = vec2( sin(rotation), cos(rotation) );

    transformed.xyz += force * lifeTime;
    transformed.y += gravity * lifeTime * lifeTime;

	#include <project_vertex>
    
    float size, sizeA, sizeB, W;
    float opacity, opacityA, opacityB;
    if( age < timeline.y ){
        sizeA = sizes.x;
        sizeB = sizes.y;
        opacityA = opacities.x;
        opacityB = opacities.y;
        W = age / timeline.y;
    }else if( age > timeline.z ){
        sizeA = sizes.y;
        sizeB = sizes.z;
        opacityA = opacities.y;
        opacityB = opacities.z;
        W = (age - timeline.z) / ( 1. - timeline.z );
    }else{
        sizeB = sizeA = sizes.y;
        opacityB = opacityA = opacities.y;
        W = 1.;
    }
    size = sizeA * (1.-W) + sizeB * W;
    opacity = opacityA * (1.-W) + opacityB * W;

    vColor = vec4( color, opacity );
    gl_PointSize = size * ( scale / - mvPosition.z );

	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>

}   
    `,

    fragmentShader:`
uniform float opacity;

#include <common>
#include <packing>
#include <map_particle_pars_fragment>

#include <fog_pars_fragment>
#include <shadowmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

varying vec4 vColor;
varying vec2 RSC;

void main() {

	#include <clipping_planes_fragment>

	vec3 outgoingLight = vec3( 1.0 );
	vec4 diffuseColor = vColor;

	#include <logdepthbuf_fragment>


    vec2 ftc = vec2( gl_PointCoord.x, 1.0 - gl_PointCoord.y );
    vec2 ttc = ftc - 0.5;

    ftc.x = ttc.x*RSC.x - ttc.y*RSC.y;
    ftc.y = ttc.x*RSC.y + ttc.y*RSC.x;

    ftc += 0.5;

    // ftc = ftc * offsetRepeat.zw + offsetRepeat.xy;

	vec4 mapTexel = texture2D( map, ftc );
	diffuseColor *= mapTexelToLinear( mapTexel );


	#include <alphatest_fragment>

	outgoingLight = diffuseColor.rgb;

	gl_FragColor = vec4( outgoingLight, diffuseColor.a );

	#include <premultiplied_alpha_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>

}    
    `,

    CONSTRUCTOR:function(){
        this.index = {};

        cmp.ThreeParticles.Server.instances[ this.scene.id ] = this;

        this.pool.add(this);
    },

    getIndex:function( texture, create, max ){
        var index = this.index[texture];
        if( index ) return index;
        if( create === false ) return null;

        var particle = new THREE.InterleavedBuffer( new Float32Array(max*this.vertexSize), this.vertexSize );
        particle.setDynamic( true );

        var geometry = this.getGeometry( particle );
        var material = this.getMaterial( texture );
        var mesh = new THREE.Points( geometry, material );
        mesh.frustumCulled = false;
        this.scene.add( mesh );

        return this.index[texture] = {
            position: new THREE.Vector3(),
            next: 0,
            max: max,
            mesh:mesh,
            particle:particle,
            geometry:geometry,
            material:material,
            emitters:[]
        };
    },

    getGeometry:function( particle ){

        var geometry = new THREE.BufferGeometry();

            // 3   // position
        var position = new THREE.InterleavedBufferAttribute( particle, 3, 0 );
        geometry.addAttribute("position", position);

            // + 3 // color
        var color = new THREE.InterleavedBufferAttribute( particle, 3, 3 );
        geometry.addAttribute("color", color);

            // + 3 // force.xyz
        var force = new THREE.InterleavedBufferAttribute( particle, 3, 6 );
        geometry.addAttribute("force", force);

            // + 4 // start time, tween in, tween out, die time
        var timeline = new THREE.InterleavedBufferAttribute( particle, 4, 9 );
        geometry.addAttribute("timeline", timeline);

            // + 1 // gravity
        var gravity = new THREE.InterleavedBufferAttribute( particle, 1, 13 );
        geometry.addAttribute("gravity", gravity);

            // + 3 // start size, live size, die size
        var sizes = new THREE.InterleavedBufferAttribute( particle, 3, 14 );
        geometry.addAttribute("sizes", sizes);

            // + 3 // start opactiy, live opacity, die opacity
        var opacities = new THREE.InterleavedBufferAttribute( particle, 3, 17 );
        geometry.addAttribute("opacities", opacities);

        var rotation = new THREE.InterleavedBufferAttribute( particle, 1, 20 );
        geometry.addAttribute("rotation", rotation);

        geometry.drawRange.count = 0;

        // Necessary. I don't know why.
        particle.array[0] = 500;

        return geometry;
    },

    getMaterial:function( texture ){
        var mat = new THREE.ShaderMaterial({
            fragmentShader: this.fragmentShader,
            vertexShader: this.vertexShader,
            vertexColors: THREE.VertexColors,
            uniforms: THREE.UniformsUtils.merge( [
				THREE.UniformsLib.points,
				THREE.UniformsLib.fog,
                {
                    time: {value:0},
                }
			] )
        });


        mat.map = mat.uniforms.map.value = (new THREE.TextureLoader()).load(texture);
        
        mat.uniforms.size.value = 60;
        // mat.blending = THREE.AdditiveBlending;
        mat.transparent = true;
        mat.depthWrite = false;
        return mat;
    },

    add:function( emitter ){
        var index = this.getIndex( emitter.texture, true, 2000 );
        index.emitters.push( emitter );
    },

    remove:function( emitter ){
        var index = this.getIndex(emitter.texture, false);
        if( !index ) return;

        var pos = index.emitters.indexOf( emitter );
        if( pos == -1 ) return;

        index.emitters.splice( pos, 1 );
    },

    time:0,

    force:new THREE.Vector3(),
    pos:new THREE.Vector3(),
    tm4:new THREE.Matrix4(),

    onTick:function(delta){
    	if( delta < 0 )
    		return;

        var force = this.force;
        var pos = this.pos;
        var scale = this.game.height / this.game.camera.aspect;
        var time = this.time += delta;
    		
        for( var k in this.index ){
            var dirty = false;
            var index = this.index[k];
            var max = index.max;
            var emitters = index.emitters;
            var geometry = index.geometry;
            var material = index.material;
            var particle = index.particle.array;
            material.uniforms.time.value += delta;
            material.uniforms.scale.value = scale;


            for( var i=0, l=emitters.length; i<l; ++i ){

                var emitter = emitters[i];
                if( !emitter.enabled || !emitter.rate )
                    cotinue;

                var acc = emitter.acc;
                acc += delta * emitter.rate;
                emitter.acc = acc - Math.floor(acc);
                acc = Math.floor(acc);

                if( emitter.force.x != 0 || emitter.force.y != 0 || emitter.force.z != 0 ){

                    force.copy( emitter.force );
                    var forceLength = force.length();

                    var tm4 = this.tm4.identity();
                    tm4.elements[12] = emitter.force.x;
                    tm4.elements[13] = emitter.force.y;
                    tm4.elements[14] = emitter.force.z;
                    tm4.multiplyMatrices( emitter.asset.matrixWorld, tm4 );

                    force.x = tm4.elements[12] - emitter.asset.matrixWorld.elements[12];
                    force.y = tm4.elements[13] - emitter.asset.matrixWorld.elements[13];
                    force.z = tm4.elements[14] - emitter.asset.matrixWorld.elements[14];

                    force.setLength( forceLength );

                }else{

                    force.x = 0;
                    force.y = 0;
                    force.z = 0;

                }

                for( var j=0; j<acc; ++j ){
                    pos.lerpVectors( emitter.position, emitter.asset.position, j/acc );

                    var count = (index.next++) % max;
                    if( count >= geometry.drawRange.count )
                        geometry.drawRange.count = count+1;

                    var p = count * this.vertexSize;
                    particle.set([
                    // 3   // position
                    pos.x,
                    pos.y,
                    pos.z,

                    // + 3 // color
                    emitter.color.r,
                    emitter.color.g,
                    emitter.color.b,

                    // + 3 // force.xyz
                    force.x,
                    force.y,
                    force.z,

                    // + 4 // start time, tween in, tween out, die time
                    time,
                    emitter.inTime / emitter.life,
                    (emitter.life - emitter.outTime) / emitter.life,
                    emitter.life / 1000,

                    // + 1 // gravity
                    emitter.gravity,

                    // + 3 // start size, live size, die size
                    emitter.sizes.x * (Math.random()*(emitter.sizeVariance.y - emitter.sizeVariance.x) + emitter.sizeVariance.x),
                    emitter.sizes.y * (Math.random()*(emitter.sizeVariance.y - emitter.sizeVariance.x) + emitter.sizeVariance.x),
                    emitter.sizes.z * (Math.random()*(emitter.sizeVariance.y - emitter.sizeVariance.x) + emitter.sizeVariance.x),

                    // + 3 // start opactiy, live opacity, die opacity
                    emitter.opacities.x,
                    emitter.opacities.y,
                    emitter.opacities.z,

                    emitter.randomRotation ? Math.random()*Math.PI*2 : 0
                    ], p);
                }

                emitter.position.copy( emitter.asset.position );

                if( acc > 0 )
                    dirty = true;
            }

            if( dirty )
                index.particle.needsUpdate = true;
        }
    },
    
    destroy:function(){
        cmp.ThreeParticles.Server.instances[ this.scene.id ] = null;
        this.pool.remove(this);
    },

	STATIC:{
		instances:{},

		add:function( emitter ){
			var instances = cmp.ThreeParticles.Server.instances;
			var asset = emitter.asset;
            var instance = instances[ emitter.game.scene.id ];

            if( !instance ){
                instance = CLAZZ.get( cmp.ThreeParticles.Server, {
                    pool:emitter.entity.pool,
                    scene:emitter.game.scene,
                    game:emitter.game
                });
            }
			
            instance.add( emitter )
		},

        remove:function( emitter ){
			var instances = cmp.ThreeParticles.Server.instances;
            var instance = instances[ emitter.game.scene.id ];
            if( instance )
            	instance.remove( emitter );
        }
	}
	
});