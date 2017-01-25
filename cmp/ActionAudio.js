CLAZZ("cmp.ActionAudio", {
    INJECT:["entity", "gameState", "game", "asset"],
    EXTENDS:Phaser.Sound,
    DYNAMIC:true,

    leftGain:null,
    rightGain:null,

    calmSpeed:0.005,
    actionSpeed:0.7,
    transitionSpeed:0.01,
    speed:0,

    CONSTRUCTOR:function(){
        SUPER(this.game, this.asset, 1, true);

        this.entity.actionLevel = 0;

        var ac = this.context;
        
        var splitter = ac.createChannelSplitter(2);
        this.externalNode = splitter;

        var gainNode;
        
        gainNode = this.leftGain = ac.createGain();
        splitter.connect(gainNode, 0);
        gainNode.connect( this.gainNode);

        gainNode = this.rightGain = ac.createGain();
        splitter.connect(gainNode, 1);
        gainNode.connect( this.gainNode);
    },

    create:function(){
        console.log("playing audio");
        this.play();
    },

    actionEvent:function(){
        this.speed += this.actionSpeed;
        this.speed = this.clamp(this.speed, -1, 1);
    },

    clamp:function(v, min, max){
        return Math.min(max, Math.max(v, min));
    },

    update:function(){
        Phaser.Sound.prototype.update.call(this);

        this.speed -= this.calmSpeed;
        this.speed = this.clamp(this.speed, -1, 1);

        var actionLevel = 0;
        actionLevel = (this.entity.actionLevel += this.speed * this.transitionSpeed);
        actionLevel = this.clamp(actionLevel, 0, 1);
        this.entity.actionLevel = actionLevel;

        var gain1 = actionLevel;
        var gain2 = 1-actionLevel;
        gain1 = Math.cos(actionLevel * 0.5 * Math.PI);
        gain2 = Math.cos((1.0 - actionLevel) * 0.5 * Math.PI);
    
        this.rightGain.gain.value = gain1;
        this.leftGain.gain.value = gain2;
    }
});