/*jshint esversion: 6 */
// doc: https://github.com/cronvel/terminal-kit/blob/HEAD/doc/documentation.md#ref.TOC
var term = require( 'terminal-kit' ).terminal ;

const RCSession = require('./RCSession.js');

class RChatClient {
  constructor() {
    let rc = this;
    rc.showWelcome();
    rc.rcSession = new RCSession();
    rc.initInputs();
    setTimeout(function () {
      rc.initSession();
    } , 500);
  }

  bye() {
    console.log("\nbye");
    process.exit();
  }

  showWelcome() {
      term.clear();
      term.moveTo( 10 , 2 ) ;
      term( "Welcome to rchatClient !" ) ;
  }

  initInputs() {
      let rc = this;
      term.grabInput( { mouse: 'button' } ) ;
      term.on( 'key' , function( name , matches , data ) {
          // console.log( "'key' event:" , name ) ;
          switch (name) {
            case 'h': rc.showHelp(); break;
            case 'i': rc.rcSession.info(); break;
            case 'm': rc.rcSession.me(false); break;
            case 'd': rc.rcSession.me(true); break;
            case 'r': rc.rcSession.groupRoles(); break;
            case 'LEFT':rc.showRoom(); break;
            case 'RIGHT':rc.rcSession.nextRoom(); rc.showRoom(); break;
            case 'CTRL_C':
            case 'q': rc.bye(); return;
          }
      } ) ;

      term.on( 'mouse' , function( name , data ) {
          console.log("'mouse' event:" , name , data ) ;
      } ) ;
  }

  initSession() {
    let rc = this;
    rc.rcSession.init((success) => {
        if (success) {
            rc.showRoom();
            return;
        }
        rc.bye();
    });
  }

  showRoom() {
      term.clear();
      term.moveTo( 1 , 1 ) ;
      let groupRoles = '';
      if (this.rcSession.isAGroup()) {
        groupRoles = "- 'r'oom roles ";
      }
      term( "Help | 'h'elp - 'i'nfo - 'm'e - 'd'etails " + groupRoles + "- '->' select next room - '<-' clear - 'q'uit" ) ;
      term.moveTo( 1 , 2 ) ;
      term( "Room | " + this.rcSession.getRooms() + "\n\n");
  }

  showHelp() {
      term.clear();
      term.moveTo( 10 , 2);
      term( "rchatClient Help\n\n\n");
      term.green( " - quit using 'q' or CTRL+C\n\n\n");
      term( " type [<-] to return to your room.\n\n");
      term("^bReleased with terminal-kit,rocketchat-api^\n");
      term("^bHome: github.com/boly38/rchatClient^\n");
  }

}

/*



RChatClient() {
  prototype() {
    this.term = require( 'terminal-kit' ).terminal;
  }
}
*/

module.exports = RChatClient;