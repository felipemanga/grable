/**
 * @author mrdoob / http://mrdoob.com/
 */

Sidebar.Properties = function ( editor ) {

	var signals = editor.signals;
    var defaultMenu = 'object';
    var menus = {
        'object' : Sidebar.Object,
        'geometry' : Sidebar.Geometry,
        'material' : Sidebar.Material,
        'entity' : Sidebar.Entity
    };

	var container = new UI.Span();
	var tabs = new UI.Div();
	tabs.setId( 'tabs' );
	container.add( tabs );

    for( var label in menus )
    {
        var manager = menus[label];
        menus[label] = {
            header: new UI.Text( label ).onClick( select.bind(null, label) ),
            body: new UI.Span().add( new manager( editor ) )
        };
        tabs.add( menus[label].header );
        container.add( menus[label].body );
    }

	function select( section ) {
        for( var label in menus ){
            var menu = menus[label];
            menu.header.setClass( section == label ? 'selected' : '' );
            menu.body.setDisplay( section == label ? '' : 'none' );
        }
	}

	select( defaultMenu );

    signals.showProperty.add( select );

	return container;

};
