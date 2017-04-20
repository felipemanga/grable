CLAZZ("cmp.StateMachine", {
    INJECT:['entity', 'graph', 'state', 'verbose'],

    '@graph':{ type:'graph', mode:'MI', types:{

        State : { '@State':{type:'string'} },

        Trigger1 : {
            _label:'State',
            '@State':{type:'string'},

            '@Trigger1':{
                type:'object',
                canResize:false,
                default:{
                    event:'', 
                    condition:''
                }, 
                subtypes:{
                    event:{ type:'string' },
                    condition:{ type:'string' }
                }
            }

        },

        Trigger2 : {
            _label:'State',
            '@State':{type:'string'},
            
            '@Trigger1':{
                type:'object',
                canResize:false,
                default:{
                    event:'', 
                    condition:''
                }, 
                subtypes:{
                    event:{ type:'string' },
                    condition:{ type:'string' }
                }
            },
            
            '@Trigger2':{
                type:'object',
                canResize:false,
                default:{
                    event:'', 
                    condition:''
                }, 
                subtypes:{
                    event:{ type:'string' },
                    condition:{ type:'string' }

                }
            }

        },

        Trigger3 : {
            _label:'State',
            '@State':{type:'string'},
            
            '@Trigger1':{
                type:'object',
                canResize:false,
                default:{
                    event:'', 
                    condition:''
                }, 
                subtypes:{
                    event:{ type:'string' },
                    condition:{ type:'string' }

                }
            },
            
            '@Trigger2':{
                type:'object',
                canResize:false,
                default:{
                    event:'', 
                    condition:''
                }, 
                subtypes:{
                    event:{ type:'string' },
                    condition:{ type:'string' }

                }
            },
            
            '@Trigger3':{
                type:'object',
                canResize:false,
                default:{
                    event:'', 
                    condition:''
                }, 
                subtypes:{
                    event:{ type:'string' },
                    condition:{ type:'string' }

                }
            }

        }

    } },
    graph:[
        {type:'State', _uuid:'a', _edges:[['b', 'Trigger1']], _x:200, _y:200},
        {type:'Trigger1', _uuid:'b', _x:500, _y:200}
    ],

    '@state':{type:'string'},
    state:null,

    '@verbose':{type:'bool'},
    verbose:false,

    setState:function( state ){
        
        if( this.state === state )
            return;

        if( this.verbose )
            console.log( this.entity.name + '.state:' + this.state + ' -> ' + state );

        this.state = state;
        this.entity.message(['', state]);

    },

    CONSTRUCTOR:function(){

        var state, triggers, triggerStates, verbose = this.verbose;
        var graph = this.graph || [];
        var eventTriggers = {};

        var nodeMap = {};
        for( var i=0, node; node=graph[i]; ++i ){
            nodeMap[ node._uuid ] = node;
        }


        for( var i=0, node; node=graph[i]; ++i ){

            state = node.State && node.State.trim && node.State.trim();
            if( !state ) continue;
            

            for( var e=0, edge; edge = node._edges[e]; ++e ){

                var otherNode = nodeMap[ edge[0] ];
                if( !otherNode ) continue;

                otherNode[ edge[1] ].target = node;

            }

            for( var t=1; ('Trigger' + t) in node; ++t ){

                var trigger = node[ 'Trigger' + t ];

                triggerStates = eventTriggers[ trigger.event ];
                if( !triggerStates ) 
                    triggerStates = eventTriggers[ trigger.event ] = {};
                
                if( !triggerStates[ state ] )
                    triggerStates[ state ] = [];

                triggers = triggerStates[ state ];

                triggers[ triggers.length ] = trigger;

            }

        }

        for( var event in eventTriggers ){

            this[ event ] = makeListener( eventTriggers[event], event );
            
        }

        function makeListener( event, name ){

            var src = 'with(this.entity.blackboard) switch( this.state ){\n';
            for( var state in event ){

                src += '\ncase ' + JSON.stringify(state) + ':\n';
                
                var triggers = event[state];
                for( var i=0, trigger; trigger = event[state][i]; ++i ){

                    if( !trigger.target ) 
                        continue;

                    var condition = trigger.condition && trigger.condition.trim && trigger.condition.trim();

                    if( condition )
                        src += "\tif( " + condition + " )\n\t";
                    
                    src += '\treturn this.setState(' + JSON.stringify( trigger.target.State ) + ');\n';

                    if( condition && verbose )
                        src += "\telse\n\t\tconsole.log( this.entity.name + '[' + this.entity.state + '].' + " + JSON.stringify(name) + " + ': ' + " + JSON.stringify(condition) + " + ' FAILED' );\n";

                    src += '\n';

                }

            }

            src += '}\n';

            console.log(src)

            return new Function(src);

        }

    },

    onReady:function(){
        var state = this.state;
        this.state = undefined;
        this.setState( state );
    }
});