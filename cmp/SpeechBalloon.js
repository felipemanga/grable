CLAZZ("cmp.SpeechBalloon", {

INJECT:[
    "entity",
    "game",
    "languages",
    "defaultStyle", 
    "defaultTime", 
    "defaultPriority", 
    "defaultCancelable",
    "audioPath"
],

'@languages':{ type:'object', subtype:'longstring' },
languages:{},

balloonQueue:null,
balloonEl:null,

strings:null,
stringsLanguage:null,


'@defaultStyle':{ type:"enum", options:["balloon", "caption", "large"] },
defaultStyle:"balloon",

'@defaultTime':{ type:"float", min:0.1, max:30 },
defaultTime:3,

'@defaultPriority':{ type:"int", min:0 },
defaultPriority:1,

'@defaultCancelable':{ type:"bool" },
defaultCancelable:true,

'@audioPath':{ type:"string" },
audioPath:"",

service:null,

CONSTRUCTOR:function(){

    this.__checkLanguage();

    for( var key in this.strings ){
        this[ key ] = this.__onSpeechEvent.bind(this, key);
    }

    this.service = cmp.SpeechBalloon.Service.add( this );

},

destroy:function(){

    cmp.SpeechBalloon.Service.remove( this );

},

__checkLanguage: function(){

    var blackboard = this.entity.blackboard;

    var language = blackboard.language || "en_US";
    if( language === this.stringsLanguage ) return;
    this.stringsLanguage = language;
    
    var languages = this.languages;
    this.strings = JSON.parse( languages[ language ] || "{}" );
    
},

__onSpeechEvent: function(state){

    var blackboard = this.entity.blackboard;

    this.__checkLanguage();

    var line = this.strings[state] || state || "";

    var srcstr = line;

    if( typeof srcstr === "object" ) srcstr = line.text;
    else line = {};

    var outstr = srcstr.replace(/\$\{([^}]+)\}/, function(m, key){

        return DOC.resolve( key, blackboard );

    });

    var style = line.style || this.defaultStyle;

    this.service.__addToQueue( style, outstr, line, this );
}

});

CLAZZ("cmp.SpeechBalloon.Service", {
    pool:null,
    sceneId:0,
    canvas:null,
    talkers:null,

    largeQueue:[],
    largeEl:null,
    captionQueue:[],
    captionEl:null,
    

    CONSTRUCTOR:function( pool, sceneId, canvas ){

        this.pool = pool;
        pool.add(this);
        this.sceneId = sceneId;
        this.canvas = canvas;
        this.talkers = [];

        DOC.create("style", {
            before:document.head.firstElementChild, 
            text:[

                '.speech-balloon, .speech-caption, .speech-large {',
                    'position:absolute;',
                    'box-sizing: border-box;',
                    'background-color: rgba(0,0,0,0.7);',
                    'color: white;',
                '}',

                '.speech-balloon {',
                    'padding: 5px;',
                    'border-radius: 5px;',
                '}',

                '.speech-caption {',
                '}',

                '.speech-large {',
                '}',

                '.speech-caption, .speech-large {',
                    'padding: 15px;',
                    'font-size: 1.5em;',
                    'bottom: 0;',
                    'left: 0;',
                    'width: 100%;',
                    'border-radius: 5px 5px 0px 0px;',
                '}',

                '.speech-caption:before, .speech-large:before {',
                    'content: attr(talker);',
                    'position: absolute;',
                    'top: -1em;',
                    'left: 1em;',
                    'font-weight: bold;',
                '}'

            ].join("\n")
        });

    },

    add:function( talker ){

        if( this.talkers.indexOf(talker) !== -1 ) 
            return;
        this.talkers[ this.talkers.length ] = talker;

    },

    remove:function( talker ){
        var index = this.talkers.indexOf(talker);
        
        if( index == -1 ) return;

        this.talkers.splice( index, 1 );
    },

    destroy:function(){
        this.pool.remove(this);
        cmp.SpeechBalloon.Service.instances[ this.sceneId ] = null;
    },

    onTick:function( delta ){

        if( this.largeQueue.length )
            this.__processQueue( this.largeQueue, this.largeEl, delta );
            
        if( this.captionQueue.length )
            this.__processQueue( this.captionQueue, this.captionEl, delta );

        for( var i=0, talker; talker=this.talkers[i]; ++i ){

            if( talker.balloonQueue && talker.balloonQueue.length ){

                var visible = this.__processQueue( talker.balloonQueue, talker.balloonEl, delta );
                if( visible ){

                    var pos = talker.entity.getScreenPosition();
                    talker.balloonEl.style.left = pos.x + "px";
                    talker.balloonEl.style.top  = pos.y + "px";

                }

            }

        }

    },

    __processQueue: function( queue, element, delta ){

        if( !queue.length ){
            if( element.style.display != "none" )
                element.style.display = "none";
            return;
        }

        var obj = queue[0], ret;

        if( element.style.display == "none" ){
            element.style.display = "";
            element.innerHTML = obj.text;
            element.setAttribute( "talker", obj.talker );
        }

        obj.time -= delta;

        if( obj.time < 0 ){

            element.style.display = "none";
            queue.shift();

        }

        return true;
    },

    __addToQueue: function( style, text, line, talker ){

        var el, queue, canvas = this.canvas, container = this;
        if( style == "balloon" )
            container = talker;

        el = container[ style + "El" ];
        if( !el ){

            el = container[ style + "El" ] = DOC.create(
                    "div", 
                    {
                        className:"speech-" + style,
                        style:{ display:"none" }
                    }, 
                    canvas.parentElement
                );
            
            container[ style + "Queue" ] = [];
        }

        queue = container[ style + "Queue" ];
            
        var obj = {
            time: line.time || talker.defaultTime,
            priority: line.priority || talker.defaultPriority,
            cancelable: line.cancelable || talker.defaultCancelable,
            text: text,
            talker: talker.entity.blackboard.name || (talker.entity.asset && talker.entity.asset.name)
        };

        queue.push( obj );
    },

    STATIC:{
        
        instances:{},

        add:function( talker ){
            if( !talker || !talker.entity )
                return;

            var sceneId = talker.entity.game.scene.id;

            var instance = this.instances[ sceneId ];
            
            if( !instance )
                this.instances[ sceneId ] = instance = new cmp.SpeechBalloon.Service( talker.entity.pool, sceneId, talker.game.renderer.domElement );
            
            instance.add( talker );

            return instance;
        },

        remove:function( talker ){
            if( !talker || !talker.entity )
                return;

            var sceneId = talker.entity.game.scene.id;

            var instance = this.instances[ sceneId ];
            
            if( !instance ) return;

            instance.remove( talker );
        }

    }
});
