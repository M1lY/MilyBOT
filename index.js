const Discord = require('discord.js');
const client = new Discord.Client();
const filename = './config.json'
const ytdl = require('ytdl-core');
const fs = require('fs');
const ytSearch = require('yt-search');
var file_content = fs.readFileSync(filename);
var content = JSON.parse(file_content);
var dispatcher;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});
    
client.on('message', async msg => {
  if (!msg.content.startsWith(content.prefix)) return;
  var args = msg.content.slice(content.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  const member = msg.mentions.members.first();

  if (command === "obudź") {
    if(args[1] > content.moveLimit){
      msg.reply("Limit budzenia to 10");
      return;
    }
    if(member.voiceChannelID === ""){
      msg.reply("Użytkownik nie znajduje sie na kanale głosowym");
      return;
    }
    for(var i = 0; i < args[1]; i++){
      member.setVoiceChannel('520690188561940490');
      member.setVoiceChannel('481903742392729604');
    }
  }

  if (command === "usuń"){
    msg.channel.bulkDelete(++args[0]).then(() => {
      msg.channel.send("Usunięte " + --args[0] + " wiadomości").then(message => message.delete(3000));
    });
  }

  if (command === "limit"){
    if(args[0] == undefined){
      msg.reply("Altualny limit budzenia to: " + content.moveLimit)
    }else if (msg.member.roles.some(r => "BotMod".includes(r.name))){
      content.moveLimit = args[0];
      fs.writeFileSync(filename, JSON.stringify(content));
      msg.reply("Limit budzenia został zmieniny, aktualny limit to: " + content.moveLimit);
    }else{
      msg.reply("Nie masz wystarczających uprawnień aby zmieniać limit budzenia");
    }
  }

  if (command === "summon" || command === "join"){
    if (msg.member.voiceChannel){
      if (!msg.guild.voiceConnection){
        //
        msg.member.voiceChannel.join();
      }else{
        if (msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
          msg.reply("Jestem tutaj!");
        }else{
          msg.reply("Jestem zajęty!");
        }
      }
    }else{
      msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
    }
  }

  if (command === "dc" || command === "disconnect" || command === "leave"){
    if (msg.member.voiceChannel){
      if (msg.guild.voiceConnection){
        if(msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
          //
          msg.guild.voiceConnection.disconnect();
        }else{
          msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
        }
      }else{
        msg.reply("Nie jestem na żadnym kanale głosowym");
      }
    }else{
      msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
    }
  }

  if (command === "play" || command === "p"){
    if (msg.member.voiceChannel){
      if (!msg.guild.voiceConnection){
        msg.member.voiceChannel.join();
        //
      }else{
        if (msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
          //
        }else{
          msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
          return;
        }
      }
    }else{
      msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
      return;
    }

    var url;
    ytSearch(args[0], function ( err, r ) {
      if (err) throw err;
      const videos = r.videos;
      url = ('https://www.youtube.com' + videos[0].url);
      dispatcher = msg.guild.voiceConnection.playStream(ytdl(url, {filter: 'audioonly'} ));
      msg.channel.send("Odtwarzam - " + url);
    });

  }

  if (command === "pause" || command === "stop"){
    if (msg.member.voiceChannel){
      if (msg.guild.voiceConnection){
        if(msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
          //
        }else{
          msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
          return;
        }
      }else{
        msg.reply("Nie jestem na żadnym kanale głosowym");
        return;
      }
    }else{
      msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
      return;
    }

    if(dispatcher && !dispatcher.paused && !dispatcher.destroyed){
      dispatcher.pause();
    }else{
      msg.reply("Nic nie leci :(");
    }
  }

  if (command === "wznów" || command === "resume"){
    if (msg.member.voiceChannel){
      if (msg.guild.voiceConnection){
        if(msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
          //
        }else{
          msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
          return;
        }
      }else{
        msg.reply("Nie jestem na żadnym kanale głosowym");
        return;
      }
    }else{
      msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
      return;
    }

    if(dispatcher && dispatcher.paused && !dispatcher.destroyed){
      dispatcher.resume();
    }else{
      msg.reply("Nic nie leci :(");
    }
  }

  if(command === "vol" || command === "volume" || command === "głośność"){
    if (msg.member.voiceChannel){
      if (msg.guild.voiceConnection){
        if(msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
          //
        }else{
          msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
          return;
        }
      }else{
        msg.reply("Nie jestem na żadnym kanale głosowym");
        return;
      }
    }else{
      msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
      return;
    }

    if(dispatcher && !dispatcher.paused && !dispatcher.destroyed){
      dispatcher.setVolume(args[0]/100);

    }else{
      msg.reply("Nic nie leci :(");
    }
  }
});



client.login('NTY2OTQ2MjU5MzcwMjQ2MTQ0.XLOwFA.tfhARfr5dmk8q6rJUJ0hYjssrzA');