CLAZZ("cmp.Mouse", {
    INJECT:["entity", "mouseover", "mouseout", "click", "DO"],
    mouseover:null,
    mouseout:null,
    click:null,
    enabled:true,
    DO:"sprite",
    
    create:function(){
        this.entity[this.DO].inputEnabled = true;

        var map = {
            click:"onInputUp",
            mouseover:"onInputOver",
            mouseout:"onInputOut",
            mousedown:"onInputDown",
            mouseup:"onInputUp"
        }

        for( var k in map ){
            if( !this[k] ) continue;
            this.entity[this.DO].events[map[k]].add( cb.bind(this, k) );
        }

        function cb(k){
            if( this.enabled )
                this.entity.apply( this[k] )
        }
    }
});