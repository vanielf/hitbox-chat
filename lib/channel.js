
var utils = require("./utils");
var HitboxPoll = require("./poll");
var HitboxRaffle = require("./raffle");

function HitboxChannel(client, channel) {
  if (!utils.isa(this, HitboxChannel)) return new HitboxChannel(client, channel);

  this.channel = channel;
  this.client = client;
  this.joined = false;
  this.loggedIn = false;
  this.role = null;
  this.name = null;
  this.defaultColor = "0000FF";

  this.poll = null;
  this.raffle = null;
}
HitboxChannel.prototype = {
  // internal handlers
  onmessage: function(message) {
    if (message.method == "loginMsg") {
      this.loggedin = true;
      this.name = message.params.name;
      this.role = message.params.role;
      this.emit("login", message.params.name, message.params.role);
    } else if (message.method == "chatMsg") {
      this.emit("chat", message.params.name, message.params.text, message.params.role);
    } else if (message.method == "motdMsg") {
      this.emit("motd", message.params.text);
    } else if (message.method == "slowMsg") {
      this.emit("slow", message.params.slowTime);
    } else if (message.method == "infoMsg") {
      this.emit("info", message.params.text);
    } else if (message.method == "pollMsg") {
      if (this.poll) {
        this.poll.onmessage(message.params);
        if (this.poll.status == "ended") {
          this.poll = null;
        }
      } else {
        this.poll = new HitboxPoll(this, message.params);
        this.emit("poll", this.poll);
      }
    } else if (message.method == "raffleMsg") {
      if (this.raffle) {
        this.raffle.onmessage(message.params);
        if (this.raffle.status == "delete") {
          this.raffle = null;
        }
      } else {
        this.raffle = new HitboxRaffle(this, message.params);
        this.emit("raffle", this.raffle);
      }
    } else if (message.method == "winnerMsg") {
      if (this.raffle) {
        this.raffle.onwinner(message.params);
      } else {
        throw "WTF?";
      }
    } else {
      // catch all so if something else happens its more visible
      this.emit("other", message.method, message.params);
    }
  },
  // internal websocket functions
  send: function(method, params, auth) {
    params.channel = this.channel;
    this.client.send(method, params, auth);
  },
  // external API functions
  join: function() {
    if (this.joined) {
      return;
    }
    this.joined = true;
    this.send("joinChannel", { isAdmin: false }, true);
  },
  leave: function() {
    if (!this.joined) {
      return;
    }
    this.client.send("partChannel", {
      channel: this.channel,
      name: this.name
    });
    this.joined = false;
    this.loggedIn = false;
    this.role = null;
    this.name = null;
  },
  sendMessage: function(text,nameColor) {
    var color = nameColor || this.defaultColor;
    this.send("chatMsg", {
      nameColor: color,
      text: text
    });
  },
  sendWhisper: function(to, text, nameColor){
    var color = nameColor || this.defaultColor;
    this.send("directMsg", {
      from: this.name,
      to: to,
      nameColor: color,
      text: text
    });
  },
  timeout: function(nickname, token, seconds) {
    this.send("kickUser", {
      channel: this.channel,
      token: token,
      timeout: seconds,
      name: nickname
    });
  },
  banUser: function(nickname) {
    this.send("banUser", {
      channel: this.channel,
      name: nickname
    });
  },
  ipBan: function(nickname, token) {
    this.send("banUser", {
      channel: this.channel,
      name: nickname,
      token: token,
      banIP: true
    });
  },
  unBan: function(nickname, token) {
    this.send("unbanUser", {
      channel: this.channel,
      name: nickname,
      token: token
    });
  },
  slowMode: function(slowTime) {
    slowTime = (slowTime === undefined)? 10 : slowTime;
    this.send("slowMode", {
      channel: this.channel,
      time: slowTime
    });
  },
  removeSlowMode: function() {
    slowMode(0);
  },
  subscriberMode: function(rate) {
    rate = (rate === undefined)? 0 : rate;

    this.send("slowMode", {
      channel: this.channel,
      subscriber: true,
      rate: rate
    });
  },
  unsubscribermode: function() {
    subscriberMode(0);
  }
}
utils.mixin(HitboxChannel, utils.emitter);

module.exports = HitboxChannel;
