/**
 * @author mrdoob / http://mrdoob.com/
 */

Sidebar.Settings = function ( editor ) {

	var config = editor.config;
	var signals = editor.signals;

	var container = new UI.Panel();
	container.setBorderTop( '0' );
	container.setPaddingTop( '20px' );

	// component stuff

	var compRow = new UI.Row();
	var compPath = new UI.Input( config.getKey('editorComponentPath') || "./" ).setWidth( '130px' ).setFontSize( '12px' );
	compPath.onChange( function () {

		editor.config.setKey('editorComponentPath', this.getValue());

	});

	compRow.add( new UI.Text( 'Components' ).setWidth( '90px' ) );
	compRow.add( compPath );

	container.add(compRow);

	// class

	var options = {
		'css/light.css': 'light',
		'css/dark.css': 'dark'
	};

	var themeRow = new UI.Row();
	var theme = new UI.Select().setWidth( '150px' );
	theme.setOptions( options );

	if ( config.getKey( 'theme' ) !== undefined ) {

		theme.setValue( config.getKey( 'theme' ) );

	}

	theme.onChange( function () {

		var value = this.getValue();

		editor.setTheme( value );
		editor.config.setKey( 'theme', value );

	} );

	themeRow.add( new UI.Text( 'Theme' ).setWidth( '90px' ) );
	themeRow.add( theme );

	container.add( themeRow );

	return container;

};
