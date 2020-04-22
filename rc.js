/*jshint esversion: 6 */
const RocketChatApi = require('rocketchat-api');

// generate me via (...rocketchat..)/account/tokens
var rcUserId = process.env.RC_USERID || 'YourUserIdHere';
var rcToken  = process.env.RC_TOKEN  || 'YourTokenHere';
var rcHost   = process.env.RC_HOST  || 'myrocketchat-server.mybusiness.com';
var rcPort   = process.env.RC_PORT  || 443;
var rcProto  = process.env.RC_PROTO  || 'https';

const readline = require('readline');
const rocketChatClient = new RocketChatApi(rcProto, rcHost, 443);
rocketChatClient.setAuthToken(rcToken);
rocketChatClient.setUserId(rcUserId);

// logging
var log4js = require('log4js');
var logger = log4js.getLogger();
logger.setLevel('DEBUG');

var myChannels = [];
var myGroups = [];
var selectedChannel = process.env.RC_PRESELECTED_CHANNEL || undefined;
var selectedRoomId = process.env.RC_PRESELECTED_ROOM_ID || undefined;

function bye() {
    logger.info("bye");
    process.exit();
}

// Key input
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', (str, key) => {
  if ((key.name == 'q') || (key && key.ctrl && key.name == 'c')) {
    bye();
    return;
  }
  switch (key.name) { // input menu key dispatcher
    case 'h': menu(); break;
    case 'i': info(); break;
    case 'm': me(false); break;
    case 'd': me(true); break;
    case 'j': channelsJoined(); break;
    case 'g': groupsJoined(); break;
    case 's': selectNextChannel(); break;
    case 'o': showSelectedRoomInfo(); break;
    default : console.log('unknown command "' + str + '" (ctrl:' + key.ctrl + ' name:' + key.name + ')');
  }
});

function menu() {
  console.log("  * ~~help menu~~");
  console.log("    h  display help menu");
  console.log("    i  get server info");
  console.log("    m  get info about me");
  console.log("    d  get info about me with all details");
  console.log("    j  get channels I've join");
  console.log("    g  get groups I've join");
  if (Array.isArray(myChannels) && myChannels.length) {
  console.log("    s  select next channel");
  }
  if (selectedRoomId) {
  console.log("    o  show selected room info");
  }
  console.log("    q or <CTRL> + <c>  quit");
  if (Array.isArray(myChannels) && myChannels.length) {
    console.log("    myChannels:",myChannels.toString());
  }
  if (Array.isArray(myGroups) && myGroups.length) {
    console.log("    myGroups:",myGroups.toString());
  }
  if (selectedChannel) {
    console.log("    selectedChannel:",selectedChannel);
  }
  if (selectedRoomId) {
    console.log("    selectedRoomId:",selectedRoomId);
  }
}

function info() {
    rocketChatClient.miscellaneous.info((err, body)=>{
     if (err) {
       logger.info('INFO ERROR', err);
     }
     logger.info('INFO', body);
    });
}

function me(verbose) {
    rocketChatClient.authentication.me((err, body)=>{
     if (err) {
       logger.info('authentication me ERROR', err);
     }
     if (verbose) {
       logger.info('authentication me:', body);
     } else {
       logger.info('loggued as', body.username);
     }
    });
}

function channelsJoined() {
    // this does'nt return private channels (groups)
    rocketChatClient.channels.listJoined({}, (err, body)=> {
      if (err) {
        console.log('channels listJoined ERROR', err);
      }
      myChannels = [];
      console.log('channels listJoined :'); //, body);
      body.channels.forEach(
        channel => {
          console.log(' - ', channel.name, channel.usersCount, channel.topic);
          myChannels.push(channel.name);
        }
      );
     });
}


function groupsJoined() {
    rocketChatClient.groups.list({}, (err, body)=> {
      if (err) {
        console.log('groups list ERROR', err);
      }
      myGroups = [];
      console.log('groups  list :'); // , body);
      body.groups.forEach(
        group => {
          console.log(' - ', group.name, group.usersCount, group.topic);
          myGroups.push(group.name);
        }
      );
     });
}

function selectNextChannel() {
    if (!Array.isArray(myChannels) || !myChannels.length) {
      console.log("type j before!");
    }
    var index = myChannels.indexOf(selectedChannel) >=0 ? myChannels.indexOf(selectedChannel) : -1;
    var nextIndex = index+1 >= myChannels.length ? 0 : index+1;
    selectedChannel = myChannels[nextIndex];
    console.log("    selectedChannel:",selectedChannel);
}

function showSelectedRoomInfo() {
    if (!selectedChannel) {
      return;
    }
    rocketChatClient.groups.info(selectedRoomId, (err, body)=> {
      if (err) {
        console.log('groups info ERROR', err);
      }
      console.log('groups info :', body);
     });
}

console.log("my lord, type 'h' for help menu.");