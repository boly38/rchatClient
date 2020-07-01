/*jshint esversion: 6 */
const RocketChatApi = require('rocketchat-api');
var log4js = require('log4js');

class RCSession {

  constructor() {
    // generate me via (...rocketchat..)/account/tokens
    this.rcUserId = process.env.RC_USERID || 'YourUserIdHere';
    this.rcToken  = process.env.RC_TOKEN  || 'YourTokenHere';
    this.rcHost   = process.env.RC_HOST  || 'myrocketchat-server.mybusiness.com';
    this.rcPort   = process.env.RC_PORT  || 443;
    this.rcProto  = process.env.RC_PROTO  || 'https';
    this.loggerLevel = process.env.RC_LOG_LEVEL || 'INFO';
    // rcClient
    this.rocketChatClient = new RocketChatApi(this.rcProto, this.rcHost, 443);
    this.rocketChatClient.setAuthToken(this.rcToken);
    this.rocketChatClient.setUserId(this.rcUserId);

    // logging
    this.logger = log4js.getLogger();
    this.logger.setLevel(this.loggerLevel);

    this.myRooms = [];
    this.selectedRoom = null;
    this.selectedRoomId = process.env.RC_PRESELECTED_ROOM_ID || undefined;
  }

  init(cb) {
    let rcs = this;
    rcs.myRooms = [];
    rcs.channelsJoined((success) => {
        if (success) {
          rcs.groupsJoined((success) => {
            cb(success);
          });
          return;
        }
        cb(success);
    });
  }

  hasRoom() {
    return Array.isArray(this.myRooms) && this.myRooms.length > 0;
  }

  getRooms() {
    let rcs = this;
    if (!rcs.hasRoom()) {
        return "<rooms here>";
    }
    var result = "";
    rcs.myRooms.forEach( (room) => {
       var roomName = room.name;
       var isSelected = rcs.selectedRoom != undefined && (rcs.selectedRoom.name === roomName);
       var roomColor = isSelected ? "m" : room.isGroup ? "r" : "g";
       result += " #^" + roomColor + roomName + "^";
     });
     return result;
  }

  getRoomDetail() {
    let rcs = this;
    if (!rcs.selectedRoom) {
        return "(none selected)";
    }
    return "id:" + rcs.selectedRoom._id +
           " fname:" + rcs.selectedRoom.fname +
           " usersCount:" + rcs.selectedRoom.usersCount +
           " topic:" + rcs.selectedRoom.topic;
  }

  nextRoom() {
      let rcs = this;
      if (!rcs.hasRoom()) {
        return;
      }
      if (rcs.selectedRoom == null) {
        rcs.selectedRoom = rcs.myRooms[0];
        rcs.selectedRoomId = rcs.selectedRoom._id;
        return;
      }
      if (rcs.myRooms.indexOf(rcs.selectedRoom) == rcs.myRooms.length-1) {
          rcs.selectedRoom = rcs.myRooms[0];
          rcs.selectedRoomId = rcs.selectedRoom._id;
          return;
      }
      rcs.selectedRoom = rcs.myRooms[rcs.myRooms.indexOf(rcs.selectedRoom)+1];
      rcs.selectedRoomId = rcs.selectedRoom._id;
  }

  isAGroup() {
    let rcs = this;
    return rcs.selectedRoom && rcs.selectedRoom.isGroup;
  }

  channelsJoined(cb) {
      let rcs = this;
      // this does'nt return private channels (groups)
      this.rocketChatClient.channels.listJoined({}, (err, body)=> {
        if (err) {
          rcs.logger.error('channels listJoined ERROR', err);
          cb(false);
          return;
        }
        rcs.logger.trace('channels details :', body);
        rcs.logger.debug('channels  list :');
        body.channels.forEach(
          channel => {
            rcs.logger.debug(' - ', channel.name, channel.usersCount, channel.topic);
            rcs.myRooms.push({
                "_id":channel._id,
                "name":channel.name,
                "fname":channel.fname,
                "isGroup":false,
                "usersCount":channel.usersCount,
                "topic":channel.topic
            });
          }
        );
        cb(true);
       });
  }

  groupsJoined(cb) {
      let rcs = this;
      rcs.rocketChatClient.groups.list({}, (err, body)=> {
        if (err) {
          rcs.logger.error('groups list ERROR', err);
          cb(false);
          return;
        }
        rcs.logger.trace('groups details :', body);
        rcs.logger.debug('groups  list :');
        body.groups.forEach(
          group => {
            rcs.logger.debug(' - ', group.name, group.usersCount, group.topic);
            rcs.myRooms.push({
             "_id":group._id,
             "name":group.name,
             "fname":group.fname,
             "isGroup":true,
             "usersCount":group.usersCount,
             "topic":group.topic
            });
          }
        );
        cb(true);
       });
  }

  info() {
      let rcs = this;
      rcs.rocketChatClient.miscellaneous.info((err, body)=>{
       if (err) {
         rcs.logger.info('INFO ERROR', err);
         return;
       }
       rcs.logger.info('INFO', body);
      });
  }

  me(verbose) {
      let rcs = this;
      rcs.rocketChatClient.authentication.me((err, body)=>{
       if (err) {
         rcs.logger.info('authentication me ERROR', err);
         return false;
       }
       if (verbose) {
         rcs.logger.info('authentication me:', body);
       } else {
         rcs.logger.info('connected as', body.username);
       }
      });
      return true;
 }

 groupRoles() {
    let rcs = this;
    if (!rcs.isAGroup()) {
      return;
    }
    /* #5 workaround start
    */
    if (!rcs.rocketChatClient.groups.roles) {
      rcs.logger.warn("need to update rocket-chat-api-node once https://github.com/gusnips/rocketchat-api-node/pull/5 merged");
      rcs.rocketChatClient.groups.roles = function (roomId, callback) {
              return this.client.request("GET", "groups.roles", {roomId}, callback);
          };
    }
    /* #5 workaround end
    */

    rcs.rocketChatClient.groups.roles(rcs.selectedRoomId, (err, body)=> {
      if (err) {
        rcs.logger.error('groups roles ERROR', err);
        return;
      }
      rcs.logger.debug('groups roles :', body);
      rcs.logger.info('groups roles :');
      body.roles.forEach(
              role => {
                rcs.logger.info(' - ', role.u.name, "\t", role.roles);
              }
            );
     });
 }

}

module.exports = RCSession;