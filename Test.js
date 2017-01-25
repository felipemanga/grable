CLAZZ("js.Test", {
    INJECT:["Testable"],

    testQueue:null,
    fails:0,
    columns:0,

    CONSTRUCTOR:function(){
        setTimeout( this.run.bind(this), 10 );
    },

    run:function(){
        console.log("STARTING TEST RUN.");

        this.testQueue = [];
        this.fails = 0;
        this.Testable.forEach((obj) => this.startTest(obj));

        this.next();
    },

    error:function(test, msg){
        console.error(
            "%c" + test.path + ": ." + '.'.repeat(Math.max(0, this.columns - test.path.length)) + 
            " %c[FAILED]" +
            "%c " + msg
            , "font-weight: bold", "background-color: red; color:white; font-weight:bold;", "font-weight: normal; background-color: initial; color: red;");
        this.fails++;
        setTimeout(this.next.bind(this), 20);
    },

    pass:function(test){
        console.log( "%c" + test.path + ": ..." + '.'.repeat(this.columns - test.path.length) + "%c" + " %c[PASSED]", "font-weight: bold", "font-weight: normal", "background-color: green; color:white; font-weight: bold;");
        setTimeout(this.next.bind(this), 20);
    },

    next:function(){
        if( !this.testQueue.length )
            return this.endTest();

        var test = this.testQueue.shift(), isAsync=false, inside=true, THIS=this;
        var name = test.name || "Test";
        console.log("Running " + test.path);
        try{
            test(asyncCB);
            inside = false;
            if( !isAsync ) this.pass( test );
        }catch(ex){
            this.error( test, ex );
            console.error(ex.stack || ex);
        }
        return;

        function asyncCB(result){
            if( inside ){
                if(isAsync)
                    console.warn("asyncCB called twice inside.");
                isAsync = true;
            }else{
                if( result === true || result === undefined )
                    THIS.pass( test );
                else{
                    THIS.error( test, [].join.call( arguments, " " ) );
                    console.error( result );
                }
            }
        }
    },

    endTest:function(){
        if( this.fails ) console.warn("FAIL COUNT:" + this.fails);
        else console.log("SUCCESS!");
    },

    startTest:function(path){

        var clazz, testPath;
        if( typeof path == "string" ){
            testPath = path;
            clazz = DOC.resolve(path);
            if( !clazz ) return this.error("Could not instance");
        }else{
            testPath = path.fullName;
            clazz = path;
        }

        var obj;
        
        try{
            obj = CLAZZ.get(clazz.fullName, clazz.testInject);
        }catch(ex){
            return this.error({path:clazz.fullName, name:"instance"}, ex);
        }


        var tests = clazz.test;
        var col = 0;
        if( !tests ) return this.error({path:clazz.fullName, name:"init"}, "No tests");

        do{
            if( tests ){
                if( !(tests instanceof Array) )
                    tests = [tests];

                for( var i=0; i<tests.length; ++i ){
                    var bt = tests[i].bind(obj);
                    bt.path = testPath + "->" + tests[i].name;
                    this.testQueue.push(bt);

                    if( bt.path.length > col ) col = bt.path.length;
                }
            }

            tests = null;
            if( clazz.EXTENDS ){
                clazz = clazz.EXTENDS;
                if( typeof clazz == "string" )
                    clazz = DOC.resolve(clazz);
                if( clazz ){
                    clazz = clazz.CLAZZ;
                    tests = clazz.test;
                }
            }
        }while(tests || clazz.EXTENDS);

        if( this.columns < col ) this.columns = col;
    }
});
