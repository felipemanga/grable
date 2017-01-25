CLAZZ("cmp.State", {
    INJECT:["entity", "begin", "end", "event", "state"],
    state:undefined,
    begin:null,
    end:null,
    event:null,

    CONSTRUCTOR:function(){
        this.entity.state = this.state;
        this.state = undefined;

        var k, o;
        if( this.begin ){
            for( k in this.begin ){
                this[k + "Begin"] = this.entity.apply.bind(this.entity, this.begin[k]);
            }
        }
        if( this.end ){
            for( k in this.end ){
                this[k + "End"] = this.entity.apply.bind(this.entity, this.end[k]);
            }
        }
        if( this.event ){
            for( k in this.event ){
                this[k] = checkEvent.bind(this, this.event[k]);
            }
        }

        function checkEvent(map){
            debugger;
            var obj = map[this.state];
            if( !obj ) return;
            this.entity.apply(obj);
        }
    },

    update:function(){
        if( this.entity.state != this.state ){
            if( this.entity[this.entity.state + "End"] )
                this.entity[this.entity.state + "End"]();
            this.state = this.entity.state;
            if( this.entity[this.state + "Begin"] )
                this.entity[this.state + "Begin"]();
        }
        if( this.entity[ this.state ] )
            this.entity[ this.state ]();
    }
});