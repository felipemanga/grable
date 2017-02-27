CLAZZ("cmp.ThreeParticles", {
	INJECT:["entity", "asset", "game", "type", "texture"],
	
	'@type':{type:'enum', options:['fountain', 'exhaust']},
	type:"fountain",
	
	'@texture':{type:'texture'},
	texture:'resources/image/smoke.jpg',

    '@enabled':{type:'bool'},
    enabled:true,

    '@rate':{type:'float', min:0},
    rate:10,

    // used by server
    acc:0,

    setParticlesEnabled:function( enabled ){

        this.enabled = enabled;

    },

	onReady:function(){
		
		cmp.ThreeParticles.Server.add(this);
		
	},
	
	destroy:function(){

		cmp.ThreeParticles.Server.remove(this);

	}
});

CLAZZ("cmp.ThreeParticles.Server", {
    INJECT:['pool', 'scene', 'game'],

    index:null,

    vertexShader:`
uniform float size;
uniform float scale;
attribute vec4 particle;

#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

void main() {

	#include <color_vertex>
	#include <begin_vertex>
	#include <project_vertex>

    gl_PointSize = size * scale / - mvPosition.z;

	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>

}   
    `,

    fragmentShader:`
uniform vec3 diffuse;
uniform float opacity;

#include <common>
#include <packing>
#include <color_pars_fragment>

uniform vec4 offsetRepeat;
uniform sampler2D map;
// # include <map_particle_pars_fragment>

#include <fog_pars_fragment>
#include <shadowmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {

	#include <clipping_planes_fragment>

	vec3 outgoingLight = vec3( 1.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );

	#include <logdepthbuf_fragment>
    vec4 mapTexel = texture2D( map, 
        vec2( gl_PointCoord.x, 1.0 - gl_PointCoord.y )
        * offsetRepeat.zw 
        + offsetRepeat.xy );

    diffuseColor *= mapTexelToLinear( mapTexel );

	#include <map_particle_fragment>
	#include <color_fragment>
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

        var geometry = this.getGeometry( max );
        var material = this.getMaterial( texture );
        var mesh = new THREE.Points( geometry, material );
        this.scene.add( mesh );

        return this.index[texture] = {
            next: 0,
            max: max,
            mesh:mesh,
            geometry:geometry,
            material:material,
            emitters:[]
        };
    },

    getGeometry:function( max ){
        var particle = new THREE.Float32BufferAttribute(max*4, 4);
        particle.setDynamic( true );
        var position = new THREE.Float32BufferAttribute(max*3, 3);
        position.setDynamic( true );

        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute("position", position);
        geometry.addAttribute("particle", particle);
        geometry.drawRange.count = 0;

        // Necessary. I don't know why.
        position.array[0] = 500;
        particle.array[0] = 500;

        return geometry;
    },

    getMaterial:function( texture ){
        // var mat = new THREE.PointsMaterial( { color:0xffffff, size:100, opacity:1 } );
        // mat.map = (new THREE.TextureLoader()).load(texture);
        // mat.blending = THREE.AdditiveBlending;
        // mat.depthWrite = false;
        // mat.transparent = true;
        // return mat;

        var mat = new THREE.ShaderMaterial({
            fragmentShader: this.fragmentShader,
            vertexShader: this.vertexShader,
            uniforms: THREE.UniformsUtils.merge( [
				THREE.UniformsLib.points,
				THREE.UniformsLib.fog,
                {
                    time: {value:0},
                }
			] )
        });

        mat.uniforms.map.value = (new THREE.TextureLoader()).load(texture);
        
        mat.uniforms.size.value = 60;
        // mat.uniforms.opacity = 1;
        // mat.uniforms.diffuse.value = new THREE.Color(0xFFFFFF);
        // mat.uniforms.offsetRepeat.value.set( 0, 0, 1, 1 );

        mat.blending = THREE.AdditiveBlending;
        mat.transparent = true;
        mat.depthWrite = false;
        return mat;
    },

    add:function( emitter ){
        var index = this.getIndex( emitter.texture, true, 100 );
        index.emitters.push( emitter );
    },

    remove:function( emitter ){
        var index = this.getIndex(emitter, false);
        if( !index ) return;

        var pos = index.emitters.indexOf( emitter );
        if( pos == -1 ) return;

        this.emitters.splice( pos, 1 );
    },

    time:0,
    onTick:function(delta){
    	if( delta < 0 )
    		return;

        var scale = this.game.height / this.game.camera.aspect;
        var time = this.time += delta;
    		
        for( var k in this.index ){
            var dirty = false;
            var index = this.index[k];
            var max = index.max;
            var emitters = index.emitters;
            var geometry = index.geometry;
            var material = index.material;
            var position = geometry.attributes.position.array;
            var particle = geometry.attributes.particle.array;
            material.uniforms.time.value += delta;
            material.uniforms.scale.value = scale;


            for( var i=0, l=emitters.length; i<l; ++i ){

                var emitter = emitters[i];
                if( !emitter.enabled || !emitter.rate )
                    cotinue;

                var pos = emitter.asset.position;
                
                var acc = emitter.acc;
                acc += delta * emitter.rate;
                emitter.acc = acc - Math.floor(acc);
                acc = Math.floor(acc);

                for( var j=0; j<acc; ++j ){
                    var count = (index.next++) % max;
                    if( count > geometry.drawRange.count )
                        geometry.drawRange.count = count;

                    var p = count * 4;
                    particle[p++] = time;
                    particle[p++] = time;
                    particle[p++] = time;
                    particle[p++] = time;

                    p = count * 3;
                    position[p++] = pos.x;
                    position[p++] = pos.y;
                    position[p++] = pos.z;
                }

                if( acc > 0 )
                    dirty = true;
            }
            if( dirty ){
                geometry.attributes.particle.needsUpdate = true;
                geometry.attributes.position.needsUpdate = true;
            }
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
            instance.remove( emitter );
        }
	}
	
});