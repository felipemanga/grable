/**
 * @author fmanga
 */

Sidebar.Wire = function ( editor ) {

	var signals = editor.signals;

	var container = new UI.Panel();
	container.setDisplay( 'none' );

	container.add( new UI.Text( 'Dependency Injection' ).setTextTransform( 'uppercase' ) );
	container.add( new UI.Break() );
	container.add( new UI.Break() );

	//

	var scriptsContainer = new UI.Row();
	container.add( scriptsContainer );

	function update() {

		scriptsContainer.clear();
		scriptsContainer.setDisplay( 'none' );

		var object = editor.selected;

		if ( object === null ) {

			return;

		}

	}

	// signals

	signals.objectSelected.add( function ( object ) {

		if ( object !== null ) {

			container.setDisplay( 'block' );

			update();

		} else {

			container.setDisplay( 'none' );

		}

	} );

	return container;

};
