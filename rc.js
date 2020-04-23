/*jshint esversion: 6 */
const RocketChatApi = require('rocketchat-api');

// generate me via (...rocketchat..)/account/tokens
var rcUserId = process.env.RC_USERID || 'YourUserIdHere';
var rcToken  = process.env.RC_TOKEN  || 'YourTokenHere';
var rcHost   = process.env.RC_HOST  || 'myrocketchat-server.mybusiness.com';
var rcPort   = process.env.RC_PORT  || 443;
var rcProto  = process.env.RC_PROTO  || 'https';
var loggerLevel = process.env.RC_LOG_LEVEL || 'INFO';

const readline = require('readline');
const rocketChatClient = new RocketChatApi(rcProto, rcHost, 443);
rocketChatClient.setAuthToken(rcToken);
rocketChatClient.setUserId(rcUserId);

// logging
var log4js = require('log4js');
var logger = log4js.getLogger();
logger.setLevel(loggerLevel);

var myChannels = [];
var myGroups = [];
var selectedRoom;
var selectedRoomId = process.env.RC_PRESELECTED_ROOM_ID || undefined;
var selectedIsGroup = true;

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
  } else if (!key.ctrl && key.name == 'right') {// -> arrow
    selectNext();
    return;
  }
  switch (key.name) { // input menu key dispatcher
    case 'h': menu(); break;
    case 'i': info(); break;
    case 'm': me(false); break;
    case 'd': me(true); break;
    case 'j': channelsJoined((success)=> {}); break;
    case 'g': groupsJoined((success)=> {}); break;
    case 'r': showSelectedRoomRoles(); break;
    default : console.log('unknown command "' + str + '" (ctrl:' + key.ctrl + ' name:' + key.name + ')');
  }
});

function menu() {
  console.log("  * ~~help menu~~");
  console.log("    h  display help menu");
  console.log("    i  get server info");
  console.log("    m  get info about me");
  console.log("    d  get info about me with all details");
  // console.log("    j  get channels I've join");
  // console.log("    g  get groups I've join");
  if (selectedIsGroup && selectedRoomId) {
  console.log("    r  show selected room roles");
  }
  if (Array.isArray(myChannels) && myChannels.length) {
  console.log("    ->  select next channel");
  }
  console.log("    q or <CTRL> + <c>  quit");
  if (Array.isArray(myChannels) && myChannels.length) {
    console.log("    myChannels:", showNames(myChannels));
  }
  if (Array.isArray(myGroups) && myGroups.length) {
    console.log("    myGroups:", showNames(myGroups));
  }
  if (selectedRoom) {
    // console.log("    selectedRoom:",selectedRoom.name);
    console.log("    selectedRoom" +
            " fname:"+selectedRoom.fname +
            " id:" +selectedRoom._id +
            " " + selectedRoom.usersCount + " user(s)" +
            (selectedRoom.topic ? "topic:"+selectedRoom.topic : "")
            );
  }
  if (!selectedRoom && selectedRoomId) {
    console.log("    selectedRoomId:",selectedRoomId);
  }
}

function info() {
    rocketChatClient.miscellaneous.info((err, body)=>{
     if (err) {
       logger.info('INFO ERROR', err);
       return;
     }
     logger.info('INFO', body);
    });
}

function me(verbose) {
    rocketChatClient.authentication.me((err, body)=>{
     if (err) {
       logger.info('authentication me ERROR', err);
       return false;
     }
     if (verbose) {
       logger.info('authentication me:', body);
     } else {
       logger.info('connected as', body.username);
     }
    });
    return true;
}

function channelsJoined(cb) {
    // this does'nt return private channels (groups)
    rocketChatClient.channels.listJoined({}, (err, body)=> {
      if (err) {
        console.log('channels listJoined ERROR', err);
        cb(false);
        return;
      }
      myChannels = [];
      logger.trace('channels details :', body);
      logger.debug('channels  list :');
      body.channels.forEach(
        channel => {
          logger.debug(' - ', channel.name, channel.usersCount, channel.topic);
          myChannels.push(channel);
        }
      );
      cb(true);
     });
}


function groupsJoined(cb) {
    rocketChatClient.groups.list({}, (err, body)=> {
      if (err) {
        console.log('groups list ERROR', err);
        cb(false);
        return;
      }
      myGroups = [];
      logger.trace('groups details :', body);
      logger.debug('groups  list :');
      body.groups.forEach(
        group => {
          logger.debug(' - ', group.name, group.usersCount, group.topic);
          myGroups.push(group);
        }
      );
      cb(true);
     });
}

function selectRoom(roomDef, isGroup) {
    selectedRoom = roomDef;
    selectedRoomId = roomDef._id;
    selectedIsGroup = isGroup;
    menu();
}

function isNotEmptyArray(myArray) {
  return Array.isArray(myArray) && myArray.length && myArray.length > 0;
}

function selectNext() {
    if (!isNotEmptyArray(myChannels) && !isNotEmptyArray(myGroups)) {
      return;
    }
    if (isNotEmptyArray(myChannels) && myChannels.indexOf(selectedRoom) == myChannels.length-1) {
        if (isNotEmptyArray(myGroups)) {
          selectRoom(myGroups[0], true);
        } else {
          selectRoom(myChannels[0], false);
        }
        return;
    }
    if (isNotEmptyArray(myGroups) && myGroups.indexOf(selectedRoom) == myGroups.length-1) {
        if (isNotEmptyArray(myChannels)) {
          selectRoom(myChannels[0], false);
        } else {
          selectRoom(myGroups[0], true);
        }
        return;
    }
    if (isNotEmptyArray(myGroups) && myGroups.indexOf(selectedRoom) >= 0) {
        selectRoom(myGroups[myGroups.indexOf(selectedRoom)+1], true);
        return;
    }
    if (isNotEmptyArray(myChannels) && myChannels.indexOf(selectedRoom) >= 0) {
        selectRoom(myChannels[myChannels.indexOf(selectedRoom)+1], false);
        return;
    }
    selectedRoom = myChannels[0];
    selectedRoomId = selectedRoom._id;
    selectedIsGroup = false;
    menu();
}

function showSelectedRoomRoles() {
    if (!selectedRoomId) {
      return;
    }
    /* #5 workaround start
    */
    if (!rocketChatClient.groups.roles) {
      logger.warn("need to update rocket-chat-api-node once https://github.com/gusnips/rocketchat-api-node/pull/5 merged");
      rocketChatClient.groups.roles = function (roomId, callback) {
              return this.client.request("GET", "groups.roles", {roomId}, callback);
          };
    }
    /* #5 workaround end
    */

    rocketChatClient.groups.roles(selectedRoomId, (err, body)=> {
      if (err) {
        console.log('groups roles ERROR', err);
        return;
      }
      logger.debug('groups roles :', body);
      logger.info('groups roles :');
      body.roles.forEach(
              role => {
                console.log(' - ', role.u.name, "\t", role.roles);
              }
            );
     });
}

function showNames(entities) {
 if (!Array.isArray(entities) || !entities.length) {
    return " N/A ";
 }
 var result = "";
 entities.forEach( (entity) => {
     var entityName = entity.name;
     if (selectedRoom != undefined && (selectedRoom.name === entityName)) {
       result += " [[ #" + entityName + " ]]";
     } else {
       result += " #" + entityName;
     }
   }
 );
 return result;
}

/**********/
channelsJoined((success) => {
  if (!success) { bye(); }
  groupsJoined((success) => {
    if (!success) { bye(); }
    menu();
  });
});

