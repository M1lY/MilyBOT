const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});
    
client.on('message', msg => {
  if (!msg.content.startsWith(config.prefix)) return;
  const args = msg.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  const member = msg.mentions.members.first();

  if (command == "obudź_debila") {
    for(var i = 0; i < 5; i++){
      member.setVoiceChannel('520690188561940490');
      member.setVoiceChannel('481903742392729604');
    }
  }
});



client.login('NTY2OTQ2MjU5MzcwMjQ2MTQ0.XLOwFA.tfhARfr5dmk8q6rJUJ0hYjssrzA');