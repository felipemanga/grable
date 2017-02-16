/**
 * @author mrdoob / http://mrdoob.com/
 */

Menubar.Play = function ( editor ) {

	var signals = editor.signals;

	var container = new UI.Panel();
	container.setClass( 'menu' );

	var isPlaying = false;

	var title = new UI.Panel();
	title.setClass( 'title' );
	title.setTextContent( 'Play' );
	title.onClick( toggle );
	container.add( title );

    editor.signals.togglePlayer.add( toggle );

    function toggle() {

		if ( isPlaying === false ) {

			isPlaying = true;
			title.setTextContent( 'Stop' );
			signals.startPlayer.dispatch();

		} else {

			isPlaying = false;
			title.setTextContent( 'Play' );
			signals.stopPlayer.dispatch();

		}

	} 

	return container;

};
