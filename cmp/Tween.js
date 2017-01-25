CLAZZ("cmp.Tween", {
    INJECT:["entity", "gameState"],
    enabled:true,
    ops:null,

    animators:{

        accelerateTo:function( current, obj ){
            return current - ( (current - obj.target) * obj.speed );
        }

    },

    CONSTRUCTOR:function(){
        this.ops = {};
        for( var k in this.animators )
            this[k] = addAnimator.bind(this, k)

        return;

        function addAnimator(name, obj, cfg){
            if( !cfg || typeof cfg == "number" ) cfg = { speed:cfg };
            var callback = cfg.callback, cb = callback ? check : null, speed=cfg.speed||0.1, minDelta=cfg.minDelta||0.25;
            var ops = this.ops, R = DOC.resolve, count=0;
            for( var k in obj ){
                count++;
                var opsk = ops[k];
                if( !opsk ){
                    opsk = ops[k] = {
                        parts: k.split("."),
                        op:name,
                        target: obj[k],
                        speed:  speed,
                        initial:R(k, this.entity),
                        value:0,
                        enabled:true,
                        minDelta:minDelta,
                        cb:cb
                    }
                }else{
                    opsk.op = name;
                    opsk.target = obj[k];
                    opsk.speed = speed;
                    opsk.initial = R(k, this.entity);
                    opsk.enabled = true;
                    opsk.minDelta = minDelta;
                    opsk.cb = cb;
                }
                opsk.value = opsk.initial;
            }

            function check(){
                count--;
                if( count ) return;
                this.entity.apply(callback);
            }
        }
    },

    update:function(){
        if( !this.enabled ) return;
        var ops = this.ops;
        for( var k in ops ){
            var opsk = ops[k];
            if( !opsk.enabled ) continue;

            var parts = opsk.parts, pos=0, c = this.entity;
            while(parts.length > pos+1){
                if( !c[parts[pos]] )
                    c[parts[pos]] = {};
                c = c[parts[pos++]];                
            }
            var r = opsk.value;
            if( Math.abs(r - opsk.target) < opsk.minDelta ){
                opsk.enabled = false;
                if(opsk.cb) opsk.cb.call(this);
            }else{
                r = this.animators[opsk.op].call(this, r, opsk);
                opsk.value = c[parts[pos]] = r;
            }
        }
    }
});