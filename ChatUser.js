"use strict";

/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require("./Room");

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** Make chat user: store connection-device, room.
   *
   * @param send {function} callback to send message to this user
   * @param room {Room} room user will be in
   * */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** Send msgs to this client using underlying connection-send-function.
   *
   * @param data {string} message to send
   * */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** Handle joining: add to room members, announce join.
   *
   * @param name {string} name to use in room
   * */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} joined "${this.room.name}".`,
    });
  }

  /** Handle a chat: broadcast to room.
   *
   * @param text {string} message to send
   * */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: "chat",
      text: text,
    });
  }

  /** Handle member list request: get memberlist.
   *
   * @param text {string} message to send
   * */

  handleMemberList(memberList) {
    console.log("memberList",memberList)
    console.log("memberList",memberList)
    const memberNames = [];
    for (const m of memberList){
      memberNames.push(m.name);
    }

    console.log("memberNames:",memberNames)

    this.room.sendSelf(this,{
      name: this.name,
      type: "member-list",
      text: memberNames,
    });
  }

  /** Handle messages from client:
   *
   * @param jsonData {string} raw message data
   *
   * @example<code>
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   * </code>
   */

  async handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);
    console.log(msg);
    console.log("room members:",this.room.members)

    if (msg.type === "join") this.handleJoin(msg.name);
    else if (msg.type === "chat") this.handleChat(msg.text);
    else if (msg.type === "get-joke") this.handleChat(await ChatUser.handleGetJoke());
    else if (msg.type === "get-members") this.handleMemberList(this.room.members);
    else throw new Error(`bad message: ${msg.type}`);
  }

  /** get dad joke */
  static async handleGetJoke() {
      const jokeResp = await fetch("https://icanhazdadjoke.com",{
          method: "GET",
          headers: {
            "Accept" : "application/json",
            "User-Agent" : "websocketPractice"
          }
        })
        const jokeData = await jokeResp.json();
        return jokeData.joke;
  }
  /** Connection was closed: leave room, announce exit to others. */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} left ${this.room.name}.`,
    });
  }
}

module.exports = ChatUser;
