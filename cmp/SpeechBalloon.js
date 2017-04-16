CLAZZ("cmp.SpeechBalloon", {

INJECT:["entity", "game", "languages"],

'@languages':{ type:'object', subtype:'longstring' },
languages:{},

strings:null,
stringsLanguage:null,

CONSTRUCTOR:function(){


    this.__checkLanguage();

    for( var key in this.strings ){
        this[ key ] = this.__onSpeechEvent.bind(this, key);
    }

},

__checkLanguage: function(){
    var blackboard = this.entity.blackboard;

    var language = blackboard.language || "en_US";
    if( language === this.stringsLanguage )
        return;
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

    console.log( outstr );

}

});