CLAZZ("cmp.Webcam", {
    INJECT:["game"],
    webcam:null,
    bitmap:null,
    create:function(){
        var w=320, h=240;
        // var w=800, h=600;
        this.webcam = this.game.plugins.add(Phaser.Plugin.Webcam);
        this.bitmap = this.game.add.bitmapData(w,h);
        this.webcam.start({video:{width:w, height:h, facingMode:"user"}},this.bitmap.context);
    },

    grab:function(){
        this.webcam.grab(this.webcam.context,0,0);
        return this.bitmap;
    }
});