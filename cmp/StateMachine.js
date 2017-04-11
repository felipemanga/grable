CLAZZ("cmp.StateMachine", {
    INJECT:['entity', 'graph'],

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
                    conditions:[]
                }, 
                subtypes:{
                    event:{ type:'string' },
                    conditions:{ type:'object', subtype:{type:'json'} }
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
                    conditions:[]
                }, 
                subtypes:{
                    event:{ type:'string' },
                    conditions:{ type:'object', subtype:{type:'json'} }
                }
            },
            
            '@Trigger2':{
                type:'object',
                canResize:false,
                default:{
                    event:'', 
                    conditions:[]
                }, 
                subtypes:{
                    event:{ type:'string' },
                    conditions:{ type:'object', subtype:{type:'json'} }
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
                    conditions:[]
                }, 
                subtypes:{
                    event:{ type:'string' },
                    conditions:{ type:'object', subtype:{type:'json'} }
                }
            },
            
            '@Trigger2':{
                type:'object',
                canResize:false,
                default:{
                    event:'', 
                    conditions:[]
                }, 
                subtypes:{
                    event:{ type:'string' },
                    conditions:{ type:'object', subtype:{type:'json'} }
                }
            },
            
            '@Trigger3':{
                type:'object',
                canResize:false,
                default:{
                    event:'', 
                    conditions:[]
                }, 
                subtypes:{
                    event:{ type:'string' },
                    conditions:{ type:'object', subtype:{type:'json'} }
                }
            }

        }

    } },
    graph:null
});