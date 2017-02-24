CLAZZ("lib.LSystem", {
    PROVIDES:{"Testable":"multi"},

    ematrix:null,
    tmatrix:null,
    index:null,

    random:null,

    STATIC:{
        test:function mainFeatures(){
            this.source(`
            axiom => a(3,4) b(8)

            a(d, e) => DdAa(1, e)Ee

            b(x) -> Bax
            `);

            var out = this.generate(3);
            if( out != "D3AD1AE4E4 Ba8" )
                throw new Error("Unexpected output: " + out);
        }
    },

    CONSTRUCTOR:function(){
        this.random = Math.random;
    },
    
    generate:function( maxDepth ){
        var ret = this._generate( this.ematrix, "axiom", maxDepth );

        for( var i=0; i<ret.length; ++i ){
            if( !ret[i].charAt ) 
                ret.splice.apply( ret, [i, 1].concat( this._generate( this.tmatrix, ret[i], 1 ) ) );

            if( !ret[i].charAt )
                ret[i] = "";
        }
        
        return ret.join("");
    },

    apply:function(matrix, rule){
        var ret = [];
        var options = matrix[rule.rule];
        if( !options ) return [rule];

        var pick = options[ Math.floor( this.random() * options.length) ];

        ret = [].concat( pick.exp );

        if( pick.params && rule.params ){
            for( var j=0; j<pick.params.length; ++j ){
                substitute( ret, pick.params[j], rule.params[j] )
            }
        }

        function substitute( arr, k, v ){
            for( var i=0; i<arr.length; ++i ){
                var arri = arr[i];
                if( arri.charAt ){
                    var s = arri.split( k );
                    if( s.length > 1 ){
                        for( var si=0; si<s.length-1; si+=v.length+1 ){
                            s.splice.apply(s, [si+1, 0].concat(v) );
                        }
                        arr[i] = s.join(""); // .splice.apply(arr, [i, 1].concat(s));
                    }
                }else if( arri.params ){
                    for( var j=0; j<arri.params.length; ++j )
                        substitute( arri.params[j], k, v );
                }
            }
        }

        return ret;
    },

    _generate:function(matrix, str, depth){
        if( depth <= 0 ) return str;
        var i, l, stri, nest = [], ret;
        if( typeof str == "object" )
            str = [str];

        if(str.charAt)
            str = this.matches(str);

        for( i=0; i<str.length; ++i ){
            stri = str[i];
            if( stri.charAt ) continue;

            if( !matrix[stri.rule] )
                continue;
            
            ret = this.apply(matrix, stri);
            str.splice.apply(str, [i, 1].concat( ret ) );

            for( var j=0; j<ret.length; ++j )
                nest[nest.length] = i+j;

            i += ret.length;
        }

        if( depth > 1 ){
            var off=0;
            for( var n=0; n<nest.length; ++n ){
                i = nest[n] + off;
                stri = str[i];
                if( stri.charAt || !matrix[stri.rule] ) continue;
                ret = this._generate(matrix, stri, depth-1);
                str.splice.apply(str, [i, 1].concat( ret ) );
                off += ret.length - 1;
            }
        }

        return str;
    },

    clear:function(){
        this.ematrix = {};
        this.tmatrix = {};
        this.index = [];
    },

    source:function( src ){
        if( !this.index ) this.clear();

        var ematrix = this.ematrix, tmatrix = this.tmatrix, k, i, rule;
        var index = this.index;

        src = src.replace(/'.*/g, "");

        /\s*(.+?)\s*(?:\(\s*([^)]*)\s*\))?\s*([=-])>\s*([\s\S]+?)\s*(?:\n\n|$)/g.forEach(src, (m)=>{
            // console.log("RULE name[", m[1], "]  params[", m[2], "] " + m[3] + "> exp[" + m[4] + "]");
            var name=m[1], matrix=m[3]=="="?ematrix:tmatrix;
            m.name = name;
            if(m[2]) m.params = m[2].split(/\s*,\s*/);
            else m.params = null;
            m.exp = m[4];

            if( index.indexOf(name) == -1 )
                index[index.length] = name;

            var opts = matrix[name];
            if( !opts ) matrix[name] = opts = [];
            opts[opts.length] = m;
        });

        index.sort(function(a, b){ return b.length - a.length; })

        for( var k in tmatrix ){
            var tset = tmatrix[k];
            for( i=0; i<tset.length; ++i ){
                rule = tset[i];
                rule.exp = [rule.exp];
            }
        }
        
        for( var k in ematrix ){
            var eset = ematrix[k];
            for( i=0; i<eset.length; ++i ){
                rule = eset[i];
                rule.exp = this.matches(rule.exp);
            }
        }
    },

    matches:function(str){
        var srcstr = str;
        var exp = [ str.trim() ];
        var index = this.index;
        next: for( var j=0; j<exp.length; ++j ){
            for( var k=0; k<index.length; ++k ){
                var str = exp[j], strpos=0;
                if( !str.charAt ) continue next;

                strpos = str.indexOf(index[k]);
                if( strpos == -1 ) continue;

                var out = [j, 1];
                if( strpos )
                    out[out.length] = str.substr(0, strpos);
                strpos += index[k].length                            
                
                var params = null;
                if( str[strpos] == "(" ){
                    strpos++;
                    params = [];
                    var pc = 1, acc="";
                    do{
                        if(strpos>=str.length)
                        {
                            if( j+1 >= exp.length )
                                throw new Error("Unmatched Parenthesis '" + str + "' in: " + srcstr);

                            strpos = 0;
                            str = exp[++j];
                            out[1]++;
                        }
                        if( !str.charAt ){
                            params.push( [str] );
                            str = exp[++j];
                            out[1]++;
                            acc = null;
                        } else {
                            var ch = str[strpos++];
                            if( ch == ")" ) pc--;
                            else if( ch == "(" ) pc++;
                            if( (ch == "," && pc == 1) || (ch == ")" && pc == 0) ){
                                if( acc !== null )
                                    params.push( this.matches(acc) );
                                acc = "";
                            }else acc += ch;
                        }
                    }while(pc);
                }
                out[out.length] = { rule:index[k], params:params };
                
                if( strpos < str.length )
                    out[out.length] = str.substr(strpos);

                exp.splice.apply(exp, out);
                j += 1 - out[1];
            }
        }
        return exp;
    }
});