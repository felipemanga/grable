



var Graph = function ( editor ) {
    var types, nodeList, nodeMap;

	var signals = editor.signals;

	var container = new UI.Panel();
	container.setId( 'graph' );
	container.setPosition( 'absolute' );
	container.setBackgroundColor( '#272822' );
	container.setDisplay( 'none' );

	var header = new UI.Panel();
	header.setPadding( '10px' );
	container.add( header );

	var title = new UI.Text().setColor( '#fff' );
	header.add( title );

    var nodes = new UI.Panel();
    nodes.setId('graph_nodes');
    nodes.setZIndex(-1);
    container.add( nodes );

    var classSelect = new UI.Select();
    var btnInstance = new UI.Button('ADD');
    btnInstance.onClick(function(){
        instanceNode( { type:classSelect.getValue(), _x:container.dom.clientWidth * 0.5 - 100, _y:container.dom.clientHeight*0.5 - 50 } );
    });
    header.add( classSelect );
    header.add( btnInstance );

	var buttonSVG = ( function () {
		var svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
		svg.setAttribute( 'width', 32 );
		svg.setAttribute( 'height', 32 );
		var path = document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
		path.setAttribute( 'd', 'M 12,12 L 22,22 M 22,12 12,22' );
		path.setAttribute( 'stroke', '#fff' );
		svg.appendChild( path );
		return svg;
	} )();

	var close = new UI.Element( buttonSVG );
	close.setPosition( 'absolute' );
	close.setTop( '3px' );
	close.setRight( '1px' );
	close.setCursor( 'pointer' );
	close.onClick( function () {

		container.setDisplay( 'none' );

	} );
	header.add( close );

	signals.editorCleared.add( function () {

		container.setDisplay( 'none' );

	} );

	signals.editGraph.add( function ( object, script ) {

        var name = script.name;
        var source = script.source;
        title.setValue( object.name + ' / ' + name );
        
		currentScript = script;
		currentObject = object;
		container.setDisplay( '' );

        editGraph( script );        

    });

    var hnd = null;
    function onChange(force){

        if( hnd ) clearTimeout(hnd);

        hnd = null;

        if( !force ){

            hnd = setTimeout(onChange.bind(null, true), 1000);
            return;

        }

        var ret = [];
        for( var i=0, node; node=nodeList[i]; ++i ){

            ret[ret.length] = node.toJSON();

        }

        currentScript.onChange( ret );
        
    }


// the following is a modified version of https://codepen.io/xgundam05/pen/KjqJn.
/*

Copyright (c) 2017 by Matthew (http://codepen.io/xgundam05/pen/KjqJn)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
and associated documentation files (the "Software"), to deal in the Software without restriction, 
including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, 
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE 
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, 
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS 
IN THE SOFTWARE.

*/

// SVG SETUP
// ===========
var svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
svg.ns = svg.namespaceURI;

var mode = "MO"; // multiple outputs or MI, multiple inputs

// MOUSE SETUP
// =============
var mouse = {
    currentInput: null,
    createPath: function(a, b){
        var offset = GetFullOffset( svg );
        var ax = a.x - offset.left, ay = a.y - offset.top, bx = b.x - offset.left, by = b.y - offset.top;

        var diff = {
        x: bx - ax,
        y: by - ay
        };

        var pathStr = 'M' + ax + ',' + ay + ' ';
        pathStr += 'C';
        pathStr += ax + diff.x / 3 * 2 + ',' + ay + ' ';
        pathStr += ax + diff.x / 3 + ',' + by + ' ';
        pathStr += bx + ',' + by;

        return pathStr;
    }
};

var dragging = null,
    dragOffsetX = 0,
    dragOffsetY = 0;

nodes.dom.onmousemove = function(e){
    if( !event.which || !event.buttons )
        dragging = null;

    if( dragging ){
        var de = dragging.domElement;

        var offset = GetFullOffset( de.parentElement );
        de.style.left = (event.pageX - offset.left - dragOffsetX) + "px";
        de.style.top = (event.pageY - offset.top - dragOffsetY) + "px";

        dragging.updatePosition();

        onChange();

    }


  if(mouse.currentInput){
    var p = mouse.currentInput.path;
    var iP = mouse.currentInput.getAttachPoint();
    var oP = {x: e.pageX, y: e.pageY};
    var s = mouse.createPath(iP, oP);
    p.setAttributeNS(null, 'd', s);
  }
};

nodes.dom.onclick = function(e){
  if(mouse.currentInput){
    mouse.currentInput.path.removeAttribute('d');
    if(mouse.currentInput.node){
      mouse.currentInput.node.detachInput(mouse.currentInput);
    }
    mouse.currentInput = null;
  }
};

// CLEAN UP AND ACTUAL CODE [WIP]
// ================================

function GetFullOffset(element){
  var offset = {
    top: element.offsetTop || 0,
    left: element.offsetLeft || 0
  };
  
  if(element.offsetParent){
    var po = GetFullOffset(element.offsetParent);
    offset.top += po.top;
    offset.left += po.left;
    return offset;
  }
  else
    return offset;
}

function Node( desc, values ){
    this.uuid = values._uuid || THREE.Math.generateUUID();
    this.values = values;

    nodeMap[ this.uuid ] = this;

    this.domElement = DOC.create('div', {
        className:'graph_node'
    }, 
    [
        ["div", {
            id:'btnDelete',
            text:'x', 
            onclick:this.delete.bind(this), 
            style:{
                float:'right', 
                backgroundColor:'#A55', 
                color:'white',
                padding:'0px 5px',
                borderRadius: '3px',
                boxSizing: 'border-box',
                height: '18px',
                marginTop: '2px',
                cursor: 'pointer'
            }
        }]
    ]);

    var label = desc._label || values.type;

    var title = new UI.Meta({
        context:values,
        meta: desc[ '@'+label ] || {type:'unknown'},
        key: label,
        default: desc[ label ]
    });

    title.dom.setAttribute('title', label);

    title.setValue( label in values ? values[label] : desc[label] );

    title.onChange(function(){
        values[ label ] = this.getValue();
        onChange();
    });

    this.domElement.appendChild( title.dom );
    this.titleDom = title.dom;


//   // DOM Element creation
//   this.domElement = document.createElement('div');
//   this.domElement.classList.add('graph_node');
//   this.domElement.setAttribute('title', name);
  
  // Create output visual
  var outDom = document.createElement('span');
  outDom.classList.add('graph_output_' + mode);
  outDom.innerHTML = '&nbsp;';
  this.domElement.appendChild(outDom);
  
  // Output Click handler
  var that = this;
  outDom.onclick = function(e){
    if(mouse.currentInput &&
       !that.ownsInput(mouse.currentInput)){
      var tmp = mouse.currentInput;
      mouse.currentInput = null;
      that.connectTo(tmp);
      onChange();
    }
    e.stopPropagation();
  };
  
  // Node Stuffs
  this.value = '';
  this.inputs = [];
  this.connected = false;
  
  // SVG Connectors
  this.attachedPaths = [];

  if( mode === "MO" ){
    for( var k in desc ){
        if( k[0] != '@' || k == '@' + label ) continue;
        this.addInput( k.substr(1) );
    }
  }else{
    for( var k in desc ){
        if( k[0] != '@' || k == '@' + label ) continue;
        this.addInput( k.substr(1), desc, values );
    }
  }
  this.moveTo( values );
}

function NodeInput(name, desc, values ){
  this.name = name;
  this.node = null;
  this.parentNode = null;
  this.values = values;
  
  // The dom element, here is where we could add
  // different input types
  this.domElement = document.createElement('div');
  this.domElement.classList.add('graph_connection_' + mode);
  this.domElement.classList.add('graph_empty');

  if( desc ){
    var title = new UI.Meta({
        context:values,
        meta: desc[ '@'+name ],
        key: name,
        default: desc[ name ]
    });

    title.dom.setAttribute('title', name);

    title.setValue( name in values ? values[name] : desc[name] );

    title.onChange(function(){
        values[ name ] = this.getValue();
        onChange();
    });

    this.domElement.appendChild( title.dom );      
  } else {
      this.domElement.innerHTML = name;      
  }
    
  // SVG Connector
  this.path = document.createElementNS(svg.ns, 'path');
  this.path.setAttributeNS(null, 'stroke', '#8e8e8e');
  this.path.setAttributeNS(null, 'stroke-width', '2');
  this.path.setAttributeNS(null, 'fill', 'none');
  svg.appendChild(this.path);
  
  // DOM Event handlers
  var that = this;
  this.domElement.onclick = function(e){
      if( e.target.matches('INPUT,BUTTON,.value') ){
          e.stopPropagation();
          return;
      }
    if(mouse.currentInput){
      if(mouse.currentInput.path.hasAttribute('d'))
        mouse.currentInput.path.removeAttribute('d');
      if(mouse.currentInput.node){
        mouse.currentInput.node.detachInput(mouse.currentInput);
        mouse.currentInput.node = null;
      }
    }
    mouse.currentInput = that;
    if(that.node){
      that.node.detachInput(that);
      that.domElement.classList.remove('graph_filled');
      that.domElement.classList.add('graph_empty');
    }
    e.stopPropagation();
  };
}

NodeInput.prototype.getAttachPoint = function(){
  var offset = GetFullOffset(this.domElement);
  return {
    x: mode == "MO" ? offset.left - 7 : offset.left + this.domElement.offsetWidth + 5,
    y: offset.top + this.domElement.offsetHeight / 2
  };
};

Node.prototype.toJSON = function(){
    var obj = Object.assign({}, this.values);
    var edges = [];
    var paths = this.attachedPaths;
    for( var i=0; i<paths.length; ++i ){
        var path = paths[i];
        edges[edges.length] = [path.input.parentNode.uuid, path.input.name];
    }
    for( var i=0; i<this.inputs.length; ++i ){
        var input = this.inputs[i];
        obj[ input.name ] = input.values[ input.name ];
    }
    obj._uuid = this.uuid;
    obj._edges = edges;
    obj._x = this.domElement.offsetLeft;
    obj._y = this.domElement.offsetTop;
    return obj;
};

Node.prototype.getOutputPoint = function(){
  var tmp = this.titleDom;
  var offset = GetFullOffset(tmp);
  return {
    x: mode == "MI" ? offset.left : offset.left + tmp.offsetWidth,
    y: offset.top + tmp.offsetHeight / 2
  };
};

Node.prototype.addInput = function(name, desc, context){
  var input = new NodeInput(name, desc, context);
  this.inputs.push(input);
  input.parentNode = this;
  this.domElement.appendChild(input.domElement);
  
  return input;
};

Node.prototype.delete = function(){
    var index = nodeList.indexOf( this );
    if( index == -1 ) return;

    var aPaths = this.attachedPaths;
    while( aPaths.length )
        this.detachInput( aPaths[0].input );


    this.inputs.forEach(function(input){
        if( input.node ) input.node.detachInput( input );
    });

    delete nodeMap[ this.uuid ];

    nodeList.splice( index, 1 );

    onChange();

    if( !this.domElement || !this.domElement.parentNode )
        return;

    this.domElement.parentNode.removeChild( this.domElement );

};

Node.prototype.detachInput = function(input){
  var index = -1;
  for(var i = 0; i < this.attachedPaths.length; i++){
    if(this.attachedPaths[i].input == input)
      index = i;
  };
  
  if(index >= 0){
    this.attachedPaths[index].path.removeAttribute('d');
    this.attachedPaths[index].input.node = null;
    this.attachedPaths.splice(index, 1);
  }
  
  if(this.attachedPaths.length <= 0){
    this.domElement.classList.remove('graph_connected');
  }

  onChange();
};

Node.prototype.ownsInput = function(input){
  for(var i = 0; i < this.inputs.length; i++){
    if(this.inputs[i] == input)
      return true;
  }
  return false;
};

Node.prototype.updatePosition = function(){
  var outPoint = this.getOutputPoint();
  
  var aPaths = this.attachedPaths;
  for(var i = 0; i < aPaths.length; i++){
    var iPoint = aPaths[i].input.getAttachPoint();
    var pathStr = this.createPath(iPoint, outPoint);
    aPaths[i].path.setAttributeNS(null, 'd', pathStr);
  }
  
  for(var j = 0; j < this.inputs.length; j++){
    if(this.inputs[j].node != null){
      var iP = this.inputs[j].getAttachPoint();
      var oP = this.inputs[j].node.getOutputPoint();
      
      var pStr = this.createPath(iP, oP);
      this.inputs[j].path.setAttributeNS(null, 'd', pStr);
    }
  }
};

Node.prototype.createPath = mouse.createPath;

Node.prototype.connectTo = function(input){
  input.node = this;
  this.connected = true;
  this.domElement.classList.add('graph_connected');
  
  input.domElement.classList.remove('graph_empty');
  input.domElement.classList.add('graph_filled');
  
  this.attachedPaths.push({
    input: input,
    path: input.path
  });
  
  var iPoint = input.getAttachPoint();
  var oPoint = this.getOutputPoint();
  
  var pathStr = this.createPath(iPoint, oPoint);
  
  input.path.setAttributeNS(null, 'd',pathStr);
};

Node.prototype.moveTo = function(point){
  this.domElement.style.top = point._y + 'px';
  this.domElement.style.left = point._x + 'px';
  this.updatePosition();
};

Node.prototype.initUI = function(){
  var that = this;

  if( this.values && this.values._edges ){

      for( var i=0, edge; (edge=this.values._edges[i]); ++i ){

          var target = nodeMap[ edge[0] ];
          
          if( !target ) continue;

          for( var j=0, input; (input=target.inputs[j]); ++j ){
              
              if( input.name === edge[1] ){

                  this.connectTo( input );
                  break;

              }

          }


      }

  }
  
  // Make draggable

  this.domElement.onmousedown = function(event){
      if( !event.target.matches('INPUT,BUTTON,.value,.graph_connection_MO,.graph_connection_MI,.graph_output_MO,.graph_output_MI,#btnDelete') ){
    	  dragging = that;
          dragOffsetX = event.offsetX;
          dragOffsetY = event.offsetY;
      }
  };

  // Fix positioning
  this.domElement.style.position = 'absolute';
  
  nodes.dom.appendChild(this.domElement);
  
  // Update Visual
  this.updatePosition();
};



	return container;

    function instanceNode( srcnode, init ){
        var meta = types[srcnode.type];
        if( !meta ) return;

        var node = nodeList[ nodeList.length ] = new Node( meta, srcnode );
        
        if( init !== false )
            node.initUI();        
    }


// // ========
    function editGraph( script, _mode ){
        mode = (script.config && script.config.mode) || "MI";

        
        nodes.clear();
        nodes.dom.appendChild( svg );
        svg.offsetParent = nodes.dom;
        while( svg.childNodes.length )
            svg.removeChild( svg.childNodes[0] );

        types = script.config && script.config.types || {};

        var typeIndex = {};
        for( var k in types )
            typeIndex[k] = k;
        classSelect.setOptions(typeIndex);

        var src = script.source || [];
        nodeList = [];
        nodeMap = {};

        for( var i=0; i<src.length; ++i ){
            instanceNode( src[i], false );
        }

        for( i=0; i<nodeList.length; ++i )
            nodeList[i].initUI();

    }

};